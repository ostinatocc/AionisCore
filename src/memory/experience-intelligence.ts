import { buildExecutionMemoryIntrospectionLite } from "./execution-introspection.js";
import {
  ExperienceIntelligenceRequest,
  ExperienceIntelligenceResponseSchema,
  KickoffRecommendationResponseSchema,
  type ExperienceIntelligenceResponse,
  type ExperienceIntelligenceInput,
  type ExecutionMemoryIntrospectionResponse,
  type KickoffRecommendationResponse,
  type ToolsSelectRouteContract,
} from "./schemas.js";
import { selectTools } from "./tools-select.js";
import type { EmbeddingProvider } from "../embeddings/types.js";
import type { RecallStoreAccess } from "../store/recall-access.js";
import type { LiteWriteStore } from "../store/lite-write-store.js";
import { buildKickoffRecommendationFromExperience } from "../app/planning-summary.js";

type ExperienceLiteStore = LiteWriteStore;

type WorkflowEntry = {
  anchor_id: string;
  workflow_signature?: string | null;
  task_family?: string | null;
  title?: string | null;
  summary?: string | null;
  tool_set?: string[];
  target_files?: string[];
  file_path?: string | null;
  next_action?: string | null;
  confidence?: number | null;
};

const EXPERIENCE_INTELLIGENCE_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

type RankedWorkflow = {
  kind: "recommended_workflow" | "candidate_workflow";
  workflow: WorkflowEntry;
  score: number;
  overlap: number;
  tool_aligned: boolean;
  relevant: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function stringList(value: unknown, limit = 16): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const next = typeof item === "string" ? item.trim() : "";
    if (!next || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
    if (out.length >= limit) break;
  }
  return out;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function normalizeTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9_./-]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && !EXPERIENCE_INTELLIGENCE_STOPWORDS.has(part));
}

function uniqueStrings(values: Array<string | null | undefined>, limit = 16): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= limit) break;
  }
  return out;
}

function buildCueTokens(queryText: string, context: unknown): Set<string> {
  const ctx = asRecord(context);
  const task = asRecord(ctx?.task);
  const error = asRecord(ctx?.error);
  const values = [
    queryText,
    firstString(ctx?.task_kind),
    firstString(ctx?.goal),
    firstString(ctx?.objective),
    firstString(task?.signature),
    firstString(task?.goal),
    firstString(task?.objective),
    firstString(error?.signature),
    firstString(error?.code),
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
  return new Set(values.flatMap((value) => normalizeTokens(value)));
}

function scoreWorkflow(args: {
  workflow: WorkflowEntry;
  kind: "recommended_workflow" | "candidate_workflow";
  selectedTool: string | null;
  cueTokens: Set<string>;
}): RankedWorkflow {
  const toolSet = Array.isArray(args.workflow.tool_set) ? args.workflow.tool_set : [];
  const targetFiles = Array.isArray(args.workflow.target_files) ? args.workflow.target_files : [];
  const textTokens = new Set(
    [
      args.workflow.title ?? "",
      args.workflow.summary ?? "",
      args.workflow.workflow_signature ?? "",
      args.workflow.task_family ?? "",
      args.workflow.file_path ?? "",
      ...(targetFiles ?? []),
      args.workflow.next_action ?? "",
      ...toolSet,
    ].flatMap((value) => normalizeTokens(value)),
  );
  let overlap = 0;
  for (const token of args.cueTokens) {
    if (textTokens.has(token)) overlap += 1;
  }
  const toolAligned = !!args.selectedTool && toolSet.includes(args.selectedTool);
  let score = args.kind === "recommended_workflow" ? 200 : 120;
  if (toolAligned) score += 60;
  if (targetFiles.length > 0) score += 35;
  if (args.workflow.file_path) score += 20;
  if (args.workflow.next_action) score += 15;
  if (Number.isFinite(args.workflow.confidence)) score += Math.round((args.workflow.confidence ?? 0) * 10);
  score += overlap * 12;
  return {
    kind: args.kind,
    workflow: args.workflow,
    score,
    overlap,
    tool_aligned: toolAligned,
    // Tool alignment helps ranking, but it is not enough to treat a workflow as
    // relevant. Otherwise broad tools like edit/bash can bleed unrelated history
    // into new requests.
    relevant: overlap > 0,
  };
}

function choosePathRecommendation(args: {
  queryText: string;
  context: unknown;
  selectedTool: string | null;
  recommendedWorkflows: WorkflowEntry[];
  candidateWorkflows: WorkflowEntry[];
}) {
  const cueTokens = buildCueTokens(args.queryText, args.context);
  const ranked = [
    ...args.recommendedWorkflows.map((workflow) =>
      scoreWorkflow({
        workflow,
        kind: "recommended_workflow",
        selectedTool: args.selectedTool,
        cueTokens,
      })),
    ...args.candidateWorkflows.map((workflow) =>
      scoreWorkflow({
        workflow,
        kind: "candidate_workflow",
        selectedTool: args.selectedTool,
        cueTokens,
      })),
  ].sort((a, b) => b.score - a.score || a.workflow.anchor_id.localeCompare(b.workflow.anchor_id));

  const top = ranked.find((entry) => entry.relevant) ?? null;
  if (!top) {
    return {
      source_kind: "none" as const,
      anchor_id: null,
      workflow_signature: null,
      title: null,
      summary: null,
      file_path: null,
      target_files: [],
      next_action: null,
      confidence: null,
      tool_set: [],
      reason: null,
    };
  }

  const targetFiles = stringList(top.workflow.target_files);
  const filePath = firstString(top.workflow.file_path, targetFiles[0] ?? null);
  const summary = firstString(top.workflow.summary);
  const title = firstString(top.workflow.title);
  const nextAction = firstString(
    top.workflow.next_action,
    filePath && args.selectedTool ? `Use ${args.selectedTool} on ${filePath} and continue along the learned workflow.` : null,
    filePath ? `Continue with ${filePath} as the next working target.` : null,
  );

  return {
    source_kind: top.kind,
    anchor_id: top.workflow.anchor_id,
    workflow_signature: firstString(top.workflow.workflow_signature),
    title,
    summary,
    file_path: filePath,
    target_files: targetFiles,
    next_action: nextAction,
    confidence: Number.isFinite(top.workflow.confidence) ? (top.workflow.confidence ?? null) : null,
    tool_set: stringList(top.workflow.tool_set),
    reason: [
      top.kind === "recommended_workflow" ? "stable workflow memory matched this request" : "candidate workflow memory matched this request",
      top.tool_aligned && args.selectedTool ? `tool alignment=${args.selectedTool}` : null,
      top.overlap > 0 ? `token_overlap=${top.overlap}` : null,
      targetFiles.length > 0 ? `targets=${targetFiles.join(", ")}` : null,
      summary ? `summary=${summary}` : null,
    ].filter(Boolean).join("; "),
  };
}

export function buildExperienceIntelligenceResponse(args: {
  parsed: ExperienceIntelligenceInput;
  tools: ToolsSelectRouteContract;
  introspection: ExecutionMemoryIntrospectionResponse;
}): ExperienceIntelligenceResponse {
  const path = choosePathRecommendation({
    queryText: args.parsed.query_text,
    context: args.parsed.context,
    selectedTool: args.tools.selection.selected ?? null,
    recommendedWorkflows: args.introspection.recommended_workflows as WorkflowEntry[],
    candidateWorkflows: args.introspection.candidate_workflows as WorkflowEntry[],
  });

  const trustedPatternAnchorIds = Array.isArray(args.tools.decision.pattern_summary.used_trusted_pattern_anchor_ids)
    ? args.tools.decision.pattern_summary.used_trusted_pattern_anchor_ids
    : [];
  const candidatePatternAnchorIds = Array.isArray(args.tools.decision.pattern_summary.skipped_contested_pattern_anchor_ids)
    ? args.tools.decision.pattern_summary.skipped_contested_pattern_anchor_ids
    : [];
  const suppressedPatternAnchorIds = Array.isArray(args.tools.decision.pattern_summary.skipped_suppressed_pattern_anchor_ids)
    ? args.tools.decision.pattern_summary.skipped_suppressed_pattern_anchor_ids
    : [];
  const historyApplied = trustedPatternAnchorIds.length > 0 || path.source_kind !== "none";
  const toolReason = firstString(args.tools.selection_summary.provenance_explanation);
  const pathReason = firstString(path.reason);
  const learningReason = [
    args.introspection.pattern_signal_summary.trusted_pattern_count > 0
      ? `trusted_patterns=${args.introspection.pattern_signal_summary.trusted_pattern_count}`
      : null,
    args.introspection.workflow_signal_summary.stable_workflow_count > 0
      ? `stable_workflows=${args.introspection.workflow_signal_summary.stable_workflow_count}`
      : null,
    historyApplied ? "history_applied=true" : "history_applied=false",
  ].filter(Boolean).join("; ");
  const combinedNextAction = firstString(
    path.next_action,
    path.file_path && args.tools.selection.selected
      ? `Use ${args.tools.selection.selected} on ${path.file_path} as the next learned step.`
      : null,
  );

  return ExperienceIntelligenceResponseSchema.parse({
    summary_version: "experience_intelligence_v1",
    tenant_id: args.tools.tenant_id,
    scope: args.tools.scope,
    query_text: args.parsed.query_text,
    recommendation: {
      history_applied: historyApplied,
      tool: {
        selected_tool: args.tools.selection.selected ?? null,
        ordered_tools: Array.isArray(args.tools.selection.ordered) ? args.tools.selection.ordered : [],
        preferred_tools: Array.isArray(args.tools.selection.preferred) ? args.tools.selection.preferred : [],
        allowed_tools: Array.isArray(args.tools.selection.allowed) ? args.tools.selection.allowed : [],
        trusted_pattern_anchor_ids: trustedPatternAnchorIds,
        candidate_pattern_anchor_ids: candidatePatternAnchorIds,
        suppressed_pattern_anchor_ids: suppressedPatternAnchorIds,
      },
      path: {
        source_kind: path.source_kind,
        anchor_id: path.anchor_id,
        workflow_signature: path.workflow_signature,
        title: path.title,
        summary: path.summary,
        file_path: path.file_path,
        target_files: path.target_files,
        next_action: path.next_action,
        confidence: path.confidence,
        tool_set: path.tool_set,
      },
      combined_next_action: combinedNextAction,
    },
    rationale: {
      summary: [toolReason, pathReason, learningReason].filter(Boolean).join(" | "),
    },
  });
}

export async function buildExperienceIntelligenceLite(args: {
  liteWriteStore: ExperienceLiteStore;
  liteRecallAccess: RecallStoreAccess;
  embedder: EmbeddingProvider | null;
  body: unknown;
  defaultScope: string;
  defaultTenantId: string;
  defaultActorId: string;
}): Promise<ExperienceIntelligenceResponse> {
  const parsed = ExperienceIntelligenceRequest.parse(args.body);
  const introspection = await buildExecutionMemoryIntrospectionLite(
    args.liteWriteStore,
    {
      tenant_id: parsed.tenant_id,
      scope: parsed.scope,
      consumer_agent_id: parsed.consumer_agent_id,
      consumer_team_id: parsed.consumer_team_id,
      limit: parsed.workflow_limit,
    },
    args.defaultScope,
    args.defaultTenantId,
    args.defaultActorId,
  );

  const tools = await selectTools(
    null,
    {
      tenant_id: parsed.tenant_id,
      scope: parsed.scope,
      run_id: parsed.run_id,
      context: parsed.context,
      candidates: parsed.candidates,
      include_shadow: parsed.include_shadow,
      rules_limit: parsed.rules_limit,
      strict: parsed.strict,
      reorder_candidates: parsed.reorder_candidates,
      execution_result_summary: parsed.execution_result_summary,
      execution_artifacts: parsed.execution_artifacts,
      execution_evidence: parsed.execution_evidence,
      execution_state_v1: parsed.execution_state_v1,
    },
    args.defaultScope,
    args.defaultTenantId,
    {
      liteWriteStore: args.liteWriteStore,
      recallAccess: args.liteRecallAccess,
      embedder: args.embedder,
    },
  );
  return buildExperienceIntelligenceResponse({
    parsed,
    tools,
    introspection,
  });
}

export function buildKickoffRecommendationResponseFromExperience(
  experience: ExperienceIntelligenceResponse,
): KickoffRecommendationResponse {
  const tool = asRecord(experience.recommendation?.tool);
  const path = asRecord(experience.recommendation?.path);
  const kickoffRecommendation = buildKickoffRecommendationFromExperience({
    historyApplied: experience.recommendation?.history_applied === true,
    selectedTool: firstString(tool?.selected_tool),
    filePath: firstString(path?.file_path),
    nextAction: firstString(experience.recommendation?.combined_next_action),
  });

  return KickoffRecommendationResponseSchema.parse({
    summary_version: "kickoff_recommendation_v1",
    tenant_id: experience.tenant_id,
    scope: experience.scope,
    query_text: experience.query_text,
    kickoff_recommendation: kickoffRecommendation,
    rationale: {
      summary:
        typeof experience.rationale?.summary === "string"
          ? experience.rationale.summary
          : "",
    },
  });
}

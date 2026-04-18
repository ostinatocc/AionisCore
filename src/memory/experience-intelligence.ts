import { buildExecutionMemoryIntrospectionLite } from "./execution-introspection.js";
import { buildDelegationLearningSliceLite } from "./delegation-learning.js";
import {
  DerivedPolicySurfaceSchema,
  ExperienceIntelligenceRequest,
  ExperienceIntelligenceResponseSchema,
  KickoffRecommendationResponseSchema,
  PolicyContractSchema,
  type ExperienceIntelligenceResponse,
  type ExperienceIntelligenceInput,
  type DerivedPolicySurface,
  type ExecutionMemoryIntrospectionResponse,
  type KickoffRecommendationResponse,
  type PolicyHintEntry,
  type PolicyHintPack,
  type PolicyContract,
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
  feedback_quality?: number | null;
  usage_count?: number | null;
  reuse_success_count?: number | null;
  reuse_failure_count?: number | null;
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

function numeric(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function workflowEvidenceParts(workflow: WorkflowEntry): string[] {
  const usageCount = Math.max(0, Number(workflow.usage_count ?? 0));
  const reuseSuccessCount = Math.max(0, Number(workflow.reuse_success_count ?? 0));
  const reuseFailureCount = Math.max(0, Number(workflow.reuse_failure_count ?? 0));
  const feedbackQuality = numeric(workflow.feedback_quality);
  return [
    usageCount > 0 ? `usage_count=${usageCount}` : null,
    reuseSuccessCount > 0 ? `reuse_success=${reuseSuccessCount}` : null,
    reuseFailureCount > 0 ? `reuse_failure=${reuseFailureCount}` : null,
    feedbackQuality != null ? `feedback_quality=${feedbackQuality.toFixed(2)}` : null,
  ].filter((value): value is string => !!value);
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

type PolicyHintEntryLike = {
  anchor_id: string;
  anchor_level?: string | null;
  summary?: string | null;
  confidence?: number | null;
  selected_tool?: string | null;
  workflow_signature?: string | null;
  file_path?: string | null;
  target_files?: string[];
  mode?: string | null;
};

type PersistedPolicyMemory = {
  node_id: string;
  score: number;
  contract: PolicyContract;
  derived_policy: DerivedPolicySurface | null;
};

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

function parsePersistedPolicyContract(value: unknown, nodeId: string): PolicyContract | null {
  const parsed = PolicyContractSchema.safeParse({
    ...(asRecord(value) ?? {}),
    policy_memory_state: firstString(asRecord(value)?.policy_memory_state) ?? "active",
    materialization_state: "persisted",
    policy_memory_id: nodeId,
  });
  return parsed.success ? parsed.data : null;
}

function parsePersistedDerivedPolicy(value: unknown): DerivedPolicySurface | null {
  const parsed = DerivedPolicySurfaceSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function readPersistedPolicyMemory(args: {
  introspection: ExecutionMemoryIntrospectionResponse;
  queryText: string;
  context: unknown;
  selectedTool: string | null;
  path: ReturnType<typeof choosePathRecommendation>;
  liveDerivedPolicy: DerivedPolicySurface | null;
}): PersistedPolicyMemory | null {
  const supportingKnowledge = Array.isArray(args.introspection.supporting_knowledge)
    ? args.introspection.supporting_knowledge
    : [];
  if (supportingKnowledge.length === 0) return null;

  const cueTokens = buildCueTokens(args.queryText, args.context);
  const ctx = asRecord(args.context);
  const workflow = asRecord(ctx?.workflow);
  const task = asRecord(ctx?.task);
  const error = asRecord(ctx?.error);
  const currentWorkflowSignature = firstString(
    args.path.workflow_signature,
    ctx?.workflow_signature,
    workflow?.signature,
    args.liveDerivedPolicy?.workflow_signature,
  );
  const currentFilePath = firstString(args.path.file_path, args.liveDerivedPolicy?.file_path, ctx?.file_path);
  const currentTargetFiles = new Set(
    [
      ...args.path.target_files,
      ...(args.liveDerivedPolicy?.target_files ?? []),
      ...stringList(ctx?.target_files, 24),
      currentFilePath ?? "",
    ].filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  const currentAnchorIds = new Set(
    [
      args.path.anchor_id ?? "",
      ...(args.liveDerivedPolicy?.supporting_anchor_ids ?? []),
    ].filter((value) => value.length > 0),
  );
  const currentTaskSignature = firstString(ctx?.task_signature, task?.signature);
  const currentErrorSignature = firstString(ctx?.error_signature, error?.signature, error?.code);

  let best: PersistedPolicyMemory | null = null;
  for (const rawEntry of supportingKnowledge) {
    const entry = asRecord(rawEntry);
    if (!entry) continue;
    if (firstString(entry.kind, entry.summary_kind) !== "policy_memory" && !asRecord(entry.policy_contract_v1)) continue;
    const nodeId = firstString(entry.node_id, entry.anchor_id, entry.policy_memory_id);
    if (!nodeId) continue;
    const contract = parsePersistedPolicyContract(entry.policy_contract_v1, nodeId);
    if (!contract) continue;
    if (contract.policy_memory_state !== "active") continue;
    const derivedPolicy = parsePersistedDerivedPolicy(entry.derived_policy_v1);
    const entryWorkflowSignature = firstString(contract.workflow_signature, entry.workflow_signature);
    const entryFilePath = firstString(contract.file_path, entry.file_path);
    const entryTaskSignature = firstString(entry.task_signature);
    const entryErrorSignature = firstString(entry.error_signature);
    const entryTargetFiles = new Set(
      [
        ...contract.target_files,
        ...stringList(entry.target_files, 24),
        entryFilePath ?? "",
      ].filter((value): value is string => typeof value === "string" && value.length > 0),
    );
    const textValues = [
      firstString(entry.title),
      firstString(entry.summary),
      entryWorkflowSignature,
      entryFilePath,
      entryTaskSignature,
      entryErrorSignature,
      ...Array.from(entryTargetFiles),
    ].filter((value): value is string => typeof value === "string" && value.length > 0);
    const textTokens = new Set(textValues.flatMap((value) => normalizeTokens(value)));

    let overlap = 0;
    for (const token of cueTokens) {
      if (textTokens.has(token)) overlap += 1;
    }

    let score = 0;
    if (args.selectedTool && contract.selected_tool === args.selectedTool) score += 90;
    else if (args.selectedTool) score -= 40;
    if (currentWorkflowSignature && entryWorkflowSignature === currentWorkflowSignature) score += 70;
    if (currentFilePath && entryFilePath === currentFilePath) score += 50;
    if (currentTaskSignature && entryTaskSignature === currentTaskSignature) score += 35;
    if (currentErrorSignature && entryErrorSignature === currentErrorSignature) score += 25;
    if (Array.from(entryTargetFiles).some((value) => currentTargetFiles.has(value))) score += 40;
    if (contract.source_anchor_ids.some((anchorId) => currentAnchorIds.has(anchorId))) score += 30;
    if (contract.activation_mode === "default") score += 20;
    if (contract.policy_state === "stable") score += 15;
    score += overlap * 10;
    score += Math.round(contract.confidence * 10);

    if (!best || score > best.score) {
      best = {
        node_id: nodeId,
        score,
        contract,
        derived_policy: derivedPolicy,
      };
    }
  }

  if (!best || best.score < 90) return null;
  return best;
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
  const usageCount = Math.max(0, Number(args.workflow.usage_count ?? 0));
  const reuseSuccessCount = Math.max(0, Number(args.workflow.reuse_success_count ?? 0));
  const reuseFailureCount = Math.max(0, Number(args.workflow.reuse_failure_count ?? 0));
  const feedbackQuality = Number.isFinite(Number(args.workflow.feedback_quality))
    ? Math.max(-1, Math.min(1, Number(args.workflow.feedback_quality)))
    : 0;
  let score = args.kind === "recommended_workflow" ? 200 : 120;
  if (toolAligned) score += 60;
  if (targetFiles.length > 0) score += 35;
  if (args.workflow.file_path) score += 20;
  if (args.workflow.next_action) score += 15;
  if (Number.isFinite(args.workflow.confidence)) score += Math.round((args.workflow.confidence ?? 0) * 10);
  score += Math.min(usageCount, 8) * 3;
  score += Math.min(reuseSuccessCount, 6) * 10;
  score -= Math.min(reuseFailureCount, 4) * 14;
  score += Math.round(feedbackQuality * 18);
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
      ...workflowEvidenceParts(top.workflow),
      targetFiles.length > 0 ? `targets=${targetFiles.join(", ")}` : null,
      summary ? `summary=${summary}` : null,
    ].filter(Boolean).join("; "),
  };
}

function toPolicyHintEntry(value: unknown): PolicyHintEntryLike | null {
  const record = asRecord(value);
  const anchorId = firstString(record?.anchor_id);
  if (!anchorId) return null;
  return {
    anchor_id: anchorId,
    anchor_level: firstString(record?.anchor_level),
    summary: firstString(record?.summary),
    confidence: Number.isFinite(Number(record?.confidence)) ? Number(record?.confidence) : null,
    selected_tool: firstString(record?.selected_tool),
    workflow_signature: firstString(record?.workflow_signature),
    file_path: firstString(record?.file_path),
    target_files: stringList(record?.target_files, 24),
    mode: firstString(record?.mode, record?.rehydration_default_mode),
  };
}

function workflowReuseReason(path: ReturnType<typeof choosePathRecommendation>): string {
  const record = path as unknown as Record<string, unknown>;
  return firstString(record.reason, record.summary, record.next_action)
    ?? "Reuse the most relevant learned workflow first.";
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function choosePreferredTrustedPattern(args: {
  trustedPatterns: PolicyHintEntryLike[];
  selectedTool: string | null;
}): PolicyHintEntryLike | null {
  return (args.selectedTool ? args.trustedPatterns.find((entry) => entry.selected_tool === args.selectedTool) : null)
    ?? args.trustedPatterns[0]
    ?? null;
}

function findSelectedWorkflow(args: {
  introspection: ExecutionMemoryIntrospectionResponse;
  path: ReturnType<typeof choosePathRecommendation>;
}): WorkflowEntry | null {
  const recommendedWorkflows =
    (Array.isArray(args.introspection.recommended_workflows) ? args.introspection.recommended_workflows : []) as WorkflowEntry[];
  const candidateWorkflows =
    (Array.isArray(args.introspection.candidate_workflows) ? args.introspection.candidate_workflows : []) as WorkflowEntry[];
  return args.path.anchor_id
    ? [...recommendedWorkflows, ...candidateWorkflows].find((entry) => entry.anchor_id === args.path.anchor_id) ?? null
    : null;
}

function workflowToolPreferenceState(args: {
  workflow: WorkflowEntry | null;
  selectedTool: string | null;
}): "none" | "candidate" | "stable" {
  const selectedTool = firstString(args.selectedTool);
  if (!selectedTool || !args.workflow) return "none";
  const toolSet = stringList(args.workflow.tool_set, 24);
  if (!toolSet.includes(selectedTool)) return "none";
  const usageCount = Math.max(0, Number(args.workflow.usage_count ?? 0));
  const reuseSuccessCount = Math.max(0, Number(args.workflow.reuse_success_count ?? 0));
  const reuseFailureCount = Math.max(0, Number(args.workflow.reuse_failure_count ?? 0));
  const feedbackQuality = numeric(args.workflow.feedback_quality) ?? 0;
  if (reuseFailureCount > reuseSuccessCount && feedbackQuality < 0) return "none";
  if (
    reuseSuccessCount >= 2
    || (reuseSuccessCount >= 1 && feedbackQuality >= 0.35)
    || (usageCount >= 3 && feedbackQuality >= 0)
  ) {
    return "stable";
  }
  if (reuseSuccessCount >= 1 || usageCount >= 2 || feedbackQuality > 0) {
    return "candidate";
  }
  return "none";
}

function supportsWorkflowToolPreference(args: {
  workflow: WorkflowEntry | null;
  selectedTool: string | null;
}): boolean {
  return workflowToolPreferenceState(args) !== "none";
}

function buildDerivedPolicySurface(args: {
  tools: ToolsSelectRouteContract;
  introspection: ExecutionMemoryIntrospectionResponse;
  path: ReturnType<typeof choosePathRecommendation>;
}): DerivedPolicySurface | null {
  const selectedTool = firstString(args.tools.selection?.selected);
  if (!selectedTool) return null;

  const trustedPatterns = (Array.isArray(args.introspection.trusted_patterns) ? args.introspection.trusted_patterns : [])
    .map(toPolicyHintEntry)
    .filter((entry): entry is PolicyHintEntryLike => entry !== null);
  const preferredPattern = choosePreferredTrustedPattern({ trustedPatterns, selectedTool });
  const patternSupports = preferredPattern?.selected_tool === selectedTool;
  const selectedWorkflow = findSelectedWorkflow({
    introspection: args.introspection,
    path: args.path,
  });
  const workflowPolicyState = workflowToolPreferenceState({
    workflow: selectedWorkflow,
    selectedTool,
  });
  const workflowSupports = workflowPolicyState !== "none";
  if (!patternSupports && !workflowSupports) return null;

  const sourceKind =
    patternSupports && workflowSupports
      ? "blended"
      : patternSupports
        ? "trusted_pattern"
        : "stable_workflow";
  const policyState =
    patternSupports || workflowPolicyState === "stable"
      ? "stable"
      : "candidate";
  const patternConfidence = patternSupports ? (preferredPattern?.confidence ?? 0.82) : 0;
  const workflowConfidence = workflowSupports ? (selectedWorkflow?.confidence ?? 0.72) : 0;
  const confidence =
    sourceKind === "blended"
      ? clamp01(Math.max(patternConfidence, workflowConfidence) + 0.08)
      : clamp01(Math.max(patternConfidence, workflowConfidence));
  const supportingAnchorIds = [
    ...(patternSupports && preferredPattern ? [preferredPattern.anchor_id] : []),
    ...(workflowSupports && selectedWorkflow ? [selectedWorkflow.anchor_id] : []),
  ];
  const usageCount = Math.max(0, Number(selectedWorkflow?.usage_count ?? 0));
  const reuseSuccessCount = Math.max(0, Number(selectedWorkflow?.reuse_success_count ?? 0));
  const reuseFailureCount = Math.max(0, Number(selectedWorkflow?.reuse_failure_count ?? 0));
  const feedbackQuality = numeric(selectedWorkflow?.feedback_quality);
  const reason = [
    patternSupports ? `trusted pattern supports ${selectedTool}` : null,
    workflowSupports ? `stable workflow supports ${selectedTool}` : null,
    workflowSupports && selectedWorkflow ? workflowEvidenceParts(selectedWorkflow).join("; ") : null,
  ].filter((value): value is string => !!value).join("; ");

  return DerivedPolicySurfaceSchema.parse({
    summary_version: "derived_policy_v1",
    policy_kind: "tool_preference",
    source_kind: sourceKind,
    policy_state: policyState,
    selected_tool: selectedTool,
    workflow_signature: firstString(selectedWorkflow?.workflow_signature),
    file_path: firstString(selectedWorkflow?.file_path, preferredPattern?.file_path),
    target_files: stringList(selectedWorkflow?.target_files, 24),
    confidence,
    supporting_anchor_ids: supportingAnchorIds,
    reason,
    evidence: {
      trusted_pattern_count: patternSupports ? 1 : 0,
      stable_workflow_count: workflowSupports ? 1 : 0,
      usage_count: usageCount,
      reuse_success_count: reuseSuccessCount,
      reuse_failure_count: reuseFailureCount,
      feedback_quality: feedbackQuality,
    },
  });
}

function buildPolicyHintPack(args: {
  tools: ToolsSelectRouteContract;
  introspection: ExecutionMemoryIntrospectionResponse;
  path: ReturnType<typeof choosePathRecommendation>;
}): PolicyHintPack {
  const hints: PolicyHintEntry[] = [];
  const selectedTool = firstString(args.tools.selection?.selected);
  const trustedPatterns = (Array.isArray(args.introspection.trusted_patterns) ? args.introspection.trusted_patterns : [])
    .map(toPolicyHintEntry)
    .filter((entry): entry is PolicyHintEntryLike => entry !== null);
  const contestedPatterns = (Array.isArray(args.introspection.contested_patterns) ? args.introspection.contested_patterns : [])
    .map(toPolicyHintEntry)
    .filter((entry): entry is PolicyHintEntryLike => entry !== null);
  const rehydrationCandidates = (Array.isArray(args.introspection.rehydration_candidates) ? args.introspection.rehydration_candidates : [])
    .map(toPolicyHintEntry)
    .filter((entry): entry is PolicyHintEntryLike => entry !== null);

  const preferredPattern = choosePreferredTrustedPattern({ trustedPatterns, selectedTool });
  if (preferredPattern && preferredPattern.selected_tool) {
    hints.push({
      hint_id: `tool_preference:${preferredPattern.anchor_id}:${preferredPattern.selected_tool}`,
      source_kind: "trusted_pattern",
      hint_kind: "tool_preference",
      action: "prefer",
      source_anchor_id: preferredPattern.anchor_id,
      source_anchor_level: preferredPattern.anchor_level ?? null,
      selected_tool: preferredPattern.selected_tool,
      workflow_signature: null,
      file_path: preferredPattern.file_path ?? null,
      target_files: preferredPattern.target_files ?? [],
      rehydration_mode: null,
      confidence: preferredPattern.confidence ?? null,
      priority: 100,
      reason: preferredPattern.summary ?? `Prefer ${preferredPattern.selected_tool} from trusted pattern memory.`,
    });
  }

  const selectedWorkflow = findSelectedWorkflow({
    introspection: args.introspection,
    path: args.path,
  });
  if (supportsWorkflowToolPreference({ workflow: selectedWorkflow, selectedTool })) {
    hints.push({
      hint_id: `tool_preference:${selectedWorkflow!.anchor_id}:${selectedTool}:workflow`,
      source_kind: "stable_workflow",
      hint_kind: "tool_preference",
      action: "prefer",
      source_anchor_id: selectedWorkflow!.anchor_id,
      source_anchor_level: "L2",
      selected_tool: selectedTool,
      workflow_signature: firstString(selectedWorkflow!.workflow_signature),
      file_path: firstString(selectedWorkflow!.file_path),
      target_files: stringList(selectedWorkflow!.target_files, 24),
      rehydration_mode: null,
      confidence: Number.isFinite(selectedWorkflow!.confidence ?? Number.NaN) ? (selectedWorkflow!.confidence ?? null) : null,
      priority: preferredPattern?.selected_tool === selectedTool ? 85 : 95,
      reason: `Prefer ${selectedTool} because stable workflow evidence supports reuse; ${workflowEvidenceParts(selectedWorkflow!).join("; ")}`,
    });
  }

  for (const entry of contestedPatterns.slice(0, 2)) {
    if (!entry.selected_tool) continue;
    hints.push({
      hint_id: `tool_avoidance:${entry.anchor_id}:${entry.selected_tool}`,
      source_kind: "contested_pattern",
      hint_kind: "tool_avoidance",
      action: "avoid",
      source_anchor_id: entry.anchor_id,
      source_anchor_level: entry.anchor_level ?? null,
      selected_tool: entry.selected_tool,
      workflow_signature: null,
      file_path: entry.file_path ?? null,
      target_files: entry.target_files ?? [],
      rehydration_mode: null,
      confidence: entry.confidence ?? null,
      priority: 80,
      reason: entry.summary ?? `Avoid ${entry.selected_tool} until contested pattern evidence is resolved.`,
    });
  }

  if (args.path.anchor_id) {
    hints.push({
      hint_id: `workflow_reuse:${args.path.anchor_id}`,
      source_kind: "stable_workflow",
      hint_kind: "workflow_reuse",
      action: "reuse",
      source_anchor_id: args.path.anchor_id,
      source_anchor_level: "L2",
      selected_tool: selectedTool,
      workflow_signature: args.path.workflow_signature,
      file_path: args.path.file_path,
      target_files: args.path.target_files,
      rehydration_mode: null,
      confidence: args.path.confidence,
      priority: 90,
      reason: workflowReuseReason(args.path),
    });
  }

  const rehydrationHint = rehydrationCandidates[0] ?? null;
  if (rehydrationHint) {
    hints.push({
      hint_id: `payload_rehydration:${rehydrationHint.anchor_id}`,
      source_kind: "rehydration_candidate",
      hint_kind: "payload_rehydration",
      action: "rehydrate",
      source_anchor_id: rehydrationHint.anchor_id,
      source_anchor_level: rehydrationHint.anchor_level ?? null,
      selected_tool: rehydrationHint.selected_tool ?? null,
      workflow_signature: rehydrationHint.workflow_signature ?? null,
      file_path: rehydrationHint.file_path ?? null,
      target_files: rehydrationHint.target_files ?? [],
      rehydration_mode: rehydrationHint.mode ?? "partial",
      confidence: rehydrationHint.confidence ?? null,
      priority: 60,
      reason: rehydrationHint.summary ?? "Rehydrate payload only if anchor-level memory is not enough.",
    });
  }

  return {
    summary_version: "policy_hint_pack_v1",
    total_hints: hints.length,
    tool_preference_count: hints.filter((entry) => entry.hint_kind === "tool_preference").length,
    tool_avoidance_count: hints.filter((entry) => entry.hint_kind === "tool_avoidance").length,
    workflow_reuse_count: hints.filter((entry) => entry.hint_kind === "workflow_reuse").length,
    payload_rehydration_count: hints.filter((entry) => entry.hint_kind === "payload_rehydration").length,
    hints,
  };
}

function buildPolicyContract(args: {
  historyApplied: boolean;
  derivedPolicy: DerivedPolicySurface | null;
  policyHints: PolicyHintPack;
  path: ReturnType<typeof choosePathRecommendation>;
  nextAction: string | null;
}): PolicyContract | null {
  if (!args.derivedPolicy) return null;
  const avoidTools = Array.from(new Set(
    args.policyHints.hints
      .filter((entry) => entry.hint_kind === "tool_avoidance" && entry.action === "avoid" && typeof entry.selected_tool === "string")
      .map((entry) => entry.selected_tool as string),
  ));
  const rehydrationMode =
    args.policyHints.hints.find((entry) => entry.hint_kind === "payload_rehydration" && entry.action === "rehydrate")?.rehydration_mode
    ?? null;
  const targetFiles = args.path.target_files.length > 0
    ? args.path.target_files
    : args.derivedPolicy.target_files.length > 0
      ? args.derivedPolicy.target_files
      : args.derivedPolicy.file_path
        ? [args.derivedPolicy.file_path]
        : [];
  const activationMode =
    args.derivedPolicy.policy_state === "stable" && args.historyApplied
      ? "default"
      : "hint";
  const reason = [
    args.derivedPolicy.reason,
    avoidTools.length > 0 ? `avoid=${avoidTools.join(", ")}` : null,
    rehydrationMode ? `rehydration=${rehydrationMode}` : null,
  ].filter((value): value is string => !!value).join("; ");

  return PolicyContractSchema.parse({
    summary_version: "policy_contract_v1",
    policy_kind: "tool_preference",
    source_kind: args.derivedPolicy.source_kind,
    policy_state: args.derivedPolicy.policy_state,
    policy_memory_state: "active",
    activation_mode: activationMode,
    materialization_state: "computed",
    history_applied: args.historyApplied,
    selected_tool: args.derivedPolicy.selected_tool,
    avoid_tools: avoidTools,
    workflow_signature: firstString(args.path.workflow_signature, args.derivedPolicy.workflow_signature),
    file_path: firstString(args.path.file_path, args.derivedPolicy.file_path),
    target_files: targetFiles,
    next_action: firstString(args.nextAction, args.path.next_action),
    rehydration_mode: rehydrationMode,
    confidence: args.derivedPolicy.confidence,
    source_anchor_ids: args.derivedPolicy.supporting_anchor_ids,
    policy_memory_id: null,
    reason,
  });
}

export function buildExperienceIntelligenceResponse(args: {
  parsed: ExperienceIntelligenceInput;
  tools: ToolsSelectRouteContract;
  introspection: ExecutionMemoryIntrospectionResponse;
  delegationLearning?: {
    task_family: string | null;
    matched_records: number;
    truncated: boolean;
    route_role_counts: Record<string, number>;
    record_outcome_counts: Record<string, number>;
    recommendation_count: number;
    learning_recommendations: Array<Record<string, unknown>>;
  };
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
  const liveHistoryApplied = trustedPatternAnchorIds.length > 0 || path.source_kind !== "none";
  const toolReason = firstString(args.tools.selection_summary.provenance_explanation);
  const pathReason = firstString(path.reason);
  const learningReason = [
    args.introspection.pattern_signal_summary.trusted_pattern_count > 0
      ? `trusted_patterns=${args.introspection.pattern_signal_summary.trusted_pattern_count}`
      : null,
    args.introspection.workflow_signal_summary.stable_workflow_count > 0
      ? `stable_workflows=${args.introspection.workflow_signal_summary.stable_workflow_count}`
      : null,
    path.reason,
    liveHistoryApplied ? "history_applied=true" : "history_applied=false",
  ].filter(Boolean).join("; ");
  const combinedNextAction = firstString(
    path.next_action,
    path.file_path && args.tools.selection.selected
      ? `Use ${args.tools.selection.selected} on ${path.file_path} as the next learned step.`
      : null,
  );
  const liveDerivedPolicy = buildDerivedPolicySurface({
    tools: args.tools,
    introspection: args.introspection,
    path,
  });
  const policyHints = buildPolicyHintPack({
    tools: args.tools,
    introspection: args.introspection,
    path,
  });
  const persistedPolicy = readPersistedPolicyMemory({
    introspection: args.introspection,
    queryText: args.parsed.query_text,
    context: args.parsed.context,
    selectedTool: args.tools.selection.selected ?? null,
    path,
    liveDerivedPolicy,
  });
  const historyApplied = liveHistoryApplied || !!persistedPolicy;
  const derivedPolicy = persistedPolicy?.derived_policy ?? liveDerivedPolicy;
  const policyContract = persistedPolicy
    ? PolicyContractSchema.parse({
        ...persistedPolicy.contract,
        history_applied: historyApplied,
        materialization_state: "persisted",
        policy_memory_id: persistedPolicy.node_id,
      })
    : buildPolicyContract({
        historyApplied,
        derivedPolicy,
        policyHints,
        path,
        nextAction: combinedNextAction,
      });
  const delegationLearning = args.delegationLearning ?? {
    task_family: null,
    matched_records: 0,
    truncated: false,
    route_role_counts: {},
    record_outcome_counts: {},
    recommendation_count: 0,
    learning_recommendations: [],
  };

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
    policy_hints: policyHints,
    derived_policy: derivedPolicy,
    policy_contract: policyContract,
    learning_summary: {
      task_family: delegationLearning.task_family,
      matched_records: delegationLearning.matched_records,
      truncated: delegationLearning.truncated,
      route_role_counts: delegationLearning.route_role_counts,
      record_outcome_counts: delegationLearning.record_outcome_counts,
      recommendation_count: delegationLearning.recommendation_count,
    },
    learning_recommendations: delegationLearning.learning_recommendations,
    rationale: {
      summary: [
        toolReason,
        pathReason,
        derivedPolicy ? `derived_policy=${derivedPolicy.source_kind}:${derivedPolicy.selected_tool}` : null,
        policyContract ? `policy_contract=${policyContract.activation_mode}:${policyContract.selected_tool}` : null,
        persistedPolicy ? `persisted_policy_memory=${persistedPolicy.node_id}` : null,
        learningReason,
      ].filter(Boolean).join(" | "),
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
  const recommendedWorkflows = Array.isArray(introspection.recommended_workflows) ? introspection.recommended_workflows : [];
  const candidateWorkflows = Array.isArray(introspection.candidate_workflows) ? introspection.candidate_workflows : [];
  const trustedPatterns = Array.isArray(introspection.trusted_patterns) ? introspection.trusted_patterns : [];
  const contestedPatterns = Array.isArray(introspection.contested_patterns) ? introspection.contested_patterns : [];
  const context = asRecord(parsed.context);
  const delegationLearning = await buildDelegationLearningSliceLite({
    liteWriteStore: args.liteWriteStore,
    body: parsed,
    tenantId: parsed.tenant_id ?? args.defaultTenantId,
    scope: parsed.scope ?? args.defaultScope,
    defaultScope: args.defaultScope,
    defaultTenantId: args.defaultTenantId,
    defaultActorId: args.defaultActorId,
    taskFamilies: [
      ...recommendedWorkflows.map((entry) => asRecord(entry)?.task_family),
      ...candidateWorkflows.map((entry) => asRecord(entry)?.task_family),
      ...trustedPatterns.map((entry) => asRecord(entry)?.task_family),
      ...contestedPatterns.map((entry) => asRecord(entry)?.task_family),
      context?.task_kind,
    ],
    limitCandidates: [parsed.workflow_limit],
  });
  return buildExperienceIntelligenceResponse({
    parsed,
    tools,
    introspection,
    delegationLearning,
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
    policy_contract: experience.policy_contract ?? null,
    rationale: {
      summary:
        typeof experience.rationale?.summary === "string"
          ? experience.rationale.summary
          : "",
    },
  });
}

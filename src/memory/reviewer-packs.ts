import { recoverHandoff } from "./handoff.js";
import { buildEvolutionInspectStateLite } from "./evolution-inspect.js";
import {
  ContinuityReviewPackResponseSchema,
  EvolutionReviewPackResponseSchema,
} from "./schemas.js";
import type { InMemoryExecutionStateStore } from "../execution/state-store.js";
import type { EmbeddingProvider } from "../embeddings/types.js";
import type { RecallStoreAccess } from "../store/recall-access.js";
import type { LiteWriteStore } from "../store/lite-write-store.js";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const next = typeof value === "string" ? value.trim() : "";
    if (next) return next;
  }
  return null;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function toContinuityFocusItem(handoff: Record<string, unknown> | null | undefined) {
  if (!handoff) return null;
  return {
    source_kind: "handoff",
    continuity_kind: "handoff",
    continuity_phase: "resume",
    occurred_at: null,
    title: firstString(handoff.title, handoff.summary, handoff.handoff_text),
    text_summary: firstString(handoff.summary, handoff.handoff_text),
    anchor: firstString(handoff.anchor),
    handoff_kind: firstString(handoff.handoff_kind),
    file_path: firstString(handoff.file_path),
    repo_root: firstString(handoff.repo_root),
    symbol: firstString(handoff.symbol),
    next_action: firstString(handoff.next_action),
  };
}

function buildContinuityReviewContract(recovered: Record<string, unknown>) {
  const executionReady = asRecord(recovered.execution_ready_handoff);
  if (Object.keys(executionReady).length === 0) return null;
  const mustKeep = stringList(executionReady.must_keep);
  const mustRemove = stringList(executionReady.must_remove);
  return {
    target_files: stringList(executionReady.target_files),
    next_action: firstString(executionReady.next_action),
    acceptance_checks: stringList(executionReady.acceptance_checks),
    must_change: stringList(executionReady.must_change),
    must_remove: mustRemove,
    must_keep: mustKeep,
    rollback_required: mustKeep.length > 0 || mustRemove.length > 0,
  };
}

export async function buildContinuityReviewPackLite(args: {
  liteWriteStore: LiteWriteStore;
  body: unknown;
  defaultScope: string;
  defaultTenantId: string;
  consumerAgentId?: string | null;
  consumerTeamId?: string | null;
  executionStateStore?: InMemoryExecutionStateStore | null;
}) {
  const recovered = await recoverHandoff({
    liteWriteStore: args.liteWriteStore,
    executionStateStore: args.executionStateStore,
    input: args.body,
    defaultScope: args.defaultScope,
    defaultTenantId: args.defaultTenantId,
    consumerAgentId: args.consumerAgentId ?? null,
    consumerTeamId: args.consumerTeamId ?? null,
  }) as Record<string, unknown>;

  const handoff = asRecord(recovered.handoff);
  const latestHandoff = toContinuityFocusItem(handoff);
  const latestResume = latestHandoff ? { ...latestHandoff, continuity_kind: "resume", continuity_phase: "resume" } : null;

  return ContinuityReviewPackResponseSchema.parse({
    tenant_id: firstString(recovered.tenant_id) ?? args.defaultTenantId,
    scope: firstString(recovered.scope) ?? args.defaultScope,
    sources: handoff && Object.keys(handoff).length > 0 ? [handoff] : [],
    items: [],
    page: {
      limit: 1,
      offset: 0,
      returned: 0,
      has_more: false,
    },
    counters: {
      total_items: 0,
      returned_items: 0,
      source_count: handoff && Object.keys(handoff).length > 0 ? 1 : 0,
    },
    continuity_inspect: {
      inspect_version: "continuity_inspect_v1",
      latest_handoff: latestHandoff,
      latest_resume: latestResume,
      latest_terminal_run: null,
    },
    continuity_review_pack: {
      pack_version: "continuity_review_pack_v1",
      latest_handoff: latestHandoff,
      latest_resume: latestResume,
      latest_terminal_run: null,
      recovered_handoff: handoff && Object.keys(handoff).length > 0 ? handoff : null,
      review_contract: buildContinuityReviewContract(recovered),
    },
  });
}

export async function buildEvolutionReviewPackLite(args: {
  liteWriteStore: LiteWriteStore;
  liteRecallAccess: RecallStoreAccess;
  embedder: EmbeddingProvider | null;
  body: unknown;
  defaultScope: string;
  defaultTenantId: string;
  defaultActorId?: string | null;
}) {
  const { artifacts, computed, evolutionInspect } = await buildEvolutionInspectStateLite({
    liteWriteStore: args.liteWriteStore,
    liteRecallAccess: args.liteRecallAccess,
    embedder: args.embedder,
    body: args.body,
    defaultScope: args.defaultScope,
    defaultTenantId: args.defaultTenantId,
    defaultActorId: args.defaultActorId ?? null,
    surface: "evolution_review_pack",
  });
  const { experience, introspection } = artifacts;
  const recommendedWorkflows = Array.isArray(introspection.recommended_workflows) ? introspection.recommended_workflows : [];
  const candidateWorkflows = Array.isArray(introspection.candidate_workflows) ? introspection.candidate_workflows : [];
  const trustedPatterns = Array.isArray(introspection.trusted_patterns) ? introspection.trusted_patterns : [];
  const contestedPatterns = Array.isArray(introspection.contested_patterns) ? introspection.contested_patterns : [];
  const stableWorkflow = (recommendedWorkflows[0] as Record<string, unknown> | undefined) ?? null;
  const promotionReadyWorkflow =
    (candidateWorkflows.find((entry) => asRecord(entry).promotion_ready === true) as Record<string, unknown> | undefined)
    ?? (recommendedWorkflows.find((entry) => asRecord(entry).promotion_ready === true) as Record<string, unknown> | undefined)
    ?? null;
  const trustedPattern = (trustedPatterns[0] as Record<string, unknown> | undefined) ?? null;
  const contestedPattern = (contestedPatterns[0] as Record<string, unknown> | undefined) ?? null;
  const promotionReadyAnchorIds = [...recommendedWorkflows, ...candidateWorkflows]
    .filter((entry) => asRecord(entry).promotion_ready === true)
    .map((entry) => firstString(asRecord(entry).anchor_id))
    .filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
  const selectedTool = firstString(experience.recommendation?.tool?.selected_tool);
  const recommendedFilePath = firstString(experience.recommendation?.path?.file_path);
  const recommendedNextAction = firstString(experience.recommendation?.combined_next_action, experience.recommendation?.path?.next_action);
  const targetFiles = Array.isArray(experience.recommendation?.path?.target_files)
    ? experience.recommendation.path.target_files.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];

  return EvolutionReviewPackResponseSchema.parse({
    summary_version: "evolution_review_pack_v1",
    tenant_id: experience.tenant_id,
    scope: experience.scope,
    query_text: experience.query_text,
    evolution_inspect: evolutionInspect,
    evolution_review_pack: {
      pack_version: "evolution_review_pack_v1",
      stable_workflow: stableWorkflow,
      promotion_ready_workflow: promotionReadyWorkflow,
      trusted_pattern: trustedPattern,
      contested_pattern: contestedPattern,
      derived_policy: experience.derived_policy ?? null,
      policy_contract: experience.policy_contract ?? null,
      policy_review: computed.policyReview,
      policy_governance_contract: computed.policyGovernanceContract,
      policy_governance_apply_payload: computed.policyGovernanceApplyPayload,
      policy_governance_apply_result: computed.policyGovernanceApplyResult,
      review_contract: {
        selected_tool: selectedTool,
        file_path: recommendedFilePath,
        target_files: targetFiles,
        next_action: recommendedNextAction,
        stable_workflow_anchor_id: firstString(stableWorkflow?.anchor_id),
        promotion_ready_anchor_ids: promotionReadyAnchorIds,
        trusted_pattern_anchor_ids: Array.isArray(experience.recommendation?.tool?.trusted_pattern_anchor_ids)
          ? experience.recommendation.tool.trusted_pattern_anchor_ids
          : [],
        contested_pattern_anchor_ids: contestedPatterns
          .map((entry) => firstString(asRecord(entry).anchor_id))
          .filter((entry): entry is string => typeof entry === "string" && entry.length > 0),
        suppressed_pattern_anchor_ids: Array.isArray(experience.recommendation?.tool?.suppressed_pattern_anchor_ids)
          ? experience.recommendation.tool.suppressed_pattern_anchor_ids
          : [],
      },
      learning_summary: experience.learning_summary,
      learning_recommendations: experience.learning_recommendations,
    },
  });
}

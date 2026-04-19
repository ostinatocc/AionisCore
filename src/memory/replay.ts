import { randomUUID } from "node:crypto";
import type pg from "pg";
import type { EmbeddingProvider } from "../embeddings/types.js";
import type { EmbeddedMemoryRuntime } from "../store/embedded-memory-runtime.js";
import type { LiteWriteStore } from "../store/lite-write-store.js";
import {
  createPostgresReplayStoreAccess,
  type ReplayNodeRow,
  type ReplayVisibilityArgs,
  type ReplayStoreAccess,
} from "../store/replay-access.js";
import type { WriteStoreAccess } from "../store/write-access.js";
import { HttpError } from "../util/http.js";
import { stableUuid } from "../util/uuid.js";
import {
  applyReplayLearningProjection,
  enqueueReplayLearningProjectionOutbox,
  type ReplayLearningProjectionResolvedConfig,
  type ReplayLearningProjectionResult,
} from "./replay-learning.js";
import {
  buildGovernedStateDecisionTrace,
  buildGovernanceDecisionTraceBase,
  deriveGovernedStateRaiseRuntimeApply,
  deriveGovernedStateRaisePreview,
} from "./governance-shared.js";
import { buildReplayCostSignals } from "./cost-signals.js";
import {
  ReplayPlaybookDispatchRequest,
  ReplayPlaybookCandidateRequest,
  ReplayPlaybookCompileRequest,
  ReplayPlaybookGetRequest,
  ReplayPlaybookPromoteRequest,
  ReplayPlaybookRepairRequest,
  ReplayPlaybookRepairReviewRequest,
  ReplayPlaybookRunRequest,
  ReplayRunEndRequest,
  ReplayRunGetRequest,
  ReplayRunStartRequest,
  ReplayStepAfterRequest,
  ReplayStepBeforeRequest,
  ExecutionNativeV1Schema,
  MemoryAnchorV1Schema,
  MemoryPromoteRequest,
  type ReplayRepairReviewGovernanceDecisionTrace,
  type ReplayRepairReviewGovernancePolicyEffect,
  type ReplayRepairReviewGovernancePreview,
  type ReplayPlaybookDispatchInput,
  type ReplayPlaybookCandidateInput,
  type ReplayPlaybookCompileInput,
  type ReplayPlaybookGetInput,
  type ReplayPlaybookPromoteInput,
  type ReplayPlaybookRepairInput,
  type ReplayPlaybookRepairReviewInput,
  type ReplayPlaybookRunInput,
  type ReplayRunEndInput,
  type ReplayRunGetInput,
  type ReplayRunStartInput,
  type ReplayStepAfterInput,
  type ReplayStepBeforeInput,
} from "./schemas.js";
import type { PromoteMemoryGovernanceReviewProvider } from "./governance-provider-types.js";
import { runPromoteMemoryGovernancePreview } from "./promote-memory-governance-shared.js";
import { resolveTenantScope } from "./tenant.js";
import { summarizeToolResult } from "./tool-result-summary.js";
import { buildAionisUri } from "./uri.js";
import { applyReplayMemoryWrite } from "./replay-write.js";
import {
  clampInt,
  detectSensitiveCommand,
  evaluateExpectedSignature,
  evaluatePostcondition,
  evaluatePrecondition,
  executeReplayCommand,
  isSafeCommandName,
  normalizeReplayExecutionBackend,
  normalizeReplaySensitiveReviewMode,
  type PreconditionResult,
  type ReplayExecutionBackend,
  type ReplaySensitiveReviewMode,
} from "./replay-execution-helpers.js";
import {
  asStringArray,
  asStringRecord,
  isReplayCommandTool,
  makeGuidedRepairPatch,
  mergeReplayUsage,
  parseStepArgv,
  type ReplayGuidedRepairStrategy,
} from "./replay-guided-repair.js";
import {
  dedupeReplayCompileSteps,
  enrichReplayCompileStepsWithQuality,
  enrichReplayCompileStepsWithVariables,
  evaluateReplayDeterministicGate,
  nextActionForReplayDeterministicGate,
  type ReplayDeterministicGateEvaluation,
  type ReplayDeterministicGateResolved,
} from "./replay-compile-helpers.js";
import {
  applyPlaybookRepairPatch,
  buildCommitUri,
  evaluateAutoPromoteGate,
  extractShadowValidationGateMetrics,
  validatePlaybookShadowReadiness,
} from "./replay-repair-shadow-helpers.js";
import {
  buildReplayAutoPromotedSlots,
  buildReplayPlaybookNoopPromoteResult,
  buildReplayPlaybookProcedureWriteRequest,
  buildReplayPlaybookVersionResult,
  buildReplayPromotedSlots,
  buildReplayRepairedSlots,
  buildReplayReviewedSlots,
} from "./replay-promotion-review-helpers.js";
import {
  buildReplayBlockedStepReport,
  buildReplayExecutionFailureStepReport,
  buildReplayExecutionSuccessStepReport,
  buildReplayExecutionSummary,
  buildReplayExecutionSurface,
  buildReplayGuidedPartialStepReport,
  buildReplayPendingStepReport,
  buildReplayRunPlaybookSurface,
  buildReplayRunSurface,
  buildReplaySimulateStepReport,
  buildReplaySimulateSummary,
} from "./replay-run-surfaces.js";
import {
  buildReplayCompileResult,
  buildReplayCompileSlots,
  buildReplayCompileWriteRequest,
  buildReplayRunGetCounters,
  buildReplayRunGetRunSurface,
  buildReplayRunGetStepSurface,
  buildReplayTimelineEntry,
  collectReplayArtifactRefs,
} from "./replay-read-compile-surfaces.js";
import {
  buildReplayDispatchSurface,
  buildReplayPlaybookCandidateSurface,
  buildReplayPlaybookGetSurface,
} from "./replay-playbook-read-dispatch-surfaces.js";
import {
  buildStablePlaybookNodeFields,
  ensureStablePlaybookAnchorOnLatestNode,
} from "./replay-stable-anchor-helpers.js";

type ReplayWriteOptions = {
  defaultScope: string;
  defaultTenantId: string;
  maxTextLen: number;
  piiRedaction: boolean;
  allowCrossScopeEdges: boolean;
  shadowDualWriteEnabled: boolean;
  shadowDualWriteStrict: boolean;
  writeAccessShadowMirrorV2: boolean;
  embedder: EmbeddingProvider | null;
  embeddedRuntime?: EmbeddedMemoryRuntime | null;
  replayAccess?: ReplayStoreAccess | null;
  replayMirror?: import("./replay-write.js").ReplayWriteMirror | null;
  writeAccess?: WriteStoreAccess | null;
};

type ReplayReadOptions = {
  defaultScope: string;
  defaultTenantId: string;
  embeddedRuntime?: EmbeddedMemoryRuntime | null;
  replayAccess?: ReplayStoreAccess | null;
};

type ReplayLocalExecutorOptions = {
  enabled: boolean;
  mode: "disabled" | "local_process";
  allowedCommands: Set<string>;
  workdir: string;
  timeoutMs: number;
  stdioMaxBytes: number;
};

type ReplayGuidedRepairOptions = {
  strategy: ReplayGuidedRepairStrategy;
  allowRequestBuiltinLlm: boolean;
  maxErrorChars: number;
  httpEndpoint?: string | null;
  httpTimeoutMs?: number;
  httpAuthToken?: string | null;
  llmBaseUrl?: string | null;
  llmApiKey?: string | null;
  llmModel?: string | null;
  llmTimeoutMs?: number;
  llmMaxTokens?: number;
  llmTemperature?: number;
};

type ReplayShadowValidationPolicyOptions = {
  executeTimeoutMs: number;
  executeStopOnFailure: boolean;
  sandboxTimeoutMs: number;
  sandboxStopOnFailure: boolean;
};

type ReplayPlaybookRunOptions = ReplayReadOptions & {
  writeOptions?: ReplayWriteOptions;
  localExecutor?: ReplayLocalExecutorOptions;
  guidedRepair?: ReplayGuidedRepairOptions;
  sandboxExecutor?: (input: {
    tenant_id: string;
    scope: string;
    project_id: string | null;
    argv: string[];
    timeout_ms: number;
    mode: "sync" | "async";
    metadata?: Record<string, unknown>;
  }) => Promise<{
    ok: boolean;
    status: string;
    stdout: string;
    stderr: string;
    exit_code: number | null;
    error: string | null;
    run_id?: string | null;
  }>;
  sandboxBudgetGuard?: (input: {
    tenant_id: string;
    scope: string;
    project_id: string | null;
  }) => Promise<void>;
};

type ReplayPlaybookReviewOptions = ReplayWriteOptions & {
  localExecutor?: ReplayLocalExecutorOptions;
  shadowValidationPolicy?: ReplayShadowValidationPolicyOptions;
  learningProjectionDefaults?: ReplayLearningProjectionResolvedConfig;
  governanceReviewProviders?: {
    promote_memory?: PromoteMemoryGovernanceReviewProvider | null;
  };
  sandboxValidationExecutor?: (input: {
    tenant_id: string;
    scope: string;
    argv: string[];
    timeout_ms: number;
    mode?: "sync" | "async";
    metadata?: Record<string, unknown>;
  }) => Promise<{
    ok: boolean;
    status: string;
    stdout: string;
    stderr: string;
    exit_code: number | null;
    error: string | null;
    run_id?: string | null;
  }>;
};

function runClientId(runId: string): string {
  return `replay:run:${runId}`;
}

function stepClientId(runId: string, stepId: string): string {
  return `replay:step:${runId}:${stepId}`;
}

function stepResultClientId(runId: string, stepId: string | null, status: string): string {
  return `replay:step_result:${runId}:${stepId ?? "na"}:${status}`;
}

function runEndClientId(runId: string): string {
  return `replay:run_end:${runId}`;
}

function playbookClientId(playbookId: string, version: number): string {
  return `replay:playbook:${playbookId}:v${version}`;
}

function replayWriteNodeId(scopeKey: string, clientId: string): string {
  return stableUuid(`${scopeKey}:node:${clientId.trim()}`);
}

function parseRunStartInput(body: unknown): ReplayRunStartInput {
  return ReplayRunStartRequest.parse(body);
}

function parseStepBeforeInput(body: unknown): ReplayStepBeforeInput {
  return ReplayStepBeforeRequest.parse(body);
}

function parseStepAfterInput(body: unknown): ReplayStepAfterInput {
  return ReplayStepAfterRequest.parse(body);
}

function parseRunEndInput(body: unknown): ReplayRunEndInput {
  return ReplayRunEndRequest.parse(body);
}

function parseRunGetInput(body: unknown): ReplayRunGetInput {
  return ReplayRunGetRequest.parse(body);
}

function parsePlaybookCompileInput(body: unknown): ReplayPlaybookCompileInput {
  return ReplayPlaybookCompileRequest.parse(body);
}

function parsePlaybookGetInput(body: unknown): ReplayPlaybookGetInput {
  return ReplayPlaybookGetRequest.parse(body);
}

function parsePlaybookCandidateInput(body: unknown): ReplayPlaybookCandidateInput {
  return ReplayPlaybookCandidateRequest.parse(body);
}

function parsePlaybookDispatchInput(body: unknown): ReplayPlaybookDispatchInput {
  return ReplayPlaybookDispatchRequest.parse(body);
}

function parsePlaybookPromoteInput(body: unknown): ReplayPlaybookPromoteInput {
  return ReplayPlaybookPromoteRequest.parse(body);
}

function parsePlaybookRunInput(body: unknown): ReplayPlaybookRunInput {
  return ReplayPlaybookRunRequest.parse(body);
}

function parsePlaybookRepairInput(body: unknown): ReplayPlaybookRepairInput {
  return ReplayPlaybookRepairRequest.parse(body);
}

function parsePlaybookRepairReviewInput(body: unknown): ReplayPlaybookRepairReviewInput {
  return ReplayPlaybookRepairReviewRequest.parse(body);
}

type ReplayWriteIdentity = {
  memory_lane?: "private" | "shared";
  producer_agent_id?: string;
  owner_agent_id?: string;
  owner_team_id?: string;
};

function replayVisibilityFromInput(input: {
  consumer_agent_id?: string | null;
  consumer_team_id?: string | null;
}): ReplayVisibilityArgs {
  return {
    consumerAgentId: toStringOrNull(input.consumer_agent_id) ?? null,
    consumerTeamId: toStringOrNull(input.consumer_team_id) ?? null,
  };
}

function replayWriteIdentityFromInput(
  input: {
    memory_lane?: string | null;
    producer_agent_id?: string | null;
    owner_agent_id?: string | null;
    owner_team_id?: string | null;
  },
  fallback?: ReplayWriteIdentity,
): ReplayWriteIdentity {
  const memoryLane = toStringOrNull(input.memory_lane);
  const producerAgentId = toStringOrNull(input.producer_agent_id);
  const ownerAgentId = toStringOrNull(input.owner_agent_id);
  const ownerTeamId = toStringOrNull(input.owner_team_id);
  return {
    memory_lane: memoryLane === "shared" || memoryLane === "private" ? memoryLane : fallback?.memory_lane,
    producer_agent_id: producerAgentId ?? fallback?.producer_agent_id,
    owner_agent_id: ownerAgentId ?? fallback?.owner_agent_id,
    owner_team_id: ownerTeamId ?? fallback?.owner_team_id,
  };
}

function replayWriteIdentityFromRow(row: ReplayNodeRow): ReplayWriteIdentity {
  return {
    memory_lane: row.memory_lane,
    producer_agent_id: row.producer_agent_id ?? undefined,
    owner_agent_id: row.owner_agent_id ?? undefined,
    owner_team_id: row.owner_team_id ?? undefined,
  };
}

function asObject(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function toStringOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

function estimateTokenCountFromUnknown(v: unknown): number {
  let text = "";
  try {
    text = JSON.stringify(v ?? {});
  } catch {
    text = String(v ?? "");
  }
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

function replayKindOf(row: ReplayNodeRow): string {
  const slotsObj = asObject(row.slots);
  const kind = slotsObj ? toStringOrNull(slotsObj.replay_kind) : null;
  return kind ?? "";
}

function requireReplayReadAccess(opts: ReplayReadOptions | ReplayWriteOptions) {
  if (opts.embeddedRuntime && !opts.replayAccess) {
    throw new HttpError(
      501,
      "replay_read_not_supported_in_embedded",
      "Replay read/compile endpoints currently require postgres backend.",
    );
  }
}

function replayAccessForClient(client: pg.PoolClient, opts?: ReplayReadOptions | ReplayWriteOptions): ReplayStoreAccess {
  return opts?.replayAccess ?? createPostgresReplayStoreAccess(client);
}

const UUID_V4_OR_VX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function asLiteReplayWriteStore(writeAccess?: WriteStoreAccess | null): LiteWriteStore | null {
  if (
    !writeAccess
    || typeof (writeAccess as LiteWriteStore).withTx !== "function"
    || typeof (writeAccess as LiteWriteStore).findNodes !== "function"
  ) {
    return null;
  }
  return writeAccess as LiteWriteStore;
}

function resolveReplayLearningProjectionConfig(
  requestObj: Record<string, unknown> | null,
  defaults: ReplayLearningProjectionResolvedConfig | undefined,
): ReplayLearningProjectionResolvedConfig {
  const base: ReplayLearningProjectionResolvedConfig = defaults ?? {
    enabled: false,
    mode: "rule_and_episode",
    delivery: "async_outbox",
    target_rule_state: "draft",
    min_total_steps: 1,
    min_success_ratio: 1,
    max_matcher_bytes: 16384,
    max_tool_prefer: 8,
    episode_ttl_days: 30,
  };
  const modeRaw = toStringOrNull(requestObj?.mode);
  const deliveryRaw = toStringOrNull(requestObj?.delivery);
  const stateRaw = toStringOrNull(requestObj?.target_rule_state);
  return {
    enabled: requestObj?.enabled === undefined ? base.enabled : requestObj.enabled === true,
    mode:
      modeRaw == null
        ? base.mode
        : modeRaw === "episode_only"
          ? "episode_only"
          : "rule_and_episode",
    delivery:
      deliveryRaw == null
        ? base.delivery
        : deliveryRaw === "sync_inline"
          ? "sync_inline"
          : "async_outbox",
    target_rule_state:
      stateRaw == null
        ? base.target_rule_state
        : stateRaw === "shadow"
          ? "shadow"
          : "draft",
    min_total_steps: clampInt(Number(requestObj?.min_total_steps ?? base.min_total_steps), 0, 500),
    min_success_ratio: Math.max(0, Math.min(1, Number(requestObj?.min_success_ratio ?? base.min_success_ratio))),
    max_matcher_bytes: clampInt(Number(base.max_matcher_bytes), 1, 1024 * 1024),
    max_tool_prefer: clampInt(Number(base.max_tool_prefer), 1, 64),
    episode_ttl_days: clampInt(Number(base.episode_ttl_days), 1, 3650),
  };
}

function hasExplicitReplayLearningProjectionTargetRuleState(requestObj: Record<string, unknown> | null): boolean {
  return toStringOrNull(requestObj?.target_rule_state) != null;
}

function deriveReplayGovernancePolicyEffect(args: {
  baseTargetRuleState: "draft" | "shadow";
  explicitTargetRuleState: boolean;
  review: ReplayRepairReviewGovernancePreview["promote_memory"]["review_result"] | null;
  admissibility: ReplayRepairReviewGovernancePreview["promote_memory"]["admissibility"] | null;
}): ReplayRepairReviewGovernancePolicyEffect {
  const admissibility = args.admissibility ?? null;
  const review = args.review ?? null;
  const baseTargetRuleState = args.baseTargetRuleState;
  const derived = deriveGovernedStateRaisePreview({
    baseState: baseTargetRuleState,
    review,
    admissibility,
    defaultSource: "default_learning_projection",
    reviewSource: "promote_memory_governance_review",
    noReviewReason: "review_not_supplied",
    notAdmissibleReason: "review_not_admissible",
    noRaiseReason: "review_did_not_raise_target_rule_state",
    applyReason: "high_strategic_value_workflow_promotion",
    noRaiseSuggestedState: null,
    appliedState: "shadow",
    extraNoApplyGuards: [{
      when: args.explicitTargetRuleState,
      reason: "explicit_target_rule_state_preserved",
      reviewSuggestedState: null,
    }],
    shouldApply: (presentReview) =>
      presentReview.adjudication.disposition === "recommend"
      && presentReview.adjudication.target_kind === "workflow"
      && presentReview.adjudication.target_level === "L2"
      && presentReview.adjudication.strategic_value === "high"
      && baseTargetRuleState === "draft",
  });
  return {
    source: derived.source,
    applies: derived.applies,
    base_target_rule_state: derived.baseState,
    review_suggested_target_rule_state: derived.reviewSuggestedState,
    effective_target_rule_state: derived.effectiveState,
    reason_code: derived.reasonCode,
  };
}

function applyReplayGovernancePolicyEffect(args: {
  config: ReplayLearningProjectionResolvedConfig;
  policyEffect: ReplayRepairReviewGovernancePolicyEffect | null;
}): ReplayLearningProjectionResolvedConfig {
  const policyEffect = args.policyEffect ?? null;
  const applyGate = deriveGovernedStateRaiseRuntimeApply({
    policyEffect,
    effectiveState: policyEffect?.effective_target_rule_state,
    appliedState: "shadow",
  });
  if (!applyGate.runtimeApplyRequested || !applyGate.governedOverrideState) return args.config;
  return {
    ...args.config,
    target_rule_state: applyGate.governedOverrideState,
  };
}

function buildReplayGovernanceDecisionTrace(args: {
  reviewResult: ReplayRepairReviewGovernancePreview["promote_memory"]["review_result"] | null;
  admissibility: ReplayRepairReviewGovernancePreview["promote_memory"]["admissibility"] | null;
  policyEffect: ReplayRepairReviewGovernancePreview["promote_memory"]["policy_effect"] | null;
  effectiveConfig: ReplayLearningProjectionResolvedConfig;
}): ReplayRepairReviewGovernanceDecisionTrace {
  const admissibility = args.admissibility ?? null;
  const policyEffect = args.policyEffect ?? null;
  const baseTargetRuleState = policyEffect?.base_target_rule_state ?? args.effectiveConfig.target_rule_state;
  const effectiveTargetRuleState = args.effectiveConfig.target_rule_state;
  const trace = buildGovernedStateDecisionTrace({
    reviewResult: args.reviewResult,
    admissibility,
    policyEffect,
    includePolicyEffectReasonCode: true,
    runtimePolicyApplied: true,
    baseState: baseTargetRuleState,
    effectiveState: effectiveTargetRuleState,
  });

  return {
    trace_version: "replay_governance_trace_v1",
    review_supplied: trace.review_supplied,
    admissibility_evaluated: trace.admissibility_evaluated,
    admissible: trace.admissible,
    policy_effect_applies: trace.policy_effect_applies,
    base_target_rule_state: trace.baseState,
    effective_target_rule_state: trace.effectiveState,
    runtime_apply_changed_target_rule_state: trace.runtimeApplyChanged,
    stage_order: trace.stage_order as ReplayRepairReviewGovernanceDecisionTrace["stage_order"],
    reason_codes: trace.reason_codes,
  };
}

export async function replayRunStart(client: pg.PoolClient, body: unknown, opts: ReplayWriteOptions) {
  const parsed = parseRunStartInput(body);
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    { defaultScope: opts.defaultScope, defaultTenantId: opts.defaultTenantId },
  );
  const writeIdentity = replayWriteIdentityFromInput(parsed);
  const runId = parsed.run_id ?? randomUUID();
  const cid = runClientId(runId);
  const nowIso = new Date().toISOString();
  const writeReq = {
    tenant_id: tenancy.tenant_id,
    scope: tenancy.scope,
    actor: parsed.actor ?? "replay_api",
    input_text: parsed.goal,
    auto_embed: false,
    ...writeIdentity,
    nodes: [
      {
        client_id: cid,
        type: "event" as const,
        title: `Replay Run ${runId.slice(0, 8)}`,
        text_summary: parsed.goal,
        slots: {
          replay_kind: "run",
          run_id: runId,
          goal: parsed.goal,
          status: "started",
          started_at: nowIso,
          context_snapshot_ref: parsed.context_snapshot_ref ?? null,
          context_snapshot_hash: parsed.context_snapshot_hash ?? null,
          metadata: parsed.metadata ?? {},
        },
      },
    ],
    edges: [],
  };
  const { out } = await applyReplayMemoryWrite(client, writeReq, opts);
  const node = out.nodes.find((n) => n.client_id === cid) ?? out.nodes[0] ?? null;
  return {
    tenant_id: tenancy.tenant_id,
    scope: tenancy.scope,
    run_id: runId,
    status: "started",
    run_node_id: node?.id ?? null,
    run_uri:
      node?.id != null
        ? buildAionisUri({
            tenant_id: tenancy.tenant_id,
            scope: tenancy.scope,
            type: "event",
            id: node.id,
          })
        : null,
    commit_id: out.commit_id,
    commit_uri: out.commit_uri ?? buildCommitUri(tenancy.tenant_id, tenancy.scope, out.commit_id),
    commit_hash: out.commit_hash,
  };
}

export async function replayStepBefore(client: pg.PoolClient, body: unknown, opts: ReplayWriteOptions) {
  const parsed = parseStepBeforeInput(body);
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    { defaultScope: opts.defaultScope, defaultTenantId: opts.defaultTenantId },
  );
  const visibility = replayVisibilityFromInput(parsed);
  const writeIdentity = replayWriteIdentityFromInput(parsed);
  const replayAccess = replayAccessForClient(client, opts);
  const runNode = await replayAccess.findRunNodeByRunId(tenancy.scope_key, parsed.run_id, visibility);
  if (!runNode) {
    throw new HttpError(404, "replay_run_not_found", "run_id was not found in this scope", {
      run_id: parsed.run_id,
      scope: tenancy.scope,
      tenant_id: tenancy.tenant_id,
    });
  }
  const stepId = parsed.step_id ?? randomUUID();
  const stepCid = stepClientId(parsed.run_id, stepId);
  const writeReq = {
    tenant_id: tenancy.tenant_id,
    scope: tenancy.scope,
    actor: parsed.actor ?? "replay_api",
    input_text: `step before ${parsed.tool_name}`,
    auto_embed: false,
    ...writeIdentity,
    nodes: [
      {
        client_id: stepCid,
        type: "procedure" as const,
        title: `Step ${parsed.step_index}: ${parsed.tool_name}`,
        text_summary: `Replay step ${parsed.step_index} prepared for ${parsed.tool_name}`,
        slots: {
          replay_kind: "step",
          phase: "before",
          run_id: parsed.run_id,
          step_id: stepId,
          decision_id: parsed.decision_id ?? null,
          step_index: parsed.step_index,
          tool_name: parsed.tool_name,
          tool_input: parsed.tool_input,
          expected_output_signature: parsed.expected_output_signature ?? null,
          preconditions: parsed.preconditions,
          retry_policy: parsed.retry_policy ?? null,
          safety_level: parsed.safety_level,
          status: "pending",
          metadata: parsed.metadata ?? {},
        },
      },
    ],
    edges: [
      {
        type: "part_of" as const,
        src: { client_id: stepCid },
        dst: { id: runNode.id },
      },
    ],
  };
  const { out } = await applyReplayMemoryWrite(client, writeReq, opts);
  const stepNode = out.nodes.find((n) => n.client_id === stepCid) ?? out.nodes[0] ?? null;
  return {
    tenant_id: tenancy.tenant_id,
    scope: tenancy.scope,
    run_id: parsed.run_id,
    step_id: stepId,
    step_index: parsed.step_index,
    status: "pending",
    step_node_id: stepNode?.id ?? null,
    step_uri:
      stepNode?.id != null
        ? buildAionisUri({
            tenant_id: tenancy.tenant_id,
            scope: tenancy.scope,
            type: "procedure",
            id: stepNode.id,
          })
        : null,
    commit_id: out.commit_id,
    commit_uri: out.commit_uri ?? buildCommitUri(tenancy.tenant_id, tenancy.scope, out.commit_id),
    commit_hash: out.commit_hash,
  };
}

export async function replayStepAfter(client: pg.PoolClient, body: unknown, opts: ReplayWriteOptions) {
  const parsed = parseStepAfterInput(body);
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    { defaultScope: opts.defaultScope, defaultTenantId: opts.defaultTenantId },
  );
  const visibility = replayVisibilityFromInput(parsed);
  const writeIdentity = replayWriteIdentityFromInput(parsed);
  const replayAccess = replayAccessForClient(client, opts);
  const runNode = await replayAccess.findRunNodeByRunId(tenancy.scope_key, parsed.run_id, visibility);
  if (!runNode) {
    throw new HttpError(404, "replay_run_not_found", "run_id was not found in this scope", {
      run_id: parsed.run_id,
      scope: tenancy.scope,
      tenant_id: tenancy.tenant_id,
    });
  }
  let stepNode: ReplayNodeRow | null = null;
  let resolvedStepId = parsed.step_id ?? null;
  if (resolvedStepId) {
    stepNode = await replayAccess.findStepNodeById(tenancy.scope_key, resolvedStepId, visibility);
  } else if (parsed.step_index != null) {
    stepNode = await replayAccess.findLatestStepNodeByIndex(tenancy.scope_key, parsed.run_id, parsed.step_index, visibility);
    resolvedStepId =
      toStringOrNull(asObject(stepNode?.slots)?.step_id)
      ?? (stepNode?.id ?? null);
  }
  if (!stepNode && !resolvedStepId) {
    throw new HttpError(
      400,
      "replay_step_reference_required",
      "step_id or step_index is required to record step outcome",
      { run_id: parsed.run_id },
    );
  }
  const resultCid = stepResultClientId(parsed.run_id, resolvedStepId, parsed.status);
  const writeReq = {
    tenant_id: tenancy.tenant_id,
    scope: tenancy.scope,
    actor: parsed.actor ?? "replay_api",
    input_text: `step after ${parsed.status}`,
    auto_embed: false,
    ...writeIdentity,
    nodes: [
      {
        client_id: resultCid,
        type: "evidence" as const,
        title: `Step ${parsed.step_index ?? "?"} ${parsed.status}`,
        text_summary: parsed.error ?? parsed.repair_note ?? `Replay step outcome: ${parsed.status}`,
        slots: {
          replay_kind: "step_result",
          phase: "after",
          run_id: parsed.run_id,
          step_id: resolvedStepId,
          step_index: parsed.step_index ?? null,
          status: parsed.status,
          output_signature: parsed.output_signature ?? null,
          postconditions: parsed.postconditions,
          artifact_refs: parsed.artifact_refs,
          repair_applied: parsed.repair_applied,
          repair_note: parsed.repair_note ?? null,
          error: parsed.error ?? null,
          metadata: parsed.metadata ?? {},
        },
      },
    ],
    edges: [
      {
        type: "part_of" as const,
        src: { client_id: resultCid },
        dst: { id: runNode.id },
      },
      ...(stepNode
        ? [
            {
              type: "related_to" as const,
              src: { client_id: resultCid },
              dst: { id: stepNode.id },
            },
          ]
        : []),
    ],
  };
  const { out } = await applyReplayMemoryWrite(client, writeReq, opts);
  const resultNode = out.nodes.find((n) => n.client_id === resultCid) ?? out.nodes[0] ?? null;
  return {
    tenant_id: tenancy.tenant_id,
    scope: tenancy.scope,
    run_id: parsed.run_id,
    step_id: resolvedStepId,
    status: parsed.status,
    replay_fallback_triggered: parsed.repair_applied,
    step_result_node_id: resultNode?.id ?? null,
    step_result_uri:
      resultNode?.id != null
        ? buildAionisUri({
            tenant_id: tenancy.tenant_id,
            scope: tenancy.scope,
            type: "evidence",
            id: resultNode.id,
          })
        : null,
    commit_id: out.commit_id,
    commit_uri: out.commit_uri ?? buildCommitUri(tenancy.tenant_id, tenancy.scope, out.commit_id),
    commit_hash: out.commit_hash,
  };
}

export async function replayRunEnd(client: pg.PoolClient, body: unknown, opts: ReplayWriteOptions) {
  const parsed = parseRunEndInput(body);
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    { defaultScope: opts.defaultScope, defaultTenantId: opts.defaultTenantId },
  );
  const visibility = replayVisibilityFromInput(parsed);
  const writeIdentity = replayWriteIdentityFromInput(parsed);
  const replayAccess = replayAccessForClient(client, opts);
  const runNode = await replayAccess.findRunNodeByRunId(tenancy.scope_key, parsed.run_id, visibility);
  if (!runNode) {
    throw new HttpError(404, "replay_run_not_found", "run_id was not found in this scope", {
      run_id: parsed.run_id,
      scope: tenancy.scope,
      tenant_id: tenancy.tenant_id,
    });
  }
  const endCid = runEndClientId(parsed.run_id);
  const writeReq = {
    tenant_id: tenancy.tenant_id,
    scope: tenancy.scope,
    actor: parsed.actor ?? "replay_api",
    input_text: parsed.summary ?? `run ${parsed.status}`,
    auto_embed: false,
    ...writeIdentity,
    nodes: [
      {
        client_id: endCid,
        type: "event" as const,
        title: `Replay Run End ${parsed.status}`,
        text_summary: parsed.summary ?? `Replay run ended with status=${parsed.status}`,
        slots: {
          replay_kind: "run_end",
          run_id: parsed.run_id,
          status: parsed.status,
          summary: parsed.summary ?? null,
          success_criteria: parsed.success_criteria ?? {},
          metrics: parsed.metrics ?? {},
          metadata: parsed.metadata ?? {},
          ended_at: new Date().toISOString(),
        },
      },
    ],
    edges: [
      {
        type: "part_of" as const,
        src: { client_id: endCid },
        dst: { id: runNode.id },
      },
    ],
  };
  const { out } = await applyReplayMemoryWrite(client, writeReq, opts);
  const endNode = out.nodes.find((n) => n.client_id === endCid) ?? out.nodes[0] ?? null;
  return {
    tenant_id: tenancy.tenant_id,
    scope: tenancy.scope,
    run_id: parsed.run_id,
    status: parsed.status,
    run_end_node_id: endNode?.id ?? null,
    run_end_uri:
      endNode?.id != null
        ? buildAionisUri({
            tenant_id: tenancy.tenant_id,
            scope: tenancy.scope,
            type: "event",
            id: endNode.id,
          })
        : null,
    commit_id: out.commit_id,
    commit_uri: out.commit_uri ?? buildCommitUri(tenancy.tenant_id, tenancy.scope, out.commit_id),
    commit_hash: out.commit_hash,
  };
}

export async function replayRunGet(client: pg.PoolClient, body: unknown, opts: ReplayReadOptions) {
  requireReplayReadAccess(opts);
  const parsed = parseRunGetInput(body);
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    { defaultScope: opts.defaultScope, defaultTenantId: opts.defaultTenantId },
  );
  const visibility = replayVisibilityFromInput(parsed);
  const replayAccess = replayAccessForClient(client, opts);
  const rows = await replayAccess.listReplayNodesByRunId(tenancy.scope_key, parsed.run_id, visibility);
  if (rows.length === 0) {
    throw new HttpError(404, "replay_run_not_found", "run_id was not found in this scope", {
      run_id: parsed.run_id,
      scope: tenancy.scope,
      tenant_id: tenancy.tenant_id,
    });
  }

  const runNode = rows.find((r) => replayKindOf(r) === "run") ?? null;
  const runEndRows = rows.filter((r) => replayKindOf(r) === "run_end");
  const lastRunEnd = runEndRows.length > 0 ? runEndRows[runEndRows.length - 1] : null;
  const stepRows = rows.filter((r) => replayKindOf(r) === "step");
  const stepResultRows = rows.filter((r) => replayKindOf(r) === "step_result");
  const resultByStepId = new Map<string, ReplayNodeRow>();
  for (const row of stepResultRows) {
    const sid = toStringOrNull(asObject(row.slots)?.step_id);
    if (!sid) continue;
    resultByStepId.set(sid, row);
  }
  const timeline = rows.map((row) =>
    buildReplayTimelineEntry({
      tenantId: tenancy.tenant_id,
      scope: tenancy.scope,
      row,
      replayKind: replayKindOf(row),
      commitUri: row.commit_id != null ? buildCommitUri(tenancy.tenant_id, tenancy.scope, row.commit_id) : null,
    }),
  );

  const artifacts = collectReplayArtifactRefs(stepResultRows, parsed.include_artifacts);

  const runStatus = toStringOrNull(asObject(lastRunEnd?.slots)?.status) ?? "in_progress";
  const runGoal = toStringOrNull(asObject(runNode?.slots)?.goal);

  return {
    tenant_id: tenancy.tenant_id,
    scope: tenancy.scope,
    run: buildReplayRunGetRunSurface({
      tenantId: tenancy.tenant_id,
      scope: tenancy.scope,
      runId: parsed.run_id,
      runNode,
      lastRunEnd,
      runStatus,
      runGoal,
    }),
    steps: parsed.include_steps
      ? stepRows.map((row) => {
          const slotsObj = asObject(row.slots);
          const sid = toStringOrNull(slotsObj?.step_id) ?? row.id;
          return buildReplayRunGetStepSurface({
            tenantId: tenancy.tenant_id,
            scope: tenancy.scope,
            row,
            result: resultByStepId.get(sid) ?? null,
          });
        })
      : [],
    artifacts: parsed.include_artifacts ? artifacts : [],
    timeline,
    counters: buildReplayRunGetCounters({
      totalNodes: rows.length,
      stepNodes: stepRows.length,
      stepResultNodes: stepResultRows.length,
      artifactRefs: artifacts.length,
    }),
  };
}

export async function replayPlaybookCompileFromRun(client: pg.PoolClient, body: unknown, opts: ReplayWriteOptions) {
  const parsed = parsePlaybookCompileInput(body);
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    { defaultScope: opts.defaultScope, defaultTenantId: opts.defaultTenantId },
  );
  const visibility = replayVisibilityFromInput(parsed);
  requireReplayReadAccess(opts);
  const replayAccess = replayAccessForClient(client, opts);
  const rows = await replayAccess.listReplayNodesByRunId(tenancy.scope_key, parsed.run_id, visibility);
  if (rows.length === 0) {
    throw new HttpError(404, "replay_run_not_found", "run_id was not found in this scope", {
      run_id: parsed.run_id,
      scope: tenancy.scope,
      tenant_id: tenancy.tenant_id,
    });
  }
  const runNode = rows.find((r) => replayKindOf(r) === "run") ?? null;
  const runEndRows = rows.filter((r) => replayKindOf(r) === "run_end");
  const lastRunEnd = runEndRows.length > 0 ? runEndRows[runEndRows.length - 1] : null;
  const runStatus = toStringOrNull(asObject(lastRunEnd?.slots)?.status);
  if (!parsed.allow_partial && runStatus !== "success") {
    throw new HttpError(
      400,
      "replay_compile_requires_successful_run",
      "compile_from_run requires run_end status=success unless allow_partial=true",
      {
        run_id: parsed.run_id,
        run_status: runStatus ?? "in_progress",
      },
    );
  }

  const stepRows = rows
    .filter((r) => replayKindOf(r) === "step")
    .sort((a, b) => {
      const aIdx = Number(asObject(a.slots)?.step_index ?? 0);
      const bIdx = Number(asObject(b.slots)?.step_index ?? 0);
      if (aIdx !== bIdx) return aIdx - bIdx;
      return a.created_at.localeCompare(b.created_at);
    });
  if (stepRows.length === 0) {
    throw new HttpError(400, "replay_compile_no_steps", "run does not contain replay step nodes", {
      run_id: parsed.run_id,
    });
  }
  const resultByStepId = new Map<string, ReplayNodeRow>();
  for (const row of rows.filter((r) => replayKindOf(r) === "step_result")) {
    const sid = toStringOrNull(asObject(row.slots)?.step_id);
    if (!sid) continue;
    resultByStepId.set(sid, row);
  }

  const rawStepsTemplate = stepRows.map((row) => {
    const slotsObj = asObject(row.slots) ?? {};
    const stepId = toStringOrNull(slotsObj.step_id) ?? row.id;
    const result = resultByStepId.get(stepId);
    const resultSlots = asObject(result?.slots) ?? {};
    return {
      step_index: Number(slotsObj.step_index ?? 0),
      tool_name: toStringOrNull(slotsObj.tool_name),
      tool_input_template: slotsObj.tool_input ?? {},
      expected_output_signature: slotsObj.expected_output_signature ?? null,
      preconditions: Array.isArray(slotsObj.preconditions) ? slotsObj.preconditions : [],
      postconditions: Array.isArray(resultSlots.postconditions) ? resultSlots.postconditions : [],
      retry_policy: asObject(slotsObj.retry_policy) ?? null,
      safety_level: toStringOrNull(slotsObj.safety_level) ?? "needs_confirm",
      replay_mode: "replay_first_reason_if_needed",
      last_outcome: toStringOrNull(resultSlots.status) ?? "pending",
      repair_applied_last_run: Boolean(resultSlots.repair_applied ?? false),
    };
  });
  const dedupe = dedupeReplayCompileSteps(rawStepsTemplate);
  const withVariables = enrichReplayCompileStepsWithVariables(dedupe.steps);
  const withQuality = enrichReplayCompileStepsWithQuality(withVariables.steps);
  const stepsTemplate = withQuality.steps;

  const playbookId = parsed.playbook_id ?? randomUUID();
  const version = parsed.version;
  const playbookName = parsed.name?.trim() || `replay_playbook_${parsed.run_id.slice(0, 8)}`;
  const runEndSlots = asObject(lastRunEnd?.slots);
  const successCriteria =
    parsed.success_criteria
    ?? (asObject(runEndSlots?.success_criteria) ?? {});
  const summaryBase = {
    source_run_id: parsed.run_id,
    source_run_status: runStatus ?? "in_progress",
    steps_total: stepsTemplate.length,
    source_steps_total: rawStepsTemplate.length,
    steps_dedup_removed: dedupe.removed_count,
    dedup_removed_step_indexes: dedupe.removed_step_indexes,
    steps_with_last_repair: stepsTemplate.filter((s) => s.repair_applied_last_run).length,
    parameterization: withVariables.summary,
    quality: withQuality.summary,
    recommendations: Array.from(
      new Set([
        ...withQuality.summary.recommendations,
        ...(dedupe.removed_count > 0
          ? ["review duplicate removal in compiled playbook; add explicit step markers when repeated actions are required"]
          : []),
      ]),
    ),
    generated_at: new Date().toISOString(),
  };
  const usage = {
    prompt_tokens: estimateTokenCountFromUnknown({
      run_id: parsed.run_id,
      run_status: runStatus ?? "in_progress",
      allow_partial: parsed.allow_partial,
      source_steps_total: rawStepsTemplate.length,
      source_steps: rawStepsTemplate,
      matchers: parsed.matchers ?? {},
      success_criteria: successCriteria,
      risk_profile: parsed.risk_profile,
      metadata: parsed.metadata ?? {},
    }),
    completion_tokens: estimateTokenCountFromUnknown({
      playbook_id: playbookId,
      playbook_name: playbookName,
      version,
      status: "draft",
      steps_template: stepsTemplate,
      compile_summary: summaryBase,
    }),
    source: "estimated_char_based_v1" as const,
  };
  const usageOut = {
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    total_tokens: usage.prompt_tokens + usage.completion_tokens,
    source: usage.source,
  };
  const summary = {
    ...summaryBase,
    usage_estimate: usageOut,
  };
  const playbookCid = playbookClientId(playbookId, version);
  const writeIdentity = replayWriteIdentityFromInput(parsed, runNode ? replayWriteIdentityFromRow(runNode) : undefined);

  const writeReq = buildReplayCompileWriteRequest({
    tenantId: tenancy.tenant_id,
    scope: tenancy.scope,
    actor: parsed.actor ?? "replay_compiler",
    inputText: `compile playbook ${playbookName}`,
    writeIdentity: writeIdentity as unknown as Record<string, unknown>,
    playbookCid,
    playbookName,
    textSummary: `Replay playbook compiled from run ${parsed.run_id}`,
    slots: buildReplayCompileSlots({
      playbookId,
      playbookName,
      version,
      matchers: (parsed.matchers ?? {}) as Record<string, unknown>,
      successCriteria: successCriteria as Record<string, unknown>,
      riskProfile: parsed.risk_profile,
      sourceRunId: parsed.run_id,
      stepsTemplate,
      summary,
      metadata: (parsed.metadata ?? {}) as Record<string, unknown>,
    }),
    runNode,
    stepRows,
  });
  const { out } = await applyReplayMemoryWrite(client, writeReq, opts);
  const playbookNode = out.nodes.find((n) => n.client_id === playbookCid) ?? out.nodes[0] ?? null;
  return buildReplayCompileResult({
    tenantId: tenancy.tenant_id,
    scope: tenancy.scope,
    playbookId,
    version,
    sourceRunId: parsed.run_id,
    playbookNodeId: playbookNode?.id ?? null,
    summary,
    usage: usageOut,
    commitId: out.commit_id,
    commitUri: out.commit_uri ?? buildCommitUri(tenancy.tenant_id, tenancy.scope, out.commit_id),
    commitHash: out.commit_hash,
  });
}

export async function replayPlaybookGet(client: pg.PoolClient, body: unknown, opts: ReplayReadOptions) {
  requireReplayReadAccess(opts);
  const parsed = parsePlaybookGetInput(body);
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    { defaultScope: opts.defaultScope, defaultTenantId: opts.defaultTenantId },
  );
  const visibility = replayVisibilityFromInput(parsed);
  const replayAccess = replayAccessForClient(client, opts);
  const versions = await replayAccess.listReplayPlaybookVersions(tenancy.scope_key, parsed.playbook_id, visibility);
  const row = versions[0] ?? null;
  if (!row) {
    throw new HttpError(404, "replay_playbook_not_found", "playbook_id was not found in this scope", {
      playbook_id: parsed.playbook_id,
      scope: tenancy.scope,
      tenant_id: tenancy.tenant_id,
    });
  }
  return {
    tenant_id: tenancy.tenant_id,
    scope: tenancy.scope,
    playbook: buildReplayPlaybookGetSurface({
      tenantId: tenancy.tenant_id,
      scope: tenancy.scope,
      playbookId: parsed.playbook_id,
      row,
      commitUri: row.commit_id != null ? buildCommitUri(tenancy.tenant_id, tenancy.scope, row.commit_id) : null,
    }),
  };
}

export async function replayPlaybookCandidate(client: pg.PoolClient, body: unknown, opts: ReplayReadOptions) {
  requireReplayReadAccess(opts);
  const parsed = parsePlaybookCandidateInput(body);
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    { defaultScope: opts.defaultScope, defaultTenantId: opts.defaultTenantId },
  );
  const visibility = replayVisibilityFromInput(parsed);
  const replayAccess = replayAccessForClient(client, opts);
  const row =
    parsed.version != null
      ? await replayAccess.getReplayPlaybookVersion(tenancy.scope_key, parsed.playbook_id, parsed.version, visibility)
      : (await replayAccess.listReplayPlaybookVersions(tenancy.scope_key, parsed.playbook_id, visibility))[0] ?? null;
  if (!row) {
    throw new HttpError(404, "replay_playbook_not_found", "playbook was not found in this scope", {
      playbook_id: parsed.playbook_id,
      version: parsed.version ?? null,
      scope: tenancy.scope,
      tenant_id: tenancy.tenant_id,
    });
  }
  const slotsObj = asObject(row.slots) ?? {};
  const deterministicGate = evaluateReplayDeterministicGate({
    requestedMode: "simulate",
    gateInput: parsed.deterministic_gate,
    playbookStatus: row.playbook_status,
    playbookSlots: slotsObj,
  });
  return buildReplayPlaybookCandidateSurface({
    tenantId: tenancy.tenant_id,
    scope: tenancy.scope,
    playbookId: parsed.playbook_id,
    row,
    deterministicGate: deterministicGate as unknown as Record<string, unknown>,
    nextAction: nextActionForReplayDeterministicGate(deterministicGate),
  });
}

export async function replayPlaybookDispatch(client: pg.PoolClient, body: unknown, opts: ReplayPlaybookRunOptions) {
  requireReplayReadAccess(opts);
  const parsed = parsePlaybookDispatchInput(body);
  const candidate = await replayPlaybookCandidate(
    client,
    {
      tenant_id: parsed.tenant_id,
      scope: parsed.scope,
      consumer_agent_id: parsed.consumer_agent_id,
      consumer_team_id: parsed.consumer_team_id,
      playbook_id: parsed.playbook_id,
      version: parsed.version,
      deterministic_gate: parsed.deterministic_gate,
    },
    opts,
  );
  const eligible = Boolean((candidate as any).candidate?.eligible_for_deterministic_replay);
  if (eligible) {
    const replay = await replayPlaybookRun(
      client,
      {
        tenant_id: parsed.tenant_id,
        scope: parsed.scope,
        project_id: parsed.project_id,
        actor: parsed.actor,
        consumer_agent_id: parsed.consumer_agent_id,
        consumer_team_id: parsed.consumer_team_id,
        memory_lane: parsed.memory_lane,
        producer_agent_id: parsed.producer_agent_id,
        owner_agent_id: parsed.owner_agent_id,
        owner_team_id: parsed.owner_team_id,
        playbook_id: parsed.playbook_id,
        version: parsed.version,
        mode: "simulate",
        deterministic_gate: parsed.deterministic_gate,
        params: parsed.params,
        max_steps: parsed.max_steps,
      },
      opts,
    );
    return buildReplayDispatchSurface({
      tenantId: (candidate as any).tenant_id,
      scope: (candidate as any).scope,
      decision: "deterministic_replay_executed",
      primaryInferenceSkipped: true,
      fallbackExecuted: false,
      candidate,
      replay,
      deterministicGate: ((replay as any)?.deterministic_gate ?? null) as Record<string, unknown> | null,
    });
  }
  if (parsed.execute_fallback === false) {
    return buildReplayDispatchSurface({
      tenantId: (candidate as any).tenant_id,
      scope: (candidate as any).scope,
      decision: "candidate_only",
      primaryInferenceSkipped: false,
      fallbackExecuted: false,
      candidate,
      replay: null,
      deterministicGate: ((candidate as any)?.deterministic_gate ?? null) as Record<string, unknown> | null,
    });
  }
  const replay = await replayPlaybookRun(
    client,
    {
      tenant_id: parsed.tenant_id,
      scope: parsed.scope,
      project_id: parsed.project_id,
      actor: parsed.actor,
      consumer_agent_id: parsed.consumer_agent_id,
      consumer_team_id: parsed.consumer_team_id,
      memory_lane: parsed.memory_lane,
      producer_agent_id: parsed.producer_agent_id,
      owner_agent_id: parsed.owner_agent_id,
      owner_team_id: parsed.owner_team_id,
      playbook_id: parsed.playbook_id,
      version: parsed.version,
      mode: parsed.fallback_mode,
      params: parsed.params,
      max_steps: parsed.max_steps,
    },
    opts,
  );
  return buildReplayDispatchSurface({
    tenantId: (candidate as any).tenant_id,
    scope: (candidate as any).scope,
    decision: "fallback_replay_executed",
    primaryInferenceSkipped: false,
    fallbackExecuted: true,
    candidate,
    replay,
    deterministicGate: ((replay as any)?.deterministic_gate ?? null) as Record<string, unknown> | null,
  });
}

export async function replayPlaybookPromote(client: pg.PoolClient, body: unknown, opts: ReplayWriteOptions) {
  requireReplayReadAccess(opts);
  const parsed = parsePlaybookPromoteInput(body);
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    { defaultScope: opts.defaultScope, defaultTenantId: opts.defaultTenantId },
  );
  const visibility = replayVisibilityFromInput(parsed);
  const replayAccess = replayAccessForClient(client, opts);
  const versions = await replayAccess.listReplayPlaybookVersions(tenancy.scope_key, parsed.playbook_id, visibility);
  const latest = versions[0] ?? null;
  if (!latest) {
    throw new HttpError(404, "replay_playbook_not_found", "playbook_id was not found in this scope", {
      playbook_id: parsed.playbook_id,
      scope: tenancy.scope,
      tenant_id: tenancy.tenant_id,
    });
  }
  let source = latest;
  if (parsed.from_version != null) {
    const byVersion = await replayAccess.getReplayPlaybookVersion(
      tenancy.scope_key,
      parsed.playbook_id,
      parsed.from_version,
      visibility,
    );
    if (!byVersion) {
      throw new HttpError(404, "replay_playbook_version_not_found", "from_version was not found for this playbook", {
        playbook_id: parsed.playbook_id,
        from_version: parsed.from_version,
      });
    }
    source = byVersion;
  }

  const sourceSlots = asObject(source.slots) ?? {};
  const targetStatus = parsed.target_status;
  if ((source.playbook_status ?? "draft") === targetStatus && source === latest) {
    const normalizedStable = await ensureStablePlaybookAnchorOnLatestNode({
      embedder: opts.embedder,
      writeAccess: opts.writeAccess,
      replayMirror: opts.replayMirror,
      tenancy,
      visibility,
      playbookId: parsed.playbook_id,
      latest,
    });
    return buildReplayPlaybookNoopPromoteResult({
      tenantId: tenancy.tenant_id,
      scope: tenancy.scope,
      playbookId: parsed.playbook_id,
      fromVersion: source.version_num,
      toVersion: latest.version_num,
      status: (latest.playbook_status ?? "draft") as "draft" | "shadow" | "active" | "disabled",
      unchanged: !normalizedStable?.mutated,
      reason: normalizedStable?.mutated ? "normalized_latest_stable_anchor" : "already_target_status_on_latest",
      nodeId: normalizedStable?.node.id ?? source.id,
    });
  }

  const nextVersion = latest.version_num + 1;
  const promoteCid = playbookClientId(parsed.playbook_id, nextVersion);
  const writeIdentity = replayWriteIdentityFromInput(parsed, replayWriteIdentityFromRow(source));
  const promotedTitle = source.title ?? `replay_playbook_${parsed.playbook_id.slice(0, 8)}`;
  const promotedTextSummary = source.text_summary ?? `Replay playbook ${parsed.playbook_id}`;
  const promotedSlots = buildReplayPromotedSlots({
    sourceSlots,
    playbookId: parsed.playbook_id,
    version: nextVersion,
    status: targetStatus,
    sourceVersion: source.version_num,
    promotedAt: new Date().toISOString(),
    note: parsed.note ?? null,
    metadata: (parsed.metadata ?? {}) as Record<string, unknown>,
  });
  const promotedNodeFields = await buildStablePlaybookNodeFields({
    embedder: opts.embedder,
    scopeKey: tenancy.scope_key,
    playbookId: parsed.playbook_id,
    version: nextVersion,
    status: targetStatus,
    promotionOrigin: "replay_promote",
    title: promotedTitle,
    textSummary: promotedTextSummary,
    clientId: promoteCid,
    commitId: null,
    sourceNodeId: source.id,
    sourceCommitId: source.commit_id ?? null,
    slots: promotedSlots,
  });
  const writeReq = buildReplayPlaybookProcedureWriteRequest({
    tenantId: tenancy.tenant_id,
    scope: tenancy.scope,
    actor: parsed.actor ?? "replay_promoter",
    inputText: `promote playbook ${parsed.playbook_id} to ${targetStatus}`,
    writeIdentity: writeIdentity as unknown as Record<string, unknown>,
    clientId: promoteCid,
    title: promotedTitle,
    textSummary: promotedTextSummary,
    slots: promotedNodeFields.slots,
    embedding: promotedNodeFields.embedding,
    embeddingModel: promotedNodeFields.embedding_model,
    sourceNodeId: source.id,
  });
  const { out } = await applyReplayMemoryWrite(client, writeReq, opts);
  const promoted = out.nodes.find((n) => n.client_id === promoteCid) ?? out.nodes[0] ?? null;
  return buildReplayPlaybookVersionResult({
    tenantId: tenancy.tenant_id,
    scope: tenancy.scope,
    playbookId: parsed.playbook_id,
    fromVersion: source.version_num,
    toVersion: nextVersion,
    status: targetStatus,
    nodeId: promoted?.id ?? null,
    commitId: out.commit_id,
    commitUri: out.commit_uri ?? buildCommitUri(tenancy.tenant_id, tenancy.scope, out.commit_id),
    commitHash: out.commit_hash,
  });
}

export async function replayPlaybookRepair(client: pg.PoolClient, body: unknown, opts: ReplayWriteOptions) {
  requireReplayReadAccess(opts);
  const parsed = parsePlaybookRepairInput(body);
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    { defaultScope: opts.defaultScope, defaultTenantId: opts.defaultTenantId },
  );
  const visibility = replayVisibilityFromInput(parsed);
  const replayAccess = replayAccessForClient(client, opts);
  const versions = await replayAccess.listReplayPlaybookVersions(tenancy.scope_key, parsed.playbook_id, visibility);
  const latest = versions[0] ?? null;
  if (!latest) {
    throw new HttpError(404, "replay_playbook_not_found", "playbook_id was not found in this scope", {
      playbook_id: parsed.playbook_id,
      scope: tenancy.scope,
      tenant_id: tenancy.tenant_id,
    });
  }

  let source = latest;
  if (parsed.from_version != null) {
    const byVersion = await replayAccess.getReplayPlaybookVersion(
      tenancy.scope_key,
      parsed.playbook_id,
      parsed.from_version,
      visibility,
    );
    if (!byVersion) {
      throw new HttpError(404, "replay_playbook_version_not_found", "from_version was not found for this playbook", {
        playbook_id: parsed.playbook_id,
        from_version: parsed.from_version,
      });
    }
    source = byVersion;
  }

  const patchObj = asObject(parsed.patch) ?? {};
  const sourceSlots = asObject(source.slots) ?? {};
  const { nextSlots, summary } = applyPlaybookRepairPatch(sourceSlots, patchObj);
  const reviewRequired = parsed.review_required !== false;
  const emittedStatus = reviewRequired ? "draft" : parsed.target_status;
  const nextVersion = latest.version_num + 1;
  const repairCid = playbookClientId(parsed.playbook_id, nextVersion);
  const writeIdentity = replayWriteIdentityFromInput(parsed, replayWriteIdentityFromRow(source));

  const repairedSlots = buildReplayRepairedSlots({
    nextSlots,
    playbookId: parsed.playbook_id,
    version: nextVersion,
    status: emittedStatus,
    sourceVersion: source.version_num,
    repairedAt: new Date().toISOString(),
    note: parsed.note ?? null,
    patch: patchObj,
    summary,
    reviewRequired,
    actor: parsed.actor ?? "replay_repair",
    targetStatus: parsed.target_status,
    metadata: (parsed.metadata ?? {}) as Record<string, unknown>,
  });
  const writeReq = buildReplayPlaybookProcedureWriteRequest({
    tenantId: tenancy.tenant_id,
    scope: tenancy.scope,
    actor: parsed.actor ?? "replay_repair",
    inputText: `repair playbook ${parsed.playbook_id} v${source.version_num}->v${nextVersion}`,
    writeIdentity: writeIdentity as unknown as Record<string, unknown>,
    clientId: repairCid,
    title: source.title ?? `replay_playbook_${parsed.playbook_id.slice(0, 8)}`,
    textSummary: source.text_summary ?? `Replay playbook ${parsed.playbook_id}`,
    slots: repairedSlots,
    sourceNodeId: source.id,
  });
  const { out } = await applyReplayMemoryWrite(client, writeReq, opts);
  const repaired = out.nodes.find((n) => n.client_id === repairCid) ?? out.nodes[0] ?? null;
  return buildReplayPlaybookVersionResult({
    tenantId: tenancy.tenant_id,
    scope: tenancy.scope,
    playbookId: parsed.playbook_id,
    fromVersion: source.version_num,
    toVersion: nextVersion,
    status: emittedStatus,
    nodeId: repaired?.id ?? null,
    commitId: out.commit_id,
    commitUri: out.commit_uri ?? buildCommitUri(tenancy.tenant_id, tenancy.scope, out.commit_id),
    commitHash: out.commit_hash,
    extra: {
      review_required: reviewRequired,
      review_state: reviewRequired ? "pending_review" : "approved",
      repair_summary: summary,
    },
  });
}

export async function replayPlaybookRepairReview(client: pg.PoolClient, body: unknown, opts: ReplayPlaybookReviewOptions) {
  requireReplayReadAccess(opts);
  const parsed = parsePlaybookRepairReviewInput(body);
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    { defaultScope: opts.defaultScope, defaultTenantId: opts.defaultTenantId },
  );
  const visibility = replayVisibilityFromInput(parsed);
  const replayAccess = replayAccessForClient(client, opts);
  const versions = await replayAccess.listReplayPlaybookVersions(tenancy.scope_key, parsed.playbook_id, visibility);
  const latest = versions[0] ?? null;
  if (!latest) {
    throw new HttpError(404, "replay_playbook_not_found", "playbook_id was not found in this scope", {
      playbook_id: parsed.playbook_id,
      scope: tenancy.scope,
      tenant_id: tenancy.tenant_id,
    });
  }

  const source =
    parsed.version != null
      ? await replayAccess.getReplayPlaybookVersion(tenancy.scope_key, parsed.playbook_id, parsed.version, visibility)
      : latest;
  if (!source) {
    throw new HttpError(404, "replay_playbook_version_not_found", "version was not found for this playbook", {
      playbook_id: parsed.playbook_id,
      version: parsed.version ?? null,
    });
  }

  const sourceSlots = asObject(source.slots) ?? {};
  const repairPatch = asObject(sourceSlots.repair_patch);
  if (!repairPatch) {
    throw new HttpError(
      400,
      "replay_repair_patch_missing",
      "review endpoint requires a repaired playbook version (repair_patch missing).",
      {
        playbook_id: parsed.playbook_id,
        version: source.version_num,
      },
    );
  }
  const sourceReview = asObject(sourceSlots.repair_review) ?? {};
  const sourceReviewState = toStringOrNull(sourceReview.state) ?? "pending_review";
  if (sourceReviewState !== "pending_review") {
    throw new HttpError(
      409,
      "replay_repair_not_pending_review",
      "playbook version is not in pending_review state",
      {
        playbook_id: parsed.playbook_id,
        version: source.version_num,
        review_state: sourceReviewState,
      },
    );
  }

  let shadowValidation: Record<string, unknown> | null = null;
  let nextStatus: "draft" | "shadow" | "active" | "disabled";
  let reviewState: string;
  if (parsed.action === "reject") {
    nextStatus = "draft";
    reviewState = "rejected";
  } else {
    let shadowPass = true;
    if (parsed.auto_shadow_validate) {
      const stepsRaw = Array.isArray(sourceSlots.steps_template) ? sourceSlots.steps_template : [];
      const validationMode = parsed.shadow_validation_mode;
      const shadowValidationPolicy = opts.shadowValidationPolicy ?? {
        executeTimeoutMs: opts.localExecutor?.timeoutMs ?? 15000,
        executeStopOnFailure: true,
        sandboxTimeoutMs: opts.localExecutor?.timeoutMs ?? 15000,
        sandboxStopOnFailure: true,
      };
      if (validationMode === "execute") {
        const paramsObj = asObject(parsed.shadow_validation_params) ?? {};
        const executeTimeoutMs = clampInt(
          Number(paramsObj.timeout_ms ?? shadowValidationPolicy.executeTimeoutMs),
          100,
          600000,
        );
        const executeStopOnFailure =
          paramsObj.stop_on_failure === undefined
            ? shadowValidationPolicy.executeStopOnFailure
            : paramsObj.stop_on_failure !== false;
        try {
          const runOut = await replayPlaybookRun(
            client,
            {
              tenant_id: tenancy.tenant_id,
              scope: tenancy.scope,
              playbook_id: parsed.playbook_id,
              version: source.version_num,
              mode: "strict",
              max_steps: parsed.shadow_validation_max_steps,
              params: {
                ...paramsObj,
                timeout_ms: executeTimeoutMs,
                allow_local_exec: true,
                record_run: false,
                auto_confirm: true,
                stop_on_failure: executeStopOnFailure,
              },
            },
            {
              defaultScope: opts.defaultScope,
              defaultTenantId: opts.defaultTenantId,
              embeddedRuntime: opts.embeddedRuntime,
              writeOptions: opts,
              localExecutor: opts.localExecutor,
            },
          );
          const summaryObj = asObject((runOut as any).summary) ?? {};
          const failedSteps = Number(summaryObj.failed_steps ?? 0);
          shadowPass = Number.isFinite(failedSteps) && failedSteps === 0;
          const stepsOut = Array.isArray((runOut as any).steps) ? (runOut as any).steps.slice(0, 20) : [];
          shadowValidation = {
            mode: "execute",
            pass: shadowPass,
            validated_at: new Date().toISOString(),
            validator: "repair_review_auto_execute",
            timeout_ms: executeTimeoutMs,
            stop_on_failure: executeStopOnFailure,
            summary: summaryObj,
            steps_preview: stepsOut,
            max_steps: parsed.shadow_validation_max_steps,
          };
        } catch (err: any) {
          shadowPass = false;
          shadowValidation = {
            mode: "execute",
            pass: false,
            validated_at: new Date().toISOString(),
            validator: "repair_review_auto_execute",
            error: String(err?.message ?? err),
            timeout_ms: executeTimeoutMs,
            stop_on_failure: executeStopOnFailure,
            max_steps: parsed.shadow_validation_max_steps,
          };
        }
      } else if (validationMode === "execute_sandbox") {
        const paramsObj = asObject(parsed.shadow_validation_params) ?? {};
        const profileRaw = toStringOrNull(paramsObj.profile) ?? "balanced";
        const profile: "fast" | "balanced" | "thorough" =
          profileRaw === "fast" || profileRaw === "thorough" || profileRaw === "balanced" ? profileRaw : "balanced";
        const profileDefaults =
          profile === "fast"
            ? { timeoutMs: Math.min(shadowValidationPolicy.sandboxTimeoutMs, 6000), stopOnFailure: true }
            : profile === "thorough"
              ? { timeoutMs: Math.max(shadowValidationPolicy.sandboxTimeoutMs, 20000), stopOnFailure: false }
              : { timeoutMs: shadowValidationPolicy.sandboxTimeoutMs, stopOnFailure: shadowValidationPolicy.sandboxStopOnFailure };
        const executionModeRaw = toStringOrNull(paramsObj.execution_mode) ?? "sync";
        const sandboxExecMode: "sync" | "async" = executionModeRaw === "async_queue" ? "async" : "sync";
        const timeoutMs = clampInt(
          Number(paramsObj.timeout_ms ?? profileDefaults.timeoutMs),
          100,
          600000,
        );
        const stopOnFailure =
          paramsObj.stop_on_failure === undefined
            ? profileDefaults.stopOnFailure
            : paramsObj.stop_on_failure !== false;
        if (!opts.sandboxValidationExecutor) {
          shadowPass = false;
          shadowValidation = {
            mode: "execute_sandbox",
            pass: false,
            validated_at: new Date().toISOString(),
            validator: "repair_review_auto_execute_sandbox",
            error: "sandbox_validation_executor_not_configured",
          };
        } else {
          const checks: Array<Record<string, unknown>> = [];
          let succeededSteps = 0;
          let failedSteps = 0;
          let blockedSteps = 0;
          let unknownSteps = 0;
          let pendingSteps = 0;
          const stepsEval = stepsRaw.slice(0, parsed.shadow_validation_max_steps);
          for (const step of stepsEval) {
            const stepObj = asObject(step) ?? {};
            const stepIndex = Number(stepObj.step_index ?? 0) || null;
            const toolName = toStringOrNull(stepObj.tool_name);
            const preconditions = Array.isArray(stepObj.preconditions) ? stepObj.preconditions : [];
            const postconditions = Array.isArray(stepObj.postconditions) ? stepObj.postconditions : [];
            const expectedSignature = stepObj.expected_output_signature ?? null;
            const preChecks: PreconditionResult[] = [];
            for (const cond of preconditions) preChecks.push(await evaluatePrecondition(cond));
            const preFailed = preChecks.filter((c) => c.state === "fail");
            const preUnknown = preChecks.filter((c) => c.state === "unknown");
            if (preFailed.length > 0 || preUnknown.length > 0) {
              blockedSteps += 1;
              checks.push({
                step_index: stepIndex,
                tool_name: toolName,
                status: "blocked",
                reason: preFailed.length > 0 ? "preconditions_failed" : "preconditions_unknown",
                preconditions: preChecks,
              });
              if (stopOnFailure) break;
              continue;
            }
            if (!isReplayCommandTool(toolName)) {
              unknownSteps += 1;
              checks.push({
                step_index: stepIndex,
                tool_name: toolName,
                status: "unknown",
                reason: "unsupported_tool_for_sandbox_validation",
              });
              if (stopOnFailure) break;
              continue;
            }

            const argv = parseStepArgv(stepObj, toolName);
            const command = String(argv[0] ?? "").trim();
            if (argv.length === 0 || !command || !isSafeCommandName(command)) {
              blockedSteps += 1;
              checks.push({
                step_index: stepIndex,
                tool_name: toolName,
                status: "blocked",
                reason: "invalid_command_argv",
                command,
                argv,
              });
              if (stopOnFailure) break;
              continue;
            }

            const startedAt = Date.now();
            let sandboxExec:
              | {
                  ok: boolean;
                  status: string;
                  stdout: string;
                  stderr: string;
                  exit_code: number | null;
                  error: string | null;
                  run_id?: string | null;
                }
              | null = null;
            try {
              sandboxExec = await opts.sandboxValidationExecutor({
                tenant_id: tenancy.tenant_id,
                scope: tenancy.scope,
                argv,
                timeout_ms: timeoutMs,
                mode: sandboxExecMode,
                metadata: {
                  source: "replay_shadow_validation",
                  playbook_id: parsed.playbook_id,
                  playbook_version: source.version_num,
                  step_index: stepIndex,
                  review_action: parsed.action,
                },
              });
            } catch (err: any) {
              sandboxExec = {
                ok: false,
                status: "failed",
                stdout: "",
                stderr: "",
                exit_code: null,
                error: String(err?.message ?? err),
                run_id: null,
              };
            }
            if (sandboxExecMode === "async" || sandboxExec.status === "queued" || sandboxExec.status === "running") {
              pendingSteps += 1;
              checks.push({
                step_index: stepIndex,
                tool_name: toolName,
                status: "pending",
                command,
                argv,
                sandbox_run_id: sandboxExec.run_id ?? null,
                sandbox_status: sandboxExec.status ?? "queued",
              });
              if (stopOnFailure) break;
              continue;
            }
            const outcome = sandboxResultToOutcome(sandboxExec, argv, Date.now() - startedAt);
            const signature = evaluateExpectedSignature(expectedSignature, outcome);
            const postChecks: PreconditionResult[] = [];
            for (const cond of postconditions) postChecks.push(await evaluatePostcondition(cond, outcome));
            const failedPost = postChecks.filter((c) => c.state === "fail");
            const unknownPost = postChecks.filter((c) => c.state === "unknown");
            const pass = outcome.ok && signature.ok && failedPost.length === 0 && unknownPost.length === 0;
            if (pass) {
              succeededSteps += 1;
            } else {
              failedSteps += 1;
            }
            checks.push({
              step_index: stepIndex,
              tool_name: toolName,
              status: pass ? "success" : "failed",
              command,
              argv,
              sandbox_run_id: sandboxExec.run_id ?? null,
              execution: outcome,
              signature,
              postconditions: postChecks,
            });
            if (!pass && stopOnFailure) break;
          }

          shadowPass =
            sandboxExecMode === "sync"
            && pendingSteps === 0
            && failedSteps === 0
            && blockedSteps === 0
            && unknownSteps === 0;
          shadowValidation = {
            mode: "execute_sandbox",
            pass: shadowPass,
            validated_at: new Date().toISOString(),
            validator: "repair_review_auto_execute_sandbox",
            profile,
            execution_mode: sandboxExecMode === "sync" ? "sync" : "async_queue",
            max_steps: parsed.shadow_validation_max_steps,
            timeout_ms: timeoutMs,
            stop_on_failure: stopOnFailure,
            summary: {
              total_steps: Math.min(stepsRaw.length, parsed.shadow_validation_max_steps),
              succeeded_steps: succeededSteps,
              failed_steps: failedSteps,
              blocked_steps: blockedSteps,
              unknown_steps: unknownSteps,
              pending_steps: pendingSteps,
            },
            pending: pendingSteps > 0,
            pending_reason: pendingSteps > 0 ? "async_queue_pending" : null,
            steps_preview: checks.slice(0, 20),
          };
        }
      } else {
        const validation = await validatePlaybookShadowReadiness(stepsRaw, opts.localExecutor);
        shadowValidation = {
          mode: "readiness",
          ...validation,
          validated_at: new Date().toISOString(),
          validator: "repair_review_auto_readiness",
        };
        shadowPass = validation.pass;
      }
    }
    if (parsed.auto_shadow_validate && !shadowPass) {
      nextStatus = "draft";
      reviewState = "approved_shadow_blocked";
    } else {
      nextStatus = parsed.target_status_on_approve;
      reviewState = "approved";
    }
  }

  const nextVersion = latest.version_num + 1;
  const reviewCid = playbookClientId(parsed.playbook_id, nextVersion);
  const reviewedAt = new Date().toISOString();
  const writeIdentity = replayWriteIdentityFromInput(parsed, replayWriteIdentityFromRow(source));
  const reviewedTitle = source.title ?? `replay_playbook_${parsed.playbook_id.slice(0, 8)}`;
  const reviewedTextSummary = source.text_summary ?? `Replay playbook ${parsed.playbook_id}`;
  const reviewedSlots = buildReplayReviewedSlots({
    sourceSlots,
    sourceReview,
    playbookId: parsed.playbook_id,
    version: nextVersion,
    status: nextStatus,
    sourceVersion: source.version_num,
    reviewedAt,
    actor: parsed.actor ?? "replay_review",
    action: parsed.action,
    note: parsed.note ?? null,
    autoShadowValidate: parsed.auto_shadow_validate,
    shadowValidationMode: parsed.shadow_validation_mode,
    shadowValidationMaxSteps: parsed.shadow_validation_max_steps,
    autoPromoteOnPass: parsed.auto_promote_on_pass,
    autoPromoteTargetStatus: parsed.auto_promote_target_status,
    autoPromoteGate: (parsed.auto_promote_gate as Record<string, unknown> | null) ?? null,
    targetStatusOnApprove: parsed.target_status_on_approve,
    metadata: (parsed.metadata ?? {}) as Record<string, unknown>,
    reviewState,
    shadowValidation,
  });
  const reviewedNodeFields = await buildStablePlaybookNodeFields({
    embedder: opts.embedder,
    scopeKey: tenancy.scope_key,
    playbookId: parsed.playbook_id,
    version: nextVersion,
    status: nextStatus,
    promotionOrigin: "replay_promote",
    title: reviewedTitle,
    textSummary: reviewedTextSummary,
    clientId: reviewCid,
    commitId: null,
    sourceNodeId: source.id,
    sourceCommitId: source.commit_id ?? null,
    slots: reviewedSlots,
  });
  const writeReq = buildReplayPlaybookProcedureWriteRequest({
    tenantId: tenancy.tenant_id,
    scope: tenancy.scope,
    actor: parsed.actor ?? "replay_review",
    inputText: `review playbook ${parsed.playbook_id} v${source.version_num} action=${parsed.action}`,
    writeIdentity: writeIdentity as unknown as Record<string, unknown>,
    clientId: reviewCid,
    title: reviewedTitle,
    textSummary: reviewedTextSummary,
    slots: reviewedNodeFields.slots,
    embedding: reviewedNodeFields.embedding,
    embeddingModel: reviewedNodeFields.embedding_model,
    sourceNodeId: source.id,
  });
  const { out } = await applyReplayMemoryWrite(client, writeReq, opts);
  const reviewed = out.nodes.find((n) => n.client_id === reviewCid) ?? out.nodes[0] ?? null;
  let finalStatus: "draft" | "shadow" | "active" | "disabled" = nextStatus;
  let finalVersion = nextVersion;
  let finalNodeId = reviewed?.id ?? null;
  let finalUri =
    reviewed?.id != null
      ? buildAionisUri({
          tenant_id: tenancy.tenant_id,
          scope: tenancy.scope,
          type: "procedure",
          id: reviewed.id,
        })
      : null;
  let finalCommitId = out.commit_id;
  let finalCommitUri = out.commit_uri ?? buildCommitUri(tenancy.tenant_id, tenancy.scope, out.commit_id);
  let finalCommitHash = out.commit_hash;
  let autoPromotion: Record<string, unknown> | null = null;

  const autoPromoteRequested = parsed.action === "approve" && parsed.auto_promote_on_pass === true;
  if (autoPromoteRequested) {
    const gateEval = evaluateAutoPromoteGate(
      extractShadowValidationGateMetrics(shadowValidation),
      asObject(parsed.auto_promote_gate) ?? {},
    );
    if (parsed.auto_shadow_validate !== true) {
      autoPromotion = {
        attempted: true,
        promoted: false,
        reason: "auto_shadow_validate_required",
        gate: gateEval,
      };
    } else if (nextStatus !== parsed.target_status_on_approve) {
      autoPromotion = {
        attempted: true,
        promoted: false,
        reason: "review_not_in_target_status_on_approve",
        gate: gateEval,
      };
    } else if (!gateEval.pass) {
      autoPromotion = {
        attempted: true,
        promoted: false,
        reason: "gate_not_passed",
        gate: gateEval,
      };
    } else if (parsed.auto_promote_target_status === nextStatus) {
      autoPromotion = {
        attempted: true,
        promoted: false,
        reason: "already_target_status",
        gate: gateEval,
      };
    } else {
      const promoteVersion = nextVersion + 1;
      const promoteCid = playbookClientId(parsed.playbook_id, promoteVersion);
      const promoteSlots = buildReplayAutoPromotedSlots({
        reviewedSlots,
        version: promoteVersion,
        status: parsed.auto_promote_target_status,
        triggeredAt: new Date().toISOString(),
        fromVersion: nextVersion,
        toVersion: promoteVersion,
        fromStatus: nextStatus,
        gate: gateEval as Record<string, unknown>,
      });
      const promotedTitle = source.title ?? `replay_playbook_${parsed.playbook_id.slice(0, 8)}`;
      const promotedTextSummary = source.text_summary ?? `Replay playbook ${parsed.playbook_id}`;
      const promotedNodeFields = await buildStablePlaybookNodeFields({
        embedder: opts.embedder,
        scopeKey: tenancy.scope_key,
        playbookId: parsed.playbook_id,
        version: promoteVersion,
        status: parsed.auto_promote_target_status,
        promotionOrigin: "replay_promote",
        title: promotedTitle,
        textSummary: promotedTextSummary,
        clientId: promoteCid,
        commitId: null,
        sourceNodeId: reviewed?.id ?? source.id,
        sourceCommitId: out.commit_id ?? source.commit_id ?? null,
        slots: promoteSlots,
      });
      const promoteReq = buildReplayPlaybookProcedureWriteRequest({
        tenantId: tenancy.tenant_id,
        scope: tenancy.scope,
        actor: parsed.actor ?? "replay_review",
        inputText: `auto promote playbook ${parsed.playbook_id} v${nextVersion}->v${promoteVersion}`,
        writeIdentity: writeIdentity as unknown as Record<string, unknown>,
        clientId: promoteCid,
        title: promotedTitle,
        textSummary: promotedTextSummary,
        slots: promotedNodeFields.slots,
        embedding: promotedNodeFields.embedding,
        embeddingModel: promotedNodeFields.embedding_model,
        sourceNodeId: reviewed?.id ?? source.id,
      });
      const { out: outPromote } = await applyReplayMemoryWrite(client, promoteReq, opts);
      const promotedNode = outPromote.nodes.find((n) => n.client_id === promoteCid) ?? outPromote.nodes[0] ?? null;
      finalStatus = parsed.auto_promote_target_status;
      finalVersion = promoteVersion;
      finalNodeId = promotedNode?.id ?? null;
      finalUri =
        promotedNode?.id != null
          ? buildAionisUri({
              tenant_id: tenancy.tenant_id,
              scope: tenancy.scope,
              type: "procedure",
              id: promotedNode.id,
            })
          : null;
      finalCommitId = outPromote.commit_id;
      finalCommitUri = outPromote.commit_uri ?? buildCommitUri(tenancy.tenant_id, tenancy.scope, outPromote.commit_id);
      finalCommitHash = outPromote.commit_hash;
      autoPromotion = {
        attempted: true,
        promoted: true,
        from_version: nextVersion,
        to_version: promoteVersion,
        to_status: parsed.auto_promote_target_status,
        gate: gateEval,
        playbook_node_id: finalNodeId,
        playbook_uri: finalUri,
        commit_id: outPromote.commit_id,
        commit_uri: finalCommitUri,
        commit_hash: outPromote.commit_hash,
      };
    }
  }

  const learningProjectionConfig = resolveReplayLearningProjectionConfig(
    asObject((parsed as any).learning_projection),
    opts.learningProjectionDefaults,
  );
  const explicitLearningProjectionTargetRuleState = hasExplicitReplayLearningProjectionTargetRuleState(
    asObject((parsed as any).learning_projection),
  );
  let effectiveLearningProjectionConfig = learningProjectionConfig;
  let learningProjectionResult: ReplayLearningProjectionResult | undefined;
  let governancePreview: ReplayRepairReviewGovernancePreview | null = null;
  if (parsed.action === "approve" && reviewState === "approved" && learningProjectionConfig.enabled) {
    const promoteInput = MemoryPromoteRequest.parse({
      candidate_node_ids: [finalNodeId ?? source.id],
      target_kind: "workflow",
      target_level: "L2",
      input_text: `promote replay repair review ${parsed.playbook_id} v${finalVersion}`,
    });
    const candidateExamples = [
      {
        node_id: finalNodeId ?? source.id,
        title: source.title ?? null,
        summary: source.text_summary ?? null,
        workflow_signature: toStringOrNull((reviewedSlots as any).workflow_signature) ?? null,
        outcome_status: nextStatus === "disabled" ? "disabled" : "success",
        success_score: 1,
      },
    ];
    const suppliedReview = asObject((parsed as any).governance_review)?.promote_memory
      && asObject(asObject((parsed as any).governance_review)?.promote_memory)?.review_result
      ? (asObject(asObject((parsed as any).governance_review)?.promote_memory)?.review_result as Record<string, unknown>)
      : null;
    governancePreview = {
      promote_memory: await runPromoteMemoryGovernancePreview({
        input: promoteInput,
        candidateExamples,
        reviewResult: (suppliedReview as any) ?? null,
        reviewProvider: opts.governanceReviewProviders?.promote_memory ?? undefined,
        derivePolicyEffect: ({ review, admissibility }) =>
          deriveReplayGovernancePolicyEffect({
            baseTargetRuleState: learningProjectionConfig.target_rule_state,
            explicitTargetRuleState: explicitLearningProjectionTargetRuleState,
            review,
            admissibility,
          }),
        buildDecisionTrace: ({ reviewResult, admissibility, policyEffect }) => {
          const effectiveConfig = applyReplayGovernancePolicyEffect({
            config: learningProjectionConfig,
            policyEffect,
          });
          effectiveLearningProjectionConfig = effectiveConfig;
          return buildReplayGovernanceDecisionTrace({
            reviewResult,
            admissibility,
            policyEffect: policyEffect ?? null,
            effectiveConfig,
          });
        },
      }),
    };
    effectiveLearningProjectionConfig = applyReplayGovernancePolicyEffect({
      config: learningProjectionConfig,
      policyEffect: governancePreview.promote_memory.policy_effect ?? null,
    });
  }
  if (parsed.action !== "approve") {
    learningProjectionResult = {
      triggered: false,
      delivery: effectiveLearningProjectionConfig.delivery,
      status: "skipped",
      reason: "review_action_not_approve",
    };
  } else if (reviewState !== "approved") {
    learningProjectionResult = {
      triggered: false,
      delivery: effectiveLearningProjectionConfig.delivery,
      status: "skipped",
      reason: "review_not_approved",
    };
  } else if (!effectiveLearningProjectionConfig.enabled) {
    learningProjectionResult = {
      triggered: false,
      delivery: effectiveLearningProjectionConfig.delivery,
      status: "skipped",
      reason: "learning_projection_disabled",
    };
  } else if (effectiveLearningProjectionConfig.delivery === "async_outbox" && asLiteReplayWriteStore(opts.writeAccess)) {
    throw new HttpError(
      400,
      "replay_learning_async_outbox_unsupported_in_lite",
      "lite replay repair review requires sync_inline learning projection delivery",
      {
        delivery: effectiveLearningProjectionConfig.delivery,
        supported_delivery: "sync_inline",
      },
    );
  } else {
    const gateMetrics = extractShadowValidationGateMetrics(shadowValidation);
    const inferredTotalSteps = Array.isArray((reviewedSlots as any).steps_template)
      ? (reviewedSlots as any).steps_template.length
      : 0;
    const projectionSource = {
      tenant_id: tenancy.tenant_id,
      scope: tenancy.scope,
      scope_key: tenancy.scope_key,
      actor: parsed.actor ?? "replay_review",
      playbook_id: parsed.playbook_id,
      playbook_version: finalVersion,
      playbook_node_id: finalNodeId ?? source.id,
      playbook_title: source.title ?? null,
      playbook_summary: source.text_summary ?? null,
      playbook_slots: reviewedSlots as Record<string, unknown>,
      source_commit_id: finalCommitId,
      metrics: {
        total_steps: gateMetrics?.total_steps ?? inferredTotalSteps,
        success_ratio: gateMetrics?.success_ratio ?? 1,
      },
    };
    if (effectiveLearningProjectionConfig.delivery === "sync_inline") {
      try {
        learningProjectionResult = await applyReplayLearningProjection(client, projectionSource, effectiveLearningProjectionConfig, opts);
      } catch (err: any) {
        learningProjectionResult = {
          triggered: true,
          delivery: effectiveLearningProjectionConfig.delivery,
          status: "failed",
          reason: String(err?.code ?? err?.message ?? err),
        };
      }
    } else {
      try {
        const payload = {
          tenant_id: tenancy.tenant_id,
          scope: tenancy.scope,
          scope_key: tenancy.scope_key,
          actor: parsed.actor ?? "replay_review",
          playbook_id: parsed.playbook_id,
          playbook_version: finalVersion,
          source_commit_id: finalCommitId ?? null,
          config: effectiveLearningProjectionConfig,
        };
        const enq = await enqueueReplayLearningProjectionOutbox(client, {
          scopeKey: tenancy.scope_key,
          commitId: finalCommitId,
          payload,
          writeAccess: opts.writeAccess,
        });
        learningProjectionResult = {
          triggered: true,
          delivery: effectiveLearningProjectionConfig.delivery,
          status: "queued",
          job_key: enq.job_key,
        };
      } catch (err: any) {
        learningProjectionResult = {
          triggered: true,
          delivery: effectiveLearningProjectionConfig.delivery,
          status: "failed",
          reason: String(err?.code ?? err?.message ?? err),
        };
      }
    }
  }

  return {
    tenant_id: tenancy.tenant_id,
    scope: tenancy.scope,
    playbook_id: parsed.playbook_id,
    reviewed_version: source.version_num,
    to_version: finalVersion,
    action: parsed.action,
    status: finalStatus,
    review_state: reviewState,
    shadow_validation: shadowValidation,
    auto_promotion: autoPromotion,
    playbook_node_id: finalNodeId,
    playbook_uri: finalUri,
    commit_id: finalCommitId,
    commit_uri: finalCommitUri,
    commit_hash: finalCommitHash,
    learning_projection_result: learningProjectionResult,
    governance_preview: governancePreview,
  };
}

export async function replayPlaybookRun(client: pg.PoolClient, body: unknown, opts: ReplayPlaybookRunOptions) {
  requireReplayReadAccess(opts);
  const parsed = parsePlaybookRunInput(body);
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    { defaultScope: opts.defaultScope, defaultTenantId: opts.defaultTenantId },
  );
  const visibility = replayVisibilityFromInput(parsed);
  const replayAccess = replayAccessForClient(client, opts);
  const row =
    parsed.version != null
      ? await replayAccess.getReplayPlaybookVersion(tenancy.scope_key, parsed.playbook_id, parsed.version, visibility)
      : (await replayAccess.listReplayPlaybookVersions(tenancy.scope_key, parsed.playbook_id, visibility))[0] ?? null;
  if (!row) {
    throw new HttpError(404, "replay_playbook_not_found", "playbook was not found in this scope", {
      playbook_id: parsed.playbook_id,
      version: parsed.version ?? null,
      scope: tenancy.scope,
      tenant_id: tenancy.tenant_id,
    });
  }

  const replayCallIdentity = {
    consumer_agent_id: parsed.consumer_agent_id ?? undefined,
    consumer_team_id: parsed.consumer_team_id ?? undefined,
    memory_lane: parsed.memory_lane ?? row.memory_lane,
    producer_agent_id: parsed.producer_agent_id ?? row.producer_agent_id ?? undefined,
    owner_agent_id: parsed.owner_agent_id ?? row.owner_agent_id ?? undefined,
    owner_team_id: parsed.owner_team_id ?? row.owner_team_id ?? undefined,
  };
  const slotsObj = asObject(row.slots) ?? {};
  const stepsRaw = Array.isArray(slotsObj.steps_template) ? slotsObj.steps_template.slice(0, parsed.max_steps) : [];
  const paramsObj = asObject(parsed.params) ?? {};
  const deterministicGate = evaluateReplayDeterministicGate({
    requestedMode: parsed.mode,
    gateInput: parsed.deterministic_gate,
    playbookStatus: row.playbook_status,
    playbookSlots: slotsObj,
  });
  if (deterministicGate.enabled && !deterministicGate.matched && deterministicGate.decision === "rejected") {
    throw new HttpError(
      409,
      "replay_deterministic_gate_mismatch",
      "deterministic replay gate did not match the selected playbook version",
      {
        playbook_id: parsed.playbook_id,
        version: row.version_num,
        requested_mode: deterministicGate.requested_mode,
        playbook_status: deterministicGate.playbook_status,
        required_statuses: deterministicGate.required_statuses,
        status_match: deterministicGate.status_match,
        matchers_match: deterministicGate.matchers_match,
        policy_constraints_match: deterministicGate.policy_constraints_match,
        request_matcher_fingerprint: deterministicGate.request_matcher_fingerprint,
        playbook_matcher_fingerprint: deterministicGate.playbook_matcher_fingerprint,
        request_policy_fingerprint: deterministicGate.request_policy_fingerprint,
        playbook_policy_fingerprint: deterministicGate.playbook_policy_fingerprint,
      },
    );
  }
  const mode = deterministicGate.effective_mode;
  const stepReports: Array<Record<string, unknown>> = [];
  const recordRun = paramsObj.record_run !== false && Boolean(opts.writeOptions);
  const requestedRunIdRaw = toStringOrNull(paramsObj.run_id);
  const replayRunId = requestedRunIdRaw && UUID_V4_OR_VX.test(requestedRunIdRaw) ? requestedRunIdRaw : randomUUID();

  if (mode === "simulate") {
    let runStartOut: Record<string, unknown> | null = null;
    let readySteps = 0;
    let blockedSteps = 0;
    let unknownSteps = 0;
    if (recordRun) {
      runStartOut = await replayRunStart(
        client,
        {
          tenant_id: tenancy.tenant_id,
          scope: tenancy.scope,
          actor: parsed.actor ?? undefined,
          ...replayCallIdentity,
          run_id: replayRunId,
          goal: `Replay playbook ${parsed.playbook_id} v${row.version_num} (simulate)`,
          context_snapshot_ref: buildAionisUri({
            tenant_id: tenancy.tenant_id,
            scope: tenancy.scope,
            type: row.type,
            id: row.id,
          }),
          metadata: {
            replay_mode: "simulate",
            source_playbook_id: parsed.playbook_id,
            source_playbook_version: row.version_num,
          },
        },
        opts.writeOptions!,
      ) as Record<string, unknown>;
    }
    for (const step of stepsRaw) {
      const stepObj = asObject(step) ?? {};
      const stepIndex = Number(stepObj.step_index ?? 0) || null;
      const toolName = toStringOrNull(stepObj.tool_name);
      const argv = isReplayCommandTool(toolName) ? parseStepArgv(stepObj, toolName) : [];
      const command = String(argv[0] ?? "").trim();
      const sensitive = command ? detectSensitiveCommand(command, argv) : { sensitive: false, reason: null, risk_level: "low" as const };
      const preconditions = Array.isArray(stepObj.preconditions) ? stepObj.preconditions : [];
      const checks: PreconditionResult[] = [];
      for (const cond of preconditions) {
        checks.push(await evaluatePrecondition(cond));
      }
      const failed = checks.filter((c) => c.state === "fail");
      const unknown = checks.filter((c) => c.state === "unknown");
      let readiness: "ready" | "blocked" | "unknown";
      if (failed.length > 0) {
        readiness = "blocked";
        blockedSteps += 1;
      } else if (unknown.length > 0) {
        readiness = "unknown";
        unknownSteps += 1;
      } else {
        readiness = "ready";
        readySteps += 1;
      }
      let persistedStepId: string | null = null;
      if (recordRun && stepIndex != null && toolName) {
        const before = await replayStepBefore(
          client,
          {
            tenant_id: tenancy.tenant_id,
            scope: tenancy.scope,
            actor: parsed.actor ?? undefined,
            ...replayCallIdentity,
            run_id: replayRunId,
            step_index: stepIndex,
            tool_name: toolName,
            tool_input: stepObj.tool_input_template ?? stepObj.tool_input ?? {},
            expected_output_signature: stepObj.expected_output_signature ?? null,
            preconditions: Array.isArray(stepObj.preconditions) ? stepObj.preconditions : [],
            retry_policy: asObject(stepObj.retry_policy) ?? undefined,
            safety_level: (toStringOrNull(stepObj.safety_level) ?? "needs_confirm") as "auto_ok" | "needs_confirm" | "manual_only",
            metadata: {
              replay_mode: "simulate",
              playbook_id: parsed.playbook_id,
              playbook_version: row.version_num,
            },
          },
          opts.writeOptions!,
        ) as Record<string, unknown>;
        persistedStepId = toStringOrNull(before.step_id);
        await replayStepAfter(
          client,
          {
            tenant_id: tenancy.tenant_id,
            scope: tenancy.scope,
            actor: parsed.actor ?? undefined,
            ...replayCallIdentity,
            run_id: replayRunId,
            step_id: persistedStepId ?? undefined,
            step_index: stepIndex,
            status: readiness === "ready" ? "success" : "partial",
            output_signature: {
              readiness,
              command: command || null,
              argv,
            },
            postconditions: [],
            artifact_refs: [],
            repair_applied: false,
            error:
              readiness === "blocked"
                ? "simulate_blocked"
                : readiness === "unknown"
                  ? "simulate_unknown"
                  : undefined,
            metadata: {
              replay_mode: "simulate",
              readiness,
            },
          },
          opts.writeOptions!,
        );
      }
      stepReports.push(
        buildReplaySimulateStepReport({
          stepIndex,
          toolName,
          safetyLevel: toStringOrNull(stepObj.safety_level) ?? "needs_confirm",
          readiness,
          command: command || null,
          argv,
          sensitiveReview: sensitive.sensitive
            ? {
                required_override: true,
                reason: sensitive.reason,
                risk_level: sensitive.risk_level,
                default_mode: "block",
              }
            : null,
          checks,
        }),
      );
    }
    const runStatus = blockedSteps > 0 || unknownSteps > 0 ? "partial" : "success";
    let runEndOut: Record<string, unknown> | null = null;
    if (recordRun) {
      runEndOut = await replayRunEnd(
        client,
        {
          tenant_id: tenancy.tenant_id,
          scope: tenancy.scope,
          actor: parsed.actor ?? undefined,
          ...replayCallIdentity,
          run_id: replayRunId,
          status: runStatus,
          summary:
            runStatus === "success"
              ? "simulate replay readiness passed"
              : "simulate replay found blocked or unknown steps",
          metrics: {
            total_steps: stepsRaw.length,
            ready_steps: readySteps,
            blocked_steps: blockedSteps,
            unknown_steps: unknownSteps,
          },
          metadata: {
            replay_mode: "simulate",
            source_playbook_id: parsed.playbook_id,
            source_playbook_version: row.version_num,
          },
        },
        opts.writeOptions!,
      ) as Record<string, unknown>;
    }
    return {
      tenant_id: tenancy.tenant_id,
      scope: tenancy.scope,
      playbook: buildReplayRunPlaybookSurface({
        tenantId: tenancy.tenant_id,
        scope: tenancy.scope,
        playbookId: parsed.playbook_id,
        row,
      }),
      mode: "simulate",
      deterministic_gate: deterministicGate,
      run: recordRun
        ? buildReplayRunSurface({
            runId: replayRunId,
            status: runStatus,
            runStartOut,
            runEndOut,
          })
        : null,
      execution_policy: {
        execution_backend: normalizeReplayExecutionBackend(toStringOrNull(paramsObj.execution_backend)),
        sensitive_review_mode: normalizeReplaySensitiveReviewMode(toStringOrNull(paramsObj.sensitive_review_mode)),
      },
      summary: buildReplaySimulateSummary({
        totalSteps: stepsRaw.length,
        readySteps: readySteps,
        blockedSteps: blockedSteps,
        unknownSteps: unknownSteps,
      }),
      steps: stepReports,
      execution: {
        inference_skipped: deterministicGate.inference_skipped,
        deterministic_gate_matched: deterministicGate.matched,
      },
      params_echo: parsed.params ?? {},
      cost_signals: buildReplayCostSignals({ deterministic_gate: deterministicGate }),
    };
  }

  const localExecutor = opts.localExecutor;
  const executionBackend = normalizeReplayExecutionBackend(toStringOrNull(paramsObj.execution_backend));
  const sandboxProjectId = toStringOrNull(parsed.project_id) ?? toStringOrNull(paramsObj.project_id);
  const sensitiveReviewMode = normalizeReplaySensitiveReviewMode(toStringOrNull(paramsObj.sensitive_review_mode));
  const allowSensitiveExec = paramsObj.allow_sensitive_exec === true;

  if (executionBackend === "sandbox_async" && mode === "strict") {
    throw new HttpError(
      400,
      "replay_strict_async_not_supported",
      "strict replay does not support async sandbox execution; use sandbox_sync or local_process.",
      { execution_backend: executionBackend },
    );
  }
  if (executionBackend === "local_process") {
    if (!localExecutor?.enabled || localExecutor.mode !== "local_process") {
      throw new HttpError(
        400,
        "replay_executor_not_enabled",
        "strict/guided replay with local_process requires SANDBOX_ENABLED=true and SANDBOX_EXECUTOR_MODE=local_process.",
        { execution_backend: executionBackend },
      );
    }
  } else if (!opts.sandboxExecutor) {
    throw new HttpError(
      400,
      "replay_sandbox_executor_not_enabled",
      "sandbox replay backend is not configured on this deployment",
      { execution_backend: executionBackend },
    );
  }
  if (!opts.writeOptions) {
    throw new HttpError(500, "replay_run_write_options_missing", "strict/guided replay requires write options wiring.");
  }
  if (paramsObj.allow_local_exec !== true) {
    throw new HttpError(
      400,
      "replay_local_exec_consent_required",
      "strict/guided replay requires params.allow_local_exec=true as explicit execution consent.",
      { execution_backend: executionBackend },
    );
  }

  const requestedCommands = asStringArray(paramsObj.allowed_commands);
  const requestedSet = requestedCommands.length > 0 ? new Set(requestedCommands) : null;
  const allowedCommands = new Set<string>();
  for (const cmd of (localExecutor?.allowedCommands ?? new Set<string>()).values()) {
    if (requestedSet && !requestedSet.has(cmd)) continue;
    allowedCommands.add(cmd);
  }
  if (allowedCommands.size === 0) {
    throw new HttpError(
      400,
      "replay_allowed_commands_empty",
      "No allowed commands remain for replay execution after allowlist filtering.",
      {
        requested_commands: requestedCommands,
      },
    );
  }
  const defaultGuidedRepairStrategy = opts.guidedRepair?.strategy ?? "deterministic_skip";
  const allowRequestBuiltinLlm = opts.guidedRepair?.allowRequestBuiltinLlm === true;
  const requestedGuidedRepairStrategy = toStringOrNull(paramsObj.guided_repair_strategy);
  if (
    requestedGuidedRepairStrategy === "builtin_llm"
    && defaultGuidedRepairStrategy !== "builtin_llm"
    && !allowRequestBuiltinLlm
  ) {
    throw new HttpError(
      400,
      "replay_guided_repair_strategy_not_allowed",
      "params.guided_repair_strategy=builtin_llm is not allowed by server policy",
      {
        requested_strategy: requestedGuidedRepairStrategy,
        default_strategy: defaultGuidedRepairStrategy,
      },
    );
  }
  const guidedRepairStrategy: ReplayGuidedRepairStrategy =
    requestedGuidedRepairStrategy === "deterministic_skip"
      || requestedGuidedRepairStrategy === "heuristic_patch"
      || requestedGuidedRepairStrategy === "http_synth"
      || requestedGuidedRepairStrategy === "builtin_llm"
      ? requestedGuidedRepairStrategy
      : defaultGuidedRepairStrategy;
  const guidedRepairMaxErrorChars = clampInt(
    Number(paramsObj.guided_repair_max_error_chars ?? opts.guidedRepair?.maxErrorChars ?? 1200),
    64,
    20000,
  );
  const commandAliasMap = asStringRecord(paramsObj.command_alias_map);

  const timeoutMs = clampInt(Number(paramsObj.timeout_ms ?? localExecutor?.timeoutMs ?? 15000), 100, 600000);
  const stdioMaxBytes = clampInt(Number(paramsObj.stdio_max_bytes ?? localExecutor?.stdioMaxBytes ?? 65536), 1024, 1024 * 1024);
  const workdir = toStringOrNull(paramsObj.workdir) ?? localExecutor?.workdir ?? process.cwd();
  const autoConfirm = paramsObj.auto_confirm === true;
  const stopOnFailure = paramsObj.stop_on_failure !== false;
  if (executionBackend !== "local_process" && opts.sandboxBudgetGuard) {
    await opts.sandboxBudgetGuard({
      tenant_id: tenancy.tenant_id,
      scope: tenancy.scope,
      project_id: sandboxProjectId,
    });
  }

  let runStartOut: Record<string, unknown> | null = null;
  if (recordRun) {
    runStartOut = await replayRunStart(
      client,
      {
        tenant_id: tenancy.tenant_id,
        scope: tenancy.scope,
        ...replayCallIdentity,
        run_id: replayRunId,
        goal: `Replay playbook ${parsed.playbook_id} v${row.version_num}`,
        context_snapshot_ref: buildAionisUri({
          tenant_id: tenancy.tenant_id,
          scope: tenancy.scope,
          type: row.type,
          id: row.id,
        }),
        metadata: {
          replay_mode: mode,
          execution_backend: executionBackend,
          replay_project_id: sandboxProjectId,
          sensitive_review_mode: sensitiveReviewMode,
          source_playbook_id: parsed.playbook_id,
          source_playbook_version: row.version_num,
          guided_repair_strategy: mode === "guided" ? guidedRepairStrategy : null,
        },
      },
      opts.writeOptions,
    ) as Record<string, unknown>;
  }

  let executedSteps = 0;
  let succeededSteps = 0;
  let failedSteps = 0;
  let repairedSteps = 0;
  let blockedSteps = 0;
  let skippedSteps = 0;
  let pendingSteps = 0;
  const usageOut = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    source: "no_model_call",
  };

  for (const step of stepsRaw) {
    const stepObj = asObject(step) ?? {};
    const stepIndex = Number(stepObj.step_index ?? 0) || null;
    const toolName = toStringOrNull(stepObj.tool_name);
    const safetyLevel = toStringOrNull(stepObj.safety_level) ?? "needs_confirm";
    const expectedSignature = stepObj.expected_output_signature ?? null;
    const toolInput = stepObj.tool_input_template ?? stepObj.tool_input ?? {};
    const preconditions = Array.isArray(stepObj.preconditions) ? stepObj.preconditions : [];
    const postconditions = Array.isArray(stepObj.postconditions) ? stepObj.postconditions : [];

    let persistedStepId: string | null = null;
    if (recordRun && stepIndex != null && toolName) {
      const before = await replayStepBefore(
        client,
        {
          tenant_id: tenancy.tenant_id,
          scope: tenancy.scope,
          ...replayCallIdentity,
          run_id: replayRunId,
          step_index: stepIndex,
          tool_name: toolName,
          tool_input: toolInput,
          expected_output_signature: expectedSignature,
          preconditions,
          safety_level: safetyLevel as "auto_ok" | "needs_confirm" | "manual_only",
          metadata: {
            replay_mode: mode,
            playbook_id: parsed.playbook_id,
            playbook_version: row.version_num,
          },
        },
        opts.writeOptions,
      ) as Record<string, unknown>;
      persistedStepId = toStringOrNull(before.step_id);
    }

    const preChecks: PreconditionResult[] = [];
    for (const cond of preconditions) preChecks.push(await evaluatePrecondition(cond));
    const preFailed = preChecks.filter((c) => c.state === "fail");
    const preUnknown = preChecks.filter((c) => c.state === "unknown");
    if (preFailed.length > 0 || preUnknown.length > 0) {
      blockedSteps += 1;
      const reason =
        preFailed.length > 0
          ? "preconditions_failed"
          : "preconditions_unknown";
      if (mode === "strict") {
        failedSteps += 1;
        stepReports.push(
          buildReplayBlockedStepReport({
            stepIndex,
            toolName,
            preconditions: preChecks,
            error: reason,
          }),
        );
        if (recordRun) {
          await replayStepAfter(
            client,
            {
              tenant_id: tenancy.tenant_id,
              scope: tenancy.scope,
              ...replayCallIdentity,
              run_id: replayRunId,
              step_id: persistedStepId ?? undefined,
              step_index: stepIndex ?? undefined,
              status: "failed",
              output_signature: {
                reason,
                preconditions: preChecks,
              },
              postconditions: [],
              artifact_refs: [],
              repair_applied: false,
              error: reason,
            },
            opts.writeOptions,
          );
        }
        if (stopOnFailure) break;
        continue;
      }
      repairedSteps += 1;
      skippedSteps += 1;
      const repair = await makeGuidedRepairPatch({
        strategy: guidedRepairStrategy,
        stepIndex,
        toolName,
        reason,
        detail: "guided mode skipped blocked step",
        stepObj,
        allowedCommands,
        commandAliasMap,
        maxErrorChars: guidedRepairMaxErrorChars,
        httpEndpoint: opts.guidedRepair?.httpEndpoint,
        httpTimeoutMs: opts.guidedRepair?.httpTimeoutMs,
        httpAuthToken: opts.guidedRepair?.httpAuthToken,
        llmBaseUrl: opts.guidedRepair?.llmBaseUrl,
        llmApiKey: opts.guidedRepair?.llmApiKey,
        llmModel: opts.guidedRepair?.llmModel,
        llmTimeoutMs: opts.guidedRepair?.llmTimeoutMs,
        llmMaxTokens: opts.guidedRepair?.llmMaxTokens,
        llmTemperature: opts.guidedRepair?.llmTemperature,
        mode: "guided",
      });
      mergeReplayUsage(usageOut, asObject(repair)?.usage);
      stepReports.push(
        buildReplayGuidedPartialStepReport({
          stepIndex,
          toolName,
          readiness: preUnknown.length > 0 ? "unknown" : "blocked",
          preconditions: preChecks,
          repair,
        }),
      );
      if (recordRun) {
        await replayStepAfter(
          client,
          {
            tenant_id: tenancy.tenant_id,
            scope: tenancy.scope,
            ...replayCallIdentity,
            run_id: replayRunId,
            step_id: persistedStepId ?? undefined,
            step_index: stepIndex ?? undefined,
            status: "partial",
            output_signature: {
              reason,
              preconditions: preChecks,
              repair,
            },
            postconditions: [],
            artifact_refs: [],
            repair_applied: true,
            repair_note: reason,
          },
          opts.writeOptions,
        );
      }
      continue;
    }

    if (safetyLevel === "manual_only" || (safetyLevel === "needs_confirm" && !autoConfirm)) {
      const reason = safetyLevel === "manual_only" ? "manual_only_step" : "confirmation_required";
      if (mode === "strict") {
        failedSteps += 1;
        stepReports.push(
          buildReplayBlockedStepReport({
            stepIndex,
            toolName,
            error: reason,
          }),
        );
        if (recordRun) {
          await replayStepAfter(
            client,
            {
              tenant_id: tenancy.tenant_id,
              scope: tenancy.scope,
              ...replayCallIdentity,
              run_id: replayRunId,
              step_id: persistedStepId ?? undefined,
              step_index: stepIndex ?? undefined,
              status: "failed",
              output_signature: { reason },
              postconditions: [],
              artifact_refs: [],
              repair_applied: false,
              error: reason,
            },
            opts.writeOptions,
          );
        }
        if (stopOnFailure) break;
        continue;
      }
      repairedSteps += 1;
      skippedSteps += 1;
      const repair = await makeGuidedRepairPatch({
        strategy: guidedRepairStrategy,
        stepIndex,
        toolName,
        reason,
        detail: "guided mode skipped confirmation-gated step",
        stepObj,
        allowedCommands,
        commandAliasMap,
        maxErrorChars: guidedRepairMaxErrorChars,
        httpEndpoint: opts.guidedRepair?.httpEndpoint,
        httpTimeoutMs: opts.guidedRepair?.httpTimeoutMs,
        httpAuthToken: opts.guidedRepair?.httpAuthToken,
        llmBaseUrl: opts.guidedRepair?.llmBaseUrl,
        llmApiKey: opts.guidedRepair?.llmApiKey,
        llmModel: opts.guidedRepair?.llmModel,
        llmTimeoutMs: opts.guidedRepair?.llmTimeoutMs,
        llmMaxTokens: opts.guidedRepair?.llmMaxTokens,
        llmTemperature: opts.guidedRepair?.llmTemperature,
        mode: "guided",
      });
      mergeReplayUsage(usageOut, asObject(repair)?.usage);
      stepReports.push(
        buildReplayGuidedPartialStepReport({
          stepIndex,
          toolName,
          readiness: "blocked",
          repair,
        }),
      );
      if (recordRun) {
        await replayStepAfter(
          client,
          {
            tenant_id: tenancy.tenant_id,
            scope: tenancy.scope,
            ...replayCallIdentity,
            run_id: replayRunId,
            step_id: persistedStepId ?? undefined,
            step_index: stepIndex ?? undefined,
            status: "partial",
            output_signature: { reason, repair },
            postconditions: [],
            artifact_refs: [],
            repair_applied: true,
            repair_note: reason,
          },
          opts.writeOptions,
        );
      }
      continue;
    }

    if (!isReplayCommandTool(toolName)) {
      const reason = "unsupported_tool_for_command_executor";
      if (mode === "strict") {
        failedSteps += 1;
        stepReports.push(
          buildReplayBlockedStepReport({
            stepIndex,
            toolName,
            error: reason,
          }),
        );
        if (recordRun) {
          await replayStepAfter(
            client,
            {
              tenant_id: tenancy.tenant_id,
              scope: tenancy.scope,
              ...replayCallIdentity,
              run_id: replayRunId,
              step_id: persistedStepId ?? undefined,
              step_index: stepIndex ?? undefined,
              status: "failed",
              output_signature: { reason },
              postconditions: [],
              artifact_refs: [],
              repair_applied: false,
              error: reason,
            },
            opts.writeOptions,
          );
        }
        if (stopOnFailure) break;
        continue;
      }
      repairedSteps += 1;
      skippedSteps += 1;
      const repair = await makeGuidedRepairPatch({
        strategy: guidedRepairStrategy,
        stepIndex,
        toolName,
        reason,
        detail: "tool is not mapped to command-style replay executor",
        stepObj,
        allowedCommands,
        commandAliasMap,
        maxErrorChars: guidedRepairMaxErrorChars,
        httpEndpoint: opts.guidedRepair?.httpEndpoint,
        httpTimeoutMs: opts.guidedRepair?.httpTimeoutMs,
        httpAuthToken: opts.guidedRepair?.httpAuthToken,
        llmBaseUrl: opts.guidedRepair?.llmBaseUrl,
        llmApiKey: opts.guidedRepair?.llmApiKey,
        llmModel: opts.guidedRepair?.llmModel,
        llmTimeoutMs: opts.guidedRepair?.llmTimeoutMs,
        llmMaxTokens: opts.guidedRepair?.llmMaxTokens,
        llmTemperature: opts.guidedRepair?.llmTemperature,
        mode: "guided",
      });
      mergeReplayUsage(usageOut, asObject(repair)?.usage);
      stepReports.push(
        buildReplayGuidedPartialStepReport({
          stepIndex,
          toolName,
          readiness: "unknown",
          repair,
        }),
      );
      if (recordRun) {
        await replayStepAfter(
          client,
          {
            tenant_id: tenancy.tenant_id,
            scope: tenancy.scope,
            ...replayCallIdentity,
            run_id: replayRunId,
            step_id: persistedStepId ?? undefined,
            step_index: stepIndex ?? undefined,
            status: "partial",
            output_signature: { reason, repair },
            postconditions: [],
            artifact_refs: [],
            repair_applied: true,
            repair_note: reason,
          },
          opts.writeOptions,
        );
      }
      continue;
    }

    const argv = parseStepArgv(stepObj, toolName);
    const command = String(argv[0] ?? "").trim();
    if (argv.length === 0 || !command || !isSafeCommandName(command) || !allowedCommands.has(command)) {
      const reason = "command_not_allowed_or_missing";
      if (mode === "strict") {
        failedSteps += 1;
        stepReports.push(
          buildReplayBlockedStepReport({
            stepIndex,
            toolName,
            error: reason,
            command,
            allowedCommands: [...allowedCommands.values()],
          }),
        );
        if (recordRun) {
          await replayStepAfter(
            client,
            {
              tenant_id: tenancy.tenant_id,
              scope: tenancy.scope,
              ...replayCallIdentity,
              run_id: replayRunId,
              step_id: persistedStepId ?? undefined,
              step_index: stepIndex ?? undefined,
              status: "failed",
              output_signature: { reason, command, allowed_commands: [...allowedCommands.values()] },
              postconditions: [],
              artifact_refs: [],
              repair_applied: false,
              error: reason,
            },
            opts.writeOptions,
          );
        }
        if (stopOnFailure) break;
        continue;
      }
      repairedSteps += 1;
      skippedSteps += 1;
      const repair = await makeGuidedRepairPatch({
        strategy: guidedRepairStrategy,
        stepIndex,
        toolName,
        reason,
        detail: command ? `command '${command}' is not allowed` : "argv is missing",
        stepObj,
        command,
        argv,
        allowedCommands,
        commandAliasMap,
        maxErrorChars: guidedRepairMaxErrorChars,
        httpEndpoint: opts.guidedRepair?.httpEndpoint,
        httpTimeoutMs: opts.guidedRepair?.httpTimeoutMs,
        httpAuthToken: opts.guidedRepair?.httpAuthToken,
        llmBaseUrl: opts.guidedRepair?.llmBaseUrl,
        llmApiKey: opts.guidedRepair?.llmApiKey,
        llmModel: opts.guidedRepair?.llmModel,
        llmTimeoutMs: opts.guidedRepair?.llmTimeoutMs,
        llmMaxTokens: opts.guidedRepair?.llmMaxTokens,
        llmTemperature: opts.guidedRepair?.llmTemperature,
        mode: "guided",
      });
      mergeReplayUsage(usageOut, asObject(repair)?.usage);
      stepReports.push(
        buildReplayGuidedPartialStepReport({
          stepIndex,
          toolName,
          readiness: "blocked",
          command,
          repair,
        }),
      );
      if (recordRun) {
        await replayStepAfter(
          client,
          {
            tenant_id: tenancy.tenant_id,
            scope: tenancy.scope,
            ...replayCallIdentity,
            run_id: replayRunId,
            step_id: persistedStepId ?? undefined,
            step_index: stepIndex ?? undefined,
            status: "partial",
            output_signature: { reason, command, repair },
            postconditions: [],
            artifact_refs: [],
            repair_applied: true,
            repair_note: reason,
          },
          opts.writeOptions,
        );
      }
      continue;
    }

    const sensitive = detectSensitiveCommand(command, argv);
    const sensitiveReviewInfo = sensitive.sensitive
      ? {
          command,
          argv,
          reason: sensitive.reason,
          risk_level: sensitive.risk_level,
          mode: sensitiveReviewMode,
          override_used: allowSensitiveExec,
        }
      : null;
    if (sensitive.sensitive && sensitiveReviewMode === "block" && !allowSensitiveExec) {
      const reason = "sensitive_command_requires_override";
      const sensitiveReview = {
        command,
        argv,
        reason: sensitive.reason,
        risk_level: sensitive.risk_level,
        required_param: "params.allow_sensitive_exec=true",
      };
      if (mode === "strict") {
        failedSteps += 1;
        blockedSteps += 1;
        stepReports.push(
          buildReplayBlockedStepReport({
            stepIndex,
            toolName,
            error: reason,
            sensitiveReview,
          }),
        );
        if (recordRun) {
          await replayStepAfter(
            client,
            {
              tenant_id: tenancy.tenant_id,
              scope: tenancy.scope,
              ...replayCallIdentity,
              run_id: replayRunId,
              step_id: persistedStepId ?? undefined,
              step_index: stepIndex ?? undefined,
              status: "failed",
              output_signature: { reason, sensitive_review: sensitiveReview },
              postconditions: [],
              artifact_refs: [],
              repair_applied: false,
              error: reason,
            },
            opts.writeOptions,
          );
        }
        if (stopOnFailure) break;
        continue;
      }
      repairedSteps += 1;
      skippedSteps += 1;
      const repair = await makeGuidedRepairPatch({
        strategy: guidedRepairStrategy,
        stepIndex,
        toolName,
        reason,
        detail: `blocked sensitive command '${command}' (${sensitive.reason ?? "risk"})`,
        stepObj,
        command,
        argv,
        allowedCommands,
        commandAliasMap,
        maxErrorChars: guidedRepairMaxErrorChars,
        httpEndpoint: opts.guidedRepair?.httpEndpoint,
        httpTimeoutMs: opts.guidedRepair?.httpTimeoutMs,
        httpAuthToken: opts.guidedRepair?.httpAuthToken,
        llmBaseUrl: opts.guidedRepair?.llmBaseUrl,
        llmApiKey: opts.guidedRepair?.llmApiKey,
        llmModel: opts.guidedRepair?.llmModel,
        llmTimeoutMs: opts.guidedRepair?.llmTimeoutMs,
        llmMaxTokens: opts.guidedRepair?.llmMaxTokens,
        llmTemperature: opts.guidedRepair?.llmTemperature,
        mode: "guided",
      });
      mergeReplayUsage(usageOut, asObject(repair)?.usage);
      stepReports.push(
        buildReplayGuidedPartialStepReport({
          stepIndex,
          toolName,
          readiness: "blocked",
          command,
          argv,
          sensitiveReview,
          repair,
        }),
      );
      if (recordRun) {
        await replayStepAfter(
          client,
          {
            tenant_id: tenancy.tenant_id,
            scope: tenancy.scope,
            ...replayCallIdentity,
            run_id: replayRunId,
            step_id: persistedStepId ?? undefined,
            step_index: stepIndex ?? undefined,
            status: "partial",
            output_signature: { reason, sensitive_review: sensitiveReview, repair },
            postconditions: [],
            artifact_refs: [],
            repair_applied: true,
            repair_note: reason,
          },
          opts.writeOptions,
        );
      }
      continue;
    }

    executedSteps += 1;
    const exec = await executeReplayCommand({
      backend: executionBackend,
      tenant_id: tenancy.tenant_id,
      scope: tenancy.scope,
      project_id: sandboxProjectId,
      argv,
      timeout_ms: timeoutMs,
      local: { cwd: workdir, stdioMaxBytes },
      sandboxExecutor: opts.sandboxExecutor,
    });
    if (exec.pending || !exec.outcome) {
      pendingSteps += 1;
      repairedSteps += mode === "guided" ? 1 : 0;
      const reason = "sandbox_async_execution_pending";
      stepReports.push(
        buildReplayPendingStepReport({
          stepIndex,
          toolName,
          mode,
          command,
          argv,
          executionBackend,
          sandboxRunId: exec.sandbox_run_id,
          error: reason,
        }),
      );
      if (recordRun) {
        await replayStepAfter(
          client,
          {
            tenant_id: tenancy.tenant_id,
            scope: tenancy.scope,
            ...replayCallIdentity,
            run_id: replayRunId,
            step_id: persistedStepId ?? undefined,
            step_index: stepIndex ?? undefined,
            status: mode === "guided" ? "partial" : "failed",
            output_signature: {
              reason,
              execution_backend: executionBackend,
              sandbox_run_id: exec.sandbox_run_id,
              sandbox_status: exec.raw_status,
            },
            postconditions: [],
            artifact_refs: [],
            repair_applied: mode === "guided",
            repair_note: mode === "guided" ? reason : undefined,
            error: mode === "strict" ? reason : undefined,
          },
          opts.writeOptions,
        );
      }
      if (mode === "strict" && stopOnFailure) break;
      if (mode === "strict") failedSteps += 1;
      continue;
    }
    const execOutcome = exec.outcome;
    const resultSummary = summarizeToolResult({
      stdout: execOutcome.stdout,
      stderr: execOutcome.stderr,
      exit_code: execOutcome.exit_code,
      error: execOutcome.error,
      truncated: false,
    });
    const signature = evaluateExpectedSignature(expectedSignature, execOutcome);
    const postChecks: PreconditionResult[] = [];
    for (const cond of postconditions) postChecks.push(await evaluatePostcondition(cond, execOutcome));
    const failedPost = postChecks.filter((c) => c.state === "fail");
    const unknownPost = postChecks.filter((c) => c.state === "unknown");
    const executionPassed = execOutcome.ok && signature.ok && failedPost.length === 0 && unknownPost.length === 0;

    if (executionPassed) {
      succeededSteps += 1;
      stepReports.push(
        buildReplayExecutionSuccessStepReport({
          stepIndex,
          toolName,
          command,
          argv,
          executionBackend,
          sandboxRunId: exec.sandbox_run_id,
          sensitiveReview: sensitiveReviewInfo,
          execution: execOutcome as unknown as Record<string, unknown>,
          resultSummary: resultSummary as Record<string, unknown>,
          signature: signature as unknown as Record<string, unknown>,
          postconditions: postChecks,
        }),
      );
      if (recordRun) {
        await replayStepAfter(
          client,
          {
            tenant_id: tenancy.tenant_id,
            scope: tenancy.scope,
            ...replayCallIdentity,
            run_id: replayRunId,
            step_id: persistedStepId ?? undefined,
            step_index: stepIndex ?? undefined,
            status: "success",
            output_signature: {
              command,
              argv,
              execution_backend: executionBackend,
              sandbox_run_id: exec.sandbox_run_id,
              sensitive_review: sensitiveReviewInfo,
              exit_code: execOutcome.exit_code,
              duration_ms: execOutcome.duration_ms,
              result_summary: resultSummary,
              signature,
            },
            postconditions: postChecks,
            artifact_refs: [],
            repair_applied: false,
          },
          opts.writeOptions,
        );
      }
      continue;
    }

    const failureReason = execOutcome.error ?? (execOutcome.status === "timeout" ? "execution_timeout" : "execution_failed");
    if (mode === "strict") {
      failedSteps += 1;
      stepReports.push(
        buildReplayExecutionFailureStepReport({
          stepIndex,
          toolName,
          command,
          argv,
          executionBackend,
          sandboxRunId: exec.sandbox_run_id,
          sensitiveReview: sensitiveReviewInfo,
          execution: execOutcome as unknown as Record<string, unknown>,
          resultSummary: resultSummary as Record<string, unknown>,
          signature: signature as unknown as Record<string, unknown>,
          postconditions: postChecks,
          error: failureReason,
        }),
      );
      if (recordRun) {
        await replayStepAfter(
          client,
          {
            tenant_id: tenancy.tenant_id,
            scope: tenancy.scope,
            ...replayCallIdentity,
            run_id: replayRunId,
            step_id: persistedStepId ?? undefined,
            step_index: stepIndex ?? undefined,
            status: "failed",
            output_signature: {
              command,
              argv,
              execution_backend: executionBackend,
              sandbox_run_id: exec.sandbox_run_id,
              sensitive_review: sensitiveReviewInfo,
              exit_code: execOutcome.exit_code,
              duration_ms: execOutcome.duration_ms,
              result_summary: resultSummary,
              signature,
              preconditions: preChecks,
              postconditions: postChecks,
            },
            postconditions: postChecks,
            artifact_refs: [],
            repair_applied: false,
            error: failureReason,
          },
          opts.writeOptions,
        );
      }
      if (stopOnFailure) break;
      continue;
    }

    repairedSteps += 1;
    const repair = await makeGuidedRepairPatch({
      strategy: guidedRepairStrategy,
      stepIndex,
      toolName,
      reason: "execution_failed_guided_skip",
      detail: failureReason,
      stepObj,
      command,
      argv,
      allowedCommands,
      commandAliasMap,
      maxErrorChars: guidedRepairMaxErrorChars,
      httpEndpoint: opts.guidedRepair?.httpEndpoint,
      httpTimeoutMs: opts.guidedRepair?.httpTimeoutMs,
      httpAuthToken: opts.guidedRepair?.httpAuthToken,
      llmBaseUrl: opts.guidedRepair?.llmBaseUrl,
      llmApiKey: opts.guidedRepair?.llmApiKey,
      llmModel: opts.guidedRepair?.llmModel,
      llmTimeoutMs: opts.guidedRepair?.llmTimeoutMs,
      llmMaxTokens: opts.guidedRepair?.llmMaxTokens,
      llmTemperature: opts.guidedRepair?.llmTemperature,
      mode: "guided",
    });
    mergeReplayUsage(usageOut, asObject(repair)?.usage);
    stepReports.push(
      buildReplayGuidedPartialStepReport({
        stepIndex,
        toolName,
        readiness: "partial",
        command,
        argv,
        executionBackend,
        sandboxRunId: exec.sandbox_run_id,
        sensitiveReview: sensitiveReviewInfo,
        execution: execOutcome as unknown as Record<string, unknown>,
        resultSummary: resultSummary as Record<string, unknown>,
        signature: signature as unknown as Record<string, unknown>,
        postconditions: postChecks,
        repair,
      }),
    );
    if (recordRun) {
      await replayStepAfter(
        client,
        {
          tenant_id: tenancy.tenant_id,
          scope: tenancy.scope,
          ...replayCallIdentity,
          run_id: replayRunId,
          step_id: persistedStepId ?? undefined,
          step_index: stepIndex ?? undefined,
          status: "partial",
          output_signature: {
            command,
            argv,
            execution_backend: executionBackend,
            sandbox_run_id: exec.sandbox_run_id,
            sensitive_review: sensitiveReviewInfo,
            exit_code: execOutcome.exit_code,
            duration_ms: execOutcome.duration_ms,
            result_summary: resultSummary,
            signature,
            postconditions: postChecks,
            repair,
          },
          postconditions: postChecks,
          artifact_refs: [],
          repair_applied: true,
          repair_note: failureReason,
          error: failureReason,
        },
        opts.writeOptions,
      );
    }
  }

  const runStatus: "success" | "failed" | "partial" =
    mode === "strict"
      ? (failedSteps > 0 ? "failed" : "success")
      : (failedSteps > 0 ? "failed" : repairedSteps > 0 || skippedSteps > 0 ? "partial" : "success");

  let runEndOut: Record<string, unknown> | null = null;
  if (recordRun) {
    runEndOut = await replayRunEnd(
      client,
      {
        tenant_id: tenancy.tenant_id,
        scope: tenancy.scope,
        ...replayCallIdentity,
        run_id: replayRunId,
        status: runStatus,
        summary: `Replay ${mode} run completed: success=${succeededSteps}, failed=${failedSteps}, repaired=${repairedSteps}, pending=${pendingSteps}`,
        success_criteria: {
          mode,
          execution_backend: executionBackend,
          failed_steps: failedSteps,
          repaired_steps: repairedSteps,
          skipped_steps: skippedSteps,
          pending_steps: pendingSteps,
        },
        metrics: {
          total_steps: stepsRaw.length,
          executed_steps: executedSteps,
          succeeded_steps: succeededSteps,
          failed_steps: failedSteps,
          repaired_steps: repairedSteps,
          blocked_steps: blockedSteps,
          skipped_steps: skippedSteps,
          pending_steps: pendingSteps,
        },
      },
      opts.writeOptions,
    ) as Record<string, unknown>;
  }

  return {
    tenant_id: tenancy.tenant_id,
    scope: tenancy.scope,
    playbook: buildReplayRunPlaybookSurface({
      tenantId: tenancy.tenant_id,
      scope: tenancy.scope,
      playbookId: parsed.playbook_id,
      row,
    }),
    mode,
    deterministic_gate: deterministicGate,
    run: buildReplayRunSurface({
      runId: replayRunId,
      status: runStatus,
      runStartOut,
      runEndOut,
    }),
    summary: buildReplayExecutionSummary({
      totalSteps: stepsRaw.length,
      executedSteps,
      succeededSteps,
      failedSteps,
      repairedSteps,
      blockedSteps,
      skippedSteps,
      pendingSteps,
    }),
    steps: stepReports,
    execution: buildReplayExecutionSurface({
      inferenceSkipped: deterministicGate.inference_skipped,
      deterministicGateMatched: deterministicGate.matched,
      executionBackend,
      localExecutorEnabled: localExecutor?.enabled === true,
      sandboxExecutorAvailable: typeof opts.sandboxExecutor === "function",
      sandboxProjectId,
      workdir,
      timeoutMs,
      stdioMaxBytes,
      allowedCommands: [...allowedCommands.values()],
      autoConfirm,
      stopOnFailure,
      recordRun,
      sensitiveReviewMode,
      allowSensitiveExec,
      guidedRepairStrategy,
      guidedRepairMaxErrorChars,
      guidedRepairHttpConfigured: Boolean(opts.guidedRepair?.httpEndpoint),
      guidedRepairBuiltinLlmConfigured: Boolean(
        opts.guidedRepair?.llmBaseUrl && opts.guidedRepair?.llmApiKey && opts.guidedRepair?.llmModel,
      ),
    }),
    params_echo: parsed.params ?? {},
    usage: usageOut,
    cost_signals: buildReplayCostSignals({ deterministic_gate: deterministicGate }),
  };
}

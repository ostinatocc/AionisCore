import { buildExecutionMemoryIntrospectionLite } from "./execution-introspection.js";
import { buildDelegationLearningSliceLite } from "./delegation-learning.js";
import {
  asRecord,
  buildActionRetrievalResponse,
  choosePathRecommendation,
  choosePreferredTrustedPattern,
  findSelectedWorkflow,
  firstString,
  numeric,
  readPersistedPolicyMemory,
  stringList,
  supportsWorkflowToolPreference,
  toPolicyHintEntry,
  workflowEvidenceParts,
  workflowToolPreferenceState,
  type PolicyHintEntryLike,
  type WorkflowEntry,
} from "./action-retrieval.js";
import {
  DerivedPolicySurfaceSchema,
  ExperienceIntelligenceRequest,
  ExperienceIntelligenceResponseSchema,
  KickoffRecommendationResponseSchema,
  PolicyContractSchema,
  type ContractTrust,
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
import { parseExecutionContract, type ExecutionContractV1 } from "./execution-contract.js";
import { resolveContractTrustForSteering } from "./contract-trust.js";
import { selectTools } from "./tools-select.js";
import type { EmbeddingProvider } from "../embeddings/types.js";
import type { RecallStoreAccess } from "../store/recall-access.js";
import type { LiteWriteStore } from "../store/lite-write-store.js";
import { buildKickoffRecommendationFromExperience } from "../app/planning-summary.js";
import { augmentTrajectoryAwareRequest } from "./trajectory-compile-runtime.js";

type ExperienceLiteStore = LiteWriteStore;

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

function firstContractTrust(...values: unknown[]): ContractTrust | null {
  for (const value of values) {
    if (value === "authoritative" || value === "advisory" || value === "observational") return value;
  }
  return null;
}

function buildDerivedPolicySurface(args: {
  tools: ToolsSelectRouteContract;
  introspection: ExecutionMemoryIntrospectionResponse;
  path: ReturnType<typeof choosePathRecommendation>;
  queryText: string;
  context: unknown;
  executionContract: ExecutionContractV1 | null;
}): DerivedPolicySurface | null {
  const selectedTool = firstString(args.tools.selection?.selected);
  if (!selectedTool) return null;

  const trustedPatterns = (Array.isArray(args.introspection.trusted_patterns) ? args.introspection.trusted_patterns : [])
    .map(toPolicyHintEntry)
    .filter((entry): entry is PolicyHintEntryLike => entry !== null);
  const preferredPattern = choosePreferredTrustedPattern({
    trustedPatterns,
    selectedTool,
    queryText: args.queryText,
    context: args.context,
  });
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
  const workflowContractTrust = firstContractTrust(
    (args.path as Record<string, unknown>).contract_trust,
    parseExecutionContract(selectedWorkflow?.execution_contract_v1)?.contract_trust,
    selectedWorkflow?.contract_trust,
  );
  const selectedWorkflowExecutionContract = parseExecutionContract(selectedWorkflow?.execution_contract_v1);
  const preferredPatternExecutionContract = parseExecutionContract(preferredPattern?.execution_contract_v1);
  const steeringExecutionContract = args.executionContract
    ?? selectedWorkflowExecutionContract
    ?? preferredPatternExecutionContract
    ?? null;
  const policyContractTrust = resolveContractTrustForSteering({
    computedTrust: patternSupports || workflowPolicyState === "stable" ? "authoritative" : "advisory",
    explicitTrust: firstContractTrust(
      args.executionContract?.contract_trust,
      preferredPattern?.contract_trust,
      preferredPatternExecutionContract?.contract_trust,
      workflowContractTrust,
    ),
    executionContract: steeringExecutionContract,
  });
  const policyState =
    (patternSupports || workflowPolicyState === "stable") && policyContractTrust === "authoritative"
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
  const workflowSteps = stringList(
    selectedWorkflow?.workflow_steps && selectedWorkflow.workflow_steps.length > 0
      ? selectedWorkflow.workflow_steps
      : args.executionContract?.workflow_steps,
    24,
  );
  const patternHints = stringList(
    selectedWorkflow?.pattern_hints && selectedWorkflow.pattern_hints.length > 0
      ? selectedWorkflow.pattern_hints
      : args.executionContract?.pattern_hints,
    24,
  );
  const serviceLifecycleConstraints = Array.isArray(selectedWorkflow?.service_lifecycle_constraints)
    && selectedWorkflow.service_lifecycle_constraints.length > 0
    ? selectedWorkflow.service_lifecycle_constraints.slice(0, 16)
    : Array.isArray(args.executionContract?.service_lifecycle_constraints)
    && args.executionContract.service_lifecycle_constraints.length > 0
    ? args.executionContract.service_lifecycle_constraints.slice(0, 16)
    : [];
  const targetFiles = stringList(
    selectedWorkflow?.target_files && selectedWorkflow.target_files.length > 0
      ? selectedWorkflow.target_files
      : args.executionContract?.target_files && args.executionContract.target_files.length > 0
        ? args.executionContract.target_files
        : preferredPattern?.target_files,
    24,
  );

  return DerivedPolicySurfaceSchema.parse({
    summary_version: "derived_policy_v1",
    policy_kind: "tool_preference",
    source_kind: sourceKind,
    policy_state: policyState,
    contract_trust: policyContractTrust,
    selected_tool: selectedTool,
    task_family: firstString(
      (args.path as Record<string, unknown>).task_family,
      selectedWorkflow?.task_family,
      preferredPattern?.task_family,
      args.executionContract?.task_family,
    ),
    workflow_signature: firstString(selectedWorkflow?.workflow_signature, args.executionContract?.workflow_signature),
    file_path: firstString(selectedWorkflow?.file_path, preferredPattern?.file_path, args.executionContract?.file_path),
    target_files: targetFiles,
    ...(workflowSteps.length > 0 ? { workflow_steps: workflowSteps } : {}),
    ...(patternHints.length > 0 ? { pattern_hints: patternHints } : {}),
    ...(serviceLifecycleConstraints.length > 0 ? { service_lifecycle_constraints: serviceLifecycleConstraints } : {}),
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
  queryText: string;
  context: unknown;
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

  const preferredPattern = choosePreferredTrustedPattern({
    trustedPatterns,
    selectedTool,
    queryText: args.queryText,
    context: args.context,
  });
  if (preferredPattern && preferredPattern.selected_tool) {
    hints.push({
      hint_id: `tool_preference:${preferredPattern.anchor_id}:${preferredPattern.selected_tool}`,
      source_kind: "trusted_pattern",
      hint_kind: "tool_preference",
      action: "prefer",
      source_anchor_id: preferredPattern.anchor_id,
      source_anchor_level: preferredPattern.anchor_level ?? null,
      selected_tool: preferredPattern.selected_tool,
      task_family: preferredPattern.task_family ?? null,
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
      task_family: firstString(selectedWorkflow!.task_family),
      workflow_signature: firstString(selectedWorkflow!.workflow_signature),
      file_path: firstString(selectedWorkflow!.file_path),
      target_files: stringList(selectedWorkflow!.target_files, 24),
      workflow_steps: stringList(selectedWorkflow!.workflow_steps, 24),
      pattern_hints: stringList(selectedWorkflow!.pattern_hints, 24),
      service_lifecycle_constraints: Array.isArray(selectedWorkflow!.service_lifecycle_constraints)
        ? selectedWorkflow!.service_lifecycle_constraints.slice(0, 16)
        : [],
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
      task_family: entry.task_family ?? null,
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
    const workflowSteps = Array.isArray(args.path.workflow_steps) && args.path.workflow_steps.length > 0
      ? args.path.workflow_steps
      : stringList(selectedWorkflow?.workflow_steps, 24);
    const patternHints = Array.isArray(args.path.pattern_hints) && args.path.pattern_hints.length > 0
      ? args.path.pattern_hints
      : stringList(selectedWorkflow?.pattern_hints, 24);
    const serviceLifecycleConstraints = Array.isArray(args.path.service_lifecycle_constraints) && args.path.service_lifecycle_constraints.length > 0
      ? args.path.service_lifecycle_constraints
      : Array.isArray(selectedWorkflow?.service_lifecycle_constraints)
        ? selectedWorkflow!.service_lifecycle_constraints!.slice(0, 16)
        : [];
    hints.push({
      hint_id: `workflow_reuse:${args.path.anchor_id}`,
      source_kind: "stable_workflow",
      hint_kind: "workflow_reuse",
      action: "reuse",
      source_anchor_id: args.path.anchor_id,
      source_anchor_level: "L2",
      selected_tool: selectedTool,
      task_family: firstString((args.path as Record<string, unknown>).task_family, selectedWorkflow?.task_family),
      workflow_signature: args.path.workflow_signature,
      file_path: args.path.file_path,
      target_files: args.path.target_files,
      workflow_steps: workflowSteps,
      pattern_hints: patternHints,
      service_lifecycle_constraints: serviceLifecycleConstraints,
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
      task_family: rehydrationHint.task_family ?? null,
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
  executionContract: ExecutionContractV1 | null;
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
  const targetFiles = Array.isArray(args.executionContract?.target_files) && args.executionContract.target_files.length > 0
    ? args.executionContract.target_files
    : args.path.target_files.length > 0
    ? args.path.target_files
    : args.derivedPolicy.target_files.length > 0
      ? args.derivedPolicy.target_files
      : args.derivedPolicy.file_path
        ? [args.derivedPolicy.file_path]
        : [];
  const activationMode =
    args.derivedPolicy.policy_state === "stable"
      && args.historyApplied
      && args.derivedPolicy.contract_trust === "authoritative"
      ? "default"
      : "hint";
  const pathWorkflowSteps = Array.isArray(args.path.workflow_steps) ? args.path.workflow_steps : [];
  const pathServiceLifecycleConstraints = Array.isArray(args.path.service_lifecycle_constraints)
    ? args.path.service_lifecycle_constraints
    : [];
  const workflowSteps = Array.isArray(args.executionContract?.workflow_steps) && args.executionContract.workflow_steps.length > 0
    ? args.executionContract.workflow_steps
    : pathWorkflowSteps.length > 0
    ? pathWorkflowSteps
    : Array.isArray(args.derivedPolicy.workflow_steps)
      ? args.derivedPolicy.workflow_steps
      : [];
  const patternHints = Array.isArray(args.executionContract?.pattern_hints) && args.executionContract.pattern_hints.length > 0
    ? args.executionContract.pattern_hints
    : Array.isArray(args.derivedPolicy.pattern_hints)
    ? args.derivedPolicy.pattern_hints
    : [];
  const serviceLifecycleConstraints = Array.isArray(args.executionContract?.service_lifecycle_constraints)
    && args.executionContract.service_lifecycle_constraints.length > 0
    ? args.executionContract.service_lifecycle_constraints
    : pathServiceLifecycleConstraints.length > 0
    ? pathServiceLifecycleConstraints
    : Array.isArray(args.derivedPolicy.service_lifecycle_constraints)
      ? args.derivedPolicy.service_lifecycle_constraints
      : [];
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
    contract_trust: args.derivedPolicy.contract_trust ?? "authoritative",
    policy_memory_state: "active",
    activation_mode: activationMode,
    materialization_state: "computed",
    history_applied: args.historyApplied,
    selected_tool: args.derivedPolicy.selected_tool,
    avoid_tools: avoidTools,
    task_family: firstString(args.executionContract?.task_family, (args.path as Record<string, unknown>).task_family, args.derivedPolicy.task_family),
    workflow_signature: firstString(args.executionContract?.workflow_signature, args.path.workflow_signature, args.derivedPolicy.workflow_signature),
    file_path: firstString(args.executionContract?.file_path, args.path.file_path, args.derivedPolicy.file_path),
    target_files: targetFiles,
    next_action: firstString(args.executionContract?.next_action, args.nextAction, args.path.next_action),
    ...(workflowSteps.length > 0 ? { workflow_steps: workflowSteps } : {}),
    ...(patternHints.length > 0 ? { pattern_hints: patternHints } : {}),
    ...(serviceLifecycleConstraints.length > 0 ? { service_lifecycle_constraints: serviceLifecycleConstraints } : {}),
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
  const actionRetrieval = buildActionRetrievalResponse({
    parsed: args.parsed,
    tools: args.tools,
    introspection: args.introspection,
  });
  const executionContract = parseExecutionContract(actionRetrieval.execution_contract_v1);
  const path = actionRetrieval.path;
  const selectedTool = actionRetrieval.selected_tool;
  const trustedPatterns = (Array.isArray(args.introspection.trusted_patterns) ? args.introspection.trusted_patterns : [])
    .map(toPolicyHintEntry)
    .filter((entry): entry is PolicyHintEntryLike => entry !== null);
  const preferredPattern = choosePreferredTrustedPattern({
    trustedPatterns,
    selectedTool,
    queryText: args.parsed.query_text,
    context: args.parsed.context,
  });
  const selectedWorkflow = findSelectedWorkflow({
    introspection: args.introspection,
    path,
  });
  const learningReason = [
    args.introspection.pattern_signal_summary.trusted_pattern_count > 0
      ? `trusted_patterns=${args.introspection.pattern_signal_summary.trusted_pattern_count}`
      : null,
    args.introspection.workflow_signal_summary.stable_workflow_count > 0
      ? `stable_workflows=${args.introspection.workflow_signal_summary.stable_workflow_count}`
      : null,
    firstString(actionRetrieval.rationale.summary),
    actionRetrieval.history_applied ? "history_applied=true" : "history_applied=false",
  ].filter(Boolean).join("; ");
  const combinedNextAction = actionRetrieval.recommended_next_action;
  const liveDerivedPolicy = buildDerivedPolicySurface({
    tools: args.tools,
    introspection: args.introspection,
    path,
    queryText: args.parsed.query_text,
    context: args.parsed.context,
    executionContract,
  });
  const policyHints = buildPolicyHintPack({
    tools: args.tools,
    introspection: args.introspection,
    path,
    queryText: args.parsed.query_text,
    context: args.parsed.context,
  });
  const persistedPolicy = readPersistedPolicyMemory({
    introspection: args.introspection,
    queryText: args.parsed.query_text,
    context: args.parsed.context,
    selectedTool,
    path,
    preferredPattern,
    selectedWorkflow,
  });
  const historyApplied = actionRetrieval.history_applied || !!persistedPolicy;
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
        executionContract,
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
    action_retrieval: actionRetrieval,
    execution_contract_v1: executionContract,
    recommendation: {
      history_applied: historyApplied,
      tool: actionRetrieval.tool,
      path: actionRetrieval.path,
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
        actionRetrieval.rationale.summary,
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
  const parsed = augmentTrajectoryAwareRequest({
    parsed: ExperienceIntelligenceRequest.parse(args.body),
    parse: ExperienceIntelligenceRequest.parse,
    defaultScope: args.defaultScope,
    defaultTenantId: args.defaultTenantId,
  }).parsed;
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
  const actionRetrieval = asRecord(experience.action_retrieval);
  const executionContract = parseExecutionContract(
    asRecord(experience)?.execution_contract_v1 ?? actionRetrieval?.execution_contract_v1,
  );
  const tool = asRecord(actionRetrieval?.tool ?? experience.recommendation?.tool);
  const path = asRecord(actionRetrieval?.path ?? experience.recommendation?.path);
  const policyContract = asRecord(experience.policy_contract);
  const pathTargetFiles = Array.isArray(path?.target_files) ? path.target_files : [];
  const policyTargetFiles = Array.isArray(policyContract?.target_files) ? policyContract.target_files : [];
  const kickoffRecommendation = buildKickoffRecommendationFromExperience({
    historyApplied: (
      (typeof actionRetrieval?.history_applied === "boolean" ? actionRetrieval.history_applied : undefined)
      ?? experience.recommendation?.history_applied
    ) === true,
    contractTrustHint:
      actionRetrieval?.contract_trust === "authoritative"
      || actionRetrieval?.contract_trust === "advisory"
      || actionRetrieval?.contract_trust === "observational"
        ? actionRetrieval.contract_trust
        : executionContract?.contract_trust
          ? executionContract.contract_trust
        : path?.contract_trust === "authoritative"
          || path?.contract_trust === "advisory"
          || path?.contract_trust === "observational"
          ? path.contract_trust
          : policyContract?.contract_trust === "authoritative"
            || policyContract?.contract_trust === "advisory"
            || policyContract?.contract_trust === "observational"
            ? policyContract.contract_trust
            : null,
    selectedTool: firstString(executionContract?.selected_tool, actionRetrieval?.selected_tool, tool?.selected_tool),
    taskFamily: firstString(executionContract?.task_family, path?.task_family, policyContract?.task_family),
    workflowSignature: firstString(executionContract?.workflow_signature, path?.workflow_signature, policyContract?.workflow_signature),
    policyMemoryId: firstString(executionContract?.policy_memory_id, policyContract?.policy_memory_id),
    filePath: firstString(
      executionContract?.file_path,
      actionRetrieval?.recommended_file_path,
      path?.file_path,
      policyContract?.file_path,
      typeof pathTargetFiles[0] === "string" ? pathTargetFiles[0] : null,
      typeof policyTargetFiles[0] === "string" ? policyTargetFiles[0] : null,
    ),
    nextAction: firstString(
      executionContract?.next_action,
      actionRetrieval?.recommended_next_action,
      experience.recommendation?.combined_next_action,
      policyContract?.next_action,
    ),
    executionContract,
    uncertainty:
      actionRetrieval?.uncertainty && typeof actionRetrieval.uncertainty === "object"
        ? (actionRetrieval.uncertainty as any)
        : null,
  });

  return KickoffRecommendationResponseSchema.parse({
    summary_version: "kickoff_recommendation_v1",
    tenant_id: experience.tenant_id,
    scope: experience.scope,
    query_text: experience.query_text,
    kickoff_recommendation: kickoffRecommendation,
    action_retrieval_uncertainty:
      actionRetrieval?.uncertainty && typeof actionRetrieval.uncertainty === "object"
        ? actionRetrieval.uncertainty
        : null,
    policy_contract: experience.policy_contract ?? null,
    rationale: {
      summary:
        typeof experience.rationale?.summary === "string"
          ? experience.rationale.summary
          : "",
    },
  });
}

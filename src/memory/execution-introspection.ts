import {
  buildExecutionMemorySummaryBundle,
  buildExecutionSummarySurface,
  summarizePatternSignalSurface,
  summarizeWorkflowMaintenanceSurface,
  summarizeWorkflowSignalSurface,
  summarizePatternMaintenanceSurface,
} from "../app/planning-summary.js";
import { listRecentDelegationRecordNodeRowsLite } from "./delegation-records-surface.js";
import {
  ExecutionMemoryIntrospectionRequest,
  type ExecutionMemoryIntrospectionResponse,
} from "./schemas.js";
import type { LiteExecutionNativeNodeRow, LiteWriteStore } from "../store/lite-write-store.js";
import { dedupeWorkflowCandidatesBySignature } from "./workflow-candidate-aggregation.js";
import { explainWorkflowProjectionForSourceNode } from "./workflow-write-projection.js";
import { isPatternSuppressed, readPatternOperatorOverride } from "./pattern-operator-override.js";

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

function toNodeUri(tenantId: string, scope: string, type: string, id: string): string {
  return `aionis://${tenantId}/${scope}/${type}/${id}`;
}

function dedupeByAnchorId<T extends { anchor_id?: string | null }>(items: T[]): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const anchorId = typeof item.anchor_id === "string" ? item.anchor_id.trim() : "";
    if (!anchorId || seen.has(anchorId)) continue;
    seen.add(anchorId);
    out.push(item);
  }
  return out;
}

function hasWorkflowProjectionMarker(slots: Record<string, unknown>): boolean {
  const projection = asRecord(slots.workflow_write_projection);
  return firstString(projection.generated_by) !== null;
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

function deriveWorkflowSourceKind(args: {
  anchor: Record<string, unknown>;
  workflowPromotion: Record<string, unknown>;
  executionKind: string | null;
}): string | null {
  const explicitSourceKind = firstString(args.anchor?.source && asRecord(args.anchor.source)?.source_kind);
  if (explicitSourceKind) return explicitSourceKind;
  const promotionOrigin = firstString(args.workflowPromotion?.promotion_origin);
  if (
    promotionOrigin === "replay_promote"
    || promotionOrigin === "replay_stable_normalization"
    || promotionOrigin === "replay_learning_episode"
    || promotionOrigin === "replay_learning_auto_promotion"
    || args.executionKind === "workflow_candidate"
    || args.executionKind === "workflow_anchor"
  ) {
    return "playbook";
  }
  return null;
}

function deriveWorkflowProjectionMeta(slots: Record<string, unknown>) {
  const projection = asRecord(slots.workflow_write_projection);
  const generatedBy = firstString(projection.generated_by);
  if (!generatedBy) return null;
  return {
    generated_by: generatedBy,
    source_node_id: firstString(projection.source_node_id),
    source_client_id: firstString(projection.source_client_id),
    generated_at: firstString(projection.generated_at),
    auto_promoted: projection.auto_promoted === true,
  };
}

function toWorkflowEntry(row: LiteExecutionNativeNodeRow, tenantId: string, scope: string) {
  const slots = asRecord(row.slots);
  const execution = asRecord(slots.execution_native_v1);
  const anchor = asRecord(slots.anchor_v1);
  const semanticForgetting = asRecord(slots.semantic_forgetting_v1);
  const archiveRelocation = asRecord(slots.archive_relocation_v1);
  const workflowPromotion = asRecord(execution.workflow_promotion ?? anchor.workflow_promotion);
  const maintenance = asRecord(execution.maintenance ?? anchor.maintenance);
  const rehydration = asRecord(execution.rehydration ?? anchor.rehydration);
  const distillation = asRecord(execution.distillation);
  const projectionMeta = deriveWorkflowProjectionMeta(slots);
  const slotTargetFiles = stringList(slots.target_files, 24);
  const executionTargetFiles = stringList(execution.target_files, 24);
  const anchorTargetFiles = stringList(anchor.target_files, 24);
  const targetFiles = Array.from(new Set([...executionTargetFiles, ...anchorTargetFiles, ...slotTargetFiles]));
  const filePath = firstString(execution.file_path, anchor.file_path, targetFiles[0] ?? null);
  const nextAction = firstString(execution.next_action, anchor.next_action);
  const observedCount = Number(workflowPromotion.observed_count ?? Number.NaN);
  const requiredObservations = Number(workflowPromotion.required_observations ?? Number.NaN);
  const promotionReady =
    firstString(workflowPromotion.promotion_state) === "candidate"
    && Number.isFinite(observedCount)
    && Number.isFinite(requiredObservations)
    && requiredObservations > 0
    && observedCount >= requiredObservations;
  return {
    anchor_id: row.id,
    uri: toNodeUri(tenantId, scope, row.type, row.id),
    type: row.type,
    title: firstString(row.title),
    summary: firstString(row.text_summary, anchor.summary),
    anchor_level: firstString(execution.anchor_level, anchor.anchor_level),
    source_kind: deriveWorkflowSourceKind({
      anchor,
      workflowPromotion,
      executionKind: firstString(execution.execution_kind),
    }),
    promotion_origin: firstString(workflowPromotion.promotion_origin),
    promotion_state: firstString(workflowPromotion.promotion_state),
    task_family: firstString(execution.task_family, anchor.task_family, slots.task_kind),
    observed_count: Number.isFinite(observedCount) ? observedCount : null,
    required_observations: Number.isFinite(requiredObservations) ? requiredObservations : null,
    promotion_ready: promotionReady,
    last_transition: firstString(workflowPromotion.last_transition),
    last_transition_at: firstString(workflowPromotion.last_transition_at),
    lifecycle_state: firstString(semanticForgetting.lifecycle_state, slots.lifecycle_state),
    semantic_forgetting_action: firstString(semanticForgetting.action),
    archive_relocation_state: firstString(archiveRelocation.relocation_state),
    archive_relocation_target: firstString(archiveRelocation.relocation_target),
    archive_payload_scope: firstString(archiveRelocation.payload_scope),
    rehydration_default_mode: firstString(rehydration.default_mode),
    tool_set: stringList(execution.tool_set, 16).length > 0 ? stringList(execution.tool_set, 16) : stringList(anchor.tool_set, 16),
    maintenance_state: firstString(maintenance.maintenance_state),
    offline_priority: firstString(maintenance.offline_priority),
    last_maintenance_at: firstString(maintenance.last_maintenance_at),
    workflow_signature: firstString(execution.workflow_signature, anchor.workflow_signature),
    task_signature: firstString(execution.task_signature, anchor.task_signature),
    file_path: filePath,
    target_files: targetFiles,
    next_action: nextAction,
    projection_generated_by: projectionMeta?.generated_by ?? null,
    projection_source_node_id: projectionMeta?.source_node_id ?? null,
    projection_source_client_id: projectionMeta?.source_client_id ?? null,
    projection_generated_at: projectionMeta?.generated_at ?? null,
    projection_auto_promoted: projectionMeta?.auto_promoted ?? false,
    distillation_origin: firstString(distillation.distillation_origin),
    preferred_promotion_target: firstString(distillation.preferred_promotion_target),
    confidence: row.confidence,
  };
}

function toPatternEntry(row: LiteExecutionNativeNodeRow, tenantId: string, scope: string) {
  const slots = asRecord(row.slots);
  const execution = asRecord(slots.execution_native_v1);
  const anchor = asRecord(slots.anchor_v1);
  const promotion = asRecord(execution.promotion ?? anchor.promotion);
  const trustHardening = asRecord(execution.trust_hardening ?? anchor.trust_hardening);
  const maintenance = asRecord(execution.maintenance ?? anchor.maintenance);
  const operatorOverride = readPatternOperatorOverride(slots);
  const suppressed = isPatternSuppressed(operatorOverride);
  const credibilityState = firstString(execution.credibility_state, anchor.credibility_state, promotion.credibility_state) ?? "candidate";
  const distinctRunCount = Number(promotion.distinct_run_count ?? Number.NaN);
  const requiredDistinctRuns = Number(promotion.required_distinct_runs ?? Number.NaN);
  const counterEvidenceCount = Number(promotion.counter_evidence_count ?? Number.NaN);
  const counterEvidenceOpen = promotion.counter_evidence_open === true;
  return {
    anchor_id: row.id,
    uri: toNodeUri(tenantId, scope, row.type, row.id),
    type: row.type,
    title: firstString(row.title),
    summary: firstString(row.text_summary, anchor.summary),
    anchor_level: firstString(execution.anchor_level, anchor.anchor_level),
    selected_tool: firstString(execution.selected_tool, anchor.selected_tool),
    task_family: firstString(execution.task_family, anchor.task_family),
    error_family: firstString(execution.error_family, anchor.error_family),
    pattern_state: firstString(execution.pattern_state, anchor.pattern_state) ?? "provisional",
    credibility_state: credibilityState,
    trusted: credibilityState === "trusted",
    operator_override_present: operatorOverride !== null,
    suppressed,
    suppression_mode: operatorOverride?.mode ?? null,
    suppression_reason: operatorOverride?.reason ?? null,
    suppressed_until: operatorOverride?.until ?? null,
    suppressed_by: operatorOverride?.updated_by ?? null,
    suppressed_at: operatorOverride?.updated_at ?? null,
    distinct_run_count: Number.isFinite(distinctRunCount) ? distinctRunCount : null,
    required_distinct_runs: Number.isFinite(requiredDistinctRuns) ? requiredDistinctRuns : null,
    trust_hardening: Object.keys(trustHardening).length > 0 ? trustHardening : null,
    counter_evidence_count: Number.isFinite(counterEvidenceCount) ? counterEvidenceCount : null,
    counter_evidence_open: counterEvidenceOpen,
    last_transition: firstString(promotion.last_transition),
    maintenance_state: firstString(maintenance.maintenance_state),
    offline_priority: firstString(maintenance.offline_priority),
    last_maintenance_at: firstString(maintenance.last_maintenance_at),
    confidence: row.confidence,
  };
}

function toPatternSignal(entry: ReturnType<typeof toPatternEntry>) {
  return {
    anchor_id: entry.anchor_id,
    anchor_level: entry.anchor_level,
    selected_tool: entry.selected_tool,
    task_family: entry.task_family,
    error_family: entry.error_family,
    pattern_state: entry.pattern_state,
    credibility_state: entry.credibility_state,
    trusted: entry.trusted,
    suppressed: entry.suppressed,
    suppression_mode: entry.suppression_mode,
    suppression_reason: entry.suppression_reason,
    suppressed_until: entry.suppressed_until,
    distinct_run_count: entry.distinct_run_count,
    required_distinct_runs: entry.required_distinct_runs,
    trust_hardening: entry.trust_hardening,
    counter_evidence_count: entry.counter_evidence_count,
    counter_evidence_open: entry.counter_evidence_open,
    last_transition: entry.last_transition,
    summary: entry.summary,
  };
}

function toWorkflowSignal(entry: ReturnType<typeof toWorkflowEntry>) {
  return {
    anchor_id: entry.anchor_id,
    anchor_level: entry.anchor_level,
    title: entry.title,
    summary: entry.summary,
    promotion_state: entry.promotion_state === "stable" ? "stable" : "candidate",
    promotion_ready: entry.promotion_ready,
    observed_count: entry.observed_count,
    required_observations: entry.required_observations,
    source_kind: entry.source_kind,
    promotion_origin: entry.promotion_origin,
    last_transition: entry.last_transition,
    maintenance_state: entry.maintenance_state,
    offline_priority: entry.offline_priority,
    last_maintenance_at: entry.last_maintenance_at,
  };
}

function toPolicyMemoryEntry(
  row: Awaited<ReturnType<LiteWriteStore["findNodes"]>>["rows"][number],
  tenantId: string,
  scope: string,
) {
  const slots = asRecord(row.slots);
  const contract = asRecord(slots.policy_contract_v1);
  const execution = asRecord(slots.execution_native_v1);
  const maintenance = asRecord(execution?.maintenance);
  const policyEvolution = asRecord(execution?.policy_evolution);
  return {
    kind: "policy_memory",
    summary_kind: "policy_memory",
    anchor_id: row.id,
    node_id: row.id,
    uri: toNodeUri(tenantId, scope, row.type, row.id),
    title: firstString(row.title),
    summary: firstString(row.text_summary),
    selected_tool: firstString(slots.selected_tool, contract?.selected_tool),
    workflow_signature: firstString(slots.workflow_signature, contract?.workflow_signature),
    file_path: firstString(slots.file_path, contract?.file_path),
    target_files: stringList(slots.target_files, 24),
    task_signature: firstString(slots.task_signature),
    error_signature: firstString(slots.error_signature),
    feedback_positive: Number.isFinite(Number(slots.feedback_positive)) ? Number(slots.feedback_positive) : null,
    feedback_negative: Number.isFinite(Number(slots.feedback_negative)) ? Number(slots.feedback_negative) : null,
    feedback_quality: Number.isFinite(Number(slots.feedback_quality)) ? Number(slots.feedback_quality) : null,
    last_feedback_at: firstString(slots.last_feedback_at),
    last_materialized_at: firstString(slots.last_materialized_at),
    policy_memory_state: firstString(slots.policy_memory_state, policyEvolution?.policy_memory_state, contract?.policy_memory_state),
    policy_state: firstString(policyEvolution?.policy_state, contract?.policy_state),
    policy_source_kind: firstString(policyEvolution?.policy_source_kind, contract?.source_kind),
    activation_mode: firstString(policyEvolution?.activation_mode, contract?.activation_mode),
    materialization_state: firstString(policyEvolution?.materialization_state, slots.materialization_state, contract?.materialization_state),
    maintenance_state: firstString(maintenance?.maintenance_state),
    offline_priority: firstString(maintenance?.offline_priority),
    last_maintenance_at: firstString(maintenance?.last_maintenance_at),
    last_transition: firstString(policyEvolution?.last_transition),
    policy_contract_v1: contract ?? null,
    derived_policy_v1: asRecord(slots.derived_policy_v1) ?? null,
    confidence: row.confidence,
  };
}

function toDistillationEntry(
  row: Awaited<ReturnType<LiteWriteStore["findNodes"]>>["rows"][number],
  tenantId: string,
  scope: string,
) {
  const slots = asRecord(row.slots);
  const execution = asRecord(slots.execution_native_v1);
  const distillation = asRecord(execution.distillation);
  const maintenance = asRecord(execution.maintenance);
  return {
    kind: firstString(execution.execution_kind, slots.summary_kind, row.type) ?? "unknown",
    summary_kind: firstString(slots.summary_kind),
    node_id: row.id,
    uri: toNodeUri(tenantId, scope, row.type, row.id),
    title: firstString(row.title),
    summary: firstString(row.text_summary),
    compression_layer: firstString(execution.compression_layer, slots.compression_layer),
    distillation_origin: firstString(distillation.distillation_origin),
    preferred_promotion_target: firstString(distillation.preferred_promotion_target),
    extraction_pattern: firstString(distillation.extraction_pattern),
    source_node_id: firstString(distillation.source_node_id, slots.source_node_id),
    source_evidence_node_id: firstString(distillation.source_evidence_node_id, slots.source_evidence_node_id),
    has_execution_signature: distillation.has_execution_signature === true,
    last_transition: firstString(distillation.last_transition),
    maintenance_state: firstString(maintenance.maintenance_state),
    offline_priority: firstString(maintenance.offline_priority),
    confidence: row.confidence,
  };
}

function toContinuityEntry(
  row: Awaited<ReturnType<LiteWriteStore["findNodes"]>>["rows"][number],
  tenantId: string,
  scope: string,
) {
  const slots = asRecord(row.slots);
  const execution = asRecord(slots.execution_native_v1);
  const summaryKind = firstString(execution.summary_kind, slots.summary_kind);
  return {
    kind: "continuity_carrier",
    summary_kind: summaryKind,
    execution_kind: firstString(execution.execution_kind),
    node_id: row.id,
    uri: toNodeUri(tenantId, scope, row.type, row.id),
    title: firstString(row.title),
    summary: firstString(row.text_summary),
    compression_layer: firstString(execution.compression_layer, slots.compression_layer),
    file_path: firstString(execution.file_path, slots.file_path),
    target_files: stringList(execution.target_files, 24),
    next_action: firstString(execution.next_action, slots.next_action),
    confidence: row.confidence,
  };
}

function buildDemoSurface(args: {
  workflowSignalSummary: ReturnType<typeof summarizeWorkflowSignalSurface>;
  patternSignalSummary: ReturnType<typeof summarizePatternSignalSurface>;
  workflowMaintenanceSummary: ReturnType<typeof summarizeWorkflowMaintenanceSurface>;
  patternMaintenanceSummary: ReturnType<typeof summarizePatternMaintenanceSurface>;
  recommendedWorkflows: Array<ReturnType<typeof toWorkflowEntry>>;
  candidateWorkflows: Array<ReturnType<typeof toWorkflowEntry>>;
  trustedPatterns: Array<ReturnType<typeof toPatternEntry>>;
  candidatePatterns: Array<ReturnType<typeof toPatternEntry>>;
  contestedPatterns: Array<ReturnType<typeof toPatternEntry>>;
}) {
  const workflowLines = [
    ...args.recommendedWorkflows.slice(0, 6).map((entry) => {
      const title = entry.title ?? entry.summary ?? entry.anchor_id;
      const tools = Array.isArray(entry.tool_set) && entry.tool_set.length > 0 ? `; tools=${entry.tool_set.join(", ")}` : "";
      const distillation = entry.distillation_origin
        ? `; distillation=${entry.distillation_origin}; target=${entry.preferred_promotion_target ?? "unknown"}`
        : "";
      const projection = entry.projection_generated_by
        ? `; projection=${entry.projection_generated_by}; source_node=${entry.projection_source_node_id ?? "unknown"}`
        : "";
      return `stable workflow: ${title}; source=${entry.source_kind ?? "unknown"}${distillation}${tools}${projection}; transition=${entry.last_transition ?? "unknown"}; maintenance=${entry.maintenance_state ?? "unknown"}`;
    }),
    ...args.candidateWorkflows.slice(0, 6).map((entry) => {
      const title = entry.title ?? entry.summary ?? entry.anchor_id;
      const observed = (
        Number.isFinite(entry.observed_count ?? Number.NaN)
        && Number.isFinite(entry.required_observations ?? Number.NaN)
      )
        ? `observed=${entry.observed_count}/${entry.required_observations}`
        : "observed=unknown";
      const source = entry.source_kind ? `; source=${entry.source_kind}` : "";
      const distillation = entry.distillation_origin
        ? `; distillation=${entry.distillation_origin}; target=${entry.preferred_promotion_target ?? "unknown"}`
        : "";
      const tools = Array.isArray(entry.tool_set) && entry.tool_set.length > 0 ? `; tools=${entry.tool_set.join(", ")}` : "";
      const projection = entry.projection_generated_by
        ? `; projection=${entry.projection_generated_by}; source_node=${entry.projection_source_node_id ?? "unknown"}`
        : "";
      return `candidate workflow: ${title}; ${observed}${source}${distillation}${tools}${projection}; promotion=${entry.promotion_ready ? "ready" : "observing"}; maintenance=${entry.maintenance_state ?? "unknown"}`;
    }),
  ];
  const patternLines = [
    ...args.trustedPatterns.slice(0, 6).map((entry) => `trusted pattern: prefer ${entry.selected_tool ?? "unknown"}; task_family=${entry.task_family ?? "unknown"}; summary=${entry.summary ?? entry.anchor_id}; maintenance=${entry.maintenance_state ?? "unknown"}${entry.suppressed ? `; suppressed=${entry.suppression_mode ?? "shadow_learn"}` : ""}`),
    ...args.candidatePatterns.slice(0, 6).map((entry) => `candidate pattern: prefer ${entry.selected_tool ?? "unknown"}; task_family=${entry.task_family ?? "unknown"}; summary=${entry.summary ?? entry.anchor_id}; maintenance=${entry.maintenance_state ?? "unknown"}${entry.suppressed ? `; suppressed=${entry.suppression_mode ?? "shadow_learn"}` : ""}`),
    ...args.contestedPatterns.slice(0, 6).map((entry) => `contested pattern: prefer ${entry.selected_tool ?? "unknown"}; task_family=${entry.task_family ?? "unknown"}; summary=${entry.summary ?? entry.anchor_id}; maintenance=${entry.maintenance_state ?? "unknown"}${entry.suppressed ? `; suppressed=${entry.suppression_mode ?? "shadow_learn"}` : ""}`),
  ];
  const maintenanceLines = [
    `workflow maintenance: retain=${args.workflowMaintenanceSummary.retain_count}; observe=${args.workflowMaintenanceSummary.observe_count}; promote_candidate=${args.workflowMaintenanceSummary.promote_candidate_count}`,
    `pattern maintenance: retain=${args.patternMaintenanceSummary.retain_count}; observe=${args.patternMaintenanceSummary.observe_count}; review=${args.patternMaintenanceSummary.review_count}; promote_candidate=${args.patternMaintenanceSummary.promote_candidate_count}`,
  ];
  const headline = [
    `stable workflows=${args.workflowSignalSummary.stable_workflow_count}`,
    `promotion-ready workflows=${args.workflowSignalSummary.promotion_ready_workflow_count}`,
    `trusted patterns=${args.patternSignalSummary.trusted_pattern_count}`,
    `contested patterns=${args.patternSignalSummary.contested_pattern_count}`,
  ].join("; ");
  const mergedText = [
    `# Execution Memory Demo`,
    headline,
    workflowLines.length > 0 ? `# Workflows\n${workflowLines.map((line) => `- ${line}`).join("\n")}` : "",
    patternLines.length > 0 ? `# Patterns\n${patternLines.map((line) => `- ${line}`).join("\n")}` : "",
    `# Maintenance\n${maintenanceLines.map((line) => `- ${line}`).join("\n")}`,
  ].filter(Boolean).join("\n");
  return {
    surface_version: "execution_memory_demo_v1" as const,
    headline,
    sections: {
      workflows: workflowLines,
      patterns: patternLines,
      maintenance: maintenanceLines,
    },
    merged_text: mergedText,
  };
}

export async function buildExecutionMemoryIntrospectionLite(
  liteWriteStore: LiteWriteStore,
  body: unknown,
  defaultScope: string,
  defaultTenantId: string,
  defaultActorId: string,
): Promise<ExecutionMemoryIntrospectionResponse> {
  const parsed = ExecutionMemoryIntrospectionRequest.parse(body);
  const scope = parsed.scope ?? defaultScope;
  const tenantId = parsed.tenant_id ?? defaultTenantId;
  const consumerAgentId = parsed.consumer_agent_id ?? defaultActorId;
  const consumerTeamId = parsed.consumer_team_id ?? null;
  const limit = parsed.limit;

  const [
    workflowAnchors,
    workflowCandidates,
    patternAnchors,
    recentSourceEvents,
    recentSessions,
    delegationRecordRows,
    policyMemoryNodes,
    distilledEvidenceNodes,
    distilledFactNodes,
  ] = await Promise.all([
    liteWriteStore.findExecutionNativeNodes({
      scope,
      executionKind: "workflow_anchor",
      consumerAgentId,
      consumerTeamId,
      limit,
      offset: 0,
    }),
    liteWriteStore.findExecutionNativeNodes({
      scope,
      executionKind: "workflow_candidate",
      consumerAgentId,
      consumerTeamId,
      limit,
      offset: 0,
    }),
    liteWriteStore.findExecutionNativeNodes({
      scope,
      executionKind: "pattern_anchor",
      consumerAgentId,
      consumerTeamId,
      limit,
      offset: 0,
    }),
    liteWriteStore.findNodes({
      scope,
      type: "event",
      consumerAgentId,
      consumerTeamId,
      limit: Math.max(limit * 4, 24),
      offset: 0,
    }),
    liteWriteStore.findNodes({
      scope,
      type: "topic",
      consumerAgentId,
      consumerTeamId,
      limit: Math.max(limit * 2, 12),
      offset: 0,
    }),
    listRecentDelegationRecordNodeRowsLite({
      liteWriteStore,
      scope,
      consumerAgentId,
      consumerTeamId,
      limit: Math.max(limit, 4),
    }),
    liteWriteStore.findNodes({
      scope,
      type: "concept",
      consumerAgentId,
      consumerTeamId,
      limit: Math.max(limit, 8),
      offset: 0,
      slotsContains: {
        summary_kind: "policy_memory",
      },
    }),
    liteWriteStore.findNodes({
      scope,
      type: "evidence",
      consumerAgentId,
      consumerTeamId,
      limit: Math.max(limit, 8),
      offset: 0,
      slotsContains: {
        summary_kind: "write_distillation_evidence",
      },
    }),
    liteWriteStore.findNodes({
      scope,
      type: "concept",
      consumerAgentId,
      consumerTeamId,
      limit: Math.max(limit, 8),
      offset: 0,
      slotsContains: {
        summary_kind: "write_distillation_fact",
      },
    }),
  ]);

  const recommendedWorkflows = dedupeByAnchorId(
    workflowAnchors.rows.map((row) => toWorkflowEntry(row, tenantId, scope)),
  );
  const stableWorkflowSignatures = new Set(
    recommendedWorkflows
      .map((entry) => entry.workflow_signature)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  const rawCandidateWorkflows = dedupeByAnchorId(
    workflowCandidates.rows.map((row) => toWorkflowEntry(row, tenantId, scope)),
  );
  const candidateWorkflows = dedupeWorkflowCandidatesBySignature(
    rawCandidateWorkflows.filter((entry) => !entry.workflow_signature || !stableWorkflowSignatures.has(entry.workflow_signature)),
  );
  const suppressedCandidateWorkflowCount = rawCandidateWorkflows.length - candidateWorkflows.length;
  const continuityProjectedCandidateCount = rawCandidateWorkflows.filter(
    (entry) => entry.projection_generated_by === "execution_write_projection_v1",
  ).length;
  const continuityAutoPromotedWorkflowCount = recommendedWorkflows.filter(
    (entry) => entry.projection_generated_by === "execution_write_projection_v1" || entry.promotion_origin === "execution_write_auto_promotion",
  ).length;

  const patternEntries = dedupeByAnchorId(
    patternAnchors.rows.map((row) => toPatternEntry(row, tenantId, scope)),
  );
  const candidatePatterns = patternEntries.filter((entry) => entry.credibility_state === "candidate");
  const trustedPatterns = patternEntries.filter((entry) => entry.credibility_state === "trusted");
  const contestedPatterns = patternEntries.filter((entry) => entry.credibility_state === "contested" || entry.counter_evidence_open === true);

  const rehydrationCandidates = recommendedWorkflows
    .filter((entry) => entry.rehydration_default_mode)
    .map((entry) => ({
      anchor_id: entry.anchor_id,
      anchor_uri: entry.uri,
      anchor_kind: "workflow",
      anchor_level: entry.anchor_level,
      title: entry.title,
      summary: entry.summary,
      mode: entry.rehydration_default_mode,
      payload_cost_hint: "medium",
      recommended_when: [],
      trusted: false,
      selected_tool: null,
      example_call: `rehydrate_payload(anchor_id='${entry.anchor_id}', mode='${entry.rehydration_default_mode}')`,
    }));
  const patternSignals = patternEntries.map((entry) => toPatternSignal(entry));
  const workflowSignals = [
    ...recommendedWorkflows.map((entry) => toWorkflowSignal(entry)),
    ...candidateWorkflows.map((entry) => toWorkflowSignal(entry)),
  ];
  const distillationKnowledge = [
    ...distilledEvidenceNodes.rows.map((row) => toDistillationEntry(row, tenantId, scope)),
    ...distilledFactNodes.rows.map((row) => toDistillationEntry(row, tenantId, scope)),
  ];
  const continuitySourceNodes = [
    ...recentSourceEvents.rows.filter((row) => !hasWorkflowProjectionMarker(asRecord(row.slots))),
    ...recentSessions.rows.filter((row) => {
      if (hasWorkflowProjectionMarker(asRecord(row.slots))) return false;
      return firstString(asRecord(row.slots)?.system_kind) === "session";
    }),
  ].slice(0, Math.max(limit * 2, 12));
  const continuityKnowledge = continuitySourceNodes
    .map((row) => toContinuityEntry(row, tenantId, scope))
    .filter((entry) => entry.summary_kind === "handoff" || entry.summary_kind === "session_event" || entry.summary_kind === "session");
  const supportingKnowledge = [
    ...continuityKnowledge,
    ...policyMemoryNodes.rows.map((row) => toPolicyMemoryEntry(row, tenantId, scope)),
    ...distillationKnowledge,
  ];
  const surface = {
    action_recall_packet: {
      packet_version: "action_recall_v1" as const,
      recommended_workflows: recommendedWorkflows,
      candidate_workflows: candidateWorkflows,
      candidate_patterns: candidatePatterns,
      trusted_patterns: trustedPatterns,
      contested_patterns: contestedPatterns,
      rehydration_candidates: rehydrationCandidates,
      supporting_knowledge: supportingKnowledge,
    },
    recommended_workflows: recommendedWorkflows,
    candidate_workflows: candidateWorkflows,
    candidate_patterns: candidatePatterns,
    trusted_patterns: trustedPatterns,
    contested_patterns: contestedPatterns,
    rehydration_candidates: rehydrationCandidates,
    supporting_knowledge: supportingKnowledge,
    pattern_signals: patternSignals,
    workflow_signals: workflowSignals,
  };
  const summaryBundle = buildExecutionMemorySummaryBundle(surface);
  const continuityProjectionSamples = await Promise.all(
    continuitySourceNodes.map(async (row) => {
      const explained = await explainWorkflowProjectionForSourceNode({
        scope,
        source: {
          id: row.id,
          client_id: row.client_id ?? undefined,
          scope,
          type: row.type,
          memory_lane: row.memory_lane,
          producer_agent_id: row.producer_agent_id ?? undefined,
          owner_agent_id: row.owner_agent_id ?? undefined,
          owner_team_id: row.owner_team_id ?? undefined,
          title: row.title ?? undefined,
          text_summary: row.text_summary ?? undefined,
          slots: asRecord(row.slots),
        },
        liteWriteStore,
      });
      return {
        source_node_id: row.id,
        source_client_id: row.client_id,
        title: firstString(row.title, row.text_summary),
        decision: explained.decision,
        workflow_signature: explained.workflowSignature,
        projection_client_id: explained.projectionClientId,
      };
    }),
  );
  const continuityDecisionCounts = {
    projected: continuityProjectionSamples.filter((sample) => sample.decision === "projected").length,
    skipped_missing_execution_continuity: continuityProjectionSamples.filter((sample) => sample.decision === "skipped_missing_execution_continuity").length,
    skipped_invalid_execution_state: continuityProjectionSamples.filter((sample) => sample.decision === "skipped_invalid_execution_state").length,
    skipped_invalid_execution_packet: continuityProjectionSamples.filter((sample) => sample.decision === "skipped_invalid_execution_packet").length,
    skipped_existing_workflow_memory: continuityProjectionSamples.filter((sample) => sample.decision === "skipped_existing_workflow_memory").length,
    skipped_stable_exists: continuityProjectionSamples.filter((sample) => sample.decision === "skipped_stable_exists").length,
    eligible_without_projection: continuityProjectionSamples.filter((sample) => sample.decision === "eligible_without_projection").length,
  };
  const demoSurface = buildDemoSurface({
    workflowSignalSummary: summaryBundle.workflow_signal_summary,
    patternSignalSummary: summaryBundle.pattern_signal_summary,
    workflowMaintenanceSummary: summaryBundle.workflow_maintenance_summary,
    patternMaintenanceSummary: summaryBundle.pattern_maintenance_summary,
    recommendedWorkflows,
    candidateWorkflows,
    trustedPatterns,
    candidatePatterns,
    contestedPatterns,
  });

  return {
    summary_version: "execution_memory_introspection_v1",
    tenant_id: tenantId,
    scope,
    inventory: {
      raw_workflow_anchor_count: workflowAnchors.rows.length,
      raw_workflow_candidate_count: rawCandidateWorkflows.length,
      suppressed_candidate_workflow_count: suppressedCandidateWorkflowCount,
      continuity_projected_candidate_count: continuityProjectedCandidateCount,
      continuity_auto_promoted_workflow_count: continuityAutoPromotedWorkflowCount,
      raw_pattern_anchor_count: patternAnchors.rows.length,
      raw_distilled_evidence_count: distilledEvidenceNodes.rows.length,
      raw_distilled_fact_count: distilledFactNodes.rows.length,
    },
    continuity_projection_report: {
      sampled_source_event_count: continuityProjectionSamples.length,
      decision_counts: continuityDecisionCounts,
      samples: continuityProjectionSamples.slice(0, Math.max(Math.min(limit, 8), 4)),
    },
    demo_surface: demoSurface,
    execution_summary: buildExecutionSummarySurface({
      planner_packet: null,
      surface,
      packet_assembly: null,
      tools: null,
      cost_signals: null,
      delegation_records: delegationRecordRows,
    }),
    recommended_workflows: recommendedWorkflows,
    candidate_workflows: candidateWorkflows,
    candidate_patterns: candidatePatterns,
    trusted_patterns: trustedPatterns,
    contested_patterns: contestedPatterns,
    rehydration_candidates: rehydrationCandidates,
    supporting_knowledge: supportingKnowledge,
    pattern_signals: patternSignals,
    workflow_signals: workflowSignals,
    ...summaryBundle,
  };
}

import { pickPreferredDelegationRecordsSummary } from "../memory/delegation-records-surface.js";

export type PlanningSummary = {
  summary_version: "planning_summary_v1";
  planner_explanation: string | null;
  first_step_recommendation: FirstStepRecommendation | null;
  selected_tool: string | null;
  decision_id: string | null;
  rules_considered: number;
  rules_matched: number;
  context_est_tokens: number;
  layered_output: boolean;
  forgotten_items: number;
  static_blocks_selected: number;
  selected_memory_layers: string[];
  optimization_profile: "balanced" | "aggressive" | null;
  context_compaction_profile: "balanced" | "aggressive";
  recall_mode?: string | null;
  trusted_pattern_count: number;
  contested_pattern_count: number;
  trusted_pattern_tools: string[];
  contested_pattern_tools: string[];
  workflow_signal_summary: WorkflowSignalSummary;
  action_packet_summary: ActionPacketSummary;
  workflow_lifecycle_summary: WorkflowLifecycleSummary;
  workflow_maintenance_summary: WorkflowMaintenanceSummary;
  distillation_signal_summary: DistillationSignalSummary;
  pattern_lifecycle_summary: PatternLifecycleSummary;
  pattern_maintenance_summary: PatternMaintenanceSummary;
  policy_lifecycle_summary: PolicyLifecycleSummary;
  policy_maintenance_summary: PolicyMaintenanceSummary;
  primary_savings_levers: string[];
};

export type AssemblySummary = {
  summary_version: "assembly_summary_v1";
  planner_explanation: string | null;
  first_step_recommendation: FirstStepRecommendation | null;
  selected_tool: string | null;
  decision_id: string | null;
  rules_considered: number;
  rules_matched: number;
  include_rules: boolean;
  context_est_tokens: number;
  layered_output: boolean;
  forgotten_items: number;
  static_blocks_selected: number;
  selected_memory_layers: string[];
  optimization_profile: "balanced" | "aggressive" | null;
  context_compaction_profile: "balanced" | "aggressive";
  recall_mode?: string | null;
  trusted_pattern_count: number;
  contested_pattern_count: number;
  trusted_pattern_tools: string[];
  contested_pattern_tools: string[];
  workflow_signal_summary: WorkflowSignalSummary;
  action_packet_summary: ActionPacketSummary;
  workflow_lifecycle_summary: WorkflowLifecycleSummary;
  workflow_maintenance_summary: WorkflowMaintenanceSummary;
  distillation_signal_summary: DistillationSignalSummary;
  pattern_lifecycle_summary: PatternLifecycleSummary;
  pattern_maintenance_summary: PatternMaintenanceSummary;
  policy_lifecycle_summary: PolicyLifecycleSummary;
  policy_maintenance_summary: PolicyMaintenanceSummary;
  primary_savings_levers: string[];
};

export type FirstStepRecommendation = {
  source_kind: "experience_intelligence" | "tool_selection";
  history_applied: boolean;
  selected_tool: string | null;
  file_path: string | null;
  next_action: string | null;
};

export type KickoffRecommendation = {
  source_kind: "experience_intelligence" | "tool_selection";
  history_applied: boolean;
  selected_tool: string | null;
  file_path: string | null;
  next_action: string | null;
};

type ExperienceRecommendationProjection = {
  history_applied: boolean;
  selected_tool: string | null;
  path_source_kind: "recommended_workflow" | "candidate_workflow" | "none";
  file_path: string | null;
  combined_next_action: string | null;
};

type PatternSignalSummary = {
  candidate_pattern_count: number;
  candidate_pattern_tools: string[];
  trusted_pattern_count: number;
  contested_pattern_count: number;
  trusted_pattern_tools: string[];
  contested_pattern_tools: string[];
};

export type WorkflowSignalSummary = {
  stable_workflow_count: number;
  promotion_ready_workflow_count: number;
  observing_workflow_count: number;
  stable_workflow_titles: string[];
  promotion_ready_workflow_titles: string[];
  observing_workflow_titles: string[];
};

type PlannerPacketSummarySurface = {
  action_recall_packet?: unknown;
  pattern_signals?: unknown;
  workflow_signals?: unknown;
  recommended_workflows?: unknown;
  candidate_workflows?: unknown;
  candidate_patterns?: unknown;
  trusted_patterns?: unknown;
  contested_patterns?: unknown;
  rehydration_candidates?: unknown;
  supporting_knowledge?: unknown;
};

export type PatternLifecycleSummary = {
  candidate_count: number;
  trusted_count: number;
  contested_count: number;
  near_promotion_count: number;
  counter_evidence_open_count: number;
  transition_counts: {
    candidate_observed: number;
    promoted_to_trusted: number;
    counter_evidence_opened: number;
    revalidated_to_trusted: number;
  };
};

export type PatternMaintenanceSummary = {
  model: "lazy_online_v1";
  observe_count: number;
  retain_count: number;
  review_count: number;
  promote_candidate_count: number;
  review_counter_evidence_count: number;
  retain_trusted_count: number;
};

export type WorkflowLifecycleSummary = {
  candidate_count: number;
  stable_count: number;
  replay_source_count: number;
  rehydration_ready_count: number;
  promotion_ready_count: number;
  transition_counts: {
    candidate_observed: number;
    promoted_to_stable: number;
    normalized_latest_stable: number;
  };
};

export type WorkflowMaintenanceSummary = {
  model: "lazy_online_v1";
  observe_count: number;
  retain_count: number;
  promote_candidate_count: number;
  retain_workflow_count: number;
};

export type DistillationSignalSummary = {
  distilled_evidence_count: number;
  distilled_fact_count: number;
  projected_workflow_candidate_count: number;
  origin_counts: {
    write_distillation_input_text: number;
    write_distillation_event_node: number;
    write_distillation_evidence_node: number;
    execution_write_projection: number;
    replay_learning_episode: number;
  };
  promotion_target_counts: {
    workflow: number;
    pattern: number;
    policy: number;
  };
};

export type PolicyLifecycleSummary = {
  persisted_count: number;
  active_count: number;
  contested_count: number;
  retired_count: number;
  default_mode_count: number;
  hint_mode_count: number;
  stable_policy_count: number;
  transition_counts: {
    materialized: number;
    refreshed: number;
    contested_by_feedback: number;
    retired_by_feedback: number;
    retired_by_governance: number;
    reactivated_by_governance: number;
  };
};

export type PolicyMaintenanceSummary = {
  model: "lazy_online_v1";
  observe_count: number;
  retain_count: number;
  review_count: number;
  promote_to_default_count: number;
  retain_active_policy_count: number;
  review_contested_policy_count: number;
  retire_policy_count: number;
  reactivate_policy_count: number;
};

export type ActionPacketSummary = {
  recommended_workflow_count: number;
  candidate_workflow_count: number;
  candidate_pattern_count: number;
  trusted_pattern_count: number;
  contested_pattern_count: number;
  rehydration_candidate_count: number;
  supporting_knowledge_count: number;
  workflow_anchor_ids: string[];
  candidate_workflow_anchor_ids: string[];
  candidate_pattern_anchor_ids: string[];
  trusted_pattern_anchor_ids: string[];
  contested_pattern_anchor_ids: string[];
  rehydration_anchor_ids: string[];
};

export type ExecutionMemorySummaryBundle = {
  pattern_signal_summary: PatternSignalSummary;
  workflow_signal_summary: WorkflowSignalSummary;
  workflow_lifecycle_summary: WorkflowLifecycleSummary;
  workflow_maintenance_summary: WorkflowMaintenanceSummary;
  distillation_signal_summary: DistillationSignalSummary;
  pattern_lifecycle_summary: PatternLifecycleSummary;
  pattern_maintenance_summary: PatternMaintenanceSummary;
  policy_lifecycle_summary: PolicyLifecycleSummary;
  policy_maintenance_summary: PolicyMaintenanceSummary;
  action_packet_summary: ActionPacketSummary;
};

export type ExecutionPacketAssemblySummary = {
  packet_source_mode: string | null;
  state_first_assembly: boolean | null;
  execution_packet_v1_present: boolean | null;
  execution_state_v1_present: boolean | null;
};

export type ExecutionStrategySummary = {
  summary_version: "execution_strategy_summary_v1";
  trust_signal: string;
  strategy_profile: string;
  validation_style: string;
  task_family: string | null;
  family_scope: string;
  family_candidate_count: number;
  selected_working_set: string[];
  selected_validation_paths: string[];
  selected_pattern_summaries: string[];
  preferred_artifact_refs: string[];
  explanation: string;
};

export type ExecutionCollaborationSummary = {
  summary_version: "execution_collaboration_summary_v1";
  packet_present: boolean;
  coordination_mode: string;
  current_stage: string | null;
  active_role: string | null;
  next_action: string | null;
  target_file_count: number;
  pending_validation_count: number;
  unresolved_blocker_count: number;
  review_contract_present: boolean;
  review_standard: string | null;
  acceptance_check_count: number;
  rollback_required: boolean;
  resume_anchor_present: boolean;
  resume_anchor_file_path: string | null;
  resume_anchor_symbol: string | null;
  artifact_ref_count: number;
  evidence_ref_count: number;
  side_output_artifact_count: number;
  side_output_evidence_count: number;
  artifact_refs: string[];
  evidence_refs: string[];
};

export type ExecutionContinuitySnapshotSummary = {
  summary_version: "execution_continuity_snapshot_v1";
  snapshot_mode: "memory_only" | "packet_backed";
  coordination_mode: string;
  trust_signal: string;
  strategy_profile: string;
  validation_style: string;
  task_family: string | null;
  family_scope: string;
  selected_tool: string | null;
  current_stage: string | null;
  active_role: string | null;
  next_action: string | null;
  working_set: string[];
  validation_paths: string[];
  selected_pattern_summaries: string[];
  preferred_artifact_refs: string[];
  preferred_evidence_refs: string[];
  reviewer_ready: boolean;
  resume_anchor_file_path: string | null;
  selected_memory_layers: string[];
  recommended_action: string;
};

export type ExecutionForgettingSummary = {
  summary_version: "execution_forgetting_summary_v1";
  substrate_mode: "stable" | "suppression_present" | "forgetting_active";
  forgotten_items: number;
  forgotten_by_reason: Record<string, number>;
  primary_forgetting_reason: string | null;
  suppressed_pattern_count: number;
  suppressed_pattern_anchor_ids: string[];
  suppressed_pattern_sources: string[];
  selected_memory_layers: string[];
  primary_savings_levers: string[];
  stale_signal_count: number;
  recommended_action: string;
};

export type ExecutionCollaborationRoutingSummary = {
  summary_version: "execution_collaboration_routing_v1";
  route_mode: "memory_only" | "packet_backed";
  coordination_mode: string;
  route_intent: string;
  task_brief: string | null;
  current_stage: string | null;
  active_role: string | null;
  selected_tool: string | null;
  task_family: string | null;
  family_scope: string;
  next_action: string | null;
  target_files: string[];
  validation_paths: string[];
  unresolved_blockers: string[];
  hard_constraints: string[];
  review_standard: string | null;
  required_outputs: string[];
  acceptance_checks: string[];
  preferred_artifact_refs: string[];
  preferred_evidence_refs: string[];
  routing_drivers: string[];
};

export type ExecutionDelegationPacketRecord = {
  version: 1;
  role: string;
  mission: string;
  working_set: string[];
  acceptance_checks: string[];
  output_contract: string;
  preferred_artifact_refs: string[];
  inherited_evidence: string[];
  routing_reason: string;
  task_family: string | null;
  family_scope: string;
  source_mode: "memory_only" | "packet_backed";
};

export type ExecutionDelegationReturnRecord = {
  version: 1;
  role: string;
  status: string;
  summary: string;
  evidence: string[];
  working_set: string[];
  acceptance_checks: string[];
  source_mode: "memory_only" | "packet_backed";
};

export type ExecutionArtifactRoutingRecord = {
  version: 1;
  ref: string;
  ref_kind: "artifact" | "evidence";
  route_role: string;
  route_intent: string;
  route_mode: "memory_only" | "packet_backed";
  task_family: string | null;
  family_scope: string;
  routing_reason: string;
  source: "strategy_summary" | "execution_packet" | "collaboration_summary";
};

export type ExecutionDelegationRecordsSummary = {
  summary_version: "execution_delegation_records_v1";
  record_mode: "memory_only" | "packet_backed";
  route_role: string;
  packet_count: number;
  return_count: number;
  artifact_routing_count: number;
  missing_record_types: string[];
  delegation_packets: ExecutionDelegationPacketRecord[];
  delegation_returns: ExecutionDelegationReturnRecord[];
  artifact_routing_records: ExecutionArtifactRoutingRecord[];
};

export type ExecutionRoutingSignalSummary = {
  summary_version: "execution_routing_summary_v1";
  selected_tool: string | null;
  task_family: string | null;
  family_scope: string;
  stable_workflow_anchor_ids: string[];
  candidate_workflow_anchor_ids: string[];
  rehydration_anchor_ids: string[];
  workflow_source_kinds: string[];
  same_family_rehydration_anchor_ids: string[];
  other_family_rehydration_anchor_ids: string[];
  unknown_family_rehydration_anchor_ids: string[];
};

export type ExecutionMaintenanceSummary = {
  summary_version: "execution_maintenance_summary_v1";
  forgotten_items: number;
  forgotten_by_reason: Record<string, number>;
  suppressed_pattern_count: number;
  stable_workflow_count: number;
  promotion_ready_workflow_count: number;
  selected_memory_layers: string[];
  primary_savings_levers: string[];
  recommended_action: string;
};

export type ExecutionInstrumentationSummary = {
  summary_version: "execution_instrumentation_summary_v1";
  task_family: string | null;
  family_scope: string;
  family_hit: boolean;
  family_reason: string;
  selected_pattern_hit_count: number;
  selected_pattern_miss_count: number;
  rehydration_candidate_count: number;
  known_family_rehydration_count: number;
  same_family_rehydration_count: number;
  other_family_rehydration_count: number;
  unknown_family_rehydration_count: number;
  rehydration_family_hit_rate: number;
  same_family_rehydration_anchor_ids: string[];
  other_family_rehydration_anchor_ids: string[];
};

export type ExecutionSummary = ExecutionMemorySummaryBundle & {
  summary_version: "execution_summary_v1";
  planner_packet: unknown | null;
  pattern_signals: unknown[];
  workflow_signals: unknown[];
  packet_assembly: ExecutionPacketAssemblySummary;
  strategy_summary: ExecutionStrategySummary;
  collaboration_summary: ExecutionCollaborationSummary;
  continuity_snapshot_summary: ExecutionContinuitySnapshotSummary;
  routing_signal_summary: ExecutionRoutingSignalSummary;
  maintenance_summary: ExecutionMaintenanceSummary;
  forgetting_summary: ExecutionForgettingSummary;
  collaboration_routing_summary: ExecutionCollaborationRoutingSummary;
  delegation_records_summary: ExecutionDelegationRecordsSummary;
  instrumentation_summary: ExecutionInstrumentationSummary;
};

function uniqueStrings(values: unknown[], limit = 16): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const next = typeof value === "string" ? value.trim() : "";
    if (!next || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
    if (out.length >= limit) break;
  }
  return out;
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function safeRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object" && !Array.isArray(entry))
    : [];
}

function summarizePacketEntryLabels(entries: Array<Record<string, unknown>>, field: "title" | "summary", limit = 3): string[] {
  return uniqueStrings(
    entries.map((entry) => {
      const primary = typeof entry[field] === "string" ? entry[field] : "";
      const fallback = typeof entry.title === "string" ? entry.title : typeof entry.summary === "string" ? entry.summary : "";
      return (primary || fallback).trim();
    }),
    limit,
  );
}

function collectTaskFamilyCounts(surface: PlannerPacketSummarySurface): Map<string, number> {
  const counts = new Map<string, number>();
  for (const source of [
    safeRecordArray(surface.trusted_patterns),
    safeRecordArray(surface.candidate_patterns),
    safeRecordArray(surface.contested_patterns),
    safeRecordArray(surface.recommended_workflows),
    safeRecordArray(surface.candidate_workflows),
    safeRecordArray(surface.rehydration_candidates),
  ]) {
    for (const entry of source) {
      const taskFamily = typeof entry.task_family === "string" ? entry.task_family.trim() : "";
      if (!taskFamily) continue;
      counts.set(taskFamily, (counts.get(taskFamily) ?? 0) + 1);
    }
  }
  return counts;
}

function dominantTaskFamily(surface: PlannerPacketSummarySurface): string | null {
  const counts = collectTaskFamilyCounts(surface);
  const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return ranked[0]?.[0] ?? null;
}

function affinityRank(value: string): number {
  if (value === "exact_task_signature") return 4;
  if (value === "same_task_family") return 3;
  if (value === "same_error_family") return 2;
  if (value === "broader_similarity") return 1;
  return 0;
}

function familyReason(scope: string): string {
  if (scope === "exact_task_signature") return "exact task signature matched prior successful work";
  if (scope === "same_task_family") return "same task family matched prior successful work";
  if (scope === "same_error_family") return "same error family matched prior recovery or validation work";
  return "broader similarity was the strongest reusable provenance signal";
}

function familyCandidateCount(surface: PlannerPacketSummarySurface, taskFamily: string | null): number {
  if (!taskFamily) return 0;
  return collectTaskFamilyCounts(surface).get(taskFamily) ?? 0;
}

function summarizeStrategyPatternSelections(args: {
  surface: PlannerPacketSummarySurface;
  tools?: unknown;
}): string[] {
  const trustedPatterns = safeRecordArray(args.surface.trusted_patterns);
  const tools = args.tools && typeof args.tools === "object" ? (args.tools as Record<string, unknown>) : {};
  const decision = tools.decision && typeof tools.decision === "object" ? (tools.decision as Record<string, unknown>) : {};
  const patternSummary =
    decision.pattern_summary && typeof decision.pattern_summary === "object"
      ? (decision.pattern_summary as Record<string, unknown>)
      : {};
  const selectedAnchorIds = new Set(safeStringArray(patternSummary.used_trusted_pattern_anchor_ids));
  const preferredTrustedPatterns =
    selectedAnchorIds.size > 0
      ? trustedPatterns.filter((entry) => typeof entry.anchor_id === "string" && selectedAnchorIds.has(entry.anchor_id))
      : trustedPatterns;
  return uniqueStrings(
    preferredTrustedPatterns.map((entry) => {
      const selectedTool = typeof entry.selected_tool === "string" ? entry.selected_tool.trim() : "";
      const summary = typeof entry.summary === "string" ? entry.summary.trim() : "";
      if (selectedTool && summary) return `[${selectedTool}] ${summary}`;
      return summary || selectedTool || (typeof entry.anchor_id === "string" ? entry.anchor_id : "");
    }),
    4,
  );
}

function collectStrategyPreferredArtifactRefs(surface: PlannerPacketSummarySurface): string[] {
  return uniqueStrings([
    ...safeRecordArray(surface.recommended_workflows).map((entry) => {
      if (typeof entry.anchor_uri === "string" && entry.anchor_uri.trim()) return entry.anchor_uri.trim();
      if (typeof entry.uri === "string" && entry.uri.trim()) return entry.uri.trim();
      if (typeof entry.anchor_id === "string" && entry.anchor_id.trim()) return `anchor:${entry.anchor_id.trim()}`;
      return "";
    }),
    ...safeRecordArray(surface.rehydration_candidates).map((entry) => {
      if (typeof entry.anchor_uri === "string" && entry.anchor_uri.trim()) return entry.anchor_uri.trim();
      if (typeof entry.anchor_id === "string" && entry.anchor_id.trim()) return `anchor:${entry.anchor_id.trim()}`;
      return "";
    }),
  ], 6);
}

function buildStrategyWorkingSet(args: {
  summaryBundle: ExecutionMemorySummaryBundle;
  tools?: unknown;
  costSignals?: unknown;
}): string[] {
  const tools = args.tools && typeof args.tools === "object" ? (args.tools as Record<string, unknown>) : {};
  const selection = tools.selection && typeof tools.selection === "object" ? (tools.selection as Record<string, unknown>) : {};
  const selectedTool = typeof selection.selected === "string" ? selection.selected.trim() : "";
  const costSignals = args.costSignals && typeof args.costSignals === "object" ? (args.costSignals as Record<string, unknown>) : {};
  return uniqueStrings([
    selectedTool ? `tool:${selectedTool}` : "",
    ...safeStringArray(costSignals.selected_memory_layers).map((layer) => `memory:${layer}`),
    ...args.summaryBundle.workflow_signal_summary.stable_workflow_titles.map((title) => `workflow:${title}`),
    ...args.summaryBundle.workflow_signal_summary.promotion_ready_workflow_titles.map((title) => `candidate:${title}`),
    ...args.summaryBundle.pattern_signal_summary.trusted_pattern_tools.map((tool) => `pattern:${tool}`),
  ], 8);
}

function buildStrategyValidationPaths(args: {
  summaryBundle: ExecutionMemorySummaryBundle;
  tools?: unknown;
}): string[] {
  const tools = args.tools && typeof args.tools === "object" ? (args.tools as Record<string, unknown>) : {};
  const selection = tools.selection && typeof tools.selection === "object" ? (tools.selection as Record<string, unknown>) : {};
  const selectedTool = typeof selection.selected === "string" ? selection.selected.trim() : "";
  const out: string[] = [];
  if (args.summaryBundle.action_packet_summary.rehydration_candidate_count > 0) {
    out.push("rehydrate a stable workflow before widening recall");
  }
  if (args.summaryBundle.workflow_signal_summary.promotion_ready_workflow_count > 0) {
    out.push("validate promotion-ready workflows before promoting broader reuse");
  }
  if (args.summaryBundle.pattern_signal_summary.contested_pattern_count > 0) {
    out.push("review contested patterns before broader tool exploration");
  }
  if (selectedTool) {
    out.push(`confirm ${selectedTool} on a narrow slice before expanding scope`);
  } else if (args.summaryBundle.pattern_signal_summary.trusted_pattern_count > 0) {
    out.push("reuse trusted patterns on the current slice before expanding scope");
  }
  if (out.length === 0) {
    out.push("probe a narrow task slice, then expand only after the first success signal");
  }
  return uniqueStrings(out, 4);
}

function buildExecutionStrategyProfile(args: {
  summaryBundle: ExecutionMemorySummaryBundle;
  familyScope: string;
}): string {
  if (
    args.summaryBundle.workflow_signal_summary.stable_workflow_count > 0
    && args.summaryBundle.action_packet_summary.rehydration_candidate_count > 0
  ) {
    return "rehydration_first";
  }
  if (args.summaryBundle.workflow_signal_summary.stable_workflow_count > 0) {
    return "workflow_reuse_first";
  }
  if (args.summaryBundle.pattern_signal_summary.trusted_pattern_count > 0) {
    return "pattern_reuse_first";
  }
  if (args.familyScope !== "broader_similarity") {
    return "guided_reuse";
  }
  return "broad_discovery";
}

function buildExecutionValidationStyle(summaryBundle: ExecutionMemorySummaryBundle): string {
  if (summaryBundle.pattern_signal_summary.contested_pattern_count > 0) {
    return "validate_before_expansion";
  }
  if (summaryBundle.workflow_signal_summary.promotion_ready_workflow_count > 0) {
    return "candidate_promotion_validation";
  }
  if (
    summaryBundle.workflow_signal_summary.stable_workflow_count > 0
    || summaryBundle.pattern_signal_summary.trusted_pattern_count > 0
  ) {
    return "reuse_then_validate";
  }
  return "targeted_then_expand";
}

function buildExecutionStrategyExplanation(args: {
  taskFamily: string | null;
  familyScope: string;
  strategyProfile: string;
  validationStyle: string;
  familyCandidateCount: number;
}): string {
  const profileExplanation =
    args.strategyProfile === "rehydration_first"
      ? "stable workflow rehydration should happen before broader recall"
      : args.strategyProfile === "workflow_reuse_first"
        ? "stable workflows are strong enough to lead the next execution"
        : args.strategyProfile === "pattern_reuse_first"
          ? "trusted tool-selection patterns are the strongest reusable signal"
          : args.strategyProfile === "guided_reuse"
            ? "family-level provenance is strong enough to scope the next attempt"
            : "no strong reuse signal is available, so discovery stays broad";
  const validationExplanation =
    args.validationStyle === "validate_before_expansion"
      ? "contested signals should be checked before widening scope"
      : args.validationStyle === "candidate_promotion_validation"
        ? "promotion-ready workflows should be validated before broadening reuse"
        : args.validationStyle === "reuse_then_validate"
          ? "trusted reusable guidance should be applied first, then validated on-slice"
          : "the first narrow success should define whether to widen recall";
  const familyDetail =
    args.taskFamily && args.familyCandidateCount > 0
      ? ` ${args.familyCandidateCount} surfaced anchors matched ${args.taskFamily}.`
      : "";
  return `Selected because ${familyReason(args.familyScope)}. ${profileExplanation}; ${validationExplanation}.${familyDetail}`.trim();
}

function buildExecutionStrategySummary(args: {
  surface: PlannerPacketSummarySurface;
  summaryBundle: ExecutionMemorySummaryBundle;
  tools?: unknown;
  costSignals?: unknown;
}): ExecutionStrategySummary {
  const taskFamily = dominantTaskFamily(args.surface);
  const familyScope = dominantFamilyScope({ tools: args.tools, surface: args.surface });
  const strategyProfile = buildExecutionStrategyProfile({
    summaryBundle: args.summaryBundle,
    familyScope,
  });
  const validationStyle = buildExecutionValidationStyle(args.summaryBundle);
  const candidateCount = familyCandidateCount(args.surface, taskFamily);
  return {
    summary_version: "execution_strategy_summary_v1",
    trust_signal: familyScope,
    strategy_profile: strategyProfile,
    validation_style: validationStyle,
    task_family: taskFamily,
    family_scope: familyScope,
    family_candidate_count: candidateCount,
    selected_working_set: buildStrategyWorkingSet({
      summaryBundle: args.summaryBundle,
      tools: args.tools,
      costSignals: args.costSignals,
    }),
    selected_validation_paths: buildStrategyValidationPaths({
      summaryBundle: args.summaryBundle,
      tools: args.tools,
    }),
    selected_pattern_summaries: summarizeStrategyPatternSelections({
      surface: args.surface,
      tools: args.tools,
    }),
    preferred_artifact_refs: collectStrategyPreferredArtifactRefs(args.surface),
    explanation: buildExecutionStrategyExplanation({
      taskFamily,
      familyScope,
      strategyProfile,
      validationStyle,
      familyCandidateCount: candidateCount,
    }),
  };
}

function buildExecutionCollaborationMode(args: {
  packetPresent: boolean;
  reviewContractPresent: boolean;
  resumeAnchorPresent: boolean;
  artifactRefCount: number;
  evidenceRefCount: number;
  sideOutputArtifactCount: number;
  sideOutputEvidenceCount: number;
}): string {
  if (args.reviewContractPresent) return "reviewer_ready";
  if (
    args.resumeAnchorPresent
    && (args.artifactRefCount > 0 || args.evidenceRefCount > 0 || args.sideOutputArtifactCount > 0 || args.sideOutputEvidenceCount > 0)
  ) {
    return "resume_with_artifacts";
  }
  if (args.resumeAnchorPresent) return "resume_ready";
  if (args.artifactRefCount > 0 || args.evidenceRefCount > 0 || args.sideOutputArtifactCount > 0 || args.sideOutputEvidenceCount > 0) {
    return "artifact_backed";
  }
  if (args.packetPresent) return "solo_packet";
  return "memory_only";
}

function buildExecutionCollaborationSummary(args: {
  executionPacket?: unknown;
  executionArtifacts?: unknown;
  executionEvidence?: unknown;
}): ExecutionCollaborationSummary {
  const packet =
    args.executionPacket && typeof args.executionPacket === "object" && !Array.isArray(args.executionPacket)
      ? (args.executionPacket as Record<string, unknown>)
      : null;
  const reviewContract =
    packet?.review_contract && typeof packet.review_contract === "object" && !Array.isArray(packet.review_contract)
      ? (packet.review_contract as Record<string, unknown>)
      : null;
  const resumeAnchor =
    packet?.resume_anchor && typeof packet.resume_anchor === "object" && !Array.isArray(packet.resume_anchor)
      ? (packet.resume_anchor as Record<string, unknown>)
      : null;
  const artifactRefs = safeStringArray(packet?.artifact_refs);
  const evidenceRefs = safeStringArray(packet?.evidence_refs);
  const sideOutputArtifacts = safeRecordArray(args.executionArtifacts);
  const sideOutputEvidence = safeRecordArray(args.executionEvidence);
  const packetPresent = !!packet;
  const reviewContractPresent = !!reviewContract;
  const resumeAnchorPresent = !!resumeAnchor;
  return {
    summary_version: "execution_collaboration_summary_v1",
    packet_present: packetPresent,
    coordination_mode: buildExecutionCollaborationMode({
      packetPresent,
      reviewContractPresent,
      resumeAnchorPresent,
      artifactRefCount: artifactRefs.length,
      evidenceRefCount: evidenceRefs.length,
      sideOutputArtifactCount: sideOutputArtifacts.length,
      sideOutputEvidenceCount: sideOutputEvidence.length,
    }),
    current_stage: typeof packet?.current_stage === "string" ? packet.current_stage : null,
    active_role: typeof packet?.active_role === "string" ? packet.active_role : null,
    next_action: typeof packet?.next_action === "string" ? packet.next_action : null,
    target_file_count: safeStringArray(packet?.target_files).length,
    pending_validation_count: safeStringArray(packet?.pending_validations).length,
    unresolved_blocker_count: safeStringArray(packet?.unresolved_blockers).length,
    review_contract_present: reviewContractPresent,
    review_standard: typeof reviewContract?.standard === "string" ? reviewContract.standard : null,
    acceptance_check_count: safeStringArray(reviewContract?.acceptance_checks).length,
    rollback_required: reviewContract?.rollback_required === true,
    resume_anchor_present: resumeAnchorPresent,
    resume_anchor_file_path: typeof resumeAnchor?.file_path === "string" ? resumeAnchor.file_path : null,
    resume_anchor_symbol: typeof resumeAnchor?.symbol === "string" ? resumeAnchor.symbol : null,
    artifact_ref_count: artifactRefs.length,
    evidence_ref_count: evidenceRefs.length,
    side_output_artifact_count: sideOutputArtifacts.length,
    side_output_evidence_count: sideOutputEvidence.length,
    artifact_refs: artifactRefs.slice(0, 6),
    evidence_refs: evidenceRefs.slice(0, 6),
  };
}

function buildExecutionContinuitySnapshotSummary(args: {
  strategySummary: ExecutionStrategySummary;
  collaborationSummary: ExecutionCollaborationSummary;
  routingSummary: ExecutionRoutingSignalSummary;
  maintenanceSummary: ExecutionMaintenanceSummary;
}): ExecutionContinuitySnapshotSummary {
  const nextAction =
    args.collaborationSummary.next_action
    ?? args.strategySummary.selected_validation_paths[0]
    ?? (args.routingSummary.selected_tool ? `Start with ${args.routingSummary.selected_tool} as the next step.` : null);
  return {
    summary_version: "execution_continuity_snapshot_v1",
    snapshot_mode: args.collaborationSummary.packet_present ? "packet_backed" : "memory_only",
    coordination_mode: args.collaborationSummary.coordination_mode,
    trust_signal: args.strategySummary.trust_signal,
    strategy_profile: args.strategySummary.strategy_profile,
    validation_style: args.strategySummary.validation_style,
    task_family: args.strategySummary.task_family,
    family_scope: args.strategySummary.family_scope,
    selected_tool: args.routingSummary.selected_tool,
    current_stage: args.collaborationSummary.current_stage,
    active_role: args.collaborationSummary.active_role,
    next_action: nextAction,
    working_set: uniqueStrings([
      ...args.strategySummary.selected_working_set,
      args.collaborationSummary.resume_anchor_file_path ? `resume:${args.collaborationSummary.resume_anchor_file_path}` : "",
    ], 8),
    validation_paths: uniqueStrings(args.strategySummary.selected_validation_paths, 4),
    selected_pattern_summaries: uniqueStrings(args.strategySummary.selected_pattern_summaries, 4),
    preferred_artifact_refs: uniqueStrings([
      ...args.strategySummary.preferred_artifact_refs,
      ...args.collaborationSummary.artifact_refs,
    ], 6),
    preferred_evidence_refs: uniqueStrings(args.collaborationSummary.evidence_refs, 6),
    reviewer_ready: args.collaborationSummary.review_contract_present,
    resume_anchor_file_path: args.collaborationSummary.resume_anchor_file_path,
    selected_memory_layers: uniqueStrings(args.maintenanceSummary.selected_memory_layers, 6),
    recommended_action: args.maintenanceSummary.recommended_action,
  };
}

function deriveExecutionRouteIntent(args: {
  collaborationSummary: ExecutionCollaborationSummary;
  strategySummary: ExecutionStrategySummary;
  routingSummary: ExecutionRoutingSignalSummary;
}): string {
  if (args.collaborationSummary.active_role && args.collaborationSummary.active_role !== "orchestrator") {
    return args.collaborationSummary.active_role;
  }
  if (args.collaborationSummary.current_stage) {
    return args.collaborationSummary.current_stage;
  }
  if (args.collaborationSummary.review_contract_present) return "review";
  if (args.collaborationSummary.resume_anchor_present) return "resume";
  if (
    args.routingSummary.selected_tool
    || args.strategySummary.selected_validation_paths.length > 0
    || args.strategySummary.selected_working_set.length > 0
  ) {
    return "memory_guided";
  }
  return "observe";
}

function buildExecutionCollaborationRoutingSummary(args: {
  executionPacket?: unknown;
  strategySummary: ExecutionStrategySummary;
  collaborationSummary: ExecutionCollaborationSummary;
  routingSummary: ExecutionRoutingSignalSummary;
}): ExecutionCollaborationRoutingSummary {
  const packet =
    args.executionPacket && typeof args.executionPacket === "object" && !Array.isArray(args.executionPacket)
      ? (args.executionPacket as Record<string, unknown>)
      : null;
  const reviewContract =
    packet?.review_contract && typeof packet.review_contract === "object" && !Array.isArray(packet.review_contract)
      ? (packet.review_contract as Record<string, unknown>)
      : null;
  const targetFiles = uniqueStrings([
    ...safeStringArray(packet?.target_files),
    args.collaborationSummary.resume_anchor_file_path ?? "",
  ], 8);
  const validationPaths = uniqueStrings([
    ...safeStringArray(packet?.pending_validations),
    ...args.strategySummary.selected_validation_paths,
  ], 6);
  const unresolvedBlockers = uniqueStrings(safeStringArray(packet?.unresolved_blockers), 4);
  const hardConstraints = uniqueStrings(safeStringArray(packet?.hard_constraints), 4);
  const requiredOutputs = uniqueStrings(safeStringArray(reviewContract?.required_outputs), 4);
  const acceptanceChecks = uniqueStrings(safeStringArray(reviewContract?.acceptance_checks), 6);
  const preferredArtifactRefs = uniqueStrings([
    ...args.strategySummary.preferred_artifact_refs,
    ...args.collaborationSummary.artifact_refs,
  ], 6);
  const preferredEvidenceRefs = uniqueStrings(args.collaborationSummary.evidence_refs, 6);
  return {
    summary_version: "execution_collaboration_routing_v1",
    route_mode: args.collaborationSummary.packet_present ? "packet_backed" : "memory_only",
    coordination_mode: args.collaborationSummary.coordination_mode,
    route_intent: deriveExecutionRouteIntent({
      collaborationSummary: args.collaborationSummary,
      strategySummary: args.strategySummary,
      routingSummary: args.routingSummary,
    }),
    task_brief: typeof packet?.task_brief === "string" ? packet.task_brief : null,
    current_stage: args.collaborationSummary.current_stage,
    active_role: args.collaborationSummary.active_role,
    selected_tool: args.routingSummary.selected_tool,
    task_family: args.routingSummary.task_family,
    family_scope: args.routingSummary.family_scope,
    next_action:
      args.collaborationSummary.next_action
      ?? args.strategySummary.selected_validation_paths[0]
      ?? null,
    target_files: targetFiles,
    validation_paths: validationPaths,
    unresolved_blockers: unresolvedBlockers,
    hard_constraints: hardConstraints,
    review_standard: args.collaborationSummary.review_standard,
    required_outputs: requiredOutputs,
    acceptance_checks: acceptanceChecks,
    preferred_artifact_refs: preferredArtifactRefs,
    preferred_evidence_refs: preferredEvidenceRefs,
    routing_drivers: uniqueStrings([
      args.collaborationSummary.review_contract_present ? "review_contract" : "",
      args.collaborationSummary.rollback_required ? "rollback_required" : "",
      args.collaborationSummary.resume_anchor_present ? "resume_anchor" : "",
      targetFiles.length > 0 ? "target_files" : "",
      validationPaths.length > 0 ? "validation_paths" : "",
      unresolvedBlockers.length > 0 ? "unresolved_blockers" : "",
      hardConstraints.length > 0 ? "hard_constraints" : "",
      preferredArtifactRefs.length > 0 ? "artifact_preference" : "",
      preferredEvidenceRefs.length > 0 ? "evidence_preference" : "",
      args.routingSummary.selected_tool ? `selected_tool:${args.routingSummary.selected_tool}` : "",
      args.routingSummary.task_family ? `task_family:${args.routingSummary.task_family}` : "",
      `family_scope:${args.routingSummary.family_scope}`,
      args.routingSummary.stable_workflow_anchor_ids.length > 0 ? "stable_workflow_available" : "",
      args.routingSummary.rehydration_anchor_ids.length > 0 ? "rehydration_candidate_available" : "",
    ], 12),
  };
}

function deriveExecutionRouteRole(summary: ExecutionCollaborationRoutingSummary): string {
  if (summary.active_role) return summary.active_role;
  if (summary.route_intent === "memory_guided") return "orchestrator";
  return summary.route_intent;
}

function buildExecutionDelegationMission(args: {
  routingSummary: ExecutionCollaborationRoutingSummary;
  routeRole: string;
}): string {
  const brief = args.routingSummary.task_brief?.trim() ?? "";
  const nextAction = args.routingSummary.next_action?.trim() ?? "";
  if (brief && nextAction) return `${brief} Next action: ${nextAction}`;
  if (brief) return brief;
  if (nextAction) return nextAction;
  return `Advance the ${args.routeRole} route for the current execution slice.`;
}

function buildExecutionDelegationOutputContract(args: {
  routingSummary: ExecutionCollaborationRoutingSummary;
  routeRole: string;
}): string {
  if (args.routingSummary.review_standard) {
    return `Satisfy ${args.routingSummary.review_standard} and return the required outputs with exact validation status.`;
  }
  if (args.routingSummary.route_intent === "resume") {
    return "Return resumed working set, current blockers, and the next validation step.";
  }
  if (args.routingSummary.route_intent === "review") {
    return "Return review findings, exact checks run, and any blocking risks before acceptance.";
  }
  if (args.routingSummary.selected_tool) {
    return `Return progress on the ${args.routingSummary.selected_tool} slice, touched files, and the next narrow validation step.`;
  }
  return `Return progress, routed artifacts, and the next step for the ${args.routeRole} route.`;
}

function buildExecutionDelegationPacketRecord(args: {
  routingSummary: ExecutionCollaborationRoutingSummary;
  strategySummary: ExecutionStrategySummary;
}): ExecutionDelegationPacketRecord {
  const routeRole = deriveExecutionRouteRole(args.routingSummary);
  return {
    version: 1,
    role: routeRole,
    mission: buildExecutionDelegationMission({
      routingSummary: args.routingSummary,
      routeRole,
    }),
    working_set: uniqueStrings([
      ...args.routingSummary.target_files,
      ...args.strategySummary.selected_working_set,
    ], 8),
    acceptance_checks: uniqueStrings([
      ...args.routingSummary.acceptance_checks,
      ...args.routingSummary.validation_paths,
    ], 6),
    output_contract: buildExecutionDelegationOutputContract({
      routingSummary: args.routingSummary,
      routeRole,
    }),
    preferred_artifact_refs: uniqueStrings(args.routingSummary.preferred_artifact_refs, 6),
    inherited_evidence: uniqueStrings(args.routingSummary.preferred_evidence_refs, 6),
    routing_reason: args.routingSummary.routing_drivers.slice(0, 4).join("; ") || "current execution route",
    task_family: args.routingSummary.task_family,
    family_scope: args.routingSummary.family_scope,
    source_mode: args.routingSummary.route_mode,
  };
}

function buildExecutionArtifactRoutingRecords(args: {
  routingSummary: ExecutionCollaborationRoutingSummary;
  strategySummary: ExecutionStrategySummary;
  collaborationSummary: ExecutionCollaborationSummary;
}): ExecutionArtifactRoutingRecord[] {
  const routeRole = deriveExecutionRouteRole(args.routingSummary);
  const records: ExecutionArtifactRoutingRecord[] = [];
  for (const ref of args.routingSummary.preferred_artifact_refs) {
    const source: ExecutionArtifactRoutingRecord["source"] = args.collaborationSummary.artifact_refs.includes(ref)
      ? "execution_packet"
      : args.strategySummary.preferred_artifact_refs.includes(ref)
        ? "strategy_summary"
        : "collaboration_summary";
    records.push({
      version: 1,
      ref,
      ref_kind: "artifact",
      route_role: routeRole,
      route_intent: args.routingSummary.route_intent,
      route_mode: args.routingSummary.route_mode,
      task_family: args.routingSummary.task_family,
      family_scope: args.routingSummary.family_scope,
      routing_reason:
        source === "execution_packet"
          ? "artifact routed from the active execution packet"
          : "artifact preferred by the current execution strategy",
      source,
    });
  }
  for (const ref of args.routingSummary.preferred_evidence_refs) {
    records.push({
      version: 1,
      ref,
      ref_kind: "evidence",
      route_role: routeRole,
      route_intent: args.routingSummary.route_intent,
      route_mode: args.routingSummary.route_mode,
      task_family: args.routingSummary.task_family,
      family_scope: args.routingSummary.family_scope,
      routing_reason: "evidence inherited from the active execution packet",
      source: "execution_packet",
    });
  }
  return records;
}

function buildExecutionDelegationRecordsSummary(args: {
  strategySummary: ExecutionStrategySummary;
  collaborationSummary: ExecutionCollaborationSummary;
  collaborationRoutingSummary: ExecutionCollaborationRoutingSummary;
}): ExecutionDelegationRecordsSummary {
  const delegationPackets = [buildExecutionDelegationPacketRecord({
    routingSummary: args.collaborationRoutingSummary,
    strategySummary: args.strategySummary,
  })];
  const delegationReturns: ExecutionDelegationReturnRecord[] = [];
  const artifactRoutingRecords = buildExecutionArtifactRoutingRecords({
    routingSummary: args.collaborationRoutingSummary,
    strategySummary: args.strategySummary,
    collaborationSummary: args.collaborationSummary,
  });
  return {
    summary_version: "execution_delegation_records_v1",
    record_mode: args.collaborationRoutingSummary.route_mode,
    route_role: deriveExecutionRouteRole(args.collaborationRoutingSummary),
    packet_count: delegationPackets.length,
    return_count: delegationReturns.length,
    artifact_routing_count: artifactRoutingRecords.length,
    missing_record_types: ["delegation_returns"],
    delegation_packets: delegationPackets,
    delegation_returns: delegationReturns,
    artifact_routing_records: artifactRoutingRecords,
  };
}

function normalizeForgettingSignals(costSignals: unknown) {
  const signals = costSignals && typeof costSignals === "object" ? (costSignals as Record<string, unknown>) : {};
  const forgottenItems = Number.isFinite(Number(signals.forgotten_items))
    ? Math.max(0, Math.trunc(Number(signals.forgotten_items)))
    : 0;
  const forgottenByReason =
    signals.forgotten_by_reason && typeof signals.forgotten_by_reason === "object" && !Array.isArray(signals.forgotten_by_reason)
      ? Object.fromEntries(
          Object.entries(signals.forgotten_by_reason as Record<string, unknown>)
            .map(([key, value]) => [key, Number(value)])
            .filter(([, value]) => Number.isFinite(value) && Number(value) > 0),
        )
      : {};
  return {
    forgottenItems,
    forgottenByReason,
    primaryForgettingReason:
      Object.entries(forgottenByReason).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null,
    selectedMemoryLayers: safeStringArray(signals.selected_memory_layers),
    primarySavingsLevers: safeStringArray(signals.primary_savings_levers),
  };
}

function collectSuppressedPatternSignals(args: {
  surface: PlannerPacketSummarySurface;
  tools?: unknown;
}) {
  const tools = args.tools && typeof args.tools === "object" ? (args.tools as Record<string, unknown>) : {};
  const decision = tools.decision && typeof tools.decision === "object" ? (tools.decision as Record<string, unknown>) : {};
  const patternSummary =
    decision.pattern_summary && typeof decision.pattern_summary === "object"
      ? (decision.pattern_summary as Record<string, unknown>)
      : {};
  const suppressedPatternAnchorIdsFromTools = safeStringArray(patternSummary.skipped_suppressed_pattern_anchor_ids);
  const suppressedPatternAnchorIdsFromSurface: string[] = [];
  const suppressedPatternSources: string[] = [];
  let suppressedEntryCount = 0;
  for (const [source, entries] of [
    ["trusted_patterns", safeRecordArray(args.surface.trusted_patterns)],
    ["candidate_patterns", safeRecordArray(args.surface.candidate_patterns)],
    ["contested_patterns", safeRecordArray(args.surface.contested_patterns)],
  ] as const) {
    for (const entry of entries) {
      if (entry.suppressed !== true) continue;
      suppressedEntryCount += 1;
      suppressedPatternSources.push(source);
      if (typeof entry.anchor_id === "string" && entry.anchor_id.trim()) {
        suppressedPatternAnchorIdsFromSurface.push(entry.anchor_id.trim());
      }
    }
  }
  const suppressedPatternAnchorIds = uniqueStrings([
    ...suppressedPatternAnchorIdsFromSurface,
    ...suppressedPatternAnchorIdsFromTools,
  ], 8);
  return {
    suppressedPatternCount: Math.max(
      suppressedEntryCount,
      suppressedPatternAnchorIds.length,
      suppressedPatternAnchorIdsFromTools.length,
    ),
    suppressedPatternAnchorIds,
    suppressedPatternSources: uniqueStrings([
      ...suppressedPatternSources,
      suppressedPatternAnchorIdsFromTools.length > 0 ? "tool_decision" : "",
    ], 4),
  };
}

function deriveExecutionMaintenanceAction(args: {
  forgottenItems: number;
  suppressedPatternCount: number;
  summaryBundle: ExecutionMemorySummaryBundle;
}): string {
  let recommendedAction = "continue observing new executions and keep the current context shape stable";
  if (args.forgottenItems > 0) {
    recommendedAction = "avoid reseeding forgotten context and keep the working set narrow";
  } else if (args.summaryBundle.policy_lifecycle_summary.retired_count > 0) {
    recommendedAction = "refresh or replace retired policy memory before trusting default tool selection";
  } else if (args.summaryBundle.policy_lifecycle_summary.contested_count > 0) {
    recommendedAction = "re-validate contested policy memory before defaulting to the prior tool path";
  } else if (args.suppressedPatternCount > 0) {
    recommendedAction = "prefer trusted workflows before reintroducing suppressed patterns";
  } else if (args.summaryBundle.workflow_signal_summary.promotion_ready_workflow_count > 0) {
    recommendedAction = "promote or reuse promotion-ready workflows before widening recall";
  } else if (args.summaryBundle.workflow_signal_summary.stable_workflow_count > 0) {
    recommendedAction = "reuse stable workflows before broader exploration";
  } else if (args.summaryBundle.pattern_signal_summary.trusted_pattern_count > 0) {
    recommendedAction = "reuse trusted patterns before broad tool exploration";
  }
  return recommendedAction;
}

function dominantFamilyScope(args: {
  tools?: unknown;
  surface: PlannerPacketSummarySurface;
}): string {
  const tools = args.tools && typeof args.tools === "object" ? (args.tools as Record<string, unknown>) : {};
  const decision = tools.decision && typeof tools.decision === "object" ? (tools.decision as Record<string, unknown>) : {};
  const patternSummary =
    decision.pattern_summary && typeof decision.pattern_summary === "object"
      ? (decision.pattern_summary as Record<string, unknown>)
      : {};
  const candidates = [
    ...safeStringArray(patternSummary.used_trusted_pattern_affinity_levels),
    ...safeStringArray(patternSummary.skipped_contested_pattern_affinity_levels),
    ...safeStringArray(patternSummary.skipped_suppressed_pattern_affinity_levels),
    ...safeRecordArray(tools.pattern_matches && typeof tools.pattern_matches === "object" ? (tools.pattern_matches as Record<string, unknown>).anchors : [])
      .map((entry) => (typeof entry.affinity_level === "string" ? entry.affinity_level.trim() : ""))
      .filter(Boolean),
  ];
  return candidates.sort((a, b) => affinityRank(b) - affinityRank(a))[0] ?? "broader_similarity";
}

function rehydrationFamilyBuckets(args: {
  surface: PlannerPacketSummarySurface;
  taskFamily: string | null;
}) {
  const entries = safeRecordArray(args.surface.rehydration_candidates);
  const sameFamily: string[] = [];
  const otherFamily: string[] = [];
  const unknownFamily: string[] = [];
  for (const entry of entries) {
    const anchorId = typeof entry.anchor_id === "string" ? entry.anchor_id.trim() : "";
    if (!anchorId) continue;
    const entryTaskFamily = typeof entry.task_family === "string" ? entry.task_family.trim() : "";
    if (!entryTaskFamily) {
      unknownFamily.push(anchorId);
      continue;
    }
    if (args.taskFamily && entryTaskFamily === args.taskFamily) {
      sameFamily.push(anchorId);
    } else {
      otherFamily.push(anchorId);
    }
  }
  return { sameFamily, otherFamily, unknownFamily };
}

function buildExecutionRoutingSignalSummary(args: {
  surface: PlannerPacketSummarySurface;
  summaryBundle: ExecutionMemorySummaryBundle;
  tools?: unknown;
}): ExecutionRoutingSignalSummary {
  const taskFamily = dominantTaskFamily(args.surface);
  const familyScope = dominantFamilyScope({ tools: args.tools, surface: args.surface });
  const tools = args.tools && typeof args.tools === "object" ? (args.tools as Record<string, unknown>) : {};
  const selection = tools.selection && typeof tools.selection === "object" ? (tools.selection as Record<string, unknown>) : {};
  const selectedTool = typeof selection.selected === "string" ? selection.selected : null;
  const recommended = safeRecordArray(args.surface.recommended_workflows);
  const candidate = safeRecordArray(args.surface.candidate_workflows);
  const workflowSourceKinds = uniqueStrings([
    ...recommended.map((entry) => entry.source_kind),
    ...candidate.map((entry) => entry.source_kind),
  ]);
  const buckets = rehydrationFamilyBuckets({ surface: args.surface, taskFamily });
  return {
    summary_version: "execution_routing_summary_v1",
    selected_tool: selectedTool,
    task_family: taskFamily,
    family_scope: familyScope,
    stable_workflow_anchor_ids: args.summaryBundle.action_packet_summary.workflow_anchor_ids,
    candidate_workflow_anchor_ids: args.summaryBundle.action_packet_summary.candidate_workflow_anchor_ids,
    rehydration_anchor_ids: args.summaryBundle.action_packet_summary.rehydration_anchor_ids,
    workflow_source_kinds: workflowSourceKinds,
    same_family_rehydration_anchor_ids: buckets.sameFamily,
    other_family_rehydration_anchor_ids: buckets.otherFamily,
    unknown_family_rehydration_anchor_ids: buckets.unknownFamily,
  };
}

function buildExecutionMaintenanceSummary(args: {
  surface: PlannerPacketSummarySurface;
  summaryBundle: ExecutionMemorySummaryBundle;
  costSignals?: unknown;
  tools?: unknown;
}): ExecutionMaintenanceSummary {
  const forgettingSignals = normalizeForgettingSignals(args.costSignals);
  const suppressedPatternSignals = collectSuppressedPatternSignals({
    surface: args.surface,
    tools: args.tools,
  });
  const recommendedAction = deriveExecutionMaintenanceAction({
    forgottenItems: forgettingSignals.forgottenItems,
    suppressedPatternCount: suppressedPatternSignals.suppressedPatternCount,
    summaryBundle: args.summaryBundle,
  });
  return {
    summary_version: "execution_maintenance_summary_v1",
    forgotten_items: forgettingSignals.forgottenItems,
    forgotten_by_reason: forgettingSignals.forgottenByReason,
    suppressed_pattern_count: suppressedPatternSignals.suppressedPatternCount,
    stable_workflow_count: args.summaryBundle.workflow_signal_summary.stable_workflow_count,
    promotion_ready_workflow_count: args.summaryBundle.workflow_signal_summary.promotion_ready_workflow_count,
    selected_memory_layers: forgettingSignals.selectedMemoryLayers,
    primary_savings_levers: forgettingSignals.primarySavingsLevers,
    recommended_action: recommendedAction,
  };
}

function buildExecutionForgettingSummary(args: {
  surface: PlannerPacketSummarySurface;
  summaryBundle: ExecutionMemorySummaryBundle;
  costSignals?: unknown;
  tools?: unknown;
}): ExecutionForgettingSummary {
  const forgettingSignals = normalizeForgettingSignals(args.costSignals);
  const suppressedPatternSignals = collectSuppressedPatternSignals({
    surface: args.surface,
    tools: args.tools,
  });
  return {
    summary_version: "execution_forgetting_summary_v1",
    substrate_mode:
      forgettingSignals.forgottenItems > 0
        ? "forgetting_active"
        : suppressedPatternSignals.suppressedPatternCount > 0
          ? "suppression_present"
          : "stable",
    forgotten_items: forgettingSignals.forgottenItems,
    forgotten_by_reason: forgettingSignals.forgottenByReason,
    primary_forgetting_reason: forgettingSignals.primaryForgettingReason,
    suppressed_pattern_count: suppressedPatternSignals.suppressedPatternCount,
    suppressed_pattern_anchor_ids: suppressedPatternSignals.suppressedPatternAnchorIds,
    suppressed_pattern_sources: suppressedPatternSignals.suppressedPatternSources,
    selected_memory_layers: forgettingSignals.selectedMemoryLayers,
    primary_savings_levers: forgettingSignals.primarySavingsLevers,
    stale_signal_count: forgettingSignals.forgottenItems + suppressedPatternSignals.suppressedPatternCount,
    recommended_action: deriveExecutionMaintenanceAction({
      forgottenItems: forgettingSignals.forgottenItems,
      suppressedPatternCount: suppressedPatternSignals.suppressedPatternCount,
      summaryBundle: args.summaryBundle,
    }),
  };
}

function buildExecutionInstrumentationSummary(args: {
  surface: PlannerPacketSummarySurface;
  summaryBundle: ExecutionMemorySummaryBundle;
  tools?: unknown;
}): ExecutionInstrumentationSummary {
  const tools = args.tools && typeof args.tools === "object" ? (args.tools as Record<string, unknown>) : {};
  const decision = tools.decision && typeof tools.decision === "object" ? (tools.decision as Record<string, unknown>) : {};
  const patternSummary =
    decision.pattern_summary && typeof decision.pattern_summary === "object"
      ? (decision.pattern_summary as Record<string, unknown>)
      : {};
  const familyScope = dominantFamilyScope({ tools: args.tools, surface: args.surface });
  const taskFamily = dominantTaskFamily(args.surface);
  const usedTrustedPatternAnchorIds = safeStringArray(patternSummary.used_trusted_pattern_anchor_ids);
  const skippedContestedPatternAnchorIds = safeStringArray(patternSummary.skipped_contested_pattern_anchor_ids);
  const skippedSuppressedPatternAnchorIds = safeStringArray(patternSummary.skipped_suppressed_pattern_anchor_ids);
  const buckets = rehydrationFamilyBuckets({ surface: args.surface, taskFamily });
  const knownCount = buckets.sameFamily.length + buckets.otherFamily.length;
  const totalRehydration = args.summaryBundle.action_packet_summary.rehydration_candidate_count;
  return {
    summary_version: "execution_instrumentation_summary_v1",
    task_family: taskFamily,
    family_scope: familyScope,
    family_hit: familyScope !== "broader_similarity" || usedTrustedPatternAnchorIds.length > 0,
    family_reason: familyReason(familyScope),
    selected_pattern_hit_count: usedTrustedPatternAnchorIds.length,
    selected_pattern_miss_count: skippedContestedPatternAnchorIds.length + skippedSuppressedPatternAnchorIds.length,
    rehydration_candidate_count: totalRehydration,
    known_family_rehydration_count: knownCount,
    same_family_rehydration_count: buckets.sameFamily.length,
    other_family_rehydration_count: buckets.otherFamily.length,
    unknown_family_rehydration_count: buckets.unknownFamily.length,
    rehydration_family_hit_rate: totalRehydration > 0 ? buckets.sameFamily.length / totalRehydration : 0,
    same_family_rehydration_anchor_ids: buckets.sameFamily,
    other_family_rehydration_anchor_ids: buckets.otherFamily,
  };
}

function collectPatternEntriesFromSurface(surface: PlannerPacketSummarySurface) {
  const packet =
    surface.action_recall_packet && typeof surface.action_recall_packet === "object"
      ? (surface.action_recall_packet as Record<string, unknown>)
      : {};
  const candidatePatterns = Array.isArray(surface.candidate_patterns)
    ? surface.candidate_patterns
    : Array.isArray(packet.candidate_patterns)
      ? packet.candidate_patterns
      : [];
  const trustedPatterns = Array.isArray(surface.trusted_patterns)
    ? surface.trusted_patterns
    : Array.isArray(packet.trusted_patterns)
      ? packet.trusted_patterns
      : [];
  const contestedPatterns = Array.isArray(surface.contested_patterns)
    ? surface.contested_patterns
    : Array.isArray(packet.contested_patterns)
      ? packet.contested_patterns
      : [];
  return { candidatePatterns, trustedPatterns, contestedPatterns };
}

function collectWorkflowEntriesFromSurface(surface: PlannerPacketSummarySurface) {
  const packet =
    surface.action_recall_packet && typeof surface.action_recall_packet === "object"
      ? (surface.action_recall_packet as Record<string, unknown>)
      : {};
  const recommendedWorkflows = Array.isArray(surface.recommended_workflows)
    ? surface.recommended_workflows
    : Array.isArray(packet.recommended_workflows)
      ? packet.recommended_workflows
      : [];
  const candidateWorkflows = Array.isArray(surface.candidate_workflows)
    ? surface.candidate_workflows
    : Array.isArray(packet.candidate_workflows)
      ? packet.candidate_workflows
      : [];
  return { recommendedWorkflows, candidateWorkflows };
}

function isPromotionReadyWorkflowSignal(entry: Record<string, unknown>): boolean {
  if (entry.promotion_ready === true) return true;
  const promotionState = typeof entry.promotion_state === "string" ? entry.promotion_state.trim() : "";
  const observedCount = Number(entry.observed_count ?? NaN);
  const requiredObservations = Number(entry.required_observations ?? NaN);
  return (
    promotionState === "candidate"
    && Number.isFinite(observedCount)
    && Number.isFinite(requiredObservations)
    && observedCount >= requiredObservations
  );
}

function buildPlannerExplanation(args: {
  selectedTool: string | null;
  decision: Record<string, unknown>;
  patternSignalSummary: PatternSignalSummary;
  plannerSurface: PlannerPacketSummarySurface;
  actionPacketSummary: ActionPacketSummary;
  workflowLifecycleSummary: WorkflowLifecycleSummary;
}): string | null {
  const patternSummary =
    args.decision.pattern_summary && typeof args.decision.pattern_summary === "object"
      ? (args.decision.pattern_summary as Record<string, unknown>)
      : {};
  const actionPacket =
    args.plannerSurface.action_recall_packet && typeof args.plannerSurface.action_recall_packet === "object"
      ? (args.plannerSurface.action_recall_packet as Record<string, unknown>)
      : {};
  const workflowLabels = summarizePacketEntryLabels(safeRecordArray(actionPacket.recommended_workflows), "title");
  const candidateWorkflowEntries = safeRecordArray(actionPacket.candidate_workflows);
  const candidateWorkflowLabels = summarizePacketEntryLabels(candidateWorkflowEntries, "title");
  const readyCandidateWorkflowLabels = summarizePacketEntryLabels(
    candidateWorkflowEntries.filter((entry) => isPromotionReadyWorkflowSignal(entry)),
    "title",
  );
  const rehydrationLabels = summarizePacketEntryLabels(safeRecordArray(actionPacket.rehydration_candidates), "title");
  const usedTrustedPatternTools = uniqueStrings(safeStringArray(patternSummary.used_trusted_pattern_tools));
  const skippedContestedPatternTools = uniqueStrings(safeStringArray(patternSummary.skipped_contested_pattern_tools));
  const selectedTool = args.selectedTool;
  if (
    !selectedTool
    && usedTrustedPatternTools.length === 0
    && skippedContestedPatternTools.length === 0
    && args.actionPacketSummary.recommended_workflow_count === 0
    && args.actionPacketSummary.candidate_workflow_count === 0
    && args.actionPacketSummary.rehydration_candidate_count === 0
    && args.actionPacketSummary.supporting_knowledge_count === 0
  ) {
    return null;
  }
  const parts: string[] = [];
  if (args.actionPacketSummary.recommended_workflow_count > 0) {
    const workflowLead =
      workflowLabels.length > 0
        ? `workflow guidance: ${workflowLabels.join(", ")}`
        : `workflow guidance: ${args.actionPacketSummary.recommended_workflow_count} recommended`;
    parts.push(workflowLead);
  }
  if (args.actionPacketSummary.candidate_workflow_count > 0) {
    if (args.workflowLifecycleSummary.promotion_ready_count > 0) {
      const readyWorkflowLead =
        readyCandidateWorkflowLabels.length > 0
          ? `promotion-ready workflow candidates: ${readyCandidateWorkflowLabels.join(", ")}`
          : `promotion-ready workflow candidates: ${args.workflowLifecycleSummary.promotion_ready_count}`;
      parts.push(readyWorkflowLead);
    }
    const remainingCandidateCount = Math.max(
      0,
      args.actionPacketSummary.candidate_workflow_count - args.workflowLifecycleSummary.promotion_ready_count,
    );
    if (remainingCandidateCount > 0) {
      const nonReadyCandidateLabels = summarizePacketEntryLabels(
        candidateWorkflowEntries.filter((entry) => !isPromotionReadyWorkflowSignal(entry)),
        "title",
      );
      const candidateWorkflowLead =
        nonReadyCandidateLabels.length > 0
          ? `candidate workflows visible but not yet promoted: ${nonReadyCandidateLabels.join(", ")}`
          : candidateWorkflowLabels.length > 0
            ? `candidate workflows visible but not yet promoted: ${candidateWorkflowLabels.join(", ")}`
            : `candidate workflows visible but not yet promoted: ${remainingCandidateCount}`;
      parts.push(candidateWorkflowLead);
    }
  }
  if (selectedTool) {
    parts.push(`selected tool: ${selectedTool}`);
  }
  if (usedTrustedPatternTools.length > 0) {
    parts.push(`trusted pattern support: ${usedTrustedPatternTools.join(", ")}`);
  } else if (args.patternSignalSummary.trusted_pattern_count > 0) {
    parts.push(`trusted patterns available but not used: ${args.patternSignalSummary.trusted_pattern_tools.join(", ")}`);
  }
  if (args.patternSignalSummary.candidate_pattern_count > 0) {
    parts.push(`candidate patterns visible but not yet trusted: ${args.patternSignalSummary.candidate_pattern_tools.join(", ")}`);
  }
  if (skippedContestedPatternTools.length > 0) {
    parts.push(`contested patterns visible but not trusted: ${skippedContestedPatternTools.join(", ")}`);
  } else if (args.patternSignalSummary.contested_pattern_count > 0) {
    parts.push(`contested patterns visible but not trusted: ${args.patternSignalSummary.contested_pattern_tools.join(", ")}`);
  }
  if (args.actionPacketSummary.rehydration_candidate_count > 0) {
    const rehydrationLead =
      rehydrationLabels.length > 0
        ? `rehydration available: ${rehydrationLabels.join(", ")}`
        : `rehydration available: ${args.actionPacketSummary.rehydration_candidate_count} candidate`;
    parts.push(rehydrationLead);
  }
  if (args.actionPacketSummary.supporting_knowledge_count > 0) {
    parts.push(`supporting knowledge appended: ${args.actionPacketSummary.supporting_knowledge_count}`);
  }
  if (parts.length === 0) return null;
  return parts.join("; ");
}

function buildFirstStepRecommendation(args: {
  selectedTool: string | null;
  experienceSummary: ExperienceRecommendationProjection | null;
}): FirstStepRecommendation | null {
  const experience = args.experienceSummary;
  if (
    experience
    && (
      experience.history_applied
      || experience.path_source_kind !== "none"
      || !!experience.file_path
      || !!experience.combined_next_action
    )
  ) {
    const selectedTool = experience.selected_tool ?? args.selectedTool ?? null;
    return {
      source_kind: "experience_intelligence",
      history_applied: experience.history_applied,
      selected_tool: selectedTool,
      file_path: experience.file_path,
      next_action:
        experience.combined_next_action
        ?? (selectedTool && experience.file_path
          ? `Use ${selectedTool} on ${experience.file_path} as the next step.`
          : selectedTool
            ? `Start with ${selectedTool} as the next step.`
            : null),
    };
  }
  if (!args.selectedTool) return null;
  return {
    source_kind: "tool_selection",
    history_applied: false,
    selected_tool: args.selectedTool,
    file_path: null,
    next_action: `Start with ${args.selectedTool} as the next step.`,
  };
}

export function buildKickoffRecommendation(
  firstStepRecommendation: FirstStepRecommendation | null | undefined,
): KickoffRecommendation | null {
  if (!firstStepRecommendation) return null;
  return {
    source_kind: firstStepRecommendation.source_kind,
    history_applied: firstStepRecommendation.history_applied,
    selected_tool: firstStepRecommendation.selected_tool,
    file_path: firstStepRecommendation.file_path,
    next_action: firstStepRecommendation.next_action,
  };
}

export function buildKickoffRecommendationFromExperience(args: {
  historyApplied: boolean;
  selectedTool: string | null;
  filePath: string | null;
  nextAction: string | null;
}): KickoffRecommendation | null {
  if (!args.selectedTool && !args.filePath && !args.nextAction) return null;
  return {
    source_kind: args.historyApplied ? "experience_intelligence" : "tool_selection",
    history_applied: args.historyApplied,
    selected_tool: args.selectedTool,
    file_path: args.filePath,
    next_action:
      args.nextAction
      ?? (args.selectedTool && args.filePath
        ? `Use ${args.selectedTool} on ${args.filePath} as the next step.`
        : args.selectedTool
          ? `Start with ${args.selectedTool} as the next step.`
          : null),
  };
}

export function summarizePatternSignals(layeredContext: unknown): PatternSignalSummary {
  const layered =
    layeredContext && typeof layeredContext === "object"
      ? (layeredContext as Record<string, unknown>)
      : {};
  return summarizePatternSignalSurface({
    action_recall_packet: layered.action_recall_packet,
    pattern_signals: layered.pattern_signals,
    candidate_patterns: layered.candidate_patterns,
    trusted_patterns: layered.trusted_patterns,
    contested_patterns: layered.contested_patterns,
  });
}

export function summarizePatternSignalSurface(surface: PlannerPacketSummarySurface): PatternSignalSummary {
  const { candidatePatterns, trustedPatterns, contestedPatterns } = collectPatternEntriesFromSurface(surface);
  if (
    candidatePatterns.length > 0
    || trustedPatterns.length > 0
    || contestedPatterns.length > 0
    || !!surface.action_recall_packet
  ) {
    return {
      candidate_pattern_count: candidatePatterns.length,
      candidate_pattern_tools: uniqueStrings(candidatePatterns.map((entry: any) => entry?.selected_tool)),
      trusted_pattern_count: trustedPatterns.length,
      contested_pattern_count: contestedPatterns.length,
      trusted_pattern_tools: uniqueStrings(trustedPatterns.map((entry: any) => entry?.selected_tool)),
      contested_pattern_tools: uniqueStrings(contestedPatterns.map((entry: any) => entry?.selected_tool)),
    };
  }
  const patternSignals = Array.isArray(surface.pattern_signals) && surface.pattern_signals.length > 0
    ? surface.pattern_signals
    : null;
  if (!patternSignals) {
    return {
      candidate_pattern_count: candidatePatterns.length,
      candidate_pattern_tools: uniqueStrings(candidatePatterns.map((entry: any) => entry?.selected_tool)),
      trusted_pattern_count: trustedPatterns.length,
      contested_pattern_count: contestedPatterns.length,
      trusted_pattern_tools: uniqueStrings(trustedPatterns.map((entry: any) => entry?.selected_tool)),
      contested_pattern_tools: uniqueStrings(contestedPatterns.map((entry: any) => entry?.selected_tool)),
    };
  }
  const mergedSignals = patternSignals.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object");
  const candidate = mergedSignals.filter(
    (entry) =>
      (entry as Record<string, unknown>).trusted !== true
      && (
        (entry as Record<string, unknown>).credibility_state === "candidate"
        || (
          (entry as Record<string, unknown>).credibility_state == null
          && (entry as Record<string, unknown>).counter_evidence_open !== true
        )
      ),
  ) as Array<Record<string, unknown>>;
  const trusted = mergedSignals.filter(
    (entry) => (entry as Record<string, unknown>).trusted === true,
  ) as Array<Record<string, unknown>>;
  const contested = mergedSignals.filter(
    (entry) =>
      (
        (entry as Record<string, unknown>).credibility_state === "contested"
        || (entry as Record<string, unknown>).counter_evidence_open === true
      ),
  ) as Array<Record<string, unknown>>;
  return {
    candidate_pattern_count: candidate.length,
    candidate_pattern_tools: uniqueStrings(candidate.map((entry) => entry.selected_tool)),
    trusted_pattern_count: trusted.length,
    contested_pattern_count: contested.length,
    trusted_pattern_tools: uniqueStrings(trusted.map((entry) => entry.selected_tool)),
    contested_pattern_tools: uniqueStrings(contested.map((entry) => entry.selected_tool)),
  };
}

export function summarizeWorkflowSignalSurface(surface: PlannerPacketSummarySurface): WorkflowSignalSummary {
  const { recommendedWorkflows, candidateWorkflows } = collectWorkflowEntriesFromSurface(surface);
  const stable = recommendedWorkflows.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object");
  const candidate = candidateWorkflows.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object");
  const ready = candidate.filter((entry) => isPromotionReadyWorkflowSignal(entry));
  const observing = candidate.filter((entry) => !isPromotionReadyWorkflowSignal(entry));
  return {
    stable_workflow_count: stable.length,
    promotion_ready_workflow_count: ready.length,
    observing_workflow_count: observing.length,
    stable_workflow_titles: summarizePacketEntryLabels(stable, "title", 6),
    promotion_ready_workflow_titles: summarizePacketEntryLabels(ready, "title", 6),
    observing_workflow_titles: summarizePacketEntryLabels(observing, "title", 6),
  };
}

export function summarizePatternLifecycleSurface(surface: PlannerPacketSummarySurface): PatternLifecycleSummary {
  const { candidatePatterns, trustedPatterns, contestedPatterns } = collectPatternEntriesFromSurface(surface);
  const all = [...candidatePatterns, ...trustedPatterns, ...contestedPatterns]
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object");
  const transitionCounts = {
    candidate_observed: 0,
    promoted_to_trusted: 0,
    counter_evidence_opened: 0,
    revalidated_to_trusted: 0,
  };
  let nearPromotionCount = 0;
  let counterEvidenceOpenCount = 0;
  for (const entry of all) {
    const lastTransition = typeof entry.last_transition === "string" ? entry.last_transition.trim() : "";
    if (lastTransition === "candidate_observed") transitionCounts.candidate_observed += 1;
    else if (lastTransition === "promoted_to_trusted") transitionCounts.promoted_to_trusted += 1;
    else if (lastTransition === "counter_evidence_opened") transitionCounts.counter_evidence_opened += 1;
    else if (lastTransition === "revalidated_to_trusted") transitionCounts.revalidated_to_trusted += 1;
    if (entry.counter_evidence_open === true) counterEvidenceOpenCount += 1;
  }
  for (const rawEntry of candidatePatterns) {
    if (!rawEntry || typeof rawEntry !== "object") continue;
    const entry = rawEntry as Record<string, unknown>;
    const distinctRunCount = Number(entry.distinct_run_count);
    const requiredDistinctRuns = Number(entry.required_distinct_runs);
    if (
      Number.isFinite(distinctRunCount)
      && Number.isFinite(requiredDistinctRuns)
      && requiredDistinctRuns > 0
      && distinctRunCount < requiredDistinctRuns
      && distinctRunCount >= (requiredDistinctRuns - 1)
    ) {
      nearPromotionCount += 1;
    }
  }
  return {
    candidate_count: candidatePatterns.length,
    trusted_count: trustedPatterns.length,
    contested_count: contestedPatterns.length,
    near_promotion_count: nearPromotionCount,
    counter_evidence_open_count: counterEvidenceOpenCount,
    transition_counts: transitionCounts,
  };
}

export function summarizePatternMaintenanceSurface(surface: PlannerPacketSummarySurface): PatternMaintenanceSummary {
  const { candidatePatterns, trustedPatterns, contestedPatterns } = collectPatternEntriesFromSurface(surface);
  const all = [...candidatePatterns, ...trustedPatterns, ...contestedPatterns]
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object");
  let observeCount = 0;
  let retainCount = 0;
  let reviewCount = 0;
  let promoteCandidateCount = 0;
  let reviewCounterEvidenceCount = 0;
  let retainTrustedCount = 0;
  for (const entry of all) {
    const maintenanceStateRaw = typeof entry.maintenance_state === "string" ? entry.maintenance_state.trim() : "";
    const offlinePriorityRaw = typeof entry.offline_priority === "string" ? entry.offline_priority.trim() : "";
    const credibilityState = typeof entry.credibility_state === "string" ? entry.credibility_state.trim() : "";
    const maintenanceState = maintenanceStateRaw || (
      credibilityState === "trusted"
        ? "retain"
        : credibilityState === "contested"
          ? "review"
          : "observe"
    );
    const offlinePriority = offlinePriorityRaw || (
      credibilityState === "trusted"
        ? "retain_trusted"
        : credibilityState === "contested"
          ? "review_counter_evidence"
          : "none"
    );
    if (maintenanceState === "observe") observeCount += 1;
    else if (maintenanceState === "retain") retainCount += 1;
    else if (maintenanceState === "review") reviewCount += 1;
    if (offlinePriority === "promote_candidate") promoteCandidateCount += 1;
    else if (offlinePriority === "review_counter_evidence") reviewCounterEvidenceCount += 1;
    else if (offlinePriority === "retain_trusted") retainTrustedCount += 1;
  }
  return {
    model: "lazy_online_v1",
    observe_count: observeCount,
    retain_count: retainCount,
    review_count: reviewCount,
    promote_candidate_count: promoteCandidateCount,
    review_counter_evidence_count: reviewCounterEvidenceCount,
    retain_trusted_count: retainTrustedCount,
  };
}

export function summarizeWorkflowLifecycleSurface(surface: PlannerPacketSummarySurface): WorkflowLifecycleSummary {
  const packet =
    surface.action_recall_packet && typeof surface.action_recall_packet === "object"
      ? (surface.action_recall_packet as Record<string, unknown>)
      : {};
  const candidateWorkflows = Array.isArray(surface.candidate_workflows)
    ? surface.candidate_workflows
    : Array.isArray(packet.candidate_workflows)
      ? packet.candidate_workflows
      : [];
  const recommendedWorkflows = Array.isArray(surface.recommended_workflows)
    ? surface.recommended_workflows
    : Array.isArray(packet.recommended_workflows)
      ? packet.recommended_workflows
      : [];
  const workflows = [...candidateWorkflows, ...recommendedWorkflows]
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object");
  let replaySourceCount = 0;
  let rehydrationReadyCount = 0;
  let promotionReadyCount = 0;
  const transitionCounts = {
    candidate_observed: 0,
    promoted_to_stable: 0,
    normalized_latest_stable: 0,
  };
  for (const entry of workflows) {
    const sourceKind = typeof entry.source_kind === "string" ? entry.source_kind.trim() : "";
    const defaultMode = typeof entry.rehydration_default_mode === "string" ? entry.rehydration_default_mode.trim() : "";
    const lastTransition = typeof entry.last_transition === "string" ? entry.last_transition.trim() : "";
    const promotionState = typeof entry.promotion_state === "string" ? entry.promotion_state.trim() : "";
    const observedCount = Number(entry.observed_count ?? NaN);
    const requiredObservations = Number(entry.required_observations ?? NaN);
    if (sourceKind === "playbook") replaySourceCount += 1;
    if (defaultMode === "summary_only" || defaultMode === "partial" || defaultMode === "full") rehydrationReadyCount += 1;
    if (
      promotionState === "candidate"
      && Number.isFinite(observedCount)
      && Number.isFinite(requiredObservations)
      && observedCount >= requiredObservations
    ) {
      promotionReadyCount += 1;
    }
    if (lastTransition === "candidate_observed") transitionCounts.candidate_observed += 1;
    else if (lastTransition === "promoted_to_stable") transitionCounts.promoted_to_stable += 1;
    else if (lastTransition === "normalized_latest_stable") transitionCounts.normalized_latest_stable += 1;
  }
  return {
    candidate_count: candidateWorkflows.length,
    stable_count: recommendedWorkflows.length,
    replay_source_count: replaySourceCount,
    rehydration_ready_count: rehydrationReadyCount,
    promotion_ready_count: promotionReadyCount,
    transition_counts: transitionCounts,
  };
}

export function summarizeWorkflowMaintenanceSurface(surface: PlannerPacketSummarySurface): WorkflowMaintenanceSummary {
  const packet =
    surface.action_recall_packet && typeof surface.action_recall_packet === "object"
      ? (surface.action_recall_packet as Record<string, unknown>)
      : {};
  const candidateWorkflows = Array.isArray(surface.candidate_workflows)
    ? surface.candidate_workflows
    : Array.isArray(packet.candidate_workflows)
      ? packet.candidate_workflows
      : [];
  const recommendedWorkflows = Array.isArray(surface.recommended_workflows)
    ? surface.recommended_workflows
    : Array.isArray(packet.recommended_workflows)
      ? packet.recommended_workflows
      : [];
  const workflows = [...candidateWorkflows, ...recommendedWorkflows]
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object");
  let observeCount = 0;
  let retainCount = 0;
  let promoteCandidateCount = 0;
  let retainWorkflowCount = 0;
  for (const entry of workflows) {
    const maintenanceState = typeof entry.maintenance_state === "string" ? entry.maintenance_state.trim() : "";
    const offlinePriority = typeof entry.offline_priority === "string" ? entry.offline_priority.trim() : "";
    const promotionState = typeof entry.promotion_state === "string" ? entry.promotion_state.trim() : "";
    const normalizedState = maintenanceState || (promotionState === "candidate" ? "observe" : "retain");
    const normalizedPriority = offlinePriority || (promotionState === "candidate" ? "promote_candidate" : "retain_workflow");
    if (normalizedState === "observe") observeCount += 1;
    if (normalizedState === "retain") retainCount += 1;
    if (normalizedPriority === "promote_candidate") promoteCandidateCount += 1;
    if (normalizedPriority === "retain_workflow") retainWorkflowCount += 1;
  }
  return {
    model: "lazy_online_v1",
    observe_count: observeCount,
    retain_count: retainCount,
    promote_candidate_count: promoteCandidateCount,
    retain_workflow_count: retainWorkflowCount,
  };
}

export function summarizeActionRecallPacket(layeredContext: unknown): ActionPacketSummary {
  const layered =
    layeredContext && typeof layeredContext === "object"
      ? (layeredContext as Record<string, unknown>)
      : {};
  return summarizeActionRecallPacketSurface({ action_recall_packet: layered.action_recall_packet });
}

export function summarizeActionRecallPacketSurface(surface: PlannerPacketSummarySurface): ActionPacketSummary {
  const packet =
    surface.action_recall_packet && typeof surface.action_recall_packet === "object"
      ? (surface.action_recall_packet as Record<string, unknown>)
      : {};
  const recommendedWorkflows = Array.isArray(surface.recommended_workflows)
    ? surface.recommended_workflows
    : Array.isArray(packet.recommended_workflows)
      ? packet.recommended_workflows
      : [];
  const candidateWorkflows = Array.isArray(surface.candidate_workflows)
    ? surface.candidate_workflows
    : Array.isArray(packet.candidate_workflows)
      ? packet.candidate_workflows
      : [];
  const candidatePatterns = Array.isArray(surface.candidate_patterns)
    ? surface.candidate_patterns
    : Array.isArray(packet.candidate_patterns)
      ? packet.candidate_patterns
      : [];
  const trustedPatterns = Array.isArray(surface.trusted_patterns)
    ? surface.trusted_patterns
    : Array.isArray(packet.trusted_patterns)
      ? packet.trusted_patterns
      : [];
  const contestedPatterns = Array.isArray(surface.contested_patterns)
    ? surface.contested_patterns
    : Array.isArray(packet.contested_patterns)
      ? packet.contested_patterns
      : [];
  const rehydrationCandidates = Array.isArray(surface.rehydration_candidates)
    ? surface.rehydration_candidates
    : Array.isArray(packet.rehydration_candidates)
      ? packet.rehydration_candidates
      : [];
  const supportingKnowledge = Array.isArray(surface.supporting_knowledge)
    ? surface.supporting_knowledge
    : Array.isArray(packet.supporting_knowledge)
      ? packet.supporting_knowledge
      : [];
  return {
    recommended_workflow_count: recommendedWorkflows.length,
    candidate_workflow_count: candidateWorkflows.length,
    candidate_pattern_count: candidatePatterns.length,
    trusted_pattern_count: trustedPatterns.length,
    contested_pattern_count: contestedPatterns.length,
    rehydration_candidate_count: rehydrationCandidates.length,
    supporting_knowledge_count: supportingKnowledge.length,
    workflow_anchor_ids: uniqueStrings(recommendedWorkflows.map((entry: any) => entry?.anchor_id)),
    candidate_workflow_anchor_ids: uniqueStrings(candidateWorkflows.map((entry: any) => entry?.anchor_id)),
    candidate_pattern_anchor_ids: uniqueStrings(candidatePatterns.map((entry: any) => entry?.anchor_id)),
    trusted_pattern_anchor_ids: uniqueStrings(trustedPatterns.map((entry: any) => entry?.anchor_id)),
    contested_pattern_anchor_ids: uniqueStrings(contestedPatterns.map((entry: any) => entry?.anchor_id)),
    rehydration_anchor_ids: uniqueStrings(rehydrationCandidates.map((entry: any) => entry?.anchor_id)),
  };
}

export function summarizeDistillationSignalSurface(surface: PlannerPacketSummarySurface): DistillationSignalSummary {
  const packet =
    surface.action_recall_packet && typeof surface.action_recall_packet === "object"
      ? (surface.action_recall_packet as Record<string, unknown>)
      : {};
  const candidateWorkflows = Array.isArray(surface.candidate_workflows)
    ? surface.candidate_workflows
    : Array.isArray(packet.candidate_workflows)
      ? packet.candidate_workflows
      : [];
  const supportingKnowledge = Array.isArray(surface.supporting_knowledge)
    ? surface.supporting_knowledge
    : Array.isArray(packet.supporting_knowledge)
      ? packet.supporting_knowledge
      : [];

  const evidenceEntries = safeRecordArray(supportingKnowledge).filter((entry) => entry.summary_kind === "write_distillation_evidence");
  const factEntries = safeRecordArray(supportingKnowledge).filter((entry) => entry.summary_kind === "write_distillation_fact");
  const projectedCandidates = safeRecordArray(candidateWorkflows).filter((entry) => {
    const origin = typeof entry.distillation_origin === "string" ? entry.distillation_origin.trim() : "";
    return origin === "execution_write_projection" || origin === "replay_learning_episode";
  });
  const allEntries = [...evidenceEntries, ...factEntries, ...projectedCandidates];

  const originCounts: DistillationSignalSummary["origin_counts"] = {
    write_distillation_input_text: 0,
    write_distillation_event_node: 0,
    write_distillation_evidence_node: 0,
    execution_write_projection: 0,
    replay_learning_episode: 0,
  };
  const promotionTargetCounts: DistillationSignalSummary["promotion_target_counts"] = {
    workflow: 0,
    pattern: 0,
    policy: 0,
  };

  for (const entry of allEntries) {
    const origin = typeof entry.distillation_origin === "string" ? entry.distillation_origin.trim() : "";
    if (origin in originCounts) originCounts[origin as keyof typeof originCounts] += 1;
    const target = typeof entry.preferred_promotion_target === "string" ? entry.preferred_promotion_target.trim() : "";
    if (target === "workflow" || target === "pattern" || target === "policy") {
      promotionTargetCounts[target] += 1;
    }
  }

  return {
    distilled_evidence_count: evidenceEntries.length,
    distilled_fact_count: factEntries.length,
    projected_workflow_candidate_count: projectedCandidates.length,
    origin_counts: originCounts,
    promotion_target_counts: promotionTargetCounts,
  };
}

function collectPolicyEntriesFromSurface(surface: PlannerPacketSummarySurface) {
  const packet =
    surface.action_recall_packet && typeof surface.action_recall_packet === "object"
      ? (surface.action_recall_packet as Record<string, unknown>)
      : {};
  const supportingKnowledge = Array.isArray(surface.supporting_knowledge)
    ? surface.supporting_knowledge
    : Array.isArray(packet.supporting_knowledge)
      ? packet.supporting_knowledge
      : [];
  return safeRecordArray(supportingKnowledge).filter((entry) => {
    const kind = typeof entry.kind === "string" ? entry.kind.trim() : "";
    const summaryKind = typeof entry.summary_kind === "string" ? entry.summary_kind.trim() : "";
    return kind === "policy_memory" || summaryKind === "policy_memory";
  });
}

export function summarizePolicyLifecycleSurface(surface: PlannerPacketSummarySurface): PolicyLifecycleSummary {
  const entries = collectPolicyEntriesFromSurface(surface);
  const summary: PolicyLifecycleSummary = {
    persisted_count: 0,
    active_count: 0,
    contested_count: 0,
    retired_count: 0,
    default_mode_count: 0,
    hint_mode_count: 0,
    stable_policy_count: 0,
    transition_counts: {
      materialized: 0,
      refreshed: 0,
      contested_by_feedback: 0,
      retired_by_feedback: 0,
      retired_by_governance: 0,
      reactivated_by_governance: 0,
    },
  };
  for (const entry of entries) {
    const materializationState = typeof entry.materialization_state === "string" ? entry.materialization_state.trim() : "";
    const policyMemoryState = typeof entry.policy_memory_state === "string" ? entry.policy_memory_state.trim() : "";
    const activationMode = typeof entry.activation_mode === "string" ? entry.activation_mode.trim() : "";
    const policyState = typeof entry.policy_state === "string" ? entry.policy_state.trim() : "";
    const transition = typeof entry.last_transition === "string" ? entry.last_transition.trim() : "";
    if (materializationState === "persisted") summary.persisted_count += 1;
    if (policyMemoryState === "active") summary.active_count += 1;
    if (policyMemoryState === "contested") summary.contested_count += 1;
    if (policyMemoryState === "retired") summary.retired_count += 1;
    if (activationMode === "default") summary.default_mode_count += 1;
    if (activationMode === "hint") summary.hint_mode_count += 1;
    if (policyState === "stable") summary.stable_policy_count += 1;
    if (transition in summary.transition_counts) {
      summary.transition_counts[transition as keyof PolicyLifecycleSummary["transition_counts"]] += 1;
    }
  }
  return summary;
}

export function summarizePolicyMaintenanceSurface(surface: PlannerPacketSummarySurface): PolicyMaintenanceSummary {
  const entries = collectPolicyEntriesFromSurface(surface);
  const summary: PolicyMaintenanceSummary = {
    model: "lazy_online_v1",
    observe_count: 0,
    retain_count: 0,
    review_count: 0,
    promote_to_default_count: 0,
    retain_active_policy_count: 0,
    review_contested_policy_count: 0,
    retire_policy_count: 0,
    reactivate_policy_count: 0,
  };
  for (const entry of entries) {
    const maintenanceState = typeof entry.maintenance_state === "string" ? entry.maintenance_state.trim() : "";
    const offlinePriority = typeof entry.offline_priority === "string" ? entry.offline_priority.trim() : "";
    if (maintenanceState === "observe") summary.observe_count += 1;
    if (maintenanceState === "retain") summary.retain_count += 1;
    if (maintenanceState === "review") summary.review_count += 1;
    if (offlinePriority === "promote_to_default") summary.promote_to_default_count += 1;
    if (offlinePriority === "retain_active_policy") summary.retain_active_policy_count += 1;
    if (offlinePriority === "review_contested_policy") summary.review_contested_policy_count += 1;
    if (offlinePriority === "retire_policy") summary.retire_policy_count += 1;
    if (offlinePriority === "reactivate_policy") summary.reactivate_policy_count += 1;
  }
  return summary;
}

export function buildExecutionMemorySummaryBundle(surface: PlannerPacketSummarySurface): ExecutionMemorySummaryBundle {
  return {
    pattern_signal_summary: summarizePatternSignalSurface(surface),
    workflow_signal_summary: summarizeWorkflowSignalSurface(surface),
    workflow_lifecycle_summary: summarizeWorkflowLifecycleSurface(surface),
    workflow_maintenance_summary: summarizeWorkflowMaintenanceSurface(surface),
    distillation_signal_summary: summarizeDistillationSignalSurface(surface),
    pattern_lifecycle_summary: summarizePatternLifecycleSurface(surface),
    pattern_maintenance_summary: summarizePatternMaintenanceSurface(surface),
    policy_lifecycle_summary: summarizePolicyLifecycleSurface(surface),
    policy_maintenance_summary: summarizePolicyMaintenanceSurface(surface),
    action_packet_summary: summarizeActionRecallPacketSurface(surface),
  };
}

export function buildExecutionSummarySurface(args: {
  planner_packet?: unknown;
  surface: PlannerPacketSummarySurface;
  packet_assembly?: Partial<ExecutionPacketAssemblySummary> | null;
  tools?: unknown;
  cost_signals?: unknown;
  execution_packet?: unknown;
  execution_artifacts?: unknown;
  execution_evidence?: unknown;
  delegation_records?: unknown;
}): ExecutionSummary {
  const summaryBundle = buildExecutionMemorySummaryBundle(args.surface);
  const strategySummary = buildExecutionStrategySummary({
    surface: args.surface,
    summaryBundle,
    tools: args.tools,
    costSignals: args.cost_signals,
  });
  const collaborationSummary = buildExecutionCollaborationSummary({
    executionPacket: args.execution_packet,
    executionArtifacts: args.execution_artifacts,
    executionEvidence: args.execution_evidence,
  });
  const routingSignalSummary = buildExecutionRoutingSignalSummary({
    surface: args.surface,
    summaryBundle,
    tools: args.tools,
  });
  const maintenanceSummary = buildExecutionMaintenanceSummary({
    surface: args.surface,
    summaryBundle,
    costSignals: args.cost_signals,
    tools: args.tools,
  });
  const forgettingSummary = buildExecutionForgettingSummary({
    surface: args.surface,
    summaryBundle,
    costSignals: args.cost_signals,
    tools: args.tools,
  });
  const collaborationRoutingSummary = buildExecutionCollaborationRoutingSummary({
    executionPacket: args.execution_packet,
    strategySummary,
    collaborationSummary,
    routingSummary: routingSignalSummary,
  });
  const delegationRecordsSummary = buildExecutionDelegationRecordsSummary({
    strategySummary,
    collaborationSummary,
    collaborationRoutingSummary,
  });
  const persistedDelegationRecordsSummary = pickPreferredDelegationRecordsSummary(args.delegation_records);
  const instrumentationSummary = buildExecutionInstrumentationSummary({
    surface: args.surface,
    summaryBundle,
    tools: args.tools,
  });
  return {
    summary_version: "execution_summary_v1",
    planner_packet: args.planner_packet ?? null,
    pattern_signals: Array.isArray(args.surface.pattern_signals) ? args.surface.pattern_signals : [],
    workflow_signals: Array.isArray(args.surface.workflow_signals) ? args.surface.workflow_signals : [],
    packet_assembly: {
      packet_source_mode:
        args.packet_assembly && typeof args.packet_assembly.packet_source_mode === "string"
          ? args.packet_assembly.packet_source_mode
          : null,
      state_first_assembly:
        args.packet_assembly && typeof args.packet_assembly.state_first_assembly === "boolean"
          ? args.packet_assembly.state_first_assembly
          : null,
      execution_packet_v1_present:
        args.packet_assembly && typeof args.packet_assembly.execution_packet_v1_present === "boolean"
          ? args.packet_assembly.execution_packet_v1_present
          : null,
      execution_state_v1_present:
        args.packet_assembly && typeof args.packet_assembly.execution_state_v1_present === "boolean"
          ? args.packet_assembly.execution_state_v1_present
          : null,
    },
    strategy_summary: strategySummary,
    collaboration_summary: collaborationSummary,
    continuity_snapshot_summary: buildExecutionContinuitySnapshotSummary({
      strategySummary,
      collaborationSummary,
      routingSummary: routingSignalSummary,
      maintenanceSummary,
    }),
    routing_signal_summary: routingSignalSummary,
    maintenance_summary: maintenanceSummary,
    forgetting_summary: forgettingSummary,
    collaboration_routing_summary: collaborationRoutingSummary,
    delegation_records_summary: persistedDelegationRecordsSummary ?? delegationRecordsSummary,
    instrumentation_summary: instrumentationSummary,
    ...summaryBundle,
  };
}

export function buildPlanningSummary(args: {
  rules?: unknown;
  tools?: unknown;
  layered_context?: unknown;
  planner_surface?: PlannerPacketSummarySurface;
  cost_signals?: unknown;
  context_est_tokens: number;
  context_compaction_profile: "balanced" | "aggressive";
  optimization_profile: "balanced" | "aggressive" | null;
  recall_mode?: string | null;
  experience_intelligence?: unknown;
}): PlanningSummary {
  const rules = args.rules && typeof args.rules === "object" ? (args.rules as Record<string, unknown>) : {};
  const tools = args.tools && typeof args.tools === "object" ? (args.tools as Record<string, unknown>) : {};
  const decision = tools.decision && typeof tools.decision === "object" ? (tools.decision as Record<string, unknown>) : {};
  const layeredContext =
    args.layered_context && typeof args.layered_context === "object"
      ? (args.layered_context as Record<string, unknown>)
      : {};
  const layeredStats =
    layeredContext.stats && typeof layeredContext.stats === "object"
      ? (layeredContext.stats as Record<string, unknown>)
      : {};
  const staticInjection =
    layeredContext.static_injection && typeof layeredContext.static_injection === "object"
      ? (layeredContext.static_injection as Record<string, unknown>)
      : {};
  const costSignals =
    args.cost_signals && typeof args.cost_signals === "object" ? (args.cost_signals as Record<string, unknown>) : {};
  const plannerSurface = args.planner_surface ?? {
    action_recall_packet: layeredContext.action_recall_packet,
    pattern_signals: layeredContext.pattern_signals,
    workflow_signals: layeredContext.workflow_signals,
    recommended_workflows: layeredContext.recommended_workflows,
    candidate_workflows: layeredContext.candidate_workflows,
    candidate_patterns: layeredContext.candidate_patterns,
    trusted_patterns: layeredContext.trusted_patterns,
    contested_patterns: layeredContext.contested_patterns,
    rehydration_candidates: layeredContext.rehydration_candidates,
    supporting_knowledge: layeredContext.supporting_knowledge,
  };
  const summaryBundle = buildExecutionMemorySummaryBundle(plannerSurface);
  const patternSignalSummary = summaryBundle.pattern_signal_summary;
  const workflowSignalSummary = summaryBundle.workflow_signal_summary;
  const actionPacketSummary = summaryBundle.action_packet_summary;
  const workflowLifecycleSummary = summaryBundle.workflow_lifecycle_summary;
  const workflowMaintenanceSummary = summaryBundle.workflow_maintenance_summary;
  const distillationSignalSummary = summaryBundle.distillation_signal_summary;
  const patternLifecycleSummary = summaryBundle.pattern_lifecycle_summary;
  const patternMaintenanceSummary = summaryBundle.pattern_maintenance_summary;
  const policyLifecycleSummary = summaryBundle.policy_lifecycle_summary;
  const policyMaintenanceSummary = summaryBundle.policy_maintenance_summary;
  const experienceRecommendation =
    args.experience_intelligence && typeof args.experience_intelligence === "object"
      ? ((args.experience_intelligence as Record<string, unknown>).recommendation as Record<string, unknown> | undefined)
      : undefined;
  const experiencePath =
    experienceRecommendation?.path && typeof experienceRecommendation.path === "object"
      ? (experienceRecommendation.path as Record<string, unknown>)
      : null;
  const experienceSummary: ExperienceRecommendationProjection | null = experienceRecommendation
    ? {
        history_applied: experienceRecommendation.history_applied === true,
        selected_tool: typeof experienceRecommendation.tool === "object" && experienceRecommendation.tool && typeof (experienceRecommendation.tool as any).selected_tool === "string"
          ? (experienceRecommendation.tool as any).selected_tool
          : null,
        path_source_kind:
          experiencePath?.source_kind === "recommended_workflow" || experiencePath?.source_kind === "candidate_workflow"
            ? experiencePath.source_kind
            : "none",
        file_path: typeof experiencePath?.file_path === "string" ? experiencePath.file_path : null,
        combined_next_action:
          typeof experienceRecommendation.combined_next_action === "string"
            ? experienceRecommendation.combined_next_action
            : null,
      }
    : null;
  const selectedTool =
    typeof tools.selection === "object" && tools.selection && typeof (tools.selection as any).selected === "string"
      ? (tools.selection as any).selected
      : null;
  const firstStepRecommendation = buildFirstStepRecommendation({
    selectedTool,
    experienceSummary,
  });

  return {
    summary_version: "planning_summary_v1",
    first_step_recommendation: firstStepRecommendation,
    planner_explanation: buildPlannerExplanation({
      selectedTool,
      decision,
      patternSignalSummary,
      plannerSurface,
      actionPacketSummary,
      workflowLifecycleSummary,
    }),
    selected_tool: selectedTool,
    decision_id: typeof decision.decision_id === "string" ? decision.decision_id : null,
    rules_considered: Number(rules.considered ?? 0),
    rules_matched: Number(rules.matched ?? 0),
    context_est_tokens: args.context_est_tokens,
    layered_output: Boolean(args.layered_context),
    forgotten_items: Number(costSignals.forgotten_items ?? layeredStats.forgotten_items ?? 0),
    static_blocks_selected: Number(costSignals.static_blocks_selected ?? staticInjection.selected_blocks ?? 0),
    selected_memory_layers: Array.isArray(costSignals.selected_memory_layers)
      ? costSignals.selected_memory_layers.filter((entry): entry is string => typeof entry === "string")
      : [],
    optimization_profile: args.optimization_profile,
    context_compaction_profile: args.context_compaction_profile,
    recall_mode: args.recall_mode ?? null,
    trusted_pattern_count: patternSignalSummary.trusted_pattern_count,
    contested_pattern_count: patternSignalSummary.contested_pattern_count,
    trusted_pattern_tools: patternSignalSummary.trusted_pattern_tools,
    contested_pattern_tools: patternSignalSummary.contested_pattern_tools,
    workflow_signal_summary: workflowSignalSummary,
    action_packet_summary: actionPacketSummary,
    workflow_lifecycle_summary: workflowLifecycleSummary,
    workflow_maintenance_summary: workflowMaintenanceSummary,
    distillation_signal_summary: distillationSignalSummary,
    pattern_lifecycle_summary: patternLifecycleSummary,
    pattern_maintenance_summary: patternMaintenanceSummary,
    policy_lifecycle_summary: policyLifecycleSummary,
    policy_maintenance_summary: policyMaintenanceSummary,
    primary_savings_levers: Array.isArray(costSignals.primary_savings_levers)
      ? costSignals.primary_savings_levers.filter((entry): entry is string => typeof entry === "string")
      : [],
  };
}

export function buildAssemblySummary(args: {
  rules?: unknown;
  tools?: unknown;
  layered_context?: unknown;
  planner_surface?: PlannerPacketSummarySurface;
  cost_signals?: unknown;
  context_est_tokens: number;
  context_compaction_profile: "balanced" | "aggressive";
  optimization_profile: "balanced" | "aggressive" | null;
  recall_mode?: string | null;
  include_rules: boolean;
  experience_intelligence?: unknown;
}): AssemblySummary {
  const planning = buildPlanningSummary({
    rules: args.rules,
    tools: args.tools,
    layered_context: args.layered_context,
    planner_surface: args.planner_surface,
    cost_signals: args.cost_signals,
    context_est_tokens: args.context_est_tokens,
    context_compaction_profile: args.context_compaction_profile,
    optimization_profile: args.optimization_profile,
    recall_mode: args.recall_mode,
    experience_intelligence: args.experience_intelligence,
  });
  return {
    summary_version: "assembly_summary_v1",
    planner_explanation: planning.planner_explanation,
    first_step_recommendation: planning.first_step_recommendation,
    selected_tool: planning.selected_tool,
    decision_id: planning.decision_id,
    rules_considered: planning.rules_considered,
    rules_matched: planning.rules_matched,
    include_rules: args.include_rules,
    context_est_tokens: planning.context_est_tokens,
    layered_output: planning.layered_output,
    forgotten_items: planning.forgotten_items,
    static_blocks_selected: planning.static_blocks_selected,
    selected_memory_layers: planning.selected_memory_layers,
    optimization_profile: planning.optimization_profile,
    context_compaction_profile: planning.context_compaction_profile,
    recall_mode: planning.recall_mode,
    trusted_pattern_count: planning.trusted_pattern_count,
    contested_pattern_count: planning.contested_pattern_count,
    trusted_pattern_tools: planning.trusted_pattern_tools,
    contested_pattern_tools: planning.contested_pattern_tools,
    workflow_signal_summary: planning.workflow_signal_summary,
    action_packet_summary: planning.action_packet_summary,
    workflow_lifecycle_summary: planning.workflow_lifecycle_summary,
    workflow_maintenance_summary: planning.workflow_maintenance_summary,
    distillation_signal_summary: planning.distillation_signal_summary,
    pattern_lifecycle_summary: planning.pattern_lifecycle_summary,
    pattern_maintenance_summary: planning.pattern_maintenance_summary,
    policy_lifecycle_summary: planning.policy_lifecycle_summary,
    policy_maintenance_summary: planning.policy_maintenance_summary,
    primary_savings_levers: planning.primary_savings_levers,
  };
}

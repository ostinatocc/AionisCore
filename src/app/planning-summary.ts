import { pickPreferredDelegationRecordsSummary } from "../memory/delegation-records-surface.js";
import {
  buildExecutionCollaborationSummary,
  buildExecutionContinuitySnapshotSummary,
  buildExecutionStrategySummary,
} from "./planning-summary-execution.js";
import {
  buildExecutionForgettingSummary,
  buildExecutionMaintenanceSummary,
} from "./planning-summary-forgetting.js";
import {
  buildFirstStepRecommendation,
  buildKickoffRecommendation,
  buildKickoffRecommendationFromExperience,
  buildPlannerExplanation,
} from "./planning-summary-planner.js";
import {
  buildExecutionCollaborationRoutingSummary,
  buildExecutionDelegationRecordsSummary,
  buildExecutionInstrumentationSummary,
  buildExecutionRoutingSignalSummary,
} from "./planning-summary-routing.js";
import {
  buildExecutionMemorySummaryBundle,
  isPromotionReadyWorkflowSignal,
  summarizeActionRecallPacket,
  summarizeActionRecallPacketSurface,
  summarizeContinuityCarrierSurface,
  summarizeDistillationSignalSurface,
  summarizePacketEntryLabels,
  summarizePatternLifecycleSurface,
  summarizePatternMaintenanceSurface,
  summarizePatternSignalSurface,
  summarizePatternSignals,
  summarizePolicyLifecycleSurface,
  summarizePolicyMaintenanceSurface,
  summarizeWorkflowLifecycleSurface,
  summarizeWorkflowMaintenanceSurface,
  summarizeWorkflowSignalSurface,
} from "./planning-summary-surfaces.js";
import {
  safeRecordArray,
  safeStringArray,
  uniqueStrings,
} from "./planning-summary-utils.js";

export {
  buildKickoffRecommendation,
  buildKickoffRecommendationFromExperience,
} from "./planning-summary-planner.js";

export {
  buildExecutionMemorySummaryBundle,
  isPromotionReadyWorkflowSignal,
  summarizeActionRecallPacket,
  summarizeActionRecallPacketSurface,
  summarizeContinuityCarrierSurface,
  summarizeDistillationSignalSurface,
  summarizePatternLifecycleSurface,
  summarizePatternMaintenanceSurface,
  summarizePatternSignalSurface,
  summarizePatternSignals,
  summarizePolicyLifecycleSurface,
  summarizePolicyMaintenanceSurface,
  summarizeWorkflowLifecycleSurface,
  summarizeWorkflowMaintenanceSurface,
  summarizeWorkflowSignalSurface,
} from "./planning-summary-surfaces.js";

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
  continuity_carrier_summary: ContinuityCarrierSummary;
  forgetting_summary: ExecutionForgettingSummary;
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
  continuity_carrier_summary: ContinuityCarrierSummary;
  forgetting_summary: ExecutionForgettingSummary;
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

export type PlannerPacketSummarySurface = {
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
    handoff_continuity_carrier: number;
    session_event_continuity_carrier: number;
    session_continuity_carrier: number;
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

export type ContinuityCarrierSummary = {
  total_count: number;
  handoff_count: number;
  session_event_count: number;
  session_count: number;
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
  continuity_carrier_summary: ContinuityCarrierSummary;
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
  semantic_action_counts: {
    retain: number;
    demote: number;
    archive: number;
    review: number;
  };
  lifecycle_state_counts: {
    active: number;
    contested: number;
    retired: number;
    archived: number;
  };
  archive_relocation_state_counts: {
    none: number;
    candidate: number;
    cold_archive: number;
  };
  archive_relocation_target_counts: {
    none: number;
    local_cold_store: number;
    external_object_store: number;
  };
  archive_payload_scope_counts: {
    none: number;
    anchor_payload: number;
    node: number;
  };
  rehydration_mode_counts: {
    summary_only: number;
    partial: number;
    full: number;
    differential: number;
  };
  differential_rehydration_candidate_count: number;
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
  const actionRecallPacket =
    layeredContext.action_recall_packet && typeof layeredContext.action_recall_packet === "object"
      ? (layeredContext.action_recall_packet as Record<string, unknown>)
      : {};
  const plannerSurface = args.planner_surface ?? {
    action_recall_packet: layeredContext.action_recall_packet,
    pattern_signals: layeredContext.pattern_signals,
    workflow_signals: layeredContext.workflow_signals,
    recommended_workflows: layeredContext.recommended_workflows ?? actionRecallPacket.recommended_workflows,
    candidate_workflows: layeredContext.candidate_workflows ?? actionRecallPacket.candidate_workflows,
    candidate_patterns: layeredContext.candidate_patterns ?? actionRecallPacket.candidate_patterns,
    trusted_patterns: layeredContext.trusted_patterns ?? actionRecallPacket.trusted_patterns,
    contested_patterns: layeredContext.contested_patterns ?? actionRecallPacket.contested_patterns,
    rehydration_candidates: layeredContext.rehydration_candidates ?? actionRecallPacket.rehydration_candidates,
    supporting_knowledge: layeredContext.supporting_knowledge ?? actionRecallPacket.supporting_knowledge,
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
  const continuityCarrierSummary = summaryBundle.continuity_carrier_summary;
  const forgettingSummary = buildExecutionForgettingSummary({
    surface: plannerSurface,
    summaryBundle,
    costSignals,
    tools,
  });
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
    continuity_carrier_summary: continuityCarrierSummary,
    forgetting_summary: forgettingSummary,
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
    continuity_carrier_summary: planning.continuity_carrier_summary,
    forgetting_summary: planning.forgetting_summary,
    primary_savings_levers: planning.primary_savings_levers,
  };
}

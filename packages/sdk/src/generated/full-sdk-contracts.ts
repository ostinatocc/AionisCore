// Generated from packages/full-sdk/src/contracts.ts by scripts/sync-internal-sdk-contracts.mjs.
// Do not edit by hand; update the full SDK contracts and re-run the sync.

import type { AionisRequestPayload } from "../types.js";

export type AionisPassthroughObject = Record<string, unknown>;
export type AionisRuntimeResponse = AionisPassthroughObject;

export type AionisWriteNode = {
  id?: string;
  client_id?: string;
  scope?: string;
  type: "event" | "entity" | "topic" | "rule" | "evidence" | "concept" | "procedure" | "self_model";
  tier?: "hot" | "warm" | "cold" | "archive";
  memory_lane?: "private" | "shared";
  producer_agent_id?: string;
  owner_agent_id?: string;
  owner_team_id?: string;
  title?: string;
  text_summary?: string;
  slots?: Record<string, unknown>;
  raw_ref?: string;
  evidence_ref?: string;
  embedding?: number[];
  embedding_model?: string;
  salience?: number;
  importance?: number;
  confidence?: number;
} & AionisPassthroughObject;

export type AionisWriteEdge = {
  id?: string;
  scope?: string;
  type: "part_of" | "related_to" | "derived_from";
  src: { id?: string; client_id?: string };
  dst: { id?: string; client_id?: string };
  weight?: number;
  confidence?: number;
  decay_rate?: number;
} & AionisPassthroughObject;

export type AionisMemoryWriteRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  parent_commit_id?: string;
  input_text?: string;
  input_sha256?: string;
  model_version?: string;
  prompt_version?: string;
  auto_embed?: boolean;
  memory_lane?: "private" | "shared";
  producer_agent_id?: string;
  owner_agent_id?: string;
  owner_team_id?: string;
  force_reembed?: boolean;
  trigger_topic_cluster?: boolean;
  topic_cluster_async?: boolean;
  distill?: Record<string, unknown>;
  nodes?: AionisWriteNode[];
  edges?: AionisWriteEdge[];
} & AionisRequestPayload;

export type AionisMemoryWriteResponse = {
  tenant_id?: string;
  scope?: string;
  commit_id: string;
  commit_uri?: string;
  commit_hash?: string;
  nodes?: Array<Record<string, unknown>>;
  edges?: Array<Record<string, unknown>>;
} & AionisRuntimeResponse;

export type AionisMemoryRecallRequest = {
  tenant_id?: string;
  scope?: string;
  query_embedding: number[];
  recall_strategy?: "local" | "balanced" | "global";
  recall_mode?: "dense_edge";
  consumer_agent_id?: string;
  consumer_team_id?: string;
  limit?: number;
  neighborhood_hops?: number;
  return_debug?: boolean;
  include_embeddings?: boolean;
  include_meta?: boolean;
  include_slots?: boolean;
  include_slots_preview?: boolean;
  slots_preview_keys?: number;
  max_nodes?: number;
  max_edges?: number;
  ranked_limit?: number;
  min_edge_weight?: number;
  min_edge_confidence?: number;
  context_token_budget?: number;
  context_char_budget?: number;
  context_compaction_profile?: "balanced" | "aggressive";
  memory_layer_preference?: { allowed_layers: Array<"L0" | "L1" | "L2" | "L3" | "L4" | "L5"> };
  rules_context?: unknown;
  rules_include_shadow?: boolean;
  rules_limit?: number;
} & AionisRequestPayload;

export type AionisMemoryRecallTextRequest = {
  tenant_id?: string;
  scope?: string;
  query_text: string;
  recall_strategy?: "local" | "balanced" | "global";
  recall_mode?: "dense_edge";
  recall_class_aware?: boolean;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  limit?: number;
  neighborhood_hops?: number;
  return_debug?: boolean;
  include_embeddings?: boolean;
  include_meta?: boolean;
  include_slots?: boolean;
  include_slots_preview?: boolean;
  slots_preview_keys?: number;
  max_nodes?: number;
  max_edges?: number;
  ranked_limit?: number;
  min_edge_weight?: number;
  min_edge_confidence?: number;
  context_token_budget?: number;
  context_char_budget?: number;
  context_compaction_profile?: "balanced" | "aggressive";
  memory_layer_preference?: { allowed_layers: Array<"L0" | "L1" | "L2" | "L3" | "L4" | "L5"> };
  rules_context?: unknown;
  rules_include_shadow?: boolean;
  rules_limit?: number;
} & AionisRequestPayload;

export type AionisPlanningContextRequest = {
  tenant_id?: string;
  scope?: string;
  query_text: string;
  context: unknown;
  recall_strategy?: "local" | "balanced" | "global";
  recall_mode?: "dense_edge";
  recall_class_aware?: boolean;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  include_shadow?: boolean;
  rules_limit?: number;
  run_id?: string;
  tool_candidates?: string[];
  tool_strict?: boolean;
  limit?: number;
  neighborhood_hops?: number;
  return_debug?: boolean;
  include_embeddings?: boolean;
  include_meta?: boolean;
  include_slots?: boolean;
  include_slots_preview?: boolean;
  slots_preview_keys?: number;
  max_nodes?: number;
  max_edges?: number;
  ranked_limit?: number;
  min_edge_weight?: number;
  min_edge_confidence?: number;
  context_token_budget?: number;
  context_char_budget?: number;
  context_compaction_profile?: "balanced" | "aggressive";
  context_optimization_profile?: "balanced" | "aggressive";
  memory_layer_preference?: { allowed_layers: Array<"L0" | "L1" | "L2" | "L3" | "L4" | "L5"> };
  return_layered_context?: boolean;
  context_layers?: Record<string, unknown>;
  static_context_blocks?: Array<Record<string, unknown>>;
  static_injection?: Record<string, unknown>;
  execution_result_summary?: Record<string, unknown>;
  execution_artifacts?: Array<Record<string, unknown>>;
  execution_evidence?: Array<Record<string, unknown>>;
  execution_state_v1?: Record<string, unknown>;
  execution_packet_v1?: Record<string, unknown>;
} & AionisRequestPayload;

export type AionisKickoffRecommendation = {
  source_kind: "experience_intelligence" | "tool_selection";
  history_applied: boolean;
  selected_tool: string | null;
  file_path: string | null;
  next_action: string | null;
} & AionisPassthroughObject;

export type AionisKickoffRecommendationRequest = {
  tenant_id?: string;
  scope?: string;
  run_id?: string;
  query_text: string;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  context?: unknown;
  candidates?: string[];
  include_shadow?: boolean;
  rules_limit?: number;
  strict?: boolean;
  reorder_candidates?: boolean;
  execution_result_summary?: Record<string, unknown>;
  execution_artifacts?: Array<Record<string, unknown>>;
  execution_evidence?: Array<Record<string, unknown>>;
  execution_state_v1?: Record<string, unknown>;
  workflow_limit?: number;
} & AionisRequestPayload;

export type AionisKickoffRecommendationResponse = {
  summary_version: "kickoff_recommendation_v1";
  tenant_id: string;
  scope: string;
  query_text: string;
  kickoff_recommendation: AionisKickoffRecommendation | null;
  policy_contract?: AionisPolicyContract | null;
  rationale: {
    summary: string;
  } & AionisPassthroughObject;
} & AionisRuntimeResponse;

export type AionisDelegationLearningSummary = {
  task_family: string | null;
  matched_records: number;
  truncated: boolean;
  route_role_counts: Record<string, number>;
  record_outcome_counts: Record<string, number>;
  recommendation_count: number;
} & AionisPassthroughObject;

export type AionisDelegationLearningProjection = {
  summary_version: "delegation_learning_projection_v1";
  learning_summary: AionisDelegationLearningSummary;
  learning_recommendations: AionisDelegationRecordsLearningRecommendation[];
} & AionisPassthroughObject;

export type AionisPolicyHintEntry = {
  hint_id: string;
  source_kind: "trusted_pattern" | "contested_pattern" | "stable_workflow" | "rehydration_candidate";
  hint_kind: "tool_preference" | "tool_avoidance" | "workflow_reuse" | "payload_rehydration";
  action: "prefer" | "avoid" | "reuse" | "rehydrate";
  source_anchor_id: string;
  source_anchor_level: string | null;
  selected_tool: string | null;
  workflow_signature: string | null;
  file_path: string | null;
  target_files: string[];
  rehydration_mode: string | null;
  confidence: number | null;
  priority: number;
  reason: string;
} & AionisPassthroughObject;

export type AionisPolicyHintPack = {
  summary_version: "policy_hint_pack_v1";
  total_hints: number;
  tool_preference_count: number;
  tool_avoidance_count: number;
  workflow_reuse_count: number;
  payload_rehydration_count: number;
  hints: AionisPolicyHintEntry[];
} & AionisPassthroughObject;

export type AionisDerivedPolicySurface = {
  summary_version: "derived_policy_v1";
  policy_kind: "tool_preference";
  source_kind: "trusted_pattern" | "stable_workflow" | "blended";
  policy_state: "candidate" | "stable";
  selected_tool: string;
  workflow_signature: string | null;
  file_path: string | null;
  target_files: string[];
  confidence: number;
  supporting_anchor_ids: string[];
  reason: string;
  evidence: {
    trusted_pattern_count: number;
    stable_workflow_count: number;
    usage_count: number;
    reuse_success_count: number;
    reuse_failure_count: number;
    feedback_quality: number | null;
  } & AionisPassthroughObject;
} & AionisPassthroughObject;

export type AionisPolicyContract = {
  summary_version: "policy_contract_v1";
  policy_kind: "tool_preference";
  source_kind: "trusted_pattern" | "stable_workflow" | "blended";
  policy_state: "candidate" | "stable";
  policy_memory_state: "active" | "contested" | "retired";
  activation_mode: "hint" | "default";
  materialization_state: "computed" | "persisted";
  history_applied: boolean;
  selected_tool: string;
  avoid_tools: string[];
  workflow_signature: string | null;
  file_path: string | null;
  target_files: string[];
  next_action: string | null;
  rehydration_mode: string | null;
  confidence: number;
  source_anchor_ids: string[];
  policy_memory_id: string | null;
  reason: string;
} & AionisPassthroughObject;

export type AionisPersistedPolicyMemory = {
  node_id: string;
  node_uri: string;
  client_id: string;
  policy_memory_signature: string;
  selected_tool: string;
  policy_state: "candidate" | "stable";
  policy_memory_state: "active" | "contested" | "retired";
  activation_mode: "hint" | "default";
  policy_contract: AionisPolicyContract;
} & AionisPassthroughObject;

export type AionisPolicyReviewSummary = {
  summary_version: "policy_review_summary_v1";
  persisted_policy_count: number;
  active_policy_count: number;
  contested_policy_count: number;
  retired_policy_count: number;
  review_recommended: boolean;
  selected_policy_memory_id: string | null;
  selected_policy_memory_state: "active" | "contested" | "retired" | null;
  attention_policy: ({
    node_id: string;
    policy_memory_state: "active" | "contested" | "retired";
    selected_tool: string | null;
    file_path: string | null;
    workflow_signature: string | null;
    summary: string | null;
    feedback_quality: number | null;
    last_feedback_at: string | null;
    last_materialized_at: string | null;
    review_reason: string;
  } & AionisPassthroughObject) | null;
} & AionisPassthroughObject;

export type AionisPolicyGovernanceContract = {
  contract_version: "policy_governance_contract_v1";
  action: "none" | "monitor" | "refresh" | "retire" | "reactivate";
  applies: boolean;
  review_required: boolean;
  policy_memory_id: string | null;
  current_state: "active" | "contested" | "retired" | null;
  target_state: "active" | "contested" | "retired" | null;
  selected_tool: string | null;
  file_path: string | null;
  workflow_signature: string | null;
  rationale: string;
  next_action: string | null;
} & AionisPassthroughObject;

export type AionisPolicyGovernanceApplyPayload = {
  payload_version: "policy_governance_apply_payload_v1";
  route: string;
  method: "POST";
  action: "refresh" | "retire" | "reactivate";
  policy_memory_id: string;
  selected_tool: string | null;
  current_state: "active" | "contested" | "retired" | null;
  target_state: "active" | "contested" | "retired" | null;
  requires_live_context: boolean;
  request_body: Record<string, unknown>;
  rationale: string;
} & AionisPassthroughObject;

export type AionisPolicyGovernanceApplyResult = {
  ok: boolean;
  auto_applied: boolean;
  attempted: boolean;
  trigger: string;
  surface: string;
  action: "refresh" | "retire" | "reactivate";
  policy_memory_id: string;
  previous_state?: "active" | "contested" | "retired";
  next_state?: "active" | "contested" | "retired";
  policy_memory?: AionisPersistedPolicyMemory | null;
  error?: { code: string; message: string } | null;
} & AionisPassthroughObject;

export type AionisContextOperatorProjection = {
  delegation_learning?: AionisDelegationLearningProjection;
} & AionisPassthroughObject;

export type AionisExperienceIntelligenceResponse = {
  summary_version: "experience_intelligence_v1";
  tenant_id: string;
  scope: string;
  query_text: string;
  recommendation: {
    history_applied: boolean;
    tool: {
      selected_tool: string | null;
      ordered_tools: string[];
      preferred_tools: string[];
      allowed_tools: string[];
      trusted_pattern_anchor_ids: string[];
      candidate_pattern_anchor_ids: string[];
      suppressed_pattern_anchor_ids: string[];
    } & AionisPassthroughObject;
    path: {
      source_kind: "recommended_workflow" | "candidate_workflow" | "none";
      anchor_id: string | null;
      workflow_signature: string | null;
      title: string | null;
      summary: string | null;
      file_path: string | null;
      target_files: string[];
      next_action: string | null;
      confidence: number | null;
      tool_set: string[];
    } & AionisPassthroughObject;
    combined_next_action: string | null;
  } & AionisPassthroughObject;
  policy_hints: AionisPolicyHintPack;
  derived_policy: AionisDerivedPolicySurface | null;
  policy_contract: AionisPolicyContract | null;
  learning_summary: AionisDelegationLearningSummary;
  learning_recommendations: AionisDelegationRecordsLearningRecommendation[];
  rationale: {
    summary: string;
  } & AionisPassthroughObject;
} & AionisRuntimeResponse;

export type AionisTaskStartRequest = AionisKickoffRecommendationRequest;

export type AionisExperienceIntelligenceRequest = AionisKickoffRecommendationRequest;

export type AionisTaskStartAction = {
  action_kind: "file_step" | "tool_step";
  source_kind: "experience_intelligence" | "tool_selection";
  history_applied: boolean;
  selected_tool: string;
  file_path: string | null;
  next_action: string | null;
} & AionisPassthroughObject;

export type AionisTaskStartResponse = Omit<AionisKickoffRecommendationResponse, "summary_version"> & {
  summary_version: "task_start_v1";
  first_action: AionisTaskStartAction | null;
};

export type AionisContextAssembleRequest = AionisPlanningContextRequest;
export type AionisExecutionIntrospectRequest = {
  tenant_id?: string;
  scope?: string;
  run_id?: string;
  session_id?: string;
  limit?: number;
} & AionisRequestPayload;

export type AionisExecutionPacketAssemblySummary = {
  packet_source_mode: string | null;
  state_first_assembly: boolean | null;
  execution_packet_v1_present: boolean | null;
  execution_state_v1_present: boolean | null;
} & AionisPassthroughObject;

export type AionisExecutionStrategySummary = {
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
} & AionisPassthroughObject;

export type AionisExecutionCollaborationSummary = {
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
} & AionisPassthroughObject;

export type AionisExecutionContinuitySnapshotSummary = {
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
} & AionisPassthroughObject;

export type AionisExecutionForgettingSummary = {
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
} & AionisPassthroughObject;

export type AionisExecutionCollaborationRoutingSummary = {
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
} & AionisPassthroughObject;

export type AionisExecutionDelegationPacketRecord = {
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
} & AionisPassthroughObject;

export type AionisExecutionDelegationReturnRecord = {
  version: 1;
  role: string;
  status: string;
  summary: string;
  evidence: string[];
  working_set: string[];
  acceptance_checks: string[];
  source_mode: "memory_only" | "packet_backed";
} & AionisPassthroughObject;

export type AionisExecutionArtifactRoutingRecord = {
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
} & AionisPassthroughObject;

export type AionisExecutionDelegationRecordsSummary = {
  summary_version: "execution_delegation_records_v1";
  record_mode: "memory_only" | "packet_backed";
  route_role: string;
  packet_count: number;
  return_count: number;
  artifact_routing_count: number;
  missing_record_types: string[];
  delegation_packets: AionisExecutionDelegationPacketRecord[];
  delegation_returns: AionisExecutionDelegationReturnRecord[];
  artifact_routing_records: AionisExecutionArtifactRoutingRecord[];
} & AionisPassthroughObject;

export type AionisExecutionRoutingSignalSummary = {
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
} & AionisPassthroughObject;

export type AionisExecutionMaintenanceSummary = {
  summary_version: "execution_maintenance_summary_v1";
  forgotten_items: number;
  forgotten_by_reason: Record<string, number>;
  suppressed_pattern_count: number;
  stable_workflow_count: number;
  promotion_ready_workflow_count: number;
  selected_memory_layers: string[];
  primary_savings_levers: string[];
  recommended_action: string;
} & AionisPassthroughObject;

export type AionisExecutionInstrumentationSummary = {
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
} & AionisPassthroughObject;

export type AionisExecutionSummary = {
  summary_version: "execution_summary_v1";
  planner_packet: AionisPassthroughObject | null;
  pattern_signals: AionisPassthroughObject[];
  workflow_signals: AionisPassthroughObject[];
  packet_assembly: AionisExecutionPacketAssemblySummary;
  strategy_summary: AionisExecutionStrategySummary;
  collaboration_summary: AionisExecutionCollaborationSummary;
  continuity_snapshot_summary: AionisExecutionContinuitySnapshotSummary;
  routing_signal_summary: AionisExecutionRoutingSignalSummary;
  maintenance_summary: AionisExecutionMaintenanceSummary;
  forgetting_summary: AionisExecutionForgettingSummary;
  collaboration_routing_summary: AionisExecutionCollaborationRoutingSummary;
  delegation_records_summary: AionisExecutionDelegationRecordsSummary;
  instrumentation_summary: AionisExecutionInstrumentationSummary;
  action_packet_summary: AionisPassthroughObject;
  pattern_signal_summary: AionisPassthroughObject;
  workflow_signal_summary: AionisPassthroughObject;
  workflow_lifecycle_summary: AionisPassthroughObject;
  workflow_maintenance_summary: AionisPassthroughObject;
  pattern_lifecycle_summary: AionisPassthroughObject;
  pattern_maintenance_summary: AionisPassthroughObject;
} & AionisRuntimeResponse;

export type AionisExecutionIntrospectResponse = {
  summary_version: "execution_memory_introspection_v1";
  tenant_id: string;
  scope: string;
  inventory: AionisPassthroughObject;
  continuity_projection_report: AionisPassthroughObject;
  demo_surface: AionisPassthroughObject;
  execution_summary: AionisExecutionSummary;
  recommended_workflows: AionisPassthroughObject[];
  candidate_workflows: AionisPassthroughObject[];
  candidate_patterns: AionisPassthroughObject[];
  trusted_patterns: AionisPassthroughObject[];
  contested_patterns: AionisPassthroughObject[];
  rehydration_candidates: AionisPassthroughObject[];
  supporting_knowledge: AionisPassthroughObject[];
  pattern_signals: AionisPassthroughObject[];
  workflow_signals: AionisPassthroughObject[];
  action_packet_summary: AionisPassthroughObject;
  pattern_signal_summary: AionisPassthroughObject;
  workflow_signal_summary: AionisPassthroughObject;
  workflow_lifecycle_summary: AionisPassthroughObject;
  workflow_maintenance_summary: AionisPassthroughObject;
  pattern_lifecycle_summary: AionisPassthroughObject;
  pattern_maintenance_summary: AionisPassthroughObject;
} & AionisRuntimeResponse;

export type AionisPlanningContextResponse = {
  tenant_id: string;
  scope: string;
  execution_kernel: AionisPassthroughObject;
  execution_summary: AionisExecutionSummary;
  query: AionisPassthroughObject;
  recall: AionisPassthroughObject;
  rules?: AionisPassthroughObject;
  tools?: AionisPassthroughObject;
  runtime_tool_hints: AionisPassthroughObject[];
  planner_packet: AionisPassthroughObject;
  pattern_signals: AionisPassthroughObject[];
  workflow_signals: AionisPassthroughObject[];
  planning_summary: AionisPassthroughObject;
  kickoff_recommendation?: AionisKickoffRecommendation | null;
  operator_projection?: AionisContextOperatorProjection;
  layered_context: AionisPassthroughObject;
  cost_signals: AionisPassthroughObject;
} & AionisRuntimeResponse;

export type AionisContextAssembleResponse = {
  tenant_id: string;
  scope: string;
  execution_kernel: AionisPassthroughObject;
  execution_summary: AionisExecutionSummary;
  query: AionisPassthroughObject;
  recall: AionisPassthroughObject;
  rules?: AionisPassthroughObject;
  tools?: AionisPassthroughObject;
  runtime_tool_hints: AionisPassthroughObject[];
  planner_packet: AionisPassthroughObject;
  pattern_signals: AionisPassthroughObject[];
  workflow_signals: AionisPassthroughObject[];
  assembly_summary: AionisPassthroughObject;
  kickoff_recommendation?: AionisKickoffRecommendation | null;
  operator_projection?: AionisContextOperatorProjection;
  layered_context: AionisPassthroughObject;
  cost_signals: AionisPassthroughObject;
} & AionisRuntimeResponse;

export type AionisMemoryFindRequest = {
  tenant_id?: string;
  scope?: string;
  query_text?: string;
  node_ids?: string[];
  anchor_ids?: string[];
  limit?: number;
} & AionisRequestPayload;

export type AionisMemoryResolveRequest = {
  tenant_id?: string;
  scope?: string;
  uri: string;
  include_meta?: boolean;
  include_slots?: boolean;
  include_slots_preview?: boolean;
  slots_preview_keys?: number;
} & AionisRequestPayload;

export type AionisMemoryFeedbackRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  input_text?: string;
  input_sha256?: string;
  note?: string;
  labels?: string[];
} & AionisRequestPayload;

export type AionisRuleStateRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  rule_id?: string;
  state?: string;
  note?: string;
} & AionisRequestPayload;

export type AionisRulesEvaluateRequest = {
  tenant_id?: string;
  scope?: string;
  context: unknown;
  include_shadow?: boolean;
  limit?: number;
} & AionisRequestPayload;

export type AionisToolsSelectRequest = {
  tenant_id?: string;
  scope?: string;
  context: unknown;
  candidates: string[];
  tool_strict?: boolean;
  include_shadow?: boolean;
  rules_limit?: number;
  run_id?: string;
} & AionisRequestPayload;

export type AionisToolsDecisionRequest = {
  tenant_id?: string;
  scope?: string;
  decision_id?: string;
  decision_uri?: string;
  run_id?: string;
} & AionisRequestPayload;

export type AionisToolsRunRequest = {
  tenant_id?: string;
  scope?: string;
  run_id: string;
  decision_limit?: number;
  include_feedback?: boolean;
  feedback_limit?: number;
} & AionisRequestPayload;

export type AionisToolsRunsListRequest = {
  tenant_id?: string;
  scope?: string;
  limit?: number;
} & AionisRequestPayload;

export type AionisToolsFeedbackRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  run_id?: string;
  decision_id?: string;
  decision_uri?: string;
  outcome: "positive" | "negative" | "neutral";
  context: unknown;
  candidates: string[];
  selected_tool: string;
  include_shadow?: boolean;
  rules_limit?: number;
  target?: "tool" | "all";
  note?: string;
  input_text?: string;
  input_sha256?: string;
  governance_review?: Record<string, unknown>;
} & AionisRequestPayload;

export type AionisToolsFeedbackResponse = {
  ok: true;
  scope: string;
  tenant_id: string;
  updated_rules: number;
  rule_node_ids: string[];
  commit_id: string | null;
  commit_uri?: string | null;
  commit_hash?: string | null;
  decision_id: string;
  decision_uri: string;
  decision_link_mode: "provided" | "inferred" | "created_from_feedback";
  decision_policy_sha256: string;
  pattern_anchor?: AionisPassthroughObject | null;
  policy_memory?: AionisPersistedPolicyMemory | null;
  governance_preview?: AionisPassthroughObject | null;
} & AionisRuntimeResponse;

export type AionisPolicyGovernanceApplyRequest = AionisKickoffRecommendationRequest & {
  actor?: string;
  policy_memory_id: string;
  action: "refresh" | "retire" | "reactivate";
  reason?: string;
};

export type AionisPolicyGovernanceApplyResponse = {
  ok: true;
  tenant_id: string;
  scope: string;
  action: "refresh" | "retire" | "reactivate";
  applied: boolean;
  actor: string | null;
  reason: string | null;
  policy_memory_id: string;
  previous_state: "active" | "contested" | "retired";
  next_state: "active" | "contested" | "retired";
  governance_contract: AionisPolicyGovernanceContract;
  live_policy_contract: AionisPolicyContract | null;
  policy_memory: AionisPersistedPolicyMemory;
} & AionisRuntimeResponse;

export type AionisPatternSuppressRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  anchor_id: string;
  reason: string;
  until?: string;
  mode?: "shadow_learn" | "hard_freeze";
} & AionisRequestPayload;

export type AionisPatternUnsuppressRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  anchor_id: string;
  reason?: string;
} & AionisRequestPayload;

export type AionisAnchorRehydratePayloadRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  anchor_id?: string;
  anchor_uri?: string;
  mode?: "summary_only" | "partial" | "full" | "differential";
  include_linked_decisions?: boolean;
  reason?: string;
  adjudication?: Record<string, unknown>;
} & AionisRequestPayload;

export type AionisSessionCreateRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  session_id?: string;
  title?: string;
  text_summary?: string;
  input_text?: string;
  metadata?: Record<string, unknown>;
  auto_embed?: boolean;
  memory_lane?: "private" | "shared";
  producer_agent_id?: string;
  owner_agent_id?: string;
  owner_team_id?: string;
  execution_state_v1?: Record<string, unknown>;
  execution_packet_v1?: Record<string, unknown>;
  execution_transitions_v1?: Array<Record<string, unknown>>;
} & AionisRequestPayload;

export type AionisSessionListQuery = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  limit?: number;
  cursor?: string;
} & Record<string, string | number | boolean | null | undefined>;

export type AionisSessionEventWriteRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  session_id: string;
  event_text?: string;
  input_text?: string;
  input_sha256?: string;
  metadata?: Record<string, unknown>;
} & AionisRequestPayload;

export type AionisSessionEventsQuery = {
  session_id: string;
  tenant_id?: string;
  scope?: string;
  limit?: number;
  cursor?: string;
} & Record<string, string | number | boolean | null | undefined>;

export type AionisMemoryPackExportRequest = {
  tenant_id?: string;
  scope?: string;
  node_ids?: string[];
  edge_ids?: string[];
  include_embeddings?: boolean;
} & AionisRequestPayload;

export type AionisMemoryPackImportRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  pack: Record<string, unknown>;
  mode?: "merge" | "replace";
} & AionisRequestPayload;

export type AionisArchiveRehydrateRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  node_ids?: string[];
  client_ids?: string[];
  target_tier?: "warm" | "hot";
  reason?: string;
  input_text?: string;
  input_sha256?: string;
} & AionisRequestPayload;

export type AionisNodesActivateRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  node_ids?: string[];
  client_ids?: string[];
  run_id?: string;
  outcome?: "positive" | "negative" | "neutral";
  activate?: boolean;
  reason?: string;
  input_text?: string;
  input_sha256?: string;
} & AionisRequestPayload;

export type AionisDelegationRecordsWriteRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  memory_lane?: "private" | "shared";
  producer_agent_id?: string;
  owner_agent_id?: string;
  owner_team_id?: string;
  record_id?: string;
  run_id?: string;
  handoff_anchor?: string;
  handoff_uri?: string;
  route_role?: string;
  task_family?: string;
  title?: string;
  summary?: string;
  input_text?: string;
  tags?: string[];
  delegation_records_v1: AionisExecutionDelegationRecordsSummary;
  execution_result_summary?: Record<string, unknown>;
  execution_artifacts?: Array<Record<string, unknown>>;
  execution_evidence?: Array<Record<string, unknown>>;
  execution_state_v1?: Record<string, unknown>;
  execution_packet_v1?: Record<string, unknown>;
} & AionisRequestPayload;

export type AionisDelegationRecordsWriteResponse = {
  summary_version: "delegation_records_write_v1";
  tenant_id: string;
  scope: string;
  commit_id: string;
  commit_uri: string | null;
  record_event: {
    node_id: string;
    uri: string;
    client_id: string;
    record_id: string;
    memory_lane: "private" | "shared";
    run_id: string | null;
    handoff_anchor: string | null;
    route_role: string;
    task_family: string | null;
    family_scope: string;
    record_mode: "memory_only" | "packet_backed";
  } | null;
  delegation_records_v1: AionisExecutionDelegationRecordsSummary;
  execution_result_summary: Record<string, unknown> | null;
  execution_artifacts: Array<Record<string, unknown>>;
  execution_evidence: Array<Record<string, unknown>>;
  execution_state_v1: Record<string, unknown> | null;
  execution_packet_v1: Record<string, unknown> | null;
} & AionisRuntimeResponse;

export type AionisDelegationRecordsFindRequest = {
  tenant_id?: string;
  scope?: string;
  record_id?: string;
  run_id?: string;
  handoff_anchor?: string;
  handoff_uri?: string;
  route_role?: string;
  task_family?: string;
  family_scope?: string;
  record_mode?: "memory_only" | "packet_backed";
  memory_lane?: "private" | "shared";
  consumer_agent_id?: string;
  consumer_team_id?: string;
  include_payload?: boolean;
  limit?: number;
  offset?: number;
} & AionisRequestPayload;

export type AionisDelegationRecordSideOutputSummary = {
  result_present: boolean;
  artifact_count: number;
  evidence_count: number;
  execution_state_v1_present: boolean;
  execution_packet_v1_present: boolean;
} & Record<string, string | number | boolean | null | undefined>;

export type AionisDelegationRecordFindEntry = {
  uri: string;
  node_id: string;
  client_id: string | null;
  record_id: string | null;
  title: string | null;
  text_summary: string | null;
  memory_lane: "private" | "shared";
  producer_agent_id: string | null;
  owner_agent_id: string | null;
  owner_team_id: string | null;
  created_at: string;
  updated_at: string;
  commit_id: string | null;
  run_id: string | null;
  handoff_anchor: string | null;
  handoff_uri: string | null;
  route_role: string;
  task_family: string | null;
  family_scope: string;
  record_mode: "memory_only" | "packet_backed";
  tags: string[];
  delegation_records_v1: AionisExecutionDelegationRecordsSummary;
  execution_side_outputs: AionisDelegationRecordSideOutputSummary;
  execution_result_summary?: Record<string, unknown> | null;
  execution_artifacts?: Array<Record<string, unknown>>;
  execution_evidence?: Array<Record<string, unknown>>;
  execution_state_v1?: Record<string, unknown> | null;
  execution_packet_v1?: Record<string, unknown> | null;
} & AionisRuntimeResponse;

export type AionisDelegationRecordsFindSummary = {
  summary_version: "delegation_records_find_summary_v1";
  returned_records: number;
  has_more: boolean;
  invalid_records: number;
  filters_applied: string[];
  record_mode_counts: Record<string, number>;
  memory_lane_counts: Record<string, number>;
  route_role_counts: Record<string, number>;
  task_family_counts: Record<string, number>;
  missing_record_type_counts: Record<string, number>;
  return_status_counts: Record<string, number>;
  artifact_source_counts: Record<string, number>;
  packet_count: number;
  return_count: number;
  artifact_routing_count: number;
  run_id_count: number;
  handoff_anchor_count: number;
} & AionisRuntimeResponse;

export type AionisDelegationRecordsFindResponse = {
  summary_version: "delegation_records_find_v1";
  tenant_id: string;
  scope: string;
  records: AionisDelegationRecordFindEntry[];
  summary: AionisDelegationRecordsFindSummary;
} & AionisRuntimeResponse;

export type AionisDelegationRecordsAggregateRequest = {
  tenant_id?: string;
  scope?: string;
  record_id?: string;
  run_id?: string;
  handoff_anchor?: string;
  handoff_uri?: string;
  route_role?: string;
  task_family?: string;
  family_scope?: string;
  record_mode?: "memory_only" | "packet_backed";
  memory_lane?: "private" | "shared";
  consumer_agent_id?: string;
  consumer_team_id?: string;
  limit?: number;
} & AionisRequestPayload;

export type AionisDelegationRecordsAggregateBucket = {
  key: string;
  record_count: number;
  packet_count: number;
  return_count: number;
  artifact_routing_count: number;
  record_mode_counts: Record<string, number>;
  task_family_counts?: Record<string, number>;
  route_role_counts?: Record<string, number>;
  return_status_counts: Record<string, number>;
  artifact_source_counts: Record<string, number>;
} & AionisRuntimeResponse;

export type AionisDelegationRecordsAggregateRefStat = {
  ref: string;
  ref_kind: "artifact" | "evidence";
  count: number;
  source_counts: Record<string, number>;
} & AionisRuntimeResponse;

export type AionisDelegationRecordsAggregateStringStat = {
  value: string;
  count: number;
} & AionisRuntimeResponse;

export type AionisDelegationRecordsReusablePattern = {
  route_role: string;
  task_family: string;
  record_count: number;
  record_mode_counts: Record<string, number>;
  record_outcome_counts: Record<string, number>;
  sample_mission: string | null;
  sample_acceptance_checks: string[];
  sample_working_set_files: string[];
  sample_artifact_refs: string[];
} & AionisRuntimeResponse;

export type AionisDelegationRecordsLearningRecommendation = {
  recommendation_kind:
    | "capture_missing_returns"
    | "review_blocked_pattern"
    | "increase_artifact_capture"
    | "promote_reusable_pattern";
  priority: "high" | "medium" | "low";
  route_role: string | null;
  task_family: string | null;
  recommended_action: string;
  rationale: string;
  sample_mission: string | null;
  sample_acceptance_checks: string[];
  sample_working_set_files: string[];
  sample_artifact_refs: string[];
} & AionisRuntimeResponse;

export type AionisDelegationRecordsAggregateSummary = {
  summary_version: "delegation_records_aggregate_summary_v1";
  matched_records: number;
  truncated: boolean;
  invalid_records: number;
  filters_applied: string[];
  record_mode_counts: Record<string, number>;
  memory_lane_counts: Record<string, number>;
  route_role_counts: Record<string, number>;
  task_family_counts: Record<string, number>;
  missing_record_type_counts: Record<string, number>;
  return_status_counts: Record<string, number>;
  normalized_return_status_counts: Record<string, number>;
  record_outcome_counts: Record<string, number>;
  artifact_source_counts: Record<string, number>;
  packet_count: number;
  return_count: number;
  artifact_routing_count: number;
  run_id_count: number;
  handoff_anchor_count: number;
  records_with_returns: number;
  records_with_missing_types: number;
  records_with_payload_result: number;
  records_with_payload_artifacts: number;
  records_with_payload_evidence: number;
  records_with_payload_state: number;
  records_with_payload_packet: number;
  completion_rate: number;
  blocked_rate: number;
  missing_return_rate: number;
  route_role_buckets: AionisDelegationRecordsAggregateBucket[];
  task_family_buckets: AionisDelegationRecordsAggregateBucket[];
  top_reusable_patterns: AionisDelegationRecordsReusablePattern[];
  learning_recommendations: AionisDelegationRecordsLearningRecommendation[];
  top_artifact_refs: AionisDelegationRecordsAggregateRefStat[];
  top_acceptance_checks: AionisDelegationRecordsAggregateStringStat[];
  top_working_set_files: AionisDelegationRecordsAggregateStringStat[];
} & AionisRuntimeResponse;

export type AionisDelegationRecordsAggregateResponse = {
  summary_version: "delegation_records_aggregate_v1";
  tenant_id: string;
  scope: string;
  summary: AionisDelegationRecordsAggregateSummary;
} & AionisRuntimeResponse;

export type AionisHandoffStoreRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  handoff_kind: string;
  anchor: string;
  summary: string;
  handoff_text: string;
  memory_lane?: "private" | "shared";
  file_path?: string;
  repo_root?: string;
  symbol?: string;
  risk?: string;
  acceptance_checks?: string[];
  tags?: string[];
  target_files?: string[];
  next_action?: string;
  must_change?: string[];
  must_remove?: string[];
  must_keep?: string[];
  execution_result_summary?: Record<string, unknown>;
  execution_artifacts?: Array<Record<string, unknown>>;
  execution_evidence?: Array<Record<string, unknown>>;
  execution_state_v1?: Record<string, unknown>;
  execution_packet_v1?: Record<string, unknown>;
  control_profile_v1?: Record<string, unknown>;
  execution_transitions_v1?: Array<Record<string, unknown>>;
} & AionisRequestPayload;

export type AionisHandoffRecoverRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  handoff_id?: string;
  handoff_uri?: string;
  anchor?: string;
  handoff_kind?: string;
  repo_root?: string;
  file_path?: string;
  symbol?: string;
  include_payload?: boolean;
} & AionisRequestPayload;

export type AionisContinuityReviewPackRequest = AionisHandoffRecoverRequest;

export type AionisContinuityFocusItem = {
  source_kind: string;
  continuity_kind: string;
  continuity_phase: string;
  occurred_at: string | null;
  title: string | null;
  text_summary: string | null;
  anchor?: string | null;
  handoff_kind?: string | null;
  file_path?: string | null;
  repo_root?: string | null;
  symbol?: string | null;
  next_action?: string | null;
} & AionisPassthroughObject;

export type AionisContinuityInspectSummary = {
  inspect_version: "continuity_inspect_v1";
  latest_handoff: AionisContinuityFocusItem | null;
  latest_resume: AionisContinuityFocusItem | null;
  latest_terminal_run: AionisContinuityFocusItem | null;
} & AionisPassthroughObject;

export type AionisContinuityReviewContract = {
  target_files: string[];
  next_action: string | null;
  acceptance_checks: string[];
  must_change: string[];
  must_remove: string[];
  must_keep: string[];
  rollback_required: boolean;
} & AionisPassthroughObject;

export type AionisContinuityReviewPackSummary = {
  pack_version: "continuity_review_pack_v1";
  latest_handoff: AionisContinuityFocusItem | null;
  latest_resume: AionisContinuityFocusItem | null;
  latest_terminal_run: AionisContinuityFocusItem | null;
  recovered_handoff: AionisPassthroughObject | null;
  review_contract: AionisContinuityReviewContract | null;
} & AionisPassthroughObject;

export type AionisContinuityReviewPackResponse = {
  tenant_id: string;
  scope: string;
  sources: AionisPassthroughObject[];
  items: AionisPassthroughObject[];
  page: {
    limit: number;
    offset: number;
    returned: number;
    has_more: boolean;
  };
  counters?: {
    total_items?: number;
    returned_items?: number;
    source_count?: number;
  } & AionisPassthroughObject;
  continuity_inspect: AionisContinuityInspectSummary;
  continuity_review_pack: AionisContinuityReviewPackSummary;
} & AionisRuntimeResponse;

export type AionisEvolutionReviewPackRequest = AionisKickoffRecommendationRequest & {
  limit?: number;
};

export type AionisEvolutionInspectSummary = {
  summary_version: "evolution_inspect_summary_v1";
  history_applied: boolean;
  selected_tool: string | null;
  recommended_file_path: string | null;
  recommended_next_action: string | null;
  stable_workflow_count: number;
  promotion_ready_workflow_count: number;
  trusted_pattern_count: number;
  contested_pattern_count: number;
  suppressed_pattern_count: number;
} & AionisPassthroughObject;

export type AionisEvolutionInspectResponse = {
  summary_version: "evolution_inspect_v1";
  tenant_id: string;
  scope: string;
  query_text: string;
  experience_intelligence: AionisExperienceIntelligenceResponse;
  policy_hints?: AionisPolicyHintPack;
  derived_policy: AionisDerivedPolicySurface | null;
  policy_contract: AionisPolicyContract | null;
  policy_review: AionisPolicyReviewSummary;
  policy_governance_contract: AionisPolicyGovernanceContract;
  policy_governance_apply_payload: AionisPolicyGovernanceApplyPayload | null;
  policy_governance_apply_result: AionisPolicyGovernanceApplyResult | null;
  kickoff_recommendation: AionisKickoffRecommendationResponse;
  execution_introspection: AionisExecutionIntrospectResponse;
  evolution_summary: AionisEvolutionInspectSummary;
} & AionisPassthroughObject;

export type AionisEvolutionReviewContract = {
  selected_tool: string | null;
  file_path: string | null;
  target_files: string[];
  next_action: string | null;
  stable_workflow_anchor_id: string | null;
  promotion_ready_anchor_ids: string[];
  trusted_pattern_anchor_ids: string[];
  contested_pattern_anchor_ids: string[];
  suppressed_pattern_anchor_ids: string[];
} & AionisPassthroughObject;

export type AionisEvolutionDelegationLearningSummary = AionisDelegationLearningSummary;

export type AionisEvolutionReviewPackSummary = {
  pack_version: "evolution_review_pack_v1";
  stable_workflow: AionisPassthroughObject | null;
  promotion_ready_workflow: AionisPassthroughObject | null;
  trusted_pattern: AionisPassthroughObject | null;
  contested_pattern: AionisPassthroughObject | null;
  derived_policy: AionisDerivedPolicySurface | null;
  policy_contract: AionisPolicyContract | null;
  policy_review: AionisPolicyReviewSummary;
  policy_governance_contract: AionisPolicyGovernanceContract;
  policy_governance_apply_payload: AionisPolicyGovernanceApplyPayload | null;
  policy_governance_apply_result: AionisPolicyGovernanceApplyResult | null;
  review_contract: AionisEvolutionReviewContract;
  learning_summary: AionisEvolutionDelegationLearningSummary;
  learning_recommendations: AionisDelegationRecordsLearningRecommendation[];
} & AionisPassthroughObject;

export type AionisEvolutionReviewPackResponse = {
  summary_version: "evolution_review_pack_v1";
  tenant_id: string;
  scope: string;
  query_text: string;
  evolution_inspect: AionisEvolutionInspectResponse;
  evolution_review_pack: AionisEvolutionReviewPackSummary;
} & AionisRuntimeResponse;

export type AionisAgentMemoryInspectRequest = AionisExperienceIntelligenceRequest & {
  handoff_id?: string;
  handoff_uri?: string;
  anchor?: string;
  repo_root?: string;
  file_path?: string;
  symbol?: string;
  handoff_kind?: string;
  memory_lane?: "private" | "shared";
  include_payload?: boolean;
  session_id?: string;
  source_kind?: string;
  continuity_kind?: string;
  continuity_phase?: string;
  include_meta?: boolean;
  limit?: number;
  offset?: number;
};

export type AionisAgentMemoryInspectSummary = {
  summary_version: "agent_memory_inspect_summary_v1";
  has_continuity: boolean;
  latest_handoff_anchor: string | null;
  latest_resume_source_kind: string | null;
  selected_tool: string | null;
  recommended_file_path: string | null;
  recommended_next_action: string | null;
  history_applied: boolean;
  stable_workflow_count: number;
  promotion_ready_workflow_count: number;
  trusted_pattern_count: number;
  suppressed_pattern_count: number;
  handoff_related_items: number;
  resume_related_items: number;
  derived_policy_source_kind: "trusted_pattern" | "stable_workflow" | "blended" | null;
  derived_policy_selected_tool: string | null;
  derived_policy_state: "candidate" | "stable" | null;
  policy_activation_mode: "hint" | "default" | null;
  policy_review_recommended: boolean;
  contested_policy_count: number;
  retired_policy_count: number;
  selected_policy_memory_state: "active" | "contested" | "retired" | null;
  policy_governance_action: "none" | "monitor" | "refresh" | "retire" | "reactivate";
  policy_governance_review_required: boolean;
  policy_governance_apply_payload: AionisPolicyGovernanceApplyPayload | null;
  policy_governance_auto_applied: boolean;
};

export type AionisAgentMemoryInspectResponse = {
  summary_version: "agent_memory_inspect_v1";
  tenant_id: string;
  scope: string;
  query_text: string;
  continuity_inspect: AionisContinuityInspectSummary | null;
  continuity_review_pack: AionisContinuityReviewPackSummary | null;
  evolution_inspect: AionisEvolutionInspectResponse;
  evolution_review_pack: AionisEvolutionReviewPackSummary;
  derived_policy: AionisDerivedPolicySurface | null;
  policy_contract: AionisPolicyContract | null;
  policy_review: AionisPolicyReviewSummary;
  policy_governance_contract: AionisPolicyGovernanceContract;
  policy_governance_apply_payload: AionisPolicyGovernanceApplyPayload | null;
  policy_governance_apply_result: AionisPolicyGovernanceApplyResult | null;
  agent_memory_summary: AionisAgentMemoryInspectSummary;
} & AionisRuntimeResponse;

export type AionisAgentMemoryReviewPackRequest = AionisAgentMemoryInspectRequest;

export type AionisAgentMemoryReviewPackSummary = {
  pack_version: "agent_memory_review_pack_v1";
  selected_tool: string | null;
  recommended_file_path: string | null;
  recommended_next_action: string | null;
  latest_handoff_anchor: string | null;
  latest_resume_source_kind: string | null;
  stable_workflow_anchor_id: string | null;
  promotion_ready_anchor_ids: string[];
  trusted_pattern_anchor_ids: string[];
  contested_pattern_anchor_ids: string[];
  suppressed_pattern_anchor_ids: string[];
  handoff_target_files: string[];
  acceptance_checks: string[];
  must_change: string[];
  must_remove: string[];
  must_keep: string[];
  rollback_required: boolean;
  derived_policy: AionisDerivedPolicySurface | null;
  policy_contract: AionisPolicyContract | null;
  policy_review: AionisPolicyReviewSummary;
  policy_governance_contract: AionisPolicyGovernanceContract;
  policy_governance_apply_payload: AionisPolicyGovernanceApplyPayload | null;
  policy_governance_apply_result: AionisPolicyGovernanceApplyResult | null;
} & AionisPassthroughObject;

export type AionisAgentMemoryReviewPackResponse = {
  summary_version: "agent_memory_review_pack_v1";
  tenant_id: string;
  scope: string;
  query_text: string;
  agent_memory_inspect: AionisAgentMemoryInspectResponse;
  agent_memory_review_pack: AionisAgentMemoryReviewPackSummary;
} & AionisRuntimeResponse;

export type AionisAgentMemoryResumePackRequest = AionisAgentMemoryInspectRequest;

export type AionisAgentMemoryResumePackSummary = {
  pack_version: "agent_memory_resume_pack_v1";
  latest_handoff_anchor: string | null;
  latest_resume_source_kind: string | null;
  resume_selected_tool: string | null;
  resume_file_path: string | null;
  resume_target_files: string[];
  resume_next_action: string | null;
  stable_workflow_anchor_id: string | null;
  promotion_ready_anchor_ids: string[];
  trusted_pattern_anchor_ids: string[];
  suppressed_pattern_anchor_ids: string[];
  rollback_required: boolean;
  recovered_handoff: AionisPassthroughObject | null;
  execution_ready_handoff: AionisPassthroughObject | null;
  derived_policy: AionisDerivedPolicySurface | null;
  policy_contract: AionisPolicyContract | null;
  policy_governance_apply_payload: AionisPolicyGovernanceApplyPayload | null;
  policy_governance_apply_result: AionisPolicyGovernanceApplyResult | null;
} & AionisPassthroughObject;

export type AionisAgentMemoryResumePackResponse = {
  summary_version: "agent_memory_resume_pack_v1";
  tenant_id: string;
  scope: string;
  query_text: string;
  agent_memory_inspect: AionisAgentMemoryInspectResponse;
  agent_memory_resume_pack: AionisAgentMemoryResumePackSummary;
} & AionisRuntimeResponse;

export type AionisAgentMemoryHandoffPackRequest = AionisAgentMemoryInspectRequest;

export type AionisAgentMemoryHandoffPackSummary = {
  pack_version: "agent_memory_handoff_pack_v1";
  latest_handoff_anchor: string | null;
  handoff_kind: string | null;
  handoff_file_path: string | null;
  handoff_repo_root: string | null;
  handoff_symbol: string | null;
  handoff_target_files: string[];
  handoff_next_action: string | null;
  acceptance_checks: string[];
  must_change: string[];
  must_remove: string[];
  must_keep: string[];
  rollback_required: boolean;
  stable_workflow_anchor_id: string | null;
  trusted_pattern_anchor_ids: string[];
  suppressed_pattern_anchor_ids: string[];
  recovered_handoff: AionisPassthroughObject | null;
  execution_ready_handoff: AionisPassthroughObject | null;
  derived_policy: AionisDerivedPolicySurface | null;
  policy_contract: AionisPolicyContract | null;
  policy_governance_apply_payload: AionisPolicyGovernanceApplyPayload | null;
  policy_governance_apply_result: AionisPolicyGovernanceApplyResult | null;
} & AionisPassthroughObject;

export type AionisAgentMemoryHandoffPackResponse = {
  summary_version: "agent_memory_handoff_pack_v1";
  tenant_id: string;
  scope: string;
  query_text: string;
  agent_memory_inspect: AionisAgentMemoryInspectResponse;
  agent_memory_handoff_pack: AionisAgentMemoryHandoffPackSummary;
} & AionisRuntimeResponse;

export type AionisReplayRunStartRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  memory_lane?: "private" | "shared";
  producer_agent_id?: string;
  owner_agent_id?: string;
  owner_team_id?: string;
  run_id?: string;
  goal: string;
  context_snapshot_ref?: string;
  context_snapshot_hash?: string;
  metadata?: Record<string, unknown>;
} & AionisRequestPayload;

export type AionisReplayStepBeforeRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  memory_lane?: "private" | "shared";
  producer_agent_id?: string;
  owner_agent_id?: string;
  owner_team_id?: string;
  run_id: string;
  step_id?: string;
  decision_id?: string;
  step_index: number;
  tool_name: string;
  tool_input: unknown;
  expected_output_signature?: unknown;
  preconditions?: Array<Record<string, unknown>>;
  retry_policy?: Record<string, unknown>;
  safety_level?: "auto_ok" | "needs_confirm" | "manual_only";
  metadata?: Record<string, unknown>;
} & AionisRequestPayload;

export type AionisReplayStepAfterRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  memory_lane?: "private" | "shared";
  producer_agent_id?: string;
  owner_agent_id?: string;
  owner_team_id?: string;
  run_id: string;
  step_id?: string;
  step_index?: number;
  status: "success" | "failed" | "skipped" | "partial";
  output_signature?: unknown;
  postconditions?: Array<Record<string, unknown>>;
  artifact_refs?: string[];
  repair_applied?: boolean;
  repair_note?: string;
  error?: string;
  metadata?: Record<string, unknown>;
} & AionisRequestPayload;

export type AionisReplayRunEndRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  memory_lane?: "private" | "shared";
  producer_agent_id?: string;
  owner_agent_id?: string;
  owner_team_id?: string;
  run_id: string;
  status: "success" | "failed" | "partial";
  summary?: string;
  success_criteria?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
} & AionisRequestPayload;

export type AionisReplayRunGetRequest = {
  tenant_id?: string;
  scope?: string;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  run_id: string;
  include_steps?: boolean;
  include_artifacts?: boolean;
} & AionisRequestPayload;

export type AionisReplayPlaybookCompileFromRunRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  memory_lane?: "private" | "shared";
  producer_agent_id?: string;
  owner_agent_id?: string;
  owner_team_id?: string;
  run_id: string;
  playbook_id?: string;
  name?: string;
  version?: number;
  matchers?: Record<string, unknown>;
  success_criteria?: Record<string, unknown>;
  risk_profile?: "low" | "medium" | "high";
  allow_partial?: boolean;
  metadata?: Record<string, unknown>;
} & AionisRequestPayload;

export type AionisReplayPlaybookGetRequest = {
  tenant_id?: string;
  scope?: string;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  playbook_id: string;
} & AionisRequestPayload;

export type AionisReplayPlaybookCandidateRequest = {
  tenant_id?: string;
  scope?: string;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  playbook_id: string;
  version?: number;
  deterministic_gate?: Record<string, unknown>;
} & AionisRequestPayload;

export type AionisReplayPlaybookPromoteRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  memory_lane?: "private" | "shared";
  producer_agent_id?: string;
  owner_agent_id?: string;
  owner_team_id?: string;
  playbook_id: string;
  from_version?: number;
  target_status: "draft" | "shadow" | "active" | "disabled";
  note?: string;
  metadata?: Record<string, unknown>;
} & AionisRequestPayload;

export type AionisReplayPlaybookRunRequest = {
  tenant_id?: string;
  scope?: string;
  project_id?: string;
  actor?: string;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  memory_lane?: "private" | "shared";
  producer_agent_id?: string;
  owner_agent_id?: string;
  owner_team_id?: string;
  playbook_id: string;
  mode?: "strict" | "guided" | "simulate";
  version?: number;
  deterministic_gate?: Record<string, unknown>;
  params?: Record<string, unknown>;
  max_steps?: number;
} & AionisRequestPayload;

export type AionisReplayPlaybookDispatchRequest = {
  tenant_id?: string;
  scope?: string;
  project_id?: string;
  actor?: string;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  memory_lane?: "private" | "shared";
  producer_agent_id?: string;
  owner_agent_id?: string;
  owner_team_id?: string;
  playbook_id: string;
  version?: number;
  deterministic_gate?: Record<string, unknown>;
  fallback_mode?: "strict" | "guided" | "simulate";
  execute_fallback?: boolean;
  params?: Record<string, unknown>;
  max_steps?: number;
} & AionisRequestPayload;

export type AionisReplayPlaybookRepairRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  memory_lane?: "private" | "shared";
  producer_agent_id?: string;
  owner_agent_id?: string;
  owner_team_id?: string;
  playbook_id: string;
  from_version?: number;
  patch: Record<string, unknown>;
  note?: string;
  review_required?: boolean;
  target_status?: "draft" | "shadow" | "active" | "disabled";
  metadata?: Record<string, unknown>;
} & AionisRequestPayload;

export type AionisReplayPlaybookRepairReviewRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  memory_lane?: "private" | "shared";
  producer_agent_id?: string;
  owner_agent_id?: string;
  owner_team_id?: string;
  playbook_id: string;
  version?: number;
  action: "approve" | "reject";
  note?: string;
  auto_shadow_validate?: boolean;
  shadow_validation_mode?: "readiness" | "execute" | "execute_sandbox";
  shadow_validation_max_steps?: number;
  shadow_validation_params?: Record<string, unknown>;
  target_status_on_approve?: "draft" | "shadow" | "active" | "disabled";
  auto_promote_on_pass?: boolean;
  auto_promote_target_status?: "draft" | "shadow" | "active" | "disabled";
  auto_promote_gate?: Record<string, unknown>;
  learning_projection?: Record<string, unknown>;
  governance_review?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
} & AionisRequestPayload;

export type AionisAutomationCreateRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  automation_id: string;
  name: string;
  status?: "draft" | "shadow" | "active" | "disabled";
  graph: {
    nodes: Array<Record<string, unknown>>;
    edges?: Array<Record<string, unknown>>;
  };
  input_contract?: Record<string, unknown>;
  output_contract?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
} & AionisRequestPayload;

export type AionisAutomationValidateRequest = {
  tenant_id?: string;
  scope?: string;
  graph: {
    nodes: Array<Record<string, unknown>>;
    edges?: Array<Record<string, unknown>>;
  };
} & AionisRequestPayload;

export type AionisAutomationGetRequest = {
  tenant_id?: string;
  scope?: string;
  automation_id: string;
  version?: number;
} & AionisRequestPayload;

export type AionisAutomationListRequest = {
  tenant_id?: string;
  scope?: string;
  status?: "draft" | "shadow" | "active" | "disabled";
  promotion_only?: boolean;
  reviewer?: string;
  limit?: number;
} & AionisRequestPayload;

export type AionisAutomationRunRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  automation_id: string;
  version?: number;
  params?: Record<string, unknown>;
  options?: {
    execution_mode?: "default" | "shadow";
    allow_local_exec?: boolean;
    record_run?: boolean;
    stop_on_failure?: boolean;
  };
} & AionisRequestPayload;

export type AionisAutomationRunGetRequest = {
  tenant_id?: string;
  scope?: string;
  run_id: string;
  include_nodes?: boolean;
} & AionisRequestPayload;

export type AionisAutomationRunListRequest = {
  tenant_id?: string;
  scope?: string;
  automation_id?: string;
  actionable_only?: boolean;
  compensation_only?: boolean;
  reviewer?: string;
  compensation_owner?: string;
  escalation_owner?: string;
  workflow_bucket?: "retry" | "manual_cleanup" | "escalate" | "observe" | "other";
  sla_status?: "unset" | "on_track" | "at_risk" | "breached" | "met";
  limit?: number;
} & AionisRequestPayload;

export type AionisAutomationRunCancelRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  run_id: string;
  reason?: string;
} & AionisRequestPayload;

export type AionisAutomationRunResumeRequest = AionisAutomationRunCancelRequest;

export type AionisSandboxSessionCreateRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  profile?: "default" | "restricted";
  ttl_seconds?: number;
  metadata?: Record<string, unknown>;
} & AionisRequestPayload;

export type AionisSandboxExecuteRequest = {
  tenant_id?: string;
  scope?: string;
  project_id?: string;
  actor?: string;
  session_id: string;
  planner_run_id?: string;
  decision_id?: string;
  mode?: "async" | "sync";
  timeout_ms?: number;
  action: {
    kind: "command";
    argv: string[];
  };
  metadata?: Record<string, unknown>;
} & AionisRequestPayload;

export type AionisSandboxRunGetRequest = {
  tenant_id?: string;
  scope?: string;
  run_id: string;
} & AionisRequestPayload;

export type AionisSandboxRunLogsRequest = {
  tenant_id?: string;
  scope?: string;
  run_id: string;
  tail_bytes?: number;
} & AionisRequestPayload;

export type AionisSandboxRunArtifactRequest = {
  tenant_id?: string;
  scope?: string;
  run_id: string;
  tail_bytes?: number;
  include_action?: boolean;
  include_output?: boolean;
  include_result?: boolean;
  include_metadata?: boolean;
  bundle_inline?: boolean;
} & AionisRequestPayload;

export type AionisSandboxRunCancelRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  run_id: string;
  reason?: string;
} & AionisRequestPayload;

export type AionisHealthResponse = {
  ok: boolean;
  runtime?: Record<string, unknown>;
  storage?: Record<string, unknown>;
  lite?: Record<string, unknown>;
} & AionisRuntimeResponse;

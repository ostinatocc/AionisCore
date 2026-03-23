import type { AionisRequestPayload, AionisResponsePayload } from "./types.js";

export type AionisPassthroughObject = Record<string, unknown>;

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

export type AionisWriteEdgeEndpoint = {
  id?: string;
  client_id?: string;
} & AionisPassthroughObject;

export type AionisWriteEdge = {
  id?: string;
  scope?: string;
  type: "part_of" | "related_to" | "derived_from";
  src: AionisWriteEdgeEndpoint;
  dst: AionisWriteEdgeEndpoint;
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
  distill?: {
    enabled?: boolean;
    sources?: Array<"input_text" | "event_nodes" | "evidence_nodes">;
    max_evidence_nodes?: number;
    max_fact_nodes?: number;
    min_sentence_chars?: number;
    attach_edges?: boolean;
  } & AionisPassthroughObject;
  nodes?: AionisWriteNode[];
  edges?: AionisWriteEdge[];
} & AionisRequestPayload;

export type AionisMemoryWriteResponse = {
  tenant_id?: string;
  scope?: string;
  commit_id: string;
  commit_uri?: string;
  commit_hash: string;
  nodes: Array<{
    id: string;
    uri?: string;
    client_id?: string;
    type: string;
  } & AionisPassthroughObject>;
  edges: Array<{
    id: string;
    uri?: string;
    type: string;
    src_id: string;
    dst_id: string;
  } & AionisPassthroughObject>;
  embedding_backfill?: {
    enqueued: true;
    pending_nodes: number;
  } & AionisPassthroughObject;
  warnings?: Array<{
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } & AionisPassthroughObject>;
  distillation?: Record<string, unknown>;
} & AionisPassthroughObject;

export type AionisPlannerPacketSectionsText = {
  recommended_workflows: string[];
  candidate_workflows: string[];
  candidate_patterns: string[];
  trusted_patterns: string[];
  contested_patterns: string[];
  rehydration_candidates: string[];
  supporting_knowledge: string[];
};

export type AionisPlannerPacketTextSurface = {
  packet_version: "planner_packet_v1";
  sections: AionisPlannerPacketSectionsText;
  merged_text: string;
} & AionisPassthroughObject;

export type AionisActionPacketSummary = {
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
} & AionisPassthroughObject;

export type AionisWorkflowSignalSummary = {
  stable_workflow_count: number;
  promotion_ready_workflow_count: number;
  observing_workflow_count: number;
  stable_workflow_titles: string[];
  promotion_ready_workflow_titles: string[];
  observing_workflow_titles: string[];
} & AionisPassthroughObject;

export type AionisPatternSignalSummary = {
  candidate_pattern_count: number;
  candidate_pattern_tools: string[];
  trusted_pattern_count: number;
  contested_pattern_count: number;
  trusted_pattern_tools: string[];
  contested_pattern_tools: string[];
} & AionisPassthroughObject;

export type AionisLifecycleSummary = {
  [key: string]: unknown;
} & AionisPassthroughObject;

export type AionisMaintenanceSummary = {
  model: string;
  [key: string]: unknown;
} & AionisPassthroughObject;

export type AionisExecutionKernelSummary = {
  packet_source_mode: string;
  state_first_assembly: boolean;
  execution_packet_v1_present: boolean;
  execution_state_v1_present: boolean;
  pattern_signal_summary: AionisPatternSignalSummary;
  workflow_signal_summary: AionisWorkflowSignalSummary;
  workflow_lifecycle_summary: AionisLifecycleSummary;
  workflow_maintenance_summary: AionisMaintenanceSummary;
  pattern_lifecycle_summary: AionisLifecycleSummary;
  pattern_maintenance_summary: AionisMaintenanceSummary;
  action_packet_summary: AionisActionPacketSummary;
} & AionisPassthroughObject;

export type AionisPlanningSummary = {
  summary_version: "planning_summary_v1";
  planner_explanation: string | null;
  workflow_signal_summary: AionisWorkflowSignalSummary;
  action_packet_summary: AionisActionPacketSummary;
  workflow_lifecycle_summary: AionisLifecycleSummary;
  workflow_maintenance_summary: AionisMaintenanceSummary;
  pattern_lifecycle_summary: AionisLifecycleSummary;
  pattern_maintenance_summary: AionisMaintenanceSummary;
  trusted_pattern_count: number;
  contested_pattern_count: number;
  trusted_pattern_tools: string[];
  contested_pattern_tools: string[];
} & AionisPassthroughObject;

export type AionisAssemblySummary = {
  summary_version: "assembly_summary_v1";
  planner_explanation: string | null;
  workflow_signal_summary: AionisWorkflowSignalSummary;
  action_packet_summary: AionisActionPacketSummary;
  workflow_lifecycle_summary: AionisLifecycleSummary;
  workflow_maintenance_summary: AionisMaintenanceSummary;
  pattern_lifecycle_summary: AionisLifecycleSummary;
  pattern_maintenance_summary: AionisMaintenanceSummary;
  trusted_pattern_count: number;
  contested_pattern_count: number;
  trusted_pattern_tools: string[];
  contested_pattern_tools: string[];
} & AionisPassthroughObject;

export type AionisPlanningContextRequest = {
  tenant_id?: string;
  scope?: string;
  query_text: string;
  recall_strategy?: "local" | "balanced" | "global";
  recall_mode?: "dense_edge";
  recall_class_aware?: boolean;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  context: unknown;
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
  memory_layer_preference?: {
    allowed_layers: Array<"L0" | "L1" | "L2" | "L3" | "L4" | "L5">;
  };
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

export type AionisPlannerEntry = AionisPassthroughObject;

export type AionisPlanningContextResponse = {
  planner_packet: AionisPlannerPacketTextSurface;
  pattern_signals: AionisPlannerEntry[];
  workflow_signals: AionisPlannerEntry[];
  execution_kernel: AionisExecutionKernelSummary;
  planning_summary: AionisPlanningSummary;
} & AionisPassthroughObject;

export type AionisContextAssembleRequest = {
  tenant_id?: string;
  scope?: string;
  query_text: string;
  recall_strategy?: "local" | "balanced" | "global";
  recall_mode?: "dense_edge";
  recall_class_aware?: boolean;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  context?: unknown;
  include_rules?: boolean;
  include_shadow?: boolean;
  rules_limit?: number;
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
  memory_layer_preference?: {
    allowed_layers: Array<"L0" | "L1" | "L2" | "L3" | "L4" | "L5">;
  };
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

export type AionisContextAssembleResponse = {
  planner_packet: AionisPlannerPacketTextSurface;
  pattern_signals: AionisPlannerEntry[];
  workflow_signals: AionisPlannerEntry[];
  execution_kernel: AionisExecutionKernelSummary;
  assembly_summary: AionisAssemblySummary;
} & AionisPassthroughObject;

export type AionisExecutionIntrospectRequest = {
  tenant_id?: string;
  scope?: string;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  limit?: number;
} & AionisRequestPayload;

export type AionisExecutionIntrospectResponse = {
  summary_version: "execution_memory_introspection_v1";
  tenant_id: string;
  scope: string;
  inventory: {
    raw_workflow_anchor_count: number;
    raw_workflow_candidate_count: number;
    suppressed_candidate_workflow_count: number;
    continuity_projected_candidate_count: number;
    continuity_auto_promoted_workflow_count: number;
    raw_pattern_anchor_count: number;
  } & AionisPassthroughObject;
  continuity_projection_report: {
    sampled_source_event_count: number;
    decision_counts: Record<string, number>;
    samples: Array<Record<string, unknown>>;
  } & AionisPassthroughObject;
  demo_surface: {
    surface_version: string;
    headline: string;
    sections: Record<string, string[]>;
    merged_text: string;
  } & AionisPassthroughObject;
  recommended_workflows: AionisPlannerEntry[];
  candidate_workflows: AionisPlannerEntry[];
  candidate_patterns: AionisPlannerEntry[];
  trusted_patterns: AionisPlannerEntry[];
  contested_patterns: AionisPlannerEntry[];
  rehydration_candidates: AionisPlannerEntry[];
  pattern_signals: AionisPlannerEntry[];
  workflow_signals: AionisPlannerEntry[];
  action_packet_summary: AionisActionPacketSummary;
  pattern_signal_summary: AionisPatternSignalSummary;
  workflow_signal_summary: AionisWorkflowSignalSummary;
  workflow_lifecycle_summary: AionisLifecycleSummary;
  workflow_maintenance_summary: AionisMaintenanceSummary;
  pattern_lifecycle_summary: AionisLifecycleSummary;
  pattern_maintenance_summary: AionisMaintenanceSummary;
} & AionisPassthroughObject;

export type AionisToolsSelectRequest = {
  tenant_id?: string;
  scope?: string;
  run_id?: string;
  context: unknown;
  execution_result_summary?: Record<string, unknown>;
  execution_artifacts?: Array<Record<string, unknown>>;
  execution_evidence?: Array<Record<string, unknown>>;
  execution_state_v1?: Record<string, unknown>;
  candidates: string[];
  include_shadow?: boolean;
  rules_limit?: number;
  strict?: boolean;
  reorder_candidates?: boolean;
} & AionisRequestPayload;

export type AionisToolsSelectionSummary = {
  summary_version: "tools_selection_summary_v1";
  selected_tool: string | null;
  trusted_pattern_count: number;
  contested_pattern_count: number;
  suppressed_pattern_count: number;
  used_trusted_pattern_tools: string[];
  used_trusted_pattern_affinity_levels?: string[];
  skipped_contested_pattern_tools: string[];
  skipped_contested_pattern_affinity_levels?: string[];
  skipped_suppressed_pattern_tools: string[];
  skipped_suppressed_pattern_affinity_levels?: string[];
  fallback_applied: boolean;
  fallback_reason: string;
  provenance_explanation: string;
  pattern_lifecycle_summary: AionisPassthroughObject;
  pattern_maintenance_summary: AionisPassthroughObject;
} & AionisPassthroughObject;

export type AionisToolsSelectResponse = {
  tenant_id: string;
  scope: string;
  candidates: string[];
  selection: {
    selected: string | null;
    ordered: string[];
    preferred: string[];
    allowed: string[];
  } & AionisPassthroughObject;
  execution_kernel: AionisPassthroughObject;
  rules: {
    considered: number;
    matched: number;
  } & AionisPassthroughObject;
  pattern_matches: {
    matched: number;
    trusted: number;
    preferred_tools: string[];
    anchors: AionisPassthroughObject[];
  } & AionisPassthroughObject;
  decision: {
    decision_id: string;
    decision_uri: string;
    run_id: string | null;
    selected_tool: string | null;
    source_rule_ids: string[];
    pattern_summary: AionisPassthroughObject;
  } & AionisPassthroughObject;
  selection_summary: AionisToolsSelectionSummary;
} & AionisPassthroughObject;

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
  commit_id: string;
  commit_uri: string;
  commit_hash: string;
  decision_id: string;
  decision_uri: string;
  decision_link_mode: "provided" | "inferred" | "created_from_feedback";
  decision_policy_sha256: string;
  pattern_anchor?: {
    node_id: string;
    node_uri: string;
    client_id: string;
    pattern_signature: string;
    anchor_kind: "pattern";
    anchor_level: "L3";
    pattern_state: "provisional" | "stable";
    credibility_state: "candidate" | "trusted" | "contested";
    maintenance?: Record<string, unknown>;
    promotion?: Record<string, unknown>;
  } & AionisPassthroughObject;
  governance_preview?: {
    form_pattern?: Record<string, unknown>;
  } & AionisPassthroughObject;
} & AionisPassthroughObject;

export type AionisReplayRepairReviewRequest = {
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
  learning_projection?: {
    enabled?: boolean;
    mode?: "rule_and_episode" | "episode_only";
    delivery?: "async_outbox" | "sync_inline";
    target_rule_state?: "draft" | "shadow";
    min_total_steps?: number;
    min_success_ratio?: number;
  } & AionisPassthroughObject;
  governance_review?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
} & AionisRequestPayload;

export type AionisReplayRepairReviewResponse = {
  tenant_id: string;
  scope: string;
  playbook_id: string;
  reviewed_version: number;
  to_version: number;
  action: "approve" | "reject";
  status: "draft" | "shadow" | "active" | "disabled";
  review_state: "approved" | "rejected";
  shadow_validation?: unknown;
  auto_promotion?: unknown;
  playbook_node_id: string | null;
  playbook_uri: string | null;
  commit_id: string | null;
  commit_uri: string | null;
  commit_hash: string | null;
  learning_projection_result?: {
    triggered: boolean;
    delivery: "async_outbox" | "sync_inline";
    status: "queued" | "applied" | "skipped" | "failed";
    reason?: string | null;
    job_key?: string | null;
    generated_rule_node_id?: string | null;
    generated_episode_node_id?: string | null;
  } & AionisPassthroughObject;
  governance_preview?: {
    promote_memory?: Record<string, unknown>;
  } & AionisPassthroughObject;
} & AionisPassthroughObject;

export type AionisAnchorsRehydratePayloadRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  anchor_id?: string;
  anchor_uri?: string;
  mode?: "summary_only" | "partial" | "full";
  include_linked_decisions?: boolean;
  reason?: string;
  adjudication?: Record<string, unknown>;
} & AionisRequestPayload;

export type AionisAnchorsRehydratePayloadResponse = {
  tenant_id: string;
  scope: string;
  mode: "summary_only" | "partial" | "full";
  anchor: {
    id: string;
    uri: string;
    type: string;
    title: string | null;
    text_summary: string | null;
    tier?: string;
    anchor_v1: Record<string, unknown>;
  } & AionisPassthroughObject;
  rehydrated: {
    nodes: Array<{
      id: string;
      uri: string;
      type: string;
      title: string | null;
      text_summary: string | null;
      commit_id: string | null;
      commit_uri: string | null;
    } & AionisPassthroughObject>;
    decisions: Array<{
      decision_id: string;
      decision_uri: string;
      decision_kind: string;
      run_id: string | null;
      selected_tool: string | null;
      created_at: string;
      commit_id: string | null;
      commit_uri: string | null;
      source_rule_ids: string[];
    } & AionisPassthroughObject>;
    commits: Array<{
      commit_id: string;
      commit_uri: string;
      actor: string;
      created_at: string;
      linked_object_counts: {
        nodes: number;
        edges: number;
        decisions: number;
      };
    } & AionisPassthroughObject>;
    summary: {
      linked_node_count: number;
      linked_decision_count: number;
      linked_run_count: number;
      linked_commit_count: number;
      resolved_nodes: number;
      resolved_decisions: number;
      resolved_commits: number;
      missing_node_ids: string[];
      missing_decision_ids: string[];
      missing_commit_ids: string[];
    } & AionisPassthroughObject;
  } & AionisPassthroughObject;
} & AionisPassthroughObject;

export type AionisKnownRequestPayload =
  | AionisMemoryWriteRequest
  | AionisPlanningContextRequest
  | AionisContextAssembleRequest
  | AionisExecutionIntrospectRequest
  | AionisToolsSelectRequest
  | AionisToolsFeedbackRequest
  | AionisReplayRepairReviewRequest
  | AionisAnchorsRehydratePayloadRequest;

export type AionisKnownResponsePayload =
  | AionisMemoryWriteResponse
  | AionisPlanningContextResponse
  | AionisContextAssembleResponse
  | AionisExecutionIntrospectResponse
  | AionisToolsSelectResponse
  | AionisToolsFeedbackResponse
  | AionisReplayRepairReviewResponse
  | AionisAnchorsRehydratePayloadResponse
  | AionisResponsePayload;

import type { AionisRequestPayload, AionisResponsePayload } from "./types.js";
import type {
  AionisActionRetrievalUncertainty,
  AionisAgentMemoryInspectRequest,
  AionisAnchorRehydratePayloadRequest as AionisAnchorsRehydratePayloadRequest,
  AionisContextAssembleRequest,
  AionisEvolutionReviewPackRequest,
  AionisExecutionIntrospectRequest,
  AionisKickoffRecommendation,
  AionisKickoffRecommendationRequest,
  AionisKickoffRecommendationResponse,
  AionisMemoryWriteRequest,
  AionisPassthroughObject,
  AionisPlanningContextRequest,
  AionisReplayPlaybookRepairReviewRequest as AionisReplayRepairReviewRequest,
  AionisTaskStartAction,
  AionisTaskStartRequest,
  AionisTaskStartResponse,
  AionisToolsFeedbackRequest,
  AionisToolsSelectRequest,
} from "./generated/full-sdk-contracts.js";

export type {
  AionisActionRetrievalUncertainty,
  AionisAgentMemoryInspectRequest,
  AionisAnchorRehydratePayloadRequest as AionisAnchorsRehydratePayloadRequest,
  AionisContextAssembleRequest,
  AionisEvolutionReviewPackRequest,
  AionisExecutionIntrospectRequest,
  AionisKickoffRecommendation,
  AionisKickoffRecommendationRequest,
  AionisKickoffRecommendationResponse,
  AionisMemoryWriteRequest,
  AionisPassthroughObject,
  AionisPlanningContextRequest,
  AionisReplayPlaybookRepairReviewRequest as AionisReplayRepairReviewRequest,
  AionisTaskStartAction,
  AionisTaskStartRequest,
  AionisTaskStartResponse,
  AionisToolsFeedbackRequest,
  AionisToolsSelectRequest,
  AionisWriteEdge,
  AionisWriteNode,
} from "./generated/full-sdk-contracts.js";

export type AionisWriteEdgeEndpoint = {
  id?: string;
  client_id?: string;
} & AionisPassthroughObject;

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

export type AionisActionRetrievalGateAction =
  | "inspect_context"
  | "widen_recall"
  | "rehydrate_payload"
  | "request_operator_review";

export type AionisActionRetrievalGateSummary = {
  summary_version: "action_retrieval_gate_v1";
  gate_action: AionisActionRetrievalGateAction;
  escalates_task_start: boolean;
  confidence: number;
  primary_reason: string | null;
  recommended_actions: AionisActionRetrievalGateAction[];
  instruction: string | null;
  rehydration_candidate_count: number;
  preferred_rehydration: {
    anchor_id: string | null;
    anchor_kind: string | null;
    anchor_level: string | null;
    title: string | null;
    summary: string | null;
    mode: "summary_only" | "partial" | "full" | "differential" | null;
    example_call: string | null;
    payload_cost_hint: "low" | "medium" | "high" | null;
  } | null;
} & AionisPassthroughObject;

export type AionisPlanningSummary = {
  summary_version: "planning_summary_v1";
  planner_explanation: string | null;
  first_step_recommendation?: AionisKickoffRecommendation | null;
  action_retrieval_uncertainty?: AionisActionRetrievalUncertainty | null;
  action_retrieval_gate?: AionisActionRetrievalGateSummary | null;
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
  first_step_recommendation?: AionisKickoffRecommendation | null;
  action_retrieval_uncertainty?: AionisActionRetrievalUncertainty | null;
  action_retrieval_gate?: AionisActionRetrievalGateSummary | null;
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

export type AionisPlannerEntry = AionisPassthroughObject;

export type AionisTaskStartGateAction = AionisActionRetrievalGateAction;

export type AionisPlanningContextResponse = {
  planner_packet: AionisPlannerPacketTextSurface;
  pattern_signals: AionisPlannerEntry[];
  workflow_signals: AionisPlannerEntry[];
  execution_kernel: AionisExecutionKernelSummary;
  planning_summary: AionisPlanningSummary;
  kickoff_recommendation?: AionisKickoffRecommendation | null;
} & AionisPassthroughObject;

export type AionisContextAssembleResponse = {
  planner_packet: AionisPlannerPacketTextSurface;
  pattern_signals: AionisPlannerEntry[];
  workflow_signals: AionisPlannerEntry[];
  execution_kernel: AionisExecutionKernelSummary;
  assembly_summary: AionisAssemblySummary;
  kickoff_recommendation?: AionisKickoffRecommendation | null;
} & AionisPassthroughObject;

export type AionisTaskStartPlanRequest = {
  tenant_id?: string;
  scope?: string;
  query_text: string;
  consumer_agent_id?: string;
  consumer_team_id?: string;
  context: unknown;
  candidates?: string[];
  workflow_limit?: number;
} & AionisRequestPayload;

export type AionisTaskStartPlanResponse = {
  summary_version: "task_start_plan_v1";
  resolution_source: "kickoff" | "planning_context";
  tenant_id: string;
  scope: string;
  query_text: string;
  kickoff_recommendation: AionisKickoffRecommendation | null;
  gate_action: AionisTaskStartGateAction | null;
  action_retrieval_uncertainty: AionisActionRetrievalUncertainty | null;
  first_action: AionisTaskStartAction | null;
  planner_explanation: string | null;
  planner_packet: AionisPlannerPacketTextSurface | null;
  rationale: {
    summary: string;
  } & AionisPassthroughObject;
} & AionisPassthroughObject;

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

export type AionisEvolutionReviewPackResponse = {
  summary_version: "evolution_review_pack_v1";
  tenant_id: string;
  scope: string;
  query_text: string;
  evolution_inspect: AionisPassthroughObject;
  evolution_review_pack: AionisPassthroughObject;
} & AionisPassthroughObject;

export type AionisAgentMemoryInspectResponse = {
  summary_version: "agent_memory_inspect_v1";
  tenant_id: string;
  scope: string;
  query_text: string;
  continuity_inspect: AionisPassthroughObject | null;
  continuity_review_pack: AionisPassthroughObject | null;
  evolution_inspect: AionisPassthroughObject;
  evolution_review_pack: AionisPassthroughObject;
  derived_policy: AionisPassthroughObject | null;
  policy_contract: AionisPassthroughObject | null;
  policy_review: AionisPassthroughObject;
  policy_governance_contract: AionisPassthroughObject;
  policy_governance_apply_payload: AionisPassthroughObject | null;
  policy_governance_apply_result: AionisPassthroughObject | null;
  agent_memory_summary: AionisPassthroughObject;
} & AionisPassthroughObject;

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
  | AionisEvolutionReviewPackRequest
  | AionisAgentMemoryInspectRequest
  | AionisToolsSelectRequest
  | AionisToolsFeedbackRequest
  | AionisReplayRepairReviewRequest
  | AionisAnchorsRehydratePayloadRequest;

export type AionisKnownResponsePayload =
  | AionisMemoryWriteResponse
  | AionisPlanningContextResponse
  | AionisContextAssembleResponse
  | AionisExecutionIntrospectResponse
  | AionisEvolutionReviewPackResponse
  | AionisAgentMemoryInspectResponse
  | AionisToolsSelectResponse
  | AionisToolsFeedbackResponse
  | AionisReplayRepairReviewResponse
  | AionisAnchorsRehydratePayloadResponse
  | AionisResponsePayload;

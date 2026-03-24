import type { AionisRequestPayload } from "./types.js";

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

export type AionisContextAssembleRequest = AionisPlanningContextRequest;
export type AionisExecutionIntrospectRequest = {
  tenant_id?: string;
  scope?: string;
  run_id?: string;
  session_id?: string;
  limit?: number;
} & AionisRequestPayload;

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
  ref: string;
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
  anchor_id: string;
  mode?: "summary_only" | "partial" | "full";
} & AionisRequestPayload;

export type AionisSessionCreateRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  session_id?: string;
  title?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
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
  limit?: number;
} & AionisRequestPayload;

export type AionisNodesActivateRequest = {
  tenant_id?: string;
  scope?: string;
  actor?: string;
  node_ids: string[];
} & AionisRequestPayload;

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
  include_payload?: boolean;
} & AionisRequestPayload;

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

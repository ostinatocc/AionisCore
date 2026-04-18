import { z } from "zod";
import {
  ControlProfileV1Schema,
  ExecutionArtifactRoutingRecordV1Schema,
  ExecutionDelegationPacketRecordV1Schema,
  ExecutionDelegationReturnRecordV1Schema,
  ExecutionPacketV1Schema,
  ExecutionStateV1Schema,
} from "../execution/types.js";
import { ExecutionStateTransitionV1Schema } from "../execution/transitions.js";

export const UUID = z.string().uuid();

export const NodeType = z.enum(["event", "entity", "topic", "rule", "evidence", "concept", "procedure", "self_model"]);
export const EdgeType = z.enum(["part_of", "related_to", "derived_from"]);
export const MemoryLayerId = z.enum(["L0", "L1", "L2", "L3", "L4", "L5"]);
export const MemoryLayerPreference = z
  .object({
    allowed_layers: z.array(MemoryLayerId).min(1).max(6),
  })
  .strict();

const QueryBoolean = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") {
    if (v === 1) return true;
    if (v === 0) return false;
    return v;
  }
  if (typeof v === "string") {
    const raw = v.trim().toLowerCase();
    if (raw === "1" || raw === "true" || raw === "yes" || raw === "on") return true;
    if (raw === "0" || raw === "false" || raw === "no" || raw === "off" || raw === "") return false;
    return v;
  }
  return v;
}, z.boolean());

export const WriteNode = z.object({
  id: UUID.optional(),
  client_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  type: NodeType,
  tier: z.enum(["hot", "warm", "cold", "archive"]).optional(),
  memory_lane: z.enum(["private", "shared"]).optional(),
  producer_agent_id: z.string().min(1).optional(),
  owner_agent_id: z.string().min(1).optional(),
  owner_team_id: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  text_summary: z.string().min(1).optional(),
  slots: z.record(z.any()).optional(),
  raw_ref: z.string().min(1).optional(),
  evidence_ref: z.string().min(1).optional(),
  embedding: z.array(z.number()).optional(),
  // Optional: label the embedding's generating model/provider for auditability.
  // If omitted and `embedding` is client-supplied, the server may default this to "client".
  embedding_model: z.string().min(1).optional(),
  salience: z.number().min(0).max(1).optional(),
  importance: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const WriteEdgeEndpoint = z.object({
  id: UUID.optional(),
  client_id: z.string().min(1).optional(),
  ref: z
    .object({
      id: UUID.optional(),
      client_id: z.string().min(1).optional(),
    })
    .refine((v) => !!v.id || !!v.client_id, { message: "must set id or client_id" }),
});

export const WriteEdge = z.object({
  id: UUID.optional(),
  scope: z.string().min(1).optional(),
  type: EdgeType,
  src: z.object({ id: UUID.optional(), client_id: z.string().min(1).optional() }).refine((v) => !!v.id || !!v.client_id, {
    message: "src must set id or client_id",
  }),
  dst: z.object({ id: UUID.optional(), client_id: z.string().min(1).optional() }).refine((v) => !!v.id || !!v.client_id, {
    message: "dst must set id or client_id",
  }),
  weight: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  decay_rate: z.number().min(0).max(1).optional(),
});

export const MemoryWriteRequest = z
  .object({
    tenant_id: z.string().min(1).optional(),
    scope: z.string().min(1).optional(),
    actor: z.string().min(1).optional(),
    parent_commit_id: UUID.optional(),
    input_text: z.string().min(1).optional(),
    input_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    model_version: z.string().min(1).optional(),
    prompt_version: z.string().min(1).optional(),
    // Tri-state: if omitted, server defaults may apply.
    auto_embed: z.boolean().optional(),
    memory_lane: z.enum(["private", "shared"]).optional(),
    producer_agent_id: z.string().min(1).optional(),
    owner_agent_id: z.string().min(1).optional(),
    owner_team_id: z.string().min(1).optional(),
    // If true, re-embed nodes even if they already have READY embeddings (for model upgrades).
    // This never blocks /write; it only affects the derived embed backfill job behavior.
    force_reembed: z.boolean().optional(),
    trigger_topic_cluster: z.boolean().optional(),
    topic_cluster_async: z.boolean().optional(),
    distill: z
      .object({
        enabled: z.boolean().default(true),
        sources: z.array(z.enum(["input_text", "event_nodes", "evidence_nodes"])).min(1).max(3).default([
          "input_text",
          "event_nodes",
          "evidence_nodes",
        ]),
        max_evidence_nodes: z.number().int().positive().max(20).default(4),
        max_fact_nodes: z.number().int().positive().max(20).default(6),
        min_sentence_chars: z.number().int().min(12).max(500).default(24),
        attach_edges: z.boolean().default(true),
      })
      .optional(),
    nodes: z.array(WriteNode).default([]),
    edges: z.array(WriteEdge).default([]),
  })
  .refine((v) => !!v.input_text || !!v.input_sha256, { message: "must set input_text or input_sha256" });

export const MemoryRecallRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  query_embedding: z.array(z.number()),
  recall_strategy: z.enum(["local", "balanced", "global"]).optional(),
  recall_mode: z.enum(["dense_edge"]).optional(),
  consumer_agent_id: z.string().min(1).optional(),
  consumer_team_id: z.string().min(1).optional(),
  limit: z.number().int().positive().max(200).default(30),
  neighborhood_hops: z.number().int().min(1).max(2).default(2),
  return_debug: z.boolean().default(false),
  include_embeddings: z.boolean().default(false),
  include_meta: z.boolean().default(false),
  include_slots: z.boolean().default(false),
  include_slots_preview: z.boolean().default(false),
  slots_preview_keys: z.number().int().positive().max(50).default(10),
  max_nodes: z.number().int().positive().max(200).default(50),
  // Hard contract: always cap returned edges to avoid response explosion.
  max_edges: z.number().int().positive().max(100).default(100),
  ranked_limit: z.number().int().positive().max(500).default(100),
  // Optional neighborhood quality filters (applied in stage-2 edge fetch).
  min_edge_weight: z.number().min(0).max(1).default(0),
  min_edge_confidence: z.number().min(0).max(1).default(0),
  // Optional context compaction budgets (for context.text only).
  context_token_budget: z.number().int().positive().max(256000).optional(),
  context_char_budget: z.number().int().positive().max(1000000).optional(),
  // Optional context compaction policy preset.
  context_compaction_profile: z.enum(["balanced", "aggressive"]).optional(),
  // Optional caller-controlled layer tightening. The server always preserves trust anchors.
  memory_layer_preference: MemoryLayerPreference.optional(),
  // Optional: evaluate SHADOW/ACTIVE rules alongside recall to produce an applied policy patch for the planner.
  // Use the normalized "Planner Context" shape (see docs/PLANNER_CONTEXT.md).
  rules_context: z.any().optional(),
  // Default to ACTIVE-only for safety; callers can opt into SHADOW visibility explicitly.
  rules_include_shadow: z.boolean().optional().default(false),
  // Hard cap for how many rules the server may scan.
  rules_limit: z.number().int().positive().max(200).optional().default(50),
});

export const MemoryRecallTextRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  query_text: z.string().min(1),
  recall_strategy: z.enum(["local", "balanced", "global"]).optional(),
  recall_mode: z.enum(["dense_edge"]).optional(),
  recall_class_aware: z.boolean().optional(),
  consumer_agent_id: z.string().min(1).optional(),
  consumer_team_id: z.string().min(1).optional(),
  limit: z.number().int().positive().max(200).default(30),
  neighborhood_hops: z.number().int().min(1).max(2).default(2),
  return_debug: z.boolean().default(false),
  include_embeddings: z.boolean().default(false),
  include_meta: z.boolean().default(false),
  include_slots: z.boolean().default(false),
  include_slots_preview: z.boolean().default(false),
  slots_preview_keys: z.number().int().positive().max(50).default(10),
  max_nodes: z.number().int().positive().max(200).default(50),
  // Hard contract: always cap returned edges to avoid response explosion.
  max_edges: z.number().int().positive().max(100).default(100),
  ranked_limit: z.number().int().positive().max(500).default(100),
  // Optional neighborhood quality filters (applied in stage-2 edge fetch).
  min_edge_weight: z.number().min(0).max(1).default(0),
  min_edge_confidence: z.number().min(0).max(1).default(0),
  // Optional context compaction budgets (for context.text only).
  context_token_budget: z.number().int().positive().max(256000).optional(),
  context_char_budget: z.number().int().positive().max(1000000).optional(),
  // Optional context compaction policy preset.
  context_compaction_profile: z.enum(["balanced", "aggressive"]).optional(),
  memory_layer_preference: MemoryLayerPreference.optional(),
  // Optional: same as MemoryRecallRequest.rules_* but for recall_text.
  rules_context: z.any().optional(),
  rules_include_shadow: z.boolean().optional().default(false),
  rules_limit: z.number().int().positive().max(200).optional().default(50),
});

export type MemoryRecallInput = z.infer<typeof MemoryRecallRequest>;
export type MemoryRecallTextInput = z.infer<typeof MemoryRecallTextRequest>;
export type MemoryWriteInput = z.infer<typeof MemoryWriteRequest>;

export const MemoryAnchorKind = z.enum(["execution", "workflow", "pattern", "decision"]);
export const MemoryAnchorLevel = z.enum(["L1", "L2", "L3"]);
export const MemoryPatternState = z.enum(["provisional", "stable"]);
export const MemoryPatternCredibilityState = z.enum(["candidate", "trusted", "contested"]);
export const PatternOperatorOverrideMode = z.enum(["shadow_learn", "hard_freeze"]);
export const MemoryPatternTransitionKind = z.enum([
  "candidate_observed",
  "promoted_to_trusted",
  "counter_evidence_opened",
  "revalidated_to_trusted",
]);
export const MemoryPatternPromotionGateKind = z.enum(["current_distinct_runs_v1"]);
export const MemoryPatternRevalidationFloorKind = z.enum(["post_contest_two_fresh_runs_v1"]);
export const MemoryAnchorSourceKind = z.enum([
  "replay_step",
  "playbook",
  "distilled_trace",
  "tool_decision",
  "workflow_cluster",
  "execution_write",
]);
export const MemoryAnchorRehydrationMode = z.enum(["summary_only", "partial", "full", "differential"]);
export const MemoryAnchorPayloadCostHint = z.enum(["low", "medium", "high"]);
export const MemoryAnchorOutcomeStatus = z.enum(["success", "failure", "partial", "mixed", "unknown"]);

const MemoryAnchorStringList = z.array(z.string().min(1).max(256)).max(64);
const MemoryAnchorIdList = z.array(z.string().min(1).max(256)).max(256);

export const MemoryAnchorOutcomeSchema = z.object({
  status: MemoryAnchorOutcomeStatus,
  result_class: z.string().min(1).max(128).optional(),
  success_score: z.number().min(0).max(1).optional(),
});

export const MemoryAnchorSourceSchema = z.object({
  source_kind: MemoryAnchorSourceKind,
  node_id: z.string().min(1).max(256).nullable().optional(),
  decision_id: z.string().min(1).max(256).nullable().optional(),
  run_id: z.string().min(1).max(256).nullable().optional(),
  step_id: z.string().min(1).max(256).nullable().optional(),
  playbook_id: z.string().min(1).max(256).nullable().optional(),
  commit_id: z.string().min(1).max(256).nullable().optional(),
});

export const MemoryAnchorPayloadRefsSchema = z.object({
  node_ids: MemoryAnchorIdList.default([]),
  decision_ids: MemoryAnchorIdList.default([]),
  run_ids: MemoryAnchorIdList.default([]),
  step_ids: MemoryAnchorIdList.default([]),
  commit_ids: MemoryAnchorIdList.default([]),
});

export const MemoryAnchorRehydrationHintSchema = z.object({
  default_mode: MemoryAnchorRehydrationMode.default("summary_only"),
  payload_cost_hint: MemoryAnchorPayloadCostHint.default("medium"),
  recommended_when: MemoryAnchorStringList.default([]),
});

export const MemoryAnchorRecallFeaturesSchema = z.object({
  error_tags: MemoryAnchorStringList.optional(),
  tool_tags: MemoryAnchorStringList.optional(),
  outcome_tags: MemoryAnchorStringList.optional(),
  keywords: MemoryAnchorStringList.optional(),
});

export const MemoryAnchorMetricsSchema = z.object({
  usage_count: z.number().int().min(0).default(0),
  reuse_success_count: z.number().int().min(0).default(0),
  reuse_failure_count: z.number().int().min(0).default(0),
  distinct_run_count: z.number().int().min(0).default(0),
  last_used_at: z.string().min(1).nullable().default(null),
});

export const MemoryAnchorMaintenanceState = z.enum(["observe", "retain", "review"]);
export const MemoryAnchorMaintenancePriority = z.enum([
  "none",
  "promote_candidate",
  "promote_to_workflow",
  "promote_to_pattern",
  "promote_to_policy",
  "review_counter_evidence",
  "retain_distillation",
  "retain_trusted",
  "retain_workflow",
]);

export const MemoryAnchorMaintenanceSchema = z.object({
  model: z.literal("lazy_online_v1").default("lazy_online_v1"),
  maintenance_state: MemoryAnchorMaintenanceState,
  offline_priority: MemoryAnchorMaintenancePriority.default("none"),
  lazy_update_fields: MemoryAnchorStringList.default([
    "usage_count",
    "last_used_at",
    "reuse_success_count",
    "reuse_failure_count",
  ]),
  last_maintenance_at: z.string().min(1).nullable().default(null),
});

export const MemoryWorkflowPromotionState = z.enum(["candidate", "stable"]);
export const MemoryWorkflowPromotionOrigin = z.enum([
  "replay_promote",
  "replay_stable_normalization",
  "replay_learning_episode",
  "replay_learning_auto_promotion",
  "execution_write_projection",
  "execution_write_auto_promotion",
]);
export const MemoryWorkflowTransitionKind = z.enum(["candidate_observed", "promoted_to_stable", "normalized_latest_stable"]);

export const MemoryWorkflowPromotionSchema = z.object({
  promotion_state: MemoryWorkflowPromotionState.default("stable"),
  promotion_origin: MemoryWorkflowPromotionOrigin,
  required_observations: z.number().int().min(2).max(32).default(2),
  observed_count: z.number().int().min(0).default(0),
  last_transition: MemoryWorkflowTransitionKind,
  last_transition_at: z.string().min(1).nullable().default(null),
  source_status: z.string().min(1).max(64).nullable().default(null),
});

export const MemoryPatternPromotionSchema = z.object({
  required_distinct_runs: z.number().int().min(2).max(32).default(2),
  distinct_run_count: z.number().int().min(0).default(0),
  observed_run_ids: z.array(z.string().min(1).max(256)).max(16).default([]),
  counter_evidence_count: z.number().int().min(0).default(0),
  counter_evidence_open: z.boolean().default(false),
  credibility_state: MemoryPatternCredibilityState.default("candidate"),
  previous_credibility_state: MemoryPatternCredibilityState.nullable().default(null),
  last_transition: MemoryPatternTransitionKind.nullable().default(null),
  last_transition_at: z.string().min(1).nullable().default(null),
  stable_at: z.string().min(1).nullable().default(null),
  last_validated_at: z.string().min(1).nullable().default(null),
  last_counter_evidence_at: z.string().min(1).nullable().default(null),
});

export const MemoryPatternTrustHardeningSchema = z.object({
  task_family: z.string().min(1).max(128).nullable().default(null),
  error_family: z.string().min(1).max(128).nullable().default(null),
  observed_task_families: MemoryAnchorStringList.default([]),
  observed_error_families: MemoryAnchorStringList.default([]),
  distinct_task_family_count: z.number().int().min(0).default(0),
  distinct_error_family_count: z.number().int().min(0).default(0),
  post_contest_observed_run_ids: z.array(z.string().min(1).max(256)).max(16).default([]),
  post_contest_distinct_run_count: z.number().int().min(0).default(0),
  promotion_gate_kind: MemoryPatternPromotionGateKind.default("current_distinct_runs_v1"),
  promotion_gate_satisfied: z.boolean().default(false),
  revalidation_floor_kind: MemoryPatternRevalidationFloorKind.default("post_contest_two_fresh_runs_v1"),
  revalidation_floor_satisfied: z.boolean().default(true),
  task_affinity_weighting_enabled: z.boolean().default(false),
  semantic_review_override_applied: z.boolean().default(false),
  semantic_review_override_reason: z.string().min(1).max(128).nullable().default(null),
});

export const MemoryDistillationOrigin = z.enum([
  "write_distillation_input_text",
  "write_distillation_event_node",
  "write_distillation_evidence_node",
]);

export const MemoryDistillationTransitionKind = z.enum([
  "distilled_from_input_text",
  "distilled_from_event_node",
  "distilled_from_evidence_node",
]);

export const MemoryDistillationPromotionTarget = z.enum(["workflow", "pattern", "policy"]);

export const MemoryDistillationSchema = z.object({
  abstraction_state: z.literal("distilled").default("distilled"),
  distillation_origin: MemoryDistillationOrigin,
  source_kind: z.string().min(1).max(64),
  preferred_promotion_target: MemoryDistillationPromotionTarget,
  extraction_pattern: z.string().min(1).max(64).nullable().default(null),
  source_node_id: z.string().min(1).max(256).nullable().default(null),
  source_evidence_node_id: z.string().min(1).max(256).nullable().default(null),
  has_execution_signature: z.boolean().default(false),
  last_transition: MemoryDistillationTransitionKind,
  last_transition_at: z.string().min(1).nullable().default(null),
});

export const MemoryAnchorV1Schema = z.object({
  anchor_kind: MemoryAnchorKind,
  anchor_level: MemoryAnchorLevel,
  pattern_state: MemoryPatternState.optional(),
  credibility_state: MemoryPatternCredibilityState.optional(),
  task_signature: z.string().min(1).max(256),
  task_class: z.string().min(1).max(128).optional(),
  task_family: z.string().min(1).max(128).optional(),
  error_signature: z.string().min(1).max(256).optional(),
  error_family: z.string().min(1).max(128).optional(),
  workflow_signature: z.string().min(1).max(256).optional(),
  pattern_signature: z.string().min(1).max(256).optional(),
  summary: z.string().min(1).max(400),
  tool_set: z.array(z.string().min(1).max(128)).max(64),
  selected_tool: z.string().min(1).max(128).nullable().optional(),
  file_path: z.string().min(1).max(2048).nullable().optional(),
  target_files: z.array(z.string().min(1).max(2048)).max(64).optional(),
  next_action: z.string().min(1).max(400).nullable().optional(),
  key_steps: MemoryAnchorStringList.optional(),
  outcome: MemoryAnchorOutcomeSchema,
  source: MemoryAnchorSourceSchema,
  payload_refs: MemoryAnchorPayloadRefsSchema,
  rehydration: MemoryAnchorRehydrationHintSchema.optional(),
  recall_features: MemoryAnchorRecallFeaturesSchema.optional(),
  metrics: MemoryAnchorMetricsSchema.optional(),
  maintenance: MemoryAnchorMaintenanceSchema.optional(),
  workflow_promotion: MemoryWorkflowPromotionSchema.optional(),
  promotion: MemoryPatternPromotionSchema.optional(),
  trust_hardening: MemoryPatternTrustHardeningSchema.optional(),
  schema_version: z.literal("anchor_v1"),
});

export type MemoryAnchorV1 = z.infer<typeof MemoryAnchorV1Schema>;

export const ExecutionNativeKind = z.enum([
  "distilled_evidence",
  "distilled_fact",
  "workflow_candidate",
  "workflow_anchor",
  "pattern_anchor",
  "execution_native",
]);

export const ExecutionNativeV1Schema = z.object({
  schema_version: z.literal("execution_native_v1"),
  execution_kind: ExecutionNativeKind,
  summary_kind: z.string().min(1).max(128).nullable().optional(),
  compression_layer: MemoryLayerId.optional(),
  task_signature: z.string().min(1).max(256).optional(),
  task_family: z.string().min(1).max(128).optional(),
  error_signature: z.string().min(1).max(256).optional(),
  error_family: z.string().min(1).max(128).optional(),
  workflow_signature: z.string().min(1).max(256).optional(),
  pattern_signature: z.string().min(1).max(256).optional(),
  anchor_kind: MemoryAnchorKind.optional(),
  anchor_level: MemoryAnchorLevel.optional(),
  tool_set: z.array(z.string().min(1).max(128)).max(64).optional(),
  pattern_state: MemoryPatternState.optional(),
  credibility_state: MemoryPatternCredibilityState.optional(),
  selected_tool: z.string().min(1).max(128).nullable().optional(),
  file_path: z.string().min(1).max(2048).nullable().optional(),
  target_files: z.array(z.string().min(1).max(2048)).max(64).optional(),
  next_action: z.string().min(1).max(400).nullable().optional(),
  workflow_promotion: MemoryWorkflowPromotionSchema.optional(),
  promotion: MemoryPatternPromotionSchema.optional(),
  trust_hardening: MemoryPatternTrustHardeningSchema.optional(),
  maintenance: MemoryAnchorMaintenanceSchema.optional(),
  rehydration: MemoryAnchorRehydrationHintSchema.optional(),
  distillation: MemoryDistillationSchema.optional(),
});

export type ExecutionNativeV1 = z.infer<typeof ExecutionNativeV1Schema>;

export const MemoryGovernedOperation = z.enum([
  "promote_memory",
  "compress_memory",
  "form_pattern",
  "derive_policy_hint",
  "rehydrate_payload",
]);

export type MemoryGovernedOperationName = z.infer<typeof MemoryGovernedOperation>;

export const MemoryAdjudicationDisposition = z.enum(["recommend", "reject", "insufficient_evidence"]);
export const MemoryAdjudicationTargetKind = z.enum(["event", "execution", "workflow", "pattern", "decision", "policy_hint", "none"]);
export const MemoryAdjudicationStrategicValue = z.enum(["low", "medium", "high"]);

export const MemoryAdjudicationProposalBaseSchema = z.object({
  disposition: MemoryAdjudicationDisposition.default("recommend"),
  target_kind: MemoryAdjudicationTargetKind.default("none"),
  target_level: MemoryAnchorLevel.optional(),
  reason: z.string().min(1).max(2000),
  confidence: z.number().min(0).max(1),
  strategic_value: MemoryAdjudicationStrategicValue.optional(),
  keep_details: MemoryAnchorStringList.optional(),
  drop_details: MemoryAnchorStringList.optional(),
  related_memory_ids: MemoryAnchorIdList.optional(),
  related_decision_ids: MemoryAnchorIdList.optional(),
  expected_task_signature: z.string().min(1).max(256).optional(),
  expected_error_signature: z.string().min(1).max(256).optional(),
  notes: z.record(z.unknown()).optional(),
});

function addTargetLevelRequirement<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value: any, ctx) => {
    if (value.disposition === "recommend" && value.target_kind !== "none" && !value.target_level
      && (value.target_kind === "execution" || value.target_kind === "workflow" || value.target_kind === "pattern")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "target_level is required when recommending execution/workflow/pattern memory",
        path: ["target_level"],
      });
    }
  });
}

export const MemoryPromoteAdjudicationSchema = addTargetLevelRequirement(
  MemoryAdjudicationProposalBaseSchema.extend({
    operation: z.literal("promote_memory"),
    target_kind: z.enum(["execution", "workflow", "pattern", "decision", "none"]).default("none"),
  }),
);

export const MemoryCompressAdjudicationSchema = addTargetLevelRequirement(
  MemoryAdjudicationProposalBaseSchema.extend({
    operation: z.literal("compress_memory"),
    target_kind: z.enum(["event", "execution", "workflow", "pattern", "decision", "none"]).default("none"),
  }),
);

export const MemoryFormPatternAdjudicationSchema = addTargetLevelRequirement(
  MemoryAdjudicationProposalBaseSchema.extend({
    operation: z.literal("form_pattern"),
    target_kind: z.enum(["pattern", "none"]).default("none"),
  }),
);

export const MemoryPolicyHintAdjudicationSchema = MemoryAdjudicationProposalBaseSchema.extend({
  operation: z.literal("derive_policy_hint"),
  target_kind: z.enum(["policy_hint", "none"]).default("none"),
});

export const MemoryPayloadRehydrateAdjudicationSchema = MemoryAdjudicationProposalBaseSchema.extend({
  operation: z.literal("rehydrate_payload"),
  target_kind: z.enum(["none", "decision", "workflow", "execution"]).default("none"),
});

export const MemoryAdjudicationProposalSchema = z.union([
  MemoryPromoteAdjudicationSchema,
  MemoryCompressAdjudicationSchema,
  MemoryFormPatternAdjudicationSchema,
  MemoryPolicyHintAdjudicationSchema,
  MemoryPayloadRehydrateAdjudicationSchema,
]);

export type MemoryAdjudicationProposal = z.infer<typeof MemoryAdjudicationProposalSchema>;

export const MemoryAdmissibilityReasonCode = z.enum([
  "budget_limit",
  "policy_restricted",
  "confidence_too_low",
  "threshold_not_met",
  "schema_invalid",
  "write_scope_unsafe",
  "irreversible_action_denied",
]);

export const MemoryAdmissibilityResultSchema = z.object({
  operation: MemoryGovernedOperation,
  admissible: z.boolean(),
  requires_manual_review: z.boolean().default(false),
  accepted_mutation_count: z.number().int().min(0).default(0),
  reason_codes: z.array(MemoryAdmissibilityReasonCode).max(16).default([]),
  notes: z.record(z.unknown()).optional(),
});

export type MemoryAdmissibilityResult = z.infer<typeof MemoryAdmissibilityResultSchema>;

const MemoryGovernedMutationBase = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  input_text: z.string().min(1).optional(),
  input_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});

export const MemoryPromoteRequest = MemoryGovernedMutationBase.extend({
  candidate_node_ids: MemoryAnchorIdList.min(1).max(200),
  target_kind: z.enum(["execution", "workflow", "pattern", "decision"]),
  target_level: MemoryAnchorLevel,
  write_anchor: z.boolean().default(true),
  adjudication: MemoryPromoteAdjudicationSchema.optional(),
}).refine((v) => !!v.input_text || !!v.input_sha256, { message: "must set input_text or input_sha256" });

export type MemoryPromoteInput = z.infer<typeof MemoryPromoteRequest>;

export const MemoryPromoteSemanticReviewCandidateSchema = z.object({
  node_id: z.string().min(1).max(256),
  title: z.string().min(1).max(200).optional(),
  summary: z.string().min(1).max(1000).optional(),
  task_signature: z.string().min(1).max(256).nullable().optional(),
  error_signature: z.string().min(1).max(256).nullable().optional(),
  workflow_signature: z.string().min(1).max(256).nullable().optional(),
  selected_tool: z.string().min(1).max(128).nullable().optional(),
  outcome_status: z.string().min(1).max(64).nullable().optional(),
  success_score: z.number().min(0).max(1).nullable().optional(),
});

export const MEMORY_PROMOTE_SEMANTIC_REVIEW_VERSION = "promote_memory_semantic_review_v1" as const;
export const MEMORY_FORM_PATTERN_SEMANTIC_REVIEW_VERSION = "form_pattern_semantic_review_v1" as const;

export const MemoryPromoteSemanticReviewPacketSchema = z.object({
  review_version: z.literal(MEMORY_PROMOTE_SEMANTIC_REVIEW_VERSION),
  operation: z.literal("promote_memory"),
  requested_target_kind: z.enum(["execution", "workflow", "pattern", "decision"]),
  requested_target_level: MemoryAnchorLevel,
  candidate_count: z.number().int().min(0).max(200),
  deterministic_gate: z.object({
    candidate_count_satisfied: z.boolean(),
    target_kind_present: z.boolean(),
    target_level_present: z.boolean(),
    gate_satisfied: z.boolean(),
  }),
  candidate_examples: z.array(MemoryPromoteSemanticReviewCandidateSchema).max(6),
});

export type MemoryPromoteSemanticReviewPacket = z.infer<typeof MemoryPromoteSemanticReviewPacketSchema>;

export const MemoryPromoteSemanticReviewResultSchema = z.object({
  review_version: z.literal(MEMORY_PROMOTE_SEMANTIC_REVIEW_VERSION),
  adjudication: MemoryPromoteAdjudicationSchema,
});

export type MemoryPromoteSemanticReviewResult = z.infer<typeof MemoryPromoteSemanticReviewResultSchema>;

export const MemoryCompressRequest = MemoryGovernedMutationBase.extend({
  node_ids: MemoryAnchorIdList.min(1).max(200),
  compression_mode: z.enum(["summarize", "drop_redundant_details", "anchor_only"]).default("summarize"),
  preserve_anchor: z.boolean().default(true),
  adjudication: MemoryCompressAdjudicationSchema.optional(),
}).refine((v) => !!v.input_text || !!v.input_sha256, { message: "must set input_text or input_sha256" });

export type MemoryCompressInput = z.infer<typeof MemoryCompressRequest>;

export const MemoryFormPatternRequest = MemoryGovernedMutationBase.extend({
  source_node_ids: MemoryAnchorIdList.min(2).max(100),
  task_signature: z.string().min(1).max(256).optional(),
  error_signature: z.string().min(1).max(256).optional(),
  pattern_signature: z.string().min(1).max(256).optional(),
  target_level: z.literal("L3").default("L3"),
  adjudication: MemoryFormPatternAdjudicationSchema.optional(),
}).refine((v) => !!v.input_text || !!v.input_sha256, { message: "must set input_text or input_sha256" });

export type MemoryFormPatternInput = z.infer<typeof MemoryFormPatternRequest>;

export const MemoryFormPatternSemanticReviewExampleSchema = z.object({
  node_id: z.string().min(1).max(256),
  title: z.string().min(1).max(200).optional(),
  summary: z.string().min(1).max(1000).optional(),
  task_signature: z.string().min(1).max(256).nullable().optional(),
  error_signature: z.string().min(1).max(256).nullable().optional(),
  pattern_signature: z.string().min(1).max(256).nullable().optional(),
  selected_tool: z.string().min(1).max(128).nullable().optional(),
  outcome_status: z.string().min(1).max(64).nullable().optional(),
  success_score: z.number().min(0).max(1).nullable().optional(),
});

export const MemoryFormPatternSemanticReviewPacketSchema = z.object({
  review_version: z.literal(MEMORY_FORM_PATTERN_SEMANTIC_REVIEW_VERSION),
  operation: z.literal("form_pattern"),
  target_level: z.literal("L3"),
  source_count: z.number().int().min(2).max(100),
  deterministic_gate: z.object({
    source_count_satisfied: z.boolean(),
    signature_present: z.boolean(),
    gate_satisfied: z.boolean(),
  }),
  signatures: z.object({
    task_signature: z.string().min(1).max(256).nullable().optional(),
    error_signature: z.string().min(1).max(256).nullable().optional(),
    pattern_signature: z.string().min(1).max(256).nullable().optional(),
  }),
  source_examples: z.array(MemoryFormPatternSemanticReviewExampleSchema).max(6),
});

export type MemoryFormPatternSemanticReviewPacket = z.infer<typeof MemoryFormPatternSemanticReviewPacketSchema>;

export const MemoryFormPatternSemanticReviewResultSchema = z.object({
  review_version: z.literal(MEMORY_FORM_PATTERN_SEMANTIC_REVIEW_VERSION),
  adjudication: MemoryFormPatternAdjudicationSchema,
});

export type MemoryFormPatternSemanticReviewResult = z.infer<typeof MemoryFormPatternSemanticReviewResultSchema>;

export const MemoryPayloadRehydrateToolRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  anchor_id: z.string().min(1).max(256).optional(),
  anchor_uri: z.string().min(1).max(512).optional(),
  mode: MemoryAnchorRehydrationMode.default("partial"),
  include_linked_decisions: z.boolean().default(true),
  reason: z.string().min(1).max(1000).optional(),
  adjudication: MemoryPayloadRehydrateAdjudicationSchema.optional(),
}).refine((v) => !!v.anchor_id || !!v.anchor_uri, {
  message: "must set anchor_id or anchor_uri",
});

export type MemoryPayloadRehydrateToolInput = z.infer<typeof MemoryPayloadRehydrateToolRequest>;

export const ContextLayerName = z.enum(["facts", "episodes", "rules", "static", "decisions", "tools", "citations"]);
export const MemoryTier = z.enum(["hot", "warm", "cold", "archive"]);

export const ContextForgettingPolicy = z.object({
  enabled: z.boolean().default(true),
  allowed_tiers: z.array(MemoryTier).min(1).max(4).default(["hot", "warm"]),
  exclude_archived: z.boolean().default(true),
  min_salience: z.number().min(0).max(1).optional(),
});

export const ContextLayerConfig = z.object({
  enabled: z.array(ContextLayerName).min(1).max(7).optional(),
  char_budget_total: z.number().int().positive().max(200000).optional(),
  char_budget_by_layer: z.record(z.string(), z.number().int().positive().max(200000)).optional(),
  max_items_by_layer: z.record(z.string(), z.number().int().positive().max(500)).optional(),
  include_merge_trace: z.boolean().default(true),
  forgetting_policy: ContextForgettingPolicy.optional(),
});

export const StaticContextBlock = z.object({
  id: z.string().min(1).max(128),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(20000),
  tags: z.array(z.string().min(1).max(64)).max(32).optional(),
  intents: z.array(z.string().min(1).max(64)).max(32).optional(),
  tools: z.array(z.string().min(1).max(128)).max(64).optional(),
  priority: z.number().int().min(0).max(100).default(50),
  always_include: z.boolean().default(false),
});

export const StaticInjectionPolicy = z.object({
  enabled: z.boolean().default(true),
  max_blocks: z.number().int().positive().max(32).default(4),
  min_score: z.number().int().min(0).max(500).default(50),
  include_selection_trace: z.boolean().default(true),
});

export const PlanningContextRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  query_text: z.string().min(1),
  recall_strategy: z.enum(["local", "balanced", "global"]).optional(),
  recall_mode: z.enum(["dense_edge"]).optional(),
  recall_class_aware: z.boolean().optional(),
  consumer_agent_id: z.string().min(1).optional(),
  consumer_team_id: z.string().min(1).optional(),
  // Planner/runtime execution context used by rules + tool selection.
  context: z.any(),
  include_shadow: z.boolean().default(false),
  rules_limit: z.number().int().positive().max(200).default(50),
  run_id: z.string().min(1).optional(),
  tool_candidates: z.array(z.string().min(1)).max(200).optional(),
  tool_strict: z.boolean().default(true),
  limit: z.number().int().positive().max(200).default(30),
  neighborhood_hops: z.number().int().min(1).max(2).default(2),
  return_debug: z.boolean().default(false),
  include_embeddings: z.boolean().default(false),
  include_meta: z.boolean().default(false),
  include_slots: z.boolean().default(false),
  include_slots_preview: z.boolean().default(false),
  slots_preview_keys: z.number().int().positive().max(50).default(10),
  max_nodes: z.number().int().positive().max(200).default(50),
  max_edges: z.number().int().positive().max(100).default(100),
  ranked_limit: z.number().int().positive().max(500).default(100),
  min_edge_weight: z.number().min(0).max(1).default(0),
  min_edge_confidence: z.number().min(0).max(1).default(0),
  context_token_budget: z.number().int().positive().max(256000).optional(),
  context_char_budget: z.number().int().positive().max(1000000).optional(),
  context_compaction_profile: z.enum(["balanced", "aggressive"]).optional(),
  context_optimization_profile: z.enum(["balanced", "aggressive"]).optional(),
  memory_layer_preference: MemoryLayerPreference.optional(),
  // Experimental: return explicit multi-layer context assembly (facts/episodes/rules/decisions/tools/citations).
  return_layered_context: z.boolean().default(false),
  context_layers: ContextLayerConfig.optional(),
  static_context_blocks: z.array(StaticContextBlock).max(100).optional(),
  static_injection: StaticInjectionPolicy.optional(),
  execution_result_summary: z.record(z.unknown()).optional(),
  execution_artifacts: z.array(z.record(z.unknown())).optional(),
  execution_evidence: z.array(z.record(z.unknown())).optional(),
  execution_state_v1: ExecutionStateV1Schema.optional(),
  execution_packet_v1: ExecutionPacketV1Schema.optional(),
});

export type ContextLayerConfigInput = z.infer<typeof ContextLayerConfig>;
export type PlanningContextInput = z.infer<typeof PlanningContextRequest>;

export const ContextAssembleRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  query_text: z.string().min(1),
  recall_strategy: z.enum(["local", "balanced", "global"]).optional(),
  recall_mode: z.enum(["dense_edge"]).optional(),
  recall_class_aware: z.boolean().optional(),
  consumer_agent_id: z.string().min(1).optional(),
  consumer_team_id: z.string().min(1).optional(),
  context: z.any().optional(),
  include_rules: z.boolean().default(true),
  include_shadow: z.boolean().default(false),
  rules_limit: z.number().int().positive().max(200).default(50),
  tool_candidates: z.array(z.string().min(1)).max(200).optional(),
  tool_strict: z.boolean().default(true),
  limit: z.number().int().positive().max(200).default(30),
  neighborhood_hops: z.number().int().min(1).max(2).default(2),
  return_debug: z.boolean().default(false),
  include_embeddings: z.boolean().default(false),
  include_meta: z.boolean().default(false),
  include_slots: z.boolean().default(false),
  include_slots_preview: z.boolean().default(false),
  slots_preview_keys: z.number().int().positive().max(50).default(10),
  max_nodes: z.number().int().positive().max(200).default(50),
  max_edges: z.number().int().positive().max(100).default(100),
  ranked_limit: z.number().int().positive().max(500).default(100),
  min_edge_weight: z.number().min(0).max(1).default(0),
  min_edge_confidence: z.number().min(0).max(1).default(0),
  context_token_budget: z.number().int().positive().max(256000).optional(),
  context_char_budget: z.number().int().positive().max(1000000).optional(),
  context_compaction_profile: z.enum(["balanced", "aggressive"]).optional(),
  context_optimization_profile: z.enum(["balanced", "aggressive"]).optional(),
  memory_layer_preference: MemoryLayerPreference.optional(),
  return_layered_context: z.boolean().default(false),
  context_layers: ContextLayerConfig.optional(),
  static_context_blocks: z.array(StaticContextBlock).max(100).optional(),
  static_injection: StaticInjectionPolicy.optional(),
  execution_result_summary: z.record(z.unknown()).optional(),
  execution_artifacts: z.array(z.record(z.unknown())).optional(),
  execution_evidence: z.array(z.record(z.unknown())).optional(),
  execution_state_v1: ExecutionStateV1Schema.optional(),
  execution_packet_v1: ExecutionPacketV1Schema.optional(),
});

export type ContextAssembleInput = z.infer<typeof ContextAssembleRequest>;

const PlannerPacketEntrySchema = z.object({}).passthrough();

export const ExecutionMemoryIntrospectionRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  consumer_agent_id: z.string().min(1).optional(),
  consumer_team_id: z.string().min(1).optional(),
  limit: z.number().int().positive().max(50).default(8),
});

export type ExecutionMemoryIntrospectionInput = z.infer<typeof ExecutionMemoryIntrospectionRequest>;

export const ExperienceIntelligenceRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  consumer_agent_id: z.string().min(1).optional(),
  consumer_team_id: z.string().min(1).optional(),
  run_id: z.string().min(1).optional(),
  query_text: z.string().min(1),
  context: z.any(),
  candidates: z.array(z.string().min(1)).min(1).max(200),
  include_shadow: z.boolean().default(false),
  rules_limit: z.number().int().positive().max(200).default(50),
  strict: z.boolean().default(true),
  reorder_candidates: z.boolean().default(true),
  execution_result_summary: z.record(z.unknown()).optional(),
  execution_artifacts: z.array(z.record(z.unknown())).optional(),
  execution_evidence: z.array(z.record(z.unknown())).optional(),
  execution_state_v1: ExecutionStateV1Schema.optional(),
  policy_governance_apply_mode: z.enum(["manual", "auto_apply"]).optional(),
  workflow_limit: z.number().int().positive().max(32).default(8),
});

export type ExperienceIntelligenceInput = z.infer<typeof ExperienceIntelligenceRequest>;

export const KickoffRecommendationRequest = ExperienceIntelligenceRequest;

export type KickoffRecommendationInput = z.infer<typeof KickoffRecommendationRequest>;

export const ContinuityFocusItemSchema = z.object({
  source_kind: z.string(),
  continuity_kind: z.string(),
  continuity_phase: z.string(),
  occurred_at: z.string().nullable(),
  title: z.string().nullable(),
  text_summary: z.string().nullable(),
  anchor: z.string().nullable().optional(),
  handoff_kind: z.string().nullable().optional(),
  file_path: z.string().nullable().optional(),
  repo_root: z.string().nullable().optional(),
  symbol: z.string().nullable().optional(),
  next_action: z.string().nullable().optional(),
}).passthrough();

export const ContinuityInspectSummarySchema = z.object({
  inspect_version: z.literal("continuity_inspect_v1"),
  latest_handoff: ContinuityFocusItemSchema.nullable(),
  latest_resume: ContinuityFocusItemSchema.nullable(),
  latest_terminal_run: ContinuityFocusItemSchema.nullable(),
}).passthrough();

export const ContinuityReviewContractSchema = z.object({
  target_files: z.array(z.string()),
  next_action: z.string().nullable(),
  acceptance_checks: z.array(z.string()),
  must_change: z.array(z.string()),
  must_remove: z.array(z.string()),
  must_keep: z.array(z.string()),
  rollback_required: z.boolean(),
}).passthrough();

export const ContinuityReviewPackSummarySchema = z.object({
  pack_version: z.literal("continuity_review_pack_v1"),
  latest_handoff: ContinuityFocusItemSchema.nullable(),
  latest_resume: ContinuityFocusItemSchema.nullable(),
  latest_terminal_run: ContinuityFocusItemSchema.nullable(),
  recovered_handoff: z.record(z.unknown()).nullable(),
  review_contract: ContinuityReviewContractSchema.nullable(),
}).passthrough();

export const ContinuityReviewPackResponseSchema = z.object({
  tenant_id: z.string(),
  scope: z.string(),
  sources: z.array(z.record(z.unknown())),
  items: z.array(z.record(z.unknown())),
  page: z.object({
    limit: z.number().int().nonnegative(),
    offset: z.number().int().nonnegative(),
    returned: z.number().int().nonnegative(),
    has_more: z.boolean(),
  }),
  counters: z.object({
    total_items: z.number().int().nonnegative().optional(),
    returned_items: z.number().int().nonnegative().optional(),
    source_count: z.number().int().nonnegative().optional(),
  }).passthrough().optional(),
  continuity_inspect: ContinuityInspectSummarySchema,
  continuity_review_pack: ContinuityReviewPackSummarySchema,
}).passthrough();

export type ContinuityReviewPackResponse = z.infer<typeof ContinuityReviewPackResponseSchema>;

export const ExperienceIntelligencePathRecommendationSchema = z.object({
  source_kind: z.enum(["recommended_workflow", "candidate_workflow", "none"]),
  anchor_id: z.string().nullable(),
  workflow_signature: z.string().nullable(),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  file_path: z.string().nullable(),
  target_files: z.array(z.string()),
  next_action: z.string().nullable(),
  confidence: z.number().nullable(),
  tool_set: z.array(z.string()),
}).passthrough();

export const ExperienceIntelligenceToolRecommendationSchema = z.object({
  selected_tool: z.string().nullable(),
  ordered_tools: z.array(z.string()),
  preferred_tools: z.array(z.string()),
  allowed_tools: z.array(z.string()),
  trusted_pattern_anchor_ids: z.array(z.string()),
  candidate_pattern_anchor_ids: z.array(z.string()),
  suppressed_pattern_anchor_ids: z.array(z.string()),
}).passthrough();

export const PolicyHintEntrySchema = z.object({
  hint_id: z.string(),
  source_kind: z.enum(["trusted_pattern", "contested_pattern", "stable_workflow", "rehydration_candidate"]),
  hint_kind: z.enum(["tool_preference", "tool_avoidance", "workflow_reuse", "payload_rehydration"]),
  action: z.enum(["prefer", "avoid", "reuse", "rehydrate"]),
  source_anchor_id: z.string(),
  source_anchor_level: z.string().nullable(),
  selected_tool: z.string().nullable(),
  workflow_signature: z.string().nullable(),
  file_path: z.string().nullable(),
  target_files: z.array(z.string()),
  rehydration_mode: z.string().nullable(),
  confidence: z.number().nullable(),
  priority: z.number().int().min(0),
  reason: z.string(),
}).passthrough();
export type PolicyHintEntry = z.infer<typeof PolicyHintEntrySchema>;

export const PolicyHintPackSchema = z.object({
  summary_version: z.literal("policy_hint_pack_v1"),
  total_hints: z.number().int().min(0),
  tool_preference_count: z.number().int().min(0),
  tool_avoidance_count: z.number().int().min(0),
  workflow_reuse_count: z.number().int().min(0),
  payload_rehydration_count: z.number().int().min(0),
  hints: z.array(PolicyHintEntrySchema),
});
export type PolicyHintPack = z.infer<typeof PolicyHintPackSchema>;

export const DerivedPolicySurfaceSchema = z.object({
  summary_version: z.literal("derived_policy_v1"),
  policy_kind: z.literal("tool_preference"),
  source_kind: z.enum(["trusted_pattern", "stable_workflow", "blended"]),
  policy_state: z.enum(["candidate", "stable"]),
  selected_tool: z.string(),
  workflow_signature: z.string().nullable(),
  file_path: z.string().nullable(),
  target_files: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  supporting_anchor_ids: z.array(z.string()),
  reason: z.string(),
  evidence: z.object({
    trusted_pattern_count: z.number().int().min(0),
    stable_workflow_count: z.number().int().min(0),
    usage_count: z.number().int().min(0),
    reuse_success_count: z.number().int().min(0),
    reuse_failure_count: z.number().int().min(0),
    feedback_quality: z.number().nullable(),
  }),
}).passthrough();
export type DerivedPolicySurface = z.infer<typeof DerivedPolicySurfaceSchema>;

export const PolicyContractSchema = z.object({
  summary_version: z.literal("policy_contract_v1"),
  policy_kind: z.literal("tool_preference"),
  source_kind: z.enum(["trusted_pattern", "stable_workflow", "blended"]),
  policy_state: z.enum(["candidate", "stable"]),
  policy_memory_state: z.enum(["active", "contested", "retired"]).default("active"),
  activation_mode: z.enum(["hint", "default"]),
  materialization_state: z.enum(["computed", "persisted"]).default("computed"),
  history_applied: z.boolean(),
  selected_tool: z.string(),
  avoid_tools: z.array(z.string()),
  workflow_signature: z.string().nullable(),
  file_path: z.string().nullable(),
  target_files: z.array(z.string()),
  next_action: z.string().nullable(),
  rehydration_mode: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  source_anchor_ids: z.array(z.string()),
  policy_memory_id: z.string().nullable().default(null),
  reason: z.string(),
}).passthrough();
export type PolicyContract = z.infer<typeof PolicyContractSchema>;

export const PolicyReviewAttentionSchema = z.object({
  node_id: z.string(),
  policy_memory_state: z.enum(["active", "contested", "retired"]),
  selected_tool: z.string().nullable(),
  file_path: z.string().nullable(),
  workflow_signature: z.string().nullable(),
  summary: z.string().nullable(),
  feedback_quality: z.number().nullable(),
  last_feedback_at: z.string().nullable(),
  last_materialized_at: z.string().nullable(),
  review_reason: z.string(),
}).passthrough();
export type PolicyReviewAttention = z.infer<typeof PolicyReviewAttentionSchema>;

export const PolicyReviewSummarySchema = z.object({
  summary_version: z.literal("policy_review_summary_v1"),
  persisted_policy_count: z.number().int().min(0),
  active_policy_count: z.number().int().min(0),
  contested_policy_count: z.number().int().min(0),
  retired_policy_count: z.number().int().min(0),
  review_recommended: z.boolean(),
  selected_policy_memory_id: z.string().nullable(),
  selected_policy_memory_state: z.enum(["active", "contested", "retired"]).nullable(),
  attention_policy: PolicyReviewAttentionSchema.nullable(),
}).passthrough();
export type PolicyReviewSummary = z.infer<typeof PolicyReviewSummarySchema>;

export const PolicyGovernanceApplyActionSchema = z.enum(["refresh", "retire", "reactivate"]);
export type PolicyGovernanceApplyAction = z.infer<typeof PolicyGovernanceApplyActionSchema>;

export const PolicyGovernanceContractSchema = z.object({
  contract_version: z.literal("policy_governance_contract_v1"),
  action: z.enum(["none", "monitor", "refresh", "retire", "reactivate"]),
  applies: z.boolean(),
  review_required: z.boolean(),
  policy_memory_id: z.string().nullable(),
  current_state: z.enum(["active", "contested", "retired"]).nullable(),
  target_state: z.enum(["active", "contested", "retired"]).nullable(),
  selected_tool: z.string().nullable(),
  file_path: z.string().nullable(),
  workflow_signature: z.string().nullable(),
  rationale: z.string(),
  next_action: z.string().nullable(),
}).passthrough();
export type PolicyGovernanceContract = z.infer<typeof PolicyGovernanceContractSchema>;

export const PolicyGovernanceApplyPayloadSchema = z.object({
  payload_version: z.literal("policy_governance_apply_payload_v1"),
  route: z.literal("/v1/memory/policies/governance/apply"),
  method: z.literal("POST"),
  action: PolicyGovernanceApplyActionSchema,
  policy_memory_id: z.string(),
  selected_tool: z.string().nullable(),
  current_state: z.enum(["active", "contested", "retired"]).nullable(),
  target_state: z.enum(["active", "contested", "retired"]).nullable(),
  requires_live_context: z.boolean(),
  request_body: z.record(z.unknown()),
  rationale: z.string(),
}).passthrough();
export type PolicyGovernanceApplyPayload = z.infer<typeof PolicyGovernanceApplyPayloadSchema>;

export const PersistedPolicyMemorySchema = z.object({
  node_id: z.string(),
  node_uri: z.string(),
  client_id: z.string(),
  policy_memory_signature: z.string(),
  selected_tool: z.string(),
  policy_state: z.enum(["candidate", "stable"]),
  policy_memory_state: z.enum(["active", "contested", "retired"]),
  activation_mode: z.enum(["hint", "default"]),
  policy_contract: PolicyContractSchema,
}).passthrough();
export type PersistedPolicyMemory = z.infer<typeof PersistedPolicyMemorySchema>;

export const PolicyGovernanceApplyResultSchema = z.object({
  ok: z.boolean(),
  auto_applied: z.boolean(),
  attempted: z.boolean().default(false),
  trigger: z.string(),
  surface: z.string(),
  action: PolicyGovernanceApplyActionSchema.nullable().default(null),
  policy_memory_id: z.string().nullable().default(null),
  previous_state: z.enum(["active", "contested", "retired"]).nullable().default(null),
  next_state: z.enum(["active", "contested", "retired"]).nullable().default(null),
  policy_memory: PersistedPolicyMemorySchema.nullable().default(null),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).nullable().default(null),
}).passthrough();
export type PolicyGovernanceApplyResult = z.infer<typeof PolicyGovernanceApplyResultSchema>;

export const DelegationLearningSummarySchema = z.object({
  task_family: z.string().nullable(),
  matched_records: z.number().int().min(0),
  truncated: z.boolean(),
  route_role_counts: z.record(z.number().int().min(0)),
  record_outcome_counts: z.record(z.number().int().min(0)),
  recommendation_count: z.number().int().min(0),
}).passthrough();

export const DelegationLearningProjectionSchema = z.object({
  summary_version: z.literal("delegation_learning_projection_v1"),
  learning_summary: DelegationLearningSummarySchema,
  learning_recommendations: z.array(z.lazy(() => DelegationRecordsLearningRecommendationSchema)),
}).passthrough();

export const ExperienceIntelligenceResponseSchema = z.object({
  summary_version: z.literal("experience_intelligence_v1"),
  tenant_id: z.string(),
  scope: z.string(),
  query_text: z.string(),
  recommendation: z.object({
    history_applied: z.boolean(),
    tool: ExperienceIntelligenceToolRecommendationSchema,
    path: ExperienceIntelligencePathRecommendationSchema,
    combined_next_action: z.string().nullable(),
  }).passthrough(),
  policy_hints: PolicyHintPackSchema,
  derived_policy: DerivedPolicySurfaceSchema.nullable(),
  policy_contract: PolicyContractSchema.nullable().default(null),
  learning_summary: DelegationLearningSummarySchema,
  learning_recommendations: z.array(z.lazy(() => DelegationRecordsLearningRecommendationSchema)),
  rationale: z.object({
    summary: z.string(),
  }).passthrough(),
}).passthrough();

export type ExperienceIntelligenceResponse = z.infer<typeof ExperienceIntelligenceResponseSchema>;

export const KickoffRecommendationResponseSchema = z.object({
  summary_version: z.literal("kickoff_recommendation_v1"),
  tenant_id: z.string(),
  scope: z.string(),
  query_text: z.string(),
  kickoff_recommendation: z.lazy(() => KickoffRecommendationSchema).nullable(),
  policy_contract: PolicyContractSchema.nullable().default(null),
  rationale: z.object({
    summary: z.string(),
  }).passthrough(),
}).passthrough();

export type KickoffRecommendationResponse = z.infer<typeof KickoffRecommendationResponseSchema>;

export const FirstStepRecommendationSchema = z.object({
  source_kind: z.enum(["experience_intelligence", "tool_selection"]),
  history_applied: z.boolean(),
  selected_tool: z.string().nullable(),
  file_path: z.string().nullable(),
  next_action: z.string().nullable(),
});

export const KickoffRecommendationSchema = z.object({
  source_kind: z.enum(["experience_intelligence", "tool_selection"]),
  history_applied: z.boolean(),
  selected_tool: z.string().nullable(),
  file_path: z.string().nullable(),
  next_action: z.string().nullable(),
});

export const PatternSignalSummarySchema = z.object({
  candidate_pattern_count: z.number().int().min(0),
  candidate_pattern_tools: z.array(z.string()),
  trusted_pattern_count: z.number().int().min(0),
  contested_pattern_count: z.number().int().min(0),
  trusted_pattern_tools: z.array(z.string()),
  contested_pattern_tools: z.array(z.string()),
});

export type PatternSignalSummary = z.infer<typeof PatternSignalSummarySchema>;

export const WorkflowSignalSummarySchema = z.object({
  stable_workflow_count: z.number().int().min(0),
  promotion_ready_workflow_count: z.number().int().min(0),
  observing_workflow_count: z.number().int().min(0),
  stable_workflow_titles: z.array(z.string()),
  promotion_ready_workflow_titles: z.array(z.string()),
  observing_workflow_titles: z.array(z.string()),
});

export type WorkflowSignalSummary = z.infer<typeof WorkflowSignalSummarySchema>;

export const PatternLifecycleSummarySchema = z.object({
  candidate_count: z.number().int().min(0),
  trusted_count: z.number().int().min(0),
  contested_count: z.number().int().min(0),
  near_promotion_count: z.number().int().min(0),
  counter_evidence_open_count: z.number().int().min(0),
  transition_counts: z.object({
    candidate_observed: z.number().int().min(0),
    promoted_to_trusted: z.number().int().min(0),
    counter_evidence_opened: z.number().int().min(0),
    revalidated_to_trusted: z.number().int().min(0),
  }),
});

export type PatternLifecycleSummary = z.infer<typeof PatternLifecycleSummarySchema>;

export const PatternMaintenanceSummarySchema = z.object({
  model: z.literal("lazy_online_v1"),
  observe_count: z.number().int().min(0),
  retain_count: z.number().int().min(0),
  review_count: z.number().int().min(0),
  promote_candidate_count: z.number().int().min(0),
  review_counter_evidence_count: z.number().int().min(0),
  retain_trusted_count: z.number().int().min(0),
});

export type PatternMaintenanceSummary = z.infer<typeof PatternMaintenanceSummarySchema>;

export const WorkflowLifecycleSummarySchema = z.object({
  candidate_count: z.number().int().min(0),
  stable_count: z.number().int().min(0),
  replay_source_count: z.number().int().min(0),
  rehydration_ready_count: z.number().int().min(0),
  promotion_ready_count: z.number().int().min(0),
  transition_counts: z.object({
    candidate_observed: z.number().int().min(0),
    promoted_to_stable: z.number().int().min(0),
    normalized_latest_stable: z.number().int().min(0),
  }),
});

export type WorkflowLifecycleSummary = z.infer<typeof WorkflowLifecycleSummarySchema>;

export const WorkflowMaintenanceSummarySchema = z.object({
  model: z.literal("lazy_online_v1"),
  observe_count: z.number().int().min(0),
  retain_count: z.number().int().min(0),
  promote_candidate_count: z.number().int().min(0),
  retain_workflow_count: z.number().int().min(0),
});

export type WorkflowMaintenanceSummary = z.infer<typeof WorkflowMaintenanceSummarySchema>;

export const ActionPacketSummarySchema = z.object({
  recommended_workflow_count: z.number().int().min(0),
  candidate_workflow_count: z.number().int().min(0),
  candidate_pattern_count: z.number().int().min(0),
  trusted_pattern_count: z.number().int().min(0),
  contested_pattern_count: z.number().int().min(0),
  rehydration_candidate_count: z.number().int().min(0),
  supporting_knowledge_count: z.number().int().min(0),
  workflow_anchor_ids: z.array(z.string()),
  candidate_workflow_anchor_ids: z.array(z.string()),
  candidate_pattern_anchor_ids: z.array(z.string()),
  trusted_pattern_anchor_ids: z.array(z.string()),
  contested_pattern_anchor_ids: z.array(z.string()),
  rehydration_anchor_ids: z.array(z.string()),
});

export type ActionPacketSummary = z.infer<typeof ActionPacketSummarySchema>;

export const PlannerPacketTextSurfaceSchema = z.object({
  packet_version: z.literal("planner_packet_v1"),
  sections: z.object({
    recommended_workflows: z.array(z.string()),
    candidate_workflows: z.array(z.string()),
    candidate_patterns: z.array(z.string()),
    trusted_patterns: z.array(z.string()),
    contested_patterns: z.array(z.string()),
    rehydration_candidates: z.array(z.string()),
    supporting_knowledge: z.array(z.string()),
  }),
  merged_text: z.string(),
});

export type PlannerPacketTextSurface = z.infer<typeof PlannerPacketTextSurfaceSchema>;

export const ExecutionMemoryDemoSurfaceSchema = z.object({
  surface_version: z.literal("execution_memory_demo_v1"),
  headline: z.string(),
  sections: z.object({
    workflows: z.array(z.string()),
    patterns: z.array(z.string()),
    maintenance: z.array(z.string()),
  }),
  merged_text: z.string(),
});

export type ExecutionMemoryDemoSurface = z.infer<typeof ExecutionMemoryDemoSurfaceSchema>;

export const ExecutionKernelPacketSummarySchema = z.object({
  packet_source_mode: z.string(),
  state_first_assembly: z.boolean(),
  execution_packet_v1_present: z.boolean(),
  execution_state_v1_present: z.boolean(),
  pattern_signal_summary: PatternSignalSummarySchema,
  workflow_signal_summary: WorkflowSignalSummarySchema,
  workflow_lifecycle_summary: WorkflowLifecycleSummarySchema,
  workflow_maintenance_summary: WorkflowMaintenanceSummarySchema,
  pattern_lifecycle_summary: PatternLifecycleSummarySchema,
  pattern_maintenance_summary: PatternMaintenanceSummarySchema,
  action_packet_summary: ActionPacketSummarySchema,
});

export type ExecutionKernelPacketSummary = z.infer<typeof ExecutionKernelPacketSummarySchema>;

export const ExecutionPacketAssemblySummarySchema = z.object({
  packet_source_mode: z.string().nullable(),
  state_first_assembly: z.boolean().nullable(),
  execution_packet_v1_present: z.boolean().nullable(),
  execution_state_v1_present: z.boolean().nullable(),
});

export type ExecutionPacketAssemblySummary = z.infer<typeof ExecutionPacketAssemblySummarySchema>;

export const ExecutionStrategySummarySchema = z.object({
  summary_version: z.literal("execution_strategy_summary_v1"),
  trust_signal: z.string(),
  strategy_profile: z.string(),
  validation_style: z.string(),
  task_family: z.string().nullable(),
  family_scope: z.string(),
  family_candidate_count: z.number().int().min(0),
  selected_working_set: z.array(z.string()),
  selected_validation_paths: z.array(z.string()),
  selected_pattern_summaries: z.array(z.string()),
  preferred_artifact_refs: z.array(z.string()),
  explanation: z.string(),
}).passthrough();

export type ExecutionStrategySummary = z.infer<typeof ExecutionStrategySummarySchema>;

export const ExecutionCollaborationSummarySchema = z.object({
  summary_version: z.literal("execution_collaboration_summary_v1"),
  packet_present: z.boolean(),
  coordination_mode: z.string(),
  current_stage: z.string().nullable(),
  active_role: z.string().nullable(),
  next_action: z.string().nullable(),
  target_file_count: z.number().int().min(0),
  pending_validation_count: z.number().int().min(0),
  unresolved_blocker_count: z.number().int().min(0),
  review_contract_present: z.boolean(),
  review_standard: z.string().nullable(),
  acceptance_check_count: z.number().int().min(0),
  rollback_required: z.boolean(),
  resume_anchor_present: z.boolean(),
  resume_anchor_file_path: z.string().nullable(),
  resume_anchor_symbol: z.string().nullable(),
  artifact_ref_count: z.number().int().min(0),
  evidence_ref_count: z.number().int().min(0),
  side_output_artifact_count: z.number().int().min(0),
  side_output_evidence_count: z.number().int().min(0),
  artifact_refs: z.array(z.string()),
  evidence_refs: z.array(z.string()),
}).passthrough();

export type ExecutionCollaborationSummary = z.infer<typeof ExecutionCollaborationSummarySchema>;

export const ExecutionContinuitySnapshotSummarySchema = z.object({
  summary_version: z.literal("execution_continuity_snapshot_v1"),
  snapshot_mode: z.enum(["memory_only", "packet_backed"]),
  coordination_mode: z.string(),
  trust_signal: z.string(),
  strategy_profile: z.string(),
  validation_style: z.string(),
  task_family: z.string().nullable(),
  family_scope: z.string(),
  selected_tool: z.string().nullable(),
  current_stage: z.string().nullable(),
  active_role: z.string().nullable(),
  next_action: z.string().nullable(),
  working_set: z.array(z.string()),
  validation_paths: z.array(z.string()),
  selected_pattern_summaries: z.array(z.string()),
  preferred_artifact_refs: z.array(z.string()),
  preferred_evidence_refs: z.array(z.string()),
  reviewer_ready: z.boolean(),
  resume_anchor_file_path: z.string().nullable(),
  selected_memory_layers: z.array(z.string()),
  recommended_action: z.string(),
}).passthrough();

export type ExecutionContinuitySnapshotSummary = z.infer<typeof ExecutionContinuitySnapshotSummarySchema>;

export const ExecutionForgettingSummarySchema = z.object({
  summary_version: z.literal("execution_forgetting_summary_v1"),
  substrate_mode: z.enum(["stable", "suppression_present", "forgetting_active"]),
  forgotten_items: z.number().int().min(0),
  forgotten_by_reason: z.record(z.number().int().min(0)),
  primary_forgetting_reason: z.string().nullable(),
  suppressed_pattern_count: z.number().int().min(0),
  suppressed_pattern_anchor_ids: z.array(z.string()),
  suppressed_pattern_sources: z.array(z.string()),
  selected_memory_layers: z.array(z.string()),
  primary_savings_levers: z.array(z.string()),
  stale_signal_count: z.number().int().min(0),
  recommended_action: z.string(),
}).passthrough();

export type ExecutionForgettingSummary = z.infer<typeof ExecutionForgettingSummarySchema>;

export const ExecutionCollaborationRoutingSummarySchema = z.object({
  summary_version: z.literal("execution_collaboration_routing_v1"),
  route_mode: z.enum(["memory_only", "packet_backed"]),
  coordination_mode: z.string(),
  route_intent: z.string(),
  task_brief: z.string().nullable(),
  current_stage: z.string().nullable(),
  active_role: z.string().nullable(),
  selected_tool: z.string().nullable(),
  task_family: z.string().nullable(),
  family_scope: z.string(),
  next_action: z.string().nullable(),
  target_files: z.array(z.string()),
  validation_paths: z.array(z.string()),
  unresolved_blockers: z.array(z.string()),
  hard_constraints: z.array(z.string()),
  review_standard: z.string().nullable(),
  required_outputs: z.array(z.string()),
  acceptance_checks: z.array(z.string()),
  preferred_artifact_refs: z.array(z.string()),
  preferred_evidence_refs: z.array(z.string()),
  routing_drivers: z.array(z.string()),
}).passthrough();

export type ExecutionCollaborationRoutingSummary = z.infer<typeof ExecutionCollaborationRoutingSummarySchema>;

export const ExecutionDelegationRecordsSummarySchema = z.object({
  summary_version: z.literal("execution_delegation_records_v1"),
  record_mode: z.enum(["memory_only", "packet_backed"]),
  route_role: z.string(),
  packet_count: z.number().int().min(0),
  return_count: z.number().int().min(0),
  artifact_routing_count: z.number().int().min(0),
  missing_record_types: z.array(z.string()),
  delegation_packets: z.array(ExecutionDelegationPacketRecordV1Schema),
  delegation_returns: z.array(ExecutionDelegationReturnRecordV1Schema),
  artifact_routing_records: z.array(ExecutionArtifactRoutingRecordV1Schema),
}).passthrough();

export type ExecutionDelegationRecordsSummary = z.infer<typeof ExecutionDelegationRecordsSummarySchema>;

export const ExecutionRoutingSignalSummarySchema = z.object({
  summary_version: z.literal("execution_routing_summary_v1"),
  selected_tool: z.string().nullable(),
  task_family: z.string().nullable(),
  family_scope: z.string(),
  stable_workflow_anchor_ids: z.array(z.string()),
  candidate_workflow_anchor_ids: z.array(z.string()),
  rehydration_anchor_ids: z.array(z.string()),
  workflow_source_kinds: z.array(z.string()),
  same_family_rehydration_anchor_ids: z.array(z.string()),
  other_family_rehydration_anchor_ids: z.array(z.string()),
  unknown_family_rehydration_anchor_ids: z.array(z.string()),
}).passthrough();

export type ExecutionRoutingSignalSummary = z.infer<typeof ExecutionRoutingSignalSummarySchema>;

export const ExecutionMaintenanceSummarySchema = z.object({
  summary_version: z.literal("execution_maintenance_summary_v1"),
  forgotten_items: z.number().int().min(0),
  forgotten_by_reason: z.record(z.number().int().min(0)),
  suppressed_pattern_count: z.number().int().min(0),
  stable_workflow_count: z.number().int().min(0),
  promotion_ready_workflow_count: z.number().int().min(0),
  selected_memory_layers: z.array(z.string()),
  primary_savings_levers: z.array(z.string()),
  recommended_action: z.string(),
}).passthrough();

export type ExecutionMaintenanceSummary = z.infer<typeof ExecutionMaintenanceSummarySchema>;

export const ExecutionInstrumentationSummarySchema = z.object({
  summary_version: z.literal("execution_instrumentation_summary_v1"),
  task_family: z.string().nullable(),
  family_scope: z.string(),
  family_hit: z.boolean(),
  family_reason: z.string(),
  selected_pattern_hit_count: z.number().int().min(0),
  selected_pattern_miss_count: z.number().int().min(0),
  rehydration_candidate_count: z.number().int().min(0),
  known_family_rehydration_count: z.number().int().min(0),
  same_family_rehydration_count: z.number().int().min(0),
  other_family_rehydration_count: z.number().int().min(0),
  unknown_family_rehydration_count: z.number().int().min(0),
  rehydration_family_hit_rate: z.number().min(0).max(1),
  same_family_rehydration_anchor_ids: z.array(z.string()),
  other_family_rehydration_anchor_ids: z.array(z.string()),
}).passthrough();

export type ExecutionInstrumentationSummary = z.infer<typeof ExecutionInstrumentationSummarySchema>;

export const ExecutionSummaryV1Schema = z.object({
  summary_version: z.literal("execution_summary_v1"),
  planner_packet: PlannerPacketTextSurfaceSchema.nullable(),
  pattern_signals: z.array(PlannerPacketEntrySchema),
  workflow_signals: z.array(PlannerPacketEntrySchema),
  packet_assembly: ExecutionPacketAssemblySummarySchema,
  strategy_summary: ExecutionStrategySummarySchema,
  collaboration_summary: ExecutionCollaborationSummarySchema,
  continuity_snapshot_summary: ExecutionContinuitySnapshotSummarySchema,
  routing_signal_summary: ExecutionRoutingSignalSummarySchema,
  maintenance_summary: ExecutionMaintenanceSummarySchema,
  forgetting_summary: ExecutionForgettingSummarySchema,
  collaboration_routing_summary: ExecutionCollaborationRoutingSummarySchema,
  delegation_records_summary: ExecutionDelegationRecordsSummarySchema,
  instrumentation_summary: ExecutionInstrumentationSummarySchema,
  pattern_signal_summary: PatternSignalSummarySchema,
  workflow_signal_summary: WorkflowSignalSummarySchema,
  workflow_lifecycle_summary: WorkflowLifecycleSummarySchema,
  workflow_maintenance_summary: WorkflowMaintenanceSummarySchema,
  pattern_lifecycle_summary: PatternLifecycleSummarySchema,
  pattern_maintenance_summary: PatternMaintenanceSummarySchema,
  action_packet_summary: ActionPacketSummarySchema,
}).passthrough();

export type ExecutionSummaryV1 = z.infer<typeof ExecutionSummaryV1Schema>;

export const ExecutionMemoryIntrospectionResponseSchema = z.object({
  summary_version: z.literal("execution_memory_introspection_v1"),
  tenant_id: z.string(),
  scope: z.string(),
  inventory: z.object({
    raw_workflow_anchor_count: z.number().int().min(0),
    raw_workflow_candidate_count: z.number().int().min(0),
    suppressed_candidate_workflow_count: z.number().int().min(0),
    continuity_projected_candidate_count: z.number().int().min(0),
    continuity_auto_promoted_workflow_count: z.number().int().min(0),
    raw_pattern_anchor_count: z.number().int().min(0),
    raw_distilled_evidence_count: z.number().int().min(0),
    raw_distilled_fact_count: z.number().int().min(0),
  }),
  continuity_projection_report: z.object({
    sampled_source_event_count: z.number().int().min(0),
    decision_counts: z.object({
      projected: z.number().int().min(0),
      skipped_missing_execution_continuity: z.number().int().min(0),
      skipped_invalid_execution_state: z.number().int().min(0),
      skipped_invalid_execution_packet: z.number().int().min(0),
      skipped_existing_workflow_memory: z.number().int().min(0),
      skipped_stable_exists: z.number().int().min(0),
      eligible_without_projection: z.number().int().min(0),
    }),
    samples: z.array(z.object({
      source_node_id: z.string(),
      source_client_id: z.string().nullable(),
      title: z.string().nullable(),
      decision: z.string(),
      workflow_signature: z.string().nullable(),
      projection_client_id: z.string().nullable(),
    })),
  }),
  demo_surface: ExecutionMemoryDemoSurfaceSchema,
  execution_summary: ExecutionSummaryV1Schema,
  recommended_workflows: z.array(PlannerPacketEntrySchema),
  candidate_workflows: z.array(PlannerPacketEntrySchema),
  candidate_patterns: z.array(PlannerPacketEntrySchema),
  trusted_patterns: z.array(PlannerPacketEntrySchema),
  contested_patterns: z.array(PlannerPacketEntrySchema),
  rehydration_candidates: z.array(PlannerPacketEntrySchema),
  supporting_knowledge: z.array(PlannerPacketEntrySchema),
  pattern_signals: z.array(PlannerPacketEntrySchema),
  workflow_signals: z.array(PlannerPacketEntrySchema),
  action_packet_summary: ActionPacketSummarySchema,
  pattern_signal_summary: PatternSignalSummarySchema,
  workflow_signal_summary: WorkflowSignalSummarySchema,
  workflow_lifecycle_summary: WorkflowLifecycleSummarySchema,
  workflow_maintenance_summary: WorkflowMaintenanceSummarySchema,
  pattern_lifecycle_summary: PatternLifecycleSummarySchema,
  pattern_maintenance_summary: PatternMaintenanceSummarySchema,
});

export type ExecutionMemoryIntrospectionResponse = z.infer<typeof ExecutionMemoryIntrospectionResponseSchema>;

export const EvolutionInspectRequest = ExperienceIntelligenceRequest;
export type EvolutionInspectInput = z.infer<typeof EvolutionInspectRequest>;

export const EvolutionInspectSummarySchema = z.object({
  summary_version: z.literal("evolution_inspect_summary_v1"),
  history_applied: z.boolean(),
  selected_tool: z.string().nullable(),
  recommended_file_path: z.string().nullable(),
  recommended_next_action: z.string().nullable(),
  stable_workflow_count: z.number().int().min(0),
  promotion_ready_workflow_count: z.number().int().min(0),
  trusted_pattern_count: z.number().int().min(0),
  contested_pattern_count: z.number().int().min(0),
  suppressed_pattern_count: z.number().int().min(0),
  distilled_evidence_count: z.number().int().min(0).default(0),
  distilled_fact_count: z.number().int().min(0).default(0),
}).passthrough();

export const EvolutionInspectResponseSchema = z.object({
  summary_version: z.literal("evolution_inspect_v1"),
  tenant_id: z.string(),
  scope: z.string(),
  query_text: z.string(),
  experience_intelligence: ExperienceIntelligenceResponseSchema,
  policy_hints: PolicyHintPackSchema.optional(),
  derived_policy: DerivedPolicySurfaceSchema.nullable(),
  policy_contract: PolicyContractSchema.nullable().default(null),
  policy_review: PolicyReviewSummarySchema,
  policy_governance_contract: PolicyGovernanceContractSchema,
  policy_governance_apply_payload: PolicyGovernanceApplyPayloadSchema.nullable().default(null),
  policy_governance_apply_result: PolicyGovernanceApplyResultSchema.nullable().default(null),
  kickoff_recommendation: KickoffRecommendationResponseSchema,
  execution_introspection: ExecutionMemoryIntrospectionResponseSchema,
  evolution_summary: EvolutionInspectSummarySchema,
}).passthrough();

export const EvolutionReviewContractSchema = z.object({
  selected_tool: z.string().nullable(),
  file_path: z.string().nullable(),
  target_files: z.array(z.string()),
  next_action: z.string().nullable(),
  stable_workflow_anchor_id: z.string().nullable(),
  promotion_ready_anchor_ids: z.array(z.string()),
  trusted_pattern_anchor_ids: z.array(z.string()),
  contested_pattern_anchor_ids: z.array(z.string()),
  suppressed_pattern_anchor_ids: z.array(z.string()),
}).passthrough();

export const EvolutionReviewPackSummarySchema = z.object({
  pack_version: z.literal("evolution_review_pack_v1"),
  stable_workflow: z.record(z.unknown()).nullable(),
  promotion_ready_workflow: z.record(z.unknown()).nullable(),
  trusted_pattern: z.record(z.unknown()).nullable(),
  contested_pattern: z.record(z.unknown()).nullable(),
  derived_policy: DerivedPolicySurfaceSchema.nullable(),
  policy_contract: PolicyContractSchema.nullable().default(null),
  policy_review: PolicyReviewSummarySchema,
  policy_governance_contract: PolicyGovernanceContractSchema,
  policy_governance_apply_payload: PolicyGovernanceApplyPayloadSchema.nullable().default(null),
  policy_governance_apply_result: PolicyGovernanceApplyResultSchema.nullable().default(null),
  review_contract: EvolutionReviewContractSchema,
  learning_summary: DelegationLearningSummarySchema,
  learning_recommendations: z.array(z.lazy(() => DelegationRecordsLearningRecommendationSchema)),
}).passthrough();

export const EvolutionReviewPackResponseSchema = z.object({
  summary_version: z.literal("evolution_review_pack_v1"),
  tenant_id: z.string(),
  scope: z.string(),
  query_text: z.string(),
  evolution_inspect: EvolutionInspectResponseSchema,
  evolution_review_pack: EvolutionReviewPackSummarySchema,
}).passthrough();

export type EvolutionReviewPackResponse = z.infer<typeof EvolutionReviewPackResponseSchema>;

export const AgentMemoryInspectRequest = ExperienceIntelligenceRequest.extend({
  handoff_id: z.string().min(1).optional(),
  handoff_uri: z.string().min(1).optional(),
  anchor: z.string().min(1).optional(),
  repo_root: z.string().min(1).optional(),
  file_path: z.string().min(1).optional(),
  symbol: z.string().min(1).optional(),
  handoff_kind: z.enum(["patch_handoff", "review_handoff", "task_handoff"]).optional(),
  memory_lane: z.enum(["private", "shared"]).optional(),
  include_payload: z.boolean().optional(),
  session_id: z.string().min(1).max(128).optional(),
  source_kind: z.string().min(1).optional(),
  continuity_kind: z.string().min(1).optional(),
  continuity_phase: z.string().min(1).optional(),
  include_meta: z.boolean().default(false),
  limit: z.coerce.number().int().positive().max(20).default(5),
  offset: z.coerce.number().int().min(0).max(200000).default(0),
});

export type AgentMemoryInspectInput = z.infer<typeof AgentMemoryInspectRequest>;

export const AgentMemoryInspectSummarySchema = z.object({
  summary_version: z.literal("agent_memory_inspect_summary_v1"),
  has_continuity: z.boolean(),
  latest_handoff_anchor: z.string().nullable(),
  latest_resume_source_kind: z.string().nullable(),
  selected_tool: z.string().nullable(),
  recommended_file_path: z.string().nullable(),
  recommended_next_action: z.string().nullable(),
  history_applied: z.boolean(),
  stable_workflow_count: z.number().int().min(0),
  promotion_ready_workflow_count: z.number().int().min(0),
  trusted_pattern_count: z.number().int().min(0),
  suppressed_pattern_count: z.number().int().min(0),
  distilled_evidence_count: z.number().int().min(0).default(0),
  distilled_fact_count: z.number().int().min(0).default(0),
  handoff_related_items: z.number().int().min(0),
  resume_related_items: z.number().int().min(0),
  derived_policy_source_kind: z.enum(["trusted_pattern", "stable_workflow", "blended"]).nullable().default(null),
  derived_policy_selected_tool: z.string().nullable().default(null),
  derived_policy_state: z.enum(["candidate", "stable"]).nullable().default(null),
  policy_activation_mode: z.enum(["hint", "default"]).nullable().default(null),
  policy_review_recommended: z.boolean().default(false),
  contested_policy_count: z.number().int().min(0).default(0),
  retired_policy_count: z.number().int().min(0).default(0),
  selected_policy_memory_state: z.enum(["active", "contested", "retired"]).nullable().default(null),
  policy_governance_action: z.enum(["none", "monitor", "refresh", "retire", "reactivate"]).default("none"),
  policy_governance_review_required: z.boolean().default(false),
  policy_governance_apply_payload: PolicyGovernanceApplyPayloadSchema.nullable().default(null),
  policy_governance_auto_applied: z.boolean().default(false),
});

export type AgentMemoryInspectSummary = z.infer<typeof AgentMemoryInspectSummarySchema>;

export const AgentMemoryInspectResponseSchema = z.object({
  summary_version: z.literal("agent_memory_inspect_v1"),
  tenant_id: z.string(),
  scope: z.string(),
  query_text: z.string(),
  continuity_inspect: ContinuityInspectSummarySchema.nullable(),
  continuity_review_pack: ContinuityReviewPackSummarySchema.nullable(),
  evolution_inspect: EvolutionInspectResponseSchema,
  evolution_review_pack: EvolutionReviewPackSummarySchema,
  derived_policy: DerivedPolicySurfaceSchema.nullable().default(null),
  policy_contract: PolicyContractSchema.nullable().default(null),
  policy_review: PolicyReviewSummarySchema,
  policy_governance_contract: PolicyGovernanceContractSchema,
  policy_governance_apply_payload: PolicyGovernanceApplyPayloadSchema.nullable().default(null),
  policy_governance_apply_result: PolicyGovernanceApplyResultSchema.nullable().default(null),
  agent_memory_summary: AgentMemoryInspectSummarySchema,
}).passthrough();

export type AgentMemoryInspectResponse = z.infer<typeof AgentMemoryInspectResponseSchema>;

export const AgentMemoryReviewPackRequest = AgentMemoryInspectRequest;
export type AgentMemoryReviewPackInput = z.infer<typeof AgentMemoryReviewPackRequest>;

export const AgentMemoryReviewPackSummarySchema = z.object({
  pack_version: z.literal("agent_memory_review_pack_v1"),
  selected_tool: z.string().nullable(),
  recommended_file_path: z.string().nullable(),
  recommended_next_action: z.string().nullable(),
  latest_handoff_anchor: z.string().nullable(),
  latest_resume_source_kind: z.string().nullable(),
  stable_workflow_anchor_id: z.string().nullable(),
  promotion_ready_anchor_ids: z.array(z.string()),
  trusted_pattern_anchor_ids: z.array(z.string()),
  contested_pattern_anchor_ids: z.array(z.string()),
  suppressed_pattern_anchor_ids: z.array(z.string()),
  handoff_target_files: z.array(z.string()),
  acceptance_checks: z.array(z.string()),
  must_change: z.array(z.string()),
  must_remove: z.array(z.string()),
  must_keep: z.array(z.string()),
  rollback_required: z.boolean(),
  derived_policy: DerivedPolicySurfaceSchema.nullable().default(null),
  policy_contract: PolicyContractSchema.nullable().default(null),
  policy_review: PolicyReviewSummarySchema,
  policy_governance_contract: PolicyGovernanceContractSchema,
  policy_governance_apply_payload: PolicyGovernanceApplyPayloadSchema.nullable().default(null),
  policy_governance_apply_result: PolicyGovernanceApplyResultSchema.nullable().default(null),
});

export type AgentMemoryReviewPackSummary = z.infer<typeof AgentMemoryReviewPackSummarySchema>;

export const AgentMemoryReviewPackResponseSchema = z.object({
  summary_version: z.literal("agent_memory_review_pack_v1"),
  tenant_id: z.string(),
  scope: z.string(),
  query_text: z.string(),
  agent_memory_inspect: AgentMemoryInspectResponseSchema,
  agent_memory_review_pack: AgentMemoryReviewPackSummarySchema,
}).passthrough();

export type AgentMemoryReviewPackResponse = z.infer<typeof AgentMemoryReviewPackResponseSchema>;

export const AgentMemoryResumePackRequest = AgentMemoryInspectRequest;
export type AgentMemoryResumePackInput = z.infer<typeof AgentMemoryResumePackRequest>;

export const AgentMemoryResumePackSummarySchema = z.object({
  pack_version: z.literal("agent_memory_resume_pack_v1"),
  latest_handoff_anchor: z.string().nullable(),
  latest_resume_source_kind: z.string().nullable(),
  resume_selected_tool: z.string().nullable(),
  resume_file_path: z.string().nullable(),
  resume_target_files: z.array(z.string()),
  resume_next_action: z.string().nullable(),
  stable_workflow_anchor_id: z.string().nullable(),
  promotion_ready_anchor_ids: z.array(z.string()),
  trusted_pattern_anchor_ids: z.array(z.string()),
  suppressed_pattern_anchor_ids: z.array(z.string()),
  rollback_required: z.boolean(),
  recovered_handoff: z.record(z.unknown()).nullable(),
  execution_ready_handoff: z.record(z.unknown()).nullable(),
  derived_policy: DerivedPolicySurfaceSchema.nullable().default(null),
  policy_contract: PolicyContractSchema.nullable().default(null),
  policy_governance_apply_payload: PolicyGovernanceApplyPayloadSchema.nullable().default(null),
  policy_governance_apply_result: PolicyGovernanceApplyResultSchema.nullable().default(null),
});

export type AgentMemoryResumePackSummary = z.infer<typeof AgentMemoryResumePackSummarySchema>;

export const AgentMemoryResumePackResponseSchema = z.object({
  summary_version: z.literal("agent_memory_resume_pack_v1"),
  tenant_id: z.string(),
  scope: z.string(),
  query_text: z.string(),
  agent_memory_inspect: AgentMemoryInspectResponseSchema,
  agent_memory_resume_pack: AgentMemoryResumePackSummarySchema,
}).passthrough();

export type AgentMemoryResumePackResponse = z.infer<typeof AgentMemoryResumePackResponseSchema>;

export const AgentMemoryHandoffPackRequest = AgentMemoryInspectRequest;
export type AgentMemoryHandoffPackInput = z.infer<typeof AgentMemoryHandoffPackRequest>;

export const AgentMemoryHandoffPackSummarySchema = z.object({
  pack_version: z.literal("agent_memory_handoff_pack_v1"),
  latest_handoff_anchor: z.string().nullable(),
  handoff_kind: z.string().nullable(),
  handoff_file_path: z.string().nullable(),
  handoff_repo_root: z.string().nullable(),
  handoff_symbol: z.string().nullable(),
  handoff_target_files: z.array(z.string()),
  handoff_next_action: z.string().nullable(),
  acceptance_checks: z.array(z.string()),
  must_change: z.array(z.string()),
  must_remove: z.array(z.string()),
  must_keep: z.array(z.string()),
  rollback_required: z.boolean(),
  stable_workflow_anchor_id: z.string().nullable(),
  trusted_pattern_anchor_ids: z.array(z.string()),
  suppressed_pattern_anchor_ids: z.array(z.string()),
  recovered_handoff: z.record(z.unknown()).nullable(),
  execution_ready_handoff: z.record(z.unknown()).nullable(),
  derived_policy: DerivedPolicySurfaceSchema.nullable().default(null),
  policy_contract: PolicyContractSchema.nullable().default(null),
  policy_governance_apply_payload: PolicyGovernanceApplyPayloadSchema.nullable().default(null),
  policy_governance_apply_result: PolicyGovernanceApplyResultSchema.nullable().default(null),
});

export type AgentMemoryHandoffPackSummary = z.infer<typeof AgentMemoryHandoffPackSummarySchema>;

export const AgentMemoryHandoffPackResponseSchema = z.object({
  summary_version: z.literal("agent_memory_handoff_pack_v1"),
  tenant_id: z.string(),
  scope: z.string(),
  query_text: z.string(),
  agent_memory_inspect: AgentMemoryInspectResponseSchema,
  agent_memory_handoff_pack: AgentMemoryHandoffPackSummarySchema,
}).passthrough();

export type AgentMemoryHandoffPackResponse = z.infer<typeof AgentMemoryHandoffPackResponseSchema>;

export const PolicyGovernanceApplyRequestSchema = ExperienceIntelligenceRequest.partial()
  .extend({
    tenant_id: z.string().min(1).optional(),
    scope: z.string().min(1).optional(),
    actor: z.string().min(1).optional(),
    policy_memory_id: z.string().uuid(),
    action: PolicyGovernanceApplyActionSchema,
    reason: z.string().min(1).max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action !== "refresh" && value.action !== "reactivate") return;
    if (typeof value.query_text !== "string" || !value.query_text.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["query_text"],
        message: "must set query_text for refresh/reactivate",
      });
    }
    if (value.context === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["context"],
        message: "must set context for refresh/reactivate",
      });
    }
    if (!Array.isArray(value.candidates) || value.candidates.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["candidates"],
        message: "must set candidates for refresh/reactivate",
      });
    }
  });

export type PolicyGovernanceApplyInput = z.infer<typeof PolicyGovernanceApplyRequestSchema>;

export const PolicyGovernanceApplyResponseSchema = z.object({
  ok: z.literal(true),
  tenant_id: z.string(),
  scope: z.string(),
  action: PolicyGovernanceApplyActionSchema,
  applied: z.boolean(),
  actor: z.string().nullable(),
  reason: z.string().nullable(),
  policy_memory_id: z.string(),
  previous_state: z.enum(["active", "contested", "retired"]),
  next_state: z.enum(["active", "contested", "retired"]),
  governance_contract: PolicyGovernanceContractSchema,
  live_policy_contract: PolicyContractSchema.nullable(),
  policy_memory: PersistedPolicyMemorySchema,
}).passthrough();

export type PolicyGovernanceApplyResponse = z.infer<typeof PolicyGovernanceApplyResponseSchema>;

export const PlanningSummaryContractSchema = z.object({
  summary_version: z.literal("planning_summary_v1"),
  planner_explanation: z.string().nullable(),
  first_step_recommendation: FirstStepRecommendationSchema.nullable().optional(),
  workflow_signal_summary: WorkflowSignalSummarySchema,
  action_packet_summary: ActionPacketSummarySchema,
  workflow_lifecycle_summary: WorkflowLifecycleSummarySchema,
  workflow_maintenance_summary: WorkflowMaintenanceSummarySchema,
  pattern_lifecycle_summary: PatternLifecycleSummarySchema,
  pattern_maintenance_summary: PatternMaintenanceSummarySchema,
  trusted_pattern_count: z.number().int().min(0),
  contested_pattern_count: z.number().int().min(0),
  trusted_pattern_tools: z.array(z.string()),
  contested_pattern_tools: z.array(z.string()),
}).passthrough();

export type PlanningSummaryContract = z.infer<typeof PlanningSummaryContractSchema>;

export const AssemblySummaryContractSchema = z.object({
  summary_version: z.literal("assembly_summary_v1"),
  planner_explanation: z.string().nullable(),
  first_step_recommendation: FirstStepRecommendationSchema.nullable().optional(),
  workflow_signal_summary: WorkflowSignalSummarySchema,
  action_packet_summary: ActionPacketSummarySchema,
  workflow_lifecycle_summary: WorkflowLifecycleSummarySchema,
  workflow_maintenance_summary: WorkflowMaintenanceSummarySchema,
  pattern_lifecycle_summary: PatternLifecycleSummarySchema,
  pattern_maintenance_summary: PatternMaintenanceSummarySchema,
  trusted_pattern_count: z.number().int().min(0),
  contested_pattern_count: z.number().int().min(0),
  trusted_pattern_tools: z.array(z.string()),
  contested_pattern_tools: z.array(z.string()),
}).passthrough();

export type AssemblySummaryContract = z.infer<typeof AssemblySummaryContractSchema>;

export const ContextOperatorProjectionSchema = z.object({
  delegation_learning: DelegationLearningProjectionSchema.optional(),
}).passthrough();

export type ContextOperatorProjection = z.infer<typeof ContextOperatorProjectionSchema>;

const PlannerPacketRouteContractBaseSchema = z.object({
  planner_packet: PlannerPacketTextSurfaceSchema,
  pattern_signals: z.array(PlannerPacketEntrySchema),
  workflow_signals: z.array(PlannerPacketEntrySchema),
  execution_kernel: ExecutionKernelPacketSummarySchema,
  execution_summary: ExecutionSummaryV1Schema,
}).passthrough();

export const PlanningContextRouteContractSchema = PlannerPacketRouteContractBaseSchema.extend({
  planning_summary: PlanningSummaryContractSchema,
  kickoff_recommendation: KickoffRecommendationSchema.nullable().optional(),
  operator_projection: ContextOperatorProjectionSchema.optional(),
});

export type PlanningContextRouteContract = z.infer<typeof PlanningContextRouteContractSchema>;

export const ContextAssembleRouteContractSchema = PlannerPacketRouteContractBaseSchema.extend({
  assembly_summary: AssemblySummaryContractSchema,
  kickoff_recommendation: KickoffRecommendationSchema.nullable().optional(),
  operator_projection: ContextOperatorProjectionSchema.optional(),
});

export type ContextAssembleRouteContract = z.infer<typeof ContextAssembleRouteContractSchema>;

export const DecisionPatternSummaryContractSchema = z.object({
  used_trusted_pattern_anchor_ids: z.array(z.string()),
  used_trusted_pattern_tools: z.array(z.string()),
  used_trusted_pattern_affinity_levels: z.array(z.string()).optional(),
  skipped_contested_pattern_anchor_ids: z.array(z.string()),
  skipped_contested_pattern_tools: z.array(z.string()),
  skipped_contested_pattern_affinity_levels: z.array(z.string()).optional(),
  skipped_suppressed_pattern_anchor_ids: z.array(z.string()),
  skipped_suppressed_pattern_tools: z.array(z.string()),
  skipped_suppressed_pattern_affinity_levels: z.array(z.string()).optional(),
});

export type DecisionPatternSummaryContract = z.infer<typeof DecisionPatternSummaryContractSchema>;

export const PatternMatchAnchorContractSchema = z.object({
  node_id: z.string(),
  selected_tool: z.string().nullable().optional(),
  pattern_state: z.string().nullable().optional(),
  credibility_state: z.string().nullable().optional(),
  trust_hardening: MemoryPatternTrustHardeningSchema.nullable().optional(),
  suppressed: z.boolean().optional(),
  suppression_mode: z.string().nullable().optional(),
  suppression_reason: z.string().nullable().optional(),
  suppressed_until: z.string().nullable().optional(),
  trusted: z.boolean().optional(),
  counter_evidence_open: z.boolean().optional(),
  last_transition: z.string().nullable().optional(),
  maintenance_state: z.string().nullable().optional(),
  offline_priority: z.string().nullable().optional(),
  distinct_run_count: z.number().nullable().optional(),
  required_distinct_runs: z.number().nullable().optional(),
  similarity: z.number().nullable().optional(),
  confidence: z.number().nullable().optional(),
  task_signature: z.string().nullable().optional(),
  task_family: z.string().nullable().optional(),
  error_family: z.string().nullable().optional(),
  affinity_level: z.string().nullable().optional(),
  affinity_score: z.number().nullable().optional(),
  title: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
}).passthrough();

export type PatternMatchAnchorContract = z.infer<typeof PatternMatchAnchorContractSchema>;

export const ToolsSelectionSummaryContractSchema = z.object({
  summary_version: z.literal("tools_selection_summary_v1"),
  selected_tool: z.string().nullable(),
  trusted_pattern_count: z.number().int().min(0),
  contested_pattern_count: z.number().int().min(0),
  suppressed_pattern_count: z.number().int().min(0),
  used_trusted_pattern_tools: z.array(z.string()),
  used_trusted_pattern_affinity_levels: z.array(z.string()).optional(),
  skipped_contested_pattern_tools: z.array(z.string()),
  skipped_contested_pattern_affinity_levels: z.array(z.string()).optional(),
  skipped_suppressed_pattern_tools: z.array(z.string()),
  skipped_suppressed_pattern_affinity_levels: z.array(z.string()).optional(),
  provenance_explanation: z.string().nullable(),
  pattern_lifecycle_summary: PatternLifecycleSummarySchema,
  pattern_maintenance_summary: PatternMaintenanceSummarySchema,
}).passthrough();

export type ToolsSelectionSummaryContract = z.infer<typeof ToolsSelectionSummaryContractSchema>;

export const ToolsSelectRouteContractSchema = z.object({
  tenant_id: z.string(),
  scope: z.string(),
  candidates: z.array(z.string()),
  selection: z.object({
    selected: z.string().nullable(),
    ordered: z.array(z.string()),
    preferred: z.array(z.string()),
    allowed: z.array(z.string()),
  }).passthrough(),
  execution_kernel: z.object({}).passthrough(),
  rules: z.object({
    considered: z.number().int().min(0),
    matched: z.number().int().min(0),
  }).passthrough(),
  pattern_matches: z.object({
    matched: z.number().int().min(0),
    trusted: z.number().int().min(0),
    preferred_tools: z.array(z.string()),
    anchors: z.array(PatternMatchAnchorContractSchema),
  }).passthrough(),
  decision: z.object({
    decision_id: z.string(),
    decision_uri: z.string(),
    run_id: z.string().nullable(),
    selected_tool: z.string().nullable(),
    source_rule_ids: z.array(z.string()),
    pattern_summary: DecisionPatternSummaryContractSchema,
  }).passthrough(),
  selection_summary: ToolsSelectionSummaryContractSchema,
}).passthrough();

export type ToolsSelectRouteContract = z.infer<typeof ToolsSelectRouteContractSchema>;

export const ReplayLearningProjectionResultContractSchema = z.object({
  triggered: z.boolean(),
  delivery: z.enum(["async_outbox", "sync_inline"]),
  status: z.enum(["queued", "applied", "skipped", "failed"]),
  reason: z.string().nullable().optional(),
  job_key: z.string().nullable().optional(),
  generated_rule_node_id: z.string().nullable().optional(),
  generated_episode_node_id: z.string().nullable().optional(),
}).passthrough();

export type ReplayLearningProjectionResultContract = z.infer<typeof ReplayLearningProjectionResultContractSchema>;

export const ReplayRepairReviewGovernancePolicyEffectSchema = z.object({
  source: z.enum(["default_learning_projection", "promote_memory_governance_review"]),
  applies: z.boolean(),
  base_target_rule_state: z.enum(["draft", "shadow"]),
  review_suggested_target_rule_state: z.enum(["draft", "shadow"]).nullable().optional(),
  effective_target_rule_state: z.enum(["draft", "shadow"]),
  reason_code: z.enum([
    "review_not_supplied",
    "review_not_admissible",
    "explicit_target_rule_state_preserved",
    "review_did_not_raise_target_rule_state",
    "high_strategic_value_workflow_promotion",
  ]),
}).passthrough();

export type ReplayRepairReviewGovernancePolicyEffect = z.infer<typeof ReplayRepairReviewGovernancePolicyEffectSchema>;

export const ReplayRepairReviewGovernanceDecisionTraceSchema = z.object({
  trace_version: z.literal("replay_governance_trace_v1"),
  review_supplied: z.boolean(),
  admissibility_evaluated: z.boolean(),
  admissible: z.boolean().nullable(),
  policy_effect_applies: z.boolean(),
  base_target_rule_state: z.enum(["draft", "shadow"]),
  effective_target_rule_state: z.enum(["draft", "shadow"]),
  runtime_apply_changed_target_rule_state: z.boolean(),
  stage_order: z.array(z.enum([
    "review_packet_built",
    "review_result_received",
    "admissibility_evaluated",
    "policy_effect_derived",
    "runtime_policy_applied",
  ])).min(2).max(5),
  reason_codes: z.array(z.string().min(1).max(128)).max(8).default([]),
}).passthrough();

export type ReplayRepairReviewGovernanceDecisionTrace = z.infer<typeof ReplayRepairReviewGovernanceDecisionTraceSchema>;

export const ReplayRepairReviewGovernancePreviewSchema = z.object({
  promote_memory: z.object({
    review_packet: MemoryPromoteSemanticReviewPacketSchema,
    review_result: MemoryPromoteSemanticReviewResultSchema.nullable().optional(),
    admissibility: MemoryAdmissibilityResultSchema.nullable().optional(),
    policy_effect: ReplayRepairReviewGovernancePolicyEffectSchema.nullable().optional(),
    decision_trace: ReplayRepairReviewGovernanceDecisionTraceSchema.nullable().optional(),
  }),
}).passthrough();

export type ReplayRepairReviewGovernancePreview = z.infer<typeof ReplayRepairReviewGovernancePreviewSchema>;

export const ReplayRepairReviewGovernanceInputSchema = z.object({
  promote_memory: z.object({
    review_result: MemoryPromoteSemanticReviewResultSchema,
  }),
}).passthrough();

export type ReplayRepairReviewGovernanceInput = z.infer<typeof ReplayRepairReviewGovernanceInputSchema>;

export const ReplayPlaybookRepairReviewResponseSchema = z.object({
  tenant_id: z.string(),
  scope: z.string(),
  playbook_id: z.string(),
  reviewed_version: z.number().int().min(1),
  to_version: z.number().int().min(1),
  action: z.enum(["approve", "reject"]),
  status: z.enum(["draft", "shadow", "active", "disabled"]),
  review_state: z.enum(["approved", "rejected"]),
  shadow_validation: z.unknown().nullable().optional(),
  auto_promotion: z.unknown().nullable().optional(),
  playbook_node_id: z.string().nullable(),
  playbook_uri: z.string().nullable(),
  commit_id: z.string().nullable(),
  commit_uri: z.string().nullable(),
  commit_hash: z.string().nullable(),
  learning_projection_result: ReplayLearningProjectionResultContractSchema.nullable().optional(),
  governance_preview: ReplayRepairReviewGovernancePreviewSchema.nullable().optional(),
}).passthrough();

export type ReplayPlaybookRepairReviewResponse = z.infer<typeof ReplayPlaybookRepairReviewResponseSchema>;

export const ToolsFeedbackPatternAnchorSchema = z.object({
  node_id: z.string().min(1).max(256),
  node_uri: z.string().min(1).max(512),
  client_id: z.string().min(1).max(256),
  pattern_signature: z.string().min(1).max(256),
  anchor_kind: z.literal("pattern"),
  anchor_level: z.literal("L3"),
  pattern_state: z.enum(["provisional", "stable"]),
  credibility_state: z.enum(["candidate", "trusted", "contested"]),
  maintenance: z.record(z.unknown()).optional(),
  promotion: z.record(z.unknown()).optional(),
}).passthrough();

export type ToolsFeedbackPatternAnchor = z.infer<typeof ToolsFeedbackPatternAnchorSchema>;

export const WorkflowWriteProjectionGovernanceDecisionTraceSchema = z.object({
  trace_version: z.literal("workflow_promotion_governance_trace_v1"),
  review_supplied: z.boolean(),
  admissibility_evaluated: z.boolean(),
  admissible: z.boolean().nullable(),
  policy_effect_applies: z.boolean(),
  base_promotion_state: z.enum(["candidate", "stable"]),
  effective_promotion_state: z.enum(["candidate", "stable"]),
  runtime_apply_changed_promotion_state: z.boolean(),
  stage_order: z.array(z.enum([
    "review_packet_built",
    "review_result_received",
    "admissibility_evaluated",
    "policy_effect_derived",
    "runtime_policy_applied",
  ])).min(2).max(5),
  reason_codes: z.array(z.string().min(1).max(128)).max(8).default([]),
}).passthrough();

export type WorkflowWriteProjectionGovernanceDecisionTrace = z.infer<typeof WorkflowWriteProjectionGovernanceDecisionTraceSchema>;

export const WorkflowWriteProjectionGovernancePolicyEffectSchema = z.object({
  source: z.enum(["default_workflow_promotion_state", "workflow_promotion_governance_review"]),
  applies: z.boolean(),
  base_promotion_state: z.enum(["candidate", "stable"]),
  review_suggested_promotion_state: z.enum(["candidate", "stable"]).nullable().optional(),
  effective_promotion_state: z.enum(["candidate", "stable"]),
  reason_code: z.enum([
    "review_not_supplied",
    "review_not_admissible",
    "already_stable",
    "review_did_not_raise_promotion_state",
    "high_confidence_workflow_promotion",
  ]),
}).passthrough();

export type WorkflowWriteProjectionGovernancePolicyEffect = z.infer<typeof WorkflowWriteProjectionGovernancePolicyEffectSchema>;

export const WorkflowWriteProjectionGovernancePreviewSchema = z.object({
  promote_memory: z.object({
    review_packet: MemoryPromoteSemanticReviewPacketSchema,
    review_result: MemoryPromoteSemanticReviewResultSchema.nullable().optional(),
    admissibility: MemoryAdmissibilityResultSchema.nullable().optional(),
    policy_effect: WorkflowWriteProjectionGovernancePolicyEffectSchema.nullable().optional(),
    decision_trace: WorkflowWriteProjectionGovernanceDecisionTraceSchema,
  }).passthrough(),
}).passthrough();

export type WorkflowWriteProjectionGovernancePreview = z.infer<typeof WorkflowWriteProjectionGovernancePreviewSchema>;

export const ToolsFeedbackFormPatternGovernanceDecisionTraceSchema = z.object({
  trace_version: z.literal("form_pattern_governance_trace_v1"),
  review_supplied: z.boolean(),
  admissibility_evaluated: z.boolean(),
  admissible: z.boolean().nullable(),
  policy_effect_applies: z.boolean(),
  base_pattern_state: z.enum(["provisional", "stable"]),
  effective_pattern_state: z.enum(["provisional", "stable"]),
  runtime_apply_changed_pattern_state: z.boolean(),
  stage_order: z.array(z.enum([
    "review_packet_built",
    "review_result_received",
    "admissibility_evaluated",
    "policy_effect_derived",
    "runtime_policy_applied",
  ])).min(1).max(5),
  reason_codes: z.array(z.string().min(1).max(128)).max(8).default([]),
}).passthrough();

export type ToolsFeedbackFormPatternGovernanceDecisionTrace = z.infer<typeof ToolsFeedbackFormPatternGovernanceDecisionTraceSchema>;

export const ToolsFeedbackFormPatternGovernancePolicyEffectSchema = z.object({
  source: z.enum(["default_pattern_anchor_state", "form_pattern_governance_review"]),
  applies: z.boolean(),
  base_pattern_state: z.enum(["provisional", "stable"]),
  review_suggested_pattern_state: z.enum(["provisional", "stable"]).nullable().optional(),
  effective_pattern_state: z.enum(["provisional", "stable"]),
  reason_code: z.enum([
    "review_not_supplied",
    "review_not_admissible",
    "already_stable",
    "review_did_not_raise_pattern_state",
    "high_confidence_pattern_stabilization",
  ]),
}).passthrough();

export type ToolsFeedbackFormPatternGovernancePolicyEffect = z.infer<typeof ToolsFeedbackFormPatternGovernancePolicyEffectSchema>;

export const ToolsFeedbackGovernancePreviewSchema = z.object({
  form_pattern: z.object({
    review_packet: MemoryFormPatternSemanticReviewPacketSchema,
    review_result: MemoryFormPatternSemanticReviewResultSchema.nullable().optional(),
    admissibility: MemoryAdmissibilityResultSchema.nullable().optional(),
    policy_effect: ToolsFeedbackFormPatternGovernancePolicyEffectSchema.nullable().optional(),
    decision_trace: ToolsFeedbackFormPatternGovernanceDecisionTraceSchema,
  }).passthrough(),
}).passthrough();

export type ToolsFeedbackGovernancePreview = z.infer<typeof ToolsFeedbackGovernancePreviewSchema>;

export const ToolsFeedbackGovernanceInputSchema = z.object({
  form_pattern: z.object({
    review_result: MemoryFormPatternSemanticReviewResultSchema,
  }),
}).passthrough();

export type ToolsFeedbackGovernanceInput = z.infer<typeof ToolsFeedbackGovernanceInputSchema>;

export const ToolsFeedbackResponseSchema = z.object({
  ok: z.literal(true),
  scope: z.string(),
  tenant_id: z.string(),
  updated_rules: z.number().int().min(0),
  rule_node_ids: z.array(z.string()),
  commit_id: z.string(),
  commit_uri: z.string(),
  commit_hash: z.string(),
  decision_id: z.string(),
  decision_uri: z.string(),
  decision_link_mode: z.enum(["provided", "inferred", "created_from_feedback"]),
  decision_policy_sha256: z.string(),
  pattern_anchor: ToolsFeedbackPatternAnchorSchema.nullable().optional(),
  policy_memory: PersistedPolicyMemorySchema.nullable().optional(),
  governance_preview: ToolsFeedbackGovernancePreviewSchema.nullable().optional(),
}).passthrough();

export type ToolsFeedbackResponse = z.infer<typeof ToolsFeedbackResponseSchema>;

export const MemoryFindRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  // Canonical object locator: aionis://tenant/scope/type/id
  uri: z.string().min(1).optional(),
  id: UUID.optional(),
  client_id: z.string().min(1).optional(),
  type: NodeType.optional(),
  title_contains: z.string().min(1).optional(),
  text_contains: z.string().min(1).optional(),
  memory_lane: z.enum(["private", "shared"]).optional(),
  slots_contains: z.record(z.any()).optional(),
  consumer_agent_id: z.string().min(1).optional(),
  consumer_team_id: z.string().min(1).optional(),
  include_meta: z.boolean().default(false),
  include_slots: z.boolean().default(false),
  include_slots_preview: z.boolean().default(false),
  slots_preview_keys: z.number().int().positive().max(50).default(10),
  limit: z.number().int().positive().max(200).default(20),
  offset: z.number().int().min(0).max(200000).default(0),
});

export type MemoryFindInput = z.infer<typeof MemoryFindRequest>;

export const MemoryResolveRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  uri: z.string().min(1),
  consumer_agent_id: z.string().min(1).optional(),
  consumer_team_id: z.string().min(1).optional(),
  include_meta: z.boolean().default(false),
  include_slots: z.boolean().default(false),
  include_slots_preview: z.boolean().default(false),
  slots_preview_keys: z.number().int().positive().max(50).default(10),
});

export type MemoryResolveInput = z.infer<typeof MemoryResolveRequest>;

export const HandoffKind = z.enum(["patch_handoff", "review_handoff", "task_handoff"]);

export const HandoffStoreRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  memory_lane: z.enum(["private", "shared"]).default("shared"),
  anchor: z.string().min(1),
  file_path: z.string().min(1).optional(),
  repo_root: z.string().min(1).optional(),
  symbol: z.string().min(1).optional(),
  handoff_kind: HandoffKind.default("patch_handoff"),
  title: z.string().min(1).optional(),
  summary: z.string().min(1),
  handoff_text: z.string().min(1),
  risk: z.string().min(1).optional(),
  acceptance_checks: z.array(z.string().min(1)).max(50).optional(),
  tags: z.array(z.string().min(1)).max(50).optional(),
  target_files: z.array(z.string().min(1)).max(50).optional(),
  next_action: z.string().min(1).optional(),
  must_change: z.array(z.string().min(1)).max(100).optional(),
  must_remove: z.array(z.string().min(1)).max(100).optional(),
  must_keep: z.array(z.string().min(1)).max(100).optional(),
  execution_result_summary: z.record(z.unknown()).optional(),
  execution_artifacts: z.array(z.record(z.unknown())).optional(),
  execution_evidence: z.array(z.record(z.unknown())).optional(),
  execution_state_v1: ExecutionStateV1Schema.optional(),
  execution_packet_v1: ExecutionPacketV1Schema.optional(),
  control_profile_v1: ControlProfileV1Schema.optional(),
  execution_transitions_v1: z.array(ExecutionStateTransitionV1Schema).optional(),
}).superRefine((value, ctx) => {
  if (value.handoff_kind !== "task_handoff" && !value.file_path) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["file_path"],
      message: "file_path is required unless handoff_kind is task_handoff",
    });
  }
});

export type HandoffStoreInput = z.infer<typeof HandoffStoreRequest>;

export const HandoffRecoverRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  handoff_id: z.string().min(1).optional(),
  handoff_uri: z.string().min(1).optional(),
  anchor: z.string().min(1).optional(),
  repo_root: z.string().min(1).optional(),
  file_path: z.string().min(1).optional(),
  symbol: z.string().min(1).optional(),
  handoff_kind: HandoffKind.default("patch_handoff"),
  memory_lane: z.enum(["private", "shared"]).optional(),
  include_payload: z.boolean().optional(),
  limit: z.number().int().positive().max(20).default(5),
}).superRefine((value, ctx) => {
  if (!value.anchor && !value.handoff_id && !value.handoff_uri) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["anchor"],
      message: "anchor, handoff_id, or handoff_uri is required",
    });
  }
});

export type HandoffRecoverInput = z.infer<typeof HandoffRecoverRequest>;

export const DelegationRecordsWriteRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  memory_lane: z.enum(["private", "shared"]).default("shared"),
  producer_agent_id: z.string().min(1).optional(),
  owner_agent_id: z.string().min(1).optional(),
  owner_team_id: z.string().min(1).optional(),
  record_id: z.string().min(1).max(128).optional(),
  run_id: z.string().min(1).max(256).optional(),
  handoff_anchor: z.string().min(1).max(512).optional(),
  handoff_uri: z.string().min(1).max(2048).optional(),
  route_role: z.string().min(1).max(128).optional(),
  task_family: z.string().min(1).max(256).optional(),
  title: z.string().min(1).max(512).optional(),
  summary: z.string().min(1).max(4000).optional(),
  input_text: z.string().min(1).optional(),
  tags: z.array(z.string().min(1).max(128)).max(50).optional(),
  delegation_records_v1: ExecutionDelegationRecordsSummarySchema,
  execution_result_summary: z.record(z.unknown()).optional(),
  execution_artifacts: z.array(z.record(z.unknown())).optional(),
  execution_evidence: z.array(z.record(z.unknown())).optional(),
  execution_state_v1: ExecutionStateV1Schema.optional(),
  execution_packet_v1: ExecutionPacketV1Schema.optional(),
});

export type DelegationRecordsWriteInput = z.infer<typeof DelegationRecordsWriteRequest>;

export const DelegationRecordsWriteResponseSchema = z.object({
  summary_version: z.literal("delegation_records_write_v1"),
  tenant_id: z.string(),
  scope: z.string(),
  commit_id: z.string(),
  commit_uri: z.string().nullable(),
  record_event: z.object({
    node_id: z.string(),
    uri: z.string(),
    client_id: z.string(),
    record_id: z.string(),
    memory_lane: z.enum(["private", "shared"]),
    run_id: z.string().nullable(),
    handoff_anchor: z.string().nullable(),
    route_role: z.string(),
    task_family: z.string().nullable(),
    family_scope: z.string(),
    record_mode: z.enum(["memory_only", "packet_backed"]),
  }).nullable(),
  delegation_records_v1: ExecutionDelegationRecordsSummarySchema,
  execution_result_summary: z.record(z.unknown()).nullable(),
  execution_artifacts: z.array(z.record(z.unknown())),
  execution_evidence: z.array(z.record(z.unknown())),
  execution_state_v1: ExecutionStateV1Schema.nullable(),
  execution_packet_v1: ExecutionPacketV1Schema.nullable(),
});

export type DelegationRecordsWriteResponse = z.infer<typeof DelegationRecordsWriteResponseSchema>;

export const DelegationRecordsFindRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  record_id: z.string().min(1).max(128).optional(),
  run_id: z.string().min(1).max(256).optional(),
  handoff_anchor: z.string().min(1).max(512).optional(),
  handoff_uri: z.string().min(1).max(2048).optional(),
  route_role: z.string().min(1).max(128).optional(),
  task_family: z.string().min(1).max(256).optional(),
  family_scope: z.string().min(1).max(512).optional(),
  record_mode: z.enum(["memory_only", "packet_backed"]).optional(),
  memory_lane: z.enum(["private", "shared"]).optional(),
  consumer_agent_id: z.string().min(1).optional(),
  consumer_team_id: z.string().min(1).optional(),
  include_payload: z.boolean().default(false),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().min(0).max(200000).default(0),
});

export type DelegationRecordsFindInput = z.infer<typeof DelegationRecordsFindRequest>;

export const DelegationRecordSideOutputSummarySchema = z.object({
  result_present: z.boolean(),
  artifact_count: z.number().int().min(0),
  evidence_count: z.number().int().min(0),
  execution_state_v1_present: z.boolean(),
  execution_packet_v1_present: z.boolean(),
});

export const DelegationRecordFindEntrySchema = z.object({
  uri: z.string(),
  node_id: z.string(),
  client_id: z.string().nullable(),
  record_id: z.string().nullable(),
  title: z.string().nullable(),
  text_summary: z.string().nullable(),
  memory_lane: z.enum(["private", "shared"]),
  producer_agent_id: z.string().nullable(),
  owner_agent_id: z.string().nullable(),
  owner_team_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  commit_id: z.string().nullable(),
  run_id: z.string().nullable(),
  handoff_anchor: z.string().nullable(),
  handoff_uri: z.string().nullable(),
  route_role: z.string(),
  task_family: z.string().nullable(),
  family_scope: z.string(),
  record_mode: z.enum(["memory_only", "packet_backed"]),
  tags: z.array(z.string()),
  delegation_records_v1: ExecutionDelegationRecordsSummarySchema,
  execution_side_outputs: DelegationRecordSideOutputSummarySchema,
  execution_result_summary: z.record(z.unknown()).nullable().optional(),
  execution_artifacts: z.array(z.record(z.unknown())).optional(),
  execution_evidence: z.array(z.record(z.unknown())).optional(),
  execution_state_v1: z.record(z.unknown()).nullable().optional(),
  execution_packet_v1: z.record(z.unknown()).nullable().optional(),
}).passthrough();

export type DelegationRecordFindEntry = z.infer<typeof DelegationRecordFindEntrySchema>;

export const DelegationRecordsFindSummarySchema = z.object({
  summary_version: z.literal("delegation_records_find_summary_v1"),
  returned_records: z.number().int().min(0),
  has_more: z.boolean(),
  invalid_records: z.number().int().min(0),
  filters_applied: z.array(z.string()),
  record_mode_counts: z.record(z.number().int().min(0)),
  memory_lane_counts: z.record(z.number().int().min(0)),
  route_role_counts: z.record(z.number().int().min(0)),
  task_family_counts: z.record(z.number().int().min(0)),
  missing_record_type_counts: z.record(z.number().int().min(0)),
  return_status_counts: z.record(z.number().int().min(0)),
  artifact_source_counts: z.record(z.number().int().min(0)),
  packet_count: z.number().int().min(0),
  return_count: z.number().int().min(0),
  artifact_routing_count: z.number().int().min(0),
  run_id_count: z.number().int().min(0),
  handoff_anchor_count: z.number().int().min(0),
});

export type DelegationRecordsFindSummary = z.infer<typeof DelegationRecordsFindSummarySchema>;

export const DelegationRecordsFindResponseSchema = z.object({
  summary_version: z.literal("delegation_records_find_v1"),
  tenant_id: z.string(),
  scope: z.string(),
  records: z.array(DelegationRecordFindEntrySchema),
  summary: DelegationRecordsFindSummarySchema,
});

export type DelegationRecordsFindResponse = z.infer<typeof DelegationRecordsFindResponseSchema>;

export const DelegationRecordsAggregateRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  record_id: z.string().min(1).max(128).optional(),
  run_id: z.string().min(1).max(256).optional(),
  handoff_anchor: z.string().min(1).max(512).optional(),
  handoff_uri: z.string().min(1).max(2048).optional(),
  route_role: z.string().min(1).max(128).optional(),
  task_family: z.string().min(1).max(256).optional(),
  family_scope: z.string().min(1).max(512).optional(),
  record_mode: z.enum(["memory_only", "packet_backed"]).optional(),
  memory_lane: z.enum(["private", "shared"]).optional(),
  consumer_agent_id: z.string().min(1).optional(),
  consumer_team_id: z.string().min(1).optional(),
  limit: z.number().int().positive().max(200).default(100),
});

export type DelegationRecordsAggregateInput = z.infer<typeof DelegationRecordsAggregateRequest>;

const DelegationRecordsAggregateBucketSchema = z.object({
  key: z.string(),
  record_count: z.number().int().min(0),
  packet_count: z.number().int().min(0),
  return_count: z.number().int().min(0),
  artifact_routing_count: z.number().int().min(0),
  record_mode_counts: z.record(z.number().int().min(0)),
  task_family_counts: z.record(z.number().int().min(0)).optional(),
  route_role_counts: z.record(z.number().int().min(0)).optional(),
  return_status_counts: z.record(z.number().int().min(0)),
  artifact_source_counts: z.record(z.number().int().min(0)),
}).passthrough();

export const DelegationRecordsAggregateRefStatSchema = z.object({
  ref: z.string(),
  ref_kind: z.enum(["artifact", "evidence"]),
  count: z.number().int().min(0),
  source_counts: z.record(z.number().int().min(0)),
}).passthrough();

export const DelegationRecordsAggregateStringStatSchema = z.object({
  value: z.string(),
  count: z.number().int().min(0),
}).passthrough();

export const DelegationRecordsReusablePatternSchema = z.object({
  route_role: z.string(),
  task_family: z.string(),
  record_count: z.number().int().min(0),
  record_mode_counts: z.record(z.number().int().min(0)),
  record_outcome_counts: z.record(z.number().int().min(0)),
  sample_mission: z.string().nullable(),
  sample_acceptance_checks: z.array(z.string()),
  sample_working_set_files: z.array(z.string()),
  sample_artifact_refs: z.array(z.string()),
}).passthrough();

export const DelegationRecordsLearningRecommendationSchema = z.object({
  recommendation_kind: z.enum([
    "capture_missing_returns",
    "review_blocked_pattern",
    "increase_artifact_capture",
    "promote_reusable_pattern",
  ]),
  priority: z.enum(["high", "medium", "low"]),
  route_role: z.string().nullable(),
  task_family: z.string().nullable(),
  recommended_action: z.string(),
  rationale: z.string(),
  sample_mission: z.string().nullable(),
  sample_acceptance_checks: z.array(z.string()),
  sample_working_set_files: z.array(z.string()),
  sample_artifact_refs: z.array(z.string()),
}).passthrough();

export type DelegationRecordsLearningRecommendation = z.infer<typeof DelegationRecordsLearningRecommendationSchema>;

export const DelegationRecordsAggregateSummarySchema = z.object({
  summary_version: z.literal("delegation_records_aggregate_summary_v1"),
  matched_records: z.number().int().min(0),
  truncated: z.boolean(),
  invalid_records: z.number().int().min(0),
  filters_applied: z.array(z.string()),
  record_mode_counts: z.record(z.number().int().min(0)),
  memory_lane_counts: z.record(z.number().int().min(0)),
  route_role_counts: z.record(z.number().int().min(0)),
  task_family_counts: z.record(z.number().int().min(0)),
  missing_record_type_counts: z.record(z.number().int().min(0)),
  return_status_counts: z.record(z.number().int().min(0)),
  normalized_return_status_counts: z.record(z.number().int().min(0)),
  record_outcome_counts: z.record(z.number().int().min(0)),
  artifact_source_counts: z.record(z.number().int().min(0)),
  packet_count: z.number().int().min(0),
  return_count: z.number().int().min(0),
  artifact_routing_count: z.number().int().min(0),
  run_id_count: z.number().int().min(0),
  handoff_anchor_count: z.number().int().min(0),
  records_with_returns: z.number().int().min(0),
  records_with_missing_types: z.number().int().min(0),
  records_with_payload_result: z.number().int().min(0),
  records_with_payload_artifacts: z.number().int().min(0),
  records_with_payload_evidence: z.number().int().min(0),
  records_with_payload_state: z.number().int().min(0),
  records_with_payload_packet: z.number().int().min(0),
  completion_rate: z.number().min(0).max(1),
  blocked_rate: z.number().min(0).max(1),
  missing_return_rate: z.number().min(0).max(1),
  route_role_buckets: z.array(DelegationRecordsAggregateBucketSchema),
  task_family_buckets: z.array(DelegationRecordsAggregateBucketSchema),
  top_reusable_patterns: z.array(DelegationRecordsReusablePatternSchema),
  learning_recommendations: z.array(DelegationRecordsLearningRecommendationSchema),
  top_artifact_refs: z.array(DelegationRecordsAggregateRefStatSchema),
  top_acceptance_checks: z.array(DelegationRecordsAggregateStringStatSchema),
  top_working_set_files: z.array(DelegationRecordsAggregateStringStatSchema),
});

export type DelegationRecordsAggregateSummary = z.infer<typeof DelegationRecordsAggregateSummarySchema>;

export const DelegationRecordsAggregateResponseSchema = z.object({
  summary_version: z.literal("delegation_records_aggregate_v1"),
  tenant_id: z.string(),
  scope: z.string(),
  summary: DelegationRecordsAggregateSummarySchema,
});

export type DelegationRecordsAggregateResponse = z.infer<typeof DelegationRecordsAggregateResponseSchema>;

export const ContinuityReviewPackRequest = HandoffRecoverRequest;

export type ContinuityReviewPackInput = z.infer<typeof ContinuityReviewPackRequest>;

export const MemorySessionCreateRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  session_id: z.string().min(1).max(128),
  title: z.string().min(1).max(512).optional(),
  text_summary: z.string().min(1).max(4000).optional(),
  input_text: z.string().min(1).optional(),
  metadata: z.record(z.any()).optional(),
  auto_embed: z.boolean().optional(),
  memory_lane: z.enum(["private", "shared"]).optional(),
  producer_agent_id: z.string().min(1).optional(),
  owner_agent_id: z.string().min(1).optional(),
  owner_team_id: z.string().min(1).optional(),
});

export type MemorySessionCreateInput = z.infer<typeof MemorySessionCreateRequest>;

export const MemorySessionsListRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  consumer_agent_id: z.string().min(1).optional(),
  consumer_team_id: z.string().min(1).optional(),
  owner_agent_id: z.string().min(1).optional(),
  owner_team_id: z.string().min(1).optional(),
  include_meta: QueryBoolean.default(false),
  limit: z.coerce.number().int().positive().max(200).default(20),
  offset: z.coerce.number().int().min(0).max(200000).default(0),
});

export type MemorySessionsListInput = z.infer<typeof MemorySessionsListRequest>;

export const MemoryEventWriteRequest = z
  .object({
    tenant_id: z.string().min(1).optional(),
    scope: z.string().min(1).optional(),
    actor: z.string().min(1).optional(),
    session_id: z.string().min(1).max(128),
    event_id: z.string().min(1).max(128).optional(),
    title: z.string().min(1).max(512).optional(),
    text_summary: z.string().min(1).max(4000).optional(),
    input_text: z.string().min(1).optional(),
    metadata: z.record(z.any()).optional(),
    execution_state_v1: ExecutionStateV1Schema.optional(),
    execution_packet_v1: ExecutionPacketV1Schema.optional(),
    execution_transitions_v1: z.array(ExecutionStateTransitionV1Schema).optional(),
    auto_embed: z.boolean().optional(),
    memory_lane: z.enum(["private", "shared"]).optional(),
    producer_agent_id: z.string().min(1).optional(),
    owner_agent_id: z.string().min(1).optional(),
    owner_team_id: z.string().min(1).optional(),
    edge_weight: z.number().min(0).max(1).optional(),
    edge_confidence: z.number().min(0).max(1).optional(),
  })
  .refine((v) => !!v.text_summary || !!v.title || !!v.input_text, {
    message: "must set text_summary, title, or input_text",
  });

export type MemoryEventWriteInput = z.infer<typeof MemoryEventWriteRequest>;

export const MemorySessionEventsListRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  session_id: z.string().min(1).max(128),
  consumer_agent_id: z.string().min(1).optional(),
  consumer_team_id: z.string().min(1).optional(),
  include_meta: QueryBoolean.default(false),
  include_slots: QueryBoolean.default(false),
  include_slots_preview: QueryBoolean.default(false),
  slots_preview_keys: z.coerce.number().int().positive().max(50).default(10),
  limit: z.coerce.number().int().positive().max(200).default(20),
  offset: z.coerce.number().int().min(0).max(200000).default(0),
});

export type MemorySessionEventsListInput = z.infer<typeof MemorySessionEventsListRequest>;

export const MemoryPackExportRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  include_nodes: z.boolean().default(true),
  include_edges: z.boolean().default(true),
  include_commits: z.boolean().default(true),
  include_decisions: z.boolean().default(false),
  include_meta: z.boolean().default(true),
  max_rows: z.number().int().positive().max(50000).default(5000),
});

export type MemoryPackExportInput = z.infer<typeof MemoryPackExportRequest>;

export const MemoryPackImportRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  verify_only: z.boolean().default(false),
  auto_embed: z.boolean().default(false),
  manifest_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  pack: z.object({
    version: z.literal("aionis_pack_v1"),
    tenant_id: z.string().min(1),
    scope: z.string().min(1),
    nodes: z
      .array(
        z.object({
          id: UUID,
          client_id: z.string().min(1).nullish(),
          type: NodeType,
          tier: z.enum(["hot", "warm", "cold", "archive"]).optional(),
          memory_lane: z.enum(["private", "shared"]).optional(),
          producer_agent_id: z.string().min(1).nullish(),
          owner_agent_id: z.string().min(1).nullish(),
          owner_team_id: z.string().min(1).nullish(),
          title: z.string().nullish(),
          text_summary: z.string().nullish(),
          slots: z.record(z.any()).optional(),
          raw_ref: z.string().nullish(),
          evidence_ref: z.string().nullish(),
          salience: z.number().min(0).max(1).optional(),
          importance: z.number().min(0).max(1).optional(),
          confidence: z.number().min(0).max(1).optional(),
        }).passthrough(),
      )
      .default([]),
    edges: z
      .array(
        z.object({
          id: UUID,
          type: EdgeType,
          src_id: UUID,
          dst_id: UUID,
          src_client_id: z.string().min(1).nullish(),
          dst_client_id: z.string().min(1).nullish(),
          weight: z.number().min(0).max(1).optional(),
          confidence: z.number().min(0).max(1).optional(),
          decay_rate: z.number().min(0).max(1).optional(),
        }).passthrough(),
      )
      .default([]),
    commits: z
      .array(
        z.object({
          id: UUID,
          parent_id: UUID.nullable().optional(),
          input_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
          actor: z.string().optional(),
          model_version: z.string().nullable().optional(),
          prompt_version: z.string().nullable().optional(),
          created_at: z.string().optional(),
          commit_hash: z.string().optional(),
        }).passthrough(),
      )
      .default([]),
    decisions: z
      .array(
        z
          .object({
            id: UUID.optional(),
            decision_id: UUID.optional(),
            decision_uri: z.string().min(1).optional(),
            decision_kind: z.string().min(1).optional(),
            run_id: z.string().nullish(),
            selected_tool: z.string().nullish(),
            candidates_json: z.array(z.any()).optional(),
            context_sha256: z.string().optional(),
            policy_sha256: z.string().optional(),
            source_rule_ids: z.array(UUID).optional(),
            metadata_json: z.record(z.any()).optional(),
            metadata: z.record(z.any()).optional(),
            created_at: z.string().optional(),
            commit_id: UUID.nullish(),
            commit_uri: z.string().nullish(),
          })
          .passthrough(),
      )
      .default([]),
  }).passthrough(),
});

export type MemoryPackImportInput = z.infer<typeof MemoryPackImportRequest>;

export const MemoryArchiveRehydrateRequest = z
  .object({
    tenant_id: z.string().min(1).optional(),
    scope: z.string().min(1).optional(),
    actor: z.string().min(1).optional(),
    node_ids: z.array(UUID).min(1).max(200).optional(),
    client_ids: z.array(z.string().min(1)).min(1).max(200).optional(),
    target_tier: z.enum(["warm", "hot"]).default("warm"),
    reason: z.string().min(1).optional(),
    input_text: z.string().min(1).optional(),
    input_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  })
  .refine((v) => (v.node_ids?.length ?? 0) > 0 || (v.client_ids?.length ?? 0) > 0, {
    message: "must set node_ids or client_ids",
  })
  .refine((v) => !!v.input_text || !!v.input_sha256, { message: "must set input_text or input_sha256" });

export type MemoryArchiveRehydrateInput = z.infer<typeof MemoryArchiveRehydrateRequest>;

export const MemoryNodesActivateRequest = z
  .object({
    tenant_id: z.string().min(1).optional(),
    scope: z.string().min(1).optional(),
    actor: z.string().min(1).optional(),
    node_ids: z.array(UUID).min(1).max(200).optional(),
    client_ids: z.array(z.string().min(1)).min(1).max(200).optional(),
    run_id: z.string().min(1).optional(),
    outcome: z.enum(["positive", "negative", "neutral"]).default("neutral"),
    activate: z.boolean().default(true),
    reason: z.string().min(1).optional(),
    input_text: z.string().min(1).optional(),
    input_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  })
  .refine((v) => (v.node_ids?.length ?? 0) > 0 || (v.client_ids?.length ?? 0) > 0, {
    message: "must set node_ids or client_ids",
  })
  .refine((v) => !!v.input_text || !!v.input_sha256, { message: "must set input_text or input_sha256" });

export type MemoryNodesActivateInput = z.infer<typeof MemoryNodesActivateRequest>;
export type RuleFeedbackInput = z.infer<typeof RuleFeedbackRequest>;
export type RuleStateUpdateInput = z.infer<typeof RuleStateUpdateRequest>;

export const RuleFeedbackRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  rule_node_id: UUID,
  run_id: z.string().min(1).optional(),
  outcome: z.enum(["positive", "negative", "neutral"]),
  note: z.string().min(1).optional(),
  input_text: z.string().min(1).optional(),
  input_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
}).refine((v) => !!v.input_text || !!v.input_sha256, { message: "must set input_text or input_sha256" });

export const RuleStateUpdateRequest = z
  .object({
    tenant_id: z.string().min(1).optional(),
    scope: z.string().min(1).optional(),
    actor: z.string().min(1).optional(),
    rule_node_id: UUID,
    state: z.enum(["draft", "shadow", "active", "disabled"]),
    input_text: z.string().min(1).optional(),
    input_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  })
  .refine((v) => !!v.input_text || !!v.input_sha256, { message: "must set input_text or input_sha256" });

export const RulesEvaluateRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  // Arbitrary execution context from the caller (planner/tool selector), used to match rule conditions.
  context: z.any(),
  // By default, both ACTIVE and SHADOW rules are returned (separately).
  include_shadow: z.boolean().default(true),
  // Hard cap: don't scan/return unbounded rules.
  limit: z.number().int().positive().max(200).default(50),
});

export type RulesEvaluateInput = z.infer<typeof RulesEvaluateRequest>;

export const ToolsSelectRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  // Optional execution run correlation id for provenance.
  run_id: z.string().min(1).optional(),
  context: z.any(),
  execution_result_summary: z.record(z.unknown()).optional(),
  execution_artifacts: z.array(z.record(z.unknown())).optional(),
  execution_evidence: z.array(z.record(z.unknown())).optional(),
  execution_state_v1: ExecutionStateV1Schema.optional(),
  // Tool names provided by the caller's execution environment.
  candidates: z.array(z.string().min(1)).min(1).max(200),
  // Include SHADOW rules as a non-enforcing preview channel.
  include_shadow: z.boolean().default(false),
  // Hard cap: don't scan unbounded rules.
  rules_limit: z.number().int().positive().max(200).default(50),
  // If true and allow/deny filters eliminate all candidates, return 400 instead of falling back.
  strict: z.boolean().default(true),
  // Experimental: if true, Aionis may reorder candidates before final selection.
  reorder_candidates: z.boolean().default(false),
});

export type ToolsSelectInput = z.input<typeof ToolsSelectRequest>;

export const ToolsDecisionRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  decision_id: UUID.optional(),
  decision_uri: z.string().min(1).optional(),
  run_id: z.string().min(1).optional(),
}).refine((v) => !!v.decision_id || !!v.decision_uri || !!v.run_id, {
  message: "must set decision_id, decision_uri, or run_id",
});

export type ToolsDecisionInput = z.infer<typeof ToolsDecisionRequest>;

export const ToolsRunRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  run_id: z.string().min(1),
  decision_limit: z.number().int().positive().max(200).default(10),
  include_feedback: z.boolean().default(true),
  feedback_limit: z.number().int().positive().max(200).default(50),
});

export type ToolsRunInput = z.infer<typeof ToolsRunRequest>;

export const ToolsRunsListRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  limit: z.number().int().positive().max(200).default(20),
});

export type ToolsRunsListInput = z.infer<typeof ToolsRunsListRequest>;

export const ToolsFeedbackRequest = z
  .object({
    tenant_id: z.string().min(1).optional(),
    scope: z.string().min(1).optional(),
    actor: z.string().min(1).optional(),
    run_id: z.string().min(1).optional(),
    // Optional direct link to the persisted tools/select decision record.
    decision_id: UUID.optional(),
    decision_uri: z.string().min(1).optional(),
    // Feedback for the tool selection decision.
    outcome: z.enum(["positive", "negative", "neutral"]),
    // Same execution context used for tool selection.
    context: z.any(),
    // Candidate tools shown to the selector.
    candidates: z.array(z.string().min(1)).min(1).max(200),
    // The tool that was actually used (selected/executed) by the caller.
    selected_tool: z.string().min(1),
    // Whether to include SHADOW rules for attribution; by default feedback applies to ACTIVE tool rules only.
    include_shadow: z.boolean().default(false),
    rules_limit: z.number().int().positive().max(200).default(50),
    // Attribution target:
    // - tool: only rules that touched tool.* paths
    // - all: all applied rules (rare; use with care)
    target: z.enum(["tool", "all"]).default("tool"),
    note: z.string().min(1).optional(),
    input_text: z.string().min(1).optional(),
    input_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    governance_review: ToolsFeedbackGovernanceInputSchema.optional(),
  })
  .refine((v) => !!v.input_text || !!v.input_sha256, { message: "must set input_text or input_sha256" });

export type ToolsFeedbackInput = z.infer<typeof ToolsFeedbackRequest>;

export const PatternOperatorOverrideSchema = z.object({
  schema_version: z.literal("operator_override_v1"),
  suppressed: z.boolean(),
  reason: z.string().nullable(),
  mode: PatternOperatorOverrideMode,
  until: z.string().nullable(),
  updated_at: z.string(),
  updated_by: z.string().nullable(),
  last_action: z.enum(["suppress", "unsuppress"]),
});

export type PatternOperatorOverride = z.infer<typeof PatternOperatorOverrideSchema>;

export const PatternSuppressRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  anchor_id: UUID,
  reason: z.string().min(1),
  until: z.string().datetime().optional(),
  mode: PatternOperatorOverrideMode.default("shadow_learn"),
});

export type PatternSuppressInput = z.infer<typeof PatternSuppressRequest>;

export const PatternUnsuppressRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  anchor_id: UUID,
  reason: z.string().min(1).optional(),
});

export type PatternUnsuppressInput = z.infer<typeof PatternUnsuppressRequest>;

export const PatternSuppressResponseSchema = z.object({
  tenant_id: z.string(),
  scope: z.string(),
  anchor_id: z.string(),
  anchor_uri: z.string(),
  selected_tool: z.string().nullable(),
  pattern_state: z.string().nullable(),
  credibility_state: z.string().nullable(),
  operator_override: PatternOperatorOverrideSchema,
});

export type PatternSuppressResponse = z.infer<typeof PatternSuppressResponseSchema>;

export const ReplaySafetyLevel = z.enum(["auto_ok", "needs_confirm", "manual_only"]);
export type ReplaySafetyLevelInput = z.infer<typeof ReplaySafetyLevel>;

export const ReplayRunStatus = z.enum(["success", "failed", "partial"]);
export type ReplayRunStatusInput = z.infer<typeof ReplayRunStatus>;
export const ReplayPlaybookStatus = z.enum(["draft", "shadow", "active", "disabled"]);
export type ReplayPlaybookStatusInput = z.infer<typeof ReplayPlaybookStatus>;
export const ReplayRunMode = z.enum(["strict", "guided", "simulate"]);
export type ReplayRunModeInput = z.infer<typeof ReplayRunMode>;

const ReplayCondition = z.record(z.any());
const ReplayConsumerIdentityFields = {
  consumer_agent_id: z.string().min(1).optional(),
  consumer_team_id: z.string().min(1).optional(),
} as const;
const ReplayWriteIdentityFields = {
  memory_lane: z.enum(["private", "shared"]).optional(),
  producer_agent_id: z.string().min(1).optional(),
  owner_agent_id: z.string().min(1).optional(),
  owner_team_id: z.string().min(1).optional(),
} as const;

export const ReplayRunStartRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  ...ReplayConsumerIdentityFields,
  ...ReplayWriteIdentityFields,
  run_id: UUID.optional(),
  goal: z.string().min(1),
  context_snapshot_ref: z.string().min(1).optional(),
  context_snapshot_hash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  metadata: z.record(z.any()).optional(),
});

export type ReplayRunStartInput = z.infer<typeof ReplayRunStartRequest>;

export const ReplayStepBeforeRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  ...ReplayConsumerIdentityFields,
  ...ReplayWriteIdentityFields,
  run_id: UUID,
  step_id: UUID.optional(),
  decision_id: UUID.optional(),
  step_index: z.number().int().positive(),
  tool_name: z.string().min(1),
  tool_input: z.any(),
  expected_output_signature: z.any().optional(),
  preconditions: z.array(ReplayCondition).max(200).default([]),
  retry_policy: z.record(z.any()).optional(),
  safety_level: ReplaySafetyLevel.default("needs_confirm"),
  metadata: z.record(z.any()).optional(),
});

export type ReplayStepBeforeInput = z.infer<typeof ReplayStepBeforeRequest>;

export const ReplayStepAfterRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  ...ReplayConsumerIdentityFields,
  ...ReplayWriteIdentityFields,
  run_id: UUID,
  step_id: UUID.optional(),
  step_index: z.number().int().positive().optional(),
  status: z.enum(["success", "failed", "skipped", "partial"]),
  output_signature: z.any().optional(),
  postconditions: z.array(ReplayCondition).max(200).default([]),
  artifact_refs: z.array(z.string().min(1)).max(200).default([]),
  repair_applied: z.boolean().default(false),
  repair_note: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
  metadata: z.record(z.any()).optional(),
});

export type ReplayStepAfterInput = z.infer<typeof ReplayStepAfterRequest>;

export const ReplayRunEndRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  ...ReplayConsumerIdentityFields,
  ...ReplayWriteIdentityFields,
  run_id: UUID,
  status: ReplayRunStatus,
  summary: z.string().min(1).optional(),
  success_criteria: z.record(z.any()).optional(),
  metrics: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

export type ReplayRunEndInput = z.infer<typeof ReplayRunEndRequest>;

export const ReplayRunGetRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  ...ReplayConsumerIdentityFields,
  run_id: UUID,
  include_steps: z.boolean().default(true),
  include_artifacts: z.boolean().default(true),
});

export type ReplayRunGetInput = z.infer<typeof ReplayRunGetRequest>;

export const ReplayPlaybookCompileRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  ...ReplayConsumerIdentityFields,
  ...ReplayWriteIdentityFields,
  run_id: UUID,
  playbook_id: UUID.optional(),
  name: z.string().min(1).optional(),
  version: z.number().int().positive().default(1),
  matchers: z.record(z.any()).optional(),
  success_criteria: z.record(z.any()).optional(),
  risk_profile: z.enum(["low", "medium", "high"]).default("medium"),
  allow_partial: z.boolean().default(false),
  metadata: z.record(z.any()).optional(),
});

export type ReplayPlaybookCompileInput = z.infer<typeof ReplayPlaybookCompileRequest>;

export const ReplayPlaybookGetRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  ...ReplayConsumerIdentityFields,
  playbook_id: UUID,
});

export type ReplayPlaybookGetInput = z.infer<typeof ReplayPlaybookGetRequest>;

export const ReplayPlaybookCandidateRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  ...ReplayConsumerIdentityFields,
  playbook_id: UUID,
  version: z.number().int().positive().optional(),
  deterministic_gate: z.object({
    enabled: z.boolean().default(true),
    prefer_deterministic_execution: z.boolean().default(true),
    on_mismatch: z.enum(["fallback", "reject"]).default("fallback"),
    required_statuses: z.array(ReplayPlaybookStatus).min(1).max(4).default(["shadow", "active"]),
    matchers: z.record(z.any()).optional(),
    policy_constraints: z.record(z.any()).optional(),
  }).optional(),
});

export type ReplayPlaybookCandidateInput = z.infer<typeof ReplayPlaybookCandidateRequest>;

export const ReplayPlaybookPromoteRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  ...ReplayConsumerIdentityFields,
  ...ReplayWriteIdentityFields,
  playbook_id: UUID,
  from_version: z.number().int().positive().optional(),
  target_status: ReplayPlaybookStatus,
  note: z.string().min(1).max(1000).optional(),
  metadata: z.record(z.any()).optional(),
});

export type ReplayPlaybookPromoteInput = z.infer<typeof ReplayPlaybookPromoteRequest>;

export const ReplayPlaybookRunRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  project_id: z.string().min(1).max(128).optional(),
  actor: z.string().min(1).optional(),
  ...ReplayConsumerIdentityFields,
  ...ReplayWriteIdentityFields,
  playbook_id: UUID,
  mode: ReplayRunMode.default("simulate"),
  version: z.number().int().positive().optional(),
  deterministic_gate: z.object({
    enabled: z.boolean().default(true),
    prefer_deterministic_execution: z.boolean().default(true),
    on_mismatch: z.enum(["fallback", "reject"]).default("fallback"),
    required_statuses: z.array(ReplayPlaybookStatus).min(1).max(4).default(["shadow", "active"]),
    matchers: z.record(z.any()).optional(),
    policy_constraints: z.record(z.any()).optional(),
  }).optional(),
  params: z.record(z.any()).optional(),
  max_steps: z.number().int().positive().max(500).default(200),
});

export type ReplayPlaybookRunInput = z.infer<typeof ReplayPlaybookRunRequest>;

export const ReplayPlaybookDispatchRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  project_id: z.string().min(1).max(128).optional(),
  actor: z.string().min(1).optional(),
  ...ReplayConsumerIdentityFields,
  ...ReplayWriteIdentityFields,
  playbook_id: UUID,
  version: z.number().int().positive().optional(),
  deterministic_gate: z.object({
    enabled: z.boolean().default(true),
    prefer_deterministic_execution: z.boolean().default(true),
    on_mismatch: z.enum(["fallback", "reject"]).default("fallback"),
    required_statuses: z.array(ReplayPlaybookStatus).min(1).max(4).default(["shadow", "active"]),
    matchers: z.record(z.any()).optional(),
    policy_constraints: z.record(z.any()).optional(),
  }).optional(),
  fallback_mode: ReplayRunMode.default("simulate"),
  execute_fallback: z.boolean().default(true),
  params: z.record(z.any()).optional(),
  max_steps: z.number().int().positive().max(500).default(200),
});

export type ReplayPlaybookDispatchInput = z.infer<typeof ReplayPlaybookDispatchRequest>;

export const ReplayPlaybookRepairRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  ...ReplayConsumerIdentityFields,
  ...ReplayWriteIdentityFields,
  playbook_id: UUID,
  from_version: z.number().int().positive().optional(),
  patch: z.record(z.any()),
  note: z.string().min(1).max(1000).optional(),
  review_required: z.boolean().default(true),
  target_status: ReplayPlaybookStatus.default("draft"),
  metadata: z.record(z.any()).optional(),
});

export type ReplayPlaybookRepairInput = z.infer<typeof ReplayPlaybookRepairRequest>;

export const ReplayLearningProjectionRequest = z.object({
  enabled: z.boolean().optional(),
  mode: z.enum(["rule_and_episode", "episode_only"]).optional(),
  delivery: z.enum(["async_outbox", "sync_inline"]).optional(),
  target_rule_state: z.enum(["draft", "shadow"]).optional(),
  min_total_steps: z.number().int().min(0).max(500).optional(),
  min_success_ratio: z.number().min(0).max(1).optional(),
});

export type ReplayLearningProjectionInput = z.infer<typeof ReplayLearningProjectionRequest>;

export const ReplayPlaybookRepairReviewRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  ...ReplayConsumerIdentityFields,
  ...ReplayWriteIdentityFields,
  playbook_id: UUID,
  version: z.number().int().positive().optional(),
  action: z.enum(["approve", "reject"]),
  note: z.string().min(1).max(1000).optional(),
  auto_shadow_validate: z.boolean().default(true),
  shadow_validation_mode: z.enum(["readiness", "execute", "execute_sandbox"]).default("readiness"),
  shadow_validation_max_steps: z.number().int().positive().max(500).default(200),
  shadow_validation_params: z.record(z.any()).optional(),
  target_status_on_approve: ReplayPlaybookStatus.default("shadow"),
  auto_promote_on_pass: z.boolean().default(false),
  auto_promote_target_status: ReplayPlaybookStatus.default("active"),
  auto_promote_gate: z
    .object({
      require_shadow_pass: z.boolean().default(true),
      min_total_steps: z.number().int().min(0).max(500).default(0),
      max_failed_steps: z.number().int().min(0).max(500).default(0),
      max_blocked_steps: z.number().int().min(0).max(500).default(0),
      max_unknown_steps: z.number().int().min(0).max(500).default(0),
      min_success_ratio: z.number().min(0).max(1).default(1),
    })
    .default({}),
  learning_projection: ReplayLearningProjectionRequest.optional(),
  governance_review: ReplayRepairReviewGovernanceInputSchema.optional(),
  metadata: z.record(z.any()).optional(),
});

export type ReplayPlaybookRepairReviewInput = z.infer<typeof ReplayPlaybookRepairReviewRequest>;

export const AutomationDefStatus = z.enum(["draft", "shadow", "active", "disabled"]);
export type AutomationDefStatusInput = z.infer<typeof AutomationDefStatus>;

export const AutomationRunLifecycleState = z.enum(["queued", "running", "paused", "compensating", "terminal"]);
export type AutomationRunLifecycleStateInput = z.infer<typeof AutomationRunLifecycleState>;

export const AutomationRunPauseReason = z.enum(["approval_required", "repair_required", "dependency_wait", "operator_pause"]);
export type AutomationRunPauseReasonInput = z.infer<typeof AutomationRunPauseReason>;

export const AutomationRunTerminalOutcome = z.enum(["succeeded", "failed", "cancelled", "failed_compensated", "cancelled_compensated"]);
export type AutomationRunTerminalOutcomeInput = z.infer<typeof AutomationRunTerminalOutcome>;

export const AutomationNodeKind = z.enum(["playbook", "approval", "condition", "artifact_gate"]);
export type AutomationNodeKindInput = z.infer<typeof AutomationNodeKind>;

export const AutomationNodeLifecycleState = z.enum(["pending", "ready", "running", "paused", "retrying", "compensating", "terminal"]);
export type AutomationNodeLifecycleStateInput = z.infer<typeof AutomationNodeLifecycleState>;

export const AutomationNodePauseReason = z.enum(["approval_required", "repair_required"]);
export type AutomationNodePauseReasonInput = z.infer<typeof AutomationNodePauseReason>;

export const AutomationNodeTerminalOutcome = z.enum(["succeeded", "failed", "rejected", "skipped", "compensated"]);
export type AutomationNodeTerminalOutcomeInput = z.infer<typeof AutomationNodeTerminalOutcome>;

const AutomationPlaybookNode = z.object({
  node_id: z.string().min(1).max(128),
  kind: z.literal("playbook"),
  name: z.string().min(1).max(200).optional(),
  playbook_id: z.string().min(1),
  version: z.number().int().positive().optional(),
  mode: ReplayRunMode.optional(),
  inputs: z.record(z.any()).optional(),
  policy: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

const AutomationApprovalNode = z.object({
  node_id: z.string().min(1).max(128),
  kind: z.literal("approval"),
  name: z.string().min(1).max(200).optional(),
  approval_key: z.string().min(1).max(128).optional(),
  inputs: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

const AutomationConditionNode = z.object({
  node_id: z.string().min(1).max(128),
  kind: z.literal("condition"),
  name: z.string().min(1).max(200).optional(),
  expression: z.any(),
  inputs: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

const AutomationArtifactGateNode = z.object({
  node_id: z.string().min(1).max(128),
  kind: z.literal("artifact_gate"),
  name: z.string().min(1).max(200).optional(),
  required_artifacts: z.array(z.string().min(1)).max(200).default([]),
  inputs: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

export const AutomationGraphNode = z.discriminatedUnion("kind", [
  AutomationPlaybookNode,
  AutomationApprovalNode,
  AutomationConditionNode,
  AutomationArtifactGateNode,
]);
export type AutomationGraphNodeInput = z.infer<typeof AutomationGraphNode>;

export const AutomationGraphEdge = z.object({
  from: z.string().min(1).max(128),
  to: z.string().min(1).max(128),
  type: z.enum(["depends_on", "on_success", "on_failure"]).default("on_success"),
  metadata: z.record(z.any()).optional(),
});
export type AutomationGraphEdgeInput = z.infer<typeof AutomationGraphEdge>;

export const AutomationGraph = z.object({
  nodes: z.array(AutomationGraphNode).min(1).max(200),
  edges: z.array(AutomationGraphEdge).max(500).default([]),
});
export type AutomationGraphInput = z.infer<typeof AutomationGraph>;

export const AutomationCreateRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  automation_id: z.string().min(1).max(128),
  name: z.string().min(1).max(200),
  status: AutomationDefStatus.default("draft"),
  graph: AutomationGraph,
  input_contract: z.record(z.any()).optional(),
  output_contract: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});
export type AutomationCreateInput = z.infer<typeof AutomationCreateRequest>;

export const AutomationValidateRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  graph: AutomationGraph,
});
export type AutomationValidateInput = z.infer<typeof AutomationValidateRequest>;

export const AutomationTelemetryRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  automation_id: z.string().min(1).max(128).optional(),
  window_hours: z.number().int().positive().max(24 * 30).default(24),
  incident_limit: z.number().int().positive().max(100).default(10),
});
export type AutomationTelemetryInput = z.infer<typeof AutomationTelemetryRequest>;

export const AutomationGetRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  automation_id: z.string().min(1).max(128),
  version: z.number().int().positive().optional(),
});
export type AutomationGetInput = z.infer<typeof AutomationGetRequest>;

export const AutomationShadowReportRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  automation_id: z.string().min(1).max(128),
  shadow_version: z.number().int().positive().optional(),
  active_version: z.number().int().positive().optional(),
});
export type AutomationShadowReportInput = z.infer<typeof AutomationShadowReportRequest>;

export const AutomationShadowReviewVerdict = z.enum(["approved", "needs_changes", "rejected"]);

export const AutomationShadowReviewRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  automation_id: z.string().min(1).max(128),
  shadow_version: z.number().int().positive().optional(),
  verdict: AutomationShadowReviewVerdict,
  note: z.string().min(1).max(1000).optional(),
});
export type AutomationShadowReviewInput = z.infer<typeof AutomationShadowReviewRequest>;

export const AutomationShadowValidateMode = z.enum(["enqueue", "inline"]);

export const AutomationShadowValidateRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  automation_id: z.string().min(1).max(128),
  shadow_version: z.number().int().positive().optional(),
  mode: AutomationShadowValidateMode.default("enqueue"),
  note: z.string().min(1).max(1000).optional(),
  params: z.record(z.any()).optional(),
});
export type AutomationShadowValidateInput = z.infer<typeof AutomationShadowValidateRequest>;

export const AutomationShadowValidateDispatchRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  automation_id: z.string().min(1).max(128).optional(),
  limit: z.number().int().positive().max(100).default(10),
  dry_run: z.boolean().default(false),
});
export type AutomationShadowValidateDispatchInput = z.infer<typeof AutomationShadowValidateDispatchRequest>;

export const AutomationListRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  status: AutomationDefStatus.optional(),
  promotion_only: z.boolean().default(false),
  reviewer: z.string().min(1).max(256).optional(),
  limit: z.number().int().positive().max(100).default(20),
});
export type AutomationListInput = z.infer<typeof AutomationListRequest>;

export const AutomationAssignReviewerRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  automation_id: z.string().min(1).max(128),
  reviewer: z.string().min(1).max(256),
  note: z.string().min(1).max(1000).optional(),
});
export type AutomationAssignReviewerInput = z.infer<typeof AutomationAssignReviewerRequest>;

export const AutomationPromoteRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  automation_id: z.string().min(1).max(128),
  from_version: z.number().int().positive().optional(),
  target_status: AutomationDefStatus,
  note: z.string().min(1).max(1000).optional(),
  metadata: z.record(z.any()).optional(),
});
export type AutomationPromoteInput = z.infer<typeof AutomationPromoteRequest>;

export const AutomationRunRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  automation_id: z.string().min(1).max(128),
  version: z.number().int().positive().optional(),
  params: z.record(z.any()).optional(),
  options: z
    .object({
      execution_mode: z.enum(["default", "shadow"]).default("default"),
      allow_local_exec: z.boolean().default(false),
      record_run: z.boolean().default(true),
      stop_on_failure: z.boolean().default(true),
    })
    .default({}),
});
export type AutomationRunInput = z.infer<typeof AutomationRunRequest>;

export const AutomationRunGetRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  run_id: UUID,
  include_nodes: z.boolean().default(true),
});
export type AutomationRunGetInput = z.infer<typeof AutomationRunGetRequest>;

export const AutomationRunListRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  automation_id: z.string().min(1).max(128).optional(),
  actionable_only: z.boolean().default(false),
  compensation_only: z.boolean().default(false),
  reviewer: z.string().min(1).max(256).optional(),
  compensation_owner: z.string().min(1).max(256).optional(),
  escalation_owner: z.string().min(1).max(256).optional(),
  workflow_bucket: z.enum(["retry", "manual_cleanup", "escalate", "observe", "other"]).optional(),
  sla_status: z.enum(["unset", "on_track", "at_risk", "breached", "met"]).optional(),
  limit: z.number().int().positive().max(100).default(20),
});
export type AutomationRunListInput = z.infer<typeof AutomationRunListRequest>;

export const AutomationRunAssignReviewerRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  run_id: UUID,
  reviewer: z.string().min(1).max(256),
  note: z.string().min(1).max(1000).optional(),
});
export type AutomationRunAssignReviewerInput = z.infer<typeof AutomationRunAssignReviewerRequest>;

export const AutomationRunCancelRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  run_id: UUID,
  reason: z.string().min(1).max(1000).optional(),
});
export type AutomationRunCancelInput = z.infer<typeof AutomationRunCancelRequest>;

export const AutomationRunResumeRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  run_id: UUID,
  reason: z.string().min(1).max(1000).optional(),
});
export type AutomationRunResumeInput = z.infer<typeof AutomationRunResumeRequest>;

export const AutomationRunRejectRepairRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  run_id: UUID,
  reason: z.string().min(1).max(1000).optional(),
});
export type AutomationRunRejectRepairInput = z.infer<typeof AutomationRunRejectRepairRequest>;

export const AutomationRunApproveRepairRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  run_id: UUID,
  reason: z.string().min(1).max(1000).optional(),
});
export type AutomationRunApproveRepairInput = z.infer<typeof AutomationRunApproveRepairRequest>;

export const AutomationRunCompensationRetryRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  run_id: UUID,
  reason: z.string().min(1).max(1000).optional(),
});
export type AutomationRunCompensationRetryInput = z.infer<typeof AutomationRunCompensationRetryRequest>;

export const AutomationRunCompensationWorkflowAction = z.enum([
  "manual_cleanup_started",
  "manual_cleanup_completed",
  "engineering_escalated",
  "observation_noted",
]);

export const AutomationRunCompensationRecordActionRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  run_id: UUID,
  action: AutomationRunCompensationWorkflowAction,
  note: z.string().min(1).max(1000).optional(),
  external_ref: z.string().min(1).max(512).optional(),
});
export type AutomationRunCompensationRecordActionInput = z.infer<typeof AutomationRunCompensationRecordActionRequest>;

export const AutomationRunCompensationAssignRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  run_id: UUID,
  owner: z.string().min(1).max(256).optional(),
  escalation_owner: z.string().min(1).max(256).optional(),
  sla_target_at: z.string().min(1).max(64).optional(),
  note: z.string().min(1).max(1000).optional(),
});
export type AutomationRunCompensationAssignInput = z.infer<typeof AutomationRunCompensationAssignRequest>;

export const AutomationCompensationPolicyMatrixRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
});
export type AutomationCompensationPolicyMatrixInput = z.infer<typeof AutomationCompensationPolicyMatrixRequest>;

export const SandboxSessionCreateRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  profile: z.enum(["default", "restricted"]).default("default"),
  ttl_seconds: z.number().int().positive().max(7 * 24 * 3600).optional(),
  metadata: z.record(z.any()).optional(),
});

export type SandboxSessionCreateInput = z.infer<typeof SandboxSessionCreateRequest>;

const SandboxCommandAction = z.object({
  kind: z.literal("command"),
  argv: z.array(z.string().min(1)).min(1).max(64),
});

export const SandboxExecuteRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  project_id: z.string().min(1).max(128).optional(),
  actor: z.string().min(1).optional(),
  session_id: UUID,
  planner_run_id: z.string().min(1).optional(),
  decision_id: UUID.optional(),
  mode: z.enum(["async", "sync"]).default("async"),
  timeout_ms: z.number().int().positive().max(600000).optional(),
  action: SandboxCommandAction,
  metadata: z.record(z.any()).optional(),
});

export type SandboxExecuteInput = z.infer<typeof SandboxExecuteRequest>;

export const SandboxRunGetRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  run_id: UUID,
});

export type SandboxRunGetInput = z.infer<typeof SandboxRunGetRequest>;

export const SandboxRunLogsRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  run_id: UUID,
  tail_bytes: z.number().int().positive().max(512000).default(65536),
});

export type SandboxRunLogsInput = z.infer<typeof SandboxRunLogsRequest>;

export const SandboxRunArtifactRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  run_id: UUID,
  tail_bytes: z.number().int().positive().max(512000).default(65536),
  include_action: z.boolean().default(true),
  include_output: z.boolean().default(true),
  include_result: z.boolean().default(true),
  include_metadata: z.boolean().default(true),
  bundle_inline: z.boolean().default(true),
});

export type SandboxRunArtifactInput = z.infer<typeof SandboxRunArtifactRequest>;

export const SandboxRunCancelRequest = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  run_id: UUID,
  reason: z.string().min(1).max(400).optional(),
});

export type SandboxRunCancelInput = z.infer<typeof SandboxRunCancelRequest>;

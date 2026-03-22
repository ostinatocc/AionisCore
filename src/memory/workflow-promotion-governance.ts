import {
  MemoryPromoteRequest,
  WorkflowWriteProjectionGovernancePolicyEffectSchema,
  type MemoryPromoteSemanticReviewPacket,
  type WorkflowWriteProjectionGovernanceDecisionTrace,
  type WorkflowWriteProjectionGovernancePolicyEffect,
} from "./schemas.js";
import { buildGovernanceReasonCodes, buildGovernanceTraceStageOrder } from "./governance-shared.js";
import { buildPromoteMemorySemanticReviewPacket } from "./promote-memory-governance.js";

type WorkflowPromotionCandidateExample = {
  node_id: string;
  title?: string | null;
  summary?: string | null;
  task_signature?: string | null;
  workflow_signature?: string | null;
  outcome_status?: string | null;
  success_score?: number | null;
};

export function deriveWorkflowPromotionSemanticPolicyEffect(args: {
  basePromotionState: "candidate" | "stable";
}): WorkflowWriteProjectionGovernancePolicyEffect {
  if (args.basePromotionState === "stable") {
    return WorkflowWriteProjectionGovernancePolicyEffectSchema.parse({
      source: "default_workflow_promotion_state",
      applies: false,
      base_promotion_state: args.basePromotionState,
      review_suggested_promotion_state: "stable",
      effective_promotion_state: args.basePromotionState,
      reason_code: "already_stable",
    });
  }

  return WorkflowWriteProjectionGovernancePolicyEffectSchema.parse({
    source: "default_workflow_promotion_state",
    applies: false,
    base_promotion_state: args.basePromotionState,
    review_suggested_promotion_state: null,
    effective_promotion_state: args.basePromotionState,
    reason_code: "review_not_supplied",
  });
}

export function buildWorkflowPromotionGovernancePreview(args: {
  candidateNodeIds: string[];
  inputText: string;
  inputSha256: string;
  candidateExamples: WorkflowPromotionCandidateExample[];
}): {
  promote_memory: {
    review_packet: MemoryPromoteSemanticReviewPacket;
    review_result: null;
    admissibility: null;
    policy_effect: WorkflowWriteProjectionGovernancePolicyEffect;
    decision_trace: WorkflowWriteProjectionGovernanceDecisionTrace;
  };
} {
  const input = MemoryPromoteRequest.parse({
    candidate_node_ids: args.candidateNodeIds,
    target_kind: "workflow",
    target_level: "L2",
    write_anchor: true,
    input_text: args.inputText,
    input_sha256: args.inputSha256,
  });

  const reviewPacket = buildPromoteMemorySemanticReviewPacket({
    input,
    candidateExamples: args.candidateExamples,
  });

  const policyEffect = deriveWorkflowPromotionSemanticPolicyEffect({
    basePromotionState: "candidate",
  });

  return {
    promote_memory: {
      review_packet: reviewPacket,
      review_result: null,
      admissibility: null,
      policy_effect: policyEffect,
      decision_trace: {
        trace_version: "workflow_promotion_governance_trace_v1",
        review_supplied: false,
        admissibility_evaluated: false,
        admissible: null,
        policy_effect_applies: false,
        base_promotion_state: "candidate",
        effective_promotion_state: "candidate",
        stage_order: buildGovernanceTraceStageOrder({
          reviewSupplied: false,
          admissibilityEvaluated: false,
        }) as WorkflowWriteProjectionGovernanceDecisionTrace["stage_order"],
        reason_codes: buildGovernanceReasonCodes({
          admissibility: null,
          policyEffectReasonCode: policyEffect.reason_code,
          includePolicyEffectReasonCode: true,
        }),
      },
    },
  };
}

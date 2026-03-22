import type {
  MemoryAdmissibilityResult,
  MemoryPromoteInput,
  MemoryPromoteSemanticReviewPacket,
  MemoryPromoteSemanticReviewResult,
} from "./schemas.js";
import {
  buildPromoteMemorySemanticReviewPacket,
  type PromoteMemoryCandidateExample,
  evaluatePromoteMemorySemanticReview,
} from "./promote-memory-governance.js";

export function runPromoteMemoryGovernancePreview<TPolicyEffect, TDecisionTrace>(args: {
  input: MemoryPromoteInput;
  candidateExamples: PromoteMemoryCandidateExample[];
  reviewResult?: MemoryPromoteSemanticReviewResult | null;
  derivePolicyEffect: (args: {
    review: MemoryPromoteSemanticReviewResult | null;
    admissibility: MemoryAdmissibilityResult | null;
  }) => TPolicyEffect;
  buildDecisionTrace: (args: {
    reviewPacket: MemoryPromoteSemanticReviewPacket;
    reviewResult: MemoryPromoteSemanticReviewResult | null;
    admissibility: MemoryAdmissibilityResult | null;
    policyEffect: TPolicyEffect;
  }) => TDecisionTrace;
}): {
  review_packet: MemoryPromoteSemanticReviewPacket;
  review_result: MemoryPromoteSemanticReviewResult | null;
  admissibility: MemoryAdmissibilityResult | null;
  policy_effect: TPolicyEffect;
  decision_trace: TDecisionTrace;
} {
  const reviewPacket = buildPromoteMemorySemanticReviewPacket({
    input: args.input,
    candidateExamples: args.candidateExamples,
  });
  const reviewResult = args.reviewResult ?? null;
  const admissibility = reviewResult
    ? evaluatePromoteMemorySemanticReview({
        packet: reviewPacket,
        review: reviewResult,
      })
    : null;
  const policyEffect = args.derivePolicyEffect({
    review: reviewResult,
    admissibility,
  });
  const decisionTrace = args.buildDecisionTrace({
    reviewPacket,
    reviewResult,
    admissibility,
    policyEffect,
  });

  return {
    review_packet: reviewPacket,
    review_result: reviewResult,
    admissibility,
    policy_effect: policyEffect,
    decision_trace: decisionTrace,
  };
}

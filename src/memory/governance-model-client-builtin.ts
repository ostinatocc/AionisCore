import type { GovernanceModelClient } from "./governance-model-client.js";
import { resolveBuiltinFormPatternSemanticReview } from "./form-pattern-governance-adjudication.js";
import { resolveBuiltinPromoteMemorySemanticReview } from "./promote-memory-governance-adjudication.js";

export function createBuiltinPromoteMemoryGovernanceModelClient(args?: {
  confidence?: number;
  reason?: string;
}): GovernanceModelClient {
  return {
    reviewPromoteMemory: ({ reviewPacket, suppliedReviewResult }) => {
      return resolveBuiltinPromoteMemorySemanticReview({
        reviewPacket,
        suppliedReviewResult,
        confidence: args?.confidence,
        reason: args?.reason,
      });
    },
  };
}

export function createBuiltinFormPatternGovernanceModelClient(args?: {
  confidence?: number;
  reason?: string;
}): GovernanceModelClient {
  return {
    reviewFormPattern: ({ reviewPacket, suppliedReviewResult }) => {
      return resolveBuiltinFormPatternSemanticReview({
        reviewPacket,
        suppliedReviewResult,
        confidence: args?.confidence,
        reason: args?.reason,
      });
    },
  };
}

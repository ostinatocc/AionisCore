import test from "node:test";
import assert from "node:assert/strict";
import { resolveBuiltinPromoteMemorySemanticReview } from "../../src/memory/promote-memory-governance-adjudication.ts";
import { resolveBuiltinFormPatternSemanticReview } from "../../src/memory/form-pattern-governance-adjudication.ts";

test("builtin promote_memory adjudication returns supplied review first", () => {
  const supplied = {
    review_version: "promote_memory_semantic_review_v1",
    adjudication: {
      operation: "promote_memory",
      disposition: "recommend",
      target_kind: "workflow",
      target_level: "L2",
      reason: "supplied",
      confidence: 0.91,
      strategic_value: "high",
    },
  } as any;

  const review = resolveBuiltinPromoteMemorySemanticReview({
    reviewPacket: {
      deterministic_gate: { gate_satisfied: true },
      requested_target_kind: "workflow",
      requested_target_level: "L2",
      candidate_examples: [{ workflow_signature: "wf:test" }],
    } as any,
    suppliedReviewResult: supplied,
  });

  assert.equal(review, supplied);
});

test("builtin promote_memory adjudication rejects packets without workflow signature evidence", () => {
  const review = resolveBuiltinPromoteMemorySemanticReview({
    reviewPacket: {
      deterministic_gate: { gate_satisfied: true },
      requested_target_kind: "workflow",
      requested_target_level: "L2",
      candidate_examples: [{ workflow_signature: null }],
    } as any,
    suppliedReviewResult: null,
  });

  assert.equal(review, null);
});

test("builtin form_pattern adjudication returns supplied review first", () => {
  const supplied = {
    review_version: "form_pattern_semantic_review_v1",
    adjudication: {
      operation: "form_pattern",
      disposition: "recommend",
      target_kind: "pattern",
      target_level: "L3",
      reason: "supplied",
      confidence: 0.9,
    },
  } as any;

  const review = resolveBuiltinFormPatternSemanticReview({
    reviewPacket: {
      deterministic_gate: { gate_satisfied: true },
    } as any,
    suppliedReviewResult: supplied,
  });

  assert.equal(review, supplied);
});

test("builtin form_pattern adjudication returns deterministic review when gate is satisfied", () => {
  const review = resolveBuiltinFormPatternSemanticReview({
    reviewPacket: {
      deterministic_gate: { gate_satisfied: true },
    } as any,
    suppliedReviewResult: null,
  });

  assert.equal(review?.review_version, "form_pattern_semantic_review_v1");
  assert.equal(review?.adjudication.reason, "mock model found grouped signature evidence");
});

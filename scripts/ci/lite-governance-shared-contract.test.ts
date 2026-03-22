import test from "node:test";
import assert from "node:assert/strict";
import {
  appendGovernanceRuntimePolicyAppliedStage,
  buildGovernanceReasonCodes,
  buildGovernanceTraceStageOrder,
} from "../../src/memory/governance-shared.ts";

test("shared governance stage order stays stable across preview and apply flows", () => {
  assert.deepEqual(
    buildGovernanceTraceStageOrder({
      reviewSupplied: false,
      admissibilityEvaluated: false,
    }),
    ["review_packet_built", "policy_effect_derived"],
  );

  assert.deepEqual(
    buildGovernanceTraceStageOrder({
      reviewSupplied: true,
      admissibilityEvaluated: true,
      runtimePolicyApplied: true,
    }),
    [
      "review_packet_built",
      "review_result_received",
      "admissibility_evaluated",
      "policy_effect_derived",
      "runtime_policy_applied",
    ],
  );

  assert.deepEqual(
    appendGovernanceRuntimePolicyAppliedStage([
      "review_packet_built",
      "policy_effect_derived",
    ]),
    ["review_packet_built", "policy_effect_derived", "runtime_policy_applied"],
  );
});

test("shared governance reason-code collation follows caller policy", () => {
  const admissibility = {
    operation: "form_pattern",
    admissible: false,
    accepted_mutation_count: 0,
    reason_codes: ["confidence_too_low"],
    notes: {},
  } as const;

  assert.deepEqual(
    buildGovernanceReasonCodes({
      admissibility,
      policyEffectReasonCode: "review_did_not_raise_pattern_state",
      includePolicyEffectReasonCode: true,
    }),
    ["confidence_too_low", "review_did_not_raise_pattern_state"],
  );

  assert.deepEqual(
    buildGovernanceReasonCodes({
      admissibility,
      policyEffectReasonCode: "high_confidence_pattern_stabilization",
      includePolicyEffectReasonCode: false,
    }),
    ["confidence_too_low"],
  );
});

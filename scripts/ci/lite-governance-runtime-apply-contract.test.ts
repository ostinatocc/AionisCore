import test from "node:test";
import assert from "node:assert/strict";
import { deriveGovernedStateRaiseRuntimeApply } from "../../src/memory/governance-shared.ts";

test("shared runtime-apply helper stays inert without applicable policy effect", () => {
  assert.deepEqual(
    deriveGovernedStateRaiseRuntimeApply({
      policyEffect: null,
      effectiveState: null,
      appliedState: "stable",
    }),
    {
      runtimeApplyRequested: false,
      governedOverrideState: null,
    },
  );

  assert.deepEqual(
    deriveGovernedStateRaiseRuntimeApply({
      policyEffect: { applies: false },
      effectiveState: "stable",
      appliedState: "stable",
    }),
    {
      runtimeApplyRequested: false,
      governedOverrideState: null,
    },
  );
});

test("shared runtime-apply helper only requests the allowed applied state", () => {
  assert.deepEqual(
    deriveGovernedStateRaiseRuntimeApply({
      policyEffect: { applies: true },
      effectiveState: "candidate",
      appliedState: "stable",
    }),
    {
      runtimeApplyRequested: false,
      governedOverrideState: null,
    },
  );

  assert.deepEqual(
    deriveGovernedStateRaiseRuntimeApply({
      policyEffect: { applies: true },
      effectiveState: "stable",
      appliedState: "stable",
    }),
    {
      runtimeApplyRequested: true,
      governedOverrideState: "stable",
    },
  );
});

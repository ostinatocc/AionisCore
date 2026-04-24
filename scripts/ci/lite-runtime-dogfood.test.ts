import test from "node:test";
import assert from "node:assert/strict";
import { runRuntimeDogfoodSuite } from "../lib/lite-runtime-dogfood.ts";

test("runtime dogfood slice compiles real task families into outcome-backed contracts", () => {
  const result = runRuntimeDogfoodSuite();
  assert.equal(result.overall_status, "pass");
  assert.equal(result.summary.passed_scenarios, result.summary.total_scenarios);
  assert.equal(result.summary.first_correct_action_rate, 1);
  assert.equal(result.summary.false_confidence_rate, 0);
  assert.equal(result.summary.after_exit_correct_rate, 1);
  assert.equal(result.summary.wasted_step_count, 0);
  assert.equal(result.summary.gate_false_positive_rate, 0);
  assert.equal(result.summary.gate_false_negative_rate, 0);

  const serviceScenario = result.scenarios.find((scenario) => scenario.id === "service_after_exit");
  assert.ok(serviceScenario);
  assert.equal(serviceScenario.metrics.after_exit_correct, true);
  assert.ok(serviceScenario.compiled.outcome.must_hold_after_exit.length > 0);
  assert.ok(serviceScenario.compiled.outcome.external_visibility_requirements.length > 0);

  const deployScenario = result.scenarios.find((scenario) => scenario.id === "deploy_hook_web");
  assert.ok(deployScenario);
  assert.equal(deployScenario.task_family, "git_deploy_webserver");
  assert.ok(deployScenario.compiled.outcome.dependency_requirements.some((entry) => entry.includes("git deploy or hook path")));

  const thinServiceScenario = result.scenarios.find((scenario) => scenario.id === "thin_service_missing_detach");
  assert.ok(thinServiceScenario);
  assert.equal(thinServiceScenario.metrics.outcome_gate_allows_authoritative, false);
  assert.equal(thinServiceScenario.metrics.false_confidence_risk, false);
  assert.equal(thinServiceScenario.metrics.after_exit_correct, false);
  assert.ok(thinServiceScenario.compiled.outcome_contract_gate.reasons.includes("missing_service_detach_then_probe"));
});

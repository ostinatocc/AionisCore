import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderRealAbMarkdownReport,
  runRealAbValidationSuite,
  type RealAbSuiteInput,
} from "../lib/aionis-real-ab-validation.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const seedPath = path.join(repoRoot, "scripts", "fixtures", "real-ab-validation", "seed-suite.json");
const traceSeedPath = path.join(repoRoot, "scripts", "fixtures", "real-ab-validation", "trace-suite.json");

function readSeed(): RealAbSuiteInput {
  return JSON.parse(fs.readFileSync(seedPath, "utf8")) as RealAbSuiteInput;
}

function readTraceSeed(): RealAbSuiteInput {
  return JSON.parse(fs.readFileSync(traceSeedPath, "utf8")) as RealAbSuiteInput;
}

test("real A/B seed calibration suite passes with harness-only proof boundary", () => {
  const report = runRealAbValidationSuite(readSeed());

  assert.equal(report.report_version, "aionis_real_ab_validation_report_v1");
  assert.equal(report.suite_kind, "harness_calibration");
  assert.equal(report.proof_boundary.claim_level, "harness_only");
  assert.equal(report.proof_boundary.live_trace_required_for_product_claim, true);
  assert.equal(report.gate.status, "pass");
  assert.equal(report.summary.total_tasks, 6);
  assert.equal(report.summary.task_families.service_publish_validate, 1);
  assert.equal(report.summary.task_families.package_publish_validate, 1);
  assert.equal(report.summary.task_families.deploy_hook_webserver, 1);
  assert.equal(report.summary.task_families.handoff_resume, 1);
  assert.equal(report.summary.task_families.agent_takeover, 1);
  assert.ok((report.summary.wasted_step_reduction_pct ?? 0) >= 20);
  assert.equal(report.summary.negative_control_authoritative_count, 0);
  assert.equal(report.summary.positive_control_sanity_rate, 1);
});

test("real A/B harness fails when fairness is broken", () => {
  const suite = readSeed();
  suite.tasks[0].fairness.same_model = false;

  const report = runRealAbValidationSuite(suite);

  assert.equal(report.gate.status, "fail");
  assert.ok(report.gate.failed_requirements.some((requirement) =>
    requirement.id === "coding_resume_ci_failure:fairness:same_model"
  ));
});

test("real A/B harness fails when treatment regresses", () => {
  const suite = readSeed();
  const metrics = suite.tasks[0].arms.aionis_assisted.metrics;
  metrics.completion = false;
  metrics.verifier_passed = false;
  metrics.first_correct_action = false;
  metrics.wasted_steps = 12;
  metrics.false_confidence = true;

  const report = runRealAbValidationSuite(suite);

  assert.equal(report.gate.status, "fail");
  assert.ok(report.gate.failed_requirements.some((requirement) =>
    requirement.id === "coding_resume_ci_failure:completion_not_worse"
  ));
  assert.ok(report.gate.failed_requirements.some((requirement) =>
    requirement.id === "coding_resume_ci_failure:false_confidence_not_worse"
  ));
});

test("real A/B markdown report exposes gate status and proof boundary", () => {
  const report = runRealAbValidationSuite(readSeed());
  const markdown = renderRealAbMarkdownReport(report);

  assert.match(markdown, /Aionis Real A\/B Validation Report/);
  assert.match(markdown, /Gate: \*\*pass\*\*/);
  assert.match(markdown, /does not prove Aionis product value/);
  assert.match(markdown, /coding_resume_ci_failure/);
});

test("real A/B harness derives metrics from real agent run traces", () => {
  const report = runRealAbValidationSuite(readTraceSeed());

  assert.equal(report.gate.status, "pass");
  assert.equal(report.summary.total_tasks, 2);
  assert.equal(report.summary.baseline_first_correct_action_rate, 0);
  assert.equal(report.summary.treatment_first_correct_action_rate, 1);
  assert.equal(report.summary.baseline_false_confidence_rate, 0.5);
  assert.equal(report.summary.treatment_false_confidence_rate, 0);
  assert.equal(report.summary.baseline_after_exit_correctness_rate, 0);
  assert.equal(report.summary.treatment_after_exit_correctness_rate, 1);
  assert.ok((report.summary.wasted_step_reduction_pct ?? 0) >= 20);

  const codingTask = report.tasks.find((task) => task.id === "trace_coding_resume");
  assert.ok(codingTask);
  assert.equal(codingTask.arms.baseline.metrics_source, "trace_derived");
  assert.equal(codingTask.arms.aionis_assisted.metrics_source, "trace_derived");
  assert.equal(codingTask.arms.baseline.trace_summary?.event_count, 5);
  assert.equal(codingTask.arms.baseline.metrics.first_correct_action, false);
  assert.equal(codingTask.arms.aionis_assisted.metrics.first_correct_action, true);
  assert.equal(codingTask.arms.baseline.metrics.wasted_steps, 2);
  assert.equal(codingTask.arms.aionis_assisted.metrics.wasted_steps, 0);

  const serviceTask = report.tasks.find((task) => task.id === "trace_service_after_exit");
  assert.ok(serviceTask);
  assert.equal(serviceTask.arms.baseline.metrics.false_confidence, true);
  assert.equal(serviceTask.arms.baseline.metrics.after_exit_correct, false);
  assert.equal(serviceTask.arms.aionis_assisted.metrics.after_exit_correct, true);
});

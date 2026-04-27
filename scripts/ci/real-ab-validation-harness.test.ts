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
import {
  compileRealAbTraceCapture,
  validateRealAbTraceCapture,
  type RealAbTraceCaptureInput,
} from "../lib/aionis-real-ab-trace-capture.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const seedPath = path.join(repoRoot, "scripts", "fixtures", "real-ab-validation", "seed-suite.json");
const traceSeedPath = path.join(repoRoot, "scripts", "fixtures", "real-ab-validation", "trace-suite.json");
const traceCapturePath = path.join(repoRoot, "scripts", "fixtures", "real-ab-validation", "trace-capture.json");

function readSeed(): RealAbSuiteInput {
  return JSON.parse(fs.readFileSync(seedPath, "utf8")) as RealAbSuiteInput;
}

function readTraceSeed(): RealAbSuiteInput {
  return JSON.parse(fs.readFileSync(traceSeedPath, "utf8")) as RealAbSuiteInput;
}

function readTraceCapture(): RealAbTraceCaptureInput {
  return JSON.parse(fs.readFileSync(traceCapturePath, "utf8")) as RealAbTraceCaptureInput;
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

test("real A/B trace capture compiles auditable pilot traces into a validation suite", () => {
  const capture = readTraceCapture();
  const captureRequirements = validateRealAbTraceCapture(capture);
  const suite = compileRealAbTraceCapture(capture);
  const report = runRealAbValidationSuite(suite);

  assert.equal(captureRequirements.every((requirement) => requirement.status === "pass"), true);
  assert.equal(suite.suite_kind, "pilot_real_trace");
  assert.equal(report.proof_boundary.claim_level, "pilot_evidence");
  assert.equal(report.gate.status, "pass");
  assert.equal(report.summary.total_tasks, 2);
  assert.equal(report.tasks[0].arms.aionis_assisted.metrics_source, "trace_derived");
  assert.equal(report.tasks[1].arms.aionis_assisted.metrics.after_exit_correct, true);
});

test("real A/B trace capture rejects runs without verifier evidence", () => {
  const capture = readTraceCapture();
  capture.tasks[0].runs.baseline.events = capture.tasks[0].runs.baseline.events.filter((event) =>
    event.kind !== "verification"
  );

  const captureRequirements = validateRealAbTraceCapture(capture);
  const report = runRealAbValidationSuite(compileRealAbTraceCapture(capture));

  assert.ok(captureRequirements.some((requirement) =>
    requirement.id === "capture_coding_resume:capture:baseline:verifier" && requirement.status === "fail"
  ));
  assert.ok(report.gate.failed_requirements.some((requirement) =>
    requirement.id === "capture_coding_resume:trace_evidence:baseline:verifier"
  ));
});

test("real A/B pilot/product suites reject direct metrics as product evidence", () => {
  const suite = compileRealAbTraceCapture(readTraceCapture());
  const baseline = suite.tasks[0].arms.baseline;
  baseline.metrics = {
    completion: true,
    verifier_passed: true,
    first_correct_action: true,
    wasted_steps: 0,
    retry_count: 0,
    false_confidence: false,
    after_exit_correct: null,
    wrong_file_touches: 0,
    human_intervention_count: 0,
    time_to_success_ms: 1,
    tokens_to_success: 1,
  };
  delete baseline.trace;

  const report = runRealAbValidationSuite(suite);

  assert.equal(report.gate.status, "fail");
  assert.ok(report.gate.failed_requirements.some((requirement) =>
    requirement.id === "capture_coding_resume:trace_evidence:baseline:live_trace"
  ));
});

test("real A/B after-exit product evidence requires fresh-shell verifier events", () => {
  const capture = readTraceCapture();
  const serviceTreatmentEvents = capture.tasks[1].runs.aionis_assisted.events;
  const probe = serviceTreatmentEvents.find((event) => event.kind === "external_probe");
  assert.ok(probe);
  probe.fresh_shell = false;

  const captureRequirements = validateRealAbTraceCapture(capture);
  const report = runRealAbValidationSuite(compileRealAbTraceCapture(capture));

  assert.ok(captureRequirements.some((requirement) =>
    requirement.id === "capture_service_after_exit:capture:aionis_assisted:fresh_shell"
    && requirement.status === "fail"
  ));
  assert.ok(report.gate.failed_requirements.some((requirement) =>
    requirement.id === "capture_service_after_exit:trace_evidence:aionis_assisted:fresh_shell_probe"
  ));
});

test("real A/B product evidence requires external probe command to match the declared verifier", () => {
  const capture = readTraceCapture();
  const serviceTreatmentEvents = capture.tasks[1].runs.aionis_assisted.events;
  const probe = serviceTreatmentEvents.find((event) => event.kind === "external_probe");
  assert.ok(probe);
  probe.command = "curl -fsS http://127.0.0.1:9999/healthz";

  const captureRequirements = validateRealAbTraceCapture(capture);
  const report = runRealAbValidationSuite(compileRealAbTraceCapture(capture));

  assert.ok(captureRequirements.some((requirement) =>
    requirement.id === "capture_service_after_exit:capture:aionis_assisted:external_probe"
    && requirement.status === "fail"
  ));
  assert.ok(report.gate.failed_requirements.some((requirement) =>
    requirement.id === "capture_service_after_exit:trace_evidence:aionis_assisted:external_probe"
  ));
});

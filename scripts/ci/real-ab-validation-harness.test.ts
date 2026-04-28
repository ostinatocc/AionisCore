import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
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
import {
  compileRealAbDogfoodPairedCapture,
  validateRealAbDogfoodPairedCapture,
  type RealAbDogfoodPairedCaptureInput,
} from "../lib/aionis-real-ab-dogfood-capture.ts";
import {
  assembleRealAbDogfoodPairedCaptureFromLiveEvidence,
  validateRealAbLiveEvidenceAssemblerInputs,
  type RealAbLiveEvidenceAgentEventsFile,
  type RealAbLiveEvidenceLoadedInputs,
  type RealAbLiveEvidenceManifest,
} from "../lib/aionis-real-ab-live-evidence-assembler.ts";
import {
  buildRealAbLiveEvidenceBundleFiles,
  buildRealAbLiveEvidenceManifestTemplate,
} from "../lib/aionis-real-ab-live-evidence-bundle.ts";
import {
  appendRealAbLiveEvidenceAgentEvent,
  validateRealAbLiveEvidenceEventDraft,
} from "../lib/aionis-real-ab-live-evidence-event-recorder.ts";
import {
  buildRealAbLiveEvidenceArmRunPacket,
  renderRealAbLiveEvidenceArmRunPacketMarkdown,
} from "../lib/aionis-real-ab-live-evidence-arm-run-packet.ts";
import {
  buildRealAbLiveEvidenceStatusReport,
  renderRealAbLiveEvidenceStatusMarkdown,
} from "../lib/aionis-real-ab-live-evidence-status.ts";
import {
  applyRealAbLlmArmAttemptToAgentEvents,
  parseRealAbLlmAgentOutput,
  runRealAbLlmArmAttempt,
} from "../lib/aionis-real-ab-llm-runner.ts";

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

test("real A/B after-exit correctness does not count pre-exit fresh-shell probes", () => {
  const capture = readTraceCapture();
  const task = capture.tasks[1];
  const verifierCommand = task.verifier.command;
  assert.ok(verifierCommand);
  task.runs.aionis_assisted.events = [
    {
      kind: "tool_call",
      command: "launchctl bootstrap gui/501 /tmp/com.aionis.test.plist",
      touched_files: ["scripts/health-server.mjs"],
      correct: true,
    },
    {
      kind: "external_probe",
      command: verifierCommand,
      success: true,
      verifier: true,
      after_exit: false,
      fresh_shell: true,
    },
    {
      kind: "agent_claim",
      text: "Service is durable.",
      claimed_success: true,
    },
    {
      kind: "external_probe",
      command: verifierCommand,
      success: false,
      verifier: true,
      after_exit: true,
      fresh_shell: true,
    },
  ];

  const report = runRealAbValidationSuite(compileRealAbTraceCapture(capture));
  const serviceTask = report.tasks.find((entry) => entry.id === "capture_service_after_exit");
  assert.ok(serviceTask);

  assert.equal(serviceTask.arms.aionis_assisted.metrics.after_exit_correct, false);
  assert.equal(serviceTask.arms.aionis_assisted.metrics.verifier_passed, false);
  assert.equal(serviceTask.arms.aionis_assisted.metrics.false_confidence, true);
  assert.ok(serviceTask.gate_requirements.some((requirement) =>
    requirement.id === "capture_service_after_exit:after_exit_not_worse"
    && requirement.status === "fail"
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

function dogfoodRun(args: {
  runId: string;
  probeId: string;
  success: boolean;
  command?: string;
}): RealAbDogfoodPairedCaptureInput["arms"]["baseline"]["dogfood_run"] {
  const command = args.command ?? "curl -fsS http://127.0.0.1:4199/healthz";
  const taskSpec = {
    id: args.probeId,
    title: "Dogfood service after-exit validation",
    query_text: "Start a detached service and prove it from a fresh shell.",
    evidence_source: "external_probe",
    trajectory: {
      title: "Dogfood service after-exit validation",
      task_family: "service_publish_validate",
      steps: [
        { role: "assistant", text: "Start the service detached and validate it externally." },
        { role: "tool", tool_name: "bash", command },
      ],
    },
    execution_evidence: {
      validation_passed: args.success,
      after_exit_revalidated: args.success,
      fresh_shell_probe_passed: args.success,
      false_confidence_detected: !args.success,
      failure_reason: args.success ? null : "fresh_shell_probe_failed",
      evidence_refs: [`external_probe:fresh_shell:${command}`],
    },
    expectations: {
      target_files_include: ["scripts/health-server.mjs"],
      acceptance_checks_match: [command],
      next_action_match: ["scripts/health-server.mjs", "fresh shell"],
      success_invariants_include: ["fresh_shell_revalidation_passes"],
      dependency_requirements_match: ["service launch must not depend on the agent shell"],
      environment_assumptions_include: ["validation_can_run_from_fresh_shell"],
      must_hold_after_exit_include: ["task_result_remains_valid_after_agent_exit"],
      external_visibility_requirements_match: ["endpoint_reachable"],
      service_lifecycle_required: true,
      after_exit_required: true,
      authoritative_gate_allows: true,
      evidence_allows_authoritative: args.success,
      stable_promotion_allowed: args.success,
      evidence_reasons_include: args.success ? [] : ["fresh_shell_probe_failed"],
    },
  };
  return {
    run_version: "runtime_dogfood_external_probe_run_v1",
    endpoint: "http://127.0.0.1:4199",
    service_pid: args.success ? 1234 : null,
    launcher_exit_code: 0,
    fresh_shell_probe_passed: args.success,
    fresh_shell_probe_output: args.success ? "ok" : "",
    probes: [
      {
        id: args.probeId,
        task_family_hint: "service_publish_validate",
        endpoint: "http://127.0.0.1:4199",
        service_pid: args.success ? 1234 : null,
        launcher_exit_code: 0,
        fresh_shell_probe_passed: args.success,
        fresh_shell_probe_output: args.success ? "ok" : "",
        diagnostics: {
          slice: "service_after_exit",
          scenario_id: args.probeId,
          command_count: 1,
          command,
          cwd: repoRoot,
          duration_ms: 42,
          exit_code: args.success ? 0 : 1,
          stdout_tail: args.success ? "ok" : "",
          stderr_tail: args.success ? "" : "connection refused",
          failure_class: args.success ? "none" : "fresh_shell_probe_failed",
          commands: [],
        },
        task_spec: taskSpec,
      },
    ],
    diagnostics: [],
    task_specs: [taskSpec],
    dogfood_result: {
      suite_version: "runtime_dogfood_suite_v1",
      generated_at: "2026-04-27T00:00:00.000Z",
      overall_status: args.success ? "pass" : "fail",
      scenarios: [],
      summary: {},
      proof_boundary: {},
      coverage: {},
      report: {},
    },
  } as RealAbDogfoodPairedCaptureInput["arms"]["baseline"]["dogfood_run"];
}

function pairedDogfoodInput(): RealAbDogfoodPairedCaptureInput {
  const probeId = "external_probe_service_after_exit";
  return {
    capture_version: "aionis_real_ab_dogfood_paired_capture_v1",
    suite_id: "aionis_real_ab_dogfood_paired_fixture_v1",
    suite_kind: "pilot_real_trace",
    generated_at: "2026-04-27T00:00:00.000Z",
    fairness: {
      same_model: true,
      same_time_budget: true,
      same_tool_permissions: true,
      same_environment_reset: true,
      same_verifier: true,
    },
    task_ids: [probeId],
    arms: {
      baseline: {
        source_run_id: "dogfood-baseline",
        memory_mode: "none",
        authority_level: "none",
        packet_source: "none",
        dogfood_run: dogfoodRun({ runId: "dogfood-baseline", probeId, success: false }),
        agent_events_by_probe_id: {
          [probeId]: [
            {
              kind: "action",
              text: "Start the service in the foreground and assume it is available.",
              touched_files: ["scripts/health-server.mjs"],
              correct: false,
              wasted: true,
            },
            {
              kind: "agent_claim",
              text: "The service is running.",
              claimed_success: true,
            },
          ],
        },
      },
      aionis_assisted: {
        source_run_id: "dogfood-aionis",
        memory_mode: "aionis_auto",
        authority_level: "authoritative",
        packet_source: "automatic_runtime",
        dogfood_run: dogfoodRun({ runId: "dogfood-aionis", probeId, success: true }),
        agent_events_by_probe_id: {
          [probeId]: [
            {
              kind: "tool_call",
              command: "nohup node scripts/health-server.mjs --port 4199 >/tmp/health.log 2>&1 &",
              touched_files: ["scripts/health-server.mjs"],
              correct: true,
            },
          ],
        },
      },
      negative_control: {
        source_run_id: "dogfood-negative",
        memory_mode: "irrelevant_or_low_trust",
        authority_level: "observational",
        packet_source: "irrelevant_low_trust",
        dogfood_run: dogfoodRun({ runId: "dogfood-negative", probeId, success: false }),
        agent_events_by_probe_id: {
          [probeId]: [
            {
              kind: "action",
              text: "Follow unrelated package publish memory.",
              touched_files: ["scripts/build_index.py"],
              correct: false,
              wasted: true,
            },
          ],
        },
      },
      positive_control: {
        source_run_id: "dogfood-positive",
        memory_mode: "oracle_handoff",
        authority_level: "authoritative",
        packet_source: "oracle_handoff",
        dogfood_run: dogfoodRun({ runId: "dogfood-positive", probeId, success: true }),
        agent_events_by_probe_id: {
          [probeId]: [
            {
              kind: "tool_call",
              command: "nohup node scripts/health-server.mjs --port 4199 >/tmp/health.log 2>&1 &",
              touched_files: ["scripts/health-server.mjs"],
              correct: true,
            },
          ],
        },
      },
    },
  };
}

test("real A/B dogfood paired capture compiles four external-probe arms into auditable trace capture", () => {
  const dogfoodInput = pairedDogfoodInput();
  const dogfoodRequirements = validateRealAbDogfoodPairedCapture(dogfoodInput);
  const capture = compileRealAbDogfoodPairedCapture(dogfoodInput);
  const captureRequirements = validateRealAbTraceCapture(capture);
  const report = runRealAbValidationSuite(compileRealAbTraceCapture(capture));

  assert.equal(dogfoodRequirements.every((requirement) => requirement.status === "pass"), true);
  assert.equal(captureRequirements.every((requirement) => requirement.status === "pass"), true);
  assert.equal(capture.capture_version, "aionis_real_ab_trace_capture_v1");
  assert.equal(capture.tasks[0].runs.aionis_assisted.events.at(-1)?.kind, "external_probe");
  assert.equal(report.gate.status, "pass");
  assert.equal(report.summary.treatment_after_exit_correctness_rate, 1);
});

test("real A/B dogfood paired capture rejects arms without captured agent actions", () => {
  const dogfoodInput = pairedDogfoodInput();
  dogfoodInput.arms.aionis_assisted.agent_events_by_probe_id.external_probe_service_after_exit = [];

  const dogfoodRequirements = validateRealAbDogfoodPairedCapture(dogfoodInput);

  assert.ok(dogfoodRequirements.some((requirement) =>
    requirement.id === "dogfood_capture:external_probe_service_after_exit:aionis_assisted:agent_action_events"
    && requirement.status === "fail"
  ));
});

function liveEvidenceManifest(): RealAbLiveEvidenceManifest {
  return {
    manifest_version: "aionis_real_ab_live_evidence_manifest_v1",
    suite_id: "aionis_real_ab_live_evidence_fixture_v1",
    suite_kind: "pilot_real_trace",
    generated_at: "2026-04-27T00:00:00.000Z",
    fairness: {
      same_model: true,
      same_time_budget: true,
      same_tool_permissions: true,
      same_environment_reset: true,
      same_verifier: true,
    },
    task_ids: ["external_probe_service_after_exit"],
    arms: {
      baseline: {
        source_run_id: "live-baseline",
        memory_mode: "none",
        authority_level: "none",
        packet_source: "none",
        dogfood_run_path: "baseline-dogfood.json",
        agent_events_path: "baseline-events.json",
      },
      aionis_assisted: {
        source_run_id: "live-aionis",
        memory_mode: "aionis_auto",
        authority_level: "authoritative",
        packet_source: "automatic_runtime",
        dogfood_run_path: "aionis-dogfood.json",
        agent_events_path: "aionis-events.json",
      },
      negative_control: {
        source_run_id: "live-negative",
        memory_mode: "irrelevant_or_low_trust",
        authority_level: "observational",
        packet_source: "irrelevant_low_trust",
        dogfood_run_path: "negative-dogfood.json",
        agent_events_path: "negative-events.json",
      },
      positive_control: {
        source_run_id: "live-positive",
        memory_mode: "oracle_handoff",
        authority_level: "authoritative",
        packet_source: "oracle_handoff",
        dogfood_run_path: "positive-dogfood.json",
        agent_events_path: "positive-events.json",
      },
    },
  };
}

function loadedLiveEvidence(): RealAbLiveEvidenceLoadedInputs {
  const paired = pairedDogfoodInput();
  return {
    baseline: {
      dogfood_run: paired.arms.baseline.dogfood_run,
      agent_events: { events_by_probe_id: paired.arms.baseline.agent_events_by_probe_id },
    },
    aionis_assisted: {
      dogfood_run: paired.arms.aionis_assisted.dogfood_run,
      agent_events: { events_by_probe_id: paired.arms.aionis_assisted.agent_events_by_probe_id },
    },
    negative_control: {
      dogfood_run: paired.arms.negative_control.dogfood_run,
      agent_events: { events_by_probe_id: paired.arms.negative_control.agent_events_by_probe_id },
    },
    positive_control: {
      dogfood_run: paired.arms.positive_control.dogfood_run,
      agent_events: { events_by_probe_id: paired.arms.positive_control.agent_events_by_probe_id },
    },
  };
}

test("real A/B live evidence assembler builds paired dogfood capture from separate arm artifacts", () => {
  const manifest = liveEvidenceManifest();
  const loaded = loadedLiveEvidence();
  const assemblerRequirements = validateRealAbLiveEvidenceAssemblerInputs({ manifest, loaded });
  const paired = assembleRealAbDogfoodPairedCaptureFromLiveEvidence({ manifest, loaded });
  const dogfoodRequirements = validateRealAbDogfoodPairedCapture(paired);
  const capture = compileRealAbDogfoodPairedCapture(paired);
  const report = runRealAbValidationSuite(compileRealAbTraceCapture(capture));

  assert.equal(assemblerRequirements.every((requirement) => requirement.status === "pass"), true);
  assert.equal(dogfoodRequirements.every((requirement) => requirement.status === "pass"), true);
  assert.equal(paired.capture_version, "aionis_real_ab_dogfood_paired_capture_v1");
  assert.equal(paired.arms.baseline.source_run_id, "live-baseline");
  assert.equal(report.gate.status, "pass");
});

test("real A/B live evidence assembler rejects loaded arm artifacts without probe events", () => {
  const manifest = liveEvidenceManifest();
  const loaded = loadedLiveEvidence();
  loaded.aionis_assisted.agent_events = { events_by_probe_id: { external_probe_service_after_exit: [] } };

  const assemblerRequirements = validateRealAbLiveEvidenceAssemblerInputs({ manifest, loaded });

  assert.ok(assemblerRequirements.some((requirement) =>
    requirement.id === "live_evidence:external_probe_service_after_exit:aionis_assisted:agent_events_present"
    && requirement.status === "fail"
  ));
});

test("real A/B live evidence CLI assembles separate arm files into a validation report", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-live-evidence-"));
  const manifest = liveEvidenceManifest();
  const loaded = loadedLiveEvidence();

  for (const arm of ["baseline", "aionis_assisted", "negative_control", "positive_control"] as const) {
    const armManifest = manifest.arms[arm];
    fs.writeFileSync(path.join(dir, armManifest.dogfood_run_path), `${JSON.stringify(loaded[arm].dogfood_run, null, 2)}\n`);
    fs.writeFileSync(path.join(dir, armManifest.agent_events_path), `${JSON.stringify(loaded[arm].agent_events, null, 2)}\n`);
  }

  const manifestPath = path.join(dir, "manifest.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const output = execFileSync("npx", [
    "tsx",
    "scripts/aionis-real-ab-live-evidence.ts",
    "--manifest",
    manifestPath,
    "--report",
    "--fail-on-invalid",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.match(output, /Aionis Real A\/B Validation Report/);
  assert.match(output, /Gate: \*\*pass\*\*/);
  assert.match(output, /aionis_real_ab_live_evidence_fixture_v1/);
});

test("real A/B live evidence bundle templates create an incomplete collection scaffold", () => {
  const manifest = buildRealAbLiveEvidenceManifestTemplate({
    suite_id: "first-live-evidence",
    suite_kind: "pilot_real_trace",
    generated_at: "2026-04-27T00:00:00.000Z",
    task_ids: ["external_probe_service_after_exit"],
  });
  const files = buildRealAbLiveEvidenceBundleFiles({
    suite_id: "first-live-evidence",
    task_ids: ["external_probe_service_after_exit"],
  });
  const filePaths = new Set(files.map((file) => file.relative_path));

  assert.equal(manifest.manifest_version, "aionis_real_ab_live_evidence_manifest_v1");
  assert.equal(manifest.suite_kind, "pilot_real_trace");
  assert.equal(manifest.arms.aionis_assisted.packet_source, "automatic_runtime");
  assert.equal(manifest.arms.negative_control.authority_level, "observational");
  assert.equal(filePaths.has("manifest.json"), true);
  assert.equal(filePaths.has("baseline/agent-events.json"), true);
  assert.equal(filePaths.has("baseline/dogfood-run.REQUIRED.md"), true);
  assert.equal(filePaths.has("baseline/dogfood-run.json"), false);

  const baselineEvents = files.find((file) => file.relative_path === "baseline/agent-events.json");
  assert.ok(baselineEvents);
  assert.deepEqual(JSON.parse(baselineEvents.content), {
    events_by_probe_id: {
      external_probe_service_after_exit: [],
    },
  });
});

test("real A/B live evidence init CLI writes scaffold without fake dogfood run JSON", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-live-evidence-init-"));

  const output = execFileSync("npx", [
    "tsx",
    "scripts/aionis-real-ab-live-evidence-init.ts",
    "--out-dir",
    dir,
    "--suite-id",
    "first-live-evidence",
    "--task-id",
    "external_probe_service_after_exit",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8")) as RealAbLiveEvidenceManifest;
  const baselineEvents = JSON.parse(
    fs.readFileSync(path.join(dir, "baseline", "agent-events.json"), "utf8"),
  );

  assert.match(output, /Initialized Aionis real A\/B live evidence bundle/);
  assert.equal(manifest.arms.baseline.dogfood_run_path, "baseline/dogfood-run.json");
  assert.equal(manifest.arms.baseline.agent_events_path, "baseline/agent-events.json");
  assert.deepEqual(baselineEvents.events_by_probe_id.external_probe_service_after_exit, []);
  assert.equal(fs.existsSync(path.join(dir, "baseline", "dogfood-run.REQUIRED.md")), true);
  assert.equal(fs.existsSync(path.join(dir, "baseline", "dogfood-run.json")), false);
});

test("real A/B live evidence init CLI refuses to overwrite scaffold files by default", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-live-evidence-init-overwrite-"));
  const args = [
    "tsx",
    "scripts/aionis-real-ab-live-evidence-init.ts",
    "--out-dir",
    dir,
    "--suite-id",
    "first-live-evidence",
    "--task-id",
    "external_probe_service_after_exit",
  ];

  execFileSync("npx", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  let failed = false;
  try {
    execFileSync("npx", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error) {
    failed = true;
    const stderr = String((error as { stderr?: unknown }).stderr ?? error);
    assert.match(stderr, /Refusing to overwrite existing evidence bundle files/);
  }

  assert.equal(failed, true);
});

test("real A/B live evidence event recorder appends action events to a probe bucket", () => {
  const updated = appendRealAbLiveEvidenceAgentEvent({
    events_file: { events_by_probe_id: { external_probe_service_after_exit: [] } },
    probe_id: "external_probe_service_after_exit",
    event: {
      kind: "tool_call",
      command: "nohup node scripts/health-server.mjs --port 4199 >/tmp/health.log 2>&1 &",
      touched_files: ["scripts/health-server.mjs"],
      correct: true,
      wasted: false,
    },
  });

  assert.deepEqual(updated.events_by_probe_id.external_probe_service_after_exit, [
    {
      kind: "tool_call",
      command: "nohup node scripts/health-server.mjs --port 4199 >/tmp/health.log 2>&1 &",
      touched_files: ["scripts/health-server.mjs"],
      correct: true,
      wasted: false,
    },
  ]);
});

test("real A/B live evidence event recorder rejects empty or commandless events", () => {
  assert.deepEqual(validateRealAbLiveEvidenceEventDraft({ kind: "action" }), [
    "event must include text, command, or touched_files",
    "action events must include text or command",
  ]);
  assert.deepEqual(validateRealAbLiveEvidenceEventDraft({ kind: "tool_call", text: "Run the server" }), [
    "tool_call events must include command",
  ]);
});

test("real A/B live evidence event CLI records events through manifest and arm selection", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-live-evidence-event-"));

  execFileSync("npx", [
    "tsx",
    "scripts/aionis-real-ab-live-evidence-init.ts",
    "--out-dir",
    dir,
    "--suite-id",
    "first-live-evidence",
    "--task-id",
    "external_probe_service_after_exit",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  const output = execFileSync("npx", [
    "tsx",
    "scripts/aionis-real-ab-live-evidence-event.ts",
    "--manifest",
    path.join(dir, "manifest.json"),
    "--arm",
    "aionis_assisted",
    "--probe",
    "external_probe_service_after_exit",
    "--kind",
    "tool_call",
    "--command",
    "nohup node scripts/health-server.mjs --port 4199 >/tmp/health.log 2>&1 &",
    "--touched-file",
    "scripts/health-server.mjs",
    "--correct",
    "--not-wasted",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  const events = JSON.parse(
    fs.readFileSync(path.join(dir, "aionis_assisted", "agent-events.json"), "utf8"),
  ) as RealAbLiveEvidenceAgentEventsFile;

  assert.match(output, /Recorded tool_call event/);
  assert.equal(events.events_by_probe_id.external_probe_service_after_exit.length, 1);
  assert.equal(events.events_by_probe_id.external_probe_service_after_exit[0].correct, true);
  assert.equal(events.events_by_probe_id.external_probe_service_after_exit[0].wasted, false);
});

function writeMockRealAbLlmAgent(dir: string): string {
  const scriptPath = path.join(dir, "mock-real-ab-llm-agent.mjs");
  fs.writeFileSync(scriptPath, `
const output = {
  output_version: "aionis_real_ab_llm_agent_output_v1",
  probe_id: process.env.AIONIS_AB_PROBE_ID,
  events: [
    {
      kind: "action",
      text: \`arm=\${process.env.AIONIS_AB_ARM}; prompt_len=\${(process.env.AIONIS_AB_PROMPT ?? "").length}\`,
      correct: true,
      wasted: false
    },
    {
      kind: "tool_call",
      command: "nohup node scripts/health-server.mjs --port 4199 >/tmp/health.log 2>&1 &",
      touched_files: ["scripts/health-server.mjs"],
      correct: true,
      wasted: false
    }
  ]
};
process.stdout.write(JSON.stringify(output));
`);
  return scriptPath;
}

test("real A/B LLM runner executes a configured agent command and returns auditable events", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-live-evidence-llm-runner-"));
  const probeId = "external_probe_service_after_exit";
  const manifest = buildRealAbLiveEvidenceManifestTemplate({
    suite_id: "first-live-evidence-llm",
    task_ids: [probeId],
  });
  const manifestPath = path.join(dir, "manifest.json");
  const eventsPath = path.join(dir, manifest.arms.aionis_assisted.agent_events_path);
  const mockAgentPath = writeMockRealAbLlmAgent(dir);
  fs.mkdirSync(path.dirname(eventsPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const attempt = await runRealAbLlmArmAttempt({
    manifest,
    manifest_path: manifestPath,
    arm: "aionis_assisted",
    probe_id: probeId,
    command: `${JSON.stringify(process.execPath)} ${JSON.stringify(mockAgentPath)}`,
    cwd: repoRoot,
    timeout_ms: 10_000,
    agent_events_path: eventsPath,
  });
  const updated = applyRealAbLlmArmAttemptToAgentEvents({
    events_file: { events_by_probe_id: { [probeId]: [] } },
    attempt,
  });

  assert.equal(attempt.result_version, "aionis_real_ab_llm_arm_attempt_result_v1");
  assert.equal(attempt.success, true);
  assert.equal(attempt.arm, "aionis_assisted");
  assert.equal(attempt.parsed_event_count, 2);
  assert.equal(attempt.action_event_count, 2);
  assert.equal(attempt.command_result.exit_code, 0);
  assert.match(attempt.prompt_sha256, /^[a-f0-9]{64}$/);
  assert.equal(updated.events_by_probe_id[probeId].length, 2);
  assert.match(updated.events_by_probe_id[probeId][0].text ?? "", /arm=aionis_assisted/);
});

test("real A/B LLM runner rejects outputs without real action or tool evidence", () => {
  assert.throws(
    () => parseRealAbLlmAgentOutput(JSON.stringify({
      output_version: "aionis_real_ab_llm_agent_output_v1",
      probe_id: "external_probe_service_after_exit",
      events: [
        {
          kind: "agent_claim",
          text: "I completed the task.",
          claimed_success: true,
        },
      ],
    }), "external_probe_service_after_exit"),
    /at least one action or tool_call event/,
  );
});

test("real A/B LLM runner CLI writes structured events into the selected arm event file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-live-evidence-llm-runner-cli-"));
  const probeId = "external_probe_service_after_exit";
  const manifest = buildRealAbLiveEvidenceManifestTemplate({
    suite_id: "first-live-evidence-llm-cli",
    task_ids: [probeId],
  });
  const manifestPath = path.join(dir, "manifest.json");
  const eventsPath = path.join(dir, manifest.arms.baseline.agent_events_path);
  const resultPath = path.join(dir, "baseline", "llm-run-result.json");
  const mockAgentPath = writeMockRealAbLlmAgent(dir);
  fs.mkdirSync(path.dirname(eventsPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(eventsPath, `${JSON.stringify({ events_by_probe_id: { [probeId]: [] } }, null, 2)}\n`);

  const output = execFileSync("npx", [
    "tsx",
    "scripts/aionis-real-ab-llm-runner.ts",
    "--manifest",
    manifestPath,
    "--arm",
    "baseline",
    "--probe",
    probeId,
    "--command",
    `${JSON.stringify(process.execPath)} ${JSON.stringify(mockAgentPath)}`,
    "--events",
    eventsPath,
    "--out-json",
    resultPath,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const events = JSON.parse(fs.readFileSync(eventsPath, "utf8")) as RealAbLiveEvidenceAgentEventsFile;
  const result = JSON.parse(fs.readFileSync(resultPath, "utf8"));

  assert.match(output, /aionis_real_ab_llm_arm_attempt_result_v1/);
  assert.equal(events.events_by_probe_id[probeId].length, 2);
  assert.equal(events.events_by_probe_id[probeId][1].kind, "tool_call");
  assert.equal(result.success, true);
  assert.equal(result.agent_events_patch.events_by_probe_id[probeId].length, 2);
});

test("real A/B live evidence arm run packet maps probes to dogfood command and recorder examples", () => {
  const manifest = buildRealAbLiveEvidenceManifestTemplate({
    suite_id: "first-live-evidence",
    task_ids: ["external_probe_service_after_exit", "external_probe_deploy_hook_web"],
  });
  const manifestPath = path.join(os.tmpdir(), "first-live-evidence", "manifest.json");
  const packet = buildRealAbLiveEvidenceArmRunPacket({
    manifest,
    manifest_path: manifestPath,
    arm: "aionis_assisted",
  });
  const markdown = renderRealAbLiveEvidenceArmRunPacketMarkdown(packet);

  assert.equal(packet.packet_version, "aionis_real_ab_live_evidence_arm_run_packet_v1");
  assert.deepEqual(packet.probe_slices, ["service_after_exit", "deploy_hook_web"]);
  assert.match(packet.dogfood_command, /--slice service_after_exit,deploy_hook_web/);
  assert.match(packet.recorder_examples.external_probe_service_after_exit, /ab:evidence:event/);
  assert.match(packet.recorder_examples.external_probe_deploy_hook_web, /--arm aionis_assisted/);
  assert.ok(packet.guardrails.some((guardrail) => guardrail.includes("manual prompt surgery")));
  assert.match(markdown, /Aionis Real A\/B Arm Run Packet: aionis_assisted/);
});

test("real A/B live evidence arm run CLI writes a per-arm runbook", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-live-evidence-arm-"));

  execFileSync("npx", [
    "tsx",
    "scripts/aionis-real-ab-live-evidence-init.ts",
    "--out-dir",
    dir,
    "--suite-id",
    "first-live-evidence",
    "--task-id",
    "external_probe_service_after_exit",
    "--task-id",
    "external_probe_deploy_hook_web",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  const runbookPath = path.join(dir, "aionis_assisted", "RUNBOOK.md");
  const packetPath = path.join(dir, "aionis_assisted", "arm-run-packet.json");
  const output = execFileSync("npx", [
    "tsx",
    "scripts/aionis-real-ab-live-evidence-arm-run.ts",
    "--manifest",
    path.join(dir, "manifest.json"),
    "--arm",
    "aionis_assisted",
    "--out-json",
    packetPath,
    "--out-md",
    runbookPath,
    "--md",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));
  const runbook = fs.readFileSync(runbookPath, "utf8");

  assert.match(output, /Aionis Real A\/B Arm Run Packet: aionis_assisted/);
  assert.equal(packet.arm, "aionis_assisted");
  assert.deepEqual(packet.probe_slices, ["service_after_exit", "deploy_hook_web"]);
  assert.match(runbook, /Do not copy agent-events\.json or dogfood-run\.json across arms/);
});

test("real A/B live evidence status reports missing agent action evidence by arm and probe", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-live-evidence-status-"));

  execFileSync("npx", [
    "tsx",
    "scripts/aionis-real-ab-live-evidence-init.ts",
    "--out-dir",
    dir,
    "--suite-id",
    "first-live-evidence",
    "--task-id",
    "external_probe_service_after_exit",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8")) as RealAbLiveEvidenceManifest;
  const loaded = loadedLiveEvidence();
  for (const arm of ["baseline", "aionis_assisted", "negative_control", "positive_control"] as const) {
    fs.writeFileSync(
      path.join(dir, manifest.arms[arm].dogfood_run_path),
      `${JSON.stringify(loaded[arm].dogfood_run, null, 2)}\n`,
    );
  }

  const report = buildRealAbLiveEvidenceStatusReport({
    manifest_path: path.join(dir, "manifest.json"),
  });
  const markdown = renderRealAbLiveEvidenceStatusMarkdown(report);

  assert.equal(report.ready_for_live_evidence, false);
  assert.equal(report.summary.dogfood_runs_present, 4);
  assert.equal(report.summary.missing_agent_action_slots, 4);
  assert.deepEqual(report.arms.aionis_assisted.probes[0].missing, [
    "agent_events_empty",
    "agent_action_events_missing",
  ]);
  assert.match(markdown, /Ready for live evidence: \*\*no\*\*/);
});

test("real A/B live evidence status CLI exits non-zero when evidence is incomplete", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-live-evidence-status-cli-"));

  execFileSync("npx", [
    "tsx",
    "scripts/aionis-real-ab-live-evidence-init.ts",
    "--out-dir",
    dir,
    "--suite-id",
    "first-live-evidence",
    "--task-id",
    "external_probe_service_after_exit",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  let failed = false;
  try {
    execFileSync("npx", [
      "tsx",
      "scripts/aionis-real-ab-live-evidence-status.ts",
      "--manifest",
      path.join(dir, "manifest.json"),
      "--fail-on-not-ready",
    ], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error) {
    failed = true;
    const stdout = String((error as { stdout?: unknown }).stdout ?? "");
    assert.match(stdout, /Ready for live evidence: \*\*no\*\*/);
  }

  assert.equal(failed, true);
});

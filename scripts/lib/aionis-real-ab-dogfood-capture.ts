import {
  realAbRequiredArms,
  type RealAbArm,
  type RealAbAuthorityLevel,
  type RealAbFairnessContract,
  type RealAbGateRequirement,
  type RealAbArmMetrics,
  type RealAbMemoryMode,
  type RealAbRunEnvironmentEvidence,
  type RealAbSuiteInput,
  type RealAbSuiteKind,
  type RealAbTraceEvent,
} from "./aionis-real-ab-validation.ts";
import type {
  RuntimeDogfoodExternalProbeRun,
  RuntimeDogfoodExternalProbeScenarioRun,
} from "./lite-runtime-dogfood-external-probe.ts";
import type { RealAbTraceCaptureInput, RealAbTraceCaptureTask } from "./aionis-real-ab-trace-capture.ts";

export type RealAbDogfoodArmRunInput = {
  source_run_id: string;
  memory_mode: RealAbMemoryMode;
  authority_level: RealAbAuthorityLevel;
  packet_source: "none" | "automatic_runtime" | "irrelevant_low_trust" | "oracle_handoff";
  dogfood_run: RuntimeDogfoodExternalProbeRun;
  agent_events_by_probe_id: Record<string, RealAbTraceEvent[]>;
  outcomes_by_probe_id?: Record<string, Partial<RealAbArmMetrics>>;
  run_environment?: RealAbRunEnvironmentEvidence;
  notes?: string[];
};

export type RealAbDogfoodPairedCaptureInput = {
  capture_version: "aionis_real_ab_dogfood_paired_capture_v1";
  suite_id: string;
  suite_kind: Exclude<RealAbSuiteKind, "harness_calibration">;
  generated_at?: string;
  thresholds?: RealAbSuiteInput["thresholds"];
  fairness: RealAbFairnessContract;
  task_ids?: string[];
  arms: Record<RealAbArm, RealAbDogfoodArmRunInput>;
};

function dogfoodRequirement(args: Omit<RealAbGateRequirement, "status"> & { ok: boolean }): RealAbGateRequirement {
  return {
    id: args.id,
    scope: args.scope,
    status: args.ok ? "pass" : "fail",
    actual: args.actual,
    expected: args.expected,
    message: args.message,
  };
}

function dogfoodProbeMap(run: RuntimeDogfoodExternalProbeRun): Map<string, RuntimeDogfoodExternalProbeScenarioRun> {
  return new Map((run.probes ?? []).map((probe) => [probe.id, probe]));
}

function selectedProbeIds(input: RealAbDogfoodPairedCaptureInput): string[] {
  const baselineRun = input.arms?.baseline?.dogfood_run;
  const baselineProbeIds = (baselineRun?.probes ?? []).map((probe) => probe.id);
  const selected = input.task_ids?.length ? input.task_ids : baselineProbeIds;
  return [...selected].sort((a, b) => a.localeCompare(b));
}

function actionEventCount(events: RealAbTraceEvent[]): number {
  return events.filter((event) => event.kind === "action" || event.kind === "tool_call").length;
}

export function validateRealAbDogfoodPairedCapture(input: RealAbDogfoodPairedCaptureInput): RealAbGateRequirement[] {
  const probeIds = selectedProbeIds(input);
  const requirements: RealAbGateRequirement[] = [
    dogfoodRequirement({
      id: "dogfood_capture:version",
      scope: "suite",
      ok: input.capture_version === "aionis_real_ab_dogfood_paired_capture_v1",
      actual: input.capture_version,
      expected: "aionis_real_ab_dogfood_paired_capture_v1",
      message: "dogfood paired capture input must use the supported contract",
    }),
    dogfoodRequirement({
      id: "dogfood_capture:suite_kind",
      scope: "suite",
      ok: input.suite_kind === "pilot_real_trace" || input.suite_kind === "product_real_trace",
      actual: input.suite_kind,
      expected: "pilot_or_product_real_trace",
      message: "dogfood paired capture is only for pilot/product real trace suites",
    }),
    ...Object.entries(input.fairness).map(([key, value]) =>
      dogfoodRequirement({
        id: `dogfood_capture:fairness:${key}`,
        scope: "suite",
        ok: value === true,
        actual: value,
        expected: true,
        message: `dogfood paired capture requires ${key}`,
      })
    ),
  ];

  for (const arm of realAbRequiredArms) {
    const armInput = input.arms?.[arm];
    const probeMap = armInput?.dogfood_run ? dogfoodProbeMap(armInput.dogfood_run) : new Map();
    requirements.push(
      dogfoodRequirement({
        id: `dogfood_capture:arm:${arm}:present`,
        scope: "suite",
        ok: Boolean(armInput),
        actual: Boolean(armInput),
        expected: true,
        message: `dogfood paired capture requires ${arm} arm`,
      }),
      dogfoodRequirement({
        id: `dogfood_capture:arm:${arm}:run_version`,
        scope: "suite",
        ok: armInput?.dogfood_run?.run_version === "runtime_dogfood_external_probe_run_v1",
        actual: armInput?.dogfood_run?.run_version ?? null,
        expected: "runtime_dogfood_external_probe_run_v1",
        message: `${arm} must include a Runtime dogfood external-probe run`,
      }),
    );

    for (const probeId of probeIds) {
      const probe = probeMap.get(probeId);
      const agentEvents = armInput?.agent_events_by_probe_id?.[probeId] ?? [];
      requirements.push(
        dogfoodRequirement({
          id: `dogfood_capture:${probeId}:${arm}:probe_present`,
          scope: "task",
          ok: Boolean(probe),
          actual: Boolean(probe),
          expected: true,
          message: `${arm} must include dogfood probe ${probeId}`,
        }),
        dogfoodRequirement({
          id: `dogfood_capture:${probeId}:${arm}:agent_action_events`,
          scope: "task",
          ok: actionEventCount(agentEvents) > 0,
          actual: actionEventCount(agentEvents),
          expected: "at_least_one_action_or_tool_call",
          message: `${arm} must include captured agent action/tool events before verifier evidence`,
        }),
        dogfoodRequirement({
          id: `dogfood_capture:${probeId}:${arm}:fresh_shell_probe_recorded`,
          scope: "task",
          ok: typeof probe?.fresh_shell_probe_passed === "boolean",
          actual: typeof probe?.fresh_shell_probe_passed,
          expected: "boolean",
          message: `${arm} must record fresh-shell probe success or failure`,
        }),
        dogfoodRequirement({
          id: `dogfood_capture:${probeId}:${arm}:verifier_command`,
          scope: "task",
          ok: typeof probe?.diagnostics?.command === "string" && probe.diagnostics.command.length > 0,
          actual: probe?.diagnostics?.command ?? null,
          expected: "non_empty_verifier_command",
          message: `${arm} must include the verifier command used by the dogfood probe`,
        }),
      );
    }
  }

  return requirements;
}

function probeIsExternalVisibility(probe: RuntimeDogfoodExternalProbeScenarioRun): boolean {
  return probe.task_spec.expectations.external_visibility_requirements_match.length > 0
    || probe.task_spec.expectations.service_lifecycle_required
    || probe.task_spec.expectations.after_exit_required;
}

function verifierCommandSignatureForProbe(probe: RuntimeDogfoodExternalProbeScenarioRun): string {
  const slice = probe.diagnostics.slice || "external_probe";
  return `runtime_dogfood:${probe.id}:${slice}:fresh_shell`;
}

function verifierEventForProbe(probe: RuntimeDogfoodExternalProbeScenarioRun): RealAbTraceEvent {
  const externalVisibility = probeIsExternalVisibility(probe);
  const actualCommand = probe.diagnostics.command;
  const probeOutput = probe.diagnostics.stdout_tail || probe.diagnostics.stderr_tail || probe.fresh_shell_probe_output;
  return {
    kind: externalVisibility ? "external_probe" : "verification",
    command: verifierCommandSignatureForProbe(probe),
    text: actualCommand ? `${actualCommand}\n${probeOutput}`.trim() : probeOutput,
    success: probe.fresh_shell_probe_passed,
    verifier: true,
    after_exit: probe.task_spec.expectations.after_exit_required,
    fresh_shell: true,
  };
}

function traceEventsForProbe(args: {
  arm: RealAbArm;
  armInput: RealAbDogfoodArmRunInput;
  probe: RuntimeDogfoodExternalProbeScenarioRun;
}): RealAbTraceEvent[] {
  const agentEvents = args.armInput.agent_events_by_probe_id[args.probe.id] ?? [];
  return [
    ...agentEvents,
    verifierEventForProbe(args.probe),
  ];
}

function compileTask(input: RealAbDogfoodPairedCaptureInput, probeId: string): RealAbTraceCaptureTask {
  const aionisProbe = dogfoodProbeMap(input.arms.aionis_assisted.dogfood_run).get(probeId);
  if (!aionisProbe) {
    throw new Error(`aionis_assisted arm is missing dogfood probe ${probeId}`);
  }
  const externalVisibility = probeIsExternalVisibility(aionisProbe);
  const afterExitRequired = aionisProbe.task_spec.expectations.after_exit_required;
  return {
    id: `dogfood_${probeId}`,
    title: aionisProbe.task_spec.title,
    task_family: aionisProbe.task_family_hint,
    task_prompt: aionisProbe.task_spec.query_text,
    fairness: input.fairness,
    verifier: {
      kind: externalVisibility ? "external_probe" : "command",
      command: verifierCommandSignatureForProbe(aionisProbe),
      after_exit_required: afterExitRequired,
      external_visibility_required: externalVisibility,
    },
    expected_outcome: {
      target_files: aionisProbe.task_spec.expectations.target_files_include,
      success_invariants: aionisProbe.task_spec.expectations.success_invariants_include,
      acceptance_checks: [aionisProbe.diagnostics.command],
    },
    runs: {
      baseline: compileArm(input, "baseline", probeId),
      aionis_assisted: compileArm(input, "aionis_assisted", probeId),
      negative_control: compileArm(input, "negative_control", probeId),
      positive_control: compileArm(input, "positive_control", probeId),
    },
  };
}

function compileArm(input: RealAbDogfoodPairedCaptureInput, arm: RealAbArm, probeId: string): RealAbTraceCaptureTask["runs"][RealAbArm] {
  const armInput = input.arms[arm];
  const probe = dogfoodProbeMap(armInput.dogfood_run).get(probeId);
  if (!probe) {
    throw new Error(`${arm} arm is missing dogfood probe ${probeId}`);
  }
  return {
    run_id: `${armInput.source_run_id}:${probe.id}`,
    memory_mode: armInput.memory_mode,
    authority_level: armInput.authority_level,
    packet_source: armInput.packet_source,
    events: traceEventsForProbe({ arm, armInput, probe }),
    ...(armInput.outcomes_by_probe_id?.[probeId] ? { outcome: armInput.outcomes_by_probe_id[probeId] } : {}),
    run_environment: armInput.run_environment,
    notes: armInput.notes,
  };
}

export function compileRealAbDogfoodPairedCapture(input: RealAbDogfoodPairedCaptureInput): RealAbTraceCaptureInput {
  return {
    capture_version: "aionis_real_ab_trace_capture_v1",
    suite_id: input.suite_id,
    suite_kind: input.suite_kind,
    ...(input.generated_at ? { generated_at: input.generated_at } : {}),
    ...(input.thresholds ? { thresholds: input.thresholds } : {}),
    tasks: selectedProbeIds(input).map((probeId) => compileTask(input, probeId)),
  };
}

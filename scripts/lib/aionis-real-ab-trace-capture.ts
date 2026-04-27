import {
  realAbRequiredArms,
  type RealAbArm,
  type RealAbArmMetrics,
  type RealAbAuthorityLevel,
  type RealAbFairnessContract,
  type RealAbGateRequirement,
  type RealAbMemoryMode,
  type RealAbRunTrace,
  type RealAbSuiteInput,
  type RealAbSuiteKind,
  type RealAbTaskSpec,
  type RealAbTraceEvent,
  type RealAbVerifierSpec,
} from "./aionis-real-ab-validation.ts";

export type RealAbTraceCaptureArmRun = {
  run_id: string;
  memory_mode: RealAbMemoryMode;
  authority_level: RealAbAuthorityLevel;
  packet_source: "none" | "automatic_runtime" | "irrelevant_low_trust" | "oracle_handoff";
  started_at_ms?: number;
  ended_at_ms?: number;
  events: RealAbTraceEvent[];
  outcome?: Partial<RealAbArmMetrics>;
  notes?: string[];
};

export type RealAbTraceCaptureTask = {
  id: string;
  title: string;
  task_family: string;
  task_prompt: string;
  fairness: RealAbFairnessContract;
  verifier: RealAbVerifierSpec;
  expected_outcome: {
    target_files?: string[];
    success_invariants: string[];
    acceptance_checks?: string[];
  };
  runs: Record<RealAbArm, RealAbTraceCaptureArmRun>;
};

export type RealAbTraceCaptureInput = {
  capture_version: "aionis_real_ab_trace_capture_v1";
  suite_id: string;
  suite_kind: Exclude<RealAbSuiteKind, "harness_calibration">;
  generated_at?: string;
  thresholds?: RealAbSuiteInput["thresholds"];
  tasks: RealAbTraceCaptureTask[];
};

function captureRequirement(args: Omit<RealAbGateRequirement, "status"> & { ok: boolean }): RealAbGateRequirement {
  return {
    id: args.id,
    scope: args.scope,
    status: args.ok ? "pass" : "fail",
    actual: args.actual,
    expected: args.expected,
    message: args.message,
  };
}

function hasVerifierEvent(events: RealAbTraceEvent[]): boolean {
  return events.some((event) =>
    event.kind === "verification" || event.kind === "external_probe" || event.verifier === true
  );
}

function hasExternalProbe(events: RealAbTraceEvent[], verifier: RealAbVerifierSpec): boolean {
  return events.some((event) =>
    (!verifier.command || event.command === verifier.command)
    && (event.kind === "external_probe" || event.verifier === true)
  );
}

function hasAfterExitVerifier(events: RealAbTraceEvent[]): boolean {
  return events.some((event) =>
    (event.kind === "verification" || event.kind === "external_probe" || event.verifier === true)
    && event.after_exit === true
  );
}

function hasFreshShellVerifier(events: RealAbTraceEvent[]): boolean {
  return events.some((event) =>
    (event.kind === "verification" || event.kind === "external_probe" || event.verifier === true)
    && event.fresh_shell === true
  );
}

export function validateRealAbTraceCapture(input: RealAbTraceCaptureInput): RealAbGateRequirement[] {
  const requirements: RealAbGateRequirement[] = [
    captureRequirement({
      id: "capture:version",
      scope: "suite",
      ok: input.capture_version === "aionis_real_ab_trace_capture_v1",
      actual: input.capture_version,
      expected: "aionis_real_ab_trace_capture_v1",
      message: "trace capture input must use the supported capture contract",
    }),
    captureRequirement({
      id: "capture:suite_kind",
      scope: "suite",
      ok: input.suite_kind === "pilot_real_trace" || input.suite_kind === "product_real_trace",
      actual: input.suite_kind,
      expected: "pilot_or_product_real_trace",
      message: "trace capture is only for pilot/product real trace suites",
    }),
  ];

  for (const task of input.tasks ?? []) {
    for (const arm of realAbRequiredArms) {
      const run = task.runs?.[arm];
      const events = run?.events ?? [];
      requirements.push(
        captureRequirement({
          id: `${task.id}:capture:${arm}:run_present`,
          scope: "task",
          ok: Boolean(run),
          actual: Boolean(run),
          expected: true,
          message: `capture task must include ${arm} run`,
        }),
        captureRequirement({
          id: `${task.id}:capture:${arm}:run_id`,
          scope: "task",
          ok: typeof run?.run_id === "string" && run.run_id.length > 0,
          actual: run?.run_id ?? null,
          expected: "non_empty_run_id",
          message: "captured run must include a stable run id",
        }),
        captureRequirement({
          id: `${task.id}:capture:${arm}:events`,
          scope: "task",
          ok: Array.isArray(run?.events) && run.events.length > 0,
          actual: run?.events.length ?? 0,
          expected: "events_present",
          message: "captured run must include raw execution events",
        }),
        captureRequirement({
          id: `${task.id}:capture:${arm}:verifier`,
          scope: "task",
          ok: hasVerifierEvent(events),
          actual: hasVerifierEvent(events),
          expected: true,
          message: "captured run must include verifier evidence",
        }),
      );

      if (task.verifier.kind === "external_probe" || task.verifier.external_visibility_required) {
        requirements.push(captureRequirement({
          id: `${task.id}:capture:${arm}:external_probe`,
          scope: "task",
          ok: hasExternalProbe(events, task.verifier),
          actual: hasExternalProbe(events, task.verifier),
          expected: true,
          message: "captured external-visibility task must include external probe evidence",
        }));
      }

      if (task.verifier.after_exit_required) {
        requirements.push(
          captureRequirement({
            id: `${task.id}:capture:${arm}:after_exit`,
            scope: "task",
            ok: hasAfterExitVerifier(events),
            actual: hasAfterExitVerifier(events),
            expected: true,
            message: "captured after-exit task must include an after-exit verifier",
          }),
          captureRequirement({
            id: `${task.id}:capture:${arm}:fresh_shell`,
            scope: "task",
            ok: hasFreshShellVerifier(events),
            actual: hasFreshShellVerifier(events),
            expected: true,
            message: "captured after-exit task must include fresh-shell revalidation",
          }),
        );
      }
    }
  }

  return requirements;
}

function compileRunToTrace(run: RealAbTraceCaptureArmRun): RealAbRunTrace {
  return {
    trace_version: "aionis_agent_run_trace_v1",
    run_id: run.run_id,
    ...(typeof run.started_at_ms === "number" ? { started_at_ms: run.started_at_ms } : {}),
    ...(typeof run.ended_at_ms === "number" ? { ended_at_ms: run.ended_at_ms } : {}),
    events: run.events,
    ...(run.outcome ? { outcome: run.outcome } : {}),
  };
}

function compileTask(task: RealAbTraceCaptureTask): RealAbTaskSpec {
  return {
    id: task.id,
    title: task.title,
    task_family: task.task_family,
    task_prompt: task.task_prompt,
    fairness: task.fairness,
    verifier: task.verifier,
    expected_outcome: task.expected_outcome,
    arms: {
      baseline: {
        memory_mode: task.runs.baseline.memory_mode,
        authority_level: task.runs.baseline.authority_level,
        packet_source: task.runs.baseline.packet_source,
        trace: compileRunToTrace(task.runs.baseline),
        notes: task.runs.baseline.notes,
      },
      aionis_assisted: {
        memory_mode: task.runs.aionis_assisted.memory_mode,
        authority_level: task.runs.aionis_assisted.authority_level,
        packet_source: task.runs.aionis_assisted.packet_source,
        trace: compileRunToTrace(task.runs.aionis_assisted),
        notes: task.runs.aionis_assisted.notes,
      },
      negative_control: {
        memory_mode: task.runs.negative_control.memory_mode,
        authority_level: task.runs.negative_control.authority_level,
        packet_source: task.runs.negative_control.packet_source,
        trace: compileRunToTrace(task.runs.negative_control),
        notes: task.runs.negative_control.notes,
      },
      positive_control: {
        memory_mode: task.runs.positive_control.memory_mode,
        authority_level: task.runs.positive_control.authority_level,
        packet_source: task.runs.positive_control.packet_source,
        trace: compileRunToTrace(task.runs.positive_control),
        notes: task.runs.positive_control.notes,
      },
    },
  };
}

export function compileRealAbTraceCapture(input: RealAbTraceCaptureInput): RealAbSuiteInput {
  return {
    suite_id: input.suite_id,
    suite_kind: input.suite_kind,
    ...(input.generated_at ? { generated_at: input.generated_at } : {}),
    ...(input.thresholds ? { thresholds: input.thresholds } : {}),
    tasks: input.tasks.map(compileTask),
  };
}

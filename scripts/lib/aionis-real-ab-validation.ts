export const realAbRequiredArms = [
  "baseline",
  "aionis_assisted",
  "negative_control",
  "positive_control",
] as const;

export type RealAbArm = typeof realAbRequiredArms[number];

export type RealAbSuiteKind =
  | "harness_calibration"
  | "pilot_real_trace"
  | "product_real_trace";

export type RealAbMemoryMode =
  | "none"
  | "aionis_auto"
  | "irrelevant_or_low_trust"
  | "oracle_handoff";

export type RealAbAuthorityLevel =
  | "none"
  | "observational"
  | "advisory"
  | "authoritative";

export type RealAbFairnessContract = {
  same_model: boolean;
  same_time_budget: boolean;
  same_tool_permissions: boolean;
  same_environment_reset: boolean;
  same_verifier: boolean;
};

export type RealAbVerifierSpec = {
  kind: "command" | "external_probe" | "manual";
  command?: string;
  after_exit_required?: boolean;
  external_visibility_required?: boolean;
};

export type RealAbArmMetrics = {
  completion: boolean;
  verifier_passed: boolean;
  first_correct_action: boolean;
  wasted_steps: number;
  retry_count: number;
  false_confidence: boolean;
  after_exit_correct: boolean | null;
  wrong_file_touches: number;
  human_intervention_count: number;
  time_to_success_ms?: number | null;
  tokens_to_success?: number | null;
};

export type RealAbTraceEventKind =
  | "action"
  | "tool_call"
  | "verification"
  | "external_probe"
  | "agent_claim"
  | "retry"
  | "human_intervention";

export type RealAbTraceEvent = {
  kind: RealAbTraceEventKind;
  timestamp_ms?: number;
  text?: string;
  command?: string;
  touched_files?: string[];
  correct?: boolean;
  wasted?: boolean;
  retry?: boolean;
  success?: boolean;
  verifier?: boolean;
  after_exit?: boolean;
  fresh_shell?: boolean;
  claimed_success?: boolean;
  false_confidence?: boolean;
  human_intervention?: boolean;
  tokens?: number;
};

export type RealAbDisciplineViolationKind =
  | "broad_discovery_before_targets"
  | "skill_or_preference_read_before_targets"
  | "declared_target_never_touched"
  | "non_target_expansion"
  | "repeat_validation_after_pass"
  | "acceptance_evidence_edit"
  | "max_pre_edit_confirmation_steps_exceeded";

export type RealAbDisciplineViolation = {
  kind: RealAbDisciplineViolationKind;
  severity: "severe";
  event_index: number;
  command?: string;
  text?: string;
  detail: string;
};

export type RealAbDisciplineCompliance = {
  status: "pass" | "fail" | "not_applicable";
  checked: boolean;
  locked_contract_expected: boolean;
  violation_count: number;
  severe_violation_count: number;
  violations: RealAbDisciplineViolation[];
  first_target_event_index: number | null;
  first_edit_event_index: number | null;
  first_acceptance_pass_event_index: number | null;
  pre_edit_confirmation_steps: number;
  max_pre_edit_confirmation_steps: number | null;
};

export type RealAbRunTrace = {
  trace_version: "aionis_agent_run_trace_v1";
  run_id: string;
  started_at_ms?: number;
  ended_at_ms?: number;
  events: RealAbTraceEvent[];
  outcome?: Partial<RealAbArmMetrics>;
};

export type RealAbArmObservation = {
  memory_mode: RealAbMemoryMode;
  authority_level: RealAbAuthorityLevel;
  packet_source: "none" | "automatic_runtime" | "irrelevant_low_trust" | "oracle_handoff";
  metrics?: RealAbArmMetrics;
  trace?: RealAbRunTrace;
  notes?: string[];
};

export type RealAbResolvedArmObservation = Omit<RealAbArmObservation, "metrics"> & {
  metrics: RealAbArmMetrics;
  metrics_source: "provided" | "trace_derived";
  trace_summary?: {
    run_id: string;
    event_count: number;
    action_event_count: number;
    verifier_event_count: number;
    discipline_compliance: RealAbDisciplineCompliance;
  };
};

export type RealAbTaskSpec = {
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
  arms: Record<RealAbArm, RealAbArmObservation>;
};

export type RealAbSuiteInput = {
  suite_id: string;
  suite_kind: RealAbSuiteKind;
  generated_at?: string;
  thresholds?: Partial<RealAbThresholds>;
  tasks: RealAbTaskSpec[];
};

export type RealAbThresholds = {
  min_wasted_step_reduction_pct: number;
};

export type RealAbGateRequirement = {
  id: string;
  scope: "task" | "suite";
  status: "pass" | "fail";
  actual: string | number | boolean | null;
  expected: string | number | boolean;
  message: string;
};

export type RealAbTaskResult = {
  id: string;
  title: string;
  task_family: string;
  status: "pass" | "fail";
  fairness_status: "pass" | "fail";
  verifier: RealAbVerifierSpec;
  deltas: {
    completion_delta: number;
    first_correct_action_delta: number;
    wasted_step_delta: number;
    retry_delta: number;
    false_confidence_delta: number;
    after_exit_correct_delta: number | null;
    wrong_file_touch_delta: number;
    human_intervention_delta: number;
    time_to_success_delta_ms: number | null;
    tokens_to_success_delta: number | null;
  };
  gate_requirements: RealAbGateRequirement[];
  arms: Record<RealAbArm, RealAbResolvedArmObservation>;
};

export type RealAbReport = {
  report_version: "aionis_real_ab_validation_report_v1";
  generated_at: string;
  suite_id: string;
  suite_kind: RealAbSuiteKind;
  proof_boundary: {
    boundary_version: "aionis_real_ab_proof_boundary_v1";
    claim_level: "harness_only" | "pilot_evidence" | "product_evidence";
    statement: string;
    live_trace_required_for_product_claim: boolean;
  };
  thresholds: RealAbThresholds;
  gate: {
    gate_version: "aionis_real_ab_gate_v1";
    status: "pass" | "fail";
    failed_requirements: RealAbGateRequirement[];
    requirements: RealAbGateRequirement[];
  };
  summary: {
    total_tasks: number;
    task_families: Record<string, number>;
    baseline_completion_rate: number;
    treatment_completion_rate: number;
    baseline_first_correct_action_rate: number;
    treatment_first_correct_action_rate: number;
    wasted_step_reduction_pct: number | null;
    baseline_false_confidence_rate: number;
    treatment_false_confidence_rate: number;
    baseline_after_exit_correctness_rate: number | null;
    treatment_after_exit_correctness_rate: number | null;
    negative_control_authoritative_count: number;
    positive_control_sanity_rate: number;
  };
  tasks: RealAbTaskResult[];
};

const defaultThresholds: RealAbThresholds = {
  min_wasted_step_reduction_pct: 20,
};

function boolToNumber(value: boolean): number {
  return value ? 1 : 0;
}

function nullableBoolToNumber(value: boolean | null): number | null {
  return value === null ? null : boolToNumber(value);
}

function rate(values: boolean[]): number {
  if (values.length === 0) return 0;
  return values.filter(Boolean).length / values.length;
}

function nullableRate(values: Array<boolean | null>): number | null {
  const filtered = values.filter((value): value is boolean => value !== null);
  if (filtered.length === 0) return null;
  return rate(filtered);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function pctReduction(before: number, after: number): number | null {
  if (before <= 0) return after <= before ? 0 : -Infinity;
  return ((before - after) / before) * 100;
}

function requirement(args: Omit<RealAbGateRequirement, "status"> & { ok: boolean }): RealAbGateRequirement {
  return {
    id: args.id,
    scope: args.scope,
    status: args.ok ? "pass" : "fail",
    actual: args.actual,
    expected: args.expected,
    message: args.message,
  };
}

function validateRequiredArms(task: RealAbTaskSpec): RealAbGateRequirement[] {
  return realAbRequiredArms.map((arm) =>
    requirement({
      id: `${task.id}:arm:${arm}`,
      scope: "task",
      ok: Boolean(task.arms?.[arm]),
      actual: Boolean(task.arms?.[arm]),
      expected: true,
      message: `task must include ${arm} arm`,
    })
  );
}

function validateFairness(task: RealAbTaskSpec): RealAbGateRequirement[] {
  return Object.entries(task.fairness).map(([key, value]) =>
    requirement({
      id: `${task.id}:fairness:${key}`,
      scope: "task",
      ok: value === true,
      actual: value,
      expected: true,
      message: `A/B fairness requires ${key}`,
    })
  );
}

function validateArmSemantics(task: RealAbTaskSpec): RealAbGateRequirement[] {
  const baseline = task.arms.baseline;
  const treatment = task.arms.aionis_assisted;
  const negative = task.arms.negative_control;
  const positive = task.arms.positive_control;

  return [
    requirement({
      id: `${task.id}:baseline_no_memory`,
      scope: "task",
      ok: baseline.memory_mode === "none" && baseline.packet_source === "none",
      actual: baseline.memory_mode,
      expected: "none",
      message: "baseline must not receive Aionis memory",
    }),
    requirement({
      id: `${task.id}:treatment_automatic_memory`,
      scope: "task",
      ok: treatment.memory_mode === "aionis_auto" && treatment.packet_source === "automatic_runtime",
      actual: treatment.packet_source,
      expected: "automatic_runtime",
      message: "treatment must use automatically generated Aionis memory",
    }),
    requirement({
      id: `${task.id}:negative_low_trust_memory`,
      scope: "task",
      ok: negative.memory_mode === "irrelevant_or_low_trust" && negative.authority_level !== "authoritative",
      actual: negative.authority_level,
      expected: "not_authoritative",
      message: "negative control must not become authoritative",
    }),
    requirement({
      id: `${task.id}:positive_oracle_handoff`,
      scope: "task",
      ok: positive.memory_mode === "oracle_handoff" && positive.packet_source === "oracle_handoff",
      actual: positive.packet_source,
      expected: "oracle_handoff",
      message: "positive control must use oracle handoff",
    }),
  ];
}

function isActionEvent(event: RealAbTraceEvent): boolean {
  return event.kind === "action" || event.kind === "tool_call";
}

function eventText(event: RealAbTraceEvent): string {
  return [
    event.text,
    event.command,
    ...(event.touched_files ?? []),
  ].filter((entry): entry is string => typeof entry === "string").join("\n");
}

function eventTouchesExpectedTarget(event: RealAbTraceEvent, task: RealAbTaskSpec): boolean {
  const targets = task.expected_outcome.target_files ?? [];
  if (targets.length === 0) return false;
  const text = eventText(event);
  return targets.some((target) => text.includes(target));
}

function eventMatchesAcceptanceCheck(event: RealAbTraceEvent, task: RealAbTaskSpec): boolean {
  const checks = task.expected_outcome.acceptance_checks ?? [];
  if (checks.length === 0) return false;
  const text = eventText(event);
  return checks.some((check) => text.includes(check));
}

function isLockedAionisTreatment(arm: RealAbArm, observation: RealAbArmObservation): boolean {
  return arm === "aionis_assisted"
    && observation.memory_mode === "aionis_auto"
    && observation.authority_level === "authoritative"
    && observation.packet_source === "automatic_runtime";
}

function lowerEventText(event: RealAbTraceEvent): string {
  return eventText(event).toLowerCase();
}

function isBroadDiscoveryBeforeTarget(event: RealAbTraceEvent): boolean {
  const text = lowerEventText(event);
  return /\brg\s+--files\b/.test(text)
    || /\bfind\s+(\.|\.\.|\/)/.test(text)
    || /\bls\s+(-[a-z]*r[a-z]*|--recursive)\b/.test(text)
    || /\btree\b/.test(text)
    || /\bgrep\s+-r\b/.test(text)
    || /\bfd\s+(\.|\*|\/)/.test(text);
}

function isSkillOrPreferenceReadBeforeTarget(event: RealAbTraceEvent): boolean {
  const text = lowerEventText(event);
  return text.includes("/.agents/skills/")
    || text.includes("/.codex/skills/")
    || text.includes("skill.md")
    || text.includes("~/code/memory.md")
    || text.includes("$home/code/memory.md")
    || text.includes("/code/memory.md");
}

function isEditEvent(event: RealAbTraceEvent): boolean {
  if (!isActionEvent(event)) return false;
  const text = lowerEventText(event);
  return text.includes("apply_patch")
    || /\bpatch\b/.test(text)
    || /\bedit(ed|ing)?\b/.test(text)
    || /\bwrite\b/.test(text)
    || /\bcreated?\b/.test(text)
    || /\bmodified?\b/.test(text)
    || /\bupdated?\b/.test(text)
    || /\bcat\s*>/.test(text);
}

function acceptanceEvidenceFiles(task: RealAbTaskSpec): Set<string> {
  const evidencePattern = /(^|\/)(tests?|__tests__)\/|(\.test\.|\.spec\.)|(^|\/)(package\.json|pyproject\.toml|requirements\.txt|readme[^/]*)$/i;
  return new Set((task.expected_outcome.target_files ?? []).filter((file) => evidencePattern.test(file)));
}

function isAcceptanceEvidenceEdit(event: RealAbTraceEvent, task: RealAbTaskSpec): boolean {
  if (!isEditEvent(event)) return false;
  const evidenceFiles = acceptanceEvidenceFiles(task);
  if (evidenceFiles.size === 0) return false;
  return (event.touched_files ?? []).some((file) => evidenceFiles.has(file));
}

function isNonTargetExpansion(event: RealAbTraceEvent, task: RealAbTaskSpec): boolean {
  if (!isActionEvent(event)) return false;
  const targets = new Set(task.expected_outcome.target_files ?? []);
  if (targets.size === 0) return false;
  return (event.touched_files ?? []).some((file) => !targets.has(file));
}

function isAcceptancePassEvent(event: RealAbTraceEvent, task: RealAbTaskSpec): boolean {
  if (!eventMatchesAcceptanceCheck(event, task)) return false;
  if (event.success === true) return true;
  const text = lowerEventText(event);
  return /\b(pass|passed|success|succeeded)\b/.test(text);
}

function disciplineViolation(
  kind: RealAbDisciplineViolationKind,
  event: RealAbTraceEvent,
  eventIndex: number,
  detail: string,
): RealAbDisciplineViolation {
  return {
    kind,
    severity: "severe",
    event_index: eventIndex,
    command: event.command,
    text: event.text,
    detail,
  };
}

function deriveDisciplineCompliance(
  task: RealAbTaskSpec,
  arm: RealAbArm,
  observation: RealAbArmObservation,
  trace: RealAbRunTrace,
): RealAbDisciplineCompliance {
  const lockedContractExpected = isLockedAionisTreatment(arm, observation);
  const firstTargetEventIndex = trace.events.findIndex((event) =>
    isActionEvent(event) && eventTouchesExpectedTarget(event, task)
  );
  const firstEditEventIndex = trace.events.findIndex(isEditEvent);
  const maxPreEditConfirmationSteps = lockedContractExpected ? 2 : null;
  const preEditConfirmationSteps = firstEditEventIndex >= 0
    ? trace.events.slice(0, firstEditEventIndex).filter(isActionEvent).length
    : 0;
  let firstAcceptancePassEventIndex: number | null = null;
  const violations: RealAbDisciplineViolation[] = [];

  if (!lockedContractExpected) {
    return {
      status: "not_applicable",
      checked: false,
      locked_contract_expected: false,
      violation_count: 0,
      severe_violation_count: 0,
      violations,
      first_target_event_index: firstTargetEventIndex >= 0 ? firstTargetEventIndex : null,
      first_edit_event_index: firstEditEventIndex >= 0 ? firstEditEventIndex : null,
      first_acceptance_pass_event_index: null,
      pre_edit_confirmation_steps: preEditConfirmationSteps,
      max_pre_edit_confirmation_steps: null,
    };
  }

  if (
    maxPreEditConfirmationSteps !== null
    && firstEditEventIndex >= 0
    && preEditConfirmationSteps > maxPreEditConfirmationSteps
  ) {
    violations.push(disciplineViolation(
      "max_pre_edit_confirmation_steps_exceeded",
      trace.events[firstEditEventIndex],
      firstEditEventIndex,
      `contract-locked execution allows at most ${maxPreEditConfirmationSteps} pre-edit confirmation steps`,
    ));
  }

  if ((task.expected_outcome.target_files ?? []).length > 0 && firstTargetEventIndex < 0) {
    const firstActionEventIndex = trace.events.findIndex(isActionEvent);
    const evidenceEvent = trace.events[firstActionEventIndex >= 0 ? firstActionEventIndex : 0] ?? {
      kind: "action",
      text: "no action events",
    };
    violations.push(disciplineViolation(
      "declared_target_never_touched",
      evidenceEvent,
      firstActionEventIndex >= 0 ? firstActionEventIndex : 0,
      "contract-locked execution must touch at least one declared target file",
    ));
  }

  trace.events.forEach((event, index) => {
    const beforeFirstTarget = firstTargetEventIndex < 0 || index < firstTargetEventIndex;

    if (isActionEvent(event) && beforeFirstTarget && isBroadDiscoveryBeforeTarget(event)) {
      violations.push(disciplineViolation(
        "broad_discovery_before_targets",
        event,
        index,
        "contract-locked execution must inspect declared target files before broad repository discovery",
      ));
    }

    if (isActionEvent(event) && beforeFirstTarget && isSkillOrPreferenceReadBeforeTarget(event)) {
      violations.push(disciplineViolation(
        "skill_or_preference_read_before_targets",
        event,
        index,
        "contract-locked execution must not read general skills or preference memory before declared targets",
      ));
    }

    if (!beforeFirstTarget && isNonTargetExpansion(event, task)) {
      violations.push(disciplineViolation(
        "non_target_expansion",
        event,
        index,
        "contract-locked execution expanded beyond declared target files without captured failing evidence",
      ));
    }

    if (isAcceptanceEvidenceEdit(event, task)) {
      violations.push(disciplineViolation(
        "acceptance_evidence_edit",
        event,
        index,
        "contract-locked execution must not edit acceptance evidence files",
      ));
    }

    if (isAcceptancePassEvent(event, task)) {
      if (firstAcceptancePassEventIndex === null) {
        firstAcceptancePassEventIndex = index;
      } else {
        violations.push(disciplineViolation(
          "repeat_validation_after_pass",
          event,
          index,
          "contract-locked execution should stop after the required validation passes",
        ));
      }
    }
  });

  const severeViolationCount = violations.filter((violation) => violation.severity === "severe").length;
  return {
    status: severeViolationCount === 0 ? "pass" : "fail",
    checked: true,
    locked_contract_expected: true,
    violation_count: violations.length,
    severe_violation_count: severeViolationCount,
    violations,
    first_target_event_index: firstTargetEventIndex >= 0 ? firstTargetEventIndex : null,
    first_edit_event_index: firstEditEventIndex >= 0 ? firstEditEventIndex : null,
    first_acceptance_pass_event_index: firstAcceptancePassEventIndex,
    pre_edit_confirmation_steps: preEditConfirmationSteps,
    max_pre_edit_confirmation_steps: maxPreEditConfirmationSteps,
  };
}

function isEventCorrect(event: RealAbTraceEvent, task: RealAbTaskSpec): boolean {
  if (typeof event.correct === "boolean") return event.correct;
  return eventTouchesExpectedTarget(event, task) || eventMatchesAcceptanceCheck(event, task);
}

function isEventWasted(event: RealAbTraceEvent, task: RealAbTaskSpec): boolean {
  if (typeof event.wasted === "boolean") return event.wasted;
  return isActionEvent(event) && event.correct === false;
}

function deriveVerifierPassed(trace: RealAbRunTrace): boolean {
  if (typeof trace.outcome?.verifier_passed === "boolean") return trace.outcome.verifier_passed;
  const verifierEvents = trace.events.filter((event) =>
    event.kind === "verification" || event.kind === "external_probe" || event.verifier === true
  );
  if (verifierEvents.length === 0) return false;
  return verifierEvents[verifierEvents.length - 1].success === true;
}

function deriveAfterExitCorrect(trace: RealAbRunTrace, task: RealAbTaskSpec): boolean | null {
  if (typeof trace.outcome?.after_exit_correct === "boolean") return trace.outcome.after_exit_correct;
  if (!task.verifier.after_exit_required) return null;
  return trace.events.some((event) =>
    event.after_exit === true
    && (event.kind === "verification" || event.kind === "external_probe" || event.verifier === true)
    && eventMatchesVerifierCommand(event, task.verifier)
    && event.success === true
  );
}

function deriveFalseConfidence(trace: RealAbRunTrace): boolean {
  if (typeof trace.outcome?.false_confidence === "boolean") return trace.outcome.false_confidence;
  if (trace.events.some((event) => event.false_confidence === true)) return true;
  return trace.events.some((event, index) =>
    event.kind === "agent_claim"
    && event.claimed_success === true
    && trace.events.slice(index + 1).some((later) =>
      (later.kind === "verification" || later.kind === "external_probe" || later.verifier === true)
      && later.success === false
    )
  );
}

function deriveWrongFileTouches(trace: RealAbRunTrace, task: RealAbTaskSpec): number {
  const targets = new Set(task.expected_outcome.target_files ?? []);
  if (targets.size === 0) return 0;
  return trace.events.reduce((count, event) => {
    if (!isActionEvent(event)) return count;
    return count + (event.touched_files ?? []).filter((file) => !targets.has(file)).length;
  }, 0);
}

function deriveTimeToSuccessMs(trace: RealAbRunTrace): number | null {
  if (typeof trace.outcome?.time_to_success_ms === "number") return trace.outcome.time_to_success_ms;
  if (typeof trace.started_at_ms === "number" && typeof trace.ended_at_ms === "number") {
    return Math.max(0, trace.ended_at_ms - trace.started_at_ms);
  }
  return null;
}

export function deriveMetricsFromTrace(task: RealAbTaskSpec, trace: RealAbRunTrace): RealAbArmMetrics {
  const actionEvents = trace.events.filter(isActionEvent);
  const firstAction = actionEvents[0] ?? null;
  const verifierPassed = deriveVerifierPassed(trace);
  return {
    completion: typeof trace.outcome?.completion === "boolean" ? trace.outcome.completion : verifierPassed,
    verifier_passed: verifierPassed,
    first_correct_action: typeof trace.outcome?.first_correct_action === "boolean"
      ? trace.outcome.first_correct_action
      : firstAction
        ? isEventCorrect(firstAction, task)
        : false,
    wasted_steps: typeof trace.outcome?.wasted_steps === "number"
      ? trace.outcome.wasted_steps
      : trace.events.filter((event) => isEventWasted(event, task)).length,
    retry_count: typeof trace.outcome?.retry_count === "number"
      ? trace.outcome.retry_count
      : trace.events.filter((event) => event.kind === "retry" || event.retry === true).length,
    false_confidence: deriveFalseConfidence(trace),
    after_exit_correct: deriveAfterExitCorrect(trace, task),
    wrong_file_touches: typeof trace.outcome?.wrong_file_touches === "number"
      ? trace.outcome.wrong_file_touches
      : deriveWrongFileTouches(trace, task),
    human_intervention_count: typeof trace.outcome?.human_intervention_count === "number"
      ? trace.outcome.human_intervention_count
      : trace.events.filter((event) => event.kind === "human_intervention" || event.human_intervention === true).length,
    time_to_success_ms: deriveTimeToSuccessMs(trace),
    tokens_to_success: typeof trace.outcome?.tokens_to_success === "number"
      ? trace.outcome.tokens_to_success
      : trace.events.some((event) => typeof event.tokens === "number")
        ? trace.events.reduce((total, event) => total + (event.tokens ?? 0), 0)
        : null,
  };
}

function resolveArmObservation(task: RealAbTaskSpec, arm: RealAbArm): RealAbResolvedArmObservation {
  const observation = task.arms[arm];
  if (observation.metrics) {
    return {
      ...observation,
      metrics: observation.metrics,
      metrics_source: "provided",
    };
  }
  if (observation.trace) {
    const actionEventCount = observation.trace.events.filter(isActionEvent).length;
    const verifierEventCount = observation.trace.events.filter((event) =>
      event.kind === "verification" || event.kind === "external_probe" || event.verifier === true
    ).length;
    return {
      ...observation,
      metrics: deriveMetricsFromTrace(task, observation.trace),
      metrics_source: "trace_derived",
      trace_summary: {
        run_id: observation.trace.run_id,
        event_count: observation.trace.events.length,
        action_event_count: actionEventCount,
        verifier_event_count: verifierEventCount,
        discipline_compliance: deriveDisciplineCompliance(task, arm, observation, observation.trace),
      },
    };
  }
  return {
    ...observation,
    metrics: {
      completion: false,
      verifier_passed: false,
      first_correct_action: false,
      wasted_steps: 0,
      retry_count: 0,
      false_confidence: false,
      after_exit_correct: task.verifier.after_exit_required ? false : null,
      wrong_file_touches: 0,
      human_intervention_count: 0,
      time_to_success_ms: null,
      tokens_to_success: null,
    },
    metrics_source: "provided",
  };
}

function resolveTaskArms(task: RealAbTaskSpec): Record<RealAbArm, RealAbResolvedArmObservation> {
  return {
    baseline: resolveArmObservation(task, "baseline"),
    aionis_assisted: resolveArmObservation(task, "aionis_assisted"),
    negative_control: resolveArmObservation(task, "negative_control"),
    positive_control: resolveArmObservation(task, "positive_control"),
  };
}

function validateArmMeasurements(task: RealAbTaskSpec): RealAbGateRequirement[] {
  return realAbRequiredArms.map((arm) => {
    const observation = task.arms?.[arm];
    const hasMeasurement = Boolean(observation?.metrics || observation?.trace);
    return requirement({
      id: `${task.id}:measurement:${arm}`,
      scope: "task",
      ok: hasMeasurement,
      actual: hasMeasurement,
      expected: true,
      message: `${arm} must include either metrics or a trace`,
    });
  });
}

function verifierEvents(trace: RealAbRunTrace): RealAbTraceEvent[] {
  return trace.events.filter((event) =>
    event.kind === "verification" || event.kind === "external_probe" || event.verifier === true
  );
}

function eventMatchesVerifierCommand(event: RealAbTraceEvent, verifier: RealAbVerifierSpec): boolean {
  return !verifier.command || event.command === verifier.command;
}

function validateLiveTraceEvidence(task: RealAbTaskSpec, suiteKind: RealAbSuiteKind): RealAbGateRequirement[] {
  if (suiteKind === "harness_calibration") {
    return [];
  }

  return realAbRequiredArms.flatMap((arm) => {
    const observation = task.arms?.[arm];
    const trace = observation?.trace;
    const hasTrace = trace?.trace_version === "aionis_agent_run_trace_v1";
    const taskVerifierEvents = trace ? verifierEvents(trace) : [];
    const hasVerifier = taskVerifierEvents.length > 0;
    const hasExternalProbe = trace?.events.some((event) =>
      eventMatchesVerifierCommand(event, task.verifier)
      && (event.kind === "external_probe" || event.verifier === true)
    ) ?? false;
    const hasAfterExitVerifier = taskVerifierEvents.some((event) => event.after_exit === true);
    const hasFreshShellVerifier = taskVerifierEvents.some((event) => event.fresh_shell === true);

    const requirements: RealAbGateRequirement[] = [
      requirement({
        id: `${task.id}:trace_evidence:${arm}:live_trace`,
        scope: "task",
        ok: hasTrace,
        actual: trace?.trace_version ?? (observation?.metrics ? "metrics_only" : null),
        expected: "aionis_agent_run_trace_v1",
        message: "pilot/product evidence must use auditable run traces instead of direct metrics",
      }),
      requirement({
        id: `${task.id}:trace_evidence:${arm}:run_id`,
        scope: "task",
        ok: typeof trace?.run_id === "string" && trace.run_id.length > 0,
        actual: trace?.run_id ?? null,
        expected: "non_empty_run_id",
        message: "live trace evidence must include a stable run id",
      }),
      requirement({
        id: `${task.id}:trace_evidence:${arm}:events`,
        scope: "task",
        ok: Array.isArray(trace?.events) && trace.events.length > 0,
        actual: trace?.events.length ?? 0,
        expected: "events_present",
        message: "live trace evidence must include execution events",
      }),
      requirement({
        id: `${task.id}:trace_evidence:${arm}:verifier`,
        scope: "task",
        ok: hasVerifier,
        actual: hasVerifier,
        expected: true,
        message: "live trace evidence must include verifier or external probe events",
      }),
    ];

    if (task.verifier.kind === "external_probe" || task.verifier.external_visibility_required) {
      requirements.push(requirement({
        id: `${task.id}:trace_evidence:${arm}:external_probe`,
        scope: "task",
        ok: hasExternalProbe,
        actual: hasExternalProbe,
        expected: true,
        message: "external-visibility tasks require an external probe event",
      }));
    }

    if (task.verifier.after_exit_required) {
      requirements.push(
        requirement({
          id: `${task.id}:trace_evidence:${arm}:after_exit_probe`,
          scope: "task",
          ok: hasAfterExitVerifier,
          actual: hasAfterExitVerifier,
          expected: true,
          message: "after-exit tasks require an after-exit verifier event",
        }),
        requirement({
          id: `${task.id}:trace_evidence:${arm}:fresh_shell_probe`,
          scope: "task",
          ok: hasFreshShellVerifier,
          actual: hasFreshShellVerifier,
          expected: true,
          message: "after-exit tasks require revalidation from a fresh shell",
        }),
      );
    }

    return requirements;
  });
}

function validateActionDiscipline(
  task: RealAbTaskSpec,
  arms: Record<RealAbArm, RealAbResolvedArmObservation>,
  suiteKind: RealAbSuiteKind,
): RealAbGateRequirement[] {
  if (suiteKind === "harness_calibration") {
    return [];
  }

  const treatment = arms.aionis_assisted;
  const compliance = treatment.trace_summary?.discipline_compliance;
  const lockedContractExpected = treatment.memory_mode === "aionis_auto"
    && treatment.authority_level === "authoritative"
    && treatment.packet_source === "automatic_runtime";

  return [
    requirement({
      id: `${task.id}:discipline:aionis_assisted:locked_contract`,
      scope: "task",
      ok: !lockedContractExpected || compliance?.status === "pass",
      actual: compliance
        ? `${compliance.status}:${compliance.severe_violation_count}`
        : "not_checked",
      expected: "pass",
      message: "authoritative Aionis treatment must follow contract-locked action discipline",
    }),
  ];
}

function buildTaskResult(task: RealAbTaskSpec, suiteKind: RealAbSuiteKind): RealAbTaskResult {
  const arms = resolveTaskArms(task);
  const baseline = arms.baseline.metrics;
  const treatment = arms.aionis_assisted.metrics;
  const positive = arms.positive_control.metrics;

  const afterExitDelta = nullableBoolToNumber(treatment.after_exit_correct) !== null
    && nullableBoolToNumber(baseline.after_exit_correct) !== null
    ? boolToNumber(treatment.after_exit_correct === true) - boolToNumber(baseline.after_exit_correct === true)
    : null;

  const timeDelta = typeof treatment.time_to_success_ms === "number" && typeof baseline.time_to_success_ms === "number"
    ? treatment.time_to_success_ms - baseline.time_to_success_ms
    : null;
  const tokenDelta = typeof treatment.tokens_to_success === "number" && typeof baseline.tokens_to_success === "number"
    ? treatment.tokens_to_success - baseline.tokens_to_success
    : null;

  const gateRequirements: RealAbGateRequirement[] = [
    ...validateRequiredArms(task),
    ...validateArmMeasurements(task),
    ...validateFairness(task),
    ...validateArmSemantics(task),
    ...validateLiveTraceEvidence(task, suiteKind),
    ...validateActionDiscipline(task, arms, suiteKind),
    requirement({
      id: `${task.id}:completion_not_worse`,
      scope: "task",
      ok: boolToNumber(treatment.completion) >= boolToNumber(baseline.completion),
      actual: boolToNumber(treatment.completion) - boolToNumber(baseline.completion),
      expected: 0,
      message: "treatment completion must not be worse than baseline",
    }),
    requirement({
      id: `${task.id}:false_confidence_not_worse`,
      scope: "task",
      ok: boolToNumber(treatment.false_confidence) <= boolToNumber(baseline.false_confidence),
      actual: boolToNumber(treatment.false_confidence) - boolToNumber(baseline.false_confidence),
      expected: 0,
      message: "treatment false confidence must not be higher than baseline",
    }),
    requirement({
      id: `${task.id}:positive_control_sensitive`,
      scope: "task",
      ok: boolToNumber(positive.first_correct_action) >= boolToNumber(baseline.first_correct_action)
        && boolToNumber(positive.completion) >= boolToNumber(baseline.completion),
      actual: boolToNumber(positive.first_correct_action) - boolToNumber(baseline.first_correct_action),
      expected: 0,
      message: "positive control must show the task can benefit from good context",
    }),
  ];

  if (task.verifier.after_exit_required) {
    gateRequirements.push(requirement({
      id: `${task.id}:after_exit_not_worse`,
      scope: "task",
      ok: treatment.after_exit_correct === true,
      actual: treatment.after_exit_correct,
      expected: true,
      message: "after-exit tasks require treatment after-exit correctness",
    }));
  }

  return {
    id: task.id,
    title: task.title,
    task_family: task.task_family,
    status: gateRequirements.every((entry) => entry.status === "pass") ? "pass" : "fail",
    fairness_status: [...validateRequiredArms(task), ...validateFairness(task)].every((entry) => entry.status === "pass")
      ? "pass"
      : "fail",
    verifier: task.verifier,
    deltas: {
      completion_delta: boolToNumber(treatment.completion) - boolToNumber(baseline.completion),
      first_correct_action_delta: boolToNumber(treatment.first_correct_action) - boolToNumber(baseline.first_correct_action),
      wasted_step_delta: treatment.wasted_steps - baseline.wasted_steps,
      retry_delta: treatment.retry_count - baseline.retry_count,
      false_confidence_delta: boolToNumber(treatment.false_confidence) - boolToNumber(baseline.false_confidence),
      after_exit_correct_delta: afterExitDelta,
      wrong_file_touch_delta: treatment.wrong_file_touches - baseline.wrong_file_touches,
      human_intervention_delta: treatment.human_intervention_count - baseline.human_intervention_count,
      time_to_success_delta_ms: timeDelta,
      tokens_to_success_delta: tokenDelta,
    },
    gate_requirements: gateRequirements,
    arms,
  };
}

function proofBoundaryFor(suiteKind: RealAbSuiteKind): RealAbReport["proof_boundary"] {
  switch (suiteKind) {
    case "product_real_trace":
      return {
        boundary_version: "aionis_real_ab_proof_boundary_v1",
        claim_level: "product_evidence",
        statement: "This suite can support product-value claims if traces are real, paired, and reproducible.",
        live_trace_required_for_product_claim: false,
      };
    case "pilot_real_trace":
      return {
        boundary_version: "aionis_real_ab_proof_boundary_v1",
        claim_level: "pilot_evidence",
        statement: "This suite can support directional pilot claims but not broad product claims.",
        live_trace_required_for_product_claim: true,
      };
    case "harness_calibration":
    default:
      return {
        boundary_version: "aionis_real_ab_proof_boundary_v1",
        claim_level: "harness_only",
        statement: "This suite validates the A/B harness mechanics only; it does not prove Aionis product value.",
        live_trace_required_for_product_claim: true,
      };
  }
}

export function runRealAbValidationSuite(input: RealAbSuiteInput): RealAbReport {
  const thresholds = { ...defaultThresholds, ...(input.thresholds ?? {}) };
  const tasks = input.tasks.map((task) => buildTaskResult(task, input.suite_kind));
  const baselineMetrics = tasks.map((task) => task.arms.baseline.metrics);
  const treatmentMetrics = tasks.map((task) => task.arms.aionis_assisted.metrics);
  const negativeArms = tasks.map((task) => task.arms.negative_control);
  const baselineWasted = sum(baselineMetrics.map((metrics) => metrics.wasted_steps));
  const treatmentWasted = sum(treatmentMetrics.map((metrics) => metrics.wasted_steps));
  const wastedStepReductionPct = pctReduction(baselineWasted, treatmentWasted);
  const taskFamilies = input.tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.task_family] = (acc[task.task_family] ?? 0) + 1;
    return acc;
  }, {});
  const positiveControlSanityRate = rate(tasks.map((task) =>
    boolToNumber(task.arms.positive_control.metrics.first_correct_action) >= boolToNumber(task.arms.baseline.metrics.first_correct_action)
    && boolToNumber(task.arms.positive_control.metrics.completion) >= boolToNumber(task.arms.baseline.metrics.completion)
  ));

  const summary: RealAbReport["summary"] = {
    total_tasks: input.tasks.length,
    task_families: taskFamilies,
    baseline_completion_rate: rate(baselineMetrics.map((metrics) => metrics.completion)),
    treatment_completion_rate: rate(treatmentMetrics.map((metrics) => metrics.completion)),
    baseline_first_correct_action_rate: rate(baselineMetrics.map((metrics) => metrics.first_correct_action)),
    treatment_first_correct_action_rate: rate(treatmentMetrics.map((metrics) => metrics.first_correct_action)),
    wasted_step_reduction_pct: Number.isFinite(wastedStepReductionPct ?? 0) ? wastedStepReductionPct : null,
    baseline_false_confidence_rate: rate(baselineMetrics.map((metrics) => metrics.false_confidence)),
    treatment_false_confidence_rate: rate(treatmentMetrics.map((metrics) => metrics.false_confidence)),
    baseline_after_exit_correctness_rate: nullableRate(baselineMetrics.map((metrics) => metrics.after_exit_correct)),
    treatment_after_exit_correctness_rate: nullableRate(treatmentMetrics.map((metrics) => metrics.after_exit_correct)),
    negative_control_authoritative_count: negativeArms.filter((arm) => arm.authority_level === "authoritative").length,
    positive_control_sanity_rate: positiveControlSanityRate,
  };

  const suiteRequirements: RealAbGateRequirement[] = [
    requirement({
      id: "suite:completion_not_worse",
      scope: "suite",
      ok: summary.treatment_completion_rate >= summary.baseline_completion_rate,
      actual: summary.treatment_completion_rate,
      expected: summary.baseline_completion_rate,
      message: "treatment completion rate must not be lower than baseline",
    }),
    requirement({
      id: "suite:false_confidence_not_worse",
      scope: "suite",
      ok: summary.treatment_false_confidence_rate <= summary.baseline_false_confidence_rate,
      actual: summary.treatment_false_confidence_rate,
      expected: summary.baseline_false_confidence_rate,
      message: "treatment false-confidence rate must not exceed baseline",
    }),
    requirement({
      id: "suite:wasted_steps_reduced",
      scope: "suite",
      ok: baselineWasted === 0 ? treatmentWasted <= baselineWasted : (wastedStepReductionPct ?? -Infinity) >= thresholds.min_wasted_step_reduction_pct,
      actual: wastedStepReductionPct,
      expected: thresholds.min_wasted_step_reduction_pct,
      message: "treatment should reduce wasted steps enough to justify Aionis complexity",
    }),
    requirement({
      id: "suite:negative_control_safe",
      scope: "suite",
      ok: summary.negative_control_authoritative_count === 0,
      actual: summary.negative_control_authoritative_count,
      expected: 0,
      message: "negative control memory must never become authoritative",
    }),
    requirement({
      id: "suite:positive_control_sensitive",
      scope: "suite",
      ok: summary.positive_control_sanity_rate === 1,
      actual: summary.positive_control_sanity_rate,
      expected: 1,
      message: "positive control must show all tasks are context-sensitive",
    }),
  ];

  if (summary.baseline_after_exit_correctness_rate !== null && summary.treatment_after_exit_correctness_rate !== null) {
    suiteRequirements.push(requirement({
      id: "suite:after_exit_not_worse",
      scope: "suite",
      ok: summary.treatment_after_exit_correctness_rate >= summary.baseline_after_exit_correctness_rate,
      actual: summary.treatment_after_exit_correctness_rate,
      expected: summary.baseline_after_exit_correctness_rate,
      message: "treatment after-exit correctness must not be worse than baseline",
    }));
  }

  const requirements = [
    ...tasks.flatMap((task) => task.gate_requirements),
    ...suiteRequirements,
  ];
  const failedRequirements = requirements.filter((entry) => entry.status === "fail");

  return {
    report_version: "aionis_real_ab_validation_report_v1",
    generated_at: input.generated_at ?? new Date().toISOString(),
    suite_id: input.suite_id,
    suite_kind: input.suite_kind,
    proof_boundary: proofBoundaryFor(input.suite_kind),
    thresholds,
    gate: {
      gate_version: "aionis_real_ab_gate_v1",
      status: failedRequirements.length === 0 ? "pass" : "fail",
      failed_requirements: failedRequirements,
      requirements,
    },
    summary,
    tasks,
  };
}

function pct(value: number | null): string {
  if (value === null) return "n/a";
  return `${(value * 100).toFixed(1)}%`;
}

function signed(value: number | null): string {
  if (value === null) return "n/a";
  return value > 0 ? `+${value}` : `${value}`;
}

function signedFormatted(value: number | null, formatter: (entry: number) => string): string {
  if (value === null) return "n/a";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatter(value)}`;
}

function count(value: number | undefined): string {
  return typeof value === "number" ? String(value) : "n/a";
}

function durationMs(value: number | null | undefined): string {
  if (typeof value !== "number") return "n/a";
  return `${Math.round(value / 1000)}s`;
}

function tokenCount(value: number | null | undefined): string {
  if (typeof value !== "number") return "n/a";
  return value.toLocaleString("en-US");
}

function incorrectEventCount(arm: RealAbResolvedArmObservation): number | null {
  if (!arm.trace) return null;
  return arm.trace.events.filter((event) => event.correct === false).length;
}

function disciplineStatus(arm: RealAbResolvedArmObservation): string {
  const compliance = arm.trace_summary?.discipline_compliance;
  if (!compliance || compliance.status === "not_applicable") return "n/a";
  return compliance.status === "pass"
    ? `pass (${compliance.violation_count})`
    : `fail (${compliance.severe_violation_count}/${compliance.violation_count})`;
}

function indexValue(value: number | null | undefined): string {
  return typeof value === "number" ? String(value) : "n/a";
}

function disciplineRow(task: RealAbTaskResult): string {
  const compliance = task.arms.aionis_assisted.trace_summary?.discipline_compliance;
  const cells = [
    task.id,
    task.task_family,
    disciplineStatus(task.arms.aionis_assisted),
    count(compliance?.severe_violation_count),
    indexValue(compliance?.first_target_event_index),
    indexValue(compliance?.first_edit_event_index),
    compliance?.max_pre_edit_confirmation_steps === null || !compliance
      ? "n/a"
      : `${compliance.pre_edit_confirmation_steps}/${compliance.max_pre_edit_confirmation_steps}`,
    indexValue(compliance?.first_acceptance_pass_event_index),
  ];
  return `| ${cells.join(" | ")} |`;
}

function controlInterpretation(task: RealAbTaskResult): string {
  const negative = task.arms.negative_control;
  const baseline = task.arms.baseline;
  const treatment = task.arms.aionis_assisted;
  const treatmentDiscipline = treatment.trace_summary?.discipline_compliance;
  const negativeActions = negative.trace_summary?.action_event_count ?? null;
  const baselineActions = baseline.trace_summary?.action_event_count ?? null;
  const treatmentActions = treatment.trace_summary?.action_event_count ?? null;
  if (treatmentDiscipline?.status === "fail") {
    return `\`${task.id}\`: Aionis completed the run but violated locked action discipline; treat this evidence as untrusted until Runtime enforces the contract boundary.`;
  }
  if (negative.metrics.completion && negative.authority_level !== "authoritative") {
    const negativeCheaperThanBaseline = typeof negativeActions === "number" && typeof baselineActions === "number"
      ? negativeActions <= baselineActions
      : false;
    return negativeCheaperThanBaseline
      ? `\`${task.id}\`: negative control also passed without authority and used no more actions than baseline; treat this as an efficiency signal unless harder variants show correctness separation.`
      : `\`${task.id}\`: negative control also passed without authority; Aionis correctness is not unique on this task, so emphasize verifier-backed scope control and cost/waste deltas.`;
  }
  if (treatment.metrics.completion && !negative.metrics.completion) {
    return `\`${task.id}\`: Aionis passed while negative control failed; this supports a stronger context-quality or authority-boundary claim for this task.`;
  }
  if (typeof treatmentActions === "number" && typeof baselineActions === "number" && treatmentActions < baselineActions) {
    return `\`${task.id}\`: Aionis used fewer actions than baseline; value signal is execution compression with the same verifier boundary.`;
  }
  return `\`${task.id}\`: controls do not isolate a strong Aionis-only advantage; use this task as directional evidence only.`;
}

function costSignalRow(task: RealAbTaskResult): string {
  const baseline = task.arms.baseline;
  const treatment = task.arms.aionis_assisted;
  const negative = task.arms.negative_control;
  const positive = task.arms.positive_control;
  const cells = [
    task.id,
    task.task_family,
    count(baseline.trace_summary?.action_event_count),
    count(treatment.trace_summary?.action_event_count),
    count(negative.trace_summary?.action_event_count),
    count(positive.trace_summary?.action_event_count),
    count(baseline.metrics.wasted_steps),
    count(treatment.metrics.wasted_steps),
    count(incorrectEventCount(baseline) ?? undefined),
    count(incorrectEventCount(treatment) ?? undefined),
    durationMs(baseline.metrics.time_to_success_ms),
    durationMs(treatment.metrics.time_to_success_ms),
    tokenCount(baseline.metrics.tokens_to_success),
    tokenCount(treatment.metrics.tokens_to_success),
    signedFormatted(task.deltas.tokens_to_success_delta, tokenCount),
    signedFormatted(task.deltas.time_to_success_delta_ms, durationMs),
  ];
  return `| ${cells.join(" | ")} |`;
}

export function renderRealAbMarkdownReport(report: RealAbReport): string {
  const lines = [
    `# Aionis Real A/B Validation Report`,
    "",
    `- Suite: \`${report.suite_id}\``,
    `- Kind: \`${report.suite_kind}\``,
    `- Gate: **${report.gate.status}**`,
    `- Proof boundary: ${report.proof_boundary.statement}`,
    "",
    "## Summary",
    "",
    `| Metric | Baseline | Aionis assisted |`,
    `| --- | ---: | ---: |`,
    `| Completion rate | ${pct(report.summary.baseline_completion_rate)} | ${pct(report.summary.treatment_completion_rate)} |`,
    `| First correct action rate | ${pct(report.summary.baseline_first_correct_action_rate)} | ${pct(report.summary.treatment_first_correct_action_rate)} |`,
    `| False confidence rate | ${pct(report.summary.baseline_false_confidence_rate)} | ${pct(report.summary.treatment_false_confidence_rate)} |`,
    `| After-exit correctness | ${pct(report.summary.baseline_after_exit_correctness_rate)} | ${pct(report.summary.treatment_after_exit_correctness_rate)} |`,
    "",
    `Wasted-step reduction: ${report.summary.wasted_step_reduction_pct === null ? "n/a" : `${report.summary.wasted_step_reduction_pct.toFixed(1)}%`}`,
    `Negative-control authoritative count: ${report.summary.negative_control_authoritative_count}`,
    `Positive-control sanity rate: ${pct(report.summary.positive_control_sanity_rate)}`,
    "",
    "## Task Results",
    "",
    `| Task | Family | Status | First action delta | Wasted step delta | False-confidence delta |`,
    `| --- | --- | --- | ---: | ---: | ---: |`,
    ...report.tasks.map((task) =>
      `| ${task.id} | ${task.task_family} | ${task.status} | ${signed(task.deltas.first_correct_action_delta)} | ${signed(task.deltas.wasted_step_delta)} | ${signed(task.deltas.false_confidence_delta)} |`
    ),
    "",
    "## Cost And Control Signals",
    "",
    `| Task | Family | Baseline actions | Aionis actions | Negative actions | Positive actions | Baseline wasted | Aionis wasted | Baseline incorrect | Aionis incorrect | Baseline duration | Aionis duration | Baseline tokens | Aionis tokens | Token delta | Time delta |`,
    `| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |`,
    ...report.tasks.map(costSignalRow),
    "",
    "## Discipline Compliance",
    "",
    `| Task | Family | Aionis discipline | Severe violations | First target event | First edit event | Pre-edit steps | First acceptance pass |`,
    `| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |`,
    ...report.tasks.map(disciplineRow),
    "",
    "## Control Interpretation",
    "",
    ...report.tasks.map((task) => `- ${controlInterpretation(task)}`),
    "",
  ];

  if (report.gate.failed_requirements.length > 0) {
    lines.push("## Failed Requirements", "");
    for (const failed of report.gate.failed_requirements) {
      lines.push(`- \`${failed.id}\`: ${failed.message} (actual: ${String(failed.actual)}, expected: ${String(failed.expected)})`);
    }
    lines.push("");
  }

  lines.push(
    "## Interpretation",
    "",
    report.proof_boundary.live_trace_required_for_product_claim
      ? "This report must not be used as product proof until it is backed by live paired agent traces."
      : "This report can support product evidence claims only within the declared task families and trace boundary.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

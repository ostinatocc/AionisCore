import {
  realAbRequiredArms,
  type RealAbArm,
  type RealAbAuthorityLevel,
  type RealAbFairnessContract,
  type RealAbGateRequirement,
  type RealAbMemoryMode,
  type RealAbSuiteInput,
  type RealAbSuiteKind,
  type RealAbTraceEvent,
} from "./aionis-real-ab-validation.ts";
import type { RuntimeDogfoodExternalProbeRun } from "./lite-runtime-dogfood-external-probe.ts";
import type {
  RealAbDogfoodArmRunInput,
  RealAbDogfoodPairedCaptureInput,
} from "./aionis-real-ab-dogfood-capture.ts";

export type RealAbLiveEvidenceArmManifest = {
  source_run_id: string;
  memory_mode: RealAbMemoryMode;
  authority_level: RealAbAuthorityLevel;
  packet_source: "none" | "automatic_runtime" | "irrelevant_low_trust" | "oracle_handoff";
  dogfood_run_path: string;
  agent_events_path: string;
  notes?: string[];
};

export type RealAbLiveEvidenceManifest = {
  manifest_version: "aionis_real_ab_live_evidence_manifest_v1";
  suite_id: string;
  suite_kind: Exclude<RealAbSuiteKind, "harness_calibration">;
  generated_at?: string;
  thresholds?: RealAbSuiteInput["thresholds"];
  fairness: RealAbFairnessContract;
  task_ids?: string[];
  arms: Record<RealAbArm, RealAbLiveEvidenceArmManifest>;
};

export type RealAbLiveEvidenceAgentEventsFile = {
  events_by_probe_id: Record<string, RealAbTraceEvent[]>;
};

export type RealAbLiveEvidenceLoadedArm = {
  dogfood_run: RuntimeDogfoodExternalProbeRun;
  agent_events: RealAbLiveEvidenceAgentEventsFile | Record<string, RealAbTraceEvent[]>;
};

export type RealAbLiveEvidenceLoadedInputs = Record<RealAbArm, RealAbLiveEvidenceLoadedArm>;

function assemblerRequirement(args: Omit<RealAbGateRequirement, "status"> & { ok: boolean }): RealAbGateRequirement {
  return {
    id: args.id,
    scope: args.scope,
    status: args.ok ? "pass" : "fail",
    actual: args.actual,
    expected: args.expected,
    message: args.message,
  };
}

function normalizeAgentEvents(
  value: RealAbLiveEvidenceAgentEventsFile | Record<string, RealAbTraceEvent[]>,
): Record<string, RealAbTraceEvent[]> {
  if ("events_by_probe_id" in value) {
    return value.events_by_probe_id;
  }
  return value;
}

function actionEventCount(events: RealAbTraceEvent[]): number {
  return events.filter((event) => event.kind === "action" || event.kind === "tool_call").length;
}

export function validateRealAbLiveEvidenceAssemblerInputs(args: {
  manifest: RealAbLiveEvidenceManifest;
  loaded: Partial<RealAbLiveEvidenceLoadedInputs>;
}): RealAbGateRequirement[] {
  const requirements: RealAbGateRequirement[] = [
    assemblerRequirement({
      id: "live_evidence:manifest_version",
      scope: "suite",
      ok: args.manifest.manifest_version === "aionis_real_ab_live_evidence_manifest_v1",
      actual: args.manifest.manifest_version,
      expected: "aionis_real_ab_live_evidence_manifest_v1",
      message: "live evidence manifest must use the supported contract",
    }),
    assemblerRequirement({
      id: "live_evidence:suite_kind",
      scope: "suite",
      ok: args.manifest.suite_kind === "pilot_real_trace" || args.manifest.suite_kind === "product_real_trace",
      actual: args.manifest.suite_kind,
      expected: "pilot_or_product_real_trace",
      message: "live evidence manifests can only assemble pilot/product real trace suites",
    }),
    ...Object.entries(args.manifest.fairness).map(([key, value]) =>
      assemblerRequirement({
        id: `live_evidence:fairness:${key}`,
        scope: "suite",
        ok: value === true,
        actual: value,
        expected: true,
        message: `live evidence requires ${key}`,
      })
    ),
  ];

  for (const arm of realAbRequiredArms) {
    const armManifest = args.manifest.arms?.[arm];
    const loaded = args.loaded[arm];
    const eventsByProbeId = loaded ? normalizeAgentEvents(loaded.agent_events) : {};
    requirements.push(
      assemblerRequirement({
        id: `live_evidence:arm:${arm}:manifest`,
        scope: "suite",
        ok: Boolean(armManifest),
        actual: Boolean(armManifest),
        expected: true,
        message: `${arm} must be declared in the manifest`,
      }),
      assemblerRequirement({
        id: `live_evidence:arm:${arm}:dogfood_run_path`,
        scope: "suite",
        ok: typeof armManifest?.dogfood_run_path === "string" && armManifest.dogfood_run_path.length > 0,
        actual: armManifest?.dogfood_run_path ?? null,
        expected: "non_empty_path",
        message: `${arm} must reference a dogfood external-probe run JSON file`,
      }),
      assemblerRequirement({
        id: `live_evidence:arm:${arm}:agent_events_path`,
        scope: "suite",
        ok: typeof armManifest?.agent_events_path === "string" && armManifest.agent_events_path.length > 0,
        actual: armManifest?.agent_events_path ?? null,
        expected: "non_empty_path",
        message: `${arm} must reference an agent events JSON file`,
      }),
      assemblerRequirement({
        id: `live_evidence:arm:${arm}:dogfood_run_loaded`,
        scope: "suite",
        ok: loaded?.dogfood_run?.run_version === "runtime_dogfood_external_probe_run_v1",
        actual: loaded?.dogfood_run?.run_version ?? null,
        expected: "runtime_dogfood_external_probe_run_v1",
        message: `${arm} dogfood run JSON must be loaded and versioned`,
      }),
    );

    for (const probe of loaded?.dogfood_run?.probes ?? []) {
      const events = eventsByProbeId[probe.id] ?? [];
      requirements.push(
        assemblerRequirement({
          id: `live_evidence:${probe.id}:${arm}:agent_events_present`,
          scope: "task",
          ok: events.length > 0,
          actual: events.length,
          expected: "events_present",
          message: `${arm} must include agent events for dogfood probe ${probe.id}`,
        }),
        assemblerRequirement({
          id: `live_evidence:${probe.id}:${arm}:agent_action_events`,
          scope: "task",
          ok: actionEventCount(events) > 0,
          actual: actionEventCount(events),
          expected: "at_least_one_action_or_tool_call",
          message: `${arm} must include action/tool events for dogfood probe ${probe.id}`,
        }),
      );
    }
  }

  return requirements;
}

function assembleArm(
  manifest: RealAbLiveEvidenceArmManifest,
  loaded: RealAbLiveEvidenceLoadedArm,
): RealAbDogfoodArmRunInput {
  return {
    source_run_id: manifest.source_run_id,
    memory_mode: manifest.memory_mode,
    authority_level: manifest.authority_level,
    packet_source: manifest.packet_source,
    dogfood_run: loaded.dogfood_run,
    agent_events_by_probe_id: normalizeAgentEvents(loaded.agent_events),
    notes: manifest.notes,
  };
}

export function assembleRealAbDogfoodPairedCaptureFromLiveEvidence(args: {
  manifest: RealAbLiveEvidenceManifest;
  loaded: RealAbLiveEvidenceLoadedInputs;
}): RealAbDogfoodPairedCaptureInput {
  return {
    capture_version: "aionis_real_ab_dogfood_paired_capture_v1",
    suite_id: args.manifest.suite_id,
    suite_kind: args.manifest.suite_kind,
    ...(args.manifest.generated_at ? { generated_at: args.manifest.generated_at } : {}),
    ...(args.manifest.thresholds ? { thresholds: args.manifest.thresholds } : {}),
    fairness: args.manifest.fairness,
    ...(args.manifest.task_ids ? { task_ids: args.manifest.task_ids } : {}),
    arms: {
      baseline: assembleArm(args.manifest.arms.baseline, args.loaded.baseline),
      aionis_assisted: assembleArm(args.manifest.arms.aionis_assisted, args.loaded.aionis_assisted),
      negative_control: assembleArm(args.manifest.arms.negative_control, args.loaded.negative_control),
      positive_control: assembleArm(args.manifest.arms.positive_control, args.loaded.positive_control),
    },
  };
}

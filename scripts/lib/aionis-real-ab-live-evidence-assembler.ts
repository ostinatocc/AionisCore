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
  llm_result_path?: string;
  notes?: string[];
};

export type RealAbFairnessManifestV1 = {
  manifest_version: "aionis_ab_fairness_manifest_v1";
  frozen_at?: string;
  task_ids: string[];
  frozen: {
    task_spec: true;
    verifier: true;
    packet_policy: true;
    initial_workspace: true;
  };
  run_environment: {
    model: string | null;
    reasoning_effort: string | null;
    agent_cli: string | null;
  };
  verifier: {
    version: string;
    same_verifier: true;
    require_workspace_provenance: true;
    require_fresh_shell: true;
  };
  packet_policy: {
    mode: "contract_only" | "workflow_expanded";
    baseline_packet_source: "none";
    aionis_packet_source: "automatic_runtime";
    negative_packet_source: "irrelevant_low_trust";
    positive_packet_source: "oracle_handoff";
    forbid_aionis_only_manual_hints: true;
  };
  arm_equivalence: {
    same_model: true;
    same_reasoning_effort: true;
    same_agent_cli: true;
    same_agent_cli_version: true;
    same_command_hash: true;
    same_initial_workspace_hash: true;
    same_verifier_workspace: true;
  };
};

export type RealAbLiveEvidenceManifest = {
  manifest_version: "aionis_real_ab_live_evidence_manifest_v1";
  suite_id: string;
  suite_kind: Exclude<RealAbSuiteKind, "harness_calibration">;
  generated_at?: string;
  thresholds?: RealAbSuiteInput["thresholds"];
  fairness: RealAbFairnessContract;
  fairness_manifest?: RealAbFairnessManifestV1;
  task_ids?: string[];
  arms: Record<RealAbArm, RealAbLiveEvidenceArmManifest>;
};

export type RealAbLiveEvidenceAgentEventsFile = {
  events_by_probe_id: Record<string, RealAbTraceEvent[]>;
};

export type RealAbLiveEvidenceLoadedArm = {
  dogfood_run: RuntimeDogfoodExternalProbeRun;
  agent_events: RealAbLiveEvidenceAgentEventsFile | Record<string, RealAbTraceEvent[]>;
  llm_result?: RealAbLiveEvidenceLlmArmAttemptResult;
};

export type RealAbLiveEvidenceLoadedInputs = Record<RealAbArm, RealAbLiveEvidenceLoadedArm>;

export type RealAbLiveEvidenceLlmArmAttemptResult = {
  result_version?: string;
  probe_id?: string;
  success?: boolean;
  run_environment?: RealAbRunEnvironmentEvidence;
  command_result?: {
    duration_ms?: number;
    stdout_tail?: string;
    stderr_tail?: string;
  };
};

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

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0))];
}

function sameStringSet(left: string[] | undefined, right: string[] | undefined): boolean {
  const leftSet = new Set(left ?? []);
  const rightSet = new Set(right ?? []);
  if (leftSet.size !== rightSet.size) return false;
  return [...leftSet].every((entry) => rightSet.has(entry));
}

function maybeSame(values: Array<string | null | undefined>): boolean {
  const present = unique(values);
  return present.length <= 1;
}

function armPacketSourceFromFairnessManifest(
  manifest: RealAbFairnessManifestV1,
  arm: RealAbArm,
): RealAbLiveEvidenceArmManifest["packet_source"] {
  if (arm === "baseline") return manifest.packet_policy.baseline_packet_source;
  if (arm === "aionis_assisted") return manifest.packet_policy.aionis_packet_source;
  if (arm === "negative_control") return manifest.packet_policy.negative_packet_source;
  return manifest.packet_policy.positive_packet_source;
}

function notesContainManualAionisHint(notes: string[] | undefined): boolean {
  const text = (notes ?? []).join("\n").toLowerCase();
  return /manual[_ -]?(target_files|acceptance_checks|next_action|workflow|hint)/.test(text)
    || /benchmark[_ -]?adapter/.test(text)
    || /hard[- ]?coded answer/.test(text);
}

function dogfoodRunProvenance(run: RuntimeDogfoodExternalProbeRun | undefined): {
  provenance_version?: unknown;
  workspace_root_resolved?: unknown;
} | null {
  if (!run) return null;
  return (run as {
    provenance?: {
      provenance_version?: unknown;
      workspace_root_resolved?: unknown;
    };
  }).provenance ?? null;
}

function dogfoodProbeProvenance(run: RuntimeDogfoodExternalProbeRun | undefined): Array<{
  provenance_version?: unknown;
  workspace_root_resolved?: unknown;
  fresh_shell?: unknown;
}> {
  if (!run) return [];
  return (run.probes ?? []).map((probe) =>
    (probe as {
      provenance?: {
        provenance_version?: unknown;
        workspace_root_resolved?: unknown;
        fresh_shell?: unknown;
      };
    }).provenance ?? {}
  );
}

function validateFairnessManifest(args: {
  manifest: RealAbLiveEvidenceManifest;
  loaded: Partial<RealAbLiveEvidenceLoadedInputs>;
}): RealAbGateRequirement[] {
  const fairnessManifest = args.manifest.fairness_manifest;
  if (!fairnessManifest) return [];

  const environments = realAbRequiredArms.map((arm) => args.loaded[arm]?.llm_result?.run_environment);
  const runProvenance = realAbRequiredArms.map((arm) => dogfoodRunProvenance(args.loaded[arm]?.dogfood_run));
  const probeProvenance = realAbRequiredArms.flatMap((arm) =>
    args.loaded[arm]?.dogfood_run
      ? dogfoodProbeProvenance(args.loaded[arm].dogfood_run)
      : []
  );

  const requirements: RealAbGateRequirement[] = [
    assemblerRequirement({
      id: "live_evidence:fairness_manifest:version",
      scope: "suite",
      ok: fairnessManifest.manifest_version === "aionis_ab_fairness_manifest_v1",
      actual: fairnessManifest.manifest_version,
      expected: "aionis_ab_fairness_manifest_v1",
      message: "fairness manifest must use the supported frozen A/B protocol contract",
    }),
    assemblerRequirement({
      id: "live_evidence:fairness_manifest:task_ids",
      scope: "suite",
      ok: sameStringSet(fairnessManifest.task_ids, args.manifest.task_ids),
      actual: fairnessManifest.task_ids.join(","),
      expected: (args.manifest.task_ids ?? []).join(","),
      message: "fairness manifest must freeze the same selected task ids as the live evidence manifest",
    }),
    ...Object.entries(fairnessManifest.frozen).map(([key, value]) =>
      assemblerRequirement({
        id: `live_evidence:fairness_manifest:frozen:${key}`,
        scope: "suite",
        ok: value === true,
        actual: value,
        expected: true,
        message: `fairness manifest must freeze ${key} before arm runs`,
      })
    ),
    assemblerRequirement({
      id: "live_evidence:fairness_manifest:run_environment:present",
      scope: "suite",
      ok: environments.every(Boolean),
      actual: environments.filter(Boolean).length,
      expected: realAbRequiredArms.length,
      message: "fairness-locked evidence must include LLM run-environment metadata for every arm",
    }),
    assemblerRequirement({
      id: "live_evidence:fairness_manifest:run_environment:model",
      scope: "suite",
      ok: environments.every((environment) =>
        !environment
          ? false
          : fairnessManifest.run_environment.model
            ? environment.model === fairnessManifest.run_environment.model
            : maybeSame(environments.map((entry) => entry?.model))
      ),
      actual: unique(environments.map((entry) => entry?.model)).join(",") || null,
      expected: fairnessManifest.run_environment.model ?? "same_model_across_arms",
      message: "fairness-locked evidence requires the same model across all arms",
    }),
    assemblerRequirement({
      id: "live_evidence:fairness_manifest:run_environment:reasoning_effort",
      scope: "suite",
      ok: environments.every((environment) =>
        !environment
          ? false
          : fairnessManifest.run_environment.reasoning_effort
            ? environment.reasoning_effort === fairnessManifest.run_environment.reasoning_effort
            : maybeSame(environments.map((entry) => entry?.reasoning_effort))
      ),
      actual: unique(environments.map((entry) => entry?.reasoning_effort)).join(",") || null,
      expected: fairnessManifest.run_environment.reasoning_effort ?? "same_reasoning_effort_across_arms",
      message: "fairness-locked evidence requires the same reasoning effort across all arms",
    }),
    assemblerRequirement({
      id: "live_evidence:fairness_manifest:run_environment:agent_cli",
      scope: "suite",
      ok: environments.every((environment) =>
        !environment
          ? false
          : fairnessManifest.run_environment.agent_cli
            ? environment.agent_cli === fairnessManifest.run_environment.agent_cli
            : maybeSame(environments.map((entry) => entry?.agent_cli))
      ),
      actual: unique(environments.map((entry) => entry?.agent_cli)).join(",") || null,
      expected: fairnessManifest.run_environment.agent_cli ?? "same_agent_cli_across_arms",
      message: "fairness-locked evidence requires the same agent CLI across all arms",
    }),
    assemblerRequirement({
      id: "live_evidence:fairness_manifest:run_environment:agent_cli_version",
      scope: "suite",
      ok: maybeSame(environments.map((entry) => entry?.agent_cli_version)) && environments.every(Boolean),
      actual: unique(environments.map((entry) => entry?.agent_cli_version)).join(",") || null,
      expected: "same_agent_cli_version_across_arms",
      message: "fairness-locked evidence requires the same agent CLI version across all arms",
    }),
    assemblerRequirement({
      id: "live_evidence:fairness_manifest:run_environment:command_hash",
      scope: "suite",
      ok: maybeSame(environments.map((entry) => entry?.command_sha256)) && environments.every(Boolean),
      actual: unique(environments.map((entry) => entry?.command_sha256)).join(",") || null,
      expected: "same_command_hash_across_arms",
      message: "fairness-locked evidence requires the same command hash across all arms",
    }),
    assemblerRequirement({
      id: "live_evidence:fairness_manifest:run_environment:initial_workspace_hash",
      scope: "suite",
      ok: maybeSame(environments.map((entry) => entry?.workspace_before?.hash)) && environments.every(Boolean),
      actual: unique(environments.map((entry) => entry?.workspace_before?.hash)).join(",") || null,
      expected: "same_initial_workspace_hash_across_arms",
      message: "fairness-locked evidence requires identical initial workspace content hashes across all arms",
    }),
    assemblerRequirement({
      id: "live_evidence:fairness_manifest:verifier_provenance",
      scope: "suite",
      ok: runProvenance.every((provenance) =>
        provenance?.provenance_version === "runtime_dogfood_external_probe_provenance_v1"
      ),
      actual: runProvenance.filter((provenance) =>
        provenance?.provenance_version === "runtime_dogfood_external_probe_provenance_v1"
      ).length,
      expected: realAbRequiredArms.length,
      message: "fairness-locked evidence requires verifier provenance for every arm dogfood run",
    }),
    assemblerRequirement({
      id: "live_evidence:fairness_manifest:verifier_workspace",
      scope: "suite",
      ok: fairnessManifest.arm_equivalence.same_verifier_workspace
        ? runProvenance.every((provenance) => typeof provenance?.workspace_root_resolved === "string")
        : true,
      actual: runProvenance.filter((provenance) => typeof provenance?.workspace_root_resolved === "string").length,
      expected: realAbRequiredArms.length,
      message: "fairness-locked causal evidence must record the verified workspace root for every arm",
    }),
    assemblerRequirement({
      id: "live_evidence:fairness_manifest:probe_provenance:fresh_shell",
      scope: "suite",
      ok: probeProvenance.length > 0 && probeProvenance.every((provenance) =>
        provenance.provenance_version === "runtime_dogfood_external_probe_provenance_v1"
        && provenance.fresh_shell === true
      ),
      actual: probeProvenance.filter((provenance) => provenance.fresh_shell === true).length,
      expected: "fresh_shell_probe_provenance_for_every_probe",
      message: "fairness-locked evidence must prove each verifier probe ran from a fresh shell boundary",
    }),
  ];

  for (const arm of realAbRequiredArms) {
    const armManifest = args.manifest.arms?.[arm];
    requirements.push(assemblerRequirement({
      id: `live_evidence:fairness_manifest:packet_source:${arm}`,
      scope: "suite",
      ok: armManifest?.packet_source === armPacketSourceFromFairnessManifest(fairnessManifest, arm),
      actual: armManifest?.packet_source ?? null,
      expected: armPacketSourceFromFairnessManifest(fairnessManifest, arm),
      message: `${arm} packet source must match the frozen packet policy`,
    }));
  }

  requirements.push(assemblerRequirement({
    id: "live_evidence:fairness_manifest:no_aionis_only_manual_hints",
    scope: "suite",
    ok: !notesContainManualAionisHint(args.manifest.arms?.aionis_assisted?.notes),
    actual: notesContainManualAionisHint(args.manifest.arms?.aionis_assisted?.notes),
    expected: false,
    message: "Aionis arm must not receive manual target/workflow hints outside automatic Runtime packet source",
  }));

  return requirements;
}

function parseTokenUsage(text: string): number | null {
  const normalized = text.replace(/\r/g, "");
  const patterns = [
    /tokens used\s*\n\s*([0-9][0-9,]*)/i,
    /tokens[_\s-]*(?:to[_\s-]*success|used)?[^0-9]{0,20}([0-9][0-9,]*)/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match?.[1]) continue;
    const parsed = Number.parseInt(match[1].replace(/,/g, ""), 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function llmOutcomeByProbeId(
  result: RealAbLiveEvidenceLlmArmAttemptResult | undefined,
): Record<string, Partial<RealAbArmMetrics>> | undefined {
  if (!result?.probe_id) return undefined;
  const outcome: Partial<RealAbArmMetrics> = {};
  const duration = result.command_result?.duration_ms;
  if (typeof duration === "number" && Number.isFinite(duration) && duration >= 0) {
    outcome.time_to_success_ms = duration;
  }
  const tokenUsage = parseTokenUsage([
    result.command_result?.stdout_tail ?? "",
    result.command_result?.stderr_tail ?? "",
  ].join("\n"));
  if (typeof tokenUsage === "number") {
    outcome.tokens_to_success = tokenUsage;
  }
  return Object.keys(outcome).length > 0 ? { [result.probe_id]: outcome } : undefined;
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
    ...validateFairnessManifest(args),
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
    outcomes_by_probe_id: llmOutcomeByProbeId(loaded.llm_result),
    run_environment: loaded.llm_result?.run_environment,
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

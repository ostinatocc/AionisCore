import {
  realAbRequiredArms,
  type RealAbArm,
  type RealAbAuthorityLevel,
  type RealAbMemoryMode,
  type RealAbSuiteKind,
} from "./aionis-real-ab-validation.ts";
import type {
  RealAbFairnessManifestV1,
  RealAbLiveEvidenceAgentEventsFile,
  RealAbLiveEvidenceArmManifest,
  RealAbLiveEvidenceManifest,
} from "./aionis-real-ab-live-evidence-assembler.ts";

export type RealAbLiveEvidenceBundleOptions = {
  suite_id: string;
  suite_kind?: Exclude<RealAbSuiteKind, "harness_calibration">;
  task_ids: string[];
  generated_at?: string;
  model?: string | null;
  reasoning_effort?: string | null;
  agent_cli?: string | null;
  packet_policy?: RealAbFairnessManifestV1["packet_policy"]["mode"];
  verifier_version?: string;
};

export type RealAbLiveEvidenceBundleFile = {
  relative_path: string;
  content: string;
};

type ArmBundleDefaults = {
  source_suffix: string;
  memory_mode: RealAbMemoryMode;
  authority_level: RealAbAuthorityLevel;
  packet_source: RealAbLiveEvidenceArmManifest["packet_source"];
  notes: string[];
};

const armDefaults: Record<RealAbArm, ArmBundleDefaults> = {
  baseline: {
    source_suffix: "baseline",
    memory_mode: "none",
    authority_level: "none",
    packet_source: "none",
    notes: [
      "Baseline arm: run the same task without Aionis memory, packets, or workflow assistance.",
    ],
  },
  aionis_assisted: {
    source_suffix: "aionis",
    memory_mode: "aionis_auto",
    authority_level: "authoritative",
    packet_source: "automatic_runtime",
    notes: [
      "Aionis arm: use the Runtime-produced contract, trust gate, orchestration, and learning artifacts without manual prompt surgery.",
    ],
  },
  negative_control: {
    source_suffix: "negative-control",
    memory_mode: "irrelevant_or_low_trust",
    authority_level: "observational",
    packet_source: "irrelevant_low_trust",
    notes: [
      "Negative control: inject irrelevant or low-trust context. It must not become authoritative.",
    ],
  },
  positive_control: {
    source_suffix: "positive-control",
    memory_mode: "oracle_handoff",
    authority_level: "authoritative",
    packet_source: "oracle_handoff",
    notes: [
      "Positive control: provide an oracle-quality handoff to prove the task is recoverable under the verifier.",
    ],
  },
};

function assertNonEmpty(value: string, field: string) {
  if (value.trim().length === 0) {
    throw new Error(`${field} must be non-empty`);
  }
}

function normalizeTaskIds(taskIds: string[]): string[] {
  const normalized = taskIds.map((taskId) => taskId.trim()).filter(Boolean);
  const unique = [...new Set(normalized)];
  if (unique.length === 0) {
    throw new Error("task_ids must include at least one dogfood probe id");
  }
  return unique;
}

function jsonFile(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function armManifest(args: {
  arm: RealAbArm;
  suiteId: string;
}): RealAbLiveEvidenceArmManifest {
  const defaults = armDefaults[args.arm];
  return {
    source_run_id: `${args.suiteId}:${defaults.source_suffix}:pending`,
    memory_mode: defaults.memory_mode,
    authority_level: defaults.authority_level,
    packet_source: defaults.packet_source,
    dogfood_run_path: `${args.arm}/dogfood-run.json`,
    agent_events_path: `${args.arm}/agent-events.json`,
    notes: defaults.notes,
  };
}

export function buildRealAbFairnessManifestV1(
  options: RealAbLiveEvidenceBundleOptions,
): RealAbFairnessManifestV1 {
  const taskIds = normalizeTaskIds(options.task_ids);
  return {
    manifest_version: "aionis_ab_fairness_manifest_v1",
    ...(options.generated_at ? { frozen_at: options.generated_at } : {}),
    task_ids: taskIds,
    frozen: {
      task_spec: true,
      verifier: true,
      packet_policy: true,
      initial_workspace: true,
    },
    run_environment: {
      model: options.model ?? null,
      reasoning_effort: options.reasoning_effort ?? null,
      agent_cli: options.agent_cli ?? null,
    },
    verifier: {
      version: options.verifier_version ?? "runtime_dogfood_external_probe_run_v1",
      same_verifier: true,
      require_workspace_provenance: true,
      require_fresh_shell: true,
    },
    packet_policy: {
      mode: options.packet_policy ?? "contract_only",
      baseline_packet_source: "none",
      aionis_packet_source: "automatic_runtime",
      negative_packet_source: "irrelevant_low_trust",
      positive_packet_source: "oracle_handoff",
      forbid_aionis_only_manual_hints: true,
    },
    arm_equivalence: {
      same_model: true,
      same_reasoning_effort: true,
      same_agent_cli: true,
      same_agent_cli_version: true,
      same_command_hash: true,
      same_initial_workspace_hash: true,
      same_verifier_workspace: true,
    },
  };
}

export function buildRealAbLiveEvidenceManifestTemplate(
  options: RealAbLiveEvidenceBundleOptions,
): RealAbLiveEvidenceManifest {
  assertNonEmpty(options.suite_id, "suite_id");
  const taskIds = normalizeTaskIds(options.task_ids);
  const suiteKind = options.suite_kind ?? "pilot_real_trace";
  if (suiteKind !== "pilot_real_trace" && suiteKind !== "product_real_trace") {
    throw new Error("suite_kind must be pilot_real_trace or product_real_trace");
  }

  return {
    manifest_version: "aionis_real_ab_live_evidence_manifest_v1",
    suite_id: options.suite_id,
    suite_kind: suiteKind,
    ...(options.generated_at ? { generated_at: options.generated_at } : {}),
    fairness: {
      same_model: true,
      same_time_budget: true,
      same_tool_permissions: true,
      same_environment_reset: true,
      same_verifier: true,
    },
    fairness_manifest: buildRealAbFairnessManifestV1({
      ...options,
      task_ids: taskIds,
    }),
    task_ids: taskIds,
    arms: {
      baseline: armManifest({ arm: "baseline", suiteId: options.suite_id }),
      aionis_assisted: armManifest({ arm: "aionis_assisted", suiteId: options.suite_id }),
      negative_control: armManifest({ arm: "negative_control", suiteId: options.suite_id }),
      positive_control: armManifest({ arm: "positive_control", suiteId: options.suite_id }),
    },
  };
}

export function buildRealAbLiveEvidenceAgentEventsTemplate(taskIds: string[]): RealAbLiveEvidenceAgentEventsFile {
  const normalizedTaskIds = normalizeTaskIds(taskIds);
  return {
    events_by_probe_id: Object.fromEntries(normalizedTaskIds.map((taskId) => [taskId, []])),
  };
}

function dogfoodRunInstructions(arm: RealAbArm): string {
  const manifest = armManifest({ arm, suiteId: "<suite_id>" });
  return [
    `# ${arm} Dogfood Run Required`,
    "",
    "This file intentionally is not a JSON placeholder.",
    "",
    `Place the real Runtime dogfood external-probe run at \`${manifest.dogfood_run_path.split("/").at(-1)}\`.`,
    "The file must have `run_version: \"runtime_dogfood_external_probe_run_v1\"` and must include every selected probe id.",
    "",
    "Do not copy another arm's result into this directory. Each arm must be run independently under the same verifier and environment reset.",
    "",
  ].join("\n");
}

function bundleReadme(options: RealAbLiveEvidenceBundleOptions): string {
  const taskIds = normalizeTaskIds(options.task_ids);
  return [
    "# Aionis Real A/B Live Evidence Bundle",
    "",
    "This bundle is a collection scaffold, not evidence.",
    "",
    "It is invalid until every arm has:",
    "",
    "- a real `dogfood-run.json` produced by `scripts/lite-runtime-dogfood-external-probe.ts`",
    "- non-empty `agent-events.json` entries for every selected probe id",
    "- at least one `action` or `tool_call` event per probe",
    "- the same model, verifier, tool permissions, time budget, and environment reset",
    "",
    "Selected probe ids:",
    "",
    ...taskIds.map((taskId) => `- \`${taskId}\``),
    "",
    "After collecting real artifacts, run:",
    "",
    "```bash",
    "npm run -s ab:evidence:live -- --manifest manifest.json --report --fail-on-invalid",
    "```",
    "",
    "Minimal agent event shape:",
    "",
    "```json",
    "{",
    "  \"events_by_probe_id\": {",
    `    \"${taskIds[0]}\": [`,
    "      {",
    "        \"kind\": \"tool_call\",",
    "        \"command\": \"nohup node scripts/health-server.mjs --port 4199 >/tmp/health.log 2>&1 &\",",
    "        \"touched_files\": [\"scripts/health-server.mjs\"],",
    "        \"correct\": true,",
    "        \"wasted\": false",
    "      }",
    "    ]",
    "  }",
    "}",
    "```",
    "",
  ].join("\n");
}

export function buildRealAbLiveEvidenceBundleFiles(
  options: RealAbLiveEvidenceBundleOptions,
): RealAbLiveEvidenceBundleFile[] {
  const manifest = buildRealAbLiveEvidenceManifestTemplate(options);
  const agentEvents = buildRealAbLiveEvidenceAgentEventsTemplate(manifest.task_ids ?? []);
  const files: RealAbLiveEvidenceBundleFile[] = [
    {
      relative_path: "manifest.json",
      content: jsonFile(manifest),
    },
    {
      relative_path: "README.md",
      content: bundleReadme({ ...options, task_ids: manifest.task_ids ?? [] }),
    },
  ];

  for (const arm of realAbRequiredArms) {
    files.push(
      {
        relative_path: `${arm}/agent-events.json`,
        content: jsonFile(agentEvents),
      },
      {
        relative_path: `${arm}/dogfood-run.REQUIRED.md`,
        content: dogfoodRunInstructions(arm),
      },
    );
  }

  return files;
}

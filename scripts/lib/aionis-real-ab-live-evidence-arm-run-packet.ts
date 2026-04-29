import path from "node:path";
import {
  realAbRequiredArms,
  type RealAbArm,
  type RealAbFairnessContract,
  type RealAbMemoryMode,
  type RealAbAuthorityLevel,
  type RealAbSuiteKind,
} from "./aionis-real-ab-validation.ts";
import type {
  RealAbLiveEvidenceArmManifest,
  RealAbLiveEvidenceManifest,
} from "./aionis-real-ab-live-evidence-assembler.ts";

export type RealAbLiveEvidenceArmRunPacket = {
  packet_version: "aionis_real_ab_live_evidence_arm_run_packet_v1";
  suite_id: string;
  suite_kind: Exclude<RealAbSuiteKind, "harness_calibration">;
  arm: RealAbArm;
  source_run_id: string;
  memory_mode: RealAbMemoryMode;
  authority_level: RealAbAuthorityLevel;
  packet_source: RealAbLiveEvidenceArmManifest["packet_source"];
  fairness: RealAbFairnessContract;
  task_ids: string[];
  probe_slices: string[];
  manifest_path: string;
  dogfood_run_path: string;
  dogfood_report_path: string;
  agent_events_path: string;
  dogfood_command_argv: string[];
  dogfood_command: string;
  recorder_examples: Record<string, string>;
  guardrails: string[];
};

const probeToSlice: Record<string, string> = {
  external_probe_service_after_exit: "service_after_exit",
  external_probe_service_lifecycle_hard: "service_lifecycle_hard",
  external_probe_publish_install: "publish_install",
  external_probe_deploy_hook_web: "deploy_hook_web",
  external_probe_interrupted_resume: "interrupted_resume",
  external_probe_handoff_next_day: "handoff_next_day",
  external_probe_agent_takeover: "agent_takeover",
  external_probe_ai_code_ci_repair: "ai_code_ci_repair",
};

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function commandFromArgv(argv: string[]): string {
  return argv.map(shellQuote).join(" ");
}

function resolveFromManifest(manifestPath: string, targetPath: string): string {
  if (path.isAbsolute(targetPath)) return targetPath;
  return path.resolve(path.dirname(manifestPath), targetPath);
}

function probeSlices(taskIds: string[]): string[] {
  const slices = taskIds.map((taskId) => {
    const slice = probeToSlice[taskId];
    if (!slice) {
      throw new Error(`unsupported dogfood probe id for arm run packet: ${taskId}`);
    }
    return slice;
  });
  return [...new Set(slices)];
}

function recorderExample(args: {
  manifestPath: string;
  arm: RealAbArm;
  probeId: string;
}): string {
  return commandFromArgv([
    "npm",
    "run",
    "-s",
    "ab:evidence:event",
    "--",
    "--manifest",
    args.manifestPath,
    "--arm",
    args.arm,
    "--probe",
    args.probeId,
    "--kind",
    "tool_call",
    "--command",
    "<exact command the agent actually invoked>",
    "--touched-file",
    "<file the agent actually touched>",
    "--correct",
    "--not-wasted",
  ]);
}

export function buildRealAbLiveEvidenceArmRunPacket(args: {
  manifest: RealAbLiveEvidenceManifest;
  manifest_path: string;
  arm: RealAbArm;
}): RealAbLiveEvidenceArmRunPacket {
  if (!(realAbRequiredArms as readonly string[]).includes(args.arm)) {
    throw new Error(`unsupported arm: ${args.arm}`);
  }
  const manifestPath = path.resolve(args.manifest_path);
  const armManifest = args.manifest.arms[args.arm];
  const taskIds = args.manifest.task_ids ?? [];
  if (taskIds.length === 0) {
    throw new Error("live evidence manifest must include task_ids to build an arm run packet");
  }
  const slices = probeSlices(taskIds);
  const dogfoodRunPath = resolveFromManifest(manifestPath, armManifest.dogfood_run_path);
  const dogfoodReportPath = path.join(path.dirname(dogfoodRunPath), "dogfood-report.md");
  const agentEventsPath = resolveFromManifest(manifestPath, armManifest.agent_events_path);
  const dogfoodCommandArgv = [
    "npx",
    "tsx",
    "scripts/lite-runtime-dogfood-external-probe.ts",
    "--slice",
    slices.join(","),
    "--out-json",
    dogfoodRunPath,
    "--out-md",
    dogfoodReportPath,
  ];

  return {
    packet_version: "aionis_real_ab_live_evidence_arm_run_packet_v1",
    suite_id: args.manifest.suite_id,
    suite_kind: args.manifest.suite_kind,
    arm: args.arm,
    source_run_id: armManifest.source_run_id,
    memory_mode: armManifest.memory_mode,
    authority_level: armManifest.authority_level,
    packet_source: armManifest.packet_source,
    fairness: args.manifest.fairness,
    task_ids: taskIds,
    probe_slices: slices,
    manifest_path: manifestPath,
    dogfood_run_path: dogfoodRunPath,
    dogfood_report_path: dogfoodReportPath,
    agent_events_path: agentEventsPath,
    dogfood_command_argv: dogfoodCommandArgv,
    dogfood_command: commandFromArgv(dogfoodCommandArgv),
    recorder_examples: Object.fromEntries(taskIds.map((probeId) => [
      probeId,
      recorderExample({ manifestPath, arm: args.arm, probeId }),
    ])),
    guardrails: [
      "Record only actions, tool calls, claims, retries, or interventions that actually happened in this arm.",
      "Do not copy agent-events.json or dogfood-run.json across arms.",
      "Do not record the verifier command as an agent event unless the agent actually invoked it before the verifier.",
      "If the operator chooses the next action, record human_intervention and do not treat the arm as clean autonomous evidence.",
      "The aionis_assisted arm must use Runtime-produced packets automatically; manual prompt surgery invalidates the arm.",
    ],
  };
}

export function renderRealAbLiveEvidenceArmRunPacketMarkdown(packet: RealAbLiveEvidenceArmRunPacket): string {
  return [
    `# Aionis Real A/B Arm Run Packet: ${packet.arm}`,
    "",
    `Suite: \`${packet.suite_id}\``,
    `Kind: \`${packet.suite_kind}\``,
    `Source run: \`${packet.source_run_id}\``,
    `Memory mode: \`${packet.memory_mode}\``,
    `Authority level: \`${packet.authority_level}\``,
    `Packet source: \`${packet.packet_source}\``,
    "",
    "## Dogfood Probe Command",
    "",
    "Run this from the repository root after executing the arm's agent attempt:",
    "",
    "```bash",
    packet.dogfood_command,
    "```",
    "",
    "## Evidence Paths",
    "",
    `- Manifest: \`${packet.manifest_path}\``,
    `- Dogfood run: \`${packet.dogfood_run_path}\``,
    `- Dogfood report: \`${packet.dogfood_report_path}\``,
    `- Agent events: \`${packet.agent_events_path}\``,
    "",
    "## Probe IDs",
    "",
    ...packet.task_ids.map((taskId) => `- \`${taskId}\``),
    "",
    "## Recorder Examples",
    "",
    ...Object.entries(packet.recorder_examples).flatMap(([probeId, command]) => [
      `### ${probeId}`,
      "",
      "```bash",
      command,
      "```",
      "",
    ]),
    "## Guardrails",
    "",
    ...packet.guardrails.map((guardrail) => `- ${guardrail}`),
    "",
  ].join("\n");
}

import fs from "node:fs";
import path from "node:path";
import {
  realAbRequiredArms,
  type RealAbArm,
  type RealAbTraceEvent,
} from "./aionis-real-ab-validation.ts";
import type {
  RealAbLiveEvidenceAgentEventsFile,
  RealAbLiveEvidenceManifest,
} from "./aionis-real-ab-live-evidence-assembler.ts";
import type {
  RuntimeDogfoodExternalProbeRun,
} from "./lite-runtime-dogfood-external-probe.ts";

export type RealAbLiveEvidenceProbeStatus = {
  probe_id: string;
  dogfood_probe_present: boolean;
  fresh_shell_probe_passed: boolean | null;
  agent_event_count: number;
  agent_action_event_count: number;
  ready: boolean;
  missing: string[];
};

export type RealAbLiveEvidenceArmStatus = {
  arm: RealAbArm;
  dogfood_run_path: string;
  agent_events_path: string;
  dogfood_run_present: boolean;
  dogfood_run_version: string | null;
  agent_events_present: boolean;
  probes: RealAbLiveEvidenceProbeStatus[];
  ready: boolean;
  missing: string[];
};

export type RealAbLiveEvidenceStatusReport = {
  status_version: "aionis_real_ab_live_evidence_status_v1";
  suite_id: string;
  suite_kind: RealAbLiveEvidenceManifest["suite_kind"];
  manifest_path: string;
  task_ids: string[];
  ready_for_live_evidence: boolean;
  summary: {
    arm_count: number;
    task_count: number;
    dogfood_runs_present: number;
    agent_event_files_present: number;
    ready_probe_slots: number;
    total_probe_slots: number;
    missing_agent_action_slots: number;
  };
  arms: Record<RealAbArm, RealAbLiveEvidenceArmStatus>;
};

function readJsonIfExists<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function resolveFromManifest(manifestPath: string, targetPath: string): string {
  if (path.isAbsolute(targetPath)) return targetPath;
  return path.resolve(path.dirname(manifestPath), targetPath);
}

function normalizeAgentEvents(
  value: RealAbLiveEvidenceAgentEventsFile | Record<string, RealAbTraceEvent[]> | null,
): Record<string, RealAbTraceEvent[]> {
  if (!value) return {};
  if ("events_by_probe_id" in value) return value.events_by_probe_id;
  return value;
}

function actionEventCount(events: RealAbTraceEvent[]): number {
  return events.filter((event) => event.kind === "action" || event.kind === "tool_call").length;
}

function dogfoodProbeMap(run: RuntimeDogfoodExternalProbeRun | null): Map<string, { fresh_shell_probe_passed?: boolean }> {
  return new Map((run?.probes ?? []).map((probe) => [probe.id, probe]));
}

export function buildRealAbLiveEvidenceStatusReport(args: {
  manifest_path: string;
}): RealAbLiveEvidenceStatusReport {
  const manifestPath = path.resolve(args.manifest_path);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as RealAbLiveEvidenceManifest;
  const taskIds = manifest.task_ids ?? [];
  const arms = {} as Record<RealAbArm, RealAbLiveEvidenceArmStatus>;

  for (const arm of realAbRequiredArms) {
    const armManifest = manifest.arms[arm];
    const dogfoodRunPath = resolveFromManifest(manifestPath, armManifest.dogfood_run_path);
    const agentEventsPath = resolveFromManifest(manifestPath, armManifest.agent_events_path);
    const dogfoodRun = readJsonIfExists<RuntimeDogfoodExternalProbeRun>(dogfoodRunPath);
    const agentEventsFile = readJsonIfExists<RealAbLiveEvidenceAgentEventsFile | Record<string, RealAbTraceEvent[]>>(
      agentEventsPath,
    );
    const dogfoodProbes = dogfoodProbeMap(dogfoodRun);
    const eventsByProbe = normalizeAgentEvents(agentEventsFile);
    const missing = [];
    if (!dogfoodRun) missing.push("dogfood_run_missing");
    if (dogfoodRun && dogfoodRun.run_version !== "runtime_dogfood_external_probe_run_v1") {
      missing.push("dogfood_run_version_invalid");
    }
    if (!agentEventsFile) missing.push("agent_events_missing");

    const probes = taskIds.map((probeId) => {
      const dogfoodProbe = dogfoodProbes.get(probeId);
      const events = eventsByProbe[probeId] ?? [];
      const probeMissing = [];
      const dogfoodProbePresent = Boolean(dogfoodProbe);
      const agentActions = actionEventCount(events);
      if (!dogfoodProbePresent) probeMissing.push("dogfood_probe_missing");
      if (events.length === 0) probeMissing.push("agent_events_empty");
      if (agentActions === 0) probeMissing.push("agent_action_events_missing");
      return {
        probe_id: probeId,
        dogfood_probe_present: dogfoodProbePresent,
        fresh_shell_probe_passed: dogfoodProbe?.fresh_shell_probe_passed ?? null,
        agent_event_count: events.length,
        agent_action_event_count: agentActions,
        ready: probeMissing.length === 0,
        missing: probeMissing,
      };
    });
    const ready = missing.length === 0 && probes.every((probe) => probe.ready);

    arms[arm] = {
      arm,
      dogfood_run_path: dogfoodRunPath,
      agent_events_path: agentEventsPath,
      dogfood_run_present: Boolean(dogfoodRun),
      dogfood_run_version: dogfoodRun?.run_version ?? null,
      agent_events_present: Boolean(agentEventsFile),
      probes,
      ready,
      missing,
    };
  }

  const allProbeStatuses = Object.values(arms).flatMap((arm) => arm.probes);
  return {
    status_version: "aionis_real_ab_live_evidence_status_v1",
    suite_id: manifest.suite_id,
    suite_kind: manifest.suite_kind,
    manifest_path: manifestPath,
    task_ids: taskIds,
    ready_for_live_evidence: Object.values(arms).every((arm) => arm.ready),
    summary: {
      arm_count: realAbRequiredArms.length,
      task_count: taskIds.length,
      dogfood_runs_present: Object.values(arms).filter((arm) => arm.dogfood_run_present).length,
      agent_event_files_present: Object.values(arms).filter((arm) => arm.agent_events_present).length,
      ready_probe_slots: allProbeStatuses.filter((probe) => probe.ready).length,
      total_probe_slots: allProbeStatuses.length,
      missing_agent_action_slots: allProbeStatuses.filter((probe) => probe.agent_action_event_count === 0).length,
    },
    arms,
  };
}

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}

export function renderRealAbLiveEvidenceStatusMarkdown(report: RealAbLiveEvidenceStatusReport): string {
  const rows = realAbRequiredArms.flatMap((arm) =>
    report.arms[arm].probes.map((probe) => [
      arm,
      probe.probe_id,
      yesNo(report.arms[arm].dogfood_run_present),
      yesNo(probe.dogfood_probe_present),
      String(probe.agent_event_count),
      String(probe.agent_action_event_count),
      yesNo(probe.ready),
      probe.missing.join(", ") || "none",
    ])
  );

  return [
    "# Aionis Real A/B Live Evidence Status",
    "",
    `Suite: \`${report.suite_id}\``,
    `Kind: \`${report.suite_kind}\``,
    `Ready for live evidence: **${yesNo(report.ready_for_live_evidence)}**`,
    "",
    "## Summary",
    "",
    `- Dogfood runs present: ${report.summary.dogfood_runs_present}/${report.summary.arm_count}`,
    `- Agent event files present: ${report.summary.agent_event_files_present}/${report.summary.arm_count}`,
    `- Ready probe slots: ${report.summary.ready_probe_slots}/${report.summary.total_probe_slots}`,
    `- Missing agent action slots: ${report.summary.missing_agent_action_slots}`,
    "",
    "## Arm Matrix",
    "",
    "| Arm | Probe | Dogfood run | Dogfood probe | Events | Action events | Ready | Missing |",
    "| --- | --- | --- | --- | ---: | ---: | --- | --- |",
    ...rows.map((row) => `| ${row.join(" | ")} |`),
    "",
  ].join("\n");
}

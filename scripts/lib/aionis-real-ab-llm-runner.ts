import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import {
  appendRealAbLiveEvidenceAgentEvent,
  finalizeRealAbLiveEvidenceEvent,
  type RealAbLiveEvidenceEventDraft,
} from "./aionis-real-ab-live-evidence-event-recorder.ts";
import {
  realAbRequiredArms,
  type RealAbArm,
  type RealAbTraceEvent,
} from "./aionis-real-ab-validation.ts";
import type {
  RealAbLiveEvidenceAgentEventsFile,
  RealAbLiveEvidenceManifest,
} from "./aionis-real-ab-live-evidence-assembler.ts";

export type RealAbLlmAgentOutput = {
  output_version: "aionis_real_ab_llm_agent_output_v1";
  probe_id?: string;
  events?: RealAbLiveEvidenceEventDraft[];
  events_by_probe_id?: Record<string, RealAbLiveEvidenceEventDraft[]>;
  notes?: string[];
};

export type RealAbLlmCommandResult = {
  exit_code: number | null;
  timed_out: boolean;
  stdout_tail: string;
  stderr_tail: string;
  duration_ms: number;
};

export type RealAbLlmArmAttemptResult = {
  result_version: "aionis_real_ab_llm_arm_attempt_result_v1";
  suite_id: string;
  arm: RealAbArm;
  probe_id: string;
  command: string;
  prompt_sha256: string;
  agent_events_path?: string;
  command_result: RealAbLlmCommandResult;
  parsed_output: RealAbLlmAgentOutput;
  events: RealAbTraceEvent[];
  parsed_event_count: number;
  action_event_count: number;
  success: boolean;
};

const OutputTailLimit = 8192;

function tail(value: string, limit = OutputTailLimit): string {
  return value.length <= limit ? value : value.slice(value.length - limit);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function actionEventCount(events: RealAbLiveEvidenceEventDraft[] | RealAbTraceEvent[]): number {
  return events.filter((event) => event.kind === "action" || event.kind === "tool_call").length;
}

function assertArm(arm: string): asserts arm is RealAbArm {
  if (!(realAbRequiredArms as readonly string[]).includes(arm)) {
    throw new Error(`unsupported A/B arm: ${arm}`);
  }
}

function manifestArm(args: {
  manifest: RealAbLiveEvidenceManifest;
  arm: RealAbArm;
}) {
  const armManifest = args.manifest.arms?.[args.arm];
  if (!armManifest) {
    throw new Error(`manifest is missing arm: ${args.arm}`);
  }
  return armManifest;
}

function normalizeEventsByProbeId(
  output: RealAbLlmAgentOutput,
  probeId: string,
): Record<string, RealAbLiveEvidenceEventDraft[]> {
  const byProbe = output.events_by_probe_id ?? {};
  if (output.events) {
    byProbe[output.probe_id ?? probeId] = [
      ...(byProbe[output.probe_id ?? probeId] ?? []),
      ...output.events,
    ];
  }
  return byProbe;
}

function parseJsonObject(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error("LLM command stdout did not include JSON output");
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }
    throw new Error("LLM command stdout did not contain a parseable JSON object");
  }
}

export function parseRealAbLlmAgentOutput(stdout: string, probeId: string): RealAbLlmAgentOutput {
  const raw = parseJsonObject(stdout);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("LLM command JSON output must be an object");
  }
  const record = raw as Record<string, unknown>;
  if (record.output_version !== "aionis_real_ab_llm_agent_output_v1") {
    throw new Error("LLM command JSON output must use output_version=aionis_real_ab_llm_agent_output_v1");
  }
  const output: RealAbLlmAgentOutput = {
    output_version: "aionis_real_ab_llm_agent_output_v1",
  };
  if (typeof record.probe_id === "string" && record.probe_id.trim()) {
    output.probe_id = record.probe_id.trim();
  }
  if (Array.isArray(record.events)) {
    output.events = record.events.map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        throw new Error("LLM output events must be objects");
      }
      return entry as RealAbLiveEvidenceEventDraft;
    });
  }
  if (record.events_by_probe_id && typeof record.events_by_probe_id === "object" && !Array.isArray(record.events_by_probe_id)) {
    output.events_by_probe_id = Object.fromEntries(
      Object.entries(record.events_by_probe_id as Record<string, unknown>).map(([id, events]) => {
        if (!Array.isArray(events)) {
          throw new Error(`LLM output events_by_probe_id.${id} must be an array`);
        }
        return [id, events.map((entry) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            throw new Error(`LLM output events_by_probe_id.${id} entries must be objects`);
          }
          return entry as RealAbLiveEvidenceEventDraft;
        })];
      }),
    );
  }
  if (Array.isArray(record.notes)) {
    output.notes = record.notes.map((note) => String(note)).filter((note) => note.trim().length > 0);
  }
  const eventsByProbe = normalizeEventsByProbeId(output, probeId);
  const events = eventsByProbe[probeId] ?? [];
  if (events.length === 0) {
    throw new Error(`LLM command output must include events for probe ${probeId}`);
  }
  const actionCount = events.filter((event) => event.kind === "action" || event.kind === "tool_call").length;
  if (actionCount === 0) {
    throw new Error(`LLM command output for probe ${probeId} must include at least one action or tool_call event`);
  }
  for (const event of events) {
    finalizeRealAbLiveEvidenceEvent(event);
  }
  return output;
}

export function buildRealAbLlmArmPrompt(args: {
  manifest: RealAbLiveEvidenceManifest;
  manifest_path: string;
  arm: RealAbArm;
  probe_id: string;
}): string {
  assertArm(args.arm);
  const armManifest = manifestArm({ manifest: args.manifest, arm: args.arm });
  if (args.manifest.task_ids && !args.manifest.task_ids.includes(args.probe_id)) {
    throw new Error(`probe ${args.probe_id} is not selected in manifest.task_ids`);
  }
  return [
    "You are executing one arm of an Aionis real A/B live-evidence run.",
    "",
    `Suite: ${args.manifest.suite_id}`,
    `Arm: ${args.arm}`,
    `Probe: ${args.probe_id}`,
    `Memory mode: ${armManifest.memory_mode}`,
    `Authority level: ${armManifest.authority_level}`,
    `Packet source: ${armManifest.packet_source}`,
    `Manifest: ${path.resolve(args.manifest_path)}`,
    "",
    "Fairness requirements:",
    `- same_model=${args.manifest.fairness.same_model}`,
    `- same_time_budget=${args.manifest.fairness.same_time_budget}`,
    `- same_tool_permissions=${args.manifest.fairness.same_tool_permissions}`,
    `- same_environment_reset=${args.manifest.fairness.same_environment_reset}`,
    `- same_verifier=${args.manifest.fairness.same_verifier}`,
    "",
    "Output contract:",
    "Return only JSON with output_version=\"aionis_real_ab_llm_agent_output_v1\".",
    "Include the actual action/tool events you performed for this probe.",
    "Do not record the external verifier as an agent event unless the agent invoked it before the harness verifier.",
    "",
    "Minimal output shape:",
    "{",
    "  \"output_version\": \"aionis_real_ab_llm_agent_output_v1\",",
    `  \"probe_id\": \"${args.probe_id}\",`,
    "  \"events\": [",
    "    {\"kind\":\"action\",\"text\":\"describe the actual first action\",\"correct\":true,\"wasted\":false}",
    "  ]",
    "}",
    "",
    armManifest.notes?.length ? `Arm notes:\n${armManifest.notes.map((note) => `- ${note}`).join("\n")}` : "",
  ].filter((line) => line !== "").join("\n");
}

async function runShellCommand(args: {
  command: string;
  cwd?: string;
  timeout_ms: number;
  env: Record<string, string>;
  shellPath?: string;
}): Promise<RealAbLlmCommandResult & { stdout_full: string }> {
  const startedAt = Date.now();
  const shellPath = args.shellPath ?? process.env.SHELL ?? "/bin/sh";
  let stdout = "";
  let stdoutFull = "";
  let stderr = "";
  let timedOut = false;
  const result = await new Promise<RealAbLlmCommandResult>((resolve) => {
    const child = spawn(shellPath, ["-lc", args.command], {
      cwd: args.cwd ?? process.cwd(),
      env: {
        ...process.env,
        ...args.env,
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, args.timeout_ms);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdoutFull += chunk;
      stdout = tail(stdoutFull);
    });
    child.stderr.on("data", (chunk: string) => {
      stderr = tail(stderr + chunk);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({
        exit_code: timedOut ? null : code,
        timed_out: timedOut,
        stdout_tail: stdout,
        stderr_tail: stderr,
        duration_ms: Math.max(0, Date.now() - startedAt),
      });
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({
        exit_code: null,
        timed_out: timedOut,
        stdout_tail: stdout,
        stderr_tail: tail(stderr + error.message),
        duration_ms: Math.max(0, Date.now() - startedAt),
      });
    });
  });
  return { ...result, stdout_full: stdoutFull };
}

export async function runRealAbLlmArmAttempt(args: {
  manifest: RealAbLiveEvidenceManifest;
  manifest_path: string;
  arm: RealAbArm;
  probe_id: string;
  command: string;
  cwd?: string;
  timeout_ms?: number;
  agent_events_path?: string;
  shellPath?: string;
}): Promise<RealAbLlmArmAttemptResult> {
  assertArm(args.arm);
  const armManifest = manifestArm({ manifest: args.manifest, arm: args.arm });
  const prompt = buildRealAbLlmArmPrompt({
    manifest: args.manifest,
    manifest_path: args.manifest_path,
    arm: args.arm,
    probe_id: args.probe_id,
  });
  const commandResult = await runShellCommand({
    command: args.command,
    cwd: args.cwd,
    timeout_ms: args.timeout_ms ?? 300_000,
    shellPath: args.shellPath,
    env: {
      AIONIS_AB_PROMPT: prompt,
      AIONIS_AB_SUITE_ID: args.manifest.suite_id,
      AIONIS_AB_ARM: args.arm,
      AIONIS_AB_PROBE_ID: args.probe_id,
      AIONIS_AB_MEMORY_MODE: armManifest.memory_mode,
      AIONIS_AB_AUTHORITY_LEVEL: armManifest.authority_level,
      AIONIS_AB_PACKET_SOURCE: armManifest.packet_source,
      AIONIS_AB_MANIFEST_PATH: path.resolve(args.manifest_path),
      ...(args.agent_events_path ? { AIONIS_AB_AGENT_EVENTS_PATH: path.resolve(args.agent_events_path) } : {}),
    },
  });
  if (commandResult.timed_out || commandResult.exit_code !== 0) {
    throw new Error(`LLM command failed for ${args.arm}/${args.probe_id}: exit_code=${commandResult.exit_code ?? "null"}`);
  }
  const parsedOutput = parseRealAbLlmAgentOutput(commandResult.stdout_full, args.probe_id);
  const eventsByProbe = normalizeEventsByProbeId(parsedOutput, args.probe_id);
  const events = (eventsByProbe[args.probe_id] ?? []).map((event) => finalizeRealAbLiveEvidenceEvent(event));
  return {
    result_version: "aionis_real_ab_llm_arm_attempt_result_v1",
    suite_id: args.manifest.suite_id,
    arm: args.arm,
    probe_id: args.probe_id,
    command: args.command,
    prompt_sha256: sha256(prompt),
    ...(args.agent_events_path ? { agent_events_path: path.resolve(args.agent_events_path) } : {}),
    command_result: {
      exit_code: commandResult.exit_code,
      timed_out: commandResult.timed_out,
      stdout_tail: commandResult.stdout_tail,
      stderr_tail: commandResult.stderr_tail,
      duration_ms: commandResult.duration_ms,
    },
    parsed_output: parsedOutput,
    events,
    parsed_event_count: events.length,
    action_event_count: actionEventCount(events),
    success: true,
  };
}

export function applyRealAbLlmArmAttemptToAgentEvents(args: {
  events_file: RealAbLiveEvidenceAgentEventsFile | Record<string, RealAbTraceEvent[]>;
  attempt: RealAbLlmArmAttemptResult;
}): RealAbLiveEvidenceAgentEventsFile {
  let updated = args.events_file;
  for (const event of args.attempt.events) {
    updated = appendRealAbLiveEvidenceAgentEvent({
      events_file: updated,
      probe_id: args.attempt.probe_id,
      event,
    });
  }
  return "events_by_probe_id" in updated ? updated : { events_by_probe_id: updated };
}

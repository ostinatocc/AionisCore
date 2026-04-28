import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import {
  appendRealAbLiveEvidenceAgentEvent,
  finalizeRealAbLiveEvidenceEvent,
  type RealAbLiveEvidenceEventDraft,
} from "./aionis-real-ab-live-evidence-event-recorder.ts";
import {
  buildRealAbLiveEvidenceArmRunPacket,
} from "./aionis-real-ab-live-evidence-arm-run-packet.ts";
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

export type RealAbLlmPacketMode = "contract_only" | "workflow_expanded";

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

type ProbeTaskBrief = {
  title: string;
  task_family: string;
  task_prompt: string;
  target_files: string[];
  next_action: string;
  acceptance_checks: string[];
  lifecycle_constraints: string[];
  authority_boundary: string[];
  workflow_steps: string[];
};

const probeTaskBriefs: Record<string, ProbeTaskBrief> = {
  external_probe_service_after_exit: {
    title: "External probe service after-exit validation",
    task_family: "service_publish_validate",
    task_prompt: "Keep the Runtime dogfood service alive after the launcher exits and prove it from a fresh shell.",
    target_files: ["scripts/fixtures/runtime-dogfood/service-after-exit-server.mjs"],
    next_action: "Inspect the service entrypoint, launch it detached from the current shell, then validate /healthz from a fresh shell.",
    acceptance_checks: ["curl -fsS <fresh-shell-endpoint>/healthz"],
    lifecycle_constraints: [
      "must_survive_agent_exit",
      "revalidate_from_fresh_shell",
      "detach_then_probe",
    ],
    authority_boundary: [
      "A success claim is not authoritative without external fresh-shell evidence.",
      "The collection harness, not the agent, writes dogfood-run.json.",
    ],
    workflow_steps: [
      "Inspect the service entrypoint and identify what must stay alive after the agent/launcher exits.",
      "Launch the service detached, not as a foreground child tied to the current shell.",
      "Use a headless portable detach pattern such as nohup/node with redirected stdio and backgrounding; do not use launchctl, osascript, open, Terminal.app, GUI apps, or login-session service managers.",
      "Probe the endpoint from a fresh shell after the launch command returns.",
      "Record the actual action/tool events; do not convert a mere success claim into verifier evidence.",
    ],
  },
  external_probe_publish_install: {
    title: "External probe publish/install clean-client validation",
    task_family: "package_publish_validate",
    task_prompt: "Recover the local package index so clean clients can install vectorops from a fresh shell after worker exit.",
    target_files: ["scripts/build_index.py", "src/vectorops/__init__.py"],
    next_action: "Build the local simple index, serve it from a detached process, then validate index visibility and clean-client install from a fresh shell.",
    acceptance_checks: [
      "curl -fsS <fresh-shell-endpoint>/simple/vectorops/",
      "pip install --index-url <fresh-shell-endpoint>/simple vectorops==0.1.0",
    ],
    lifecycle_constraints: [
      "external_visibility_required",
      "revalidate_from_fresh_shell",
      "clean_client_install_required",
    ],
    authority_boundary: [
      "Package/index work is not authoritative until a fresh clean client installs the package.",
      "The collection harness, not the agent, writes dogfood-run.json.",
    ],
    workflow_steps: [
      "Inspect package artifact generation and simple-index metadata before changing files.",
      "Build the local package index and serve it from a detached process.",
      "Validate index visibility and clean-client install from a fresh shell.",
      "Record actual package/index/server actions and distinguish them from verifier probes.",
    ],
  },
  external_probe_deploy_hook_web: {
    title: "External probe deploy/hook/web visible outcome",
    task_family: "git_deploy_webserver",
    task_prompt: "Repair the git deploy webserver hook so a pushed revision is visible through the served web endpoint.",
    target_files: ["hooks/post-receive", "www/main/index.html", "site/index.html"],
    next_action: "Repair hooks/post-receive so it publishes the deployed revision into www/main/index.html, then validate served /index.html from a fresh shell.",
    acceptance_checks: ["curl -fsS <fresh-shell-endpoint>/index.html"],
    lifecycle_constraints: [
      "external_visibility_required",
      "revalidate_from_fresh_shell",
      "served_content_must_match_deployed_revision",
    ],
    authority_boundary: [
      "Git or hook success is not authoritative unless served web content matches the deployed revision.",
      "The collection harness, not the agent, writes dogfood-run.json.",
    ],
    workflow_steps: [
      "Inspect the deploy hook path and the webserver publish root before changing files.",
      "Ensure the hook updates the served web content from the deployed revision.",
      "Validate served content through the web endpoint from a fresh shell.",
      "Record actual hook/webserver actions; do not rely on git success as web visibility proof.",
    ],
  },
  external_probe_interrupted_resume: {
    title: "External probe interrupted resume validation",
    task_family: "handoff_resume",
    task_prompt: "Resume an interrupted export pipeline repair and validate only the narrow export path.",
    target_files: ["src/exporter.mjs", "tests/exporter.test.mjs"],
    next_action: "Inspect the exporter implementation and targeted test, repair the narrow resumed slice, then run the targeted test.",
    acceptance_checks: ["npm test -- tests/exporter.test.mjs"],
    lifecycle_constraints: [
      "resume_target_scope_only",
      "targeted_validation_required",
    ],
    authority_boundary: [
      "Broad exploration is advisory only unless it is forced by targeted evidence.",
      "The collection harness, not the agent, writes dogfood-run.json.",
    ],
    workflow_steps: [
      "Start from the narrow resumed slice instead of re-exploring the whole project.",
      "Inspect the target implementation and targeted test.",
      "Make the smallest behavior fix that satisfies the resumed acceptance check.",
      "Run only the targeted validation and record the exact action/tool events.",
    ],
  },
  external_probe_handoff_next_day: {
    title: "External probe next-day handoff resume validation",
    task_family: "handoff_resume",
    task_prompt: "Resume yesterday's payment webhook repair from the stored handoff and run the narrow verification.",
    target_files: ["src/webhook.mjs", "tests/webhook.test.mjs"],
    next_action: "Use the handoff target, repair the webhook behavior, then run the targeted webhook test.",
    acceptance_checks: ["npm test -- tests/webhook.test.mjs"],
    lifecycle_constraints: [
      "handoff_target_scope_only",
      "targeted_validation_required",
    ],
    authority_boundary: [
      "The stored handoff is authoritative only for the declared target and acceptance check.",
      "The collection harness, not the agent, writes dogfood-run.json.",
    ],
    workflow_steps: [
      "Use the handoff target and acceptance check before broad exploration.",
      "Inspect webhook behavior and its narrow test.",
      "Apply the repair and run the targeted verification.",
      "Record whether the first action followed the handoff or wasted steps on unrelated areas.",
    ],
  },
  external_probe_agent_takeover: {
    title: "External probe second agent takeover validation",
    task_family: "agent_takeover",
    task_prompt: "Agent B takes over the search indexer repair from Agent A and must validate the same narrow slice.",
    target_files: ["src/search-indexer.mjs", "tests/search-indexer.test.mjs"],
    next_action: "Preserve the prior agent target, repair the search indexer behavior, then run the inherited targeted test.",
    acceptance_checks: ["npm test -- tests/search-indexer.test.mjs"],
    lifecycle_constraints: [
      "takeover_target_scope_only",
      "targeted_validation_required",
    ],
    authority_boundary: [
      "Agent takeover context is authoritative only for the inherited target and validation path.",
      "The collection harness, not the agent, writes dogfood-run.json.",
    ],
    workflow_steps: [
      "Treat this as a takeover task: preserve the prior target and validation path.",
      "Inspect only the indexer implementation and targeted test unless evidence forces expansion.",
      "Repair the search indexer behavior and run the narrow validation.",
      "Record actual takeover actions and any retries or wasted exploration.",
    ],
  },
  external_probe_ai_code_ci_repair: {
    title: "External probe AI code CI/test repair",
    task_family: "ai_code_ci_repair",
    task_prompt: "Repair an almost-right AI-generated pricing patch so the targeted CI test passes without broad unrelated edits.",
    target_files: ["src/pricing/discount.mjs", "tests/pricing/discount.test.mjs"],
    next_action: "Inspect the failing targeted test, repair src/pricing/discount.mjs, then run npm test -- tests/pricing/discount.test.mjs before declaring success.",
    acceptance_checks: ["npm test -- tests/pricing/discount.test.mjs"],
    lifecycle_constraints: [
      "targeted_validation_required",
      "avoid_unrelated_file_changes",
      "verifier_backed_success_required",
    ],
    authority_boundary: [
      "A plausible AI-generated patch is not authoritative until the targeted test passes.",
      "The collection harness, not the agent, writes dogfood-run.json.",
    ],
    workflow_steps: [
      "Start from the failing targeted test instead of broad repository exploration.",
      "Inspect src/pricing/discount.mjs and tests/pricing/discount.test.mjs.",
      "Repair the pricing behavior while avoiding unrelated files.",
      "Run npm test -- tests/pricing/discount.test.mjs and record the exact action/tool events.",
    ],
  },
};

function tail(value: string, limit = OutputTailLimit): string {
  return value.length <= limit ? value : value.slice(value.length - limit);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function shellQuoteForPrompt(value: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function formatCommandTail(label: string, value: string): string {
  const trimmed = value.trim();
  return `${label}:\n${trimmed || "<empty>"}`;
}

function actionEventCount(events: RealAbLiveEvidenceEventDraft[] | RealAbTraceEvent[]): number {
  return events.filter((event) => event.kind === "action" || event.kind === "tool_call").length;
}

function assertPacketMode(mode: RealAbLlmPacketMode): RealAbLlmPacketMode {
  if (mode === "contract_only" || mode === "workflow_expanded") return mode;
  throw new Error(`unsupported packet mode: ${mode}`);
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

function eventCommand(event: RealAbLiveEvidenceEventDraft | RealAbTraceEvent): string {
  const command = (event as { command?: unknown }).command;
  return typeof command === "string" ? command : "";
}

function isHarnessVerifierCommand(command: string): boolean {
  return /\blite-runtime-dogfood-external-probe\.ts\b/.test(command)
    || /\bab:evidence:(live|event|arm|status)\b/.test(command);
}

function assertNoAgentHarnessVerifier(events: RealAbLiveEvidenceEventDraft[] | RealAbTraceEvent[]): void {
  const offending = events.find((event) => isHarnessVerifierCommand(eventCommand(event)));
  if (offending) {
    throw new Error([
      "agent command invoked the A/B harness verifier directly; the collection harness must run verifier commands outside the agent attempt",
      `offending_command=${eventCommand(offending)}`,
    ].join("\n"));
  }
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
  workspace_root?: string;
  packet_mode?: RealAbLlmPacketMode;
}): string {
  assertArm(args.arm);
  const packetMode = assertPacketMode(args.packet_mode ?? "contract_only");
  const armManifest = manifestArm({ manifest: args.manifest, arm: args.arm });
  if (args.manifest.task_ids && !args.manifest.task_ids.includes(args.probe_id)) {
    throw new Error(`probe ${args.probe_id} is not selected in manifest.task_ids`);
  }
  const packet = buildRealAbLiveEvidenceArmRunPacket({
    manifest: args.manifest,
    manifest_path: args.manifest_path,
    arm: args.arm,
  });
  const brief = probeTaskBriefs[args.probe_id];
  if (!brief) {
    throw new Error(`unsupported probe task brief: ${args.probe_id}`);
  }
  const supportsWorkspaceVerifier = args.probe_id === "external_probe_deploy_hook_web"
    || args.probe_id === "external_probe_ai_code_ci_repair";
  const dogfoodCommand = supportsWorkspaceVerifier && args.workspace_root
    ? `${packet.dogfood_command} --workspace-root ${shellQuoteForPrompt(path.resolve(args.workspace_root))}`
    : packet.dogfood_command;
  const commonHeader = [
    "You are executing one arm of an Aionis real A/B live-evidence run.",
    "",
    `Suite: ${args.manifest.suite_id}`,
    `Arm: ${args.arm}`,
    `Probe: ${args.probe_id}`,
    `Packet mode: ${packetMode}`,
    `Memory mode: ${armManifest.memory_mode}`,
    `Authority level: ${armManifest.authority_level}`,
    `Packet source: ${armManifest.packet_source}`,
    "",
    "Fairness requirements:",
    `- same_model=${args.manifest.fairness.same_model}`,
    `- same_time_budget=${args.manifest.fairness.same_time_budget}`,
    `- same_tool_permissions=${args.manifest.fairness.same_tool_permissions}`,
    `- same_environment_reset=${args.manifest.fairness.same_environment_reset}`,
    `- same_verifier=${args.manifest.fairness.same_verifier}`,
    "",
  ];
  const contractOnlyBody = [
    "Runtime contract:",
    `- task_family: ${brief.task_family}`,
    `- task_prompt: ${brief.task_prompt}`,
    `- target_files: ${brief.target_files.join(", ")}`,
    `- next_action: ${brief.next_action}`,
    `- acceptance_checks: ${brief.acceptance_checks.join(" | ")}`,
    `- lifecycle_constraints: ${brief.lifecycle_constraints.join(" | ")}`,
    `- authority_boundary: ${brief.authority_boundary.join(" | ")}`,
    "",
    "Verifier boundary:",
    "The collection harness runs the full dogfood verifier after the agent attempt.",
    "Do not invoke the external dogfood verifier, run evidence-recorder scripts, or write dogfood/evidence artifacts from inside the agent attempt.",
    "Run only narrow local checks needed to make the target files correct.",
  ];
  const workflowExpandedBody = [
    "Probe task:",
    `- title: ${brief.title}`,
    `- task_family: ${brief.task_family}`,
    `- task_prompt: ${brief.task_prompt}`,
    `- target_files: ${brief.target_files.join(", ")}`,
    `- next_action: ${brief.next_action}`,
    `- acceptance_checks: ${brief.acceptance_checks.join(" | ")}`,
    `- lifecycle_constraints: ${brief.lifecycle_constraints.join(" | ")}`,
    `- authority_boundary: ${brief.authority_boundary.join(" | ")}`,
    "",
    "Expected workflow:",
    ...brief.workflow_steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "Harness verifier:",
    "After the agent attempt, the collection harness can run this dogfood probe command to produce dogfood-run.json.",
    "The agent may run narrower checks while working, but should not fake or pre-fill harness verifier evidence.",
    dogfoodCommand,
  ];
  return [
    ...commonHeader,
    ...(packetMode === "contract_only" ? contractOnlyBody : workflowExpandedBody),
    "",
    "Evidence recording contract:",
    "Return the actual events as JSON in stdout. The runner, not the agent, persists those events after the command exits.",
    "Do not run `npm run ab:evidence:event`, do not write `agent-events.json`, and do not mutate the live evidence bundle directly.",
    "",
    "Guardrails:",
    ...packet.guardrails.map((guardrail) => `- ${guardrail}`),
    "- The external agent must not call the event recorder or edit event artifact files; direct evidence writes invalidate the run.",
    "- The external agent must not call the dogfood harness verifier; full verification is performed by the collection harness after this attempt.",
    "- Service lifecycle tasks must use headless portable process management. Avoid launchctl, GUI terminals, OS login-session managers, and any verifier path that only works while the agent shell is alive.",
    "- Prefer: `nohup <command> > /tmp/<task>.log 2>&1 < /dev/null & echo $!` followed by a new-shell curl/probe loop.",
    "",
    "Output contract:",
    "Return only JSON with output_version=\"aionis_real_ab_llm_agent_output_v1\".",
    "Include the actual action/tool events you performed for this probe.",
    "If an event kind is `tool_call`, include the exact shell command in `command`; otherwise use kind `action` with explanatory text.",
    "Do not record the external dogfood verifier as an agent event.",
    "Every event must be something that happened in this arm; do not infer events from the task brief.",
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
  packet_mode?: RealAbLlmPacketMode;
  allow_agent_verifier?: boolean;
}): Promise<RealAbLlmArmAttemptResult> {
  assertArm(args.arm);
  const armManifest = manifestArm({ manifest: args.manifest, arm: args.arm });
  const packetMode = assertPacketMode(args.packet_mode ?? "contract_only");
  const prompt = buildRealAbLlmArmPrompt({
    manifest: args.manifest,
    manifest_path: args.manifest_path,
    arm: args.arm,
    probe_id: args.probe_id,
    workspace_root: args.cwd,
    packet_mode: packetMode,
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
      AIONIS_AB_PACKET_MODE: packetMode,
      AIONIS_AB_MANIFEST_PATH: path.resolve(args.manifest_path),
      ...(args.cwd ? { AIONIS_AB_WORKSPACE_ROOT: path.resolve(args.cwd) } : {}),
    },
  });
  if (commandResult.timed_out || commandResult.exit_code !== 0) {
    throw new Error([
      `LLM command failed for ${args.arm}/${args.probe_id}: exit_code=${commandResult.exit_code ?? "null"} timed_out=${commandResult.timed_out}`,
      formatCommandTail("stdout_tail", commandResult.stdout_tail),
      formatCommandTail("stderr_tail", commandResult.stderr_tail),
    ].join("\n"));
  }
  let parsedOutput: RealAbLlmAgentOutput;
  try {
    parsedOutput = parseRealAbLlmAgentOutput(commandResult.stdout_full, args.probe_id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error([
      `LLM command output was invalid for ${args.arm}/${args.probe_id}: ${message}`,
      formatCommandTail("stdout_tail", tail(commandResult.stdout_full)),
      formatCommandTail("stderr_tail", commandResult.stderr_tail),
    ].join("\n"));
  }
  const eventsByProbe = normalizeEventsByProbeId(parsedOutput, args.probe_id);
  const events = (eventsByProbe[args.probe_id] ?? []).map((event) => finalizeRealAbLiveEvidenceEvent(event));
  if (!args.allow_agent_verifier) {
    assertNoAgentHarnessVerifier(events);
  }
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

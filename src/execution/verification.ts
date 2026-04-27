import { spawn } from "node:child_process";
import { z } from "zod";
import { ExecutionPacketV1Schema, type ExecutionPacketV1 } from "./types.js";

const StringList = z.array(z.string().trim().min(1).max(512)).max(64).default([]);
const OutputTailLimit = 4096;

export const RuntimeVerificationBoundarySchema = z.enum([
  "runtime_orchestrator",
  "external_verifier",
]);
export type RuntimeVerificationBoundary = z.infer<typeof RuntimeVerificationBoundarySchema>;

export const RuntimeVerificationRequestV1Schema = z.object({
  version: z.literal(1),
  verifier_id: z.string().trim().min(1).max(128),
  command: z.string().trim().min(1).max(4096),
  cwd: z.string().trim().min(1).nullable().default(null),
  timeout_ms: z.number().int().positive().max(300_000).default(30_000),
  fresh_shell: z.boolean().default(true),
  after_agent_exit: z.boolean().default(false),
  external_visibility_required: z.boolean().default(false),
  validation_boundary: RuntimeVerificationBoundarySchema.default("runtime_orchestrator"),
  evidence_refs: StringList,
}).strict();
export type RuntimeVerificationRequestV1 = z.infer<typeof RuntimeVerificationRequestV1Schema>;

export const RuntimeVerificationCommandResultV1Schema = z.object({
  exit_code: z.number().int().nullable(),
  timed_out: z.boolean(),
  stdout_tail: z.string(),
  stderr_tail: z.string(),
  duration_ms: z.number().int().nonnegative(),
  success: z.boolean(),
}).strict();
export type RuntimeVerificationCommandResultV1 = z.infer<typeof RuntimeVerificationCommandResultV1Schema>;

export const RuntimeVerifierExecutionEvidenceV1Schema = z.object({
  schema_version: z.literal("execution_evidence_v1"),
  validation_passed: z.boolean().nullable(),
  after_exit_revalidated: z.boolean().nullable(),
  fresh_shell_probe_passed: z.boolean().nullable(),
  validation_boundary: z.enum(["runtime_orchestrator", "external_verifier"]),
  failure_reason: z.string().trim().min(1).max(256).nullable(),
  false_confidence_detected: z.boolean(),
  evidence_refs: StringList,
}).strict();
export type RuntimeVerifierExecutionEvidenceV1 = z.infer<typeof RuntimeVerifierExecutionEvidenceV1Schema>;

export const RuntimeVerificationResultV1Schema = z.object({
  result_version: z.literal("runtime_verification_result_v1"),
  request: RuntimeVerificationRequestV1Schema,
  command_result: RuntimeVerificationCommandResultV1Schema,
  execution_evidence_v1: RuntimeVerifierExecutionEvidenceV1Schema,
}).strict();
export type RuntimeVerificationResultV1 = z.infer<typeof RuntimeVerificationResultV1Schema>;

function tail(value: string, limit = OutputTailLimit): string {
  return value.length <= limit ? value : value.slice(value.length - limit);
}

function uniqueStrings(values: string[], limit = 64): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= limit) break;
  }
  return out;
}

function verifierId(...parts: string[]): string {
  const normalized = parts
    .join(":")
    .replace(/[^a-zA-Z0-9:_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return (normalized || "runtime_verifier").slice(0, 128);
}

function commandLooksExternal(command: string): boolean {
  return /\b(curl|wget|nc)\b|https?:\/\/|localhost|127\.0\.0\.1/i.test(command);
}

export function buildRuntimeVerificationRequestsFromPacketV1(
  input: ExecutionPacketV1 | z.input<typeof ExecutionPacketV1Schema>,
  options: {
    includePendingValidations?: boolean;
    validationBoundary?: RuntimeVerificationBoundary;
    timeoutMs?: number;
  } = {},
): RuntimeVerificationRequestV1[] {
  const packet = ExecutionPacketV1Schema.parse(input);
  const validationBoundary = options.validationBoundary ?? "runtime_orchestrator";
  const timeoutMs = options.timeoutMs ?? 30_000;
  const out: RuntimeVerificationRequestV1[] = [];
  const seenCommands = new Set<string>();

  for (const [constraintIndex, constraint] of packet.service_lifecycle_constraints.entries()) {
    const commands = constraint.health_checks.length > 0 ? constraint.health_checks : [];
    for (const [commandIndex, command] of commands.entries()) {
      if (seenCommands.has(command)) continue;
      seenCommands.add(command);
      out.push(RuntimeVerificationRequestV1Schema.parse({
        version: 1,
        verifier_id: verifierId(packet.state_id, constraint.label, String(constraintIndex), String(commandIndex)),
        command,
        timeout_ms: timeoutMs,
        fresh_shell: constraint.revalidate_from_fresh_shell || constraint.must_survive_agent_exit,
        after_agent_exit: constraint.must_survive_agent_exit,
        external_visibility_required: Boolean(constraint.endpoint) || commandLooksExternal(command),
        validation_boundary: validationBoundary,
        evidence_refs: uniqueStrings([
          `execution_packet:${packet.state_id}`,
          `service_lifecycle:${constraint.label}`,
          constraint.endpoint ? `endpoint:${constraint.endpoint}` : "",
          ...packet.evidence_refs,
        ]),
      }));
    }
  }

  if (options.includePendingValidations !== false) {
    for (const [index, command] of packet.pending_validations.entries()) {
      if (seenCommands.has(command)) continue;
      seenCommands.add(command);
      out.push(RuntimeVerificationRequestV1Schema.parse({
        version: 1,
        verifier_id: verifierId(packet.state_id, "pending_validation", String(index)),
        command,
        timeout_ms: timeoutMs,
        fresh_shell: true,
        after_agent_exit: false,
        external_visibility_required: commandLooksExternal(command),
        validation_boundary: validationBoundary,
        evidence_refs: uniqueStrings([
          `execution_packet:${packet.state_id}`,
          `pending_validation:${index}`,
          ...packet.evidence_refs,
        ]),
      }));
    }
  }

  return out;
}

function failureReasonFor(result: RuntimeVerificationCommandResultV1): string | null {
  if (result.success) return null;
  if (result.timed_out) return "runtime_verifier_timeout";
  return `runtime_verifier_exit_code_${result.exit_code ?? "null"}`;
}

export function buildRuntimeVerifierExecutionEvidenceV1(args: {
  request: RuntimeVerificationRequestV1 | z.input<typeof RuntimeVerificationRequestV1Schema>;
  commandResult: RuntimeVerificationCommandResultV1 | z.input<typeof RuntimeVerificationCommandResultV1Schema>;
  agentClaimedSuccess?: boolean;
  failureReason?: string | null;
}): RuntimeVerifierExecutionEvidenceV1 {
  const request = RuntimeVerificationRequestV1Schema.parse(args.request);
  const commandResult = RuntimeVerificationCommandResultV1Schema.parse(args.commandResult);
  return RuntimeVerifierExecutionEvidenceV1Schema.parse({
    schema_version: "execution_evidence_v1",
    validation_passed: commandResult.success,
    after_exit_revalidated: request.after_agent_exit ? commandResult.success : null,
    fresh_shell_probe_passed: request.fresh_shell ? commandResult.success : null,
    validation_boundary: request.validation_boundary,
    failure_reason: args.failureReason ?? failureReasonFor(commandResult),
    false_confidence_detected: args.agentClaimedSuccess === true && !commandResult.success,
    evidence_refs: uniqueStrings([
      `runtime_verifier:${request.verifier_id}`,
      `runtime_verifier_command:${request.command}`,
      request.after_agent_exit ? "runtime_verifier:after_agent_exit" : "",
      request.fresh_shell ? "runtime_verifier:fresh_shell" : "",
      request.external_visibility_required ? "runtime_verifier:external_visibility" : "",
      ...request.evidence_refs,
    ]),
  });
}

export function buildRuntimeVerificationResultV1(args: {
  request: RuntimeVerificationRequestV1 | z.input<typeof RuntimeVerificationRequestV1Schema>;
  commandResult: RuntimeVerificationCommandResultV1 | z.input<typeof RuntimeVerificationCommandResultV1Schema>;
  agentClaimedSuccess?: boolean;
  failureReason?: string | null;
}): RuntimeVerificationResultV1 {
  const request = RuntimeVerificationRequestV1Schema.parse(args.request);
  const commandResult = RuntimeVerificationCommandResultV1Schema.parse(args.commandResult);
  return RuntimeVerificationResultV1Schema.parse({
    result_version: "runtime_verification_result_v1",
    request,
    command_result: commandResult,
    execution_evidence_v1: buildRuntimeVerifierExecutionEvidenceV1({
      request,
      commandResult,
      agentClaimedSuccess: args.agentClaimedSuccess,
      failureReason: args.failureReason,
    }),
  });
}

export async function runRuntimeVerifierCommandV1(
  input: RuntimeVerificationRequestV1 | z.input<typeof RuntimeVerificationRequestV1Schema>,
  options: {
    shellPath?: string;
    agentClaimedSuccess?: boolean;
  } = {},
): Promise<RuntimeVerificationResultV1> {
  const request = RuntimeVerificationRequestV1Schema.parse(input);
  const shellPath = options.shellPath ?? process.env.SHELL ?? "/bin/sh";
  const startedAt = Date.now();
  let stdout = "";
  let stderr = "";
  let timedOut = false;

  const commandResult = await new Promise<RuntimeVerificationCommandResultV1>((resolve) => {
    const child = spawn(shellPath, ["-lc", request.command], {
      cwd: request.cwd ?? process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, request.timeout_ms);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout = tail(stdout + chunk);
    });
    child.stderr.on("data", (chunk: string) => {
      stderr = tail(stderr + chunk);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      const durationMs = Math.max(0, Date.now() - startedAt);
      resolve(RuntimeVerificationCommandResultV1Schema.parse({
        exit_code: timedOut ? null : code,
        timed_out: timedOut,
        stdout_tail: stdout,
        stderr_tail: stderr,
        duration_ms: durationMs,
        success: !timedOut && code === 0,
      }));
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      const durationMs = Math.max(0, Date.now() - startedAt);
      resolve(RuntimeVerificationCommandResultV1Schema.parse({
        exit_code: null,
        timed_out: timedOut,
        stdout_tail: stdout,
        stderr_tail: tail(stderr + error.message),
        duration_ms: durationMs,
        success: false,
      }));
    });
  });

  return buildRuntimeVerificationResultV1({
    request,
    commandResult,
    agentClaimedSuccess: options.agentClaimedSuccess,
  });
}

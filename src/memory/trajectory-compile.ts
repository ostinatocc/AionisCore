import stableStringify from "fast-json-stable-stringify";
import { sha256Hex } from "../util/crypto.js";
import {
  ServiceLifecycleConstraintV1Schema,
  type ServiceLifecycleConstraintV1,
} from "../execution/types.js";
import {
  TrajectoryCompileRequest,
  TrajectoryCompileResponseSchema,
  TrajectoryCompileStepSchema,
  type TrajectoryCompileInput,
  type TrajectoryCompileResponse,
} from "./schemas.js";

const NOISE_PATTERNS = [
  "can't fully execute",
  "cannot fully execute",
  "can't execute",
  "cannot execute",
  "unable to execute",
  "not installed here",
  "isn't installed here",
  "in this sandbox",
  "sandbox",
  "source-level check",
  "source level check",
  "hand this over",
];

const VALIDATION_COMMAND_PATTERNS = [
  /\bpytest\b/i,
  /\bnpm\s+test\b/i,
  /\bpnpm\s+test\b/i,
  /\byarn\s+test\b/i,
  /\bcurl\b/i,
  /\bwget\b/i,
  /\bpip\s+install\b/i,
  /\bpython\s+-m\s+pytest\b/i,
  /\bgo\s+test\b/i,
  /\bcargo\s+test\b/i,
  /\bintegrity_check\b/i,
  /\bverify\b/i,
  /\bcheck\b/i,
];

const SERVICE_COMMAND_PATTERNS = [
  /\bpython\s+-m\s+http\.server\b/i,
  /\buvicorn\b/i,
  /\bgunicorn\b/i,
  /\bnginx\b/i,
  /\b(?:python|python3|node|bash|sh)\s+\S*(?:serve|server|start)\S*/i,
  /\bnpm\s+(run\s+)?start\b/i,
  /\bpnpm\s+(run\s+)?start\b/i,
  /\byarn\s+start\b/i,
  /\bserve\b/i,
  /\bdocker\s+run\b/i,
];

const DETACH_PATTERNS = [
  /\bnohup\b/i,
  /\bsetsid\b/i,
  /\bdisown\b/i,
  /\bdaemon\b/i,
  /(^|\s)&(?:\s|$)/,
];

type NormalizedStep = {
  role: string | null;
  kind: string | null;
  tool_name: string | null;
  texts: string[];
  commands: string[];
  file_paths: string[];
  urls: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

function uniqueStrings(values: Array<string | null | undefined>, limit = 64): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= limit) break;
  }
  return out;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectStrings(value: unknown, out: string[], depth = 0): void {
  if (depth > 3 || out.length >= 96 || value == null) return;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) out.push(trimmed);
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectStrings(entry, out, depth + 1);
    return;
  }
  const record = asRecord(value);
  if (!record) return;
  for (const entry of Object.values(record)) collectStrings(entry, out, depth + 1);
}

function splitCandidateLines(value: string): string[] {
  return value
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isProbablyCommand(line: string): boolean {
  if (!line) return false;
  if (line.startsWith("$ ")) return true;
  return /^(?:\.{0,2}\/)?(?:python|python3|pytest|npm|pnpm|yarn|curl|wget|pip|go|cargo|git|uv|node|bash|sh|nohup|setsid|docker|serve|nc|npx)\b/i.test(line)
    || VALIDATION_COMMAND_PATTERNS.some((pattern) => pattern.test(line))
    || SERVICE_COMMAND_PATTERNS.some((pattern) => pattern.test(line));
}

function extractFilePathsFromText(value: string): string[] {
  const sanitized = value.replace(/https?:\/\/[^\s)"']+/g, " ");
  const matches = sanitized.match(
    /(?:\/[\w@./-]+(?:\.[A-Za-z0-9_-]+)?|(?:\.{0,2}\/)?[\w@-]+(?:\/[\w@.-]+)+|\b[\w@.-]+\.[A-Za-z0-9_-]{1,16}\b)/g,
  ) ?? [];
  return uniqueStrings(
    matches
      .map((entry) => entry.replace(/[),.;:]+$/g, ""))
      .filter((entry) => entry.length > 1)
      .filter((entry) => !entry.startsWith("//"))
      .filter((entry) => !/^https?:\/\//i.test(entry))
      .filter((entry) => !/^(localhost|127\.0\.0\.1)$/i.test(entry))
      .filter((entry) => !entry.startsWith("--"))
      .filter((entry) => !new RegExp(`\\b(?:python|python3)\\s+-m\\s+${escapeRegExp(entry)}(?:\\s|$)`, "i").test(sanitized)),
    64,
  );
}

function extractUrlsFromText(value: string): string[] {
  const matches = value.match(/https?:\/\/[^\s)"']+/g) ?? [];
  return uniqueStrings(matches.map((entry) => entry.replace(/[),.;:]+$/g, "")), 32);
}

function normalizeStep(step: unknown): NormalizedStep {
  const parsed = TrajectoryCompileStepSchema.parse(step);
  const rawStrings: string[] = [];
  collectStrings(parsed.tool_input, rawStrings);
  collectStrings(parsed.observation, rawStrings);
  collectStrings(parsed.result, rawStrings);
  const directStrings = [
    parsed.title,
    parsed.text,
    parsed.content,
    parsed.summary,
    parsed.command,
    ...rawStrings,
  ];
  const texts = uniqueStrings(directStrings.flatMap((entry) => entry ? splitCandidateLines(entry) : []), 128);
  const commands = uniqueStrings(
    [
      parsed.command,
      ...texts.filter(isProbablyCommand).map((line) => line.startsWith("$ ") ? line.slice(2).trim() : line),
    ],
    48,
  );
  const filePaths = uniqueStrings(
    [
      ...(parsed.file_paths ?? []),
      ...texts.flatMap(extractFilePathsFromText),
      ...commands.flatMap(extractFilePathsFromText),
    ],
    64,
  );
  const urls = uniqueStrings(
    [
      ...(parsed.urls ?? []),
      ...texts.flatMap(extractUrlsFromText),
      ...commands.flatMap(extractUrlsFromText),
    ],
    32,
  );
  return {
    role: firstString(parsed.role),
    kind: firstString(parsed.kind),
    tool_name: firstString(parsed.tool_name),
    texts,
    commands,
    file_paths: filePaths,
    urls,
  };
}

function inferTaskFamily(queryText: string, steps: NormalizedStep[], explicitTaskFamily?: string | null): string | null {
  const explicit = firstString(explicitTaskFamily);
  if (explicit) return explicit;
  const corpus = `${queryText}\n${steps.flatMap((step) => [...step.texts, ...step.commands]).join("\n")}`.toLowerCase();
  if ((/\bgit\b/.test(corpus) && /\b(webserver|hook|deploy|nginx|publish)\b/.test(corpus))) return "git_deploy_webserver";
  if ((/\b(pypi|pip install|package index|wheel|simple\/)\b/.test(corpus))) return "package_publish_validate";
  if ((/\b(sqlite|database|db|wal|integrity_check|truncate)\b/.test(corpus))) return "database_recovery";
  if ((/\b(server|service|localhost|127\.0\.0\.1|http:\/\/|https:\/\/)\b/.test(corpus) && /\b(validate|verify|publish|serve|install)\b/.test(corpus))) {
    return "service_publish_validate";
  }
  const tokens = uniqueStrings(
    queryText
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 4)
      .slice(0, 4),
    4,
  );
  return tokens.length > 0 ? `task_${tokens.join("_")}` : null;
}

function inferLikelyTool(steps: NormalizedStep[]): string | null {
  const toolCounts = new Map<string, number>();
  for (const step of steps) {
    const tool = step.tool_name ?? (step.commands.length > 0 ? "bash" : null);
    if (!tool) continue;
    toolCounts.set(tool, (toolCounts.get(tool) ?? 0) + 1);
  }
  return Array.from(toolCounts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}

function extractAcceptanceChecks(steps: NormalizedStep[], hintChecks: string[] = []): string[] {
  return uniqueStrings(
    [
      ...hintChecks,
      ...steps.flatMap((step) => step.commands.filter((command) => VALIDATION_COMMAND_PATTERNS.some((pattern) => pattern.test(command)))),
    ],
    24,
  );
}

function extractWorkflowSteps(steps: NormalizedStep[]): string[] {
  return uniqueStrings(
    steps.flatMap((step) => {
      if (step.commands.length > 0) return step.commands;
      return step.texts.filter((line) => !NOISE_PATTERNS.some((pattern) => line.toLowerCase().includes(pattern))).slice(0, 1);
    }),
    16,
  );
}

function extractNoiseMarkers(steps: NormalizedStep[]): string[] {
  const out: string[] = [];
  for (const step of steps) {
    for (const text of step.texts) {
      const lowered = text.toLowerCase();
      for (const pattern of NOISE_PATTERNS) {
        if (lowered.includes(pattern)) out.push(pattern);
      }
    }
  }
  return uniqueStrings(out, 16);
}

function extractServiceLifecycleConstraints(steps: NormalizedStep[], acceptanceChecks: string[]): ServiceLifecycleConstraintV1[] {
  const commands = steps.flatMap((step) => step.commands);
  const urls = uniqueStrings(steps.flatMap((step) => step.urls), 16);
  const serviceCommands = commands.filter((command) => SERVICE_COMMAND_PATTERNS.some((pattern) => pattern.test(command)));
  const hasLaunchEvidence = serviceCommands.length > 0;
  if (!hasLaunchEvidence) return [];
  const launchReference = serviceCommands[0] ?? null;
  const endpoint = urls.find((url) => /localhost|127\.0\.0\.1/i.test(url)) ?? null;
  const hasDetach = commands.some((command) => DETACH_PATTERNS.some((pattern) => pattern.test(command)));
  const serviceKind: ServiceLifecycleConstraintV1["service_kind"] =
    endpoint?.startsWith("http://") || endpoint?.startsWith("https://") ? "http" : "generic";
  const healthChecks = acceptanceChecks.filter((command) => /\bcurl\b|\bwget\b|\bpip\s+install\b|\bnc\b/i.test(command));
  return [
    ServiceLifecycleConstraintV1Schema.parse({
      version: 1,
      service_kind: serviceKind,
      label: endpoint ? `service:${endpoint}` : "background_service",
      launch_reference: launchReference,
      endpoint,
      must_survive_agent_exit: true,
      revalidate_from_fresh_shell: healthChecks.length > 0 || !!endpoint,
      detach_then_probe: hasDetach || !!endpoint,
      health_checks: healthChecks,
      teardown_notes: [],
    }),
  ];
}

function extractPatternHints(args: {
  taskFamily: string | null;
  targetFiles: string[];
  acceptanceChecks: string[];
  serviceConstraints: ServiceLifecycleConstraintV1[];
  likelyTool: string | null;
}): string[] {
  const out: string[] = [];
  if (args.targetFiles.length > 0) out.push("keep_changes_scoped_to_target_files");
  if (args.acceptanceChecks.length > 0) out.push("rerun_acceptance_checks_after_changes");
  if (args.serviceConstraints.length > 0) {
    out.push("detach_long_running_service_before_validation");
    out.push("revalidate_service_from_fresh_shell");
  }
  if (args.taskFamily === "git_deploy_webserver") out.push("validate_hook_or_publish_path_before_declaring_success");
  if (args.taskFamily === "package_publish_validate") out.push("publish_then_install_from_clean_client_path");
  if (args.likelyTool) out.push(`prefer_tool:${args.likelyTool}`);
  return uniqueStrings(out, 12);
}

function synthesizeNextAction(args: {
  steps: NormalizedStep[];
  targetFiles: string[];
  acceptanceChecks: string[];
  serviceConstraints: ServiceLifecycleConstraintV1[];
}): string | null {
  for (const step of [...args.steps].reverse()) {
    for (const text of step.texts) {
      const lowered = text.toLowerCase();
      if (NOISE_PATTERNS.some((pattern) => lowered.includes(pattern))) continue;
      if (text.length < 16) continue;
      if (text.length > 400) continue;
      if (step.role === "assistant" || step.role === "system" || step.kind === "summary") return text;
    }
  }
  const target = args.targetFiles[0] ?? "the narrow target files";
  const check = args.acceptanceChecks[0] ?? null;
  if (args.serviceConstraints.length > 0 && check) {
    return `Update ${target}, relaunch the service in detached mode, and rerun ${check} from a fresh shell.`;
  }
  if (check) return `Update ${target} and rerun ${check}.`;
  if (args.targetFiles.length > 0) return `Continue on ${args.targetFiles.join(" | ")} and validate the narrowest failing slice.`;
  return null;
}

function deriveSignature(prefix: string, payload: unknown): string {
  return `${prefix}:${sha256Hex(stableStringify(payload)).slice(0, 24)}`;
}

function buildRecallKeywords(args: {
  taskFamily: string | null;
  targetFiles: string[];
  patternHints: string[];
  workflowSteps: string[];
}): string[] {
  const fileNames = args.targetFiles.map((file) => file.split("/").pop() ?? file);
  return uniqueStrings([
    args.taskFamily,
    ...fileNames,
    ...args.patternHints.map((hint) => hint.replace(/^prefer_tool:/, "")),
    ...args.workflowSteps.slice(0, 4).map((step) => step.split(/\s+/).slice(0, 3).join("_")),
  ], 12);
}

export function buildTrajectoryCompileLite(body: unknown, defaults: {
  defaultScope: string;
  defaultTenantId: string;
}): TrajectoryCompileResponse {
  const parsed: TrajectoryCompileInput = TrajectoryCompileRequest.parse(body);
  const steps = parsed.trajectory.steps.map(normalizeStep);
  const targetFiles = uniqueStrings(
    [
      ...(parsed.hints?.target_files ?? []),
      ...steps.flatMap((step) => step.file_paths),
    ],
    24,
  );
  const acceptanceChecks = extractAcceptanceChecks(steps, parsed.hints?.acceptance_checks ?? []);
  const serviceConstraints = extractServiceLifecycleConstraints(steps, acceptanceChecks);
  const likelyTool = inferLikelyTool(steps);
  const workflowSteps = extractWorkflowSteps(steps);
  const taskFamily = inferTaskFamily(parsed.query_text, steps, parsed.trajectory.task_family ?? null);
  const patternHints = extractPatternHints({
    taskFamily,
    targetFiles,
    acceptanceChecks,
    serviceConstraints,
    likelyTool,
  });
  const noiseMarkers = extractNoiseMarkers(steps);
  const nextAction = synthesizeNextAction({
    steps,
    targetFiles,
    acceptanceChecks,
    serviceConstraints,
  });
  const taskSignature = deriveSignature("trajectory_task", {
    query_text: parsed.query_text,
    task_family: taskFamily,
    target_files: targetFiles,
  });
  const workflowSignature = deriveSignature("trajectory_workflow", {
    task_family: taskFamily,
    target_files: targetFiles,
    workflow_steps: workflowSteps,
    acceptance_checks: acceptanceChecks,
  });
  const keySteps = workflowSteps.slice(0, 12);
  const recallKeywords = buildRecallKeywords({
    taskFamily,
    targetFiles,
    patternHints,
    workflowSteps,
  });

  return TrajectoryCompileResponseSchema.parse({
    summary_version: "trajectory_compile_v1",
    tenant_id: parsed.tenant_id ?? defaults.defaultTenantId,
    scope: parsed.scope ?? defaults.defaultScope,
    query_text: parsed.query_text,
    compiler_version: "trajectory_compile_v1",
    task_family: taskFamily,
    task_signature: taskSignature,
    workflow_signature: workflowSignature,
    contract: {
      target_files: targetFiles,
      acceptance_checks: acceptanceChecks,
      next_action: nextAction,
      workflow_steps: workflowSteps,
      pattern_hints: patternHints,
      likely_tool: likelyTool,
      service_lifecycle_constraints: serviceConstraints,
      noise_markers: noiseMarkers,
    },
    promotion_seed: {
      task_family: taskFamily,
      task_signature: taskSignature,
      workflow_signature: workflowSignature,
      key_steps: keySteps,
      recall_keywords: recallKeywords,
    },
    diagnostics: {
      step_count: steps.length,
      command_count: steps.reduce((sum, step) => sum + step.commands.length, 0),
      target_file_count: targetFiles.length,
      acceptance_check_count: acceptanceChecks.length,
      workflow_step_count: workflowSteps.length,
      service_constraint_count: serviceConstraints.length,
      noise_marker_count: noiseMarkers.length,
    },
  });
}

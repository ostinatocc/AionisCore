import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PLUGIN_ROOT = path.resolve(__dirname, "..");

const DEFAULT_BASE_URL = "http://127.0.0.1:3101";
const DEFAULT_TENANT_ID = "local-codex";
const DEFAULT_ACTOR = "codex";
const DEFAULT_TIMEOUT_MS = 3000;
const DEFAULT_CONTEXT_CHAR_LIMIT = 14000;

export function sha12(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex").slice(0, 12);
}

export function uuidFromText(input) {
  const hex = crypto.createHash("sha256").update(String(input)).digest("hex");
  const version = `5${hex.slice(13, 16)}`;
  const variant = `${(parseInt(hex.slice(16, 17), 16) & 0x3 | 0x8).toString(16)}${hex.slice(17, 20)}`;
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    version,
    variant,
    hex.slice(20, 32),
  ].join("-");
}

export function nowIso() {
  return new Date().toISOString();
}

export function readJsonFile(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function readStdin() {
  return new Promise((resolve, reject) => {
    let body = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      body += chunk;
    });
    process.stdin.on("error", reject);
    process.stdin.on("end", () => resolve(body));
  });
}

export async function readHookInput() {
  const raw = await readStdin();
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return { raw_stdin: trimmed };
  }
}

export function boolEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function intEnv(name, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(raw)));
}

function expandHome(value) {
  if (!value) return value;
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

export function resolveConfig(input = {}) {
  const runtimeHome = path.resolve(expandHome(process.env.AIONIS_CODEX_RUNTIME_HOME || "~/.aionis/codex"));
  const explicitCwd = input.cwd || input.working_directory || process.env.CODEX_CWD || "";
  const processCwd = process.cwd();
  const activeProject = explicitCwd ? null : readJsonFile(path.join(runtimeHome, "state", "active-project.json"), null);
  const cwdFromActiveProject = isPluginRuntimeCwd(processCwd) && typeof activeProject?.cwd === "string"
    ? activeProject.cwd
    : "";
  const cwd = path.resolve(String(explicitCwd || cwdFromActiveProject || processCwd));
  const projectName = path.basename(cwd) || "workspace";
  const projectHash = sha12(cwd).slice(0, 8);
  const scopeMode = process.env.AIONIS_CODEX_SCOPE_MODE || "project";
  const scope =
    process.env.AIONIS_CODEX_SCOPE
    || (scopeMode === "global" ? "codex:global" : `codex:${projectName}:${projectHash}`);
  const globalScope = process.env.AIONIS_CODEX_GLOBAL_SCOPE || "codex:global";
  const baseUrl = (process.env.AIONIS_BASE_URL || process.env.AIONIS_CODEX_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const port = (() => {
    try {
      return new URL(baseUrl).port || "80";
    } catch {
      return "3101";
    }
  })();

  return {
    baseUrl,
    port,
    runtimeHome,
    stateDir: path.join(runtimeHome, "state"),
    logDir: path.join(runtimeHome, "logs"),
    dataDir: path.join(runtimeHome, "data"),
    cwd,
    projectName,
    projectHash,
    tenantId: process.env.AIONIS_CODEX_TENANT_ID || process.env.AIONIS_TENANT_ID || DEFAULT_TENANT_ID,
    scope,
    globalScope,
    actor: process.env.AIONIS_CODEX_ACTOR || DEFAULT_ACTOR,
    consumerAgentId: process.env.AIONIS_CODEX_AGENT_ID || "codex",
    consumerTeamId: process.env.AIONIS_CODEX_TEAM_ID || "local",
    autostart: boolEnv("AIONIS_CODEX_AUTOSTART", true),
    timeoutMs: intEnv("AIONIS_CODEX_TIMEOUT_MS", DEFAULT_TIMEOUT_MS, 250, 30000),
    startupTimeoutMs: intEnv("AIONIS_CODEX_STARTUP_TIMEOUT_MS", 12000, 1000, 120000),
    contextCharLimit: intEnv("AIONIS_CODEX_CONTEXT_CHAR_LIMIT", DEFAULT_CONTEXT_CHAR_LIMIT, 2000, 80000),
    postToolContext: boolEnv("AIONIS_CODEX_POST_TOOL_CONTEXT", true),
    compilePlaybooks: boolEnv("AIONIS_CODEX_COMPILE_PLAYBOOKS", true),
    verbose: boolEnv("AIONIS_CODEX_VERBOSE", false),
    headers: buildRuntimeHeaders(),
  };
}

function isPluginRuntimeCwd(cwd) {
  const relative = path.relative(PLUGIN_ROOT, path.resolve(cwd));
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function buildRuntimeHeaders() {
  const headers = {};
  const apiKey = process.env.AIONIS_API_KEY || process.env.AIONIS_CODEX_API_KEY;
  const bearer = process.env.AIONIS_BEARER_TOKEN || process.env.AIONIS_CODEX_BEARER_TOKEN;
  const adminToken = process.env.AIONIS_ADMIN_TOKEN || process.env.AIONIS_CODEX_ADMIN_TOKEN;
  if (apiKey) headers["x-api-key"] = apiKey;
  if (bearer) headers.authorization = /^Bearer\s/i.test(bearer) ? bearer : `Bearer ${bearer}`;
  if (adminToken) headers["x-admin-token"] = adminToken;
  return headers;
}

function abortAfter(ms) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    clear: () => clearTimeout(timer),
  };
}

function runtimeError(message, details, cause) {
  const error = new Error(message);
  if (cause !== undefined) error.cause = cause;
  error.aionis_runtime_error = details;
  error.code = details.code;
  error.category = details.category;
  error.status = details.status;
  error.method = details.method;
  error.routePath = details.route_path;
  error.durationMs = details.duration_ms;
  error.timeoutMs = details.timeout_ms;
  error.payload = details.payload;
  return error;
}

function runtimeErrorDetails(args) {
  return {
    code: args.code,
    category: args.category,
    method: args.method,
    route_path: args.routePath,
    status: args.status,
    duration_ms: Math.max(0, Math.round(args.durationMs)),
    timeout_ms: args.timeoutMs,
    message: args.message,
    payload: args.payload,
  };
}

export async function runtimeRequest(config, method, routePath, payloadOrQuery) {
  const url = new URL(`${config.baseUrl}${routePath}`);
  const options = {
    method,
    headers: { ...config.headers },
  };
  if (method === "GET") {
    for (const [key, value] of Object.entries(payloadOrQuery || {})) {
      if (value === undefined) continue;
      const values = Array.isArray(value) ? value : [value];
      for (const item of values) {
        if (item !== undefined) url.searchParams.append(key, item === null ? "" : String(item));
      }
    }
  } else {
    options.headers["content-type"] = "application/json";
    options.body = JSON.stringify(payloadOrQuery || {});
  }

  const startedAt = performance.now();
  const abort = abortAfter(config.timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: abort.signal });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch (error) {
      const details = runtimeErrorDetails({
        code: "runtime_response_parse_error",
        category: "response_parse",
        method,
        routePath,
        durationMs: performance.now() - startedAt,
        timeoutMs: config.timeoutMs,
        message: `invalid JSON response from Aionis Runtime: ${String(error.message || error)}`,
      });
      throw runtimeError(`Aionis Runtime ${method} ${routePath} returned invalid JSON`, details, error);
    }
    if (!response.ok) {
      const message = body && typeof body === "object" ? body.message || body.error || response.statusText : response.statusText;
      const details = runtimeErrorDetails({
        code: `runtime_http_${response.status}`,
        category: "http",
        method,
        routePath,
        status: response.status,
        durationMs: performance.now() - startedAt,
        timeoutMs: config.timeoutMs,
        message: `${response.status} ${message}`,
        payload: body,
      });
      throw runtimeError(`Aionis Runtime ${method} ${routePath} failed: ${details.message}`, details);
    }
    return body;
  } catch (error) {
    if (error?.aionis_runtime_error) throw error;
    const durationMs = performance.now() - startedAt;
    const aborted = error?.name === "AbortError" || abort.timedOut();
    const category = aborted ? "timeout" : error instanceof TypeError ? "network" : "request";
    const code = aborted ? "runtime_request_timeout" : category === "network" ? "runtime_network_error" : "runtime_request_error";
    const message = aborted
      ? `timed out after ${config.timeoutMs}ms`
      : String(error?.message || error);
    const details = runtimeErrorDetails({
      code,
      category,
      method,
      routePath,
      durationMs,
      timeoutMs: config.timeoutMs,
      message,
    });
    throw runtimeError(`Aionis Runtime ${method} ${routePath} ${message}`, details, error);
  } finally {
    abort.clear();
  }
}

export async function runtimeGet(config, routePath, query) {
  return runtimeRequest(config, "GET", routePath, query);
}

export async function runtimePost(config, routePath, payload) {
  return runtimeRequest(config, "POST", routePath, payload);
}

export async function runtimeHealth(config) {
  return runtimeGet(config, "/health", {});
}

function candidateRuntimeCommands() {
  const explicit = process.env.AIONIS_CODEX_RUNTIME_COMMAND;
  if (explicit) return [{ kind: "shell", command: explicit }];

  const candidates = [];
  let cursor = PLUGIN_ROOT;
  for (let i = 0; i < 6; i += 1) {
    const binPath = path.join(cursor, "packages", "aionis-runtime", "bin", "aionis-runtime");
    if (fs.existsSync(binPath) && canResolveFrom(binPath, "tsx/cli")) {
      candidates.push({ kind: "spawn", command: process.execPath, args: [binPath, "start"] });
      break;
    }
    const next = path.dirname(cursor);
    if (next === cursor) break;
    cursor = next;
  }

  candidates.push({ kind: "spawn", command: "aionis-runtime", args: ["start"] });
  candidates.push({ kind: "spawn", command: "npx", args: ["--yes", "@ostinato/aionis-runtime@latest", "start"] });
  return candidates;
}

function canResolveFrom(fromFile, request) {
  try {
    createRequire(fromFile).resolve(request);
    return true;
  } catch {
    return false;
  }
}

function spawnRuntimeProcess(config, candidate) {
  fs.mkdirSync(config.logDir, { recursive: true });
  fs.mkdirSync(config.dataDir, { recursive: true });
  const outPath = path.join(config.logDir, "runtime.out.log");
  const errPath = path.join(config.logDir, "runtime.err.log");
  const out = fs.openSync(outPath, "a");
  const err = fs.openSync(errPath, "a");
  const env = {
    ...process.env,
    PORT: config.port,
    AIONIS_EDITION: "lite",
    AIONIS_MODE: "local",
    APP_ENV: process.env.APP_ENV || "dev",
    AIONIS_LISTEN_HOST: "127.0.0.1",
    MEMORY_AUTH_MODE: "off",
    TENANT_QUOTA_ENABLED: "false",
    RATE_LIMIT_BYPASS_LOOPBACK: "true",
    MEMORY_SCOPE: config.scope,
    MEMORY_TENANT_ID: config.tenantId,
    LITE_REPLAY_SQLITE_PATH: path.join(config.dataDir, "aionis-lite-replay.sqlite"),
    LITE_WRITE_SQLITE_PATH: path.join(config.dataDir, "aionis-lite-write.sqlite"),
    LITE_LOCAL_ACTOR_ID: config.actor,
  };
  const cwd = process.env.AIONIS_CODEX_RUNTIME_CWD || config.dataDir;

  const child = candidate.kind === "shell"
    ? spawn("/bin/sh", ["-lc", candidate.command], { cwd, env, detached: true, stdio: ["ignore", out, err] })
    : spawn(candidate.command, candidate.args || [], { cwd, env, detached: true, stdio: ["ignore", out, err] });

  child.unref();
  writeJsonFile(path.join(config.stateDir, "runtime-process.json"), {
    pid: child.pid,
    started_at: nowIso(),
    command: candidate.kind === "shell" ? candidate.command : [candidate.command, ...(candidate.args || [])].join(" "),
    cwd,
    base_url: config.baseUrl,
    stdout: outPath,
    stderr: errPath,
  });
  return child;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function terminateRuntimeProcessGroup(child) {
  try {
    if (process.platform !== "win32" && child.pid) {
      process.kill(-child.pid, "SIGTERM");
      return;
    }
  } catch {
    // Fall through to the direct child kill below.
  }
  try {
    if (!child.killed) child.kill("SIGTERM");
  } catch {
    // Ignore cleanup failures. The health timeout is the actionable error.
  }
}

async function waitForRuntimeHealth(config, child, timeoutMs) {
  let lastError = null;
  let processError = null;
  let processExit = null;

  child.once("error", (error) => {
    processError = error;
  });
  child.once("exit", (code, signal) => {
    processExit = { code, signal };
  });

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (processError) throw processError;
    try {
      return await runtimeHealth(config);
    } catch (error) {
      lastError = error;
    }
    if (processExit) {
      const error = new Error(`Aionis Runtime process exited before health check passed: code=${processExit.code ?? "null"} signal=${processExit.signal ?? "null"}`);
      error.cause = lastError;
      throw error;
    }
    await sleep(350);
  }

  terminateRuntimeProcessGroup(child);

  const error = new Error(`Aionis Runtime did not become healthy at ${config.baseUrl}`);
  error.cause = lastError;
  throw error;
}

export async function ensureRuntime(config) {
  try {
    return { ok: true, started: false, health: await runtimeHealth(config) };
  } catch (firstError) {
    if (!config.autostart) {
      return { ok: false, started: false, error: firstError };
    }
  }

  let spawnError = null;
  for (const candidate of candidateRuntimeCommands()) {
    try {
      const child = spawnRuntimeProcess(config, candidate);
      const health = await waitForRuntimeHealth(config, child, config.startupTimeoutMs);
      return { ok: true, started: true, health };
    } catch (error) {
      spawnError = error;
    }
  }
  return { ok: false, started: false, error: spawnError || new Error("No Aionis Runtime start command could be launched") };
}

export function getSessionId(input = {}) {
  return String(
    input.session_id
    || input.sessionId
    || input.conversation_id
    || input.conversationId
    || input.thread_id
    || input.threadId
    || process.env.CODEX_SESSION_ID
    || "codex-session"
  );
}

export function getTurnId(input = {}) {
  return String(
    input.turn_id
    || input.turnId
    || input.request_id
    || input.requestId
    || input.prompt_id
    || input.promptId
    || `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`
  );
}

export function statePath(config, sessionId) {
  return path.join(config.stateDir, "sessions", `${safeFileName(sessionId)}.json`);
}

function safeFileName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "session";
}

export function loadState(config, sessionId) {
  return readJsonFile(statePath(config, sessionId), {
    session_id: sessionId,
    created_at: nowIso(),
    turns: {},
    active_turn_id: null,
    active_run_id: null,
    next_step_index: 1,
    steps: {},
  });
}

export function saveState(config, sessionId, state) {
  writeJsonFile(statePath(config, sessionId), {
    ...state,
    updated_at: nowIso(),
  });
}

export function recordActiveProject(config, source = "hook") {
  writeJsonFile(path.join(config.stateDir, "active-project.json"), {
    cwd: config.cwd,
    project_name: config.projectName,
    project_hash: config.projectHash,
    scope: config.scope,
    global_scope: config.globalScope,
    tenant_id: config.tenantId,
    source,
    updated_at: nowIso(),
  });
}

export function commonRuntimeFields(config) {
  return {
    tenant_id: config.tenantId,
    scope: config.scope,
    actor: config.actor,
    consumer_agent_id: config.consumerAgentId,
    consumer_team_id: config.consumerTeamId,
    memory_lane: "private",
    producer_agent_id: config.consumerAgentId,
    owner_agent_id: config.consumerAgentId,
    owner_team_id: config.consumerTeamId,
  };
}

export function extractPrompt(input = {}) {
  const candidates = [
    input.prompt,
    input.user_prompt,
    input.userPrompt,
    input.message,
    input.user_message,
    input.userMessage,
    input.input,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
}

export function extractHookEventName(input = {}) {
  return String(
    input.hook_event_name
    || input.hookEventName
    || input.event
    || input.event_name
    || input.eventName
    || process.env.CODEX_HOOK_EVENT_NAME
    || ""
  );
}

export function extractToolName(input = {}) {
  return String(input.tool_name || input.toolName || input.name || input.tool || "unknown_tool");
}

export function extractToolInput(input = {}) {
  return input.tool_input ?? input.toolInput ?? input.input ?? input.args ?? input.arguments ?? {};
}

export function extractToolResponse(input = {}) {
  return input.tool_response ?? input.toolResponse ?? input.response ?? input.result ?? input.output ?? {};
}

export function inferToolStatus(response) {
  if (response && typeof response === "object") {
    const record = response;
    const code = record.exit_code ?? record.exitCode ?? record.statusCode ?? record.code;
    if (typeof code === "number" && code !== 0) return "failed";
    const status = String(record.status || record.outcome || "").toLowerCase();
    if (["failed", "failure", "error"].includes(status)) return "failed";
    if (record.error || record.stderr) {
      const stderr = String(record.stderr || record.error || "");
      if (stderr.trim()) return "partial";
    }
  }
  return "success";
}

export function truncateText(value, limit = 4000) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (!text) return "";
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 80))}\n... [truncated ${text.length - limit} chars]`;
}

export function compactJson(value, limit = 3000) {
  if (value === undefined || value === null) return "";
  return truncateText(value, limit);
}

export function defaultToolCandidates() {
  return [
    "functions.exec_command",
    "functions.apply_patch",
    "functions.update_plan",
    "functions.view_image",
    "multi_tool_use.parallel",
    "web.run",
    "image_gen.imagegen",
    "mcp",
    "filesystem",
    "git",
    "npm",
    "node",
    "tsx",
    "typescript",
  ];
}

export function buildTurnRunId(sessionId, turnId) {
  return uuidFromText(`codex-run:${sessionId}:${turnId}`);
}

export function runtimeUnavailableContext(error, config) {
  const message = error ? String(error.message || error) : "unknown runtime error";
  return [
    "Aionis Runtime is configured for this Codex session, but the hook could not reach the local runtime.",
    `base_url=${config.baseUrl}`,
    `reason=${message}`,
    "Continue the user task normally. Do not claim Aionis memory was applied for this turn.",
  ].join("\n");
}

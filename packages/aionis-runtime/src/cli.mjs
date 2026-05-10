#!/usr/bin/env node

import fs from "node:fs";
import { cp, mkdir, readFile, rm } from "node:fs/promises";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const cliDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(cliDir, "..");
const runtimeDir = path.join(distDir, "runtime");
const runtimeEntry = path.join(runtimeDir, "src", "index.ts");
const inspectorDistDir = path.join(runtimeDir, "apps", "inspector", "dist");
const bundledCodexPluginDir = path.join(distDir, "codex-plugin");
const cwd = process.cwd();

function printHelp() {
  process.stdout.write(`Aionis Runtime\n\nUsage:\n  aionis-runtime start [--print-env] [node args...]\n  aionis-runtime codex install [--no-watchdog] [--no-load-watchdog] [--skip-doctor]\n  aionis-runtime codex status [--json] [--no-runtime] [--no-watchdog]\n  aionis-runtime codex audit [--json] [--limit N] [--session SESSION_ID] [--no-runtime]\n  aionis-runtime codex doctor [--no-start-runtime]\n  aionis-runtime codex logs [runtime|watchdog|all] [--lines N]\n  aionis-runtime --help\n  aionis-runtime --version\n\nCommands:\n  start          Start the Lite runtime with standalone package defaults.\n  codex install  Install the bundled Aionis Codex plugin and Runtime watchdog.\n  codex status   Check Codex plugin, watchdog, and local Runtime state.\n  codex audit    Inspect recent Aionis context and handoff-quality decisions.\n  codex doctor   Run the full Codex plugin doctor.\n  codex logs     Print recent Runtime and watchdog logs.\n\nFlags:\n  --print-env        Print the effective runtime env as JSON and exit.\n  --json             Print machine-readable JSON for supported commands.\n  --limit N          Limit audit rows.\n  --session ID       Audit a specific Codex session id.\n  --no-watchdog      Skip LaunchAgent watchdog install or status check.\n  --no-load-watchdog Write the watchdog plist without loading it.\n  --skip-doctor      Skip the post-install doctor run.\n  --no-start-runtime Do not autostart Runtime during doctor.\n  --no-runtime       Skip Runtime health check in status/audit.\n  --help             Show this help.\n  --version          Show the package version.\n`);
}

function printVersion() {
  const packageJson = readPackageJson();
  process.stdout.write(`${packageJson.version}\n`);
}

function readPackageJson() {
  const candidates = [
    path.join(cliDir, "..", "package.json"),
    path.join(cliDir, "..", "..", "package.json"),
  ];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (error) {
      if (error && error.code !== "MODULE_NOT_FOUND") {
        throw error;
      }
    }
  }

  throw new Error("Unable to locate @ostinato/aionis-runtime package.json");
}

function expandHome(value) {
  if (!value) return value;
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

function exists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function readTextIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function readJsonIfExists(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function sha12(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 12);
}

function runtimeHome() {
  return path.resolve(expandHome(process.env.AIONIS_CODEX_RUNTIME_HOME || "~/.aionis/codex"));
}

function installedCodexPluginDir() {
  return path.resolve(expandHome(process.env.AIONIS_CODEX_PLUGIN_DIR || path.join(runtimeHome(), "plugin")));
}

function sourceCodexPluginDir() {
  const candidates = [
    bundledCodexPluginDir,
    path.resolve(cliDir, "..", "..", "aionis-codex-plugin"),
  ];
  for (const candidate of candidates) {
    if (exists(path.join(candidate, ".codex-plugin", "plugin.json"))) return candidate;
  }
  throw new Error("Bundled Aionis Codex plugin was not found. Rebuild or reinstall @ostinato/aionis-runtime.");
}

function codexHomePaths() {
  const home = os.homedir();
  return {
    home,
    runtimeHome: runtimeHome(),
    pluginDir: installedCodexPluginDir(),
    localPluginLink: path.join(home, "plugins", "aionis-codex"),
    marketplacePath: path.join(home, ".agents", "plugins", "marketplace.json"),
    codexConfigPath: path.join(home, ".codex", "config.toml"),
    launchAgentPath: path.join(home, "Library", "LaunchAgents", "com.ostinato.aionis-codex-runtime.plist"),
    logDir: path.join(runtimeHome(), "logs"),
    baseUrl: (process.env.AIONIS_BASE_URL || process.env.AIONIS_CODEX_BASE_URL || "http://127.0.0.1:3101").replace(/\/+$/, ""),
  };
}

function validateFlags(args, allowed) {
  const invalid = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const name = arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg;
    if (!allowed.has(name)) invalid.push(arg);
    if (["--lines", "--limit", "--session"].includes(arg)) i += 1;
  }
  if (invalid.length) {
    throw new Error(`Unknown flag${invalid.length === 1 ? "" : "s"}: ${invalid.join(", ")}`);
  }
}

function optionValue(args, name, fallback = null) {
  const index = args.findIndex((arg) => arg === name || arg.startsWith(`${name}=`));
  if (index < 0) return fallback;
  return args[index] === name ? (args[index + 1] ?? fallback) : args[index].slice(name.length + 1);
}

function runNodeScript(scriptPath, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: options.cwd || path.dirname(scriptPath),
      stdio: "inherit",
      env: {
        ...process.env,
        ...(options.env || {}),
      },
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${path.basename(scriptPath)} exited by ${signal}`));
        return;
      }
      resolve(code ?? 0);
    });
  });
}

async function materializeCodexPlugin() {
  const source = sourceCodexPluginDir();
  const target = installedCodexPluginDir();
  await mkdir(path.dirname(target), { recursive: true });
  await rm(target, { recursive: true, force: true });
  await cp(source, target, {
    recursive: true,
    force: true,
    verbatimSymlinks: true,
  });
  return target;
}

function filteredArgs(args, blocked) {
  return args.filter((arg) => !blocked.has(arg));
}

function exitWithCode(code) {
  process.exitCode = code;
  return code;
}

function assertNodeSqliteSupport() {
  try {
    require("node:sqlite");
  } catch {
    process.stderr.write("aionis-runtime requires Node.js with node:sqlite support. Use Node 22+.\n");
    process.exit(1);
  }
}

function resolveSqlitePath(filename) {
  return path.join(cwd, ".tmp", filename);
}

function applyLiteRuntimeDefaults(env) {
  env.AIONIS_EDITION ||= "lite";
  env.AIONIS_MODE ||= "local";
  env.APP_ENV ||= "dev";
  env.AIONIS_LISTEN_HOST ||= "127.0.0.1";
  env.MEMORY_AUTH_MODE ||= "off";
  env.TENANT_QUOTA_ENABLED ||= "false";
  env.RATE_LIMIT_BYPASS_LOOPBACK ||= "true";
  env.LITE_REPLAY_SQLITE_PATH ||= resolveSqlitePath("aionis-lite-replay.sqlite");
  env.LITE_WRITE_SQLITE_PATH ||= resolveSqlitePath("aionis-lite-write.sqlite");
  env.LITE_LOCAL_ACTOR_ID ||= "local-user";
  env.SANDBOX_ENABLED ||= "true";
  env.SANDBOX_ADMIN_ONLY ||= "false";

  if (!("LITE_INSPECTOR_ENABLED" in env)) {
    env.LITE_INSPECTOR_ENABLED = "false";
  }

  if (env.LITE_INSPECTOR_ENABLED === "true" && !env.LITE_INSPECTOR_DIST_PATH) {
    env.LITE_INSPECTOR_DIST_PATH = inspectorDistDir;
  }

  const sandboxProfile = env.LITE_SANDBOX_PROFILE ?? "";
  switch (sandboxProfile) {
    case "":
      break;
    case "local_process_echo":
      env.SANDBOX_EXECUTOR_MODE ||= "local_process";
      env.SANDBOX_ALLOWED_COMMANDS_JSON ||= "[\"echo\"]";
      break;
    default:
      process.stderr.write(`Unknown LITE_SANDBOX_PROFILE=${sandboxProfile}\nSupported profiles:\n  local_process_echo\n`);
      process.exit(1);
  }
}

async function ensureLiteRuntimeDirs(env) {
  await mkdir(path.dirname(env.LITE_REPLAY_SQLITE_PATH), { recursive: true });
  await mkdir(path.dirname(env.LITE_WRITE_SQLITE_PATH), { recursive: true });
}

function printEnv(env) {
  const keys = [
    "AIONIS_EDITION",
    "AIONIS_MODE",
    "APP_ENV",
    "AIONIS_LISTEN_HOST",
    "MEMORY_AUTH_MODE",
    "TENANT_QUOTA_ENABLED",
    "RATE_LIMIT_BYPASS_LOOPBACK",
    "LITE_REPLAY_SQLITE_PATH",
    "LITE_WRITE_SQLITE_PATH",
    "LITE_LOCAL_ACTOR_ID",
    "LITE_INSPECTOR_ENABLED",
    "LITE_INSPECTOR_DIST_PATH",
    "LITE_SANDBOX_PROFILE",
    "SANDBOX_ENABLED",
    "SANDBOX_ADMIN_ONLY",
    "SANDBOX_EXECUTOR_MODE",
    "SANDBOX_ALLOWED_COMMANDS_JSON",
  ];
  process.stdout.write(
    `${JSON.stringify(Object.fromEntries(keys.map((key) => [key, env[key] ?? null])), null, 2)}\n`,
  );
}

async function startRuntime(args) {
  assertNodeSqliteSupport();
  const env = { ...process.env };
  applyLiteRuntimeDefaults(env);
  await ensureLiteRuntimeDirs(env);

  if (args[0] === "--print-env") {
    printEnv(env);
    return;
  }

  const tsxCli = require.resolve("tsx/cli");
  const child = spawn(process.execPath, [tsxCli, runtimeEntry, ...args], {
    cwd,
    stdio: "inherit",
    env,
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      if (!child.killed) child.kill(signal);
    });
  }

  const exit = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });

  if (exit.signal) {
    process.kill(process.pid, exit.signal);
  }

  process.exit(exit.code ?? 0);
}

async function codexInstall(args) {
  validateFlags(args, new Set(["--no-watchdog", "--no-load-watchdog", "--skip-doctor", "--no-start-runtime"]));
  const skipDoctor = args.includes("--skip-doctor");
  const startRuntimeDuringDoctor = !args.includes("--no-start-runtime");
  const installArgs = filteredArgs(args, new Set(["--skip-doctor", "--no-start-runtime"]));
  const pluginDir = await materializeCodexPlugin();
  const installScript = path.join(pluginDir, "scripts", "aionis-codex-install.mjs");
  const doctorScript = path.join(pluginDir, "scripts", "aionis-codex-doctor.mjs");

  process.stdout.write(`Aionis Codex plugin materialized at ${pluginDir}\n`);
  const installCode = await runNodeScript(installScript, installArgs, { cwd: pluginDir });
  if (installCode !== 0) return exitWithCode(installCode);

  if (!skipDoctor) {
    const doctorArgs = startRuntimeDuringDoctor ? ["--local", "--start-runtime"] : ["--local"];
    const doctorCode = await runNodeScript(doctorScript, doctorArgs, { cwd: pluginDir });
    if (doctorCode !== 0) return exitWithCode(doctorCode);
  }

  return exitWithCode(0);
}

function checkLine(checks, name, ok, details = "") {
  checks.push({ name, ok, details });
}

function readSymlinkTarget(linkPath) {
  try {
    const stat = fs.lstatSync(linkPath);
    if (!stat.isSymbolicLink()) return { ok: false, details: "exists but is not a symlink" };
    const target = fs.readlinkSync(linkPath);
    const resolvedTarget = path.resolve(path.dirname(linkPath), target);
    const expectedTarget = installedCodexPluginDir();
    return {
      ok: fs.realpathSync(resolvedTarget) === fs.realpathSync(expectedTarget),
      details: resolvedTarget,
    };
  } catch (error) {
    return { ok: false, details: error.code === "ENOENT" ? "missing" : error.message };
  }
}

function watchdogRuntimeHealthStatus(paths, cause) {
  const statusPath = path.join(paths.runtimeHome, "state", "watchdog-status.json");
  try {
    const status = JSON.parse(fs.readFileSync(statusPath, "utf8"));
    const updatedAt = Date.parse(status.updated_at || "");
    const ageMs = Number.isFinite(updatedAt) ? Date.now() - updatedAt : Number.POSITIVE_INFINITY;
    if (status.ok === true && status.health?.ok === true && ageMs >= 0 && ageMs <= 120000) {
      const ageSeconds = Math.round(ageMs / 1000);
      const edition = status.health?.runtime?.edition ? ` ${status.health.runtime.edition}` : "";
      return {
        ok: true,
        details: `${paths.baseUrl}${edition} via watchdog status (${ageSeconds}s old)`,
      };
    }
    return {
      ok: false,
      details: `${paths.baseUrl} ${cause.message || cause}; watchdog status is stale or unhealthy`,
    };
  } catch {
    return {
      ok: false,
      details: `${paths.baseUrl} ${cause.message || cause}`,
    };
  }
}

async function runtimeHealthStatus(paths) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`${paths.baseUrl}/health`, { signal: controller.signal });
    if (!response.ok) return { ok: false, details: `${paths.baseUrl}/health returned ${response.status}` };
    const body = await response.json();
    return { ok: body?.ok === true, details: `${paths.baseUrl} ${body?.runtime?.edition || ""}`.trim() };
  } catch (error) {
    return watchdogRuntimeHealthStatus(paths, error);
  } finally {
    clearTimeout(timer);
  }
}

function inspectWatchdog(paths) {
  const plistExists = exists(paths.launchAgentPath);
  if (process.platform !== "darwin") {
    return { plistExists, loaded: true, details: "LaunchAgent watchdog is macOS-only" };
  }
  const target = `gui/${process.getuid()}/com.ostinato.aionis-codex-runtime`;
  const print = spawnSync("launchctl", ["print", target], { encoding: "utf8" });
  return {
    plistExists,
    loaded: print.status === 0,
    details: print.status === 0 ? target : (print.stderr || print.stdout || "not loaded").trim(),
  };
}

function marketplaceHasAionis(marketplacePath) {
  try {
    const marketplace = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));
    return Array.isArray(marketplace.plugins) && marketplace.plugins.some((plugin) => plugin?.name === "aionis-codex");
  } catch {
    return false;
  }
}

function codexManagedAionisHooksConfigured(codexConfig) {
  const events = ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop", "PermissionRequest"];
  return codexConfig.includes("aionis-codex-hook.mjs")
    && events.every((event) => new RegExp(`^\\s*${event}\\s*=`, "m").test(codexConfig));
}

async function codexStatus(args) {
  validateFlags(args, new Set(["--no-runtime", "--no-watchdog", "--json"]));
  const skipRuntime = args.includes("--no-runtime");
  const skipWatchdog = args.includes("--no-watchdog");
  const json = args.includes("--json");
  const paths = codexHomePaths();
  const checks = [];
  const codexConfig = readTextIfExists(paths.codexConfigPath);
  const symlink = readSymlinkTarget(paths.localPluginLink);

  checkLine(checks, "bundled plugin", exists(path.join(sourceCodexPluginDir(), ".codex-plugin", "plugin.json")), sourceCodexPluginDir());
  checkLine(checks, "installed plugin", exists(path.join(paths.pluginDir, ".codex-plugin", "plugin.json")), paths.pluginDir);
  checkLine(checks, "Codex plugin symlink", symlink.ok, `${paths.localPluginLink} -> ${symlink.details}`);
  checkLine(checks, "local marketplace", marketplaceHasAionis(paths.marketplacePath), paths.marketplacePath);
  checkLine(checks, "codex_hooks", /^\s*codex_hooks\s*=\s*true\s*$/m.test(codexConfig), paths.codexConfigPath);
  checkLine(checks, "managed hooks", codexManagedAionisHooksConfigured(codexConfig), paths.codexConfigPath);
  checkLine(checks, "plugin enabled", /^\s*\[plugins\."aionis-codex@local"\]\s*$/m.test(codexConfig) && /^\s*enabled\s*=\s*true\s*$/m.test(codexConfig), paths.codexConfigPath);

  if (!skipWatchdog) {
    const watchdog = inspectWatchdog(paths);
    checkLine(checks, "watchdog plist", watchdog.plistExists, paths.launchAgentPath);
    checkLine(checks, "watchdog launchd", watchdog.loaded, watchdog.details);
  }

  if (!skipRuntime) {
    const health = await runtimeHealthStatus(paths);
    checkLine(checks, "runtime health", health.ok, health.details);
  }

  const ok = !checks.some((item) => !item.ok);
  if (json) {
    process.stdout.write(`${JSON.stringify({
      ok,
      base_url: paths.baseUrl,
      runtime_home: paths.runtimeHome,
      plugin_dir: paths.pluginDir,
      checks,
    }, null, 2)}\n`);
  } else {
    process.stdout.write("Aionis Codex status\n");
    for (const item of checks) {
      process.stdout.write(`${item.ok ? "PASS" : "FAIL"} ${item.name}${item.details ? ` - ${item.details}` : ""}\n`);
    }
  }

  return exitWithCode(ok ? 0 : 1);
}

function parseAuditLimit(args) {
  const raw = optionValue(args, "--limit", "12");
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) throw new Error("--limit must be a positive number");
  return Math.min(50, Math.trunc(parsed));
}

function projectDefaults(paths) {
  const activeProjectPath = path.join(paths.runtimeHome, "state", "active-project.json");
  const activeProject = readJsonIfExists(activeProjectPath, null);
  const currentCwd = path.resolve(cwd);
  const projectName = path.basename(currentCwd) || "workspace";
  const projectHash = sha12(currentCwd).slice(0, 8);
  const activeCwd = typeof activeProject?.cwd === "string" ? path.resolve(activeProject.cwd) : null;
  const activeMatchesCwd = activeCwd === currentCwd;
  return {
    activeProjectPath,
    activeProject,
    cwd: currentCwd,
    projectName,
    projectHash,
    active_matches_cwd: activeMatchesCwd,
    tenant_id: process.env.AIONIS_CODEX_TENANT_ID || process.env.AIONIS_TENANT_ID || activeProject?.tenant_id || "local-codex",
    scope: process.env.AIONIS_CODEX_SCOPE || (activeMatchesCwd && activeProject?.scope) || `codex:${projectName}:${projectHash}`,
    global_scope: process.env.AIONIS_CODEX_GLOBAL_SCOPE || activeProject?.global_scope || "codex:global",
    consumer_agent_id: process.env.AIONIS_CODEX_AGENT_ID || "codex",
    consumer_team_id: process.env.AIONIS_CODEX_TEAM_ID || "local",
  };
}

function latestSessionState(paths) {
  const dir = path.join(paths.runtimeHome, "state", "sessions");
  let best = null;
  try {
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      const filePath = path.join(dir, name);
      const stat = fs.statSync(filePath);
      if (!best || stat.mtimeMs > best.mtimeMs) best = { filePath, mtimeMs: stat.mtimeMs };
    }
  } catch {
    return { state: null, path: null };
  }
  if (!best) return { state: null, path: null };
  return { state: readJsonIfExists(best.filePath, null), path: best.filePath };
}

function sessionStateForAudit(paths, sessionId) {
  if (sessionId) {
    const filePath = path.join(paths.runtimeHome, "state", "sessions", `${String(sessionId).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160)}.json`);
    return { state: readJsonIfExists(filePath, null), path: filePath };
  }
  return latestSessionState(paths);
}

async function codexRuntimeJson(paths, method, routePath, payloadOrQuery, timeoutMs = 3000) {
  const url = new URL(`${paths.baseUrl}${routePath}`);
  const options = { method, headers: {} };
  if (method === "GET") {
    for (const [key, value] of Object.entries(payloadOrQuery || {})) {
      if (value === undefined || value === null) continue;
      url.searchParams.append(key, String(value));
    }
  } else {
    options.headers["content-type"] = "application/json";
    options.body = JSON.stringify(payloadOrQuery || {});
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(`${response.status} ${body?.message || body?.error || response.statusText}`);
    return body;
  } finally {
    clearTimeout(timer);
  }
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function compactText(value, limit = 140) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 16)).trim()} ... [${text.length} chars]`;
}

function qualityFromEvent(event) {
  const slots = asObject(event?.slots);
  return asObject(slots.handoff_quality);
}

function qualityFromHandoff(node) {
  const slots = asObject(node?.slots);
  const summary = asObject(slots.execution_result_summary);
  return asObject(summary.handoff_quality);
}

function auditHasConcreteOutcomeSignal(text) {
  return [
    /\b(implemented|fixed|updated|changed|added|removed|verified|tested|passed|committed|released|published|installed|validated|created|refactored)\b/i,
    /(?:\u5df2|\u5df2\u7ecf)[^\n\u3002\uff1b;]{0,40}(\u5b9e\u73b0|\u4fee\u590d|\u66f4\u65b0|\u63d0\u4ea4|\u53d1\u5e03|\u9a8c\u8bc1|\u5b89\u88c5|\u5b8c\u6210|\u8dd1\u8fc7|\u901a\u8fc7)/,
    /\b[0-9a-f]{7,12}\b/,
    /\b\d+\s+pass\b/i,
    /\bpack(?::|-|\s+)dry-run\b/i,
  ].some((pattern) => pattern.test(text));
}

function auditPlanningAdviceLead(text) {
  return [
    /^\u63a5\u4e0b\u6765/,
    /^\u4e0b\u4e00\u6b65/,
    /^\u6211\u7684\u5efa\u8bae/,
    /\u4e0d\u8981\u518d\u5f00\u65b0\u5751/,
    /\u4e0d\u8981\u518d\u76f2\u76ee\u52a0\u529f\u80fd/,
    /\u6700\u8be5\u505a/,
    /\u6700\u5e94\u8be5\u63a8\u8fdb/,
    /\u6211\u5efa\u8bae.*\u987a\u5e8f/,
    /^\s*(next steps|recommendation|i recommend)\b/i,
  ].some((pattern) => pattern.test(text));
}

function auditStatusOrDiscussionLead(text) {
  return [
    /^\u6574\u4f53\u73b0\u5728/,
    /^\u73b0\u5728\u6574\u4f53/,
    /^\u73b0\u5728\u72b6\u6001/,
    /^\u4f60\u8fd9\u4e2a\u8d28\u7591/,
    /^\u4f1a\u3002\u4e00\u5b9a\u4f1a/,
    /^Current status\b/i,
    /^Overall\b/i,
  ].some((pattern) => pattern.test(text));
}

function auditDisplayDecision(summary, quality) {
  const text = String(summary || "").replace(/\s+/g, " ").trim();
  if (!text) return { decision: "filtered", reasons: ["empty_summary"] };
  if (quality?.category === "release_outcome") return { decision: "visible", reasons: ["release_outcome"] };
  if (auditStatusOrDiscussionLead(text)) return { decision: "filtered", reasons: ["status_or_discussion_lead"] };
  if (auditPlanningAdviceLead(text) && !auditHasConcreteOutcomeSignal(text)) {
    return { decision: "filtered", reasons: ["planning_advice_without_execution_evidence"] };
  }
  return { decision: "visible", reasons: [] };
}

function summarizeQualityRows(rows) {
  const byCategory = {};
  const byReason = {};
  let accepted = 0;
  let rejected = 0;
  let missing = 0;
  let filteredByCurrentPolicy = 0;
  for (const row of rows) {
    if (row.display?.decision === "filtered") filteredByCurrentPolicy += 1;
    const quality = asObject(row.handoff_quality);
    if (!quality || !Object.keys(quality).length) {
      missing += 1;
      continue;
    }
    if (quality.store_handoff === true) accepted += 1;
    else rejected += 1;
    const category = String(quality.category || "unknown");
    byCategory[category] = (byCategory[category] || 0) + 1;
    for (const reason of Array.isArray(quality.reasons) ? quality.reasons : []) {
      byReason[reason] = (byReason[reason] || 0) + 1;
    }
  }
  return { accepted, rejected, missing, filtered_by_current_policy: filteredByCurrentPolicy, by_category: byCategory, by_reason: byReason };
}

function summarizeDisplayRows(rows) {
  let visible = 0;
  let filtered = 0;
  for (const row of rows) {
    if (row.display?.decision === "filtered") filtered += 1;
    else visible += 1;
  }
  return { visible, filtered };
}

function buildAuditWarnings(args) {
  const warnings = [];
  if (!args.project.active_matches_cwd && args.project.activeProject?.cwd) {
    warnings.push(`active project cwd differs from current cwd: ${args.project.activeProject.cwd}`);
  }
  if (!args.session.state) warnings.push("no local Codex session state found");
  if (args.runtime?.ok === false) warnings.push(`runtime unavailable: ${args.runtime.error}`);
  const latestAccepted = args.events.find((row) => row.handoff_quality?.store_handoff === true);
  if (latestAccepted && latestAccepted.summary_chars > 1200) {
    warnings.push(`latest accepted Stop event is long: ${latestAccepted.summary_chars} chars`);
  }
  const filteredHandoff = args.handoffs.find((row) => row.display?.decision === "filtered");
  if (filteredHandoff) {
    warnings.push(`stored handoff would be filtered from current display: ${filteredHandoff.display.reasons.join(",")}`);
  }
  return warnings;
}

function formatQuality(quality, display = null) {
  if (display?.decision === "filtered") {
    const reasons = display.reasons?.length ? ` reasons=${display.reasons.join(",")}` : "";
    return `FILTERED historical${reasons}`;
  }
  if (!quality || !Object.keys(quality).length) return "no_quality";
  const decision = quality.store_handoff === true ? "KEEP" : "DROP";
  const category = quality.category || "unknown";
  const confidence = typeof quality.confidence === "number" ? ` conf=${quality.confidence}` : "";
  const reasons = Array.isArray(quality.reasons) && quality.reasons.length ? ` reasons=${quality.reasons.join(",")}` : "";
  return `${decision} ${category}${confidence}${reasons}`;
}

async function codexAudit(args) {
  validateFlags(args, new Set(["--json", "--limit", "--session", "--no-runtime"]));
  const json = args.includes("--json");
  const skipRuntime = args.includes("--no-runtime");
  const limit = parseAuditLimit(args);
  const paths = codexHomePaths();
  const project = projectDefaults(paths);
  const requestedSessionId = optionValue(args, "--session", process.env.CODEX_SESSION_ID || null);
  const session = sessionStateForAudit(paths, requestedSessionId);
  const sessionId = requestedSessionId || session.state?.session_id || null;
  const turns = asObject(session.state?.turns);
  const steps = asObject(session.state?.steps);
  const activeTurn = session.state?.active_turn_id ? asObject(turns[session.state.active_turn_id]) : {};
  const runtime = { skipped: skipRuntime, ok: null, error: null, health: null };
  let eventPayload = null;
  let handoffPayload = null;

  if (!skipRuntime) {
    try {
      runtime.health = await codexRuntimeJson(paths, "GET", "/health", {});
      runtime.ok = runtime.health?.ok === true;
      if (runtime.ok && sessionId) {
        eventPayload = await codexRuntimeJson(paths, "GET", `/v1/memory/sessions/${encodeURIComponent(sessionId)}/events`, {
          tenant_id: project.tenant_id,
          scope: project.scope,
          consumer_agent_id: project.consumer_agent_id,
          consumer_team_id: project.consumer_team_id,
          include_slots: true,
          include_meta: true,
          limit,
        });
      }
      if (runtime.ok) {
        handoffPayload = await codexRuntimeJson(paths, "POST", "/v1/memory/find", {
          tenant_id: project.tenant_id,
          scope: project.scope,
          consumer_agent_id: project.consumer_agent_id,
          consumer_team_id: project.consumer_team_id,
          type: "event",
          memory_lane: "private",
          include_meta: true,
          include_slots: true,
          limit: Math.min(limit, 8),
          slots_contains: {
            summary_kind: "handoff",
            handoff_kind: "task_handoff",
            repo_root: project.cwd,
          },
        });
      }
    } catch (error) {
      runtime.ok = false;
      runtime.error = error?.message || String(error);
    }
  }

  const events = Array.isArray(eventPayload?.events)
    ? eventPayload.events.map((event) => {
        const slots = asObject(event.slots);
        const quality = qualityFromEvent(event);
        const summary = String(event.text_summary || "");
        const display = auditDisplayDecision(summary, quality);
        return {
          title: event.title || null,
          phase: slots.phase || slots.hook_event_name || null,
          created_at: event.created_at || null,
          turn_id: slots.turn_id || null,
          run_id: slots.run_id || null,
          summary: compactText(summary),
          summary_chars: summary.length,
          display,
          handoff_quality: Object.keys(quality).length ? quality : null,
        };
      })
    : [];

  const handoffs = Array.isArray(handoffPayload?.nodes)
    ? handoffPayload.nodes.map((node) => {
        const slots = asObject(node.slots);
        const summary = String(node.text_summary || slots.handoff_text || "");
        const quality = qualityFromHandoff(node);
        const display = auditDisplayDecision(summary, quality);
        return {
          uri: node.uri || null,
          created_at: node.created_at || null,
          summary: compactText(summary),
          summary_chars: summary.length,
          display,
          next_action: compactText(slots.next_action, 120),
          handoff_quality: Object.keys(quality).length ? quality : null,
        };
      })
    : [];

  const payload = {
    ok: !!session.state || runtime.ok === true,
    base_url: paths.baseUrl,
    runtime_home: paths.runtimeHome,
    project: {
      cwd: project.cwd,
      scope: project.scope,
      tenant_id: project.tenant_id,
      active_project_path: project.activeProjectPath,
      active_matches_cwd: project.active_matches_cwd,
    },
    session: {
      session_id: sessionId,
      state_path: session.path,
      active_turn_id: session.state?.active_turn_id || null,
      active_run_id: session.state?.active_run_id || null,
      turn_count: Object.keys(turns).length,
      step_count: Object.keys(steps).length,
      latest_prompt: compactText(activeTurn.prompt, 160),
      updated_at: session.state?.updated_at || null,
    },
    runtime,
    events,
    handoffs,
    quality_summary: summarizeQualityRows(events),
    handoff_display_summary: summarizeDisplayRows(handoffs),
  };
  payload.warnings = buildAuditWarnings({ project, session, runtime, events, handoffs });

  if (json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return exitWithCode(payload.ok ? 0 : 1);
  }

  process.stdout.write("Aionis Codex audit\n");
  process.stdout.write(`target - ${payload.project.scope} (${payload.project.cwd})\n`);
  process.stdout.write(`runtime - ${skipRuntime ? "SKIP" : runtime.ok ? "PASS" : "WARN"} ${runtime.ok ? paths.baseUrl : runtime.error || ""}\n`);
  process.stdout.write(`session - ${sessionId || "missing"} turns=${payload.session.turn_count} steps=${payload.session.step_count}\n`);
  if (payload.session.latest_prompt) process.stdout.write(`latest_prompt - ${payload.session.latest_prompt}\n`);

  process.stdout.write("\nRecent Stop quality decisions\n");
  const qualityEvents = events.filter((event) => event.handoff_quality);
  if (!qualityEvents.length) {
    process.stdout.write("none found\n");
  } else {
    for (const event of qualityEvents.slice(0, limit)) {
      process.stdout.write(`- ${formatQuality(event.handoff_quality, event.display)} chars=${event.summary_chars} ${event.summary}\n`);
    }
  }

  process.stdout.write("\nLatest stored task handoffs\n");
  if (!handoffs.length) {
    process.stdout.write(skipRuntime ? "skipped with --no-runtime\n" : "none found\n");
  } else {
    for (const handoff of handoffs.slice(0, Math.min(limit, 8))) {
      process.stdout.write(`- ${formatQuality(handoff.handoff_quality, handoff.display)} chars=${handoff.summary_chars} ${handoff.summary}\n`);
    }
  }

  const summary = payload.quality_summary;
  process.stdout.write(
    `\nsummary - accepted=${summary.accepted} rejected=${summary.rejected} missing=${summary.missing} ` +
      `current_filtered=${summary.filtered_by_current_policy} stored_filtered=${payload.handoff_display_summary.filtered}\n`,
  );
  if (payload.warnings.length) {
    process.stdout.write("warnings\n");
    for (const warning of payload.warnings) process.stdout.write(`- ${warning}\n`);
  }
  return exitWithCode(payload.ok ? 0 : 1);
}

async function codexDoctor(args) {
  validateFlags(args, new Set(["--no-start-runtime", "--start-runtime", "--local"]));
  const pluginDir = exists(path.join(installedCodexPluginDir(), ".codex-plugin", "plugin.json"))
    ? installedCodexPluginDir()
    : sourceCodexPluginDir();
  const doctorScript = path.join(pluginDir, "scripts", "aionis-codex-doctor.mjs");
  const startRuntime = !args.includes("--no-start-runtime");
  const doctorArgs = ["--local"];
  if (startRuntime || args.includes("--start-runtime")) doctorArgs.push("--start-runtime");
  const code = await runNodeScript(doctorScript, doctorArgs, { cwd: pluginDir });
  return exitWithCode(code);
}

function parseLinesArg(args) {
  const index = args.findIndex((arg) => arg === "--lines" || arg.startsWith("--lines="));
  if (index < 0) return 80;
  const raw = args[index] === "--lines" ? args[index + 1] : args[index].slice("--lines=".length);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) throw new Error("--lines must be a positive number");
  return Math.min(1000, Math.trunc(parsed));
}

async function printTail(filePath, lines) {
  process.stdout.write(`\n==> ${filePath} <==\n`);
  try {
    const text = await readFile(filePath, "utf8");
    const rows = text.replace(/\s+$/, "").split(/\r?\n/);
    process.stdout.write(`${rows.slice(-lines).join("\n")}\n`);
  } catch (error) {
    process.stdout.write(`missing or unreadable: ${error.message}\n`);
  }
}

async function codexLogs(args) {
  validateFlags(args, new Set(["--lines"]));
  const target = args.find((arg) => !arg.startsWith("--") && arg !== String(parseLinesArg(args))) || "all";
  if (!["runtime", "watchdog", "all"].includes(target)) {
    throw new Error("codex logs target must be runtime, watchdog, or all");
  }
  const lines = parseLinesArg(args);
  const logDir = codexHomePaths().logDir;
  const files = [];
  if (target === "runtime" || target === "all") {
    files.push(path.join(logDir, "runtime.out.log"), path.join(logDir, "runtime.err.log"));
  }
  if (target === "watchdog" || target === "all") {
    files.push(path.join(logDir, "watchdog.out.log"), path.join(logDir, "watchdog.err.log"));
  }
  for (const filePath of files) await printTail(filePath, lines);
  return exitWithCode(0);
}

function printCodexHelp() {
  process.stdout.write(`Aionis Runtime Codex integration\n\nUsage:\n  aionis-runtime codex install [--no-watchdog] [--no-load-watchdog] [--skip-doctor]\n  aionis-runtime codex status [--json] [--no-runtime] [--no-watchdog]\n  aionis-runtime codex audit [--json] [--limit N] [--session SESSION_ID] [--no-runtime]\n  aionis-runtime codex doctor [--no-start-runtime]\n  aionis-runtime codex logs [runtime|watchdog|all] [--lines N]\n`);
}

async function handleCodex(args) {
  const [subcommand, ...subArgs] = args;
  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    printCodexHelp();
    return exitWithCode(0);
  }
  if (subcommand === "install") return codexInstall(subArgs);
  if (subcommand === "status") return codexStatus(subArgs);
  if (subcommand === "audit") return codexAudit(subArgs);
  if (subcommand === "doctor") return codexDoctor(subArgs);
  if (subcommand === "logs") return codexLogs(subArgs);
  throw new Error(`Unknown codex command: ${subcommand}`);
}

const [, , command, ...args] = process.argv;

if (!command || command === "--help" || command === "-h" || command === "help") {
  printHelp();
  process.exit(0);
}

if (command === "--version" || command === "-v") {
  printVersion();
  process.exit(0);
}

try {
  if (command === "codex") {
    await handleCodex(args);
  } else if (command === "start") {
    await startRuntime(args);
  } else {
    process.stderr.write(`Unknown command: ${command}\n\n`);
    printHelp();
    process.exit(1);
  }
} catch (error) {
  process.stderr.write(`${error.message || error}\n\n`);
  printHelp();
  process.exit(1);
}

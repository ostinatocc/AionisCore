#!/usr/bin/env node

import fs from "node:fs";
import { cp, mkdir, readFile, rm } from "node:fs/promises";
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
  process.stdout.write(`Aionis Runtime\n\nUsage:\n  aionis-runtime start [--print-env] [node args...]\n  aionis-runtime codex install [--no-watchdog] [--no-load-watchdog] [--skip-doctor]\n  aionis-runtime codex status [--json] [--no-runtime] [--no-watchdog]\n  aionis-runtime codex doctor [--no-start-runtime]\n  aionis-runtime codex logs [runtime|watchdog|all] [--lines N]\n  aionis-runtime --help\n  aionis-runtime --version\n\nCommands:\n  start          Start the Lite runtime with standalone package defaults.\n  codex install  Install the bundled Aionis Codex plugin and Runtime watchdog.\n  codex status   Check Codex plugin, watchdog, and local Runtime state.\n  codex doctor   Run the full Codex plugin doctor.\n  codex logs     Print recent Runtime and watchdog logs.\n\nFlags:\n  --print-env        Print the effective runtime env as JSON and exit.\n  --json             Print machine-readable JSON for supported commands.\n  --no-watchdog      Skip LaunchAgent watchdog install or status check.\n  --no-load-watchdog Write the watchdog plist without loading it.\n  --skip-doctor      Skip the post-install doctor run.\n  --no-start-runtime Do not autostart Runtime during doctor.\n  --no-runtime       Skip Runtime health check in status.\n  --help             Show this help.\n  --version          Show the package version.\n`);
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
    if (arg === "--lines") i += 1;
  }
  if (invalid.length) {
    throw new Error(`Unknown flag${invalid.length === 1 ? "" : "s"}: ${invalid.join(", ")}`);
  }
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
  process.stdout.write(`Aionis Runtime Codex integration\n\nUsage:\n  aionis-runtime codex install [--no-watchdog] [--no-load-watchdog] [--skip-doctor]\n  aionis-runtime codex status [--json] [--no-runtime] [--no-watchdog]\n  aionis-runtime codex doctor [--no-start-runtime]\n  aionis-runtime codex logs [runtime|watchdog|all] [--lines N]\n`);
}

async function handleCodex(args) {
  const [subcommand, ...subArgs] = args;
  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    printCodexHelp();
    return exitWithCode(0);
  }
  if (subcommand === "install") return codexInstall(subArgs);
  if (subcommand === "status") return codexStatus(subArgs);
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

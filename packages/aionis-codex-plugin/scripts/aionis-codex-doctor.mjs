#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureRuntime, resolveConfig, runtimeHealth } from "../lib/aionis-codex-runtime.mjs";
import { inspectLaunchAgent } from "../lib/aionis-codex-watchdog.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "..");
const checks = [];

function check(name, ok, details = "") {
  checks.push({ name, ok, details });
}

function exists(relative) {
  return fs.existsSync(path.join(pluginRoot, relative));
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function runMcpProbe() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["mcp/aionis-codex-mcp.mjs"], {
      cwd: pluginRoot,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        AIONIS_CODEX_AUTOSTART: "false",
      },
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ ok: false, stdout, stderr, error: "timeout" });
    }, 2500);
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (stdout.includes("\"serverInfo\"")) {
        clearTimeout(timer);
        child.kill("SIGTERM");
        resolve({ ok: true, stdout, stderr });
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ ok: false, stdout, stderr, error: error.message });
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" } })}\n`);
  });
}

check("plugin manifest", exists(".codex-plugin/plugin.json"));
check("hooks config", exists("hooks/hooks.json"));
check("hook script", exists("hooks/aionis-codex-hook.mjs"));
check("mcp config", exists(".mcp.json"));
check("mcp server", exists("mcp/aionis-codex-mcp.mjs"));
check("skill", exists("skills/aionis-runtime/SKILL.md"));
check("watchdog daemon", exists("scripts/aionis-codex-runtime-daemon.mjs"));

try {
  const hooks = JSON.parse(read(path.join(pluginRoot, "hooks", "hooks.json")));
  const events = Object.keys(hooks.hooks || {});
  for (const event of ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop"]) {
    check(`hook event ${event}`, events.includes(event));
  }
} catch (error) {
  check("hooks parse", false, error.message);
}

const codexConfig = path.join(os.homedir(), ".codex", "config.toml");
if (fs.existsSync(codexConfig)) {
  const text = read(codexConfig);
  check("codex config exists", true, codexConfig);
  check("codex_hooks feature", /^\s*codex_hooks\s*=\s*true\s*$/m.test(text), "Add [features] codex_hooks = true if false.");
} else {
  check("codex config exists", false, codexConfig);
}

const mcp = await runMcpProbe();
check("mcp initialize", mcp.ok, mcp.error || mcp.stderr.trim());

const watchdog = inspectLaunchAgent(pluginRoot);
if (watchdog.supported) {
  check("watchdog plist", watchdog.plistExists, watchdog.options.plistPath);
  check("watchdog launchd", watchdog.loaded, watchdog.loaded ? watchdog.options.plistPath : "Run scripts/aionis-codex-install.mjs to install and load it.");
} else {
  check("watchdog launchd", true, "LaunchAgent watchdog is only supported on macOS.");
}

const config = resolveConfig({});
if (process.argv.includes("--start-runtime")) {
  const status = await ensureRuntime(config);
  check("runtime health", status.ok, status.ok ? config.baseUrl : String(status.error?.message || status.error));
} else {
  try {
    await runtimeHealth(config);
    check("runtime health", true, config.baseUrl);
  } catch (error) {
    check("runtime health", false, `${config.baseUrl} (${error.message}); pass --start-runtime to autostart.`);
  }
}

for (const item of checks) {
  process.stdout.write(`${item.ok ? "PASS" : "FAIL"} ${item.name}${item.details ? ` - ${item.details}` : ""}\n`);
}

const failed = checks.filter((item) => !item.ok);
process.exitCode = failed.length > 0 ? 1 : 0;

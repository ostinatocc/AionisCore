import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const WATCHDOG_LABEL = "com.ostinato.aionis-codex-runtime";
export const DEFAULT_WATCHDOG_INTERVAL_MS = 15000;

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

export function defaultRuntimeHome(home = os.homedir()) {
  return path.join(home, ".aionis", "codex");
}

export function launchAgentPath(home = os.homedir()) {
  return path.join(home, "Library", "LaunchAgents", `${WATCHDOG_LABEL}.plist`);
}

export function watchdogScriptPath(pluginRoot) {
  return path.join(pluginRoot, "scripts", "aionis-codex-runtime-daemon.mjs");
}

export function defaultLaunchAgentOptions(pluginRoot, overrides = {}) {
  const home = overrides.home || os.homedir();
  const runtimeHome = overrides.runtimeHome || process.env.AIONIS_CODEX_RUNTIME_HOME || defaultRuntimeHome(home);
  const logDir = path.join(runtimeHome, "logs");
  return {
    label: WATCHDOG_LABEL,
    pluginRoot,
    runtimeHome,
    plistPath: overrides.plistPath || launchAgentPath(home),
    nodePath: overrides.nodePath || process.execPath,
    scriptPath: overrides.scriptPath || watchdogScriptPath(pluginRoot),
    stdoutPath: overrides.stdoutPath || path.join(logDir, "watchdog.out.log"),
    stderrPath: overrides.stderrPath || path.join(logDir, "watchdog.err.log"),
    baseUrl: overrides.baseUrl || process.env.AIONIS_BASE_URL || process.env.AIONIS_CODEX_BASE_URL || "http://127.0.0.1:3101",
    intervalMs: overrides.intervalMs || Number(process.env.AIONIS_CODEX_WATCHDOG_INTERVAL_MS) || DEFAULT_WATCHDOG_INTERVAL_MS,
    pathEnv: overrides.pathEnv || process.env.PATH || "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin",
    npmCache: overrides.npmCache || path.join(runtimeHome, "npm-cache"),
    runtimeCommand: overrides.runtimeCommand || process.env.AIONIS_CODEX_RUNTIME_COMMAND || "",
  };
}

export function renderLaunchAgentPlist(options) {
  const environment = {
    PATH: options.pathEnv,
    AIONIS_BASE_URL: options.baseUrl,
    AIONIS_CODEX_BASE_URL: options.baseUrl,
    AIONIS_CODEX_RUNTIME_HOME: options.runtimeHome,
    AIONIS_CODEX_AUTOSTART: "true",
    AIONIS_CODEX_WATCHDOG_INTERVAL_MS: String(options.intervalMs),
    npm_config_cache: options.npmCache,
  };
  if (options.runtimeCommand) {
    environment.AIONIS_CODEX_RUNTIME_COMMAND = options.runtimeCommand;
  }
  const environmentEntries = Object.entries(environment)
    .map(([key, value]) => `    <key>${xmlEscape(key)}</key>\n    <string>${xmlEscape(value)}</string>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xmlEscape(options.label)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xmlEscape(options.nodePath)}</string>
    <string>${xmlEscape(options.scriptPath)}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${xmlEscape(options.pluginRoot)}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProcessType</key>
  <string>Background</string>
  <key>StandardOutPath</key>
  <string>${xmlEscape(options.stdoutPath)}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(options.stderrPath)}</string>
  <key>EnvironmentVariables</key>
  <dict>
${environmentEntries}
  </dict>
</dict>
</plist>
`;
}

export function writeLaunchAgentPlist(options) {
  fs.mkdirSync(path.dirname(options.plistPath), { recursive: true });
  fs.mkdirSync(path.dirname(options.stdoutPath), { recursive: true });
  fs.writeFileSync(options.plistPath, renderLaunchAgentPlist(options), "utf8");
  return options.plistPath;
}

function launchctl(args) {
  return spawnSync("launchctl", args, { encoding: "utf8" });
}

export function launchAgentTarget(label = WATCHDOG_LABEL) {
  return `gui/${process.getuid()}/${label}`;
}

export function launchAgentDomain() {
  return `gui/${process.getuid()}`;
}

export function installLaunchAgent(pluginRoot, overrides = {}) {
  const options = defaultLaunchAgentOptions(pluginRoot, overrides);
  if (process.platform !== "darwin") {
    return { supported: false, loaded: false, options, message: "LaunchAgent watchdog is only supported on macOS." };
  }

  writeLaunchAgentPlist(options);
  if (overrides.load === false) {
    return { supported: true, loaded: false, options, message: "LaunchAgent plist written." };
  }

  const domain = launchAgentDomain();
  const target = launchAgentTarget(options.label);
  launchctl(["bootout", domain, options.plistPath]);
  const bootstrap = launchctl(["bootstrap", domain, options.plistPath]);
  const enable = launchctl(["enable", target]);
  const kickstart = launchctl(["kickstart", "-k", target]);
  const ok = bootstrap.status === 0 && enable.status === 0 && kickstart.status === 0;
  return {
    supported: true,
    loaded: ok,
    options,
    bootstrap,
    enable,
    kickstart,
    message: ok ? "LaunchAgent loaded." : "LaunchAgent plist written, but launchctl did not fully load it.",
  };
}

export function inspectLaunchAgent(pluginRoot, overrides = {}) {
  const options = defaultLaunchAgentOptions(pluginRoot, overrides);
  const plistExists = fs.existsSync(options.plistPath);
  if (process.platform !== "darwin") {
    return { supported: false, loaded: false, plistExists, options };
  }
  const print = launchctl(["print", launchAgentTarget(options.label)]);
  return {
    supported: true,
    loaded: print.status === 0,
    plistExists,
    options,
    print,
  };
}

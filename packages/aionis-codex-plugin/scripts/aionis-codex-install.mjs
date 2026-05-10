#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installLaunchAgent } from "../lib/aionis-codex-watchdog.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "..");
const home = os.homedir();
const agentsPluginsRoot = path.join(home, ".agents", "plugins");
const localPluginsDir = path.join(home, "plugins");
const localPluginLink = path.join(localPluginsDir, "aionis-codex");
const marketplacePath = path.join(agentsPluginsRoot, "marketplace.json");
const codexConfigPath = path.join(home, ".codex", "config.toml");
const codexPluginCacheRoot = path.join(home, ".codex", "plugins", "cache", "local", "aionis-codex");
const runtimeHome = path.resolve(expandHome(process.env.AIONIS_CODEX_RUNTIME_HOME || path.join(home, ".aionis", "codex")));
const installedPluginDir = path.resolve(expandHome(process.env.AIONIS_CODEX_PLUGIN_DIR || path.join(runtimeHome, "plugin")));
const installWatchdog = !process.argv.includes("--no-watchdog");
const loadWatchdog = !process.argv.includes("--no-load-watchdog");
const cacheEntries = [".codex-plugin", ".mcp.json", "hooks.json", "hooks", "lib", "mcp", "scripts", "skills", "README.md", "package.json"];
const codexHookEvents = [
  ["SessionStart", "startup|resume|clear|compact", "Aionis preparing execution memory"],
  ["UserPromptSubmit", ".*", "Aionis assembling runtime context"],
  ["PreToolUse", ".*", "Aionis recording tool intent"],
  ["PostToolUse", ".*", "Aionis recording tool outcome"],
  ["Stop", ".*", "Aionis storing turn handoff"],
  ["PermissionRequest", ".*", "Aionis recording permission boundary"],
];

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function expandHome(value) {
  const text = String(value);
  if (text === "~") return home;
  if (text.startsWith("~/")) return path.join(home, text.slice(2));
  return text;
}

function sameFilesystemPath(left, right) {
  if (path.resolve(left) === path.resolve(right)) return true;
  try {
    return fs.realpathSync(left) === fs.realpathSync(right);
  } catch {
    return false;
  }
}

function readPluginVersion() {
  const manifest = readJson(path.join(pluginRoot, ".codex-plugin", "plugin.json"), {});
  return String(manifest.version || "0.1.0");
}

function ensureSymlink() {
  fs.mkdirSync(localPluginsDir, { recursive: true });
  try {
    const stat = fs.lstatSync(localPluginLink);
    if (stat.isSymbolicLink()) {
      const existing = fs.readlinkSync(localPluginLink);
      if (path.resolve(path.dirname(localPluginLink), existing) === pluginRoot) return;
      fs.unlinkSync(localPluginLink);
    } else {
      throw new Error(`${localPluginLink} exists and is not a symlink`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  fs.symlinkSync(pluginRoot, localPluginLink, "dir");
}

function ensureMarketplace() {
  const marketplace = readJson(marketplacePath, {
    name: "local",
    interface: {
      displayName: "Local Plugins",
    },
    plugins: [],
  });
  marketplace.name ||= "local";
  marketplace.interface ||= {};
  marketplace.interface.displayName ||= "Local Plugins";
  marketplace.plugins = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
  const entry = {
    name: "aionis-codex",
    source: {
      source: "local",
      path: "./plugins/aionis-codex",
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL",
    },
    category: "Productivity",
  };
  const index = marketplace.plugins.findIndex((plugin) => plugin?.name === "aionis-codex");
  if (index >= 0) marketplace.plugins[index] = entry;
  else marketplace.plugins.push(entry);
  writeJson(marketplacePath, marketplace);
}

function ensureCodexPluginCache() {
  const cachePluginRoot = path.join(codexPluginCacheRoot, readPluginVersion());
  copyPluginEntries(cachePluginRoot);
  return cachePluginRoot;
}

function copyPluginEntries(targetDir) {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of cacheEntries) {
    const source = path.join(pluginRoot, entry);
    if (!fs.existsSync(source)) continue;
    fs.cpSync(source, path.join(targetDir, entry), { recursive: true });
  }
  return targetDir;
}

function ensureInstalledPluginDir() {
  if (sameFilesystemPath(pluginRoot, installedPluginDir)) return installedPluginDir;
  return copyPluginEntries(installedPluginDir);
}

function codexHooksEnabled() {
  try {
    const config = fs.readFileSync(codexConfigPath, "utf8");
    return /^\s*codex_hooks\s*=\s*true\s*$/m.test(config);
  } catch {
    return false;
  }
}

function aionisManagedHooksConfigured() {
  try {
    const config = fs.readFileSync(codexConfigPath, "utf8");
    return config.includes("aionis-codex-hook.mjs")
      && codexHookEvents.every(([event]) => new RegExp(`^\\s*${event}\\s*=`, "m").test(config));
  } catch {
    return false;
  }
}

function replaceOrInsertTable(text, tableHeader, body) {
  const escapedHeader = tableHeader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tableRegex = new RegExp(`(^|\\n)(\\[${escapedHeader}\\]\\n)([\\s\\S]*?)(?=\\n\\[|$)`);
  if (tableRegex.test(text)) {
    return text.replace(tableRegex, `$1$2${body.replace(/\n?$/, "\n")}`);
  }
  return `${text.replace(/\s*$/, "\n\n")}[${tableHeader}]\n${body.replace(/\n?$/, "\n")}`;
}

function findTable(text, tableHeader) {
  const escapedHeader = tableHeader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(^|\\n)(\\[${escapedHeader}\\]\\n)([\\s\\S]*?)(?=\\n\\[|$)`);
  const match = regex.exec(text);
  if (!match) return null;
  return {
    start: match.index + match[1].length,
    bodyStart: match.index + match[1].length + match[2].length,
    bodyEnd: match.index + match[0].length,
    body: match[3],
  };
}

function findTomlArrayAssignment(body, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(^|\\n)(\\s*${escapedKey}\\s*=\\s*)`, "m");
  const match = regex.exec(body);
  if (!match) return null;
  let valueStart = match.index + match[1].length + match[2].length;
  while (/\s/.test(body[valueStart] || "")) valueStart += 1;
  if (body[valueStart] !== "[") return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = valueStart; index < body.length; index += 1) {
    const char = body[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === "\"") inString = false;
      continue;
    }
    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return { valueStart, valueEnd: index + 1 };
      }
    }
  }
  return null;
}

function tomlString(value) {
  return JSON.stringify(String(value));
}

function hookCommand() {
  return `node ${JSON.stringify(path.join(installedPluginDir, "hooks", "aionis-codex-hook.mjs"))}`;
}

function hookMatcherGroupToml(event, matcher, statusMessage) {
  return [
    "[",
    "  {",
    `    matcher = ${tomlString(matcher)},`,
    "    hooks = [",
    "      {",
    '        type = "command",',
    `        command = ${tomlString(hookCommand())},`,
    "        async = false,",
    "        timeoutSec = 20,",
    `        statusMessage = ${tomlString(statusMessage)},`,
    "      },",
    "    ],",
    "  },",
    "]",
  ].join("\n");
}

function mergeTomlArray(existingArray, itemArray) {
  const existingInner = existingArray.trim().slice(1, -1).trim();
  const itemInner = itemArray.trim().slice(1, -1).trim();
  if (!existingInner) return itemArray;
  const comma = existingInner.endsWith(",") ? "" : ",";
  return `[\n${existingInner}${comma}\n${itemInner}\n]`;
}

function ensureHooksTable(text) {
  const table = findTable(text, "hooks");
  if (!table) {
    const body = codexHookEvents
      .map(([event, matcher, statusMessage]) => `${event} = ${hookMatcherGroupToml(event, matcher, statusMessage)}`)
      .join("\n\n");
    return `${text.replace(/\s*$/, "\n\n")}[hooks]\n${body}\n`;
  }

  let body = table.body;
  for (const [event, matcher, statusMessage] of codexHookEvents) {
    const assignment = findTomlArrayAssignment(body, event);
    const aionisHook = hookMatcherGroupToml(event, matcher, statusMessage);
    if (!assignment) {
      body = `${body.replace(/\s*$/, "\n\n")}${event} = ${aionisHook}\n`;
      continue;
    }
    const currentValue = body.slice(assignment.valueStart, assignment.valueEnd);
    if (currentValue.includes("aionis-codex-hook.mjs")) {
      if (!currentValue.includes("async = false,")) {
        body = `${body.slice(0, assignment.valueStart)}${aionisHook}${body.slice(assignment.valueEnd)}`;
      }
      continue;
    }
    const merged = mergeTomlArray(currentValue, aionisHook);
    body = `${body.slice(0, assignment.valueStart)}${merged}${body.slice(assignment.valueEnd)}`;
  }

  return `${text.slice(0, table.bodyStart)}${body.replace(/\s*$/, "\n")}${text.slice(table.bodyEnd)}`;
}

function ensureFeaturesConfig(text) {
  const hooksLine = "codex_hooks = true";
  if (/^\s*codex_hooks\s*=/m.test(text)) {
    return text.replace(/^\s*codex_hooks\s*=\s*(true|false)\s*$/m, hooksLine);
  }
  if (/^\[features\]\s*$/m.test(text)) {
    return text.replace(/^\[features\]\s*$/m, `[features]\n${hooksLine}`);
  }
  return `${text.replace(/\s*$/, "\n\n")}[features]\n${hooksLine}\n`;
}

function ensurePluginEnabledConfig(text) {
  let next = ensureFeaturesConfig(text);
  next = ensureHooksTable(next);
  next = replaceOrInsertTable(next, "marketplaces.local", [
    'source_type = "local"',
    `source = ${JSON.stringify(home)}`,
  ].join("\n"));
  next = replaceOrInsertTable(next, 'plugins."aionis-codex@local"', "enabled = true\n");
  return next.replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "\n");
}

function ensureCodexConfig() {
  fs.mkdirSync(path.dirname(codexConfigPath), { recursive: true });
  const current = fs.existsSync(codexConfigPath)
    ? fs.readFileSync(codexConfigPath, "utf8")
    : "";
  const next = ensurePluginEnabledConfig(current);
  if (next !== current) {
    fs.writeFileSync(codexConfigPath, next, "utf8");
  }
}

ensureSymlink();
ensureMarketplace();
const actualPluginRoot = ensureInstalledPluginDir();
ensureCodexConfig();
const cachePluginRoot = ensureCodexPluginCache();
const watchdog = installWatchdog
  ? installLaunchAgent(actualPluginRoot, { load: loadWatchdog, runtimeHome })
  : { supported: process.platform === "darwin", loaded: false, message: "LaunchAgent watchdog install skipped." };

process.stdout.write([
  "Aionis Codex plugin installed locally.",
  `plugin_link=${localPluginLink}`,
  `plugin_dir=${actualPluginRoot}`,
  `plugin_cache=${cachePluginRoot}`,
  `marketplace=${marketplacePath}`,
  codexHooksEnabled()
    ? "codex_hooks=true is enabled."
    : `codex_hooks could not be confirmed in ${codexConfigPath}`,
  aionisManagedHooksConfigured()
    ? "managed_hooks=aionis-codex installed."
    : `managed_hooks could not be confirmed in ${codexConfigPath}`,
  'plugin_config=[plugins."aionis-codex@local"] enabled=true',
  `watchdog=${watchdog.supported ? watchdog.message : "unsupported on this OS"}`,
  watchdog.options?.plistPath ? `watchdog_plist=${watchdog.options.plistPath}` : null,
  watchdog.options?.runtimeHome ? `runtime_home=${watchdog.options.runtimeHome}` : null,
  "",
].filter(Boolean).join("\n") + "\n");

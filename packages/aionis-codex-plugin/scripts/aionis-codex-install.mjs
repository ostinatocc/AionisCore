#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "..");
const home = os.homedir();
const agentsPluginsRoot = path.join(home, ".agents", "plugins");
const localPluginsDir = path.join(home, "plugins");
const localPluginLink = path.join(localPluginsDir, "aionis-codex");
const marketplacePath = path.join(agentsPluginsRoot, "marketplace.json");
const codexConfigPath = path.join(home, ".codex", "config.toml");

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

function codexHooksEnabled() {
  try {
    const config = fs.readFileSync(codexConfigPath, "utf8");
    return /^\s*codex_hooks\s*=\s*true\s*$/m.test(config);
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
ensureCodexConfig();

process.stdout.write([
  "Aionis Codex plugin installed locally.",
  `plugin_link=${localPluginLink}`,
  `marketplace=${marketplacePath}`,
  codexHooksEnabled()
    ? "codex_hooks=true is enabled."
    : `codex_hooks could not be confirmed in ${codexConfigPath}`,
  'plugin_config=[plugins."aionis-codex@local"] enabled=true',
  "",
].join("\n"));

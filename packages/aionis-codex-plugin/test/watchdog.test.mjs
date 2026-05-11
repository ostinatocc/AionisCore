import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  WATCHDOG_LABEL,
  defaultLaunchAgentOptions,
  renderLaunchAgentPlist,
  writeLaunchAgentPlist,
} from "../lib/aionis-codex-watchdog.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "..");

test("renderLaunchAgentPlist describes the Aionis Runtime watchdog", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-watchdog-home-"));
  const options = defaultLaunchAgentOptions(pluginRoot, {
    home,
    runtimeHome: path.join(home, ".aionis", "codex"),
    nodePath: "/usr/local/bin/node",
    pathEnv: "/usr/local/bin:/usr/bin:/bin",
    baseUrl: "http://127.0.0.1:3101",
    intervalMs: 12345,
    runtimeCommand: "'/usr/local/bin/node' '/Users/lucio/.aionis/runtime/bin/aionis-runtime' start",
  });
  const plist = renderLaunchAgentPlist(options);

  assert.match(plist, new RegExp(`<string>${WATCHDOG_LABEL}</string>`));
  assert.match(plist, /<key>KeepAlive<\/key>\s*<true\/>/);
  assert.match(plist, /aionis-codex-runtime-daemon\.mjs/);
  assert.match(plist, /<key>AIONIS_CODEX_AUTOSTART<\/key>\s*<string>true<\/string>/);
  assert.match(plist, /<key>AIONIS_CODEX_WATCHDOG_INTERVAL_MS<\/key>\s*<string>12345<\/string>/);
  assert.match(plist, /<key>AIONIS_CODEX_RUNTIME_COMMAND<\/key>\s*<string>&apos;\/usr\/local\/bin\/node&apos; &apos;\/Users\/lucio\/\.aionis\/runtime\/bin\/aionis-runtime&apos; start<\/string>/);
});

test("writeLaunchAgentPlist writes a stable plist file", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-watchdog-home-"));
  const options = defaultLaunchAgentOptions(pluginRoot, {
    home,
    runtimeHome: path.join(home, ".aionis", "codex"),
    nodePath: "/usr/local/bin/node",
  });

  const plistPath = writeLaunchAgentPlist(options);
  const plist = fs.readFileSync(plistPath, "utf8");
  assert.equal(plistPath, path.join(home, "Library", "LaunchAgents", `${WATCHDOG_LABEL}.plist`));
  assert.match(plist, /<key>RunAtLoad<\/key>\s*<true\/>/);
  assert.match(plist, new RegExp(`<string>${options.runtimeHome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</string>`));
});

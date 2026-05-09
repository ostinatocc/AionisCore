import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "..");

test("installer writes Codex managed hooks into config", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-codex-install-test-"));
  const result = spawnSync(process.execPath, ["scripts/aionis-codex-install.mjs", "--no-watchdog"], {
    cwd: pluginRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home,
    },
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /managed_hooks=aionis-codex installed/);

  const config = fs.readFileSync(path.join(home, ".codex", "config.toml"), "utf8");
  assert.match(config, /\[hooks\]/);
  for (const event of ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop", "PermissionRequest"]) {
    assert.match(config, new RegExp(`^\\s*${event}\\s*=`, "m"));
  }
  assert.match(config, /aionis-codex-hook\.mjs/);
  assert.match(config, /async = false/);
  assert.match(config, /timeoutSec = 20/);
});

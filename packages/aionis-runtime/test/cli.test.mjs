import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(packageDir, "dist", "bin", "aionis-runtime.mjs");

test("runtime cli prints help", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /aionis-runtime start/);
  assert.match(result.stdout, /aionis-runtime codex install/);
});

test("runtime cli prints package version", () => {
  const result = spawnSync(process.execPath, [cliPath, "--version"], {
    encoding: "utf8",
  });
  const packageJson = JSON.parse(readFileSync(path.join(packageDir, "package.json"), "utf8"));

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), packageJson.version);
});

test("runtime cli prints standalone lite defaults", () => {
  const cwd = path.join(packageDir, ".tmp", "consumer-cwd");
  mkdirSync(cwd, { recursive: true });
  const result = spawnSync(process.execPath, [cliPath, "start", "--print-env"], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      LITE_SANDBOX_PROFILE: "local_process_echo",
    },
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);

  assert.equal(parsed.AIONIS_EDITION, "lite");
  assert.equal(parsed.AIONIS_MODE, "local");
  assert.equal(parsed.APP_ENV, "dev");
  assert.equal(parsed.AIONIS_LISTEN_HOST, "127.0.0.1");
  assert.equal(parsed.MEMORY_AUTH_MODE, "off");
  assert.equal(parsed.TENANT_QUOTA_ENABLED, "false");
  assert.equal(parsed.RATE_LIMIT_BYPASS_LOOPBACK, "true");
  assert.equal(parsed.LITE_INSPECTOR_ENABLED, "false");
  assert.equal(parsed.SANDBOX_ENABLED, "true");
  assert.equal(parsed.SANDBOX_EXECUTOR_MODE, "local_process");
  assert.equal(parsed.SANDBOX_ALLOWED_COMMANDS_JSON, "[\"echo\"]");
  assert.equal(
    parsed.LITE_REPLAY_SQLITE_PATH,
    path.join(cwd, ".tmp", "aionis-lite-replay.sqlite"),
  );
  assert.equal(
    parsed.LITE_WRITE_SQLITE_PATH,
    path.join(cwd, ".tmp", "aionis-lite-write.sqlite"),
  );
});

test("runtime cli resolves tsx through the public package export", () => {
  const source = readFileSync(path.join(packageDir, "src", "cli.mjs"), "utf8");

  assert.match(source, /require\.resolve\("tsx\/cli"\)/);
  assert.doesNotMatch(source, /tsx\/dist\/cli\.mjs/);
});

test("runtime cli starts the executable runtime entrypoint", () => {
  const source = readFileSync(path.join(packageDir, "src", "cli.mjs"), "utf8");

  assert.match(source, /src", "index\.ts"/);
  assert.doesNotMatch(source, /src", "runtime-entry\.ts"/);
});

test("runtime cli bundles and installs the Codex plugin into a stable home directory", () => {
  const home = mkdtempSync(path.join(os.tmpdir(), "aionis-codex-home-"));
  const runtimeHome = path.join(home, ".aionis", "codex");
  const env = {
    ...process.env,
    HOME: home,
    AIONIS_CODEX_RUNTIME_HOME: runtimeHome,
  };

  assert.ok(existsSync(path.join(packageDir, "dist", "codex-plugin", ".codex-plugin", "plugin.json")));

  const install = spawnSync(process.execPath, [cliPath, "codex", "install", "--no-watchdog", "--skip-doctor"], {
    encoding: "utf8",
    env,
  });
  assert.equal(install.status, 0, install.stderr);
  assert.match(install.stdout, /Aionis Codex plugin materialized/);

  const pluginDir = path.join(runtimeHome, "plugin");
  assert.ok(existsSync(path.join(pluginDir, ".codex-plugin", "plugin.json")));
  assert.ok(existsSync(path.join(home, "plugins", "aionis-codex")));
  assert.match(readFileSync(path.join(home, ".codex", "config.toml"), "utf8"), /codex_hooks = true/);
  assert.match(readFileSync(path.join(home, ".agents", "plugins", "marketplace.json"), "utf8"), /aionis-codex/);

  const status = spawnSync(process.execPath, [cliPath, "codex", "status", "--no-runtime", "--no-watchdog"], {
    encoding: "utf8",
    env,
  });
  assert.equal(status.status, 0, `${status.stdout}\n${status.stderr}`);
  assert.match(status.stdout, /PASS installed plugin/);
  assert.match(status.stdout, /PASS Codex plugin symlink/);
});

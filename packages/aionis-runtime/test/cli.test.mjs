import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdirSync } from "node:fs";
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
});

test("runtime cli prints package version", () => {
  const result = spawnSync(process.execPath, [cliPath, "--version"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "0.2.0");
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

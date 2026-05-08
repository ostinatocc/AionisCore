import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sharedNpmCache = process.env.AIONIS_NPM_CACHE_DIR || "/tmp/aionis-npm-cache";

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    timeout: 180000,
    ...options,
  });
}

async function waitForHealth(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
      lastError = new Error(`health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw lastError || new Error("timed out waiting for health");
}

function randomPort() {
  return 41000 + Math.floor(Math.random() * 10000);
}

test("published tarball CLI resolves package metadata and starts through tsx", async () => {
  const workdir = mkdtempSync(path.join(os.tmpdir(), "aionis-runtime-pack-test-"));
  const packDir = path.join(workdir, "pack");
  const appDir = path.join(workdir, "app");
  mkdirSync(packDir, { recursive: true });
  mkdirSync(appDir, { recursive: true });

  const pack = run("npm", ["pack", "--json", "--pack-destination", packDir, "--cache", sharedNpmCache], {
    cwd: packageDir,
  });
  assert.equal(pack.status, 0, pack.error?.message || pack.stderr);
  const packInfo = JSON.parse(pack.stdout)[0];
  const tarball = path.join(packDir, packInfo.filename);
  assert.ok(packInfo.files.some((file) => file.path === "package.json"), "package.json must be included by npm");
  assert.ok(packInfo.files.some((file) => file.path === "dist/bin/aionis-runtime.mjs"), "dist CLI must be included");
  assert.ok(packInfo.files.some((file) => file.path === "dist/runtime/src/index.ts"), "runtime source entry must be included");

  const install = run("npm", ["install", "--package-lock=false", "--no-audit", "--ignore-scripts", "--prefer-offline", "--cache", sharedNpmCache, tarball], {
    cwd: appDir,
  });
  assert.equal(install.status, 0, install.error?.message || install.stderr);

  const bin = path.join(appDir, "node_modules", ".bin", "aionis-runtime");
  const version = run(bin, ["--version"], { cwd: appDir });
  const packageJson = JSON.parse(readFileSync(path.join(packageDir, "package.json"), "utf8"));
  assert.equal(version.status, 0, version.stderr);
  assert.equal(version.stdout.trim(), packageJson.version);

  const printEnv = run(bin, ["start", "--print-env"], { cwd: appDir });
  assert.equal(printEnv.status, 0, printEnv.stderr);
  const env = JSON.parse(printEnv.stdout);
  assert.equal(env.AIONIS_EDITION, "lite");
  assert.equal(env.AIONIS_MODE, "local");
  assert.match(env.LITE_REPLAY_SQLITE_PATH, /aionis-lite-replay\.sqlite$/);
  assert.match(env.LITE_WRITE_SQLITE_PATH, /aionis-lite-write\.sqlite$/);

  const port = String(randomPort());
  const stdout = [];
  const stderr = [];
  const runtime = spawn(bin, ["start"], {
    cwd: appDir,
    env: {
      ...process.env,
      PORT: port,
      AIONIS_LISTEN_HOST: "127.0.0.1",
      LITE_REPLAY_SQLITE_PATH: path.join(workdir, "runtime", "replay.sqlite"),
      LITE_WRITE_SQLITE_PATH: path.join(workdir, "runtime", "write.sqlite"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  runtime.stdout.setEncoding("utf8");
  runtime.stderr.setEncoding("utf8");
  runtime.stdout.on("data", (chunk) => stdout.push(chunk));
  runtime.stderr.on("data", (chunk) => stderr.push(chunk));
  try {
    const health = await waitForHealth(`http://127.0.0.1:${port}/health`);
    assert.equal(health.ok, true);
    assert.equal(health.runtime.edition, "lite");
  } catch (error) {
    assert.fail([
      String(error.message || error),
      "stdout:",
      stdout.join(""),
      "stderr:",
      stderr.join(""),
    ].join("\n"));
  } finally {
    runtime.kill("SIGTERM");
    await new Promise((resolve) => runtime.once("close", resolve));
  }
});

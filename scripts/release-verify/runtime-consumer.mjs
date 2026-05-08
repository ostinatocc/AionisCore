import path from "node:path";
import os from "node:os";
import { mkdtempSync, readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const consumerDir = path.dirname(fileURLToPath(import.meta.url));
const installedPackageJson = path.join(
  consumerDir,
  "node_modules",
  "@ostinato",
  "aionis-runtime",
  "package.json",
);
const binPath = path.join(
  consumerDir,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "aionis-runtime.cmd" : "aionis-runtime",
);

function randomPort() {
  return 41000 + Math.floor(Math.random() * 10000);
}

async function waitForHealth(url, timeoutMs = 30000) {
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
  throw lastError || new Error("timed out waiting for runtime health");
}

const help = spawnSync(binPath, ["--help"], {
  cwd: consumerDir,
  encoding: "utf8",
});

if (help.status !== 0) {
  throw new Error(`runtime help failed: ${help.stderr || help.stdout}`);
}

const version = spawnSync(binPath, ["--version"], {
  cwd: consumerDir,
  encoding: "utf8",
});

if (version.status !== 0) {
  throw new Error(`runtime version failed: ${version.stderr || version.stdout}`);
}

const installedPackage = JSON.parse(readFileSync(installedPackageJson, "utf8"));

if (version.stdout.trim() !== installedPackage.version) {
  throw new Error(`runtime package printed unexpected version: ${version.stdout}`);
}

const printed = spawnSync(binPath, ["start", "--print-env"], {
  cwd: consumerDir,
  encoding: "utf8",
});

if (printed.status !== 0) {
  throw new Error(`runtime print-env failed: ${printed.stderr || printed.stdout}`);
}

const env = JSON.parse(printed.stdout);

if (env.AIONIS_EDITION !== "lite") {
  throw new Error("runtime package did not default to lite edition");
}

if (env.AIONIS_LISTEN_HOST !== "127.0.0.1") {
  throw new Error("runtime package did not default to loopback bind");
}

const runtimeHome = mkdtempSync(path.join(os.tmpdir(), "aionis-runtime-release-verify-"));
const port = String(randomPort());
const runtimeStdout = [];
const runtimeStderr = [];
const runtime = spawn(binPath, ["start"], {
  cwd: consumerDir,
  env: {
    ...process.env,
    PORT: port,
    AIONIS_LISTEN_HOST: "127.0.0.1",
    LITE_REPLAY_SQLITE_PATH: path.join(runtimeHome, "replay.sqlite"),
    LITE_WRITE_SQLITE_PATH: path.join(runtimeHome, "write.sqlite"),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
const closed = new Promise((resolve) => runtime.once("close", resolve));
runtime.stdout.setEncoding("utf8");
runtime.stderr.setEncoding("utf8");
runtime.stdout.on("data", (chunk) => runtimeStdout.push(chunk));
runtime.stderr.on("data", (chunk) => runtimeStderr.push(chunk));

try {
  const health = await waitForHealth(`http://127.0.0.1:${port}/health`);
  if (health.ok !== true) {
    throw new Error(`runtime health did not return ok: ${JSON.stringify(health)}`);
  }
  if (health.runtime?.edition !== "lite") {
    throw new Error(`runtime health did not report lite edition: ${JSON.stringify(health)}`);
  }
} catch (error) {
  throw new Error([
    error.message || String(error),
    "runtime stdout:",
    runtimeStdout.join(""),
    "runtime stderr:",
    runtimeStderr.join(""),
  ].join("\n"));
} finally {
  runtime.kill("SIGTERM");
  await closed;
}

console.log(
  JSON.stringify(
    {
      ok: true,
      package_name: "@ostinato/aionis-runtime",
      package_version: installedPackage.version,
      exports_checked: [
        "bin.aionis-runtime",
        "--version",
        "start",
        "start --print-env",
        "start /health",
        "lite loopback defaults",
      ],
    },
    null,
    2,
  ),
);

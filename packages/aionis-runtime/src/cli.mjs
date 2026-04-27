#!/usr/bin/env node

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const cliDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(cliDir, "..");
const runtimeDir = path.join(distDir, "runtime");
const runtimeEntry = path.join(runtimeDir, "src", "runtime-entry.ts");
const inspectorDistDir = path.join(runtimeDir, "apps", "inspector", "dist");
const cwd = process.cwd();

function printHelp() {
  process.stdout.write(`Aionis Runtime\n\nUsage:\n  aionis-runtime start [--print-env] [node args...]\n  aionis-runtime --help\n  aionis-runtime --version\n\nCommands:\n  start         Start the Lite runtime with standalone package defaults.\n\nFlags:\n  --print-env   Print the effective runtime env as JSON and exit.\n  --help        Show this help.\n  --version     Show the package version.\n`);
}

function printVersion() {
  const packageJson = readPackageJson();
  process.stdout.write(`${packageJson.version}\n`);
}

function readPackageJson() {
  const candidates = [
    path.join(cliDir, "..", "package.json"),
    path.join(cliDir, "..", "..", "package.json"),
  ];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (error) {
      if (error && error.code !== "MODULE_NOT_FOUND") {
        throw error;
      }
    }
  }

  throw new Error("Unable to locate @ostinato/aionis-runtime package.json");
}

function assertNodeSqliteSupport() {
  try {
    require("node:sqlite");
  } catch {
    process.stderr.write("aionis-runtime requires Node.js with node:sqlite support. Use Node 22+.\n");
    process.exit(1);
  }
}

function resolveSqlitePath(filename) {
  return path.join(cwd, ".tmp", filename);
}

function applyLiteRuntimeDefaults(env) {
  env.AIONIS_EDITION ||= "lite";
  env.AIONIS_MODE ||= "local";
  env.APP_ENV ||= "dev";
  env.AIONIS_LISTEN_HOST ||= "127.0.0.1";
  env.MEMORY_AUTH_MODE ||= "off";
  env.TENANT_QUOTA_ENABLED ||= "false";
  env.RATE_LIMIT_BYPASS_LOOPBACK ||= "true";
  env.LITE_REPLAY_SQLITE_PATH ||= resolveSqlitePath("aionis-lite-replay.sqlite");
  env.LITE_WRITE_SQLITE_PATH ||= resolveSqlitePath("aionis-lite-write.sqlite");
  env.LITE_LOCAL_ACTOR_ID ||= "local-user";
  env.SANDBOX_ENABLED ||= "true";
  env.SANDBOX_ADMIN_ONLY ||= "false";

  if (!("LITE_INSPECTOR_ENABLED" in env)) {
    env.LITE_INSPECTOR_ENABLED = "false";
  }

  if (env.LITE_INSPECTOR_ENABLED === "true" && !env.LITE_INSPECTOR_DIST_PATH) {
    env.LITE_INSPECTOR_DIST_PATH = inspectorDistDir;
  }

  const sandboxProfile = env.LITE_SANDBOX_PROFILE ?? "";
  switch (sandboxProfile) {
    case "":
      break;
    case "local_process_echo":
      env.SANDBOX_EXECUTOR_MODE ||= "local_process";
      env.SANDBOX_ALLOWED_COMMANDS_JSON ||= "[\"echo\"]";
      break;
    default:
      process.stderr.write(`Unknown LITE_SANDBOX_PROFILE=${sandboxProfile}\nSupported profiles:\n  local_process_echo\n`);
      process.exit(1);
  }
}

async function ensureLiteRuntimeDirs(env) {
  await mkdir(path.dirname(env.LITE_REPLAY_SQLITE_PATH), { recursive: true });
  await mkdir(path.dirname(env.LITE_WRITE_SQLITE_PATH), { recursive: true });
}

function printEnv(env) {
  const keys = [
    "AIONIS_EDITION",
    "AIONIS_MODE",
    "APP_ENV",
    "AIONIS_LISTEN_HOST",
    "MEMORY_AUTH_MODE",
    "TENANT_QUOTA_ENABLED",
    "RATE_LIMIT_BYPASS_LOOPBACK",
    "LITE_REPLAY_SQLITE_PATH",
    "LITE_WRITE_SQLITE_PATH",
    "LITE_LOCAL_ACTOR_ID",
    "LITE_INSPECTOR_ENABLED",
    "LITE_INSPECTOR_DIST_PATH",
    "LITE_SANDBOX_PROFILE",
    "SANDBOX_ENABLED",
    "SANDBOX_ADMIN_ONLY",
    "SANDBOX_EXECUTOR_MODE",
    "SANDBOX_ALLOWED_COMMANDS_JSON",
  ];
  process.stdout.write(
    `${JSON.stringify(Object.fromEntries(keys.map((key) => [key, env[key] ?? null])), null, 2)}\n`,
  );
}

async function startRuntime(args) {
  assertNodeSqliteSupport();
  const env = { ...process.env };
  applyLiteRuntimeDefaults(env);
  await ensureLiteRuntimeDirs(env);

  if (args[0] === "--print-env") {
    printEnv(env);
    return;
  }

  const tsxCli = require.resolve("tsx/dist/cli.mjs");
  const child = spawn(process.execPath, [tsxCli, runtimeEntry, ...args], {
    cwd,
    stdio: "inherit",
    env,
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      if (!child.killed) child.kill(signal);
    });
  }

  const exit = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });

  if (exit.signal) {
    process.kill(process.pid, exit.signal);
  }

  process.exit(exit.code ?? 0);
}

const [, , command, ...args] = process.argv;

if (!command || command === "--help" || command === "-h" || command === "help") {
  printHelp();
  process.exit(0);
}

if (command === "--version" || command === "-v") {
  printVersion();
  process.exit(0);
}

if (command !== "start") {
  process.stderr.write(`Unknown command: ${command}\n\n`);
  printHelp();
  process.exit(1);
}

await startRuntime(args);

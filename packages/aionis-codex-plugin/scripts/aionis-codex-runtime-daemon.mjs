#!/usr/bin/env node
import path from "node:path";
import {
  compactJson,
  ensureRuntime,
  nowIso,
  resolveConfig,
  runtimeHealth,
  writeJsonFile,
} from "../lib/aionis-codex-runtime.mjs";
import { DEFAULT_WATCHDOG_INTERVAL_MS } from "../lib/aionis-codex-watchdog.mjs";

function intEnv(name, fallback, min, max) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function statusPath(config) {
  return path.join(config.stateDir, "watchdog-status.json");
}

function writeStatus(config, status) {
  writeJsonFile(statusPath(config), {
    ...status,
    base_url: config.baseUrl,
    runtime_home: config.runtimeHome,
    updated_at: nowIso(),
  });
}

function log(message, data) {
  const suffix = data === undefined ? "" : ` ${compactJson(data, 1600)}`;
  process.stdout.write(`[aionis-watchdog] ${nowIso()} ${message}${suffix}\n`);
}

function logError(message, error) {
  const payload = {
    message: error?.message || String(error),
    status: error?.status,
    payload: error?.payload,
  };
  process.stderr.write(`[aionis-watchdog] ${nowIso()} ${message} ${compactJson(payload, 1600)}\n`);
}

let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});

const config = resolveConfig({});
const intervalMs = intEnv("AIONIS_CODEX_WATCHDOG_INTERVAL_MS", DEFAULT_WATCHDOG_INTERVAL_MS, 2500, 300000);

log("started", { base_url: config.baseUrl, interval_ms: intervalMs, runtime_home: config.runtimeHome });

while (!stopping) {
  try {
    try {
      const health = await runtimeHealth(config);
      writeStatus(config, { ok: true, started: false, health });
      log("runtime healthy", { started: false });
    } catch {
      const status = await ensureRuntime(config);
      writeStatus(config, {
        ok: status.ok,
        started: status.started,
        health: status.health || null,
        error: status.error ? String(status.error.message || status.error) : null,
      });
      if (status.ok) {
        log("runtime ensured", { started: status.started });
      } else {
        logError("runtime unavailable", status.error);
      }
    }
  } catch (error) {
    writeStatus(config, { ok: false, started: false, error: String(error.message || error) });
    logError("watchdog tick failed", error);
  }
  await sleep(intervalMs);
}

writeStatus(config, { ok: false, stopped: true });
log("stopped");

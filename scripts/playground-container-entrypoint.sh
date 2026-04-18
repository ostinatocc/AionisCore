#!/usr/bin/env bash
# shellcheck disable=SC2086
set -euo pipefail

# ---------------------------------------------------------------------------
# Aionis Playground container entrypoint.
#
# Runs *two* processes in a single Fly VM:
#   1. `node apps/lite/src/index.js` → Aionis Lite on 127.0.0.1:3001 (internal)
#   2. `node apps/playground-adapter/src/server.mjs` → adapter on 0.0.0.0:8080
#
# Before the adapter accepts traffic, we:
#   - wait for Lite's /health to report 200
#   - one-time seed the `default/playground:demo` scope if /data/.seeded
#     does not exist
# ---------------------------------------------------------------------------

DATA_DIR="${DATA_DIR:-/data}"
SEED_MARKER="${SEED_MARKER:-${DATA_DIR}/.seeded}"
LITE_HEALTH_URL="${LITE_HEALTH_URL:-http://127.0.0.1:3001/health}"
LITE_BOOT_TIMEOUT_SECONDS="${LITE_BOOT_TIMEOUT_SECONDS:-60}"
SEED_PACK_PATH="${SEED_PACK_PATH:-/app/apps/playground/public/seed-pack.json}"
SEED_TENANT_ID="${DEMO_TENANT_ID:-default}"
SEED_SCOPE="${DEMO_SCOPE:-playground:demo}"

mkdir -p "${DATA_DIR}"

# Lite env — point SQLite at the persistent volume and disable the Inspector UI.
export PORT="${PORT:-3001}"
export LITE_REPLAY_SQLITE_PATH="${LITE_REPLAY_SQLITE_PATH:-${DATA_DIR}/aionis-lite-replay.sqlite}"
export LITE_WRITE_SQLITE_PATH="${LITE_WRITE_SQLITE_PATH:-${DATA_DIR}/aionis-lite-write.sqlite}"
export LITE_INSPECTOR_ENABLED="${LITE_INSPECTOR_ENABLED:-false}"
export LITE_LOCAL_ACTOR_ID="${LITE_LOCAL_ACTOR_ID:-playground-public}"
export AIONIS_EDITION="${AIONIS_EDITION:-lite}"
export AIONIS_MODE="${AIONIS_MODE:-local}"
export MEMORY_AUTH_MODE="${MEMORY_AUTH_MODE:-off}"
export TENANT_QUOTA_ENABLED="${TENANT_QUOTA_ENABLED:-false}"
export RATE_LIMIT_BYPASS_LOOPBACK="${RATE_LIMIT_BYPASS_LOOPBACK:-true}"
export SANDBOX_ENABLED="${SANDBOX_ENABLED:-false}"
export SANDBOX_ADMIN_ONLY="${SANDBOX_ADMIN_ONLY:-true}"

log() { printf '[entrypoint] %s\n' "$*" >&2; }

shutdown() {
  log "shutdown signal received; stopping Lite (pid=${LITE_PID:-n/a})"
  if [[ -n "${LITE_PID:-}" ]] && kill -0 "${LITE_PID}" 2>/dev/null; then
    kill -TERM "${LITE_PID}" 2>/dev/null || true
    wait "${LITE_PID}" 2>/dev/null || true
  fi
  exit 0
}

trap shutdown SIGINT SIGTERM

log "starting Aionis Lite on 127.0.0.1:${PORT}"
cd /app

node apps/lite/src/index.js &
LITE_PID=$!
log "Lite pid=${LITE_PID}"

log "waiting for Lite /health (timeout=${LITE_BOOT_TIMEOUT_SECONDS}s)"
ELAPSED=0
until curl -s --max-time 2 "${LITE_HEALTH_URL}" >/dev/null 2>&1; do
  if ! kill -0 "${LITE_PID}" 2>/dev/null; then
    log "Lite process died before /health came up"
    exit 1
  fi
  if (( ELAPSED >= LITE_BOOT_TIMEOUT_SECONDS )); then
    log "timed out waiting for Lite /health"
    exit 1
  fi
  sleep 1
  ELAPSED=$((ELAPSED + 1))
done
log "Lite /health reachable after ${ELAPSED}s"

if [[ ! -f "${SEED_MARKER}" ]]; then
  if [[ -f "${SEED_PACK_PATH}" ]]; then
    log "seeding scope ${SEED_TENANT_ID}/${SEED_SCOPE} from ${SEED_PACK_PATH}"
    AIONIS_API_URL="http://127.0.0.1:${PORT}" \
      DEMO_TENANT_ID="${SEED_TENANT_ID}" \
      DEMO_SCOPE="${SEED_SCOPE}" \
      SEED_PACK_PATH="${SEED_PACK_PATH}" \
      node apps/playground/scripts/seed-remote.mjs
    date -u +"%Y-%m-%dT%H:%M:%SZ" > "${SEED_MARKER}"
    log "seed marker written to ${SEED_MARKER}"
  else
    log "seed-pack.json not found at ${SEED_PACK_PATH}; starting adapter without seeding"
  fi
else
  log "seed marker present (${SEED_MARKER}); skipping seed"
fi

log "starting playground adapter on 0.0.0.0:${ADAPTER_PORT:-8080}"
exec node apps/playground-adapter/src/server.mjs

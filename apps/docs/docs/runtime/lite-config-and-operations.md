---
title: Lite Config And Operations
slug: /runtime/lite-config-and-operations
---

# Lite config and operations

Use this page when you need to run Lite reliably, change local defaults, or debug startup behavior.

## Startup commands

The normal local path is:

```bash
npm install
npm run lite:start
```

The Lite shell also exposes the app-local commands:

```bash
npm --prefix apps/lite run start
npm --prefix apps/lite run start:print-env
```

## Actual startup chain

Lite starts through this chain:

1. `apps/lite/scripts/start-lite-app.sh`
2. `apps/lite/src/index.js`
3. `src/index.ts`
4. `src/runtime-entry.ts`

That means the shell is thin and `src/runtime-entry.ts` remains the runtime truth for assembly and route startup.

## Default Lite environment

The startup script sets these defaults unless you override them:

| Variable | Default |
| --- | --- |
| `AIONIS_EDITION` | `lite` |
| `AIONIS_MODE` | `local` |
| `MEMORY_AUTH_MODE` | `off` |
| `TENANT_QUOTA_ENABLED` | `false` |
| `RATE_LIMIT_BYPASS_LOOPBACK` | `true` |
| `PORT` | `3001` |
| `LITE_REPLAY_SQLITE_PATH` | `.tmp/aionis-lite-replay.sqlite` |
| `LITE_WRITE_SQLITE_PATH` | `.tmp/aionis-lite-write.sqlite` |
| `LITE_LOCAL_ACTOR_ID` | `local-user` |
| `SANDBOX_ENABLED` | `true` |
| `SANDBOX_ADMIN_ONLY` | `false` |

## Useful overrides

### Change the local actor

```bash
LITE_LOCAL_ACTOR_ID=lucio npm run lite:start
```

### Move the SQLite files

```bash
LITE_WRITE_SQLITE_PATH=/tmp/aionis-write.sqlite \
LITE_REPLAY_SQLITE_PATH=/tmp/aionis-replay.sqlite \
npm run lite:start
```

### Change the port

```bash
PORT=3101 npm run lite:start
```

### Print the effective startup environment

```bash
npm --prefix apps/lite run start:print-env
```

## Sandbox operation modes

Lite exposes sandbox routes when `SANDBOX_ENABLED=true`.

The common local-safe preset is:

```bash
LITE_SANDBOX_PROFILE=local_process_echo npm run lite:start
```

That profile narrows the executor to:

1. `SANDBOX_EXECUTOR_MODE=local_process`
2. `SANDBOX_ALLOWED_COMMANDS_JSON=["echo"]`

If you want sandbox routes gated behind the admin token again:

```bash
SANDBOX_ADMIN_ONLY=true npm run lite:start
```

## Health and operational checks

### Check runtime health

```bash
curl http://127.0.0.1:3001/health
```

Look for:

1. `runtime.edition`
2. `lite.route_matrix`
3. `lite.stores`
4. `sandbox`

## Memory lifecycle routes

Lite now exposes local memory lifecycle mutations directly:

1. `POST /v1/memory/archive/rehydrate`
2. `POST /v1/memory/nodes/activate`

From the SDK, those map to:

1. `aionis.memory.archive.rehydrate(...)`
2. `aionis.memory.nodes.activate(...)`

### Rebuild or validate before sharing

```bash
npm run -s build
npm run -s lite:test
npm run -s smoke:lite
```

## Important Lite boundary assumptions

Lite is intentionally opinionated:

1. auth is off by default
2. tenant quota enforcement is off by default
3. some server-only route groups, such as admin control, return structured `501`
4. Lite is designed for local-first use

## Related docs

1. [Lite Runtime](./lite-runtime.md)
2. [Architecture Overview](../architecture/overview.md)
3. [FAQ and Troubleshooting](../faq-and-troubleshooting.md)

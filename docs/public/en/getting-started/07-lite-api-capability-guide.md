---
title: "Lite API Capability Guide"
---

# Lite API Capability Guide

This page is the operator-facing summary of what `Aionis Lite` can do today.

Use it when you need the short answer to:

1. what works in Lite
2. what only works as a Lite subset
3. what still belongs to `AionisPro`

For the internal source-of-truth matrix, see [Lite API Capability Matrix](/Volumes/ziel/Aionisgo/docs/LITE_API_CAPABILITY_MATRIX.md).

## Core Runtime

Supported:

1. `npm run start:lite`
2. `npm run start:lite:local-process`
3. `GET /health`

Expected health signals:

1. `runtime.edition = "lite"`
2. `storage.backend = "lite_sqlite"`

## Supported Memory Surface

Lite supports these primary local memory routes:

1. `POST /v1/memory/write`
2. `POST /v1/memory/recall`
3. `POST /v1/memory/recall_text`
4. `POST /v1/memory/planning/context`
5. `POST /v1/memory/context/assemble`
6. `POST /v1/memory/find`
7. `POST /v1/memory/resolve`

Lite also supports local sessions and packs:

1. `POST /v1/memory/sessions`
2. `GET /v1/memory/sessions`
3. `POST /v1/memory/events`
4. `GET /v1/memory/sessions/:session_id/events`
5. `POST /v1/memory/packs/export`
6. `POST /v1/memory/packs/import`

## Supported Replay And Playbook Surface

Lite includes a real replay/playbook kernel.

Supported:

1. `POST /v1/memory/replay/run/start`
2. `POST /v1/memory/replay/step/before`
3. `POST /v1/memory/replay/step/after`
4. `POST /v1/memory/replay/run/end`
5. `POST /v1/memory/replay/runs/get`
6. `POST /v1/memory/replay/playbooks/compile_from_run`
7. `POST /v1/memory/replay/playbooks/get`
8. `POST /v1/memory/replay/playbooks/candidate`
9. `POST /v1/memory/replay/playbooks/promote`
10. `POST /v1/memory/replay/playbooks/repair`

Lite also keeps a reduced governed replay subset:

1. `POST /v1/memory/replay/playbooks/repair/review`
2. `POST /v1/memory/replay/playbooks/run`
3. `POST /v1/memory/replay/playbooks/dispatch`

That does not mean full server governance is present. It means Lite keeps the local execution path.

## Supported Handoff, Rules, And Tooling Surface

Supported:

1. `POST /v1/handoff/store`
2. `POST /v1/handoff/recover`
3. `POST /v1/memory/feedback`
4. `POST /v1/memory/rules/state`
5. `POST /v1/memory/rules/evaluate`
6. `POST /v1/memory/tools/select`
7. `POST /v1/memory/tools/decision`
8. `POST /v1/memory/tools/run`
9. `POST /v1/memory/tools/runs/list`
10. `POST /v1/memory/tools/feedback`

## Supported Lite Automation Kernel

Lite includes a local playbook-driven automation kernel.

Supported:

1. `POST /v1/automations/create`
2. `POST /v1/automations/get`
3. `POST /v1/automations/list`
4. `POST /v1/automations/validate`
5. `POST /v1/automations/graph/validate`
6. `POST /v1/automations/run`
7. `POST /v1/automations/runs/get`
8. `POST /v1/automations/runs/list`
9. `POST /v1/automations/runs/cancel`
10. `POST /v1/automations/runs/resume`

Supported Lite node kinds:

1. `playbook`
2. `approval`
3. `condition`
4. `artifact_gate`

Not included:

1. reviewer assignment
2. promotion workflow
3. shadow governance
4. compensation governance
5. telemetry orchestration

Unsupported automation governance routes return:

1. `501 automation_feature_not_supported_in_lite`

## Supported Sandbox Surface

Sandbox is available in Lite.

Supported when `SANDBOX_ENABLED=true`:

1. `POST /v1/memory/sandbox/sessions`
2. `POST /v1/memory/sandbox/execute`
3. `POST /v1/memory/sandbox/runs/get`
4. `POST /v1/memory/sandbox/runs/logs`
5. `POST /v1/memory/sandbox/runs/artifact`
6. `POST /v1/memory/sandbox/runs/cancel`

Practical runtime modes:

1. default `mock`
2. `npm run start:lite:local-process` for the narrow local-process preset

If you set `SANDBOX_ADMIN_ONLY=true`, sandbox remains available but requires the local admin token.

## Explicitly Not Part Of Lite

These surfaces are intentionally outside the Lite product boundary:

1. `/v1/admin/control/*`
2. `/v1/memory/archive/rehydrate*`
3. `/v1/memory/nodes/activate*`
4. multi-user governance
5. full control-plane automation
6. Server HA / production topology

These route groups return:

1. `501 server_only_in_lite`

## Recommended Validation

Minimum validation:

```bash
npm install
npm run build
npm run smoke:lite
```

If you also want to validate the practical local-process sandbox preset:

```bash
npm run smoke:lite:local-process
```

If you need the exact internal route-level matrix, use [Lite API Capability Matrix](/Volumes/ziel/Aionisgo/docs/LITE_API_CAPABILITY_MATRIX.md).

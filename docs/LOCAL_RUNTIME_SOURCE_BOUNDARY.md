# Aionis Runtime Local Runtime Source Boundary

Last reviewed: 2026-04-16

Document status: living technical source-boundary reference

This document records the local-runtime source boundary inside the Aionis Runtime repository.

Current source boundary:
- `apps/lite/` owns the local runtime shell.
- `apps/lite/src/index.js` is the source-owned launcher into the local runtime shell.
- `src/runtime-entry.ts` is the runtime truth for local startup.
- `src/app/runtime-services.ts` is narrowed to local-runtime store/runtime wiring only.
- `src/app/request-guards.ts` is narrowed to local-only identity and rate-limit guards.
- `src/routes/memory-access.ts` is narrowed to local SQLite access only.
- `src/routes/memory-access.ts` also exposes local anchor payload rehydration without restoring server lifecycle routes.
- `src/routes/memory-feedback-tools.ts` is narrowed to local SQLite feedback/rules/tools access only.
- `src/routes/handoff.ts` is narrowed to local SQLite handoff store/recover only.
- `src/routes/memory-recall.ts` is narrowed to direct local recall access plus local rule evaluation.
- `src/routes/memory-context-runtime.ts` is narrowed to direct local recall access plus local rule/tool assembly.
- `src/routes/memory-replay-governed.ts` is narrowed to local replay access plus local write-backed governed replay flows.
- `src/routes/memory-sandbox.ts` stays local-runtime-only while preserving `SANDBOX_ADMIN_ONLY`.
- `packages/runtime-core/` is the shared extraction seam.
- `src/host/http-host.ts` is local-runtime-only and rejects non-local source startup.
- `src/routes/automations.ts` is reintroduced as a local automation kernel surface.
- `src/app/replay-repair-review-policy.ts` is narrowed to global plus endpoint defaults only.
- `src/jobs/` is reduced to kernel-linked helpers only:
  - `associative-linking-lib.ts`
  - `topicClusterLib.ts`

Explicitly removed from this repo:
- benchmark, perf, hosted, and backfill jobs
- dev, eval, MCP, SDK, and bench entrypoints
- admin/control and automation route source files
- benchmark fixtures and job docs tied to the full/server topology

The local automation kernel currently supports:
- create/get/list/validate for single-user local automation definitions
- run/get/list/cancel/resume for local playbook-driven automation runs
- SQLite-backed persistence in the local write database
- node kinds: `playbook`, `approval`, `condition`, `artifact_gate`
- default local identity via `LITE_LOCAL_ACTOR_ID` so replay/playbook/automation flows work without multi-tenant identity payloads

Still outside the current local runtime shell:
- archive rehydrate and node activation lifecycle routes
- server-style archive lifecycle orchestration remains unsupported even though Lite may rehydrate anchor-linked payloads locally
- reviewer workflows
- promotion/control-plane flows
- server alerting and admin automation surfaces
- repair approval/rejection workflows
- tenant-scoped replay repair review policy overlays
- compensation tooling, telemetry, and shadow review/report surfaces

Still pending before this becomes a clean source-built local runtime slice:
- shrink the copied `src/` tree further so only the local/shared-core minimum remains
- keep tightening shared-boundary metadata so local automation kernel and server orchestration are described separately

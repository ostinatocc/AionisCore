# Aionis Runtime Local Runtime Architecture

Last reviewed: 2026-04-16

Document status: living technical architecture reference

This document is the canonical architecture reference for the current Lite local runtime.

It describes the runtime as it exists in the source tree today. It does not try to preserve older completion tracking language or historical codebase metrics.

For endpoint-by-endpoint public surface details, see [LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md](LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md).

## Runtime model

The current public runtime story is Lite:

1. a local runtime shell
2. a Lite-only runtime assembly path
3. an HTTP host that registers the Lite route surface
4. SQLite-backed local persistence for write, recall, replay, automation, and host state
5. local automation and sandbox execution support

The runtime is intentionally narrower than the broader repository capability set. Server-only and control-plane route groups remain outside Lite by design.

Lite is the shipped runtime shape today. It is local-first and intended for local, dev, and CI validation rather than hardened production network exposure.

## Canonical source files

When this document and the code ever disagree, the code wins. The main runtime sources are:

1. `apps/lite/scripts/start-lite-app.sh`
2. `apps/lite/src/index.js`
3. `src/index.ts`
4. `src/runtime-entry.ts`
5. `src/app/runtime-services.ts`
6. `src/app/request-guards.ts`
7. `src/host/http-host.ts`
8. `src/host/lite-edition.ts`

## Repository seams

The local runtime is split across a few clear seams:

1. `apps/lite/`
   Owns the local runtime shell launcher and startup script.
2. `src/runtime-entry.ts`
   Owns runtime startup assembly and host registration.
3. `src/app/runtime-services.ts`
   Owns Lite-only runtime wiring.
4. `src/host/*`
   Owns HTTP host behavior, health, request hooks, route registration, and Lite-only unsupported route handling.
5. `src/memory/*`
   Owns write, recall, context, handoff, replay, automation, and sandbox behavior.
6. `src/store/*`
   Owns SQLite-backed local persistence surfaces.
7. `packages/full-sdk/`
   Owns the public SDK integration layer exposed as `@ostinato/aionis`.
8. `packages/runtime-core/`
   Marks the extraction seam between shared runtime-core code and Lite runtime concerns.

## Startup chain

The Lite startup chain is:

1. `apps/lite/scripts/start-lite-app.sh`
2. `apps/lite/src/index.js`
3. `src/index.ts`
4. `src/runtime-entry.ts`

Responsibilities:

1. `apps/lite/scripts/start-lite-app.sh`
   Sets the default local runtime environment and launches the Lite shell.
2. `apps/lite/src/index.js`
   Starts the source runtime through Node.
3. `src/index.ts`
   Delegates to `startAionisRuntime()`.
4. `src/runtime-entry.ts`
   Loads env, constructs runtime services, builds guards/policies, creates the host, registers routes, and starts the server.

## Default Lite environment

The Lite startup script sets the default local runtime behavior:

1. `AIONIS_EDITION=lite`
2. `AIONIS_MODE=local`
3. `APP_ENV=dev`
4. `AIONIS_LISTEN_HOST=127.0.0.1`
5. `MEMORY_AUTH_MODE=off`
6. `TENANT_QUOTA_ENABLED=false`
7. `RATE_LIMIT_BYPASS_LOOPBACK=true`
8. `LITE_REPLAY_SQLITE_PATH` and `LITE_WRITE_SQLITE_PATH` under `.tmp/`
9. `LITE_LOCAL_ACTOR_ID=local-user`
10. `SANDBOX_ENABLED=true`
11. `SANDBOX_ADMIN_ONLY=false`

The shell also supports `LITE_SANDBOX_PROFILE=local_process_echo`, which narrows the sandbox to a local-process echo profile.

## Runtime startup lifecycle

`src/runtime-entry.ts` is not just a thin wrapper around Fastify startup. It defines the actual Lite bootstrap order.

Current startup sequence:

1. `loadEnv()`
   Resolves the runtime environment before any store or host object exists.
2. `createRuntimeServices(env)`
   Builds the Lite store graph, embedding provider, sandbox executor, accessors, limiters, budget policy maps, and recall embed helpers.
3. `createRequestGuards(...)`
   Builds the request-time enforcement layer for identity, rate limits, inflight control, admin checks, tenant quota invariants, and Lite-local default identity injection.
4. `createSandboxBudgetService(...)`
   Builds the tenant and project sandbox budget gate.
5. `createRecallPolicy(env)`
   Builds the recall profile and strategy resolver set.
6. `createRecallTextEmbedRuntime(...)`
   Builds the recall-text embedding cache, singleflight, batching, and error mapping helpers.
7. `createReplayRuntimeOptionBuilders(...)`
   Builds replay repair review options and automation replay run options from the assembled Lite runtime state.
8. `createHttpObservabilityHelpers(...)`
   Builds host CORS resolution and request/context telemetry helpers.
9. `createReplayRepairReviewPolicy(...)`
   Builds the Lite replay repair review defaulting policy.
10. `createHttpApp(env)`
    Creates the Fastify host instance.
11. `registerHostErrorHandler(app)`
    Installs the structured error envelope layer before routes are registered.
12. `logMemoryApiConfig(...)`
    Logs the effective runtime, embedding, recall, concurrency, and sandbox configuration.
13. `registerHostRequestHooks(...)`
    Installs request ID, request timing, CORS, and telemetry hooks.
14. `registerHealthRoute(...)`
    Exposes the runtime health surface before the main application routes.
15. `registerApplicationRoutes(...)`
    Mounts the Lite route surface.
16. `registerBootstrapLifecycle(...)`
    Registers host shutdown behavior for the sandbox executor and Lite stores.
17. `assertBootstrapStoreContracts(...)`
    Verifies recall, replay, and write access contracts before the host starts listening.
18. `listenHttpApp(app, env)`
    Starts the HTTP listener on the configured port.

Two details matter here:

1. Lite fails early if the store-access contracts do not match what the host expects.
2. The shutdown path is explicit: on close, the runtime shuts down the sandbox executor and closes recall, replay, write, automation, and host stores.

## Runtime assembly

The main Lite-only runtime wiring lives in `src/app/runtime-services.ts`.

This module enforces `AIONIS_EDITION=lite` and assembles:

1. Lite host store
2. Lite write store
3. Lite recall store
4. Lite replay store
5. Lite automation definition store
6. Lite automation run store
7. embedding provider and embedding surface policy
8. sandbox executor
9. rate limiters
10. inflight gates
11. recall text embed cache and batcher
12. recall, replay, and write accessors for host registration
13. store capability flags and health metadata
14. sandbox remote host and CIDR allowlists
15. sandbox tenant budget policy parsing

The important architectural point is that Lite assembly is explicit. It does not reuse the full-runtime constructor path and then try to partially disable server behavior later.

## Policy and helper assembly

The runtime does a second assembly pass after stores and executors exist but before any route is registered.

That pass is important because most request behavior is not implemented ad hoc inside the route modules.

Central helper assemblies:

1. `src/app/recall-policy.ts`
   Owns recall profile defaults, endpoint and tenant overrides, class-aware recall resolution, adaptive recall adjustment, explicit mode handling, strategy resolution, and recall trajectory building.
2. `src/app/recall-text-embed.ts`
   Owns recall-text query embedding cache, singleflight deduplication, optional batching, and upstream error normalization.
3. `src/app/replay-runtime-options.ts`
   Owns replay repair review option assembly and automation replay run option assembly, including local executor settings, governance providers, learning projection defaults, and sandbox-backed validation execution.
4. `src/app/replay-repair-review-policy.ts`
   Owns Lite-supported replay repair review defaulting and policy parsing. In Lite, this policy is intentionally narrower than the broader server-side policy model and accepts only the supported endpoint/global shape.
5. `src/app/http-observability.ts`
   Owns memory/admin CORS policy resolution, request-to-telemetry endpoint mapping, request tenant and scope resolution for telemetry, and context-assembly telemetry recording.
6. `src/app/sandbox-budget.ts`
   Owns sandbox budget lookup and enforcement across project-specific, tenant-specific, and global defaults from either the database or environment policy maps.

The architectural consequence is deliberate: route registration receives prebuilt policy and helper closures. The route layer composes behavior; it does not define the runtime's policy model from scratch.

## Guard and identity model

`src/app/request-guards.ts` is Lite-only.

Its invariants are:

1. `AIONIS_EDITION` must be `lite`
2. `MEMORY_AUTH_MODE` must be `off`
3. `TENANT_QUOTA_ENABLED` must be `false`

The runtime still applies:

1. request identity derivation
2. admin-token checks where required
3. rate limiting
4. inflight backpressure
5. trusted-proxy and client-IP handling

Default local identity comes from `LITE_LOCAL_ACTOR_ID`, which is reused across local replay, playbook execution, automation runs, and default local write ownership when a stronger identity is not provided.

## Host layer

The HTTP host is defined primarily by `src/host/http-host.ts` and `src/host/lite-edition.ts`.

The host layer is responsible for:

1. registering the stable `/health` route
2. registering Lite-supported route groups
3. adding request hooks
4. emitting structured error envelopes
5. exposing unsupported server-only route groups as structured `501` responses

`src/host/lite-edition.ts` defines the Lite route matrix and the explicit server-only route groups.

Supported optional route groups include:

1. `memory-lifecycle-lite`
2. `memory-sandbox`
3. `memory-replay-governed-partial`
4. `automations-lite-kernel`

Current server-only route groups in Lite:

1. `/v1/admin/control/*`

This explicit `501` behavior is part of the product boundary. Lite does not pretend to expose a broader hosted control plane.

## Route registration and host flow

The host route flow is fixed in `src/host/http-host.ts`.

`registerApplicationRoutes(args)` does three things:

1. asserts the Lite-only source tree contract
2. registers the Lite `501` server-only route stubs
3. registers the supported memory, replay, automation, and sandbox route groups

In Lite, `registerAdminRoutes()` does not expose a working admin control plane. It only mounts the explicit unsupported-route handlers defined in `src/host/lite-edition.ts`.

`registerMemoryRoutes()` currently mounts routes in this order:

1. memory write
2. handoff
3. memory access
4. memory recall
5. memory context runtime
6. feedback and tool routes
7. replay core
8. replay governed
9. automation routes when the Lite automation store is present
10. sandbox routes

Two concrete host-flow details are worth making explicit:

1. memory write and handoff both receive the shared execution state store from `getSharedExecutionStateStore()`
2. governed replay and automation do not construct their own replay execution environment; they receive the prebuilt replay option builders assembled during bootstrap

## Health and observability

The runtime registers:

1. `/health`
2. structured request telemetry hooks
3. structured startup logging for runtime mode, storage backend, embedding state, sandbox state, and recall settings

The health route reports:

1. runtime edition and mode
2. storage backend
3. Lite identity, store health snapshots, and route matrix
4. sandbox executor status
5. sandbox remote egress policy summary and artifact-object-store configuration

## Storage architecture

Lite is a multi-store local runtime built on SQLite.

Primary local stores:

1. `src/store/lite-write-store.ts`
   Primary local write-side persistence.
2. `src/store/lite-recall-store.ts`
   Recall and retrieval access.
3. `src/store/lite-replay-store.ts`
   Replay-facing local persistence.
4. `src/store/lite-automation-store.ts`
   Automation definition persistence.
5. `src/store/lite-automation-run-store.ts`
   Automation run persistence.
6. `src/store/lite-host-store.ts`
   Host-side sandbox session, run, and log persistence.

The storage model is intentionally split by responsibility instead of hiding everything behind one generic local store.

## Kernel subsystems

The core Lite runtime behavior lives in `src/memory/`.

Key modules:

1. `write.ts`
   Write preparation and write application flow.
2. `recall.ts`
   Recall execution and retrieval behavior.
3. `context.ts`
   Context assembly behavior.
4. `handoff.ts`
   Structured task handoff and recovery.
5. `replay.ts`
   Replay lifecycle, playbook promotion, review, and governed execution behavior.
6. `sandbox.ts`
   Local sandbox execution behavior.
7. `automation-lite.ts`
   Local automation kernel behavior.
8. `feedback.ts`
   Feedback and rule-feedback persistence.

These modules are what make Lite a real runtime kernel rather than a thin transport wrapper.

## Public route surface in Lite

At a high level, the Lite runtime registers these capability groups:

1. memory write
2. handoff store and recover
3. memory recall and context runtime
4. memory access subset
5. feedback, rules, and tool selection
6. replay and playbook core
7. governed replay subset
8. local automation kernel
9. local sandbox kernel

The exact route list and status matrix live in [LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md](LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md).

## Automation kernel

Lite includes a local automation kernel through:

1. `src/routes/automations.ts`
2. `src/memory/automation-lite.ts`
3. `src/store/lite-automation-store.ts`
4. `src/store/lite-automation-run-store.ts`

Supported node kinds:

1. `playbook`
2. `approval`
3. `condition`
4. `artifact_gate`

Lite automation is intentionally local and playbook-driven. Reviewer assignment, control-plane promotion, compensation tooling, and broader orchestration surfaces remain outside Lite.

## Sandbox

Lite includes a real sandbox path through:

1. `src/routes/memory-sandbox.ts`
2. `src/memory/sandbox.ts`
3. `src/store/lite-host-store.ts`

The sandbox executor is created during runtime assembly and supports:

1. local enable/disable control
2. local-process or remote executor configuration
3. allowed-command parsing
4. timeout and concurrency limits
5. host and CIDR restrictions for remote execution
6. tenant budget policy enforcement

## Lite boundary

The Lite runtime is intentionally local-first and single-user in shape.

That means:

1. auth mode is local/off
2. tenant quota wiring is disabled
3. SQLite is the persistence backend
4. unsupported server-only route groups return structured `501`
5. local automation and sandbox support are real
6. control-plane lifecycle and hosted orchestration surfaces remain outside Lite

This boundary is deliberate. It keeps the public runtime honest about what it ships today.

## Recommended companion references

Use these documents and files with this architecture reference:

1. [LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md](LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md)
2. [LOCAL_RUNTIME_SOURCE_BOUNDARY.md](LOCAL_RUNTIME_SOURCE_BOUNDARY.md)
3. [../apps/lite/README.md](../apps/lite/README.md)
4. [../src/runtime-entry.ts](../src/runtime-entry.ts)
5. [../src/app/runtime-services.ts](../src/app/runtime-services.ts)
6. [../src/host/http-host.ts](../src/host/http-host.ts)
7. [../src/host/lite-edition.ts](../src/host/lite-edition.ts)

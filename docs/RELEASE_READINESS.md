# Aionis Runtime Release Readiness

Last reviewed: 2026-04-27

Document status: release readiness record for the current Lite developer-preview line

## Current Release Position

AionisRuntime is ready to be treated as a **Lite Developer Preview** candidate.

The current release target is not a hosted control plane and not a production multi-tenant service. The release target is the local-first Lite runtime:

1. local HTTP runtime shell
2. SQLite-backed write, recall, replay, automation, sandbox, and host state
3. public SDK integration path
4. execution-memory contract compiler
5. trust-gated workflow and policy learning
6. replay-derived workflow anchors
7. action retrieval, planner packet, and rehydration surfaces
8. local automation and sandbox proof paths

This is enough for a developer-preview release because the kernel can build, test, package, document, start, and execute the core live smoke paths from a clean mainline.

It is not yet enough to claim production-grade 1.0. Production-grade readiness still needs broader real-user dogfood, migration posture, security review, operational hardening, and longer-running stability evidence.

## Release Gate Result

The full local release gate passed on 2026-04-27 from branch `aionis/release-readiness-gate`.

| Gate | Result | Notes |
| --- | --- | --- |
| `npm run -s build` | Pass | Runtime host, document compiler, runtime-core, runtime package, public SDK, and internal SDK build path completed. |
| `npm run -s lite:test` | Pass | 319 tests passed. Covered source scope, startup, contracts, replay, learning, authority gates, semantic forgetting, service lifecycle, dogfood, and boundary guards. |
| `npm run -s packages:release:check` | Pass | `@aionis/doc`, `@ostinato/aionis`, `@ostinato/aionis-rtc`, and `@ostinato/aionis-runtime` built, packed, installed into isolated consumers, and verified clean imports. |
| `npm run -s docs:check` | Pass | Core-path sync, markdown reference check, and VitePress build completed. VitePress emitted a chunk-size warning only. |
| `npm run -s lite:smoke` | Pass | Health, sandbox kernel, automation kernel, and playbook kernel smoke paths succeeded. |

## Release Scope

The preview release should describe AionisRuntime as:

1. a local-first execution-memory runtime
2. a Lite runtime kernel for development and integration testing
3. an execution memory layer that turns past runs into reusable contracts, workflow anchors, planner packets, and tool/policy guidance
4. a runtime that makes authority explicit through outcome contracts, execution evidence, and trust gates

The preview release should not describe AionisRuntime as:

1. a hosted production control plane
2. a multi-tenant governance service
3. a replacement for all orchestration infrastructure
4. a production security boundary for untrusted public traffic
5. a guaranteed self-improving agent without operator-visible evidence gates

## Supported Product Lines

The current developer-preview line can expose these product surfaces:

1. Lite runtime startup and health
2. memory write and handoff
3. recall, planning context, action retrieval, and context assembly
4. workflow anchors and anchor-guided rehydration
5. replay run, playbook compile, repair, promote, and local playbook execution
6. local automation kernel
7. sandbox kernel with mock and configured local profiles
8. SDK host execution-memory facades
9. runtime boundary inventory for authority and legacy access inspection

## Explicit Non-Goals For This Release

These remain outside the release claim:

1. hosted server control plane
2. multi-tenant auth, quota, audit, and admin governance
3. server-style archive lifecycle orchestration
4. reviewer workflow control plane
5. repair approval/rejection control-plane flows
6. compensation tooling
7. long-running production observability guarantees
8. public-network hardening

Unsupported server-only endpoints must stay explicit and structured instead of pretending to be available in Lite.

## Remaining Release Risks

### 1. Real-World Variability

The automated gate is strong, but it is still mostly deterministic. The next risk is whether real developer tasks continue to show stable improvements without benchmark-specific shaping.

Mitigation:

1. run 3-5 dogfood tasks before tagging
2. include at least one service lifecycle task
3. include one SDK quickstart task from a clean environment
4. include one handoff/replay continuity task across shells

### 2. Public Message Drift

The code supports a Lite developer-preview boundary. The public messaging must not imply production control-plane features.

Mitigation:

1. keep docs tied to `LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md`
2. keep unsupported route behavior explicit
3. use "Developer Preview" language unless a separate production hardening pass is complete

### 3. Boundary Regression

Recent work reduced route, host, Lite store, embedded write, and legacy slot leakage. Regression risk remains if future changes bypass resolver, trust, or lifecycle boundaries.

Mitigation:

1. keep `lite-runtime-layer-boundaries.test.ts` in the release gate
2. keep `lite-runtime-legacy-boundary.test.ts` in the release gate
3. reject new authority producers unless declared in the boundary inventory

### 4. Packaging And Environment Assumptions

Package dry-runs passed, but external user environments may have different Node, shell, or filesystem defaults.

Mitigation:

1. keep Node `>=22.0.0` explicit
2. run one clean checkout smoke before tagging
3. run package dry-runs again after version bumps

## Pre-Tag Checklist

Before tagging a Lite Developer Preview release:

1. `npm run -s build`
2. `npm run -s lite:test`
3. `npm run -s packages:release:check`
4. `npm run -s docs:check`
5. `npm run -s lite:smoke`
6. run one SDK quickstart from a clean consumer directory
7. run one fresh-shell service lifecycle dogfood
8. confirm README and docs use Developer Preview positioning
9. confirm package versions and changelogs are intentional
10. confirm unsupported surfaces remain structured `501`

## Readiness Verdict

Current verdict:

**Ready for Lite Developer Preview preparation. Not yet ready for production-grade 1.0.**

The core reason is straightforward: the runtime kernel now passes build, full Lite tests, package dry-runs, docs build, and smoke from the current mainline. The remaining work is release packaging, public positioning, and external dogfood evidence rather than more core architecture expansion.

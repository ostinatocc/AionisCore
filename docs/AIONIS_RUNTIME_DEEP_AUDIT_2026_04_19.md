# Aionis Runtime · Deep Audit Report

Last reviewed: 2026-04-19

Document status: living audit snapshot (post-remediation refresh)

- Audit target: `/Volumes/ziel/AionisRuntime` (`aionis-core-workspace`, root workspace `0.1.0`; public SDK `@ostinato/aionis@0.2.0`)
- Audit date: 2026-04-19
- Code scale: TypeScript/TSX ~219,690 lines across 461 files repo-wide; runtime `src/` is ~66,954 lines across 164 files
- Test scale: 56 CI test files; `npm run -s lite:test` currently executes 194 tests
- Surface area: 5 JS/TS packages, 1 experimental Python SDK, 5 apps
- Dimensions: architecture, code quality, security, testing/CI, release readiness, docs, DX
- Note: this revision corrects stale counts and overstatements from the earlier same-day draft
- Update policy: re-audit adds a new dated file; do not edit the history in place

---

## 1. Executive Summary (Current top findings by severity)

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| 1 | Lite has **no real request principal binding**: `requireMemoryPrincipal()` returns `null`, while `tenant_id` and `scope` are taken from request body/header. Safe only under strict local/loopback assumptions. | **HIGH** (deployment surface) | [src/app/request-guards.ts](/Volumes/ziel/AionisRuntime/src/app/request-guards.ts:283) |
| 2 | `createRequestGuards()` only supports `lite + auth=off + no tenant quota`, while config still exposes `server`, `api_key`, `jwt`, and `api_key_or_jwt`. **Planned-vs-implemented drift remains.** | **MEDIUM** | [src/app/request-guards.ts](/Volumes/ziel/AionisRuntime/src/app/request-guards.ts:154), [src/config.ts](/Volumes/ziel/AionisRuntime/src/config.ts:118), [src/config.ts](/Volumes/ziel/AionisRuntime/src/config.ts:210) |
| 3 | Several god-files still dominate regression cost: `replay.ts` 6,034 LOC, `schemas.ts` 3,951, `planning-summary.ts` 2,668, `lite-write-store.ts` 2,276, `sandbox.ts` 2,132, `memory-context-runtime.ts` 2,019. | **MEDIUM** | see section 3 |
| 4 | `: any` / `as any` usage is still heavy: **~439 in src/packages/apps** and **~690 including scripts/tests**. Production hotspots remain in embedded store, context orchestration, host wiring, replay, sandbox, recall. | **MEDIUM** | scattered |
| 5 | `packages/full-sdk` and `packages/sdk` still maintain parallel contracts/clients manually. **Long-term contract drift risk remains real.** | **MEDIUM** | `packages/full-sdk/src/*`, `packages/sdk/src/*` |
| 6 | `apps/lite` still ships as a source-run runtime via `tsx`/shell rather than a real compiled artifact. | **MEDIUM** | [apps/lite/package.json](/Volumes/ziel/AionisRuntime/apps/lite/package.json:7) |
| 7 | The current suite is strong on route/contract coverage, but still lighter on full end-to-end behavior and nightly real-task benchmarks. | **MEDIUM** | [package.json](/Volumes/ziel/AionisRuntime/package.json), `scripts/ci/*` |
| 8 | Tag release automation now gates on package release checks, but still does not perform npm publish itself. | **LOW–MEDIUM** | [lite-release.yml](/Volumes/ziel/AionisRuntime/.github/workflows/lite-release.yml) |
| 9 | The future `server`/hosted runtime shape is still a schema and messaging seam more than an implemented product path. | **LOW–MEDIUM** | [src/config.ts](/Volumes/ziel/AionisRuntime/src/config.ts), docs |
| 10 | The experimental Python SDK still sits outside the JS workspace and release automation. | **LOW** | `packages/python-sdk/*` |

---

## 2. Architecture & Boundaries

### 2.1 Factual Topology

- Entry: `src/index.ts` → `src/runtime-entry.ts::startAionisRuntime()`
- Assembly layer: `src/host/bootstrap.ts`, `src/host/http-host.ts`, `src/host/inspector-static.ts`, `src/host/lite-edition.ts`
- Business layer: `src/app/*`, `src/memory/*`, `src/routes/*`, `src/store/*`, `src/execution/*`, `src/embeddings/*`, `src/jobs/*`
- Packages:
  - `packages/full-sdk` (public SDK)
  - `packages/sdk` (internal/legacy SDK + CLI)
  - `packages/runtime-core` (boundary shell)
  - `packages/aionis-doc` (doc DSL/CLI)
  - `packages/ui-kit`
  - `packages/python-sdk` (experimental, not part of the JS workspace)
- Apps:
  - `apps/lite`
  - `apps/inspector`
  - `apps/docs`
  - `apps/playground`
  - `apps/playground-adapter`

### 2.2 Findings

| File:line | Issue | Severity |
|-----------|-------|----------|
| [src/config.ts](/Volumes/ziel/AionisRuntime/src/config.ts:760) | Lite now fails early with an explicit `APP_ENV=prod` posture error rather than an indirect auth/rate-limit error | INFO |
| [src/app/request-guards.ts](/Volumes/ziel/AionisRuntime/src/app/request-guards.ts:154) | Only `lite + auth=off + no tenant quota` is runnable in the current host path | MEDIUM |
| [src/config.ts](/Volumes/ziel/AionisRuntime/src/config.ts:118) | `AIONIS_EDITION` now defaults to `"lite"`, reducing shipped-config drift | INFO |
| [src/runtime-entry.ts](/Volumes/ziel/AionisRuntime/src/runtime-entry.ts) | `startAionisRuntime()` is coherent, but route registration args remain very wide | MEDIUM |
| [src/host/http-host.ts](/Volumes/ziel/AionisRuntime/src/host/http-host.ts) | Host-layer contracts still carry substantial `any` usage | MEDIUM |
| [apps/lite/package.json](/Volumes/ziel/AionisRuntime/apps/lite/package.json:7) | `build` is still `node --check`; Lite does not produce a real compiled artifact | INFO / MEDIUM |
| `src/memory/*` → `src/host/*` | No reverse import layering issues observed | INFO |

**Assessment**: Lite is clearly the real shipped runtime shape. The repo still keeps a broader schema and naming envelope than the implemented HTTP runtime actually supports.

---

## 3. Code Quality

### 3.1 Overall

- No `TODO` / `FIXME` / `HACK` markers were found in `src/`, `packages/`, `apps/`, or `scripts/`
- `console.log` is **not** repo-wide zero:
  - runtime hot paths largely avoid it
  - examples, CLI utilities, docs snippets, and helper scripts intentionally use it
- `@ts-ignore` is not present; there is **1** `@ts-expect-error` in [packages/ui-kit/src/components/card.tsx](/Volumes/ziel/AionisRuntime/packages/ui-kit/src/components/card.tsx:28)
- `: any` / `as any`:
  - ~439 occurrences in `src/ + packages/ + apps/`
  - ~690 when scripts/tests are included
- Error model remains consistent: `HttpError` + Zod + thrown exceptions, not a mix of result wrappers

### 3.2 Hotspots

| File | LOC | Observation |
|------|-----|-------------|
| [src/memory/replay.ts](/Volumes/ziel/AionisRuntime/src/memory/replay.ts) | 6,034 | Still too large; mixes replay engine, learning, governance, normalization |
| [src/memory/schemas.ts](/Volumes/ziel/AionisRuntime/src/memory/schemas.ts) | 3,951 | Central contract gravity well; domain split would improve maintainability |
| [src/app/planning-summary.ts](/Volumes/ziel/AionisRuntime/src/app/planning-summary.ts) | 2,668 | Aggregation, summary modeling, and serialization still bundled together |
| [src/store/lite-write-store.ts](/Volumes/ziel/AionisRuntime/src/store/lite-write-store.ts) | 2,276 | Store logic still mixes migrations, write behavior, projection, and query helpers |
| [src/memory/sandbox.ts](/Volumes/ziel/AionisRuntime/src/memory/sandbox.ts) | 2,132 | Too many executor and policy concerns in one file |
| [src/routes/memory-context-runtime.ts](/Volumes/ziel/AionisRuntime/src/routes/memory-context-runtime.ts) | 2,019 | Route family still oversized |

### 3.3 Type Strength

Production hotspots for `: any` / `as any` currently include:

- [src/store/embedded-memory-runtime.ts](/Volumes/ziel/AionisRuntime/src/store/embedded-memory-runtime.ts) — 49
- [src/memory/context-orchestrator.ts](/Volumes/ziel/AionisRuntime/src/memory/context-orchestrator.ts) — 48
- [src/host/http-host.ts](/Volumes/ziel/AionisRuntime/src/host/http-host.ts) — 29
- [src/memory/replay.ts](/Volumes/ziel/AionisRuntime/src/memory/replay.ts) — 29
- [src/memory/sandbox.ts](/Volumes/ziel/AionisRuntime/src/memory/sandbox.ts) — 19
- [src/memory/rules-evaluate.ts](/Volumes/ziel/AionisRuntime/src/memory/rules-evaluate.ts) — 17
- [src/app/request-guards.ts](/Volumes/ziel/AionisRuntime/src/app/request-guards.ts) — 16
- [src/app/planning-summary.ts](/Volumes/ziel/AionisRuntime/src/app/planning-summary.ts) — 16
- [src/app/http-observability.ts](/Volumes/ziel/AionisRuntime/src/app/http-observability.ts) — 16
- [src/memory/recall.ts](/Volumes/ziel/AionisRuntime/src/memory/recall.ts) — 15

This is still a meaningful maintainability cost, even though the repo is otherwise disciplined.

---

## 4. Security Audit

### 4.1 AuthN / AuthZ

| Location | Finding | Severity |
|----------|---------|----------|
| [src/app/request-guards.ts](/Volumes/ziel/AionisRuntime/src/app/request-guards.ts:283) | `requireMemoryPrincipal()` always returns `null` under Lite | HIGH (deployment) |
| [src/app/request-guards.ts](/Volumes/ziel/AionisRuntime/src/app/request-guards.ts:293) | `tenant_id` and `scope` are accepted from request body/header with trim-only normalization | HIGH if exposed beyond trusted local use |
| [src/util/auth.ts](/Volumes/ziel/AionisRuntime/src/util/auth.ts) | JWT verification is HS256-only and does not enforce `iss` / `aud` | MEDIUM |
| [src/util/admin_auth.ts](/Volumes/ziel/AionisRuntime/src/util/admin_auth.ts) | Admin token compare is constant-time | INFO |
| [src/app/request-guards.ts](/Volumes/ziel/AionisRuntime/src/app/request-guards.ts:186) | Non-prod + no admin token + loopback can unlock debug embeddings | MEDIUM |

> Key risk: the Lite trust model is real, but it is **local-first**, not network-hardened. Binding it wider than loopback without a front proxy/auth story exposes the body-supplied tenant/scope model.

### 4.2 Sandbox

| Location | Finding | Severity |
|----------|---------|----------|
| [src/memory/sandbox.ts](/Volumes/ziel/AionisRuntime/src/memory/sandbox.ts:166) | Empty remote host and egress allowlists now fail closed | INFO |
| [src/config.ts](/Volumes/ziel/AionisRuntime/src/config.ts:930) | Non-prod startup accepts the remote executor URL even with an empty allowlist | MEDIUM |
| [src/config.ts](/Volumes/ziel/AionisRuntime/src/config.ts:1018) | Prod http_remote branch is much stricter: https + non-empty allowlist + optional mTLS + egress protections | INFO |
| [src/memory/sandbox.ts](/Volumes/ziel/AionisRuntime/src/memory/sandbox.ts) | Local process spawning uses `shell:false` and controlled env/path handling | INFO |

### 4.3 Network / CORS / Bind Posture

| Location | Finding |
|----------|---------|
| [src/host/bootstrap.ts](/Volumes/ziel/AionisRuntime/src/host/bootstrap.ts:72) | Lite now defaults to `127.0.0.1` unless `AIONIS_LISTEN_HOST` explicitly widens it |
| [src/app/http-observability.ts](/Volumes/ziel/AionisRuntime/src/app/http-observability.ts) | Non-prod CORS fallback still allows `*` when origins are unset |
| [src/util/ip-guard.ts](/Volumes/ziel/AionisRuntime/src/util/ip-guard.ts) | Trusted-proxy correctness still matters for loopback bypasses and IP-based rate keys |

### 4.4 SQL / Paths / ReDoS

- No obvious raw SQL injection surfaces found; store operations are parameterized
- SAVEPOINT naming remains constant and non-user-derived
- No obvious hot-path ReDoS issue stood out in this pass

---

## 5. Tests / CI

### 5.1 Workflows

- [lite-ci.yml](/Volumes/ziel/AionisRuntime/.github/workflows/lite-ci.yml): `docs:check -> build -> test:lite -> smoke:lite`
- [lite-release.yml](/Volumes/ziel/AionisRuntime/.github/workflows/lite-release.yml): tag build + source artifact only
- [docs-pages.yml](/Volumes/ziel/AionisRuntime/.github/workflows/docs-pages.yml): docs deploy

### 5.2 Current Test Posture

- 56 CI test files
- `npm run -s lite:test` currently passes locally at **194 / 194**
- Coverage is stronger than the earlier draft suggested:
  - planning summary
  - context runtime packet contracts
  - workflow projection
  - evolution operators
  - semantic forgetting
  - provenance-preserving promotion
  - proof demos

### 5.3 Remaining Gaps

The gap is **not** “there are no tests”. The more accurate concern is:

- the suite is still more route/contract-heavy than end-to-end behavior-heavy
- deep replay paths, recall retrieval chains, sandbox remote behavior, and automation composites could still use more explicit end-to-end assertions
- nightly real-task/benchmark coverage is still absent from CI

### 5.4 CI Assessment

- CI is single-environment (`ubuntu-latest`, Node 22)
- no multi-node / multi-OS matrix
- `docs:check` and VitePress build both pass locally
- `smoke:lite` gives the shipped runtime story reasonable credibility

---

## 6. Release Readiness

| Package / Surface | Version | Engines | Observation |
|-------------------|---------|---------|-------------|
| `@ostinato/aionis` | 0.2.0 | `>=22` | Public SDK exists and is release-shaped |
| `@ostinato/aionis-rtc` | 0.1.0 | `>=22` | Boundary package still thin |
| `@aionis/doc` | 0.2.0 | `>=22` | CLI-heavy package with multiple bins |
| `@ostinato/aionis-internal-sdk` | 0.1.0 | private | Internal-only |
| Root workspace | 0.1.0 | `>=22` | Root and releaseable packages are now aligned |
| `apps/lite` | 0.1.0 | `>=22` | Build remains `node --check`, not a compiled runtime artifact |
| `packages/python-sdk` | experimental | n/a | Exists, but is not part of the JS workspace/release automation |

**Assessment**:

- Package release mechanics exist in the repo
- docs site is deployed
- public SDK is already beyond `0.1.0`
- the GitHub tag-release workflow now runs package release checks before building the source artifact
- but it is still not the same thing as a complete package-publish pipeline

That means the right conclusion is:

**release automation is incomplete**, not “package publishing does not exist”.

---

## 7. Documentation

- Public docs and repo-level public positioning are currently aligned around:
  - `self-evolving continuity runtime for agent systems`
- [README.md](/Volumes/ziel/AionisRuntime/README.md), [docs/LAUNCH_MESSAGING.md](/Volumes/ziel/AionisRuntime/docs/LAUNCH_MESSAGING.md), [docs/AIONIS_PRODUCT_DEFINITION_V1.md](/Volumes/ziel/AionisRuntime/docs/AIONIS_PRODUCT_DEFINITION_V1.md), and [docs/AIONIS_BRAND_VISUAL_IDENTITY_V1.md](/Volumes/ziel/AionisRuntime/docs/AIONIS_BRAND_VISUAL_IDENTITY_V1.md) were re-aligned on 2026-04-19
- [docs/DOCS_MAINTENANCE.md](/Volumes/ziel/AionisRuntime/docs/DOCS_MAINTENANCE.md) and `docs:check` provide real hygiene
- Docs site + evidence pages are materially stronger than a plain README-level project

**Remaining docs-level issue**:

- the future `server` / hosted shape still exists more as a schema/docs seam than a proven shipped runtime path

---

## 8. Developer Experience (DX)

| Item | Current | Recommendation |
|------|---------|----------------|
| Script surface | Large but coherent | Keep namespaced structure |
| `lite:test` | One very long command line over 53 files | Split into grouped commands or use a glob wrapper |
| Root/app Node floor | 22 | Either align packages upward or document the split clearly |
| `.env.example` | Minimal relative to schema surface | Expand or generate from schema |
| `apps/lite` build semantics | Source-run via tsx shell | Either make this explicit everywhere or ship a real built artifact |

---

## 9. Quick Wins (< 1 day)

1. Decide whether the future `server` edition remains in scope, or shrink the config/public schema around Lite
2. Split the heaviest god-files in a deliberate order instead of accreting more behavior into them
3. Reduce `any` usage in the current hotspots, starting with host wiring, replay, sandbox, and context orchestration
4. Unify the public and internal SDK contract sources
5. Add more end-to-end and nightly real-task coverage beyond route/contract assertions

---

## 10. Bigger Refactors (> 1 week)

1. Split the god-files:
   - `replay.ts`
   - `schemas.ts`
   - `planning-summary.ts`
   - `lite-write-store.ts`
   - `sandbox.ts`
   - `memory-context-runtime.ts`
2. Create a single source for SDK contracts/types across `full-sdk` and `sdk`
3. Clarify runtime form:
   - real built Lite artifact
   - or explicitly supported “run source with tsx” posture
4. Add more behavior-level E2E around replay/recall/sandbox remote/automation
5. Move benchmark/real-task validation into a nightly or scheduled workflow

---

## 11. Positive Findings / No Issues

- `npm run -s lite:test` passed locally at **187 / 187**
- `docs-reference-check` passed locally
- VitePress build passed locally
- `memory/` does not reverse-import from `host/`; layering is still clean
- The sandbox design itself is thoughtful: `shell:false`, command allowlists, egress controls, optional mTLS
- Admin token compare is constant-time
- Docs and evidence quality are materially better than the average runtime repo
- The repo now has multiple runnable proof demos for:
  - task-start improvement
  - policy materialization
  - governance loop
  - provenance-preserving promotion
  - session continuity promotion
  - semantic forgetting

---

## 12. Overall Rating

| Dimension | Score |
|-----------|-------|
| Product consistency | Medium–Strong |
| Code discipline | Strong with caveats |
| Type strength | Medium |
| Module size | Weak |
| Security defaults | Medium |
| Test depth | Medium–Strong |
| Release automation | Medium |
| Docs health | Strong |

**Top 3 to act on first**:

1. Resolve the Lite/prod contradiction (`AIONIS_EDITION`, auth, tenant quota, loopback bypass).
2. Make sandbox remote allowlists fail-closed when empty.
3. Decide whether `server` is real roadmap or dead schema, then align config/docs/code accordingly.

---

## 13. Audit Metadata

- Methodology: local code reading, targeted search, line counts, manifest/workflow inspection, and local verification (`lite:test`, docs checks, VitePress build)
- Scope coverage: `src/**`, `packages/**`, `apps/**`, `scripts/**`, `.github/workflows/**`, `docs/**`
- Not covered deeply in this pass: full threat modeling for every replay/sandbox branch, runtime profiling, SBOM/licensing
- Next audit trigger: any of the Top 10 findings changes materially, or before the next minor public release

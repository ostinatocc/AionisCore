# Aionis Runtime Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the 2026-04-19 deep audit into an execution-ready remediation sequence that fixes the highest-risk Lite/runtime issues first, then closes release/docs drift, and only then starts larger architectural refactors.

**Architecture:** Treat remediation as three layers. First fix hard runtime posture issues: Lite/prod contradiction, empty remote sandbox allowlists, wide listen binding, and public config drift. Next tighten release automation and developer-facing documentation so the shipped shape matches the implemented shape. Only after the runtime posture is coherent should the team start larger refactors like SDK contract unification and god-file splitting.

**Tech Stack:** TypeScript, Fastify, Zod, SQLite-backed Lite runtime, GitHub Actions, VitePress docs, workspace packages under `packages/*`, `scripts/ci` contract tests.

Last reviewed: 2026-04-19

Document status: active implementation plan

## Current status (2026-04-19, post-remediation batch)

- Immediate Fixes 1-5: completed
- This Week 1-3: completed
- Gates A and B: functionally green in the current workspace
- Remaining focus has moved to Later Refactors:
  - SDK contract unification
  - god-file split order
  - deciding whether any future `server` runtime remains in scope

---

## Remediation Rules

1. Do **not** expand Lite into a full server/control-plane while executing this plan.
2. Fix security/default posture issues before touching architecture cleanup.
3. Prefer additive tests before implementation changes.
4. Every task ends with a narrow verification command and a commit.
5. Do not mix “hard runtime fix” work with “future refactor” work in the same commit.

## Delivery Order

### Immediate Fixes

1. Codify Lite operating posture and make the Lite/prod contradiction explicit
2. Make remote sandbox allowlists fail-closed everywhere
3. Tighten default network bind posture for Lite
4. Reduce public config drift around `server` / auth modes
5. Align release automation with package-release checks

### This Week

1. Align Node engine expectations or document the intentional split
2. Expand `.env.example` / operational docs around the real Lite runtime
3. Add targeted behavior tests for sandbox remote and recall/replay paths

### Later Refactors

1. Unify SDK contract sources
2. Split god-files
3. Revisit whether `server` edition should exist at all

## Acceptance Gates

### Gate A: Runtime Posture

- Lite startup behavior is coherent and intentional.
- Empty remote sandbox allowlists cannot silently allow arbitrary hosts.
- Default listen posture matches the Lite local-first trust model.
- Docs and env defaults stop implying unsupported server/runtime modes.

### Gate B: Release / DX

- Release workflow runs package release checks.
- Node engine expectations are not contradictory.
- `.env.example` and docs describe the real shipped runtime.

### Gate C: Future Refactor Track

- There is a single chosen contract source strategy.
- God-file split order is defined and sequenced.
- No refactor begins before Gates A and B are green.

---

## Phase 1: Immediate Runtime Posture Fixes

### Task 1: Add a failing regression test for the Lite/prod contradiction

**Files:**
- Create: `scripts/ci/lite-config-posture.test.ts`
- Modify: `package.json`
- Reference: `src/config.ts`

**Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { loadEnv } from "../../src/config.ts";

test("lite + prod fails with an explicit operating-posture error", () => {
  const previous = process.env;
  process.env = {
    ...previous,
    AIONIS_EDITION: "lite",
    APP_ENV: "prod",
  };

  assert.throws(
    () => loadEnv(),
    /Lite runtime does not currently support APP_ENV=prod/i,
  );

  process.env = previous;
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test scripts/ci/lite-config-posture.test.ts
```

Expected: FAIL because the current error is indirect (`MEMORY_AUTH_MODE=off is not allowed when APP_ENV=prod`) rather than an intentional Lite posture message.

**Step 3: Write minimal implementation**

Modify [src/config.ts](/Volumes/ziel/AionisRuntime/src/config.ts) so `loadEnv()` fails early with a Lite-specific posture error before the generic prod assertions fire.

Suggested shape:

```ts
if (parsed.data.AIONIS_EDITION === "lite" && parsed.data.APP_ENV === "prod") {
  throw new Error("Lite runtime does not currently support APP_ENV=prod; use APP_ENV=dev/ci or a future server runtime.");
}
```

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test scripts/ci/lite-config-posture.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add scripts/ci/lite-config-posture.test.ts src/config.ts package.json
git commit -m "fix: codify lite prod posture"
```

---

### Task 2: Document the Lite operating posture in public docs

**Files:**
- Modify: `README.md`
- Modify: `docs/LAUNCH_MESSAGING.md`
- Modify: `docs/AIONIS_PRODUCT_DEFINITION_V1.md`
- Modify: `docs/LOCAL_RUNTIME_ARCHITECTURE_AND_COMPLETION.md`

**Step 1: Write the failing documentation checklist**

Add a temporary review note locally:

```md
- [ ] README explains Lite is local-first and not prod-hardened
- [ ] Launch messaging stops implying general hosted/server readiness
- [ ] Product definition distinguishes shipped Lite from future server shape
```

**Step 2: Verify the docs currently miss or blur this**

Run:

```bash
rg -n "APP_ENV=prod|local-first|local runtime|server edition|Lite" README.md docs
```

Expected: mixed wording, with no single crisp Lite posture statement.

**Step 3: Write the minimal doc updates**

Update the docs to explicitly say:

- Lite is the shipped runtime shape
- Lite is local-first
- Lite is not yet a hardened production server runtime
- the broader `server`/hosted path is not the current shipped shape

**Step 4: Run docs reference check**

Run:

```bash
node scripts/ci/docs-reference-check.mjs
```

Expected: PASS

**Step 5: Commit**

```bash
git add README.md docs/LAUNCH_MESSAGING.md docs/AIONIS_PRODUCT_DEFINITION_V1.md docs/LOCAL_RUNTIME_ARCHITECTURE_AND_COMPLETION.md
git commit -m "docs: clarify lite operating posture"
```

---

### Task 3: Add a failing regression test for empty sandbox remote allowlists

**Files:**
- Create: `scripts/ci/lite-sandbox-allowlist.test.ts`
- Reference: `src/memory/sandbox.ts`
- Reference: `src/config.ts`

**Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { sandboxRemoteHostAllowed } from "../../src/memory/sandbox.ts";

test("empty sandbox remote allowlist is not treated as allow-all", () => {
  assert.equal(sandboxRemoteHostAllowed("example.com", new Set()), false);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test scripts/ci/lite-sandbox-allowlist.test.ts
```

Expected: FAIL because the current helper returns `true` for an empty set.

**Step 3: Write minimal implementation**

Modify [src/memory/sandbox.ts](/Volumes/ziel/AionisRuntime/src/memory/sandbox.ts) to make empty allowlists fail-closed:

```ts
if (allowlist.size === 0) return false;
```

Then align [src/config.ts](/Volumes/ziel/AionisRuntime/src/config.ts) so http_remote startup validation in non-prod cannot silently accept empty host allowlists.

**Step 4: Run the focused tests**

Run:

```bash
npx tsx --test scripts/ci/lite-sandbox-allowlist.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add scripts/ci/lite-sandbox-allowlist.test.ts src/memory/sandbox.ts src/config.ts
git commit -m "fix: fail closed on empty sandbox remote allowlists"
```

---

### Task 4: Tighten default Lite listen binding

**Files:**
- Create: `scripts/ci/lite-listen-posture.test.ts`
- Modify: `src/host/bootstrap.ts`
- Modify: `apps/lite/scripts/start-lite-app.sh`
- Modify: `README.md`

**Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("lite bootstrap does not default to 0.0.0.0", () => {
  const text = fs.readFileSync("src/host/bootstrap.ts", "utf8");
  assert.match(text, /host:\\s*\"127\\.0\\.0\\.1\"/);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test scripts/ci/lite-listen-posture.test.ts
```

Expected: FAIL because `listenHttpApp()` currently binds `0.0.0.0`.

**Step 3: Write minimal implementation**

Modify [src/host/bootstrap.ts](/Volumes/ziel/AionisRuntime/src/host/bootstrap.ts) so Lite defaults to `127.0.0.1`, or so the default comes from a dedicated env var with `127.0.0.1` as its default.

Suggested minimal shape:

```ts
await app.listen({ port: env.PORT, host: env.HOST || "127.0.0.1" });
```

Then document the override path in the start script / README.

**Step 4: Run focused verification**

Run:

```bash
npx tsx --test scripts/ci/lite-listen-posture.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add scripts/ci/lite-listen-posture.test.ts src/host/bootstrap.ts apps/lite/scripts/start-lite-app.sh README.md
git commit -m "fix: default lite runtime to loopback binding"
```

---

### Task 5: Reduce public config drift around `server` and auth modes

**Files:**
- Modify: `src/config.ts`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/README.md`

**Step 1: Write the failing checklist**

Create a temporary local checklist:

```md
- [ ] Public config examples do not imply a runnable `server` edition
- [ ] Public env docs do not imply JWT/API key auth exists for Lite
- [ ] `.env.example` reflects the shipped Lite runtime first
```

**Step 2: Verify current drift**

Run:

```bash
rg -n "server|api_key|jwt|api_key_or_jwt|AIONIS_EDITION" src/config.ts .env.example README.md docs
```

Expected: the repo still exposes broader config values than the current runtime actually supports.

**Step 3: Write minimal implementation**

Choose one explicit direction:

- either mark `server` / auth modes as deprecated or internal-only in comments/docs
- or move them out of public env examples entirely

Do **not** implement server auth in this task. This task is about reducing public confusion.

**Step 4: Run doc/config checks**

Run:

```bash
node scripts/ci/docs-reference-check.mjs
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/config.ts .env.example README.md docs/README.md
git commit -m "docs: reduce public config drift around lite runtime"
```

---

## Phase 2: Release and DX Cleanup

### Task 6: Add package release checks to the tag workflow

**Files:**
- Modify: `.github/workflows/lite-release.yml`
- Reference: `package.json`

**Step 1: Write the failing review condition**

Create a temporary check note:

```md
- [ ] Tag workflow runs package release checks before producing release artifacts
```

**Step 2: Verify the gap**

Run:

```bash
sed -n '1,220p' .github/workflows/lite-release.yml
```

Expected: workflow builds and uploads source tarball only; it does not run package release checks.

**Step 3: Write minimal implementation**

Add a workflow step like:

```yaml
- name: Package release checks
  run: npm run -s packages:release:check
```

before artifact packaging.

**Step 4: Validate workflow syntax**

Run:

```bash
node -e "const fs=require('fs'); console.log(fs.readFileSync('.github/workflows/lite-release.yml','utf8').length > 0 ? 'ok' : 'fail')"
```

Expected: `ok`

**Step 5: Commit**

```bash
git add .github/workflows/lite-release.yml
git commit -m "ci: run package release checks in tag workflow"
```

---

### Task 7: Resolve engine version ambiguity

**Files:**
- Modify: `package.json`
- Modify: `packages/full-sdk/package.json`
- Modify: `packages/runtime-core/package.json`
- Modify: `packages/sdk/package.json`
- Modify: `packages/aionis-doc/package.json`
- Modify: `docs/SDK_PUBLISHING.md`

**Step 1: Write the failing checklist**

```md
- [ ] Root/apps/package engines and published package engines tell one coherent support story
```

**Step 2: Verify current mismatch**

Run:

```bash
node - <<'NODE'
const fs=require('fs');
for (const p of ['package.json','packages/full-sdk/package.json','packages/runtime-core/package.json','packages/sdk/package.json','packages/aionis-doc/package.json']) {
  const j=JSON.parse(fs.readFileSync(p,'utf8'));
  console.log(p, j.engines?.node);
}
NODE
```

Expected: root/apps say `>=22`, packages say `>=18`.

**Step 3: Make a deliberate choice**

Choose one:

- align published packages upward to `>=22`
- or keep `>=18` and explicitly document why package consumers differ from workspace/runtime contributors

This task is complete only when the choice is explicit, not accidental.

**Step 4: Re-run the manifest check**

Run the same Node script again.

Expected: the output reflects the chosen intentional policy.

**Step 5: Commit**

```bash
git add package.json packages/full-sdk/package.json packages/runtime-core/package.json packages/sdk/package.json packages/aionis-doc/package.json docs/SDK_PUBLISHING.md
git commit -m "build: align node engine policy across workspace and packages"
```

---

### Task 8: Expand `.env.example` for the real Lite runtime

**Files:**
- Modify: `.env.example`
- Modify: `docs/DOCS_MAINTENANCE.md`
- Modify: `README.md`

**Step 1: Write the failing review checklist**

```md
- [ ] `.env.example` includes the operational knobs a Lite operator actually needs
```

**Step 2: Inspect current gap**

Run:

```bash
sed -n '1,200p' .env.example
```

Expected: only a minimal subset of the real runtime env surface is documented.

**Step 3: Write the minimal implementation**

Expand `.env.example` to at least include:

- Lite operating posture
- sandbox knobs
- memory recall profile knobs
- replay/governance knobs that matter to operators

Do not mirror every env var in `config.ts`; keep it operator-relevant.

**Step 4: Run docs/reference checks**

Run:

```bash
node scripts/ci/docs-reference-check.mjs
```

Expected: PASS

**Step 5: Commit**

```bash
git add .env.example docs/DOCS_MAINTENANCE.md README.md
git commit -m "docs: expand lite runtime environment example"
```

---

## Phase 3: Structured Refactor Track

### Task 9: Write an SDK contract unification ADR before changing code

**Files:**
- Create: `docs/adr/2026-04-19-sdk-contract-source-of-truth.md`
- Reference: `packages/full-sdk/src/contracts.ts`
- Reference: `packages/sdk/src/contracts.ts`
- Reference: `packages/runtime-core/src/index.ts`

**Step 1: Draft the ADR problem statement**

State:

- public SDK and internal SDK both maintain contracts
- drift risk is real
- runtime-core is too thin to serve as current single source

**Step 2: Compare current options**

Evaluate:

1. runtime-core as contract source
2. new `packages/contracts`
3. codegen from Zod/runtime schemas

**Step 3: Record the decision and migration order**

The ADR should name:

- chosen source
- migration sequence
- rollback / compatibility story

**Step 4: Verify docs linkage**

Run:

```bash
node scripts/ci/docs-reference-check.mjs
```

Expected: PASS

**Step 5: Commit**

```bash
git add docs/adr/2026-04-19-sdk-contract-source-of-truth.md
git commit -m "docs: add sdk contract source-of-truth adr"
```

---

### Task 10: Write a god-file split order before starting refactors

**Files:**
- Create: `docs/plans/2026-04-19-runtime-god-file-split-order.md`
- Reference: `src/memory/replay.ts`
- Reference: `src/memory/schemas.ts`
- Reference: `src/app/planning-summary.ts`
- Reference: `src/store/lite-write-store.ts`
- Reference: `src/memory/sandbox.ts`
- Reference: `src/routes/memory-context-runtime.ts`

**Step 1: List the top candidates with current responsibility bundles**

Example:

- `replay.ts`: engine + learning + normalization + governance
- `schemas.ts`: all contracts
- `planning-summary.ts`: summary assembly + packet surfacing

**Step 2: Define split sequence**

Choose a practical order, for example:

1. `planning-summary.ts`
2. `sandbox.ts`
3. `memory-context-runtime.ts`
4. `schemas.ts`
5. `lite-write-store.ts`
6. `replay.ts`

**Step 3: Define exit criteria per file**

Example:

- smaller compile units
- no public contract change
- existing route tests still pass

**Step 4: Run docs checks**

Run:

```bash
node scripts/ci/docs-reference-check.mjs
```

Expected: PASS

**Step 5: Commit**

```bash
git add docs/plans/2026-04-19-runtime-god-file-split-order.md
git commit -m "docs: add runtime refactor split order"
```

---

## Recommended Execution Order

If execution starts immediately, run tasks in this order:

1. Task 1
2. Task 3
3. Task 4
4. Task 2
5. Task 5
6. Task 6
7. Task 7
8. Task 8
9. Task 9
10. Task 10

## Stop Conditions

Pause execution and re-scope if:

1. Fixing Lite/prod posture unexpectedly requires implementing full auth/server support.
2. Tightening bind/allowlist defaults breaks the current local developer loop without a clear replacement path.
3. Engine alignment would strand existing published SDK consumers without a versioning plan.

Plan complete and saved to `docs/plans/2026-04-19-aionis-runtime-remediation-plan.md`. Two execution options:

1. Subagent-Driven（本 session 里逐任务推进）
2. Parallel Session（新开 session 按计划批量执行）

Which approach?

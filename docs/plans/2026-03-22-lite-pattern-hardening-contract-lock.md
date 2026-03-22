# Lite Pattern Hardening Contract Lock Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expose already-computed pattern trust-hardening metadata on stable Lite selector and introspection surfaces without changing trust semantics.

**Architecture:** Thread the existing `anchor_v1.trust_hardening` / `execution_native_v1.trust_hardening` object through `tools/select` and `execution/introspect`, then lock it with route-level contract tests. Keep planner/context slim and unchanged.

**Tech Stack:** TypeScript, Fastify, Zod, SQLite Lite stores, node:test, tsx.

---

### Task 1: Add failing route-contract assertions

**Files:**
- Modify: `scripts/ci/lite-tools-select-route-contract.test.ts`
- Modify: `scripts/ci/lite-execution-introspection-route.test.ts`

**Step 1: Seed trust-hardening fixture data**

Update existing trusted/contested pattern fixtures so they include explicit `trust_hardening` metadata.

**Step 2: Add selector assertions**

Extend the selector contract test to expect:

1. `pattern_matches.anchors[0].trust_hardening`
2. correct `promotion_gate_kind`
3. correct `revalidation_floor_kind`
4. correct `task_affinity_weighting_enabled`

**Step 3: Add introspection assertions**

Extend the introspection contract test to expect:

1. `trusted_patterns[*].trust_hardening`
2. `contested_patterns[*].trust_hardening`
3. `pattern_signals[*].trust_hardening`

**Step 4: Run focused tests to verify failure**

Run:

```bash
npx tsx --test scripts/ci/lite-tools-select-route-contract.test.ts
npx tsx --test scripts/ci/lite-execution-introspection-route.test.ts
```

Expected:

The new assertions fail before implementation.

### Task 2: Expose hardening metadata in selector output

**Files:**
- Modify: `src/memory/tools-select.ts`
- Modify: `src/memory/schemas.ts`

**Step 1: Carry trust hardening through recalled patterns**

Update recalled pattern extraction so it reads `trust_hardening` from:

1. `execution_native_v1.trust_hardening`
2. fallback `anchor_v1.trust_hardening`

**Step 2: Expose it on route output**

Add `trust_hardening` to `pattern_matches.anchors[*]`.

**Step 3: Tighten schema contract**

Add `trust_hardening` to `PatternMatchAnchorContractSchema` using the existing `MemoryPatternTrustHardeningSchema`.

### Task 3: Expose hardening metadata in introspection output

**Files:**
- Modify: `src/memory/execution-introspection.ts`

**Step 1: Thread through trust hardening**

Update `toPatternEntry(...)` to read and emit `trust_hardening`.

**Step 2: Preserve it in pattern signals**

Update `toPatternSignal(...)` so the same metadata remains visible on `pattern_signals`.

### Task 4: Verify and update status docs

**Files:**
- Modify: `docs/LITE_GOVERNANCE_AND_STRATEGY_STATUS.md`

**Step 1: Run focused verification**

Run:

```bash
npx tsx --test scripts/ci/lite-tools-select-route-contract.test.ts
npx tsx --test scripts/ci/lite-execution-introspection-route.test.ts
npx tsc --noEmit
npm run -s test:lite
```

Expected:

All pass with no planner/context surface changes.

**Step 2: Update status wording**

Record that hardening metadata is no longer only stored internally; it is now contract-visible on selector and introspection surfaces.

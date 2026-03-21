# Aionis Adapter Sidecar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local source-owned sidecar process that accepts normalized execution events and drives the current Aionis adapter baseline without relying on prompt choreography or direct client-private integrations.

**Architecture:** Reuse the current adapter and harness layers in `src/adapter/`. Add a narrow sidecar process that accepts task and tool lifecycle events, validates them, routes them through the adapter/harness, and returns normalized responses. Keep sidecar state ephemeral and local. Do not add a new persistence layer.

**Tech Stack:** TypeScript, node:test, zod, source-owned adapter modules under `src/adapter/`, local process entrypoint under `src/adapter/sidecar.ts`.

---

### Task 1: Define sidecar event contracts

**Files:**
- Create: `src/adapter/sidecar-contracts.ts`
- Test: `scripts/ci/aionis-adapter-sidecar-contract.test.ts`

**Step 1: Write the failing contract test**

Assert that the sidecar accepts:

1. `task_started`
2. `tool_selection_requested`
3. `tool_executed`
4. `task_completed`
5. `task_blocked`
6. `task_failed`
7. `introspect_requested`

**Step 2: Run test to verify it fails**

```bash
npx tsx --test scripts/ci/aionis-adapter-sidecar-contract.test.ts
```

**Step 3: Add minimal event contracts**

Implement the narrow sidecar event schema family.

**Step 4: Run test to verify it passes**

```bash
npx tsx --test scripts/ci/aionis-adapter-sidecar-contract.test.ts
```

**Step 5: Commit**

```bash
git add src/adapter/sidecar-contracts.ts scripts/ci/aionis-adapter-sidecar-contract.test.ts
git commit -m "Add Aionis adapter sidecar contracts"
```

### Task 2: Implement a local sidecar dispatcher

**Files:**
- Create: `src/adapter/sidecar.ts`
- Test: `scripts/ci/aionis-adapter-sidecar-dispatch.test.ts`

**Step 1: Write the failing dispatch test**

Assert that a sidecar dispatcher:

1. routes `task_started` to planning
2. routes `tool_selection_requested` to selection
3. routes `tool_executed` to evidence capture
4. routes terminal events to finalization
5. routes introspection requests to the harness

**Step 2: Run test to verify it fails**

```bash
npx tsx --test scripts/ci/aionis-adapter-sidecar-dispatch.test.ts
```

**Step 3: Implement the minimal dispatcher**

Use the existing adapter and harness layers instead of introducing a second execution model.

**Step 4: Run test to verify it passes**

```bash
npx tsx --test scripts/ci/aionis-adapter-sidecar-dispatch.test.ts
```

**Step 5: Commit**

```bash
git add src/adapter/sidecar.ts scripts/ci/aionis-adapter-sidecar-dispatch.test.ts
git commit -m "Add Aionis adapter sidecar dispatcher"
```

### Task 3: Add a local process entrypoint

**Files:**
- Create: `src/adapter/aionis-adapter-sidecar.ts`
- Modify: `package.json`
- Test: `scripts/ci/aionis-adapter-sidecar-entry.test.ts`

**Step 1: Write the failing entry test**

Assert that the sidecar process:

1. starts successfully
2. accepts one event request
3. returns one normalized response

**Step 2: Run test to verify it fails**

```bash
npx tsx --test scripts/ci/aionis-adapter-sidecar-entry.test.ts
```

**Step 3: Add a local process entrypoint**

Expose a script for local sidecar execution.

**Step 4: Run test to verify it passes**

```bash
npx tsx --test scripts/ci/aionis-adapter-sidecar-entry.test.ts
```

**Step 5: Commit**

```bash
git add src/adapter/aionis-adapter-sidecar.ts package.json scripts/ci/aionis-adapter-sidecar-entry.test.ts
git commit -m "Add Aionis adapter sidecar entrypoint"
```

### Task 4: Add a wrapper-oriented end-to-end harness test

**Files:**
- Create: `scripts/ci/aionis-adapter-sidecar-e2e.test.ts`
- Modify: `src/adapter/sidecar.ts`

**Step 1: Write the failing end-to-end test**

Assert that a wrapper-style client can:

1. start a task
2. request tool selection
3. report one ambiguous step
4. finalize the task
5. introspect learned state

without conversational confirmation loops.

**Step 2: Run test to verify it fails**

```bash
npx tsx --test scripts/ci/aionis-adapter-sidecar-e2e.test.ts
```

**Step 3: Implement the minimal support**

Keep it local and deterministic.

**Step 4: Run test to verify it passes**

```bash
npx tsx --test scripts/ci/aionis-adapter-sidecar-e2e.test.ts
```

**Step 5: Commit**

```bash
git add src/adapter/sidecar.ts scripts/ci/aionis-adapter-sidecar-e2e.test.ts
git commit -m "Add Aionis adapter sidecar end-to-end loop"
```

### Task 5: Document sidecar usage and migration

**Files:**
- Create: `docs/AIONIS_ADAPTER_SIDECAR_GUIDE.md`
- Modify: `README.md`
- Modify: `docs/AIONIS_EXECUTION_ADAPTER_GUIDE.md`

**Step 1: Write docs**

Explain:

1. what the sidecar is
2. why it exists
3. how it differs from thin MCP
4. how wrapper-style clients should use it

**Step 2: Review docs manually**

Ensure no contradiction with:

1. `AIONIS_ADAPTER_DIRECTION.md`
2. `AIONIS_EXECUTION_ADAPTER_SPEC.md`
3. `AIONIS_THIN_MCP_GUIDE.md`

**Step 3: Commit**

```bash
git add docs/AIONIS_ADAPTER_SIDECAR_GUIDE.md README.md docs/AIONIS_EXECUTION_ADAPTER_GUIDE.md
git commit -m "Document Aionis adapter sidecar"
```

### Task 6: Run release-level verification

**Files:**
- Test only

**Step 1: Run sidecar-specific tests**

```bash
npx tsx --test scripts/ci/aionis-adapter-sidecar-contract.test.ts scripts/ci/aionis-adapter-sidecar-dispatch.test.ts scripts/ci/aionis-adapter-sidecar-entry.test.ts scripts/ci/aionis-adapter-sidecar-e2e.test.ts
```

**Step 2: Run TypeScript**

```bash
npx tsc --noEmit
```

**Step 3: Run Lite baseline**

```bash
npm run -s test:lite
```

**Step 4: Commit**

```bash
git add -A
git commit -m "Ship Aionis adapter sidecar baseline"
```

## Notes

The sidecar should stay narrow:

1. local only
2. no new database
3. no hidden trust logic
4. no new planner surface
5. wrapper-first before deeper client-native integrations

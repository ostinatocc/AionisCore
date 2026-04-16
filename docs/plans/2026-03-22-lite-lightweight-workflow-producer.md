Last reviewed: 2026-04-16

Document status: historical implementation plan

# Lite Lightweight Workflow Producer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow lightweight handoff-style continuity writes to enter Lite's existing governed workflow-projection pipeline without widening the public route surface.

**Architecture:** Extend the current workflow-write projection assessor so it can synthesize conservative continuity inputs from handoff-like source slots when `execution_state_v1` and `execution_packet_v1` are absent. Reuse the same signature derivation, candidate creation, observation counting, and stable-promotion flow already used by the generic producer. Lock the new boundary down with route and contract tests.

**Tech Stack:** TypeScript, Fastify, SQLite-backed Lite stores, node:test, tsx.

---

### Task 1: Add failing coverage for lightweight continuity projection

**Files:**
- Modify: `scripts/ci/lite-memory-write-workflow-projection-route.test.ts`
- Modify: `scripts/ci/lite-workflow-write-projection-contract.test.ts`

**Step 1: Add a contract test for lightweight handoff continuity**

Add a new assessment test that feeds `assessWorkflowProjectionSourceNode(...)` an `event` with:

1. `summary_kind = "handoff"`
2. `handoff_kind = "patch_handoff"`
3. `anchor`
4. `file_path`
5. `target_files`
6. `summary` or `text_summary`
7. no `execution_state_v1`
8. no `execution_packet_v1`

Expected:

1. the node is eligible
2. the derived signature is deterministic
3. the projection client id remains deterministic

**Step 2: Add a contract rejection case**

Add a second assessment case with `summary_kind = "handoff"` but no resumable target signal.

Expected:

1. the node is rejected as missing execution continuity

**Step 3: Add a route test for memory/write**

Extend `lite-memory-write-workflow-projection-route.test.ts` with a handoff-style `/v1/memory/write` payload that carries only lightweight continuity fields.

Expected:

1. first write yields one candidate workflow
2. second matching distinct write yields stable workflow guidance

**Step 4: Run focused tests to verify failure**

Run:

```bash
npx tsx --test scripts/ci/lite-workflow-write-projection-contract.test.ts
npx tsx --test scripts/ci/lite-memory-write-workflow-projection-route.test.ts
```

Expected:

The new lightweight continuity assertions fail before implementation.

### Task 2: Extend the workflow projection assessor conservatively

**Files:**
- Modify: `src/memory/workflow-write-projection.ts`
- Modify: `src/memory/schemas.ts` only if a new internal reason or shape needs schema alignment

**Step 1: Add lightweight handoff continuity parsing**

Inside `workflow-write-projection.ts`, add a narrow helper that synthesizes continuity inputs from source slots when:

1. `summary_kind === "handoff"`
2. `handoff_kind` is present
3. `anchor` is present
4. resumable target info exists from `target_files`, `file_path`, or `anchor`

**Step 2: Reuse existing signature logic**

Feed the synthesized continuity into the current derivation path so:

1. `deriveWorkflowSignatureFromInputs(...)` remains the source of truth
2. `deriveTaskSignatureFromInputs(...)` remains the source of truth
3. observation and promotion semantics stay unchanged

**Step 3: Preserve abstention behavior**

If lightweight slots cannot produce a conservative continuity shape:

1. keep returning the existing ineligible result
2. do not project partial or ambiguous workflow memory

**Step 4: Run focused tests**

Run:

```bash
npx tsx --test scripts/ci/lite-workflow-write-projection-contract.test.ts
npx tsx --test scripts/ci/lite-memory-write-workflow-projection-route.test.ts
```

Expected:

The new contract and route coverage pass.

### Task 3: Verify existing generic producer surfaces stay stable

**Files:**
- Test: `scripts/ci/lite-handoff-workflow-projection-route.test.ts`
- Test: `scripts/ci/lite-session-event-workflow-projection-route.test.ts`

**Step 1: Run existing handoff and session-event route coverage**

Run:

```bash
npx tsx --test scripts/ci/lite-handoff-workflow-projection-route.test.ts
npx tsx --test scripts/ci/lite-session-event-workflow-projection-route.test.ts
```

Expected:

Both still pass unchanged.

**Step 2: Run core verification**

Run:

```bash
npx tsc --noEmit
npm run -s test:lite
```

Expected:

Core runtime compiles and the Lite suite remains green.

### Task 4: Update status docs after code lands

**Files:**
- Modify: `docs/CORE_GOVERNANCE_AND_STRATEGY_STATUS.md`

**Step 1: Record the new producer breadth**

Update the workflow-memory/readiness sections so they describe:

1. current support for `execution_state_v1`
2. packet-only continuity
3. lightweight handoff-style continuity

**Step 2: Keep the next gap accurate**

Update the “next priority” wording so it no longer claims the producer is limited strictly to state/packet continuity once this slice lands.

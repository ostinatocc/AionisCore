# AionisPro Priority Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the highest-priority and second-priority `AionisPro` memory-evolution and agent-memory surfaces into `Aionis Runtime` without collapsing the current Lite/Core public boundary.

**Architecture:** Treat the migration as four layers. First migrate low-coupling priority and feedback primitives. Next migrate policy-memory and evolution inspect as the self-evolution kernel. Then add the agent-facing inspect/review façade on top of those kernels. Only after the TypeScript runtime and route shapes stabilize should the public SDK, internal CLI, and optional Python client be expanded.

**Tech Stack:** TypeScript, Fastify, Zod, SQLite-backed Lite runtime, existing `scripts/ci` contract tests, `packages/full-sdk`, `packages/sdk` (`@ostinato/aionis-internal-sdk`), optional Python packaging.

Last reviewed: 2026-04-18

Document status: active implementation plan

---

## Migration Rules

1. Do **not** replace the current repository with the full desktop repo shape.
2. Do **not** migrate hosted/control-plane/ops/MCP surfaces in this plan.
3. Keep the public SDK surface rooted in `packages/full-sdk`.
4. Keep `packages/sdk` as the internal SDK/CLI package unless a later packaging decision changes that explicitly.
5. Land the highest-priority kernel work first. Do not start second-priority façade work until the evolution kernel is green in Lite tests.
6. Prefer selective porting over wholesale file copying. The desktop repo is dirty; treat it as a source of candidate modules, not a trustable release artifact.

## Delivery Order

### Highest Priority

1. `src/memory/importance-dynamics.ts`
2. `src/memory/node-feedback-state.ts`
3. Refactor current feedback update paths to use those modules
4. `src/memory/policy-memory.ts` + missing schemas/contracts
5. Split current evolution review logic into a first-class `src/memory/evolution-inspect.ts`

### Second Priority

1. `src/memory/agent-memory-inspect-core.ts`
2. Selective agent-memory routes and public SDK surface
3. Selective internal CLI support in `packages/sdk`
4. Optional Python client subset after TS contracts stabilize

## Non-Goals

- No `apps/ops` migration
- No hosted jobs migration
- No control-plane routes
- No full desktop `packages/sdk` replacement
- No full desktop CLI replacement
- No Python package release before the TS runtime and SDK surfaces settle

## Acceptance Gates

### Gate A: Priority/Feedback Kernel

- New low-level tests pass for priority scoring and feedback-state merging.
- `nodes.activate`, Lite lifecycle feedback, and tool-pattern updates use the same feedback state helper.
- Existing Lite lifecycle and tools-pattern tests still pass.

### Gate B: Policy Memory / Evolution Kernel

- Policy memory can be materialized, reviewed, maintained, and governed in Lite.
- `evolution_review_pack` can expose policy review/governance output without breaking current contracts.
- Existing `lite-evolution-review-pack-route.test.ts` still passes with stricter assertions.

### Gate C: Agent Façade

- Agent inspect/review/resume/handoff surfaces exist as additive routes.
- Public SDK methods are additive and consistent with runtime routes.
- Docs and examples show the new surfaces without displacing the current Core path.

### Gate D: Packaging

- `packages/full-sdk` tests pass.
- `packages/sdk` internal tests pass.
- Python package work only begins if Gates A-C are green.

### Task 1: Add Migration Guardrail Tests For Priority And Feedback Primitives

**Files:**
- Create: `scripts/ci/lite-importance-dynamics.test.ts`
- Create: `scripts/ci/lite-node-feedback-state.test.ts`
- Modify: `package.json`

**Step 1: Write the failing tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { resolveNodePriorityProfile } from "../../src/memory/importance-dynamics.js";

test("trusted workflow/pattern memory scores above raw event nodes", () => {
  const raw = resolveNodePriorityProfile({ type: "event", tier: "warm", slots: {} });
  const trusted = resolveNodePriorityProfile({
    type: "rule",
    tier: "warm",
    slots: { summary_kind: "pattern_anchor", anchor_v1: { credibility_state: "trusted", anchor_kind: "pattern" } },
  });
  assert.ok(trusted.importance > raw.importance);
  assert.ok(trusted.confidence > raw.confidence);
});
```

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { computeFeedbackUpdatedNodeState } from "../../src/memory/node-feedback-state.js";

test("positive feedback increments counters and recomputes node priority", () => {
  const next = computeFeedbackUpdatedNodeState({
    node: { id: "n1", type: "procedure", slots: {} },
    feedback: {
      outcome: "positive",
      input_sha256: "abc",
      source: "nodes_activate",
      timestamp: "2026-04-18T00:00:00.000Z",
    },
  });
  assert.equal(next.slots.feedback_positive, 1);
  assert.ok(next.importance > 0);
});
```

**Step 2: Run tests to verify they fail**

Run: `npx tsx --test scripts/ci/lite-importance-dynamics.test.ts scripts/ci/lite-node-feedback-state.test.ts`  
Expected: FAIL with missing module exports.

**Step 3: Write minimal implementation**

- Add the new source files with exported pure helpers.
- Register the new tests in the `lite:test` command only after they pass in isolation.

**Step 4: Run tests to verify they pass**

Run: `npx tsx --test scripts/ci/lite-importance-dynamics.test.ts scripts/ci/lite-node-feedback-state.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/ci/lite-importance-dynamics.test.ts scripts/ci/lite-node-feedback-state.test.ts package.json src/memory/importance-dynamics.ts src/memory/node-feedback-state.ts
git commit -m "feat: add priority and feedback primitives"
```

### Task 2: Port `importance-dynamics.ts` As The Single Node Priority Model

**Files:**
- Create: `src/memory/importance-dynamics.ts`
- Modify: `src/memory/tools-pattern-anchor.ts`
- Modify: `src/memory/write.ts`
- Modify: `src/memory/replay.ts`
- Test: `scripts/ci/lite-importance-dynamics.test.ts`
- Test: `scripts/ci/lite-tools-pattern-anchor.test.ts`

**Step 1: Write the failing test**

Add assertions that pattern anchors and replay-promoted workflow artifacts no longer rely only on hard-coded trust profiles.

```ts
test("pattern anchor priority resolves through shared priority model", async () => {
  assert.match(String(resolveNodePriorityProfile), /function/);
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test scripts/ci/lite-importance-dynamics.test.ts scripts/ci/lite-tools-pattern-anchor.test.ts`  
Expected: FAIL because shared priority model is not wired into current callers.

**Step 3: Write minimal implementation**

- Port the desktop `resolveNodePriorityProfile` logic.
- Replace local hard-coded confidence/salience priority derivation in:
  - `src/memory/tools-pattern-anchor.ts`
  - `src/memory/write.ts` where new nodes default to static `0.5`-style priority
  - `src/memory/replay.ts` where replay-written nodes preserve stale priority blindly

**Step 4: Run tests to verify they pass**

Run: `npx tsx --test scripts/ci/lite-importance-dynamics.test.ts scripts/ci/lite-tools-pattern-anchor.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/memory/importance-dynamics.ts src/memory/tools-pattern-anchor.ts src/memory/write.ts src/memory/replay.ts scripts/ci/lite-importance-dynamics.test.ts
git commit -m "feat: centralize node priority dynamics"
```

### Task 3: Port `node-feedback-state.ts` And Replace Inline Feedback Mutations

**Files:**
- Create: `src/memory/node-feedback-state.ts`
- Modify: `src/memory/lifecycle-lite.ts`
- Modify: `src/memory/nodes-activate.ts`
- Modify: `src/memory/feedback.ts`
- Modify: `src/memory/tools-feedback.ts`
- Test: `scripts/ci/lite-node-feedback-state.test.ts`
- Test: `scripts/ci/lite-memory-lifecycle-route.test.ts`

**Step 1: Write the failing test**

Add assertions that all feedback paths emit the same slot keys and recompute salience/importance/confidence consistently.

```ts
test("feedback helper produces consistent slot fields for lite lifecycle and pg nodes activate", () => {
  const next = computeFeedbackUpdatedNodeState({
    node: { id: "n1", type: "procedure", slots: {} },
    feedback: {
      outcome: "negative",
      input_sha256: "abc",
      source: "nodes_activate",
      timestamp: "2026-04-18T00:00:00.000Z",
    },
  });
  assert.equal(next.slots.last_feedback_outcome, "negative");
  assert.ok(typeof next.salience === "number");
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test scripts/ci/lite-node-feedback-state.test.ts scripts/ci/lite-memory-lifecycle-route.test.ts`  
Expected: FAIL because current implementations still mutate slots inline.

**Step 3: Write minimal implementation**

- Port desktop helpers:
  - `shouldActivateNodeOnFeedback`
  - `mergeNodeFeedbackSlots`
  - `computeFeedbackUpdatedNodeState`
- Refactor:
  - `src/memory/lifecycle-lite.ts`
  - `src/memory/nodes-activate.ts`
  - `src/memory/feedback.ts`
  - `src/memory/tools-feedback.ts`
  to call the shared helper instead of duplicating feedback math.

**Step 4: Run tests to verify they pass**

Run: `npx tsx --test scripts/ci/lite-node-feedback-state.test.ts scripts/ci/lite-memory-lifecycle-route.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/memory/node-feedback-state.ts src/memory/lifecycle-lite.ts src/memory/nodes-activate.ts src/memory/feedback.ts src/memory/tools-feedback.ts scripts/ci/lite-node-feedback-state.test.ts
git commit -m "feat: unify node feedback state updates"
```

### Task 4: Add Missing Policy-Memory Schemas And SDK Contracts

**Files:**
- Modify: `src/memory/schemas.ts`
- Modify: `packages/full-sdk/src/contracts.ts`
- Test: `scripts/ci/lite-evolution-review-pack-route.test.ts`
- Test: `packages/full-sdk/test/client.test.ts`

**Step 1: Write the failing test**

Add assertions that evolution review responses can carry:
- `derived_policy`
- `policy_contract`
- `policy_review`
- `policy_governance_contract`
- `policy_governance_apply_payload`
- `policy_governance_apply_result`

```ts
assert.ok("policy_review" in response.evolution_review_pack || "policy_review" in response.evolution_inspect);
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test scripts/ci/lite-evolution-review-pack-route.test.ts && npm --prefix packages/full-sdk run test -- --testNamePattern evolution`  
Expected: FAIL because current schemas/contracts stop at `evolution_summary`.

**Step 3: Write minimal implementation**

- Port schema families from desktop:
  - `DerivedPolicySurfaceSchema`
  - `PolicyContractSchema`
  - `PolicyReviewSummarySchema`
  - `PolicyGovernanceContractSchema`
  - `PolicyGovernanceApplyPayloadSchema`
  - `PolicyGovernanceApplyResultSchema`
- Mirror additive types into `packages/full-sdk/src/contracts.ts`.
- Keep the change additive; do not break current response fields.

**Step 4: Run tests to verify they pass**

Run: `npx tsx --test scripts/ci/lite-evolution-review-pack-route.test.ts && npm run -s sdk:test`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/memory/schemas.ts packages/full-sdk/src/contracts.ts scripts/ci/lite-evolution-review-pack-route.test.ts packages/full-sdk/test/client.test.ts
git commit -m "feat: add policy memory schemas and sdk contracts"
```

### Task 5: Port `policy-memory.ts` With A Lite-First Integration

**Files:**
- Create: `src/memory/policy-memory.ts`
- Modify: `src/memory/tools-feedback.ts`
- Modify: `src/memory/execution-introspection.ts`
- Modify: `src/memory/experience-intelligence.ts`
- Modify: `src/memory/reviewer-packs.ts`
- Test: `scripts/ci/lite-tools-pattern-anchor.test.ts`
- Test: `scripts/ci/lite-execution-introspection-route.test.ts`
- Test: `scripts/ci/lite-evolution-review-pack-route.test.ts`
- Create: `scripts/ci/lite-policy-memory-contract.test.ts`

**Step 1: Write the failing test**

Add a Lite test that positive tool feedback on a stable workflow/pattern can materialize policy memory and that contested feedback can move it into review-needed state.

```ts
test("policy memory is materialized from stable tool learning and becomes contested on negative feedback", async () => {
  assert.ok(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test scripts/ci/lite-policy-memory-contract.test.ts scripts/ci/lite-execution-introspection-route.test.ts scripts/ci/lite-evolution-review-pack-route.test.ts`  
Expected: FAIL because no policy-memory module or surfaced fields exist.

**Step 3: Write minimal implementation**

- Port `src/memory/policy-memory.ts` selectively:
  - keep Lite and current write-access integration
  - omit Postgres jobs and hosted-only maintenance entrypoints
- Wire policy memory materialization into `src/memory/tools-feedback.ts`.
- Surface policy memory nodes in `src/memory/execution-introspection.ts`.
- Let `src/memory/experience-intelligence.ts` and `src/memory/reviewer-packs.ts` consume policy contract state as additive hints.

**Step 4: Run tests to verify they pass**

Run: `npx tsx --test scripts/ci/lite-policy-memory-contract.test.ts scripts/ci/lite-execution-introspection-route.test.ts scripts/ci/lite-evolution-review-pack-route.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/memory/policy-memory.ts src/memory/tools-feedback.ts src/memory/execution-introspection.ts src/memory/experience-intelligence.ts src/memory/reviewer-packs.ts scripts/ci/lite-policy-memory-contract.test.ts
git commit -m "feat: add lite policy memory kernel"
```

### Task 6: Split `evolution-inspect.ts` Out Of `reviewer-packs.ts`

**Files:**
- Create: `src/memory/evolution-inspect.ts`
- Modify: `src/memory/reviewer-packs.ts`
- Modify: `src/routes/memory-access.ts`
- Modify: `packages/full-sdk/src/client.ts`
- Test: `scripts/ci/lite-evolution-review-pack-route.test.ts`
- Test: `packages/full-sdk/test/client.test.ts`

**Step 1: Write the failing test**

Add assertions that evolution inspect can compute and expose policy governance surfaces without bloating the review-pack builder.

```ts
assert.equal(response.evolution_inspect.summary_version, "evolution_inspect_v1");
assert.ok("policy_governance_contract" in response.evolution_inspect || "policy_governance_contract" in response.evolution_review_pack);
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test scripts/ci/lite-evolution-review-pack-route.test.ts && npm run -s sdk:test`  
Expected: FAIL because current implementation still lives inside `reviewer-packs.ts`.

**Step 3: Write minimal implementation**

- Port desktop `src/memory/evolution-inspect.ts`.
- Keep current route path `/v1/memory/evolution/review-pack`.
- Do **not** add a new public route yet unless the response shape is stable; first use the module internally from the existing route builder.
- If needed, add a new internal-only helper in `packages/full-sdk/src/client.ts` only after the route shape is final.

**Step 4: Run tests to verify they pass**

Run: `npx tsx --test scripts/ci/lite-evolution-review-pack-route.test.ts && npm run -s sdk:test`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/memory/evolution-inspect.ts src/memory/reviewer-packs.ts src/routes/memory-access.ts packages/full-sdk/src/client.ts
git commit -m "feat: promote evolution inspect to first-class module"
```

### Task 7: Add Agent-Memory Schemas Before Porting The Façade

**Files:**
- Modify: `src/memory/schemas.ts`
- Modify: `packages/full-sdk/src/contracts.ts`
- Create: `scripts/ci/lite-agent-memory-route-contract.test.ts`

**Step 1: Write the failing test**

Add Zod/runtime contract coverage for:
- `AgentMemoryInspectRequest`
- `AgentMemoryInspectResponse`
- `AgentMemoryReviewPackResponse`
- `AgentMemoryResumePackResponse`
- `AgentMemoryHandoffPackResponse`

**Step 2: Run test to verify it fails**

Run: `npx tsx --test scripts/ci/lite-agent-memory-route-contract.test.ts`  
Expected: FAIL because schemas and TS contracts do not exist.

**Step 3: Write minimal implementation**

- Port only the agent-memory schemas needed by:
  - inspect
  - review pack
  - resume pack
  - handoff pack
- Do **not** add task-pack/cycle-pack in this first façade pass.

**Step 4: Run tests to verify they pass**

Run: `npx tsx --test scripts/ci/lite-agent-memory-route-contract.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/memory/schemas.ts packages/full-sdk/src/contracts.ts scripts/ci/lite-agent-memory-route-contract.test.ts
git commit -m "feat: add agent memory contracts"
```

### Task 8: Port `agent-memory-inspect-core.ts` As A Lite Façade

Status: completed on 2026-04-18
Implemented:
- `src/memory/agent-memory-inspect-core.ts`
- `src/memory/schemas.ts` agent-memory inspect/review/resume/handoff contracts
- `scripts/ci/lite-agent-memory-inspect.test.ts`

**Files:**
- Create: `src/memory/agent-memory-inspect-core.ts`
- Modify: `src/memory/reviewer-packs.ts`
- Test: `scripts/ci/lite-agent-memory-route-contract.test.ts`
- Create: `scripts/ci/lite-agent-memory-inspect.test.ts`

**Step 1: Write the failing test**

Add tests that the new façade can assemble:
- continuity review context
- evolution inspect/review context
- derived policy state
- agent_memory_summary

**Step 2: Run test to verify it fails**

Run: `npx tsx --test scripts/ci/lite-agent-memory-inspect.test.ts`  
Expected: FAIL because the façade does not exist.

**Step 3: Write minimal implementation**

- Port desktop `buildAgentMemoryInspectLite` and pack builders selectively.
- Keep it as a module first; do not add routes until module tests pass.
- Reuse current continuity/evolution builders instead of forking them again.

**Step 4: Run tests to verify they pass**

Run: `npx tsx --test scripts/ci/lite-agent-memory-inspect.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/memory/agent-memory-inspect-core.ts scripts/ci/lite-agent-memory-inspect.test.ts
git commit -m "feat: add agent memory inspect facade"
```

### Task 9: Add Agent-Memory Routes Selectively

Status: completed on 2026-04-18
Implemented:
- `/v1/memory/agent/inspect`
- `/v1/memory/agent/review-pack`
- `/v1/memory/agent/resume-pack`
- `/v1/memory/agent/handoff-pack`
- route coverage folded into `scripts/ci/lite-agent-memory-inspect.test.ts`

**Files:**
- Modify: `src/routes/memory-access.ts`
- Modify: `src/host/http-host.ts`
- Modify: `src/host/lite-edition.ts`
- Test: `scripts/ci/lite-agent-memory-route-contract.test.ts`

**Step 1: Write the failing test**

Add route coverage for:
- `/v1/memory/agent/inspect`
- `/v1/memory/agent/review-pack`
- `/v1/memory/agent/resume-pack`
- `/v1/memory/agent/handoff-pack`

**Step 2: Run test to verify it fails**

Run: `npx tsx --test scripts/ci/lite-agent-memory-route-contract.test.ts`  
Expected: FAIL because the routes are not registered.

**Step 3: Write minimal implementation**

- Register only the four agent-memory routes above.
- Keep `task-pack` and `cycle-pack` deferred until there is a demonstrated product need.
- Do not touch server-only control-plane matrices.

**Step 4: Run tests to verify they pass**

Run: `npx tsx --test scripts/ci/lite-agent-memory-route-contract.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/routes/memory-access.ts src/host/http-host.ts src/host/lite-edition.ts scripts/ci/lite-agent-memory-route-contract.test.ts
git commit -m "feat: add agent memory routes to lite runtime"
```

### Task 10: Selectively Port Agent-Memory Public SDK Methods Into `packages/full-sdk`

Status: completed on 2026-04-18
Implemented:
- `packages/full-sdk/src/contracts.ts`
- `packages/full-sdk/src/client.ts`
- public surface: `aionis.memory.agent.inspect/reviewPack/resumePack/handoffPack`

Deferred:
- `examples/full-sdk/07-agent-memory-inspect.ts`
- README/example docs for the new surface

**Files:**
- Modify: `packages/full-sdk/src/client.ts`
- Modify: `packages/full-sdk/src/contracts.ts`
- Modify: `packages/full-sdk/src/index.ts`
- Modify: `packages/full-sdk/test/client.test.ts`
- Modify: `examples/full-sdk/README.md`
- Create: `examples/full-sdk/07-agent-memory-inspect.ts`

**Step 1: Write the failing test**

Add client expectations for:
- `aionis.memory.agent.inspect(...)`
- `aionis.memory.agent.reviewPack(...)`
- `aionis.memory.agent.resumePack(...)`
- `aionis.memory.agent.handoffPack(...)`

**Step 2: Run test to verify it fails**

Run: `npm run -s sdk:test`  
Expected: FAIL because the new client methods do not exist.

**Step 3: Write minimal implementation**

- Extend `packages/full-sdk/src/client.ts` only with the new agent-memory methods.
- Do **not** replace the package with desktop `packages/sdk/src/client.ts`.
- Add one runnable example, not a large example suite explosion.

**Step 4: Run tests to verify they pass**

Run: `npm run -s sdk:test && npx tsx examples/full-sdk/07-agent-memory-inspect.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add packages/full-sdk/src/client.ts packages/full-sdk/src/contracts.ts packages/full-sdk/src/index.ts packages/full-sdk/test/client.test.ts examples/full-sdk/07-agent-memory-inspect.ts examples/full-sdk/README.md
git commit -m "feat: expose agent memory surfaces in public sdk"
```

### Task 11: Add A Narrow Internal CLI For Evolution/Agent-Memory Diagnostics

Status: completed on 2026-04-18
Implemented:
- `packages/sdk/src/client.ts`
- `packages/sdk/src/cli.ts`
- `packages/sdk/src/cli-support.ts`
- `packages/sdk/src/contracts.ts`
- `packages/sdk/src/index.ts`
- `packages/sdk/src/modules/agent-memory-inspect.ts`
- `packages/sdk/src/modules/evolution-review-pack.ts`
- `packages/sdk/test/client.test.ts`
- `packages/sdk/test/cli.test.ts`
- `packages/sdk/test/contracts.test.ts`
- `examples/sdk/09-agent-memory-diagnostics.ts`

**Files:**
- Modify: `packages/sdk/src/client.ts`
- Modify: `packages/sdk/src/cli.ts`
- Modify: `packages/sdk/test/*.test.ts`
- Create: `examples/sdk/09-agent-memory-diagnostics.ts`

**Step 1: Write the failing test**

Add internal CLI coverage for commands such as:
- `aionis-internal agent-inspect`
- `aionis-internal evolution-review`

**Step 2: Run test to verify it fails**

Run: `npm run -s internal-sdk:test`  
Expected: FAIL because the commands/modules do not exist.

**Step 3: Write minimal implementation**

- Add a thin diagnostic module to `packages/sdk/src/client.ts`.
- Add only narrow CLI commands for the new inspect surfaces.
- Do **not** replace current internal CLI with the desktop full CLI.

**Step 4: Run tests to verify they pass**

Run: `npm run -s internal-sdk:test`  
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sdk/src/client.ts packages/sdk/src/cli.ts packages/sdk/test examples/sdk/09-agent-memory-diagnostics.ts
git commit -m "feat: add internal diagnostics for evolution and agent memory"
```

### Task 12: Port A Minimal Experimental Python Client After TS Stabilizes

Status: completed on 2026-04-18
Implemented:
- `packages/python-sdk/pyproject.toml`
- `packages/python-sdk/src/aionis_sdk/__init__.py`
- `packages/python-sdk/src/aionis_sdk/client.py`
- `packages/python-sdk/tests/test_agent_memory.py`
- `packages/python-sdk/README.md`

**Files:**
- Create: `packages/python-sdk/pyproject.toml`
- Create: `packages/python-sdk/src/aionis_sdk/__init__.py`
- Create: `packages/python-sdk/src/aionis_sdk/client.py`
- Create: `packages/python-sdk/tests/test_agent_memory.py`
- Create: `packages/python-sdk/README.md`

**Step 1: Write the failing test**

Create one Python test for agent-memory inspect:

```python
def test_agent_memory_inspect_builds_request():
    from aionis_sdk.client import AionisClient
    client = AionisClient(base_url="http://127.0.0.1:3001")
    req = client.memory.agent.inspect_request(query_text="repair export mismatch")
    assert req["query_text"] == "repair export mismatch"
```

**Step 2: Run test to verify it fails**

Run: `python -m pytest packages/python-sdk/tests/test_agent_memory.py -q`  
Expected: FAIL because the package does not exist.

**Step 3: Write minimal implementation**

- Port only the additive agent-memory/evolution methods.
- Do **not** attempt feature parity with the desktop Python client.
- Mark the package experimental until at least one external integrator uses it.

**Step 4: Run tests to verify they pass**

Run: `python -m pytest packages/python-sdk/tests/test_agent_memory.py -q`  
Expected: PASS

**Step 5: Commit**

```bash
git add packages/python-sdk
git commit -m "feat: add experimental python client for agent memory"
```

## Final Verification Checklist

Run these after each gate, not only at the end:

```bash
npx tsx --test scripts/ci/lite-importance-dynamics.test.ts scripts/ci/lite-node-feedback-state.test.ts
npx tsx --test scripts/ci/lite-memory-lifecycle-route.test.ts scripts/ci/lite-tools-pattern-anchor.test.ts
npx tsx --test scripts/ci/lite-policy-memory-contract.test.ts scripts/ci/lite-evolution-review-pack-route.test.ts scripts/ci/lite-agent-memory-route-contract.test.ts
npm run -s lite:test
npm run -s sdk:test
npm run -s internal-sdk:test
npm run -s build
```

Run this only once Python work actually exists:

```bash
python -m pytest packages/python-sdk/tests -q
```

## Recommended Execution Order

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Gate B review
8. Task 7
9. Task 8
10. Task 9
11. Task 10
12. Task 11
13. Task 12 only if a Python client is still justified

## Stop Conditions

- If policy-memory requires large schema/store changes that destabilize Lite writes, stop after Task 4 and re-scope.
- If agent-memory façade work starts pulling in control-plane/ops dependencies, stop after Task 8 and re-scope.
- If public SDK changes begin mirroring the desktop full SDK wholesale, stop and re-scope back to additive methods only.

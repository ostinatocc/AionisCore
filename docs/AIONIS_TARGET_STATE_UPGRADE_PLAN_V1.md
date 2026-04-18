# Aionis Target-State Upgrade Plan

Last reviewed: 2026-04-18

Internal status: active upgrade roadmap

This document is the living upgrade roadmap for moving `Aionis Runtime` from:

- a validated `self-evolving continuity kernel`

to:

- a fuller `Dynamic Memory Evolution / Memory v2` operating system
- and the first serious execution-facing slice of the `Tool-Centric AGI Framework`

It is based on three inputs:

1. the `Dynamic Memory Evolution / Aionis Memory v2` design
2. the `Tool-Centric AGI Framework` design
3. the current repository assessment in [AIONIS_TARGET_STATE_GAP_MATRIX_V1.md](./AIONIS_TARGET_STATE_GAP_MATRIX_V1.md)

This is not a marketing document. It is the upgrade source of truth for the next major runtime phases.

## 1. Current baseline

The repository is no longer at the “concept only” stage.

The current public system already has:

- `task start`
- `handoff`
- `replay`
- `importance dynamics`
- `node feedback state`
- `policy memory`
- `evolution inspect`
- `agent memory inspect`
- Lite `archive.rehydrate` and `nodes.activate`
- public SDK, internal diagnostics CLI, and an experimental Python subset
- proof demos for:
  - better second task start
  - policy memory materialization
  - retire/reactivate governance

The current practical state is:

- `Memory v2` core kernel: roughly `60-65%`
- `Tool-Centric AGI Framework`: roughly `45-50%`
- `Execution Memory Kernel` subset: roughly `75-80%`

That means the upgrade priority should now be:

1. complete the `Memory v2` operating system
2. then add the missing `Action Intelligence` layers
3. not chase a full hosted/control-plane platform first

## 2. Upgrade thesis

The upgrade should follow one hard rule:

> `Memory v2 first, Action Intelligence second, broad AGI framing last.`

Why:

- the repository is already strongest in `execution memory`
- the largest remaining leverage is in `distillation`, `promotion/demotion`, `semantic forgetting`, and `rehydration`
- the largest missing framework layers are `uncertainty` and `action retrieval`
- trying to jump directly to “full Tool-Centric AGI” would dilute the part of the system that is already becoming real

So the sequence is:

1. turn the current kernel into a more complete dynamic memory operating system
2. expose explicit `action retrieval` and `uncertainty-triggered retrieve` behavior
3. then deepen multi-agent and tool-centric orchestration surfaces

## 3. Target end-state for this roadmap

This roadmap does **not** target:

- hosted control-plane completion
- full MCP/platform expansion
- full Python parity
- full model-owned reasoning stack
- a “general AI platform” rebrand

This roadmap **does** target:

### 3.1 Memory v2 operating system

- generalized `event -> step -> workflow -> pattern -> policy`
- explicit `promotion / demotion / archival / rehydration` operators
- semantic forgetting beyond simple archive/tier handling
- anchor-payload lifecycle that can compress and rehydrate by need
- broader operator-facing evolution behavior instead of scattered kernel pieces

### 3.2 Tool-Centric execution substrate

- explicit `Action Retrieval`
- explicit `Uncertainty Layer`
- clearer `Recall -> Assess -> Retrieve -> Act -> Distill` runtime loop
- agent-facing packs that expose the learned state without making users stitch low-level routes themselves

### 3.3 Product evidence

- stronger before/after proofs
- more scenario-shaped demos
- narrower but stronger public claims

## 4. Phase roadmap

## Phase 1: Complete the Memory v2 operating system

### Goal

Raise `Memory v2` from “kernel mostly exists” to “operating system mostly exists.”

### Why this phase comes first

The current gaps are not mostly in recall or SDK surface anymore. They are in lifecycle coherence:

- distillation is still narrow
- demotion is still fragmented
- semantic forgetting is still partial
- rehydration is still not differentiated enough

### Workstream 1A: Generalized distillation and abstraction

Target:

- make `L1 -> L2 -> L3 -> L4` promotion more systematic
- stop relying on only a few strong paths such as replay and tools feedback

Primary files:

- [src/memory/write-distillation.ts](../src/memory/write-distillation.ts)
- [src/memory/workflow-write-projection.ts](../src/memory/workflow-write-projection.ts)
- [src/memory/replay-learning.ts](../src/memory/replay-learning.ts)
- [src/memory/tools-pattern-anchor.ts](../src/memory/tools-pattern-anchor.ts)
- [src/memory/policy-memory.ts](../src/memory/policy-memory.ts)
- [src/memory/schemas.ts](../src/memory/schemas.ts)

Likely new files:

- `src/memory/evolution-operators.ts`
- `scripts/ci/lite-evolution-operators.test.ts`

Required outcome:

- a shared promotion operator model instead of route-specific promotion logic

### Workstream 1B: Promotion, demotion, archive, and semantic forgetting

Target:

- make lifecycle movement explicit and testable
- move beyond “archive exists” into “archive is one step in a governed lifecycle”

Primary files:

- [src/memory/lifecycle-lite.ts](../src/memory/lifecycle-lite.ts)
- [src/memory/layer-policy.ts](../src/memory/layer-policy.ts)
- [src/memory/importance-dynamics.ts](../src/memory/importance-dynamics.ts)
- [src/memory/node-feedback-state.ts](../src/memory/node-feedback-state.ts)
- [src/memory/policy-memory.ts](../src/memory/policy-memory.ts)

Likely new files:

- `src/memory/semantic-forgetting.ts`
- `src/memory/archive-relocation.ts`
- `scripts/ci/lite-semantic-forgetting.test.ts`
- `scripts/ci/lite-archive-relocation.test.ts`

Required outcome:

- demotion and forgetting become first-class lifecycle operations, not scattered heuristics

### Workstream 1C: Differential rehydration

Target:

- make rehydration mode explicit:
  - summary
  - partial
  - full
  - differential

Primary files:

- [src/memory/rehydrate-anchor.ts](../src/memory/rehydrate-anchor.ts)
- [src/memory/rehydrate.ts](../src/memory/rehydrate.ts)
- [src/memory/recall.ts](../src/memory/recall.ts)
- [src/memory/context-orchestrator.ts](../src/memory/context-orchestrator.ts)
- [src/memory/schemas.ts](../src/memory/schemas.ts)

Likely new files:

- `src/memory/differential-rehydration.ts`
- `scripts/ci/lite-differential-rehydration.test.ts`

Required outcome:

- the runtime can explain why a payload was only partially rehydrated and what incremental recovery it performed

### Phase 1 acceptance gate

Phase 1 is complete when:

- promotion/demotion is shared instead of route-local
- semantic forgetting has real tests and real operators
- rehydration has explicit modes, including differential behavior
- `Memory v2` completion can honestly be described as `80-85%`

## Phase 2: Add explicit Action Retrieval

### Goal

Turn the current “recall + experience intelligence + kickoff” blend into a clearer execution-facing retrieval layer.

### Why this phase comes second

The current system already retrieves useful things, but not yet as an explicit subsystem.

That matters because the framework target is not only:

- recall what happened

but:

- retrieve how to act now

### Workstream 2A: Build an explicit action-retrieval module

Primary files:

- [src/memory/experience-intelligence.ts](../src/memory/experience-intelligence.ts)
- [src/memory/execution-introspection.ts](../src/memory/execution-introspection.ts)
- [src/memory/context-orchestrator.ts](../src/memory/context-orchestrator.ts)
- [src/memory/recall.ts](../src/memory/recall.ts)
- [src/memory/agent-memory-inspect-core.ts](../src/memory/agent-memory-inspect-core.ts)

Likely new files:

- `src/memory/action-retrieval.ts`
- `scripts/ci/lite-action-retrieval.test.ts`

Required outcome:

- the runtime exposes why a file/tool/next-action recommendation was retrieved
- the system has a recognizable `Action Retrieval` layer rather than only blended planner hints

### Workstream 2B: Promote action retrieval into public surfaces

Primary files:

- [src/routes/memory-access.ts](../src/routes/memory-access.ts)
- [packages/full-sdk/src/contracts.ts](../packages/full-sdk/src/contracts.ts)
- [packages/full-sdk/src/client.ts](../packages/full-sdk/src/client.ts)
- [apps/docs/docs/reference/memory.md](../apps/docs/docs/reference/memory.md)
- [apps/docs/docs/reference/policy-memory.md](../apps/docs/docs/reference/policy-memory.md)

Likely surfaces:

- additive inspect fields
- possible `task-pack` and `cycle-pack` only if the retrieval contract becomes stable enough

### Phase 2 acceptance gate

Phase 2 is complete when:

- `action retrieval` exists as an explicit runtime story
- users no longer need to infer retrieval behavior from blended planner output
- task/file/tool suggestions can be tied back to concrete memory sources and policies

## Phase 3: Add the Uncertainty Layer

### Goal

Fill the largest missing module in the `Tool-Centric AGI Framework`: uncertainty estimation and retrieve gating.

### Why this phase is third

Uncertainty should sit on top of a stronger memory OS and action-retrieval layer. Otherwise it becomes a vague score without operational consequence.

### Workstream 3A: Uncertainty estimation

Primary files:

- [src/memory/experience-intelligence.ts](../src/memory/experience-intelligence.ts)
- [src/memory/tools-select.ts](../src/memory/tools-select.ts)
- [src/memory/context-orchestrator.ts](../src/memory/context-orchestrator.ts)
- [src/memory/execution-introspection.ts](../src/memory/execution-introspection.ts)

Likely new files:

- `src/memory/uncertainty-estimation.ts`
- `scripts/ci/lite-uncertainty-estimation.test.ts`

Required outcome:

- the system can estimate whether:
  - it knows how to proceed
  - it should retrieve more
  - it should slow down or request review

### Workstream 3B: Retrieve gating and execution gating

Primary files:

- [src/memory/context.ts](../src/memory/context.ts)
- [src/memory/context-orchestrator.ts](../src/memory/context-orchestrator.ts)
- [src/memory/runtime-tool-hints.ts](../src/memory/runtime-tool-hints.ts)
- [src/memory/reviewer-packs.ts](../src/memory/reviewer-packs.ts)
- [src/memory/schemas.ts](../src/memory/schemas.ts)

Likely new behavior:

- low uncertainty: act directly
- medium uncertainty: recall + retrieve more
- high uncertainty: trigger review / governance / approval

### Phase 3 acceptance gate

Phase 3 is complete when:

- the system has an explicit `Assess` stage
- retrieval is triggered by runtime logic rather than only caller choice
- uncertainty has product consequences, not just diagnostics

## Phase 4: Expand agent-system product surfaces

### Goal

Make the evolved kernel easier to use as an agent substrate without pulling the repo back into a full hosted monolith.

### Workstream 4A: Richer agent packs

Primary files:

- [src/memory/agent-memory-inspect-core.ts](../src/memory/agent-memory-inspect-core.ts)
- [src/routes/memory-access.ts](../src/routes/memory-access.ts)
- [packages/full-sdk/src/contracts.ts](../packages/full-sdk/src/contracts.ts)
- [packages/full-sdk/src/client.ts](../packages/full-sdk/src/client.ts)

Candidate additions:

- `task-pack`
- `cycle-pack`
- richer resume contracts
- stronger multi-agent handoff packs

### Workstream 4B: Python and non-TS parity only after route stability

Primary files:

- [packages/python-sdk/src/aionis_sdk/client.py](../packages/python-sdk/src/aionis_sdk/client.py)
- [packages/python-sdk/tests/test_agent_memory.py](../packages/python-sdk/tests/test_agent_memory.py)
- [packages/sdk/src/cli.ts](../packages/sdk/src/cli.ts)

Required rule:

- do not chase broad package parity before TS route shapes stop moving

### Phase 4 acceptance gate

Phase 4 is complete when:

- agent packs reduce caller-side stitching materially
- Python stays narrow but useful
- multi-agent continuity is materially easier to demonstrate

## 5. Cross-phase product and evidence work

Every phase above needs matching evidence work. Do not let the code move alone.

Required evidence updates:

- expand [apps/docs/docs/evidence/proof-by-evidence.md](../apps/docs/docs/evidence/proof-by-evidence.md)
- expand [apps/docs/docs/evidence/self-evolving-demos.md](../apps/docs/docs/evidence/self-evolving-demos.md)
- add one new hard proof per phase
- keep public claims narrower than internal ambition

Evidence priority:

1. prove the second run starts better
2. prove execution becomes policy
3. prove policy can be governed
4. later prove:
   - semantic forgetting
   - differential rehydration
   - uncertainty-triggered retrieve

## 6. What not to do during this roadmap

Do not:

- rebuild the repo into the full desktop Pro shape
- drag in hosted ops/control-plane layers
- market Aionis as a complete Tool-Centric AGI framework before the missing layers exist
- expand public SDK breadth faster than route stability
- widen Python faster than the TS runtime

## 7. How to judge progress

The correct progress measure is not “how many APIs were added.”

Use these checkpoints instead:

| Checkpoint | Success condition |
| --- | --- |
| Memory OS | Promotion/demotion/forgetting/rehydration are coherent |
| Action Retrieval | The runtime can explain why it retrieved this action path |
| Uncertainty | The runtime can explain why it should retrieve, act, or review |
| Agent substrate | The caller does less stitching for the same continuity result |
| Evidence | Every major claim has a runnable proof |

## 8. Sequencing summary

The recommended next order is:

1. complete `Memory v2` lifecycle coherence
2. add explicit `Action Retrieval`
3. add explicit `Uncertainty Layer`
4. then deepen agent packs and package parity

That is the shortest path from:

- `self-evolving continuity kernel`

to:

- `dynamic memory operating system`

without diluting the strongest part of the repository.

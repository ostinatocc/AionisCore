---
title: Self-Evolving Demos
slug: /evidence/self-evolving-demos
---

# Self-evolving demos

This page is the runnable companion to the higher-level [Proof by Evidence](./proof-by-evidence.md) page.

The goal is not to show every route. The goal is to show five concrete loops:

1. the second task start gets better
2. positive execution feedback becomes persisted policy memory
3. that policy memory can be governed instead of silently drifting forever
4. continuity provenance survives workflow promotion instead of being erased
5. session continuity alone can promote stable workflow guidance

<div class="doc-lead">
  <span class="doc-kicker">Proof path</span>
  <p>If these five demos work, Aionis is doing more than storing transcripts. It is improving startup, materializing execution policy, governing what it learns, and turning continuity carriers into stable workflow memory with preserved provenance.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">Task start</span>
    <span class="doc-chip">Policy memory</span>
    <span class="doc-chip">Governance</span>
    <span class="doc-chip">Continuity provenance</span>
    <span class="doc-chip">Public SDK</span>
  </div>
</div>

## Before you run them

From the repository root:

```bash
npm install
npm run sdk:build
npm run lite:start
```

All five demos use the public SDK against the Lite runtime at:

`http://127.0.0.1:3001`

## Demo 1: Better second task start

Run:

```bash
npm run example:sdk:task-start-proof
```

What it proves:

1. a cold repeated task can start with weak or incomplete guidance
2. after successful execution packets are written back, the next `taskStart(...)` can produce a more grounded first move
3. Aionis is not only storing history; it is improving the next startup decision

What to inspect in the output:

- `cold first_action`
- `warm first_action`
- `warm source_kind`
- `learned_file_path`
- `learned_next_action`

The strongest signal is that the second run produces a file-aware, task-aware first action that the first run did not already have.

There is now a second thing to inspect:

- `planningContext(...).planner_packet.sections.candidate_workflows`
- `executionIntrospect(...).demo_surface.sections.workflows`

For continuity-driven startup, those surfaces now carry explicit provenance such as:

- `distillation=handoff_continuity_carrier`
- `distillation=session_event_continuity_carrier`

## Demo 2: Policy memory materializes from positive feedback

Run:

```bash
npm run example:sdk:policy-memory
```

What it proves:

1. repeated positive `tools.feedback(...)` does not stop at pattern hints
2. stable learning can materialize into persisted `policy memory`
3. the same state can be read back through `reviewPacks.evolution(...)` and `memory.agent.inspect(...)`

What to inspect in the output:

- `third positive feedback.policy_memory`
- `policy_contract`
- `policy_review`
- `selected_policy_memory_state`
- `derived_policy_source_kind`

The strongest signal is `materialization_state: "persisted"` together with an inspectable policy contract.

## Demo 3: Governance can retire and reactivate policy memory

Run:

```bash
npm run example:sdk:policy-governance
```

What it proves:

1. policy memory is not write-once and forgotten
2. the public governance route can move persisted policy state through `retire`
3. fresh live evidence can `reactivate` the same policy memory cleanly

What to inspect in the output:

- `retired previous_state`
- `retired next_state`
- `reactivated previous_state`
- `reactivated next_state`
- `live_policy_selected_tool`
- `selected_policy_memory_state`

The strongest signal is a real `retire -> reactivate` loop with a live policy contract still visible afterward.

## Demo 4: Continuity provenance survives promotion

This proof depends on stable workflow promotion. Restart Lite with the workflow static provider enabled:

```bash
WORKFLOW_GOVERNANCE_STATIC_PROMOTE_MEMORY_PROVIDER_ENABLED=true npm run lite:start
```

Run:

```bash
npm run example:sdk:continuity-provenance
```

What it proves:

1. `handoff` and `session_event` are treated as first-class continuity carriers
2. the first carrier creates a projected candidate workflow with explicit provenance
3. the second carrier promotes the workflow to stable without erasing `distillation_origin`
4. the same provenance stays visible through `planningContext(...)` and `executionIntrospect(...)`

What to inspect in the output:

- `handoff_candidate_line`
- `handoff_stable_line`
- `handoff_demo_line`
- `session_candidate_line`
- `session_stable_line`
- `session_demo_line`
- `handoff_count`
- `session_event_count`

The strongest signals are stable workflow lines that still contain:

- `distillation=handoff_continuity_carrier`
- `distillation=session_event_continuity_carrier`

Why this matters:

- continuity carriers are now first-class learning inputs
- projected workflows retain the source of that learning
- stable workflows no longer have to hide the execution provenance that created them

## Demo 5: Session continuity carriers promote stable workflows

This proof depends on stable workflow promotion. Restart Lite with the workflow static provider enabled:

```bash
WORKFLOW_GOVERNANCE_STATIC_PROMOTE_MEMORY_PROVIDER_ENABLED=true npm run lite:start
```

Run:

```bash
npm run example:sdk:session-continuity
```

What it proves:

1. `memory.sessions.create(...)` can act as a first-class continuity carrier, not only as metadata around session events
2. the first session continuity write creates a projected candidate workflow with `distillation=session_continuity_carrier`
3. the second session continuity write promotes stable workflow guidance even though the underlying session topic is updated in place
4. the promoted workflow still exposes `session_continuity_carrier` provenance through planning and introspection surfaces

What to inspect in the output:

- `candidate_workflow_line`
- `stable_workflow_line`
- `planning_observed_count`
- `introspection_workflow_line`
- `origin_count`
- `observed_count`
- `session_count`

The strongest signals are:

- the first planning packet contains `distillation=session_continuity_carrier`
- the second planning packet moves that same workflow family into `recommended_workflows`
- `planning_observed_count = 2` and `observed_count = 2` appear on the promoted workflow

Why this matters:

- continuity can be promoted from session state itself, not only from emitted events
- repeated session snapshots now count as distinct workflow observations
- Aionis can preserve continuity provenance even when the carrier is an updated topic node instead of an append-only event stream

## Why these five matter together

Each demo proves a different layer of the self-evolving claim:

| Demo | What it proves |
| --- | --- |
| Better second task start | Aionis improves startup behavior from prior execution |
| Policy memory materialization | Aionis can turn stable execution feedback into persistent execution policy |
| Governance loop | Aionis exposes reviewable, reversible policy evolution instead of silent drift |
| Continuity provenance survives promotion | Aionis preserves where learned workflow guidance came from even after promotion |
| Session continuity promotes stable workflows | Aionis can lift repeated session state into stable workflow guidance without needing an event-only path |

Taken together, they show that the runtime is not just:

- a memory store
- a transcript archive
- a long-task shell

It is a continuity kernel that can accumulate, materialize, and govern execution memory over time.

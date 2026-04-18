---
title: Self-Evolving Demos
slug: /evidence/self-evolving-demos
---

# Self-evolving demos

This page is the runnable companion to the higher-level [Proof by Evidence](./proof-by-evidence.md) page.

The goal is not to show every route. The goal is to show three concrete loops:

1. the second task start gets better
2. positive execution feedback becomes persisted policy memory
3. that policy memory can be governed instead of silently drifting forever

<div class="doc-lead">
  <span class="doc-kicker">Proof path</span>
  <p>If these three demos work, Aionis is doing more than storing transcripts. It is improving startup, materializing execution policy, and exposing a real governance loop.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">Task start</span>
    <span class="doc-chip">Policy memory</span>
    <span class="doc-chip">Governance</span>
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

All three demos use the public SDK against the Lite runtime at:

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

## Why these three matter together

Each demo proves a different layer of the self-evolving claim:

| Demo | What it proves |
| --- | --- |
| Better second task start | Aionis improves startup behavior from prior execution |
| Policy memory materialization | Aionis can turn stable execution feedback into persistent execution policy |
| Governance loop | Aionis exposes reviewable, reversible policy evolution instead of silent drift |

Taken together, they show that the runtime is not just:

- a memory store
- a transcript archive
- a long-task shell

It is a continuity kernel that can accumulate, materialize, and govern execution memory over time.

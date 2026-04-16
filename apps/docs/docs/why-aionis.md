---
title: Why Aionis
slug: /why-aionis
---

# Why Aionis

`Aionis Runtime` is useful when an agent system has to carry execution across runs instead of behaving like every task is a fresh prompt.

That is the problem space the runtime is built for.

<div class="doc-lead">
  <span class="doc-kicker">Why it matters</span>
  <p>The strongest argument for Aionis is not "it stores memory." The argument is that continuity becomes a runtime primitive with explicit APIs, typed contracts, and a real local runtime boundary.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">Not transcript glue</span>
    <span class="doc-chip">Explicit contracts</span>
    <span class="doc-chip">Replay-driven reuse</span>
    <span class="doc-chip">Honest Lite boundary</span>
  </div>
</div>

## The main technical advantages

### 1. Continuity is a runtime primitive

Most agent systems treat continuity as prompt glue, saved transcripts, or host-specific state. Aionis moves that into explicit runtime surfaces:

- `task start` for repeated-task kickoff
- `handoff` for pause and resume
- `replay` for successful-run reuse

That is a stronger foundation than hoping the next prompt reconstructs the right state.

### 2. Contracts are explicit

The public SDK and route surfaces are typed and inspectable.

That matters when you are integrating agent behavior into a real product and need something more stable than internal prompt conventions.

### 3. Lite is a real runtime, not a placeholder

The public runtime story is not a conceptual API sketch. Lite runs locally today with:

- SQLite-backed persistence
- route registration
- replay support
- local automation support
- local sandbox execution

That makes the project evaluable as software, not only as architecture.

### 4. Successful work can become reusable work

The replay subsystem is important because it pushes Aionis beyond generic storage.

The runtime is trying to turn successful execution into reusable operating knowledge through replay lifecycle, playbook promotion, and local playbook execution.

### 5. The runtime boundary is deliberate

Lite does not pretend to expose every server-only or control-plane surface.

Unsupported route groups are omitted or returned as structured `501` responses. That is a strength, because it keeps the local runtime honest about what it does and does not ship.

## What this means in practice

If you are building coding-agent infrastructure, the runtime gives you a clearer substrate for:

- repeated bug-repair or review flows
- trustworthy pause and resume
- reusable playbook creation
- host integration through stable SDK calls
- local evaluation before a larger hosted design exists

## Where to look next

1. [Architecture Overview](./architecture/overview.md)
2. [Getting Started](./getting-started.md)
3. [Lite Runtime](./runtime/lite-runtime.md)
4. [Contracts and Routes](./reference/contracts-and-routes.md)

<div class="doc-grid">
  <a class="doc-card" href="./concepts/task-start.md">
    <span class="doc-kicker">Value surface</span>
    <h3>Task Start</h3>
    <p>See how prior execution becomes a better first move for repeated work.</p>
  </a>
  <a class="doc-card" href="./concepts/handoff.md">
    <span class="doc-kicker">Value surface</span>
    <h3>Handoff</h3>
    <p>See how pause and resume move from prose summaries into runtime-readable state.</p>
  </a>
  <a class="doc-card" href="./concepts/replay.md">
    <span class="doc-kicker">Value surface</span>
    <h3>Replay</h3>
    <p>See how successful execution becomes reusable playbooks instead of disappearing after one run.</p>
  </a>
</div>

---
title: What Aionis Runtime Is
slug: /intro
---

# What Aionis Runtime is

`Aionis Runtime` is a self-evolving continuity runtime for agent systems.

<div class="doc-lead">
  <span class="doc-kicker">Short version</span>
  <p>Aionis Runtime is the public runtime layer in this repository. It exists to make repeated work start better, paused work resume cleanly, and successful work become reusable operating knowledge.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">Task start</span>
    <span class="doc-chip">Structured handoff</span>
    <span class="doc-chip">Replay and playbooks</span>
    <span class="doc-chip">Lite runtime today</span>
  </div>
</div>

`Aionis Runtime` is the public runtime in this repository.  
`Aionis Core` is the kernel beneath it.  
`Lite` is the runtime shape that ships publicly today.

The purpose of the runtime is straightforward:

1. help repeated work start with better execution context
2. help paused work resume from structured runtime state
3. help successful work become reusable operating knowledge

## The failure it targets

The problem is not generic “AI memory”.

The concrete failure is agent continuity:

1. a familiar task comes in and the agent still starts from zero
2. a paused task is resumed and the agent has no trustworthy execution state
3. a successful repair finishes and the knowledge disappears instead of becoming reusable

That failure is especially visible in coding workflows, but it is not limited to coding. Any agent workflow that depends on reliable startup guidance, pause/resume, or replay reuse will hit the same continuity problem.

## What Aionis Runtime does

The runtime exposes three core surfaces:

1. **Task start**
   Turn prior execution into a better first action for the next similar task.
2. **Task handoff**
   Store execution-ready handoff packets with target files, next action, and recovery context.
3. **Task replay**
   Record successful runs, compile reusable playbooks, and promote them into stable workflow guidance.

Around those surfaces, Lite also exposes local automation, sandbox, and review-oriented runtime paths.

## What "self-evolving" means here

The runtime is not claiming magical self-improvement in the abstract.

In Aionis, self-evolving means that later execution can be informed by earlier execution through explicit runtime structures:

1. previous execution evidence can influence the next task start
2. a paused task can be resumed from structured handoff state
3. successful runs can be replayed, compiled, and promoted into reusable playbooks
4. memory lifecycle routes can rehydrate useful nodes and record activation feedback

The system improves because continuity is persisted and reused, not because the product merely promises "AI memory".

## Single-agent and multi-agent use

The current public runtime is especially well suited to:

- coding agents
- ops and automation agents
- task-oriented hosts that need pause/resume
- multi-agent systems that need trustworthy handoff between workers

The common requirement is not domain. The common requirement is continuity.

## What the runtime is not

Aionis Runtime is not:

- a hosted control plane
- a generic chat memory plugin
- a vague orchestration wrapper with continuity hidden in prompts
- a replacement for the model, agent UI, or workflow host you already use

Instead, it sits underneath those systems as continuity infrastructure.

## Why the runtime shape matters

The key design choice is that continuity is exposed as runtime infrastructure:

- typed SDK contracts instead of hidden prompt state
- replay, handoff, and kickoff as explicit APIs
- local persistence instead of fragile session text
- automation and sandbox capability around those same flows

This makes the runtime easier to inspect, integrate, validate, and extend.

## How the execution loop works

```mermaid
flowchart TD
    A["Task arrives"] --> B["Task start / planning context"]
    B --> C["Agent executes through runtime tools and stores"]
    C --> D["Pause or handoff state captured"]
    C --> E["Run recorded for replay / playbook promotion"]
    D --> F["Resume with structured recovery context"]
    E --> G["Next similar task starts with better first action"]
```

This is the loop Aionis is trying to own. The runtime is not only storing data; it is trying to improve later execution quality.

## What ships today

- a Lite local runtime with SQLite-backed persistence
- a public SDK through `@ostinato/aionis`
- replay, handoff, automation, sandbox, and review-pack surfaces
- validation evidence through smoke tests, contract tests, and benchmark reports

## How to think about the public product

Use this mental model:

| Layer | What it means |
| --- | --- |
| `Aionis Core` | The underlying kernel concepts and runtime substrate |
| `Aionis Runtime` | The public runtime shape you integrate against |
| `Lite` | The local distribution that ships publicly today |

If you are evaluating or integrating Aionis, you mainly care about `Aionis Runtime` and `Lite`.

## Recommended reading order

1. [Why Aionis](./why-aionis.md)
2. [Architecture Overview](./architecture/overview.md)
3. [Getting Started](./getting-started.md)
4. [SDK Quickstart](./sdk/quickstart.md)
5. [Task Start](./concepts/task-start.md)
6. [Handoff](./concepts/handoff.md)
7. [Replay](./concepts/replay.md)
8. [Lite Runtime](./runtime/lite-runtime.md)
9. [Contracts and Routes](./reference/contracts-and-routes.md)

<div class="doc-grid">
  <a class="doc-card" href="./getting-started.md">
    <span class="doc-kicker">Start using it</span>
    <h3>Getting Started</h3>
    <p>Boot Lite locally, point the SDK at it, and confirm the runtime is alive.</p>
  </a>
  <a class="doc-card" href="./sdk/quickstart.md">
    <span class="doc-kicker">Integrate it</span>
    <h3>SDK Quickstart</h3>
    <p>Write memory, ask for task start, store handoff, and move into replay through the public client.</p>
  </a>
  <a class="doc-card" href="./architecture/overview.md">
    <span class="doc-kicker">Understand it</span>
    <h3>Architecture Overview</h3>
    <p>Read the runtime shell, bootstrap, host, kernel, and store seams that make Lite explicit.</p>
  </a>
</div>

## After this page

If you want to keep going in the shortest useful order:

1. read [Why Aionis](./why-aionis.md) for the differentiators
2. read [Architecture Overview](./architecture/overview.md) for the runtime shape
3. read [Getting Started](./getting-started.md) or [SDK Quickstart](./sdk/quickstart.md) to evaluate the public path

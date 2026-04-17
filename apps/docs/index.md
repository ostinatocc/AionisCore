---
layout: home
title: Aionis Runtime Docs
titleTemplate: false

hero:
  name: Aionis Runtime
  text: Self-evolving continuity for agent systems
  tagline: Turn task starts, handoffs, and replays into execution memory so repeated work starts better, paused work resumes cleanly, and successful execution becomes reusable operating knowledge.
  image:
    src: /logo-mark.svg
    alt: Aionis Runtime
  actions:
    - theme: brand
      text: Run the quickstart
      link: /docs/getting-started
    - theme: alt
      text: Read the introduction
      link: /docs/intro

features:
  - icon: 🧭
    title: Learned task start
    details: Use prior execution evidence to return a better first action for the next similar coding task.
  - icon: ⏯️
    title: Structured handoff
    details: Store target files, next action, and recovery context as a runtime handoff instead of relying on chat history.
  - icon: ♻️
    title: Replay and playbooks
    details: Record successful runs, promote stable playbooks, and reuse them through the local automation kernel.
  - icon: 🧱
    title: Explicit runtime contracts
    details: Integrate against typed SDK surfaces and stable routes for kickoff, recall, replay, automation, sandbox, and review flows.
  - icon: 💾
    title: Lite runtime available today
    details: Run a real local runtime with SQLite-backed persistence, memory lifecycle routes, route registration, sandbox execution, and automation support.
  - icon: 🔬
    title: Architecture with clear seams
    details: The repository separates runtime shell, assembly, host layer, kernel subsystems, SDK, and storage instead of hiding behavior in prompt glue.
---

<div class="home-proof-grid">
  <div class="home-proof-card">
    <span class="home-proof-label">Public shape</span>
    <span class="home-proof-value">Lite ships now</span>
    <p>SQLite-backed local runtime, typed SDK, replay, handoff, sandbox, and automation are already part of the public path.</p>
  </div>
  <div class="home-proof-card">
    <span class="home-proof-label">Core loop</span>
    <span class="home-proof-value">Task start + handoff + replay</span>
    <p>The docs and runtime both revolve around the same three continuity surfaces instead of a vague memory story.</p>
  </div>
  <div class="home-proof-card">
    <span class="home-proof-label">Evidence</span>
    <span class="home-proof-value">15/15 benchmark scenarios</span>
    <p>The project already has benchmark reporting, smoke validation, and contract tests behind the docs narrative.</p>
  </div>
  <div class="home-proof-card">
    <span class="home-proof-label">Developer path</span>
    <span class="home-proof-value">SDK-first</span>
    <p>You can start from local runtime health, move into the SDK, then drop into route and architecture references only when needed.</p>
  </div>
</div>

## What this site covers

This docs site is for understanding and using the public Aionis runtime shape.

It should answer four questions quickly:

- what Aionis Runtime is
- why it is useful
- how the runtime is structured
- how to start using it

## What Aionis Runtime is

`Aionis Runtime` is the public runtime in this repository.  
`Aionis Core` is the kernel that powers it.  
`Lite` is the current local runtime distribution of that kernel.

The practical mental model is:

`Aionis Runtime = a self-evolving continuity runtime for agent systems`

It provides explicit runtime surfaces for:

- learned task start for repeated work
- structured handoff and resume
- replay and playbook promotion
- local automation and sandbox execution
- typed SDK and stable route contracts

Today, the runtime is strongest for coding and ops workflows, but the continuity model is broader than coding alone. If an agent or multi-agent workflow needs reliable task start, trustworthy handoff, and reusable replay, Aionis is in scope.

## Why teams use it

Most agent systems break on continuity before they break on raw reasoning quality.

Typical failure modes are:

1. repeated tasks still start from zero
2. paused work resumes without trustworthy execution state
3. successful repairs do not become reusable operating knowledge

Aionis addresses those problems by turning continuity into runtime infrastructure instead of leaving it inside prompts and chat transcripts.

## What makes it different

Many agent products can already run long tasks. That is not the point of Aionis.

Aionis is about what happens across runs:

1. a task should start from prior execution, not from zero
2. a pause should recover structured runtime state, not a vague summary
3. a successful run should become reusable execution memory, not disappear into logs

That is why the public runtime is organized around `task start`, `handoff`, and `replay` instead of generic "AI memory".

## How continuity improves over time

```mermaid
flowchart LR
    A["New task arrives"] --> B["Task start uses prior execution"]
    B --> C["Agent works through Lite runtime"]
    C --> D["Pause or handoff stores structured state"]
    C --> E["Successful run recorded as replay"]
    D --> F["Next agent resumes from runtime state"]
    E --> G["Replay promoted into reusable guidance"]
    F --> H["Next similar task starts better"]
    G --> H
```

This is the core product loop:

- execution produces evidence
- evidence becomes execution memory
- execution memory improves the next task start, handoff, and replay path

## Choose your path

<div class="home-path-grid">
  <a class="home-path-card" href="/docs/getting-started">
    <span class="home-path-kicker">Evaluate</span>
    <h3 class="home-path-title">Run Lite locally</h3>
    <p>Boot the runtime, hit the health route, and see the public local runtime shape in a few minutes.</p>
  </a>
  <a class="home-path-card" href="/docs/sdk/quickstart">
    <span class="home-path-kicker">Integrate</span>
    <h3 class="home-path-title">Use the SDK</h3>
    <p>Write memory, ask for planning context, store handoff, and move into replay with the public TypeScript client.</p>
  </a>
  <a class="home-path-card" href="/docs/architecture/overview">
    <span class="home-path-kicker">Understand</span>
    <h3 class="home-path-title">Read the runtime shape</h3>
    <p>See how Lite splits runtime shell, bootstrap, host, stores, and kernel subsystems instead of hiding continuity inside prompts.</p>
  </a>
</div>

## Architecture at a glance

The public runtime shape is organized around clear layers:

1. `apps/lite/` for the local runtime shell and launcher
2. `src/runtime-entry.ts` for bootstrap and route startup
3. `src/app/runtime-services.ts` for Lite-only assembly
4. `src/host/*` for the HTTP host and route registration
5. `src/memory/*` for replay, handoff, recall, write, and sandbox logic
6. `src/store/*` for SQLite-backed local persistence
7. `packages/full-sdk/` for the public SDK surface

See [Architecture Overview](/docs/architecture/overview) for the full runtime breakdown.

## What ships in Lite today

- SQLite-backed local persistence
- archive rehydrate and node activation lifecycle routes
- memory write, recall, and context runtime
- task handoff store and recover
- replay core and governed replay subset
- local automation kernel
- local sandbox executor
- typed SDK integration through `@ostinato/aionis`

## What this means in practice

If you run Lite locally today, you already get a real runtime shape:

- an HTTP host with explicit supported routes
- multiple SQLite stores instead of one opaque blob
- lifecycle-aware memory operations such as rehydrate and activate
- a public SDK that can call task start, handoff, replay, automation, and sandbox flows

That matters because the runtime is inspectable. You can see which surfaces exist, test them directly, and integrate them into your own host or workflow system.

## Who should read what

Use this docs site based on the question you are trying to answer:

| If you want to know... | Start here |
| --- | --- |
| What Aionis is and why it exists | [Introduction](/docs/intro) |
| Why continuity is the core differentiator | [Why Aionis](/docs/why-aionis) |
| How the runtime is assembled | [Architecture Overview](/docs/architecture/overview) |
| How to boot Lite and call it | [Getting Started](/docs/getting-started) |
| How to integrate from TypeScript | [SDK Quickstart](/docs/sdk/quickstart) |
| What fields and route families exist | [Contracts and Routes](/docs/reference/contracts-and-routes) |

## Start here

1. [Introduction](/docs/intro)
2. [Why Aionis](/docs/why-aionis)
3. [Architecture Overview](/docs/architecture/overview)
4. [Getting Started](/docs/getting-started)
5. [SDK Quickstart](/docs/sdk/quickstart)
6. [FAQ and Troubleshooting](/docs/faq-and-troubleshooting)

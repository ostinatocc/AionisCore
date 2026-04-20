# Aionis Runtime

`Aionis Runtime` is a self-evolving continuity runtime for agent systems.

`Aionis Core` is the kernel inside this repository.  
`Lite` is the public runtime shape that ships today.

`Lite` is local-first and intended for local, dev, and CI validation of continuity loops. It is not yet a hardened production network runtime.

## Current Stable Baseline

Treat the current repository head as the stage-stable baseline for the local-first technical beta.

- runtime posture is hardened for Lite
- six self-evolving proofs are live through the public SDK and docs
- SDK contract and route convergence has started
- the first major god-file refactor tranche is already landed
- current baseline verification is `sdk:test` passing and `lite:test` at `194/194`

Baseline summary:

1. [AIONIS_RUNTIME_STAGE_BASELINE_2026_04_20.md](docs/AIONIS_RUNTIME_STAGE_BASELINE_2026_04_20.md)
2. [Proof By Evidence](apps/docs/docs/evidence/proof-by-evidence.md)

It gives agents continuity across sessions in three concrete ways:

1. **Start better**
   Turn prior execution into a stronger first action for the next similar task.
2. **Resume cleanly**
   Store structured handoff packets with target files, next action, and recovery context.
3. **Reuse successful work**
   Record replay runs, promote stable playbooks, and run local automations against them.

Most agents can reason inside one session. They break when work spans retries, handoffs, repeated tasks, and multi-step repairs. `Aionis Runtime` is built for that continuity layer: execution memory, learned kickoff, replay, handoff, and explicit runtime contracts.

## Who It's For

- teams building coding agents, ops agents, CLI agents, or local agent runtimes
- developers validating continuity loops before building a hosted product
- infrastructure teams that want typed SDK and route contracts instead of opaque agent state

## Why It Stands Out

- continuity is the product, not a side effect of chat history
- Lite ships as a real local runtime with SQLite persistence, replay, sandbox, and automation support
- the public SDK and route contracts are explicit and typed
- product boundaries are deliberate: Lite is a local execution kernel, not an unfinished control plane

<!-- BEGIN:CORE_PATH -->

## Default Product Path

| Path | What To Prove | Primary Surfaces |
| --- | --- | --- |
| Core | Continuity works at all | `memory.write(...)`, `memory.taskStart(...)` or `memory.planningContext(...)`, `handoff.store(...)`, `memory.replay.run.*` |
| Enhanced | Continuity improves over time | `memory.archive.rehydrate(...)`, `memory.nodes.activate(...)`, `memory.reviewPacks.*`, `memory.sessions.*` |
| Advanced | The runtime exposes deeper learning and control | `memory.experienceIntelligence(...)`, `memory.executionIntrospect(...)`, `memory.delegationRecords.*`, `memory.tools.*`, `memory.rules.*`, `memory.patterns.*` |

Recommended order:

1. prove the Core path first
2. add the Enhanced path when reuse quality matters
3. move into the Advanced path only when your host needs deeper substrate controls

Fastest repository proof:

```bash
npm run example:sdk:core-path
```

<!-- END:CORE_PATH -->

## Core Surfaces

1. **Task Start**
   Learned kickoff guidance from prior execution, workflow anchors, and tool feedback.
2. **Task Handoff**
   Structured pause/resume packets that carry next action, target files, and execution state forward.
3. **Task Replay**
   Replay lifecycle, playbook promotion, governed repair review, and local playbook execution.

## Quick Start

Start the local runtime:

```bash
npm install
npm run lite:start
```

Install the public SDK in your own project:

```bash
npm install @ostinato/aionis
```

Or prove the core path locally in one command from this repository:

```bash
npm run example:sdk:core-path
```

To see what the runtime is doing through a UI, build and open the Inspector:

```bash
npm run inspector:build      # once after each pull
npm run lite:start           # then open http://127.0.0.1:3001/inspector
```

The Inspector is a local, read-only observation surface bundled with Lite. It
ships disabled-by-missing-bundle, so Lite continues to run normally if you
never build it. Set `LITE_INSPECTOR_ENABLED=false` to opt out explicitly.

First time using Inspector? The Live tab has a `Load seed pack` button that
imports a sample scope in one click, so every tab has something to look at
without running the core-path example first.

Want to show the runtime to somebody who has not installed anything? The
Playground is a public, read-only demo page that hits a hosted Aionis Lite
and shows the structured kickoff output. Run it locally against your own
Lite first:

```bash
npm run lite:start          # one terminal
npm run playground:seed     # seed default/playground:demo once
npm run playground:dev      # → http://127.0.0.1:5190
```

See [`apps/playground/README.md`](apps/playground/README.md) for Vercel
deployment instructions.

Then call the learned kickoff surface:

```ts
import { createAionisClient } from "@ostinato/aionis";

const aionis = createAionisClient({
  baseUrl: "http://127.0.0.1:3001",
});

const taskStart = await aionis.memory.taskStart({
  tenant_id: "default",
  scope: "default",
  query_text: "repair the export route serialization bug",
  context: {
    goal: "repair the export route serialization bug",
  },
  candidates: ["read", "edit", "test"],
});

console.log(taskStart.first_action);
```

## Lite Memory Lifecycle

The Lite runtime now supports the public SDK lifecycle mutations locally.

```ts
await aionis.memory.archive.rehydrate({
  tenant_id: "default",
  scope: "default",
  client_ids: ["billing-timeout-repair"],
  target_tier: "warm",
  reason: "bring the prior repair memory back into the active working set",
});

await aionis.memory.nodes.activate({
  tenant_id: "default",
  scope: "default",
  client_ids: ["billing-timeout-repair"],
  outcome: "positive",
  activate: true,
  reason: "the recalled repair memory produced the correct fix path",
});
```

Related document workflow package:

```bash
npm install @aionis/doc
```

## Docs

Docs site source lives under `apps/docs`.

Useful commands:

```bash
npm run docs:start
npm run docs:build
npm run docs:serve
npm run docs:check
```

Repository docs deployment is wired through:

1. [apps/docs](apps/docs)
2. [.github/workflows/docs-pages.yml](.github/workflows/docs-pages.yml)

## What Ships Today

- a Lite local runtime with SQLite-backed persistence
- archive rehydrate and node activation lifecycle routes in Lite
- `@ostinato/aionis` as the main integration surface
- replay, playbooks, handoff, packs, and review-pack routes
- local automation and sandbox kernels
- benchmark, smoke, and contract validation workflows

## Not a Fit

- a generic chat UI or chatbot wrapper
- a hosted multi-tenant control-plane product
- a no-code automation platform for non-technical users

## Start Here

1. [SDK Quickstart](docs/SDK_QUICKSTART.md)
2. [Launch Messaging](docs/LAUNCH_MESSAGING.md)
3. [Stage Baseline](docs/AIONIS_RUNTIME_STAGE_BASELINE_2026_04_20.md)
4. [Docs Overview](docs/README.md)
5. [SDK README](packages/full-sdk/README.md)
6. [Bundled SDK Examples](examples/full-sdk/README.md)

## Public Packages

1. [packages/full-sdk](packages/full-sdk) -> `@ostinato/aionis`
2. [packages/aionis-doc](packages/aionis-doc) -> `@aionis/doc`

## Core Areas

1. [src/memory](src/memory)
2. [src/routes](src/routes)
3. [src/execution](src/execution)
4. [src/store](src/store)
5. [packages/full-sdk](packages/full-sdk)
6. [packages/aionis-doc](packages/aionis-doc)
7. [apps/lite](apps/lite)

## Validation

```bash
npm install
npm run -s build
npm run -s lite:test
npm run -s lite:benchmark:real
```

---
title: Getting Started
slug: /getting-started
---

# Getting started

The fastest evaluation path is:

<div class="doc-lead">
  <span class="doc-kicker">Fastest path</span>
  <p>If you only have ten minutes, treat this page as the core path: start the standalone runtime package, install `@ostinato/aionis`, write one piece of execution evidence, and call `taskStart` or `planningContext` against `http://127.0.0.1:3001`.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">Lite local shell</span>
    <span class="doc-chip">SDK-first integration</span>
    <span class="doc-chip">Task start</span>
    <span class="doc-chip">Planning context</span>
  </div>
</div>

1. start the runtime locally
2. install the public SDK
3. call `taskStart` or `planningContext`

<div class="section-frame">
  <span class="doc-kicker">Core path only</span>
  <p>This page is intentionally narrow. It is here to prove the continuity baseline, not the whole runtime. Lifecycle reuse, review packs, sessions, introspection, and policy-learning surfaces belong to the enhanced or advanced path later. If you try to evaluate all of that in ten minutes, the product will feel wider than it needs to.</p>
</div>

<div class="state-strip">
  <span class="state-badge state-trusted">core path</span>
  <span class="state-badge state-candidate">enhanced next</span>
  <span class="state-badge state-governed">advanced later</span>
  <span class="state-note">Getting Started proves the baseline: continuity works at all.</span>
</div>

## 1. Start the runtime

Recommended standalone path:

```bash
npx @ostinato/aionis-runtime start
```

The default local target is:

```text
http://127.0.0.1:3001
```

Before moving on, confirm the runtime is alive:

```bash
curl http://127.0.0.1:3001/health
```

You should get a structured JSON health response from the local host.

If you are evaluating from a source checkout instead of the published runtime package:

```bash
npm install
npm run lite:start
```

## 2. Install the public SDK

In your own project:

```bash
npm install @ostinato/aionis
```

## 3. Create a client

```ts
import { createAionisClient } from "@ostinato/aionis";

const aionis = createAionisClient({
  baseUrl: "http://127.0.0.1:3001",
});
```

## 4. Write one piece of execution evidence

```ts
await aionis.memory.write({
  tenant_id: "default",
  scope: "docs-eval",
  actor: "local-user",
  input_text:
    "Investigated a serializer bug in src/routes/export.ts, patched the output shape, and validated the response contract.",
});
```

This gives Lite something real to work with. `taskStart` and `planningContext` are more useful when the local runtime already has execution evidence in the relevant scope.

## 5. Ask for a learned kickoff

```ts
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

Read these fields first:

1. `first_action`
2. `kickoff_recommendation`
3. `kickoff_recommendation.next_action`
4. `kickoff_recommendation.selected_tool`

If those come back sparse, the runtime is usually healthy but your local scope does not have much relevant execution evidence yet.

## 6. Optional: ask for richer planner context

Use `planningContext` when you want more than one next step:

```ts
const planning = await aionis.memory.planningContext({
  tenant_id: "default",
  scope: "docs-eval",
  query_text: "repair export route serialization",
  context: {
    goal: "repair export route serialization",
    task_kind: "bugfix",
  },
  tool_candidates: ["read", "edit", "test"],
  return_layered_context: true,
});

console.log(planning.kickoff_recommendation);
console.log(planning.workflow_signals);
```

## What a successful first evaluation looks like

You do not need the runtime to look "smart" on the first call. You need it to prove the public path is working.

A healthy first evaluation looks like:

1. Lite boots locally and `/health` responds
2. `memory.write(...)` succeeds
3. `memory.taskStart(...)` returns a structured response
4. `memory.planningContext(...)` returns planner-facing fields
5. the SDK can talk to the runtime without custom glue code

## If the response feels empty

The most common reasons are:

- you are querying a fresh scope with no relevant execution evidence
- the `query_text` is too generic to match prior work
- you wrote evidence into one scope and queried another
- Lite is running, but you expected hosted-only behavior that is intentionally outside the public local path

The runtime being sparse is not the same thing as the runtime being broken.

## Next paths

- Want the full layered developer flow? Read [SDK Quickstart](./sdk/quickstart.md).
- Want the runtime shape and startup model? Read [Lite Runtime](./runtime/lite-runtime.md).
- Want operational details and env defaults? Read [Lite Config and Operations](./runtime/lite-config-and-operations.md).
- Want the route-level surface? Read [Contracts and Routes](./reference/contracts-and-routes.md).

<div class="doc-grid">
  <a class="doc-card" href="./sdk/quickstart.md">
    <span class="doc-kicker">Next step</span>
    <h3>SDK Quickstart</h3>
    <p>Move from hello-world startup into write, planning, handoff, replay, and host-bridge flows.</p>
  </a>
  <a class="doc-card" href="./runtime/lite-config-and-operations.md">
    <span class="doc-kicker">If startup goes wrong</span>
    <h3>Lite Config and Operations</h3>
    <p>Check defaults, env overrides, sandbox modes, SQLite paths, and health behavior.</p>
  </a>
  <a class="doc-card" href="./faq-and-troubleshooting.md">
    <span class="doc-kicker">Common friction</span>
    <h3>FAQ and Troubleshooting</h3>
    <p>Debug the most common reasons Lite feels empty, won’t boot, or returns `501` behavior.</p>
  </a>
</div>

## Ten-minute evaluation checklist

If you are evaluating whether Aionis is worth integrating, the shortest serious test is:

1. boot Lite
2. confirm `/health`
3. write one or two realistic execution notes
4. call `taskStart`
5. call `planningContext`
6. decide whether the runtime shape matches how your host thinks about work

If that baseline works and feels promising, move next into the enhanced path:

1. `memory.archive.rehydrate(...)`
2. `memory.nodes.activate(...)`
3. `memory.reviewPacks.*`
4. `memory.sessions.*`

---
title: Getting Started
slug: /getting-started
---

# Getting started

The fastest evaluation path is:

<div class="doc-lead">
  <span class="doc-kicker">Fastest path</span>
  <p>If you only have ten minutes, run Lite locally, install `@ostinato/aionis`, and call `taskStart` or `planningContext` against `http://127.0.0.1:3001`.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">Lite local shell</span>
    <span class="doc-chip">SDK-first integration</span>
    <span class="doc-chip">Task start</span>
    <span class="doc-chip">Planning context</span>
  </div>
</div>

1. start the Lite runtime locally
2. install the public SDK
3. call `taskStart` or `planningContext`

## 1. Start the Lite runtime

From the repository root:

```bash
npm install
npm run lite:start
```

The default local target is:

```text
http://127.0.0.1:3001
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

## 4. Ask for a learned kickoff

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

## 5. Next paths

- Want the full developer flow? Read [SDK Quickstart](./sdk/quickstart.md).
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

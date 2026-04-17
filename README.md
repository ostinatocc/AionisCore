# Aionis Core

`Aionis Core` is the kernel for agent continuity.

It gives agent systems three durable capability surfaces:

1. **Task Start**
   Turn prior execution into a better first action for the next similar task.
2. **Task Handoff**
   Store and recover structured execution-ready task packets.
3. **Task Replay**
   Record successful execution, compile playbooks, and reuse prior runs.

## Install

```bash
npm install @ostinato/aionis
```

Low-level runtime boundary package:

```bash
npm install @ostinato/aionis-rtc
```

Document workflow compiler and continuity package:

```bash
npm install @aionis/doc
```

## Quick Start

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

## Public Packages

1. [packages/full-sdk](packages/full-sdk) -> `@ostinato/aionis`
2. [packages/runtime-core](packages/runtime-core) -> `@ostinato/aionis-rtc`
3. [packages/aionis-doc](packages/aionis-doc) -> `@aionis/doc`

## Start Here

1. [SDK Quickstart](docs/SDK_QUICKSTART.md)
2. [SDK README](packages/full-sdk/README.md)
3. [Docs Overview](docs/README.md)
4. [Bundled SDK Examples](examples/full-sdk/README.md)

## Core Areas

1. [src/memory](src/memory)
2. [src/routes](src/routes)
3. [src/execution](src/execution)
4. [src/store](src/store)
5. [packages/runtime-core](packages/runtime-core)
6. [packages/full-sdk](packages/full-sdk)
7. [packages/aionis-doc](packages/aionis-doc)
8. [apps/lite](apps/lite)

## Validation

```bash
npm install
npm run -s build
npm run -s lite:test
npm run -s lite:benchmark:real
```

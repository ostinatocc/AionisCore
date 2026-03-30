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

## Public Packages

1. [packages/full-sdk](/Volumes/ziel/AionisTest/Aioniscc/packages/full-sdk) -> `@ostinato/aionis`
2. [packages/runtime-core](/Volumes/ziel/AionisTest/Aioniscc/packages/runtime-core) -> `@ostinato/aionis-rtc`

## Start Here

1. [SDK Quickstart](/Volumes/ziel/AionisTest/Aioniscc/docs/SDK_QUICKSTART.md)
2. [SDK README](/Volumes/ziel/AionisTest/Aioniscc/packages/full-sdk/README.md)
3. [Docs Overview](/Volumes/ziel/AionisTest/Aioniscc/docs/README.md)
4. [Bundled SDK Examples](/Volumes/ziel/AionisTest/Aioniscc/examples/full-sdk/README.md)

## Core Areas

1. [src/memory](/Volumes/ziel/AionisTest/Aioniscc/src/memory)
2. [src/routes](/Volumes/ziel/AionisTest/Aioniscc/src/routes)
3. [src/execution](/Volumes/ziel/AionisTest/Aioniscc/src/execution)
4. [src/store](/Volumes/ziel/AionisTest/Aioniscc/src/store)
5. [packages/runtime-core](/Volumes/ziel/AionisTest/Aioniscc/packages/runtime-core)
6. [packages/full-sdk](/Volumes/ziel/AionisTest/Aioniscc/packages/full-sdk)
7. [apps/lite](/Volumes/ziel/AionisTest/Aioniscc/apps/lite)

## Validation

```bash
npm install
npm run -s build
npm run -s lite:test
npm run -s lite:benchmark:real
```

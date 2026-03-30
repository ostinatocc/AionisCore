# Aionis Core SDK Quickstart

This guide is the fastest way to get from a running Aionis Core runtime to a working `@cognary/aionis` integration.

## 1. Start Aionis Core

```bash
cd /Volumes/ziel/AionisTest/Aioniscc
npm install
npm run lite:start
```

Default local SDK target:

1. `http://127.0.0.1:3001`

## 2. Install the SDK

In your own project:

```bash
npm install @cognary/aionis
```

Optional CLI sanity check:

```bash
npx @cognary/aionis doctor
```

Optional runtime launcher:

```bash
npx @cognary/aionis dev --repo /path/to/Aionis --port 3101
```

## 3. Create a client

```ts
import { createAionisClient } from "@cognary/aionis";

const aionis = createAionisClient({
  baseUrl: "http://127.0.0.1:3001",
});
```

## 4. Write execution memory

```ts
await aionis.memory.write({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  actor: "sdk-demo",
  run_id: "sdk-run-1",
  observations: [
    {
      kind: "workflow_step",
      summary: "Fetched a CSV report and normalized the rows",
    },
  ],
});
```

## 5. Read planner-visible memory

```ts
const planning = await aionis.memory.planningContext({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
});

console.log(planning);
```

## 6. Record tool feedback

```ts
await aionis.memory.tools.feedback({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  actor: "sdk-demo",
  tool_name: "fetch_report",
  feedback: "The fetch_report tool worked and returned clean rows.",
  outcome: "positive",
});
```

## 7. Start a task from learned kickoff

```ts
const taskStart = await aionis.memory.taskStartPlan({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  query_text: "repair billing retry timeout in service code",
  context: {
    goal: "repair billing retry timeout in service code",
  },
  candidates: ["bash", "edit", "test"],
});

console.log(taskStart.first_action);
```

`taskStartPlan` checks learned kickoff history first and falls back to `planningContext` when needed.

## 8. Stable SDK surface

Current stable SDK methods:

1. `memory.write`
2. `memory.planningContext`
3. `memory.contextAssemble`
4. `memory.kickoffRecommendation`
5. `memory.taskStart`
6. `memory.taskStartPlan`
7. `memory.executionIntrospect`
8. `memory.tools.select`
9. `memory.tools.feedback`
10. `memory.replay.repairReview`
11. `memory.anchors.rehydratePayload`

## 9. Run repository examples

```bash
cd /Volumes/ziel/AionisTest/Aioniscc
npm run sdk:build
npm run lite:start
```

Then in another terminal:

```bash
npm run example:sdk:workflow
npm run example:sdk:tools-feedback
npm run example:sdk:introspect
npm run example:sdk:context-assemble
npm run example:sdk:task-start-plan
npm run example:integration:host-task-start
npm run example:integration:task-start-learning-loop
```

Repository examples:

1. [examples/sdk/README.md](/Volumes/ziel/AionisTest/Aioniscc/examples/sdk/README.md)

Core capability examples and integration examples are listed separately there.

# Aionis Core Quickstart

This guide is the fastest way to get from a running Aionis Core runtime to a working `@ostinato/aionis` integration.

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
npm install @ostinato/aionis
```

Optional CLI sanity check:

```bash
npx @ostinato/aionis doctor
```

Optional runtime launcher:

```bash
npx @ostinato/aionis dev --repo /path/to/Aionis --port 3101
```

## 3. Create a client

```ts
import { createAionisClient } from "@ostinato/aionis";

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
const taskStart = await aionis.memory.taskStart({
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

## 8. Store a structured handoff

```ts
await aionis.handoff.store({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  anchor: "sdk-quickstart-task",
  summary: "Task paused with a clear next action",
  handoff_text: "Resume in the billing retry service and rerun timeout checks.",
  target_files: ["src/billing/retry.ts"],
  next_action: "Patch retry timeout handling and rerun the retry checks.",
});
```

## 9. Complete SDK surface

Current complete SDK surface includes:

1. memory write / recall / planning / introspection
2. kickoff and task-start surfaces
3. handoff store and recover
4. replay run lifecycle and playbooks
5. sandbox and automation surfaces
6. host bridge integration

## 10. Run bundled SDK examples

```bash
cd /Volumes/ziel/AionisTest/Aioniscc
npm run sdk:build
npm run lite:start
```

Then in another terminal:

```bash
npm run example:sdk:recall
npm run example:sdk:replay
npm run example:sdk:sessions
npm run example:sdk:automation
npm run example:sdk:sandbox
npm run example:integration:host-task-start
npm run example:integration:task-start-learning-loop
```

Repository examples:

1. [examples/full-sdk/README.md](/Volumes/ziel/AionisTest/Aioniscc/examples/full-sdk/README.md)

---
title: SDK Quickstart
slug: /sdk/quickstart
---

# SDK quickstart

This is the fastest station-internal path from zero to a working `@ostinato/aionis` integration.

<div class="doc-lead">
  <span class="doc-kicker">Developer path</span>
  <p>The intended order is simple: boot Lite, create a client, seed execution memory, rehydrate or activate nodes when reuse matters, then move into planning, handoff, and replay.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">createAionisClient</span>
    <span class="doc-chip">archive.rehydrate</span>
    <span class="doc-chip">nodes.activate</span>
    <span class="doc-chip">planningContext</span>
    <span class="doc-chip">taskStart + replay</span>
  </div>
</div>

## What you need first

Before writing any client code, make sure:

1. you are running the Lite runtime locally
2. your Node version supports `node:sqlite` and the local shell startup
3. you know the default Lite target is `http://127.0.0.1:3001`

## 1. Start Lite locally

From the repository root:

```bash
npm install
npm run lite:start
```

Check that the runtime is alive:

```bash
curl http://127.0.0.1:3001/health
```

## 2. Install the public SDK

In the project that will call Aionis:

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

## 4. Seed archived execution memory

```ts
const write = await aionis.memory.write({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  actor: "sdk-demo",
  input_text: "Diagnosed a billing retry timeout and confirmed the likely repair path in src/billing/retry.ts.",
  nodes: [
    {
      client_id: "billing-timeout-repair",
      type: "event",
      tier: "archive",
      title: "Billing retry timeout repair context",
      text_summary: "Observed billing retry timeout failures after three attempts.",
      slots: {
        task_kind: "repair_billing_retry",
        next_action: "inspect retry timeout configuration and retry loop",
      },
    },
  ],
});

console.log(write.commit_id);
```

This gives Lite a real archived node that can be rehydrated back into the active working set.

## 5. Rehydrate archived memory in Lite

```ts
await aionis.memory.archive.rehydrate({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  actor: "sdk-demo",
  client_ids: ["billing-timeout-repair"],
  target_tier: "warm",
  reason: "bring the archived billing retry repair context back into the active working set",
  input_text: "reuse the prior billing retry repair context",
});
```

## 6. Record node reuse outcome

```ts
await aionis.memory.nodes.activate({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  actor: "sdk-demo",
  client_ids: ["billing-timeout-repair"],
  run_id: "docs-sdk-run-1",
  outcome: "positive",
  activate: true,
  reason: "the rehydrated node helped choose the correct repair path",
  input_text: "repair billing retry timeout in service code",
});
```

## 7. Ask for planning context

```ts
const planning = await aionis.memory.planningContext({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  query_text: "repair billing retry timeout in service code",
  context: {
    goal: "repair billing retry timeout in service code",
    task_kind: "repair_billing_retry",
  },
  tool_candidates: ["bash", "edit", "test"],
  return_layered_context: true,
});

console.log(planning.kickoff_recommendation);
console.log(planning.planner_packet);
```

This is the most useful first read surface when you want the runtime to assemble recall, workflow hints, and kickoff context into one response.

## 8. Ask for a learned task start

```ts
const taskStart = await aionis.memory.taskStart({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  query_text: "repair billing retry timeout in service code",
  context: {
    goal: "repair billing retry timeout in service code",
  },
  candidates: ["bash", "edit", "test"],
});

console.log(taskStart.first_action);
```

`taskStart` is the shortest path to the runtime's core value: a better first move for a repeated task.

## 9. Store a structured handoff

```ts
await aionis.handoff.store({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  anchor: "billing-retry-repair",
  summary: "Pause after diagnosis and resume from the retry service",
  handoff_text: "Resume in src/billing/retry.ts and patch timeout handling.",
  target_files: ["src/billing/retry.ts"],
  next_action: "Patch retry timeout handling and rerun the retry checks.",
  acceptance_checks: ["npm run -s test -- billing-retry"],
});
```

## 10. Record replay and compile a playbook

```ts
await aionis.memory.replay.run.start({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  actor: "sdk-demo",
  run_id: "billing-retry-run-1",
  goal: "repair billing retry timeout",
});

await aionis.memory.replay.step.before({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  actor: "sdk-demo",
  run_id: "billing-retry-run-1",
  step_index: 1,
  tool_name: "edit",
  tool_input: { file_path: "src/billing/retry.ts" },
});

await aionis.memory.replay.step.after({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  actor: "sdk-demo",
  run_id: "billing-retry-run-1",
  step_index: 1,
  status: "success",
  output_signature: {
    kind: "patch_result",
    summary: "patched retry timeout handling",
  },
});
```

From there, end the run and compile a playbook through the replay surface. That is the path from remembered execution to reusable operating knowledge.

## 11. Use the host bridge when your app already has task state

If your host already thinks in terms of task IDs, pause/resume, and lifecycle transitions, move up one layer:

```ts
import { createAionisHostBridge } from "@ostinato/aionis";

const bridge = createAionisHostBridge({
  baseUrl: "http://127.0.0.1:3001",
});

const taskSession = await bridge.openTaskSession({
  task_id: "billing-retry-repair",
  text: "repair billing retry timeout in service code",
  title: "Billing retry repair",
});

const taskContext = await taskSession.inspectTaskContext({
  context: { task_kind: "repair_billing_retry" },
  candidates: ["bash", "edit", "test"],
});

console.log(taskContext.planning_context.kickoff_recommendation);
```

## Where to go next

1. [Client and Host Bridge](./client-and-bridge.md)
2. [Memory reference](../reference/memory.md)
3. [Handoff reference](../reference/handoff.md)
4. [Replay and Playbooks reference](../reference/replay-and-playbooks.md)
5. [Lite Config and Operations](../runtime/lite-config-and-operations.md)

<div class="doc-grid">
  <a class="doc-card" href="./client-and-bridge.md">
    <span class="doc-kicker">SDK surface</span>
    <h3>Client and Host Bridge</h3>
    <p>Pick between direct runtime calls and the higher-level task-session adapter.</p>
  </a>
  <a class="doc-card" href="../reference/memory.md">
    <span class="doc-kicker">Reference</span>
    <h3>Memory</h3>
    <p>See the write, recall, planning, review-pack, and tool-learning surfaces in one place.</p>
  </a>
  <a class="doc-card" href="../reference/replay-and-playbooks.md">
    <span class="doc-kicker">Reference</span>
    <h3>Replay and Playbooks</h3>
    <p>Follow the path from a replay run to a reusable playbook and local execution reuse.</p>
  </a>
</div>

---
title: SDK Client And Host Bridge
slug: /sdk/client-and-bridge
---

# SDK client and host bridge

The main public integration surface is `@ostinato/aionis`.

<div class="doc-lead">
  <span class="doc-kicker">Integration surface</span>
  <p>Use the runtime client when you want direct route access. Use the host bridge when your host already thinks in terms of tasks, pause/resume, and session lifecycle.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">Direct client</span>
    <span class="doc-chip">Task session bridge</span>
    <span class="doc-chip">Pause / resume</span>
    <span class="doc-chip">Typed contracts</span>
  </div>
</div>

The package gives you:

- the runtime HTTP client
- typed request and response contracts
- higher-level host bridge utilities for task session flows

## Choose the right surface

| Use case | Best surface |
| --- | --- |
| Call runtime routes directly | Runtime client |
| Build your own host logic around memory, handoff, replay, or automation | Runtime client |
| You already have a task object and want session lifecycle helpers | Host bridge |
| You need pause / resume / complete flows with task-shaped helpers | Host bridge |

## Runtime client

Use the runtime client when you want direct access to:

- memory
- handoff
- replay
- automation
- sandbox
- review packs

Minimal shape:

```ts
import { createAionisClient } from "@ostinato/aionis";

const aionis = createAionisClient({
  baseUrl: "http://127.0.0.1:3001",
});

const taskStart = await aionis.memory.taskStart({
  tenant_id: "default",
  scope: "repair-flow",
  query_text: "repair export serializer bug",
  context: {
    goal: "repair export serializer bug",
  },
  candidates: ["read", "edit", "test"],
});
```

This is the right layer when you want full control over how your application composes runtime calls.

## Host bridge

Use the host bridge when you want a more opinionated task session adapter that bundles:

- task start
- session events
- inspect task context
- pause / resume / complete flows

That bridge is useful when your host app already thinks in terms of tasks and lifecycle transitions.

Minimal shape:

```ts
import { createAionisHostBridge } from "@ostinato/aionis";

const bridge = createAionisHostBridge({
  baseUrl: "http://127.0.0.1:3001",
});

const session = await bridge.openTaskSession({
  task_id: "task-123",
  text: "repair export serializer bug",
  tenant_id: "default",
  scope: "repair-flow",
  actor: "local-user",
});

const plan = await session.planTaskStart();
const pause = await session.pauseTask({
  summary: "stopped after isolating serializer branch",
  handoff_text: "resume in src/routes/export.ts and verify the JSON payload",
});
```

## What the bridge adds

The host bridge is a task-shaped layer over the same runtime.

What it adds is:

1. task/session framing
2. startup planning helpers
3. session event recording
4. pause/resume/complete lifecycle helpers
5. state snapshotting for host-side workflow control

That makes it useful when you are building a real host experience, not just testing raw routes.

## Recommended adoption pattern

Most teams should adopt the SDK in this order:

1. start with the runtime client to understand the public route families
2. add the host bridge only if your application already has task lifecycle concepts
3. keep raw route access for advanced flows, even if you also use the bridge

The bridge is opinionated, but it is not all-or-nothing.

## Best reads

- [SDK Quickstart](./quickstart.md)
- [Operator Projection and Action Hints](./operator-projection-and-action-hints.md)
- [Action Retrieval](../concepts/action-retrieval.md)
- [Uncertainty and Gates](../concepts/uncertainty-and-gates.md)
- [Memory reference](../reference/memory.md)
- [Handoff reference](../reference/handoff.md)
- [Replay and Playbooks reference](../reference/replay-and-playbooks.md)

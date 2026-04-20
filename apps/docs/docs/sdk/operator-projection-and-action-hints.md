---
title: Operator Projection And Action Hints
slug: /sdk/operator-projection-and-action-hints
---

# Operator Projection and action hints

Action Retrieval and uncertainty become most useful when a host can consume them directly.

That is what `operator_projection` is for.

It gives host-side and operator-side integrations a structured surface instead of forcing them to reverse-engineer planner text.

<div class="doc-lead">
  <span class="doc-kicker">Host-facing integration surface</span>
  <p>Use operator projection when you want the runtime to tell your host what to do next: inspect context, widen recall, rehydrate payload, or request review.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">planningContext</span>
    <span class="doc-chip">contextAssemble</span>
    <span class="doc-chip">action hints</span>
    <span class="doc-chip">host bridge</span>
  </div>
</div>

## What the projection includes

The important fields are:

- `operator_projection.action_retrieval_gate`
- `operator_projection.action_hints[]`

Each action hint can include:

- `action`
- `priority`
- `instruction`
- `selected_tool`
- `file_path`
- `tool_route`
- `tool_method`
- `example_call`
- `preferred_rehydration_anchor_id`

This is what lets a host take a runtime hint and turn it into a concrete next UI or runtime action.

## Minimal example

```ts
import {
  createAionisClient,
  resolveContextOperatorProjection,
} from "@ostinato/aionis";

const aionis = createAionisClient({
  baseUrl: "http://127.0.0.1:3001",
});

const planning = await aionis.memory.planningContext({
  tenant_id: "default",
  scope: "repair-flow",
  query_text: "repair billing retry serializer bug",
  context: {
    goal: "repair billing retry serializer bug",
  },
});

const projection = resolveContextOperatorProjection(planning);
const nextHint = projection?.action_hints?.[0] ?? null;
```

Read these fields first:

1. `projection?.action_retrieval_gate?.gate_action`
2. `projection?.action_hints?.[0]?.action`
3. `projection?.action_hints?.[0]?.instruction`
4. `projection?.action_hints?.[0]?.example_call`

## Host bridge shortcut

If you do not want to read projection surfaces yourself, the host bridge can turn them into a host-facing startup decision.

```ts
const bridge = createAionisHostBridge({
  baseUrl: "http://127.0.0.1:3001",
});

const plan = await bridge.planTaskStart({
  task_id: "task-123",
  text: "repair billing retry serializer bug",
  tenant_id: "default",
  scope: "repair-flow",
});
```

That response gives you:

- `decision.startup_mode`
- `decision.gate_action`
- `decision.instruction`
- `decision.tool`
- `decision.file_path`

So the host can move directly from runtime judgment to UI or execution behavior.

## When to use this surface

Use operator projection when:

- your host has an inspect-first workflow
- you want explicit runtime hints instead of parsing planner text
- you need to trigger rehydration or widened recall from the host
- you want operator review to be a first-class integration path

If you only want a compact first move, `memory.taskStart(...)` is still the simplest entrypoint.

## Related surfaces

- `memory.planningContext(...)`
- `memory.contextAssemble(...)`
- `resolveContextOperatorProjection(...)`
- `hostBridge.planTaskStart(...)`

## Deep dives

- [Action Retrieval](../concepts/action-retrieval.md)
- [Uncertainty and Gates](../concepts/uncertainty-and-gates.md)
- [SDK Client and Host Bridge](./client-and-bridge.md)

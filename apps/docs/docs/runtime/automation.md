---
title: Automation
slug: /runtime/automation
---

# Automation

Lite includes a local automation kernel. It is not a generic hosted workflow engine. It is a runtime path for executing playbook-shaped work locally, with explicit graph validation, run state, and pause/resume behavior.

<div class="doc-lead">
  <span class="doc-kicker">Automation in Lite</span>
  <p>The Lite automation kernel is built around local playbook execution. It lets you define a graph, validate it, create an automation, run it, inspect run state, and resume approval pauses through the public SDK.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">Local playbook kernel</span>
    <span class="doc-chip">Graph validation</span>
    <span class="doc-chip">Run lifecycle</span>
    <span class="doc-chip">Approval pauses</span>
  </div>
</div>

## What automation means in Aionis

Automation in Aionis is continuity-aware execution reuse.

The point is not only to schedule work. The point is to take a reusable playbook or task graph and run it through a local runtime that already understands replay, pause, approval, and artifact checks.

## Public automation methods

| SDK method | Route | Purpose |
| --- | --- | --- |
| `automations.validate(...)` | `POST /v1/automations/validate` | Validate a graph against the Lite automation kernel |
| `automations.graphValidate(...)` | `POST /v1/automations/graph/validate` | Alternate validation entrypoint for graph validation |
| `automations.create(...)` | `POST /v1/automations/create` | Persist an automation definition |
| `automations.get(...)` | `POST /v1/automations/get` | Fetch one automation definition |
| `automations.list(...)` | `POST /v1/automations/list` | List automation definitions in Lite |
| `automations.run(...)` | `POST /v1/automations/run` | Start an automation run |
| `automations.runs.get(...)` | `POST /v1/automations/runs/get` | Inspect one run |
| `automations.runs.list(...)` | `POST /v1/automations/runs/list` | List local runs |
| `automations.runs.cancel(...)` | `POST /v1/automations/runs/cancel` | Cancel a run |
| `automations.runs.resume(...)` | `POST /v1/automations/runs/resume` | Resume a paused run |

## Supported Lite node kinds

The current Lite kernel supports these node kinds:

| Node kind | What it does |
| --- | --- |
| `playbook` | Execute a replay playbook step |
| `approval` | Pause for a human or host-side approval gate |
| `condition` | Evaluate a boolean branch condition |
| `artifact_gate` | Require expected artifacts before continuing |

This is enough to express useful local workflows without pretending Lite already ships a full hosted orchestration plane.

## Minimal validation and create example

```ts
const graph = {
  nodes: [
    {
      node_id: "step_a",
      kind: "playbook",
      playbook_id: "pb_sync",
      version: 1,
      inputs: {},
    },
    {
      node_id: "gate_b",
      kind: "approval",
      approval_key: "local_gate",
      inputs: {
        source: "$nodes.step_a.summary.replay_readiness",
      },
    },
  ],
  edges: [{ from: "step_a", to: "gate_b", type: "on_success" }],
};

await aionis.automations.validate({
  tenant_id: "default",
  scope: "local-automation",
  graph,
});

await aionis.automations.create({
  tenant_id: "default",
  scope: "local-automation",
  actor: "docs-example",
  automation_id: "approval-flow",
  name: "Approval Flow",
  status: "draft",
  graph,
});
```

## Minimal run example

```ts
const run = await aionis.automations.run({
  tenant_id: "default",
  scope: "local-automation",
  actor: "docs-example",
  automation_id: "approval-flow",
  options: {
    execution_mode: "default",
    record_run: true,
    stop_on_failure: true,
  },
});
```

Then inspect or resume the run:

```ts
await aionis.automations.runs.get({
  tenant_id: "default",
  scope: "local-automation",
  run_id: "run-id-from-start",
  include_nodes: true,
});

await aionis.automations.runs.resume({
  tenant_id: "default",
  scope: "local-automation",
  actor: "docs-example",
  run_id: "run-id-from-start",
  reason: "approval granted",
});
```

## How automation relates to replay

Automation is not separate from replay in Aionis. It sits on top of the same continuity substrate.

The practical relationship is:

1. replay records a successful run
2. replay compiles that run into a playbook
3. automation executes or coordinates that playbook in a local graph

That is why automation belongs in the runtime story rather than living as a separate side feature.

## Lite boundary notes

Three things matter in Lite:

1. the automation kernel is local and explicit
2. reviewer-scoped governance and broader hosted workflow controls are narrower than a hosted system
3. approval pauses are supported, but Lite is still not a full remote orchestration plane

## Related docs

1. [Replay and Playbooks](../reference/replay-and-playbooks.md)
2. [Lite Runtime](./lite-runtime.md)
3. [SDK Quickstart](../sdk/quickstart.md)
4. [Review Runtime](../reference/review-runtime.md)

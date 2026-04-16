---
title: Replay And Playbooks
slug: /reference/replay-and-playbooks
---

# Replay and playbooks

Replay is the producer side of Aionis Runtime. It records successful execution and turns that execution into reusable operating knowledge.

## Replay run lifecycle

The base replay flow is:

1. start a run
2. record step before
3. record step after
4. end the run
5. fetch the completed run

| SDK method | Route |
| --- | --- |
| `memory.replay.run.start(...)` | `POST /v1/memory/replay/run/start` |
| `memory.replay.step.before(...)` | `POST /v1/memory/replay/step/before` |
| `memory.replay.step.after(...)` | `POST /v1/memory/replay/step/after` |
| `memory.replay.run.end(...)` | `POST /v1/memory/replay/run/end` |
| `memory.replay.run.get(...)` | `POST /v1/memory/replay/runs/get` |

## Minimal replay example

```ts
await aionis.memory.replay.run.start({
  tenant_id: "default",
  scope: "repair-flow",
  actor: "docs-example",
  run_id: "repair-run-1",
  goal: "repair export response serialization bug",
});

await aionis.memory.replay.step.before({
  tenant_id: "default",
  scope: "repair-flow",
  actor: "docs-example",
  run_id: "repair-run-1",
  step_index: 1,
  tool_name: "edit",
  tool_input: { file_path: "src/routes/export.ts" },
});

await aionis.memory.replay.step.after({
  tenant_id: "default",
  scope: "repair-flow",
  actor: "docs-example",
  run_id: "repair-run-1",
  step_index: 1,
  status: "success",
  output_signature: {
    kind: "patch_result",
    summary: "patched export serializer handling",
  },
});
```

## Playbook operations

Once a run ends, the important next step is turning it into a playbook.

| SDK method | Route | Purpose |
| --- | --- | --- |
| `memory.replay.playbooks.compileFromRun(...)` | `POST /v1/memory/replay/playbooks/compile_from_run` | Build a playbook from a completed replay run |
| `memory.replay.playbooks.get(...)` | `POST /v1/memory/replay/playbooks/get` | Fetch one playbook |
| `memory.replay.playbooks.candidate(...)` | `POST /v1/memory/replay/playbooks/candidate` | Evaluate candidate state |
| `memory.replay.playbooks.promote(...)` | `POST /v1/memory/replay/playbooks/promote` | Promote a playbook version |
| `memory.replay.playbooks.repair(...)` | `POST /v1/memory/replay/playbooks/repair` | Patch a playbook definition |
| `memory.replay.playbooks.run(...)` | `POST /v1/memory/replay/playbooks/run` | Execute a playbook locally |
| `memory.replay.playbooks.dispatch(...)` | `POST /v1/memory/replay/playbooks/dispatch` | Dispatch a playbook run |
| `memory.replay.playbooks.repairReview(...)` | `POST /v1/memory/replay/playbooks/repair/review` | Lite replay repair review subset |

## Why playbooks matter

Without replay, memory only describes what happened. With playbooks, the runtime can start to reuse how work got done.

That is the key loop:

```text
successful execution -> replay run -> playbook -> stable workflow guidance -> better future task start
```

## Lite boundary notes

Lite supports real replay and playbook behavior, but it is still narrower than a full hosted control plane.

The important boundary is:

1. replay core is fully present
2. governed replay is a Lite subset
3. playbook execution is local-first
4. automation reuses that same local playbook model

## Related docs

1. [Replay concept](../concepts/replay.md)
2. [Replay to Playbook guide](../guides/replay-to-playbook.md)
3. [Lite Runtime](../runtime/lite-runtime.md)

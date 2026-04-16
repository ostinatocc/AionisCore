---
title: Memory
slug: /reference/memory
---

# Memory reference

The memory surface is the widest part of the public SDK. It covers write, recall, planning, task start, sessions, rules, tools, review packs, and a few debugging-oriented endpoints.

## Core memory families

The public memory surface breaks down into six practical groups:

1. write and recall
2. planning and context assembly
3. task start and experience intelligence
4. sessions, packs, find, and resolve
5. rules, tools, patterns, and payload rehydration
6. review packs and delegation-learning support

## Most-used SDK calls

| SDK method | Route | What it is for |
| --- | --- | --- |
| `memory.write(...)` | `POST /v1/memory/write` | Persist execution evidence into Lite |
| `memory.recallText(...)` | `POST /v1/memory/recall_text` | Ask recall using natural language |
| `memory.planningContext(...)` | `POST /v1/memory/planning/context` | Get planner-facing recall and kickoff context |
| `memory.contextAssemble(...)` | `POST /v1/memory/context/assemble` | Build final context runtime payload |
| `memory.experienceIntelligence(...)` | `POST /v1/memory/experience/intelligence` | Inspect learned workflow and tool guidance |
| `memory.taskStart(...)` | `POST /v1/memory/kickoff/recommendation` | Get the best first action for a repeated task |
| `memory.executionIntrospect(...)` | `POST /v1/memory/execution/introspect` | Pull the heavier local introspection surface |

## Minimal write example

```ts
await aionis.memory.write({
  tenant_id: "default",
  scope: "repair-flow",
  actor: "docs-example",
  input_text:
    "Patched serializer handling in src/routes/export.ts and verified the export response shape.",
});
```

## Minimal planning example

```ts
const planning = await aionis.memory.planningContext({
  tenant_id: "default",
  scope: "repair-flow",
  query_text: "repair export response serialization bug",
  context: {
    goal: "repair export response serialization bug",
    task_kind: "repair_export",
  },
  tool_candidates: ["bash", "edit", "test"],
  return_layered_context: true,
});
```

Read these fields first:

1. `kickoff_recommendation`
2. `planner_packet`
3. `workflow_signals`
4. `pattern_signals`

## Task-start surfaces

If you want the shortest public entrypoint into memory-guided continuity, these are the important calls:

| SDK method | What comes back |
| --- | --- |
| `memory.taskStart(...)` | A compact `first_action` derived from kickoff recommendation |
| `memory.kickoffRecommendation(...)` | The raw kickoff response and rationale |
| `memory.experienceIntelligence(...)` | Workflow, tool, and learning-oriented guidance |

Use `taskStart` first when you want the best first move. Use `planningContext` first when you want more than one hint and need the runtime to assemble planner-facing context.

## Sessions and review-oriented helpers

These surfaces are useful when your host needs continuity state beyond a single task-start answer:

| SDK method family | Purpose |
| --- | --- |
| `memory.sessions.*` | Create sessions and append local session events |
| `memory.packs.*` | Export or import local packs |
| `memory.find(...)` / `memory.resolve(...)` | Direct local lookup and node resolution |
| `memory.reviewPacks.*` | Pull continuity or evolution review material |
| `memory.delegationRecords.*` | Read or write delegation-learning records |

## Tools, rules, and patterns

Lite also exposes a narrower local policy-learning loop:

| SDK method family | Purpose |
| --- | --- |
| `memory.tools.select(...)` | Tool selection decision path |
| `memory.tools.feedback(...)` | Store tool feedback and distill tool outcomes |
| `memory.rules.state(...)` | Update local rule state |
| `memory.rules.evaluate(...)` | Evaluate Lite rules |
| `memory.patterns.suppress(...)` | Operator stop-loss on a learned pattern |
| `memory.anchors.rehydratePayload(...)` | Expand an anchor-linked payload |

## Lite boundary notes

Three things matter when integrating against Lite:

1. memory archive lifecycle routes are not a Lite feature
2. node activation lifecycle routes are not a Lite feature
3. heavy route-by-route debugging still belongs in the repository capability matrix

If you call server-only groups in Lite, the runtime returns structured `501` behavior rather than pretending the feature exists.

## Raw contract sources

When you need exact field names, read:

1. [`packages/full-sdk/src/contracts.ts`](https://github.com/ostinatocc/AionisCore/blob/main/packages/full-sdk/src/contracts.ts)
2. [LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md](https://github.com/ostinatocc/AionisCore/blob/main/docs/LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md)

## Related docs

1. [SDK Quickstart](../sdk/quickstart.md)
2. [Task Start](../concepts/task-start.md)
3. [Contracts and Routes](./contracts-and-routes.md)

---
title: Handoff
slug: /reference/handoff
---

# Handoff reference

Handoff is the runtime surface for trustworthy pause and resume.

The point is not to save another prose summary. The point is to store execution-ready task state that the next run can trust.

## Public SDK methods

| SDK method | Route | Purpose |
| --- | --- | --- |
| `handoff.store(...)` | `POST /v1/handoff/store` | Persist a structured handoff |
| `handoff.recover(...)` | `POST /v1/handoff/recover` | Recover a handoff by anchor |

## The important handoff fields

These are the fields that matter most in practice:

1. `anchor`
2. `summary`
3. `handoff_text`
4. `target_files`
5. `next_action`
6. `acceptance_checks`

If those fields are weak, resume quality will also be weak.

## Minimal store example

```ts
await aionis.handoff.store({
  tenant_id: "default",
  scope: "repair-flow",
  anchor: "task:export-repair",
  summary: "Pause after diagnosis",
  handoff_text: "Resume in src/routes/export.ts and patch the serializer mismatch.",
  target_files: ["src/routes/export.ts"],
  next_action: "Patch the export serializer and rerun the relevant checks.",
  acceptance_checks: ["npm run -s test:lite -- export"],
});
```

## Minimal recover example

```ts
const recovered = await aionis.handoff.recover({
  tenant_id: "default",
  scope: "repair-flow",
  anchor: "task:export-repair",
});

console.log(recovered);
```

## When to use handoff directly

Use direct handoff APIs when:

1. your host already manages task identity itself
2. you want an explicit pause checkpoint
3. another run or operator will pick work back up later

## When to use the host bridge instead

Use the host bridge when your app already has a task session lifecycle and you want pause/resume to live inside that session adapter.

That path gives you:

1. `openTaskSession(...)`
2. `inspectTaskContext(...)`
3. `pauseTask(...)`
4. `resumeTask(...)`
5. `completeTask(...)`

## Lite behavior notes

In Lite:

1. handoff store and recover are fully supported
2. local identity defaults can fill missing actor context
3. handoff is meant to work as part of the local continuity loop, not as a hosted orchestration layer

## Related docs

1. [Handoff concept](../concepts/handoff.md)
2. [Pause and Resume guide](../guides/pause-and-resume.md)
3. [Client and Host Bridge](../sdk/client-and-bridge.md)

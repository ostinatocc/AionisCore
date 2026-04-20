---
title: Sandbox
slug: /runtime/sandbox
---

# Sandbox

Lite exposes a local sandbox runtime for controlled execution. It is the execution path behind command-style runtime actions, run inspection, logs, artifacts, and cancellation.

<div class="doc-lead">
  <span class="doc-kicker">Local execution surface</span>
  <p>The sandbox is how Lite executes controlled runtime actions locally. It supports session creation, command execution, run inspection, log retrieval, artifact retrieval, and cancellation through the public SDK.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">Session-based</span>
    <span class="doc-chip">Command execution</span>
    <span class="doc-chip">Logs + artifacts</span>
    <span class="doc-chip">Config-gated</span>
  </div>
</div>

## Public sandbox methods

| SDK method | Route | Purpose |
| --- | --- | --- |
| `memory.sandbox.sessions.create(...)` | `POST /v1/memory/sandbox/sessions` | Create a sandbox session |
| `memory.sandbox.execute(...)` | `POST /v1/memory/sandbox/execute` | Execute a command in the sandbox |
| `memory.sandbox.runs.get(...)` | `POST /v1/memory/sandbox/runs/get` | Inspect a run |
| `memory.sandbox.runs.logs(...)` | `POST /v1/memory/sandbox/runs/logs` | Fetch run logs |
| `memory.sandbox.runs.artifact(...)` | `POST /v1/memory/sandbox/runs/artifact` | Fetch run output or artifact bundle |
| `memory.sandbox.runs.cancel(...)` | `POST /v1/memory/sandbox/runs/cancel` | Cancel a run |

## Minimal session and execute example

```ts
const session = await aionis.memory.sandbox.sessions.create({
  tenant_id: "default",
  scope: "local-sandbox",
  actor: "docs-example",
  profile: "default",
});

const run = await aionis.memory.sandbox.execute({
  tenant_id: "default",
  scope: "local-sandbox",
  actor: "docs-example",
  session_id: "session-id-from-create",
  mode: "sync",
  action: {
    kind: "command",
    argv: ["echo", "hello-from-aionis-sandbox"],
  },
});
```

## Inspect logs and artifacts

```ts
await aionis.memory.sandbox.runs.logs({
  tenant_id: "default",
  scope: "local-sandbox",
  run_id: "run-id-from-execute",
});

await aionis.memory.sandbox.runs.artifact({
  tenant_id: "default",
  scope: "local-sandbox",
  run_id: "run-id-from-execute",
  include_output: true,
  include_result: true,
});
```

## What the sandbox is for

Use the sandbox when you need:

- controlled command execution inside Lite
- a runtime-managed execution record
- logs and artifacts attached to the run
- a bounded execution path that the runtime can reason about

This is especially useful when replay validation, automation, or host-side workflows need a local execution primitive with runtime-managed logs and artifacts.

## How sandbox fits the runtime model

The sandbox sits inside the same runtime story:

1. task start chooses a better first move
2. replay records how work succeeded or failed
3. automation can orchestrate playbook-shaped local work
4. sandbox executes bounded runtime actions

That is why the sandbox belongs under Lite runtime rather than under miscellaneous utilities.

## Sandbox in Lite today

Three constraints matter:

1. sandbox availability depends on Lite config such as `SANDBOX_ENABLED`
2. local-safe profiles can narrow allowed commands
3. sandbox runs, logs, and artifacts all come back through the same runtime surface

If sandbox routes fail, the first place to look is runtime config rather than SDK code.

## Related docs

1. [Lite Config and Operations](./lite-config-and-operations.md)
2. [Lite Runtime](./lite-runtime.md)
3. [FAQ and Troubleshooting](../faq-and-troubleshooting.md)
4. [SDK Client and Host Bridge](../sdk/client-and-bridge.md)

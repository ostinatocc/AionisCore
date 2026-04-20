---
title: FAQ And Troubleshooting
slug: /faq-and-troubleshooting
---

# FAQ and troubleshooting

<div class="doc-lead">
  <span class="doc-kicker">Fast answers</span>
  <p>This page is for the most common "is Lite broken or am I expecting the wrong thing?" questions. Use it when the runtime boots but feels sparse, when a surface returns `501`, or when a public path is present but not behaving the way you expected.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">Lite boundary</span>
    <span class="doc-chip">Weak task start</span>
    <span class="doc-chip">Sandbox failures</span>
    <span class="doc-chip">Data paths</span>
  </div>
</div>

## Do I need a hosted service to use Aionis Runtime?

No. The current public runtime story is Lite, which runs locally and stores data in SQLite-backed local stores.

## Why do some routes return `501` in Lite?

Because Lite is explicit about its boundary. Server-only route groups such as admin control are intentionally outside the Lite runtime.

## Are archive rehydrate and node activation available in Lite?

Yes. Lite now exposes both local memory lifecycle routes:

1. `POST /v1/memory/archive/rehydrate`
2. `POST /v1/memory/nodes/activate`

## Why will Lite not start on my machine?

The first thing to check is Node support. The startup script expects a Node version with `node:sqlite` support, which means Node 22+ for the current Lite shell.

## Why is `taskStart` weak or generic?

Usually because the runtime has not seen enough prior execution evidence yet. Lite cannot produce strong continuity signals without earlier writes, tool feedback, replay runs, or playbooks.

The most common causes are:

1. you are querying a fresh scope
2. the writes were too generic to help
3. you wrote evidence into one scope and queried another
4. you expected replay- or playbook-quality guidance without replay data

If you want a better first evaluation, write one or two realistic execution notes first and then call `planningContext(...)` before `taskStart(...)`.

## How do I know whether Lite is healthy or just empty?

Use this checklist:

1. `/health` returns successfully
2. `memory.write(...)` succeeds
3. `memory.taskStart(...)` returns a structured response
4. `memory.planningContext(...)` returns planner-facing fields

If all four are true, Lite is probably healthy. Sparse guidance usually means low-quality or low-quantity execution evidence.

## Where does Lite store data?

By default, under `.tmp/` in the repository:

1. `.tmp/aionis-lite-write.sqlite`
2. `.tmp/aionis-lite-replay.sqlite`

You can override both paths through environment variables.

## Why does handoff resume still feel weak?

Usually because the handoff itself is weak.

Check these first:

1. is the `anchor` stable and recoverable?
2. does the handoff include `target_files`?
3. is there a clear `next_action`?
4. are `acceptance_checks` present?

If those are missing, the runtime cannot invent a strong resume packet from thin air.

## Why do sandbox routes fail?

The common causes are:

1. `SANDBOX_ENABLED=false`
2. `SANDBOX_ADMIN_ONLY=true` without the admin token path you expected
3. an executor/profile mismatch
4. commands blocked by the allowed-command policy

Start with the safest local test path:

```bash
LITE_SANDBOX_PROFILE=local_process_echo npm run lite:start
```

Then test the smallest possible sandbox action first:

1. create a sandbox session
2. run `echo`
3. inspect logs

Do not start debugging sandbox with a large command chain.

## Why do automation routes not behave like a full workflow engine?

Because Lite automation is a local automation runtime built around playbook execution and approval pauses.

In practice that means:

1. graph validation and local run lifecycle are supported
2. playbook-driven local flows are supported
3. broader hosted review/governance workflow features are narrower in Lite

Read [Automation](./runtime/automation.md) with that boundary in mind.

## How do I inspect what Lite actually started with?

Use:

```bash
npm --prefix apps/lite run start:print-env
```

That gives you the effective startup values for the local shell defaults.

## What is the fastest way to prove the SDK path is working?

Use this order:

1. boot Lite
2. hit `/health`
3. call `memory.write(...)`
4. call `memory.planningContext(...)`
5. call `memory.taskStart(...)`

That path proves more than starting with replay or automation first.

## What should I read if I am integrating the SDK?

Start in this order:

1. [Getting Started](./getting-started.md)
2. [SDK Quickstart](./sdk/quickstart.md)
3. [Memory reference](./reference/memory.md)
4. [Handoff reference](./reference/handoff.md)
5. [Replay and Playbooks reference](./reference/replay-and-playbooks.md)
6. [Automation](./runtime/automation.md)
7. [Sandbox](./runtime/sandbox.md)

## What should I read if I am trying to understand the runtime itself?

Start in this order:

1. [What Aionis Runtime Is](./intro.md)
2. [Architecture Overview](./architecture/overview.md)
3. [Lite Runtime](./runtime/lite-runtime.md)
4. [Lite Config and Operations](./runtime/lite-config-and-operations.md)

## What should I read if I want to understand review-oriented paths?

Start here:

1. [Review Runtime](./reference/review-runtime.md)
2. [Replay and Playbooks](./reference/replay-and-playbooks.md)
3. [Memory reference](./reference/memory.md)

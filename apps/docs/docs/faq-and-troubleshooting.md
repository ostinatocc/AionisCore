---
title: FAQ And Troubleshooting
slug: /faq-and-troubleshooting
---

# FAQ and troubleshooting

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

## Where does Lite store data?

By default, under `.tmp/` in the repository:

1. `.tmp/aionis-lite-write.sqlite`
2. `.tmp/aionis-lite-replay.sqlite`

You can override both paths through environment variables.

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

## How do I inspect what Lite actually started with?

Use:

```bash
npm --prefix apps/lite run start:print-env
```

That gives you the effective startup values for the local shell defaults.

## What should I read if I am integrating the SDK?

Start in this order:

1. [Getting Started](./getting-started.md)
2. [SDK Quickstart](./sdk/quickstart.md)
3. [Memory reference](./reference/memory.md)
4. [Handoff reference](./reference/handoff.md)
5. [Replay and Playbooks reference](./reference/replay-and-playbooks.md)

## What should I read if I am trying to understand the runtime itself?

Start in this order:

1. [What Aionis Runtime Is](./intro.md)
2. [Architecture Overview](./architecture/overview.md)
3. [Lite Runtime](./runtime/lite-runtime.md)
4. [Lite Config and Operations](./runtime/lite-config-and-operations.md)

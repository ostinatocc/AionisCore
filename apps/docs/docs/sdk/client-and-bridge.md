---
title: SDK Client And Host Bridge
slug: /sdk/client-and-bridge
---

# SDK client and host bridge

The main public integration surface is `@ostinato/aionis`.

The package gives you:

- the runtime HTTP client
- typed request and response contracts
- higher-level host bridge utilities for task session flows

## Runtime client

Use the runtime client when you want direct access to:

- memory
- handoff
- replay
- automation
- sandbox
- review packs

## Host bridge

Use the host bridge when you want a more opinionated task session adapter that bundles:

- task start
- session events
- inspect task context
- pause / resume / complete flows

That bridge is useful when your host app already thinks in terms of tasks and lifecycle transitions.

## Best reads

- [SDK Quickstart](./quickstart.md)
- [Memory reference](../reference/memory.md)
- [Handoff reference](../reference/handoff.md)
- [Replay and Playbooks reference](../reference/replay-and-playbooks.md)

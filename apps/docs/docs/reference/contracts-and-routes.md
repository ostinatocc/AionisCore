---
title: Contracts And Routes
slug: /reference/contracts-and-routes
---

# Contracts and routes

Use this section when you already understand the product shape and need route-level or SDK-level detail.

<div class="doc-lead">
  <span class="doc-kicker">Reference map</span>
  <p>This section is the bridge between product docs and raw repository contracts. Use it when you need to know which public surface exists, which route backs it, and where the literal source of truth lives.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">Memory</span>
    <span class="doc-chip">Handoff</span>
    <span class="doc-chip">Replay</span>
    <span class="doc-chip">Raw contracts</span>
  </div>
</div>

## Best entry points

Start with the page that matches the runtime surface you are integrating:

- [Memory](./memory.md)
- [Handoff](./handoff.md)
- [Replay and Playbooks](./replay-and-playbooks.md)
- [SDK Quickstart](../sdk/quickstart.md)
- [Lite Config and Operations](../runtime/lite-config-and-operations.md)

<div class="doc-grid">
  <a class="doc-card" href="./memory.md">
    <span class="doc-kicker">Reference family</span>
    <h3>Memory</h3>
    <p>Write, recall, planning, task start, sessions, tools, review packs, and delegation-learning helpers.</p>
  </a>
  <a class="doc-card" href="./handoff.md">
    <span class="doc-kicker">Reference family</span>
    <h3>Handoff</h3>
    <p>Structured pause and resume, task anchors, and the handoff path into host-task sessions.</p>
  </a>
  <a class="doc-card" href="./replay-and-playbooks.md">
    <span class="doc-kicker">Reference family</span>
    <h3>Replay and Playbooks</h3>
    <p>Replay lifecycle, playbook compilation, promotion, repair, and Lite execution reuse.</p>
  </a>
</div>

## SDK contracts

The main typed SDK request and response shapes live here:

- [`packages/full-sdk/src/contracts.ts`](https://github.com/ostinatocc/AionisCore/blob/main/packages/full-sdk/src/contracts.ts)

Use that file when you need:

- memory request shapes
- replay payload shapes
- handoff envelopes
- automation and sandbox contracts

## Runtime capability matrix

The best raw route-level reference today is:

- [LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md](https://github.com/ostinatocc/AionisCore/blob/main/docs/LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md)

Use it to answer:

1. which routes are supported
2. which are Lite subsets
3. which are conditional
4. which are intentionally unavailable in Lite

## Runtime boundary

For public product boundary and open-core distribution stance:

- [OPEN_CORE_BOUNDARY.md](https://github.com/ostinatocc/AionisCore/blob/main/docs/OPEN_CORE_BOUNDARY.md)

## Package-level references

- [`@ostinato/aionis`](https://github.com/ostinatocc/AionisCore/blob/main/packages/full-sdk/README.md)
- [`@ostinato/aionis-rtc`](https://github.com/ostinatocc/AionisCore/blob/main/packages/runtime-core/README.md)
- [`@aionis/doc`](https://github.com/ostinatocc/AionisCore/blob/main/packages/aionis-doc/README.md)

## What this page does not try to be

This docs site still uses the repository markdown and TypeScript contracts as the final raw reference.

That means:

1. the docs site explains the public shape and integration path
2. the repository contract files remain the literal source of truth for every field
3. deeper route-by-route debugging still sometimes requires reading the raw capability matrix or SDK contracts

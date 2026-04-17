---
title: Lite Runtime
slug: /runtime/lite-runtime
---

# Lite runtime

The current public runtime story is Lite.

<div class="doc-lead">
  <span class="doc-kicker">Runtime distribution</span>
  <p>Lite is the current public runtime shape. It is local, explicit, SQLite-backed, and honest about what does not ship yet.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">Local shell</span>
    <span class="doc-chip">SQLite stores</span>
    <span class="doc-chip">Memory lifecycle</span>
    <span class="doc-chip">Sandbox + automation</span>
  </div>
</div>

Lite is a real local runtime shell with SQLite-backed persistence. It is not a hosted control plane and it does not pretend to expose every server-side surface.

## What Lite includes

- memory write and recall
- archive rehydrate and node activation lifecycle routes
- planning and context runtime
- handoff store and recover
- replay core
- governed replay subset
- local automation kernel
- local sandbox kernel

## What Lite does not include

Lite intentionally excludes server-only route groups such as:

- admin control routes
- broader hosted control-plane surfaces

When a surface is intentionally outside Lite, the runtime should not blur that boundary. It either omits the route or returns a structured `501`.

## Why that matters

This is one of Aionis' strengths: Lite now includes local memory lifecycle routes without pretending every broader hosted capability is already productized.

## Best reads

- [Lite Config and Operations](./lite-config-and-operations.md)
- [Architecture Overview](../architecture/overview.md)
- [Contracts and Routes](../reference/contracts-and-routes.md)
- [FAQ and Troubleshooting](../faq-and-troubleshooting.md)

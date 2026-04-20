---
title: What Ships Today
slug: /evidence/what-ships-today
---

# What ships today

This page gives the clearest external answer to a practical question:

`What can I use in Aionis Runtime today?`

<div class="doc-lead">
  <span class="doc-kicker">Current release shape</span>
  <p>Aionis Runtime ships today as a local runtime with typed SDK access to task start, handoff, replay, policy memory, semantic forgetting, sandbox execution, and automation. The product is ready to evaluate end to end through the public Lite path.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">Lite runtime</span>
    <span class="doc-chip">Public SDK</span>
    <span class="doc-chip">Task start · handoff · replay · action retrieval</span>
    <span class="doc-chip">207 / 207 lite tests</span>
  </div>
</div>

## What you can use now

Aionis Runtime is ready to evaluate today through:

1. Lite as the shipped runtime distribution
2. `@ostinato/aionis` as the public SDK
3. task start, handoff, replay, action retrieval, uncertainty gates, policy memory, and semantic forgetting
4. sandbox and automation through the same local runtime
5. six runnable proofs that show how continuity improves over time

## Product highlights

<div class="reference-grid">
  <div class="reference-tile">
    <span class="reference-kicker">Runtime</span>
    <h3>Lite runs locally today</h3>
    <p>Run Aionis locally with SQLite-backed persistence, lifecycle routes, sandbox execution, and automation through the same runtime surface.</p>
    <code class="reference-route">Lite runtime + SQLite stores</code>
  </div>
  <div class="reference-tile">
    <span class="reference-kicker">Evidence</span>
    <h3>Self-evolving behavior is demonstrated</h3>
    <p>Task start improvement, policy memory, governance, provenance, session continuity, and semantic forgetting are all backed by live Lite proofs.</p>
    <code class="reference-route">6 reproducible Lite proofs</code>
  </div>
  <div class="reference-tile">
    <span class="reference-kicker">Decision layer</span>
    <h3>Action retrieval and gates are public</h3>
    <p>The runtime now exposes explicit next-action retrieval, uncertainty, and gate surfaces instead of hiding them inside one flat recommendation.</p>
    <code class="reference-route">actionRetrieval + planning gate surfaces</code>
  </div>
  <div class="reference-tile">
    <span class="reference-kicker">SDK cleanup</span>
    <h3>Typed integration path</h3>
    <p>The public SDK exposes task start, handoff, replay, action retrieval, sandbox, automation, lifecycle reuse, and review surfaces through one typed client.</p>
    <code class="reference-route">@ostinato/aionis</code>
  </div>
  <div class="reference-tile">
    <span class="reference-kicker">Use cases</span>
    <h3>Best fit today</h3>
    <p>Aionis is strongest today for coding, ops, and workflow-heavy systems where repeated startup quality, pause/resume, and replay reuse matter.</p>
    <code class="reference-route">coding · ops · workflow reuse</code>
  </div>
</div>

## Current validation

The current release path is backed by:

1. `npm run -s sdk:test` is passing
2. `npm run -s lite:test` is passing at `207/207`
3. the docs site remains part of the baseline and should keep `docs:check` green

## Runtime snapshot

The current Lite runtime is organized around a few clear pieces:

- runtime shell and bootstrap
- typed SDK
- SQLite-backed stores
- memory, replay, handoff, sandbox, and automation
- evidence pages and runnable examples

## Where to go next

- [Proof By Evidence](./proof-by-evidence.md) shows the strongest runtime claims through observed runs
- [Self-Evolving Demos](./self-evolving-demos.md) shows how to rerun the proofs
- [Getting Started](../getting-started.md) is the shortest path to a first local evaluation
- [SDK Quickstart](../sdk/quickstart.md) is the best entrypoint for integration

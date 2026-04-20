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
    <span class="doc-chip">Policy memory</span>
    <span class="doc-chip">Handoff</span>
    <span class="doc-chip">Replay</span>
    <span class="doc-chip">Automation + sandbox</span>
    <span class="doc-chip">Raw contracts</span>
  </div>
</div>

<div class="reference-grid">
  <a class="reference-tile" href="./memory.md">
    <span class="reference-kicker">Route family</span>
    <h3>Memory</h3>
    <span class="reference-route">/v1/memory/*</span>
    <p>Write, recall, planning, task start, lifecycle reuse, sessions, tools, and review helpers.</p>
  </a>
  <a class="reference-tile" href="./policy-memory.md">
    <span class="reference-kicker">Cross-cutting surface</span>
    <h3>Policy Memory</h3>
    <span class="reference-route">feedback -> experience -> review -> governance</span>
    <p>Persisted policy contracts, evolution inspect, and the retire/reactivate governance path.</p>
  </a>
  <a class="reference-tile" href="./handoff.md">
    <span class="reference-kicker">Route family</span>
    <h3>Handoff</h3>
    <span class="reference-route">/v1/handoff/*</span>
    <p>Pause and resume through explicit handoff packets and anchor-based recovery.</p>
  </a>
  <a class="reference-tile" href="./replay-and-playbooks.md">
    <span class="reference-kicker">Route family</span>
    <h3>Replay</h3>
    <span class="reference-route">/v1/memory/replay/*</span>
    <p>Run lifecycle, playbooks, promotion, dispatch, repair, and local reuse.</p>
  </a>
  <a class="reference-tile" href="./review-runtime.md">
    <span class="reference-kicker">Route family</span>
    <h3>Review</h3>
    <span class="reference-route">/v1/memory/*review*</span>
    <p>Continuity review packs, evolution review packs, and replay repair review.</p>
  </a>
  <a class="reference-tile" href="../runtime/automation.md">
    <span class="reference-kicker">Route family</span>
    <h3>Automation</h3>
    <span class="reference-route">/v1/automations/*</span>
    <p>Validate, create, run, inspect, resume, and cancel Lite automation graphs.</p>
  </a>
  <a class="reference-tile" href="../runtime/sandbox.md">
    <span class="reference-kicker">Route family</span>
    <h3>Sandbox</h3>
    <span class="reference-route">/v1/memory/sandbox/*</span>
    <p>Create sessions, execute bounded commands, and inspect logs and artifacts.</p>
  </a>
</div>

<div class="section-frame">
  <span class="section-label">How to read this page</span>
  <p>Think in route families first, not single endpoints. Most integration mistakes happen when teams read one method in isolation and miss the surrounding continuity loop.</p>
</div>

## Best entry points

Start with the page that matches the runtime surface you are integrating:

- [Memory](./memory.md)
- [Policy Memory and Evolution](./policy-memory.md)
- [Handoff](./handoff.md)
- [Replay and Playbooks](./replay-and-playbooks.md)
- [Review Runtime](./review-runtime.md)
- [SDK Quickstart](../sdk/quickstart.md)
- [Lite Config and Operations](../runtime/lite-config-and-operations.md)
- [Automation](../runtime/automation.md)
- [Sandbox](../runtime/sandbox.md)

<div class="doc-grid">
  <a class="doc-card" href="./memory.md">
    <span class="doc-kicker">Reference family</span>
    <h3>Memory</h3>
    <p>Write, recall, planning, task start, sessions, tools, review packs, and delegation-learning helpers.</p>
  </a>
  <a class="doc-card" href="./policy-memory.md">
    <span class="doc-kicker">Cross-cutting surface</span>
    <h3>Policy Memory and Evolution</h3>
    <p>Read how feedback can materialize policy memory, how review exposes evolution inspect, and how governance retires or reactivates learned policy.</p>
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
  <a class="doc-card" href="./review-runtime.md">
    <span class="doc-kicker">Reference family</span>
    <h3>Review Runtime</h3>
    <p>Continuity review packs, evolution review packs, and replay repair review in the Lite governed subset.</p>
  </a>
</div>

## How to use this section

Use this section in two passes:

1. stay in the docs site for the public surface and family-level understanding
2. only open raw contracts when you need exact field names or source-level debugging

For most integrations, you should not need to start from raw TypeScript files.

## Public route families

| Family | Main job | Start here |
| --- | --- | --- |
| Memory | Write, recall, planning, task start, sessions, lifecycle | [Memory](./memory.md) |
| Policy memory | Persist, inspect, and govern self-evolving policy state | [Policy Memory and Evolution](./policy-memory.md) |
| Handoff | Pause, store, recover, and resume task state | [Handoff](./handoff.md) |
| Replay | Record runs, compile playbooks, promote and reuse | [Replay and Playbooks](./replay-and-playbooks.md) |
| Review | Build continuity/evolution review material and review replay repairs | [Review Runtime](./review-runtime.md) |
| Automation | Validate, create, run, pause, and resume local automation graphs | [Automation](../runtime/automation.md) |
| Sandbox | Execute bounded local runtime actions and inspect logs/artifacts | [Sandbox](../runtime/sandbox.md) |
| Runtime operations | Boot, health, config, Lite boundary | [Lite Runtime](../runtime/lite-runtime.md) |
| SDK integration | Call the runtime from TypeScript | [SDK Quickstart](../sdk/quickstart.md) |

## Common lookup tasks

| If you are trying to answer... | Read this page first |
| --- | --- |
| "How do I ask for a better first action?" | [Memory](./memory.md) |
| "How do I inspect or govern self-evolving policy state?" | [Policy Memory and Evolution](./policy-memory.md) |
| "How do I pause work and resume it later?" | [Handoff](./handoff.md) |
| "How do I turn a successful run into something reusable?" | [Replay and Playbooks](./replay-and-playbooks.md) |
| "How do I validate or run an automation graph?" | [Automation](../runtime/automation.md) |
| "How do I execute bounded local commands and inspect outputs?" | [Sandbox](../runtime/sandbox.md) |
| "How do I get review-ready runtime state?" | [Review Runtime](./review-runtime.md) |
| "Which route families are really in Lite?" | [Lite Runtime](../runtime/lite-runtime.md) |
| "How do I integrate this from code?" | [SDK Quickstart](../sdk/quickstart.md) |

## What the public docs already cover

The docs site already explains:

- the runtime model
- the main continuity surfaces
- the public SDK integration path
- the Lite runtime boundary
- the most important memory, handoff, and replay families

That means the raw repository references should be the second stop, not the first one.

<div class="section-frame">
  <span class="section-label">Reference rule</span>
  <p>Use the docs site for shape and meaning. Use raw contracts only when you need exact field names, support boundaries, or source-level debugging.</p>
</div>

## Raw sources when you need exactness

Sometimes you do need the literal source of truth. Use the raw sources below only when the docs page above is not enough.

### SDK contracts

The main typed SDK request and response shapes live here:

- [`packages/full-sdk/src/contracts.ts`](https://github.com/ostinatocc/AionisCore/blob/main/packages/full-sdk/src/contracts.ts)

Use that file when you need:

- memory request shapes
- replay payload shapes
- handoff envelopes
- automation and sandbox contracts

### Runtime capability matrix

The best raw route-level reference today is:

- [LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md](https://github.com/ostinatocc/AionisCore/blob/main/docs/LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md)

Use it to answer:

1. which routes are supported
2. which are Lite subsets
3. which are conditional
4. which are intentionally unavailable in Lite

### Runtime boundary

For public product boundary and open-core distribution stance:

- [OPEN_CORE_BOUNDARY.md](https://github.com/ostinatocc/AionisCore/blob/main/docs/OPEN_CORE_BOUNDARY.md)

### Package-level references

- [`@ostinato/aionis`](https://github.com/ostinatocc/AionisCore/blob/main/packages/full-sdk/README.md)
- [`@aionis/doc`](https://github.com/ostinatocc/AionisCore/blob/main/packages/aionis-doc/README.md)

## How to use this page

Use this page for the public shape and integration path first.

When you need exact field-level detail, continue into:

1. the repository contract files
2. the capability matrix
3. the SDK contract sources

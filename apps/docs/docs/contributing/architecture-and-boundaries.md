---
title: Architecture And Boundaries
slug: /contributing/architecture-and-boundaries
---

# Architecture and boundaries

If you are contributing to Aionis Runtime or the Aionis Core kernel beneath it, the most important rule is to preserve the product boundary.

<div class="doc-lead">
  <span class="doc-kicker">Contributor framing</span>
  <p>The repository is not trying to become a generic container for every agent feature. Contributions should strengthen continuity: better task starts, stronger handoffs, more reusable replays, and a clearer runtime boundary.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">Task start</span>
    <span class="doc-chip">Handoff integrity</span>
    <span class="doc-chip">Replay quality</span>
    <span class="doc-chip">Runtime boundary</span>
  </div>
</div>

The repository is not meant to become a vague catch-all for every agent feature. The kernel focus remains:

1. learned kickoff quality
2. handoff integrity and recovery quality
3. replay and playbook quality
4. execution-memory and governance substrate quality

## What a good contribution looks like

A good contribution usually does one of these:

- improves kickoff quality for repeated tasks
- makes handoff packets more reliable or more recoverable
- improves replay, playbook compilation, or replay reuse
- strengthens Lite route clarity and public boundary correctness
- improves SDK or host-bridge contract quality for continuity flows

## What usually does not belong

These additions usually do not belong unless they clearly strengthen continuity:

- generic agent features with no task-start, handoff, or replay value
- product surfaces that only make a demo look broader
- hosted control-plane assumptions pushed into Lite
- vague "AI memory" work without execution-oriented behavior

The question to ask is simple:

`Does this make Aionis a stronger continuity runtime, or does it just make the repository bigger?`

## Best reads for contributors

- [RUNTIME_MAINLINE.md](https://github.com/ostinatocc/AionisCore/blob/main/docs/RUNTIME_MAINLINE.md)
- [AIONIS_PRODUCT_DEFINITION_V1.md](https://github.com/ostinatocc/AionisCore/blob/main/docs/AIONIS_PRODUCT_DEFINITION_V1.md)
- [OPEN_CORE_BOUNDARY.md](https://github.com/ostinatocc/AionisCore/blob/main/docs/OPEN_CORE_BOUNDARY.md)
- [LOCAL_RUNTIME_ARCHITECTURE_AND_COMPLETION.md](https://github.com/ostinatocc/AionisCore/blob/main/docs/LOCAL_RUNTIME_ARCHITECTURE_AND_COMPLETION.md)
- [LOCAL_RUNTIME_SOURCE_BOUNDARY.md](https://github.com/ostinatocc/AionisCore/blob/main/docs/LOCAL_RUNTIME_SOURCE_BOUNDARY.md)
- [src/runtime-entry.ts](https://github.com/ostinatocc/AionisCore/blob/main/src/runtime-entry.ts)
- [src/app/runtime-services.ts](https://github.com/ostinatocc/AionisCore/blob/main/src/app/runtime-services.ts)
- [adr/README.md](https://github.com/ostinatocc/AionisCore/blob/main/docs/adr/README.md)

## How to navigate the repo before editing

Use this order when you are orienting yourself:

1. read the product boundary docs first
2. read the Lite architecture docs second
3. read source files only after you know which layer owns the behavior

In practice:

| If you want to change... | Start with... |
| --- | --- |
| Product scope | `RUNTIME_MAINLINE.md`, `AIONIS_PRODUCT_DEFINITION_V1.md` |
| Lite runtime structure | `LOCAL_RUNTIME_ARCHITECTURE_AND_COMPLETION.md` |
| Public boundary | `OPEN_CORE_BOUNDARY.md`, `LOCAL_RUNTIME_SOURCE_BOUNDARY.md` |
| Bootstrap and runtime assembly | `src/runtime-entry.ts`, `src/app/runtime-services.ts` |

## Why the archive layer is not in the main path

The docs site intentionally keeps plans, migration sketches, and historical audits away from first-time readers because those materials are useful for design history, not for explaining the current runtime.

## What stays out of the main public docs path

The docs site intentionally does not place these at the center of the navigation:

- implementation plans
- migration sketches
- cleanup plans
- deep archive material

Those materials still matter. They are just not the right entrypoint for first-time users.

## Contribution rule of thumb

When in doubt, preserve explicitness:

1. explicit route families beat hidden prompt behavior
2. explicit Lite boundaries beat fake local support
3. explicit continuity structures beat vague memory claims

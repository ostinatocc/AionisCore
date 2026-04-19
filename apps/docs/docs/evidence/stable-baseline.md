---
title: Stable Baseline
slug: /evidence/stable-baseline
---

# Stable baseline

This page marks the current `Aionis Runtime` repository state as the stage-stable baseline for the local-first technical beta.

It answers a narrower question than the other evidence pages:

`What is actually complete enough right now to treat as the stable evaluation baseline?`

<div class="doc-lead">
  <span class="doc-kicker">Current baseline</span>
  <p>This is the freeze point for the current phase, not the claim that Aionis is finished. Lite posture is hardened, the public continuity story is evidence-backed, and the first large refactor tranche has already landed without breaking the tested runtime surface.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">Lite technical beta</span>
    <span class="doc-chip">Stage-stable baseline</span>
    <span class="doc-chip">Public SDK</span>
    <span class="doc-chip">194 / 194 lite tests</span>
  </div>
</div>

## What this baseline means

Treat the current repository head as stable enough to evaluate externally because:

1. Lite runtime posture is explicit
2. the self-evolving claim is backed by runnable proof
3. the public SDK and docs point at the same runtime shape
4. the first major maintenance-risk refactor tranche is already done

This baseline is about coherence, not about claiming the product is complete.

## What completed in this phase

<div class="reference-grid">
  <div class="reference-tile">
    <span class="reference-kicker">Runtime posture</span>
    <h3>Lite is explicit now</h3>
    <p>Lite now fails loudly on invalid prod posture, defaults to loopback bind, and treats empty sandbox allowlists as denied instead of silently open.</p>
    <code class="reference-route">lite + prod -> explicit error</code>
  </div>
  <div class="reference-tile">
    <span class="reference-kicker">Proof path</span>
    <h3>Self-evolving is demonstrated</h3>
    <p>Task start improvement, policy memory, governance, provenance, session continuity, and semantic forgetting are all backed by live Lite proofs.</p>
    <code class="reference-route">6 reproducible Lite proofs</code>
  </div>
  <div class="reference-tile">
    <span class="reference-kicker">SDK cleanup</span>
    <h3>Contract drift is shrinking</h3>
    <p>Contracts, route constants, and task-start helpers have started converging instead of remaining duplicated forever across internal and public SDKs.</p>
    <code class="reference-route">contracts -> routes -> taskStart</code>
  </div>
  <div class="reference-tile">
    <span class="reference-kicker">Refactor tranche</span>
    <h3>Major seams are real now</h3>
    <p>The biggest runtime files are no longer single undifferentiated blocks. Planning, write, recall, sandbox, and replay all have real helper seams.</p>
    <code class="reference-route">planning / write / recall / sandbox / replay</code>
  </div>
</div>

## Current verification

These are the signals that make this a baseline rather than a draft:

1. `npm run -s sdk:test` is passing
2. `npm run -s lite:test` is passing at `194/194`
3. the docs site remains part of the baseline and should keep `docs:check` green

## Current code-shape snapshot

The refactor work is not theoretical. The current large-file snapshot is:

| File | Current lines |
| --- | ---: |
| `src/memory/replay.ts` | `3299` |
| `src/memory/recall.ts` | `554` |
| `src/memory/write.ts` | `426` |
| `src/app/planning-summary.ts` | `534` |
| `src/memory/sandbox.ts` | `573` |

The important point is not the absolute line count. It is that these files now act more like orchestration entrypoints than giant mixed-purpose modules.

## What this baseline includes

Use this baseline when evaluating:

- Lite as the shipped runtime shape
- `@ostinato/aionis` as the main public SDK
- task start, handoff, replay, policy memory, governance, and semantic forgetting
- the current evidence path for self-evolving continuity

## What this baseline does not claim

This page is **not** claiming that Aionis is already:

- a hosted control-plane product
- a hardened production network runtime
- the final `Memory v2` operating system
- the full `Tool-Centric AGI Framework`

Those belong to later phases.

## Relationship to the other evidence pages

- [Proof By Evidence](./proof-by-evidence.md) shows the strongest runtime claims through observed runs
- [Self-Evolving Demos](./self-evolving-demos.md) shows how to rerun the proofs
- this page explains why the current repository state is the right temporary freeze point

## Practical rule

If a new change does not strengthen this stable baseline or clearly belong to the next phase, it should not widen the public story yet.

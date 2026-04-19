# Aionis Runtime Stage Baseline (2026-04-20)

Last reviewed: 2026-04-20

Document status: living phase summary and stable-baseline reference

This document freezes the current `Aionis Runtime` repository state as the stage-stable baseline for the local-first technical beta.

Baseline commit: `ff47974`

Use this document when you need the short answer to:

1. what this stage completed
2. what is now considered stable enough to evaluate externally
3. what remains explicitly deferred to the next phase

## 1. What "stage-stable baseline" means here

This baseline does **not** mean the product is feature-complete.

It means the repository has reached a coherent technical-beta state where:

1. the current Lite runtime posture is explicit and no longer drifting
2. the main continuity and execution-memory story is backed by runnable proofs
3. the public SDK and docs are aligned enough to evaluate the runtime honestly
4. the first large refactor tranche has materially reduced the biggest god-files without breaking the runtime contract

This is the version to treat as the stable local-first evaluation baseline before opening the next phase of platform work.

## 2. What this stage completed

### A. Lite posture and release hardening

The current Lite runtime posture is now explicit:

1. `lite + APP_ENV=prod` fails with an explicit posture error
2. Lite defaults to `127.0.0.1` instead of a wide bind
3. sandbox remote allowlists fail closed instead of silently allowing empty policy
4. package release checks run in the release workflow
5. package Node engine floors are aligned

This matters because Lite now behaves like a deliberate local-first runtime shape rather than a partially-open server posture.

### B. Continuity and execution-memory substrate

The runtime now has a coherent public continuity loop:

1. task start
2. structured handoff and resume
3. replay and playbook promotion
4. policy memory and governance
5. semantic forgetting, archive relocation, and differential rehydration
6. agent inspect and review-pack surfaces

This is the point where `Aionis Runtime` stopped looking like a loose set of memory features and started looking like a real self-evolving continuity runtime.

### C. Proof path for the self-evolving claim

The public docs and examples now prove six specific runtime claims through live Lite runs:

1. better second task start
2. policy memory materialization
3. policy governance loop
4. continuity provenance survives promotion
5. session continuity carriers can promote stable workflows
6. semantic forgetting cools memory without deleting it

These proofs matter because they convert the self-evolving claim from positioning language into reproducible runtime behavior.

### D. SDK boundary cleanup started

The repository has now begun converging duplicated SDK logic instead of letting public and internal SDK surfaces drift forever:

1. shared contract sync is in place
2. shared route sync is in place
3. `taskStart` helper logic is shared

This is not the end state yet, but it is the point where contract duplication stopped being an accepted default.

### E. First major god-file refactor tranche

The first heavy refactor pass materially reduced the main orchestration files without breaking the contract-tested runtime surface.

Current large-file snapshot:

| File | Current lines |
| --- | ---: |
| `src/memory/replay.ts` | `3299` |
| `src/memory/recall.ts` | `554` |
| `src/memory/write.ts` | `426` |
| `src/app/planning-summary.ts` | `534` |
| `src/memory/sandbox.ts` | `573` |

The most important result is not the raw numbers. It is that the seams are now real:

1. `planning-summary` is split across execution, routing, surfaces, planner, assembly, and forgetting helpers
2. `write` is split across execution-native, shared, serialization, prepare-batch, post-commit, and shadow-dual helpers
3. `recall` is split across action-packet, ranking, debug/layer, and serialization helpers
4. `sandbox` is split across network, executor, and shared helpers
5. `replay` has been peeled apart across execution, guided repair, compile, repair/shadow, promotion-review, run surfaces, read/compile surfaces, stable-anchor, run-write, and governance helpers

## 3. Current verification at the baseline point

The baseline is backed by green validation at the current head:

1. `npm run -s sdk:test` -> `10/10` passing
2. `npm run -s lite:test` -> `194/194` passing
3. `npm run -s docs:check` should stay green for this baseline

This matters because the baseline is not just a documentation freeze. It is a test-backed freeze point.

## 4. What this baseline includes

Treat these as part of the current stable evaluation story:

1. Lite as the shipped local-first runtime shape
2. `@ostinato/aionis` as the main public SDK surface
3. the six self-evolving proof demos
4. task start, handoff, replay, policy memory, governance, semantic forgetting, and review surfaces
5. the refactored orchestration boundaries already landed in the current source tree

## 5. What this baseline does not claim

This baseline should **not** be positioned as:

1. a hosted control-plane product
2. a hardened production network server runtime
3. the final `Memory v2` operating system
4. the full `Tool-Centric AGI Framework`
5. the end of SDK cleanup or large-file decomposition

Those are next-phase concerns, not claims this baseline needs to carry.

## 6. What moves to the next phase

Once this baseline is accepted, the next phase should focus on:

1. continuing `Memory v2` convergence where it materially changes behavior, not only file shape
2. finishing the highest-value orchestration refactors that still reduce maintenance risk
3. deciding when to open explicit `Action Retrieval` work
4. deferring `Uncertainty Layer` and larger hosted/control-plane work until after the current runtime story is exhausted

## 7. Practical usage rule

Use this baseline when:

1. updating public positioning
2. deciding whether current docs are aligned
3. judging whether the local-first technical beta is coherent enough to show externally
4. checking whether new work belongs in the current phase or the next one

If a change does not strengthen this baseline or clearly belong to the next phase, it should be treated with skepticism.

# Lite Shared Governance Runtime Apply Spec

## Goal

Reduce duplicated narrow runtime-apply gate logic across governed Lite runtime call sites without
changing current state-raise semantics.

## Scope

This slice only unifies the internal gate that decides whether a previously-derived governance
policy effect should request a real runtime state raise.

It covers:

- policy effect absent
- policy effect present but not applicable
- policy effect effective state not matching the allowed applied state
- policy effect requesting the allowed applied state

It does not change:

- replay learning projection policy-effect semantics
- tools feedback pattern-anchor policy-effect semantics
- workflow promotion preview-only behavior
- decision-trace schema
- admissibility rules

## Current duplication

Replay and tools-feedback still hand-roll the same narrow runtime-apply decision:

1. only apply when policy effect exists
2. only apply when policy effect says `applies=true`
3. only apply when effective state equals the one allowed by the call site

## Target

Add one shared helper in `src/memory/governance-shared.ts` for governed state-raise runtime apply
gating, then rebuild replay and tools-feedback on top of it.

## Acceptance

- replay and tools-feedback use the shared runtime-apply helper
- returned route payloads stay unchanged
- targeted governance tests stay green
- `test:lite` stays green

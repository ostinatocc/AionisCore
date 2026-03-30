# Lite Shared Governance State Trace Spec

## Goal

Reduce duplicated stateful decision-trace assembly across governed local runtime call sites without
changing current governance semantics.

## Scope

This slice only unifies the internal helper that assembles:

- shared governance decision-trace base
- base state
- effective state
- runtime-apply changed flag

It does not change:

- replay policy-effect semantics
- tools feedback policy-effect semantics
- workflow promotion preview semantics
- admissibility rules
- runtime apply gates

## Current duplication

Replay, tools feedback, and workflow promotion still each hand-roll parts of the same stateful
decision-trace assembly:

1. build trace base
2. attach base state
3. attach effective state
4. compute runtime change flag or equivalent preview delta

## Target

Add one shared internal helper in `src/memory/governance-shared.ts` for stateful governed
decision-trace assembly and rebuild replay/tools/workflow trace builders on top of it.

## Acceptance

- replay/tools/workflow use the shared state-trace helper
- returned route payloads stay unchanged
- targeted governance tests stay green
- `test:lite` stays green

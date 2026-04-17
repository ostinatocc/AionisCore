Last reviewed: 2026-04-16

Document status: historical implementation plan

# Lite Shared Governance Pipeline Spec

## Goal

Reduce duplicated runtime governance plumbing across live call sites without changing current
governance semantics.

## Scope

This slice only unifies shared pipeline mechanics:

- review trace stage ordering
- admissibility / policy-effect reason code collation
- runtime policy-apply stage append

It does not change:

- review packet schemas
- review result schemas
- admissibility thresholds
- policy-effect semantics
- runtime apply gates

## Current duplication

Two live governance paths currently rebuild the same mechanics separately:

1. replay repair review / `promote_memory`
2. tools feedback / `form_pattern`

Both paths independently construct:

- `review_supplied`
- `admissibility_evaluated`
- `stage_order`
- `reason_codes`
- runtime apply stage append

## Target

Introduce one small internal helper module that provides:

1. shared governance stage enum
2. shared stage-order builder
3. shared reason-code builder
4. shared runtime-apply stage append

Call sites continue owning:

- operation-specific packet construction
- operation-specific admissibility
- operation-specific policy-effect derivation
- operation-specific state fields on decision trace

## Acceptance

- replay and tools-feedback both use the shared helper
- route/test behavior stays unchanged
- `test:lite` remains green

# Lite Shared Promote-Memory Governance Runner Spec

## Goal

Reduce duplicated `promote_memory` governance preview plumbing across live runtime call sites
without changing current governance semantics.

## Scope

This slice introduces one small shared runner for `promote_memory` preview flows:

- build review packet
- accept optional bounded review result
- evaluate admissibility when review is supplied
- hand operation-specific state to policy-effect derivation
- hand shared review/admissibility state to decision-trace builders

It does not change:

- replay apply gates
- workflow promotion apply semantics
- confidence floors
- review packet schema
- review result schema

## Current duplication

Two live paths currently rebuild the same `promote_memory` preview flow separately:

1. replay repair review
2. workflow auto-promotion preview

Both paths repeat:

- packet construction
- optional review-result pass-through
- admissibility evaluation
- policy-effect preview wiring
- decision-trace input shaping

## Target

Introduce one shared internal runner that returns:

- `review_packet`
- `review_result`
- `admissibility`
- operation-specific `policy_effect`
- operation-specific `decision_trace`

Call sites keep ownership of:

- operation-specific policy-effect semantics
- operation-specific decision-trace fields
- runtime apply behavior

## Acceptance

- replay and workflow promotion use the shared runner
- behavior stays unchanged
- targeted governance tests stay green
- `test:lite` stays green

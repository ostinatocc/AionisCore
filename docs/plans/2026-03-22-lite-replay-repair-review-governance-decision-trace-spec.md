Last reviewed: 2026-04-16

Document status: historical implementation plan

# Lite Replay Repair Review Governance Decision Trace Spec

Date: 2026-03-22

## Goal

Add a stable governance decision trace to replay repair review so the runtime can expose:

1. what bounded governance inputs were present
2. which deterministic/runtime decisions ran
3. whether a governance policy effect was applied

This slice does not widen governance authority.

## Scope

Extend replay repair review governance preview with a bounded `decision_trace` under `promote_memory`.

The trace should summarize:

1. whether a review result was supplied
2. whether runtime admissibility passed
3. whether policy effect applied
4. base target rule state
5. effective target rule state
6. whether runtime apply changed projection config

## Contract

`governance_preview.promote_memory.decision_trace` includes:

1. `trace_version`
2. `review_supplied`
3. `admissibility_evaluated`
4. `admissible`
5. `policy_effect_applies`
6. `base_target_rule_state`
7. `effective_target_rule_state`
8. `runtime_apply_changed_target_rule_state`
9. `stage_order`
10. `reason_codes`

## Non-Goals

This slice does not:

1. add new review logic
2. add new policy effect logic
3. alter replay learning writes

## Validation

Route tests should cover:

1. no supplied review
2. supplied but non-admissible review
3. admissible review with policy effect applied
4. admissible review with explicit target state preserved

Last reviewed: 2026-04-16

Document status: historical implementation plan

# Lite Replay Repair Review Governance Policy Apply Spec

Date: 2026-03-22

## Goal

Move replay repair review governance one step forward:

1. keep bounded review packet generation
2. keep bounded review-result admissibility
3. keep bounded policy-effect preview
4. let the policy effect actually influence replay learning projection config

This slice still stays narrow.

## Narrow Runtime Effect

Only one field may be affected:

1. `learning_projection.target_rule_state`

No other replay learning projection fields may be modified by governance in this slice.

## Apply Rule

When all of the following are true:

1. replay repair review is on the approved learning-projection path
2. governance preview exists
3. `policy_effect.applies === true`
4. `policy_effect.effective_target_rule_state === "shadow"`

the runtime should execute replay learning projection with:

1. `target_rule_state = "shadow"`

Otherwise it should keep the original resolved config unchanged.

## Safety

This slice must not:

1. alter enable/disable semantics
2. alter delivery mode
3. alter projection mode
4. alter projection candidate generation
5. change the review packet or admissibility rules

## Validation

Route tests should show:

1. admissible high-value governance review upgrades applied replay rule state to `shadow`
2. low-confidence review keeps applied replay rule state at `draft`
3. explicit request `target_rule_state=draft` preserves `draft`

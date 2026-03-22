# Lite Replay Repair Review Governance Policy Effect Spec

Date: 2026-03-22

## Goal

Extend replay repair review governance from:

1. review packet preview
2. bounded review result intake
3. runtime admissibility assessment

to a first bounded **policy effect preview**.

This slice must not directly change replay learning writes yet.

## Scope

On approved replay repair review paths with learning projection enabled:

1. continue emitting `governance_preview.promote_memory.review_packet`
2. continue accepting optional `governance_review.promote_memory.review_result`
3. continue evaluating runtime admissibility
4. additionally emit `governance_preview.promote_memory.policy_effect`

## Policy Effect Rule

The first rule is intentionally narrow.

The runtime may preview a derived target rule state of `shadow` only when:

1. a bounded `promote_memory` review result is present
2. runtime admissibility is `true`
3. the learning projection request did not explicitly set `target_rule_state`
4. the review recommends `workflow` at `L2`
5. the review marks `strategic_value = high`
6. the base learning projection target state is `draft`

Otherwise:

1. the effective target rule state remains the base state
2. the response still explains why no governance effect applies

## Non-Goals

This slice does not:

1. mutate replay learning projection behavior
2. alter generated rule writes
3. widen public governance routes
4. introduce external model calls

## Route Contract

`ReplayRepairReviewGovernancePreview.promote_memory` gains:

1. `policy_effect.source`
2. `policy_effect.applies`
3. `policy_effect.base_target_rule_state`
4. `policy_effect.review_suggested_target_rule_state`
5. `policy_effect.effective_target_rule_state`
6. `policy_effect.reason_code`

## Validation

Add route coverage for:

1. admissible high-strategic-value review previews `shadow`
2. low-confidence review keeps base state
3. explicit request `target_rule_state` blocks governance override preview

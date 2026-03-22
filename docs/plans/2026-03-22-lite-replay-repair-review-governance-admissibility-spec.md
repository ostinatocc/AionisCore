# Lite Replay Repair Review Governance Admissibility Spec

## Goal

Extend the replay repair review governance preview one small step further:

1. accept an optional bounded `promote_memory` semantic review result
2. run runtime admissibility against the already-generated preview packet
3. return the adjudication result in the existing governance preview surface

## Scope

In scope:

1. request schema support for optional governance review input
2. response schema support for bounded review result plus admissibility
3. replay repair review runtime evaluation using existing `promote_memory` governance helper
4. focused route coverage

Out of scope:

1. changing replay-learning writes
2. making the review result authoritative for actual mutation
3. broadening the pattern to other routes yet

## Contract

The request may optionally include:

1. `governance_review.promote_memory.review_result`

The response may include:

1. `governance_preview.promote_memory.review_packet`
2. `governance_preview.promote_memory.review_result`
3. `governance_preview.promote_memory.admissibility`

The runtime still owns admissibility:

1. if no review result is supplied, only the preview packet is returned
2. if a review result is supplied, runtime evaluates it against the preview packet
3. admissibility does not directly change learning projection behavior yet

## Acceptance

1. approved repair review can accept a bounded `promote_memory` review result
2. response returns runtime admissibility for that review result
3. low-confidence review results become non-admissible
4. current replay-learning behavior stays unchanged

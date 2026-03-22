# Lite Tools Feedback Form-Pattern Governance Preview Spec

Date: 2026-03-22

## Goal

Add the first real `form_pattern` governance preview to a live runtime path by attaching a bounded semantic-review packet and decision trace to `tools/feedback` responses when pattern-anchor formation has enough source evidence.

## Why This Slice

`form_pattern` already has:

1. stable request schema
2. bounded semantic-review packet schema
3. bounded review-result schema
4. deterministic admissibility helper

What it does not yet have is a real runtime-visible call site.

`tools/feedback` is the cleanest next slice because it already:

1. forms or updates pattern anchors
2. has task/error/workflow shaping context
3. has a narrow, route-tested response surface

## Scope

This slice only adds preview and trace.

It does **not**:

1. change pattern-anchor write behavior
2. accept semantic review results yet
3. apply governance policy effects

## Runtime Rules

Governance preview is emitted only when all of the following are true:

1. `tools/feedback` wrote or updated a pattern anchor
2. the path is Lite/runtime-core
3. there are at least `2` source node ids available for `form_pattern`

Preview content:

1. bounded `form_pattern` review packet
2. bounded preview-only decision trace

No preview is returned when the route lacks enough source evidence.

## Contract Additions

Add a stable `ToolsFeedbackResponseSchema` that includes:

1. existing tool-feedback response fields
2. `pattern_anchor`
3. `governance_preview.form_pattern.review_packet`
4. `governance_preview.form_pattern.decision_trace`

The preview trace should only record packet construction for now.

## Validation

Required validation:

1. contract test for the new response shape
2. positive tools-feedback test with two matched rule sources producing a governance preview
3. full `test:lite`

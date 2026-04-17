Last reviewed: 2026-04-16

Document status: historical implementation plan

# Lite Tools Feedback Form-Pattern Governance Policy Effect Spec

Date: 2026-03-22

## Goal

Extend the `tools/feedback` `form_pattern` governance path with a bounded `policy_effect` preview that derives a suggested pattern-state outcome from an admissible semantic review result without changing actual pattern-anchor writes.

## Scope

This slice adds:

1. bounded `policy_effect` preview
2. expanded decision trace with policy-effect stage

This slice does **not**:

1. mutate persisted pattern-anchor state
2. override current pattern promotion logic
3. widen mutation scope beyond preview

## Runtime Rule

Policy effect is previewed from the current anchor state plus admissibility.

The only allowed preview effect is:

1. `provisional -> stable`

The effect applies only when:

1. bounded review is supplied
2. review is admissible
3. current anchor `pattern_state = provisional`
4. review confidence is at least `0.85`

Otherwise the preview keeps the base state.

## Contract Additions

Add to `tools/feedback` governance preview:

1. `policy_effect`
2. decision-trace fields for:
   - `policy_effect_applies`
   - `base_pattern_state`
   - `effective_pattern_state`
   - `stage_order += policy_effect_derived`

## Validation

Required validation:

1. preview-only path shows non-applying policy effect
2. admissible high-confidence review shows `provisional -> stable` preview
3. rejected review keeps `provisional`
4. full `test:lite`

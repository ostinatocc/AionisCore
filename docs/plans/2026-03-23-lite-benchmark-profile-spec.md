# Lite Benchmark Profile Spec

Date: 2026-03-23
Status: implemented

## Goal

Add a stable benchmark suite profile on top of the existing real-task benchmark so Lite can detect structural drift, not only pass/fail drift.

## Scope

The benchmark should keep exporting:

1. scenario-level status and score
2. suite-level score
3. a stable `suite_profile`

The profile should summarize a narrow set of execution-memory invariants that are expected to stay stable across normal refactors.

## Profile Shape

The initial profile should include:

1. policy-learning revalidation counts
2. workflow progression stable-count checkpoints
3. multi-step repair stable-count checkpoints
4. governed learning target states
5. governed replay target states
6. provider-precedence override-blocking signals
7. custom model-client replacement results
8. slim-surface boundary booleans

## Regression Gate

When a baseline artifact is supplied, benchmark compare should also compute:

1. `changed_profile_keys`

And a caller should be able to fail the run with:

1. `--fail-on-profile-drift`

This gate is intentionally strict. It is for stable benchmark baselines, not for exploratory runs.

## Validation Flow

`scripts/lite-real-validation.sh` should pass the profile-drift gate through when a baseline is provided, while still writing all artifacts outside the repository tree.

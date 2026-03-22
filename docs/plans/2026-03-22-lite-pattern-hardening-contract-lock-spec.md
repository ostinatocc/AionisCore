# Aionis Lite Pattern Hardening Contract Lock Spec

## Goal

Make Lite's existing pattern trust-hardening metadata part of the stable runtime contract, so selector and introspection surfaces expose the same explainable hardening state that already exists on stored anchors.

## Problem

Lite already persists compact hardening metadata on pattern anchors:

1. `task_family`
2. `error_family`
3. distinct family counts
4. post-contest fresh-run counts
5. promotion and revalidation gate markers
6. task-affinity weighting state

But this state is still under-locked at the runtime surface level:

1. `tools/select` exposes affinity and credibility, but not the hardening metadata as a stable route contract
2. `execution/introspect` exposes trust state and lifecycle, but not the full hardening metadata as a first-class runtime-visible object
3. contract tests therefore do not yet protect this metadata from accidental response drift

## Design Principles

1. do not change live trust semantics
2. do not widen the default planner/context surface
3. reuse the existing `trust_hardening` schema family
4. expose only already-computed metadata
5. keep the output explainable and deterministic

## Chosen Scope

This slice exposes existing hardening metadata on two runtime surfaces:

1. `POST /v1/memory/tools/select`
   - under `pattern_matches.anchors[*].trust_hardening`
2. `POST /v1/memory/execution/introspect`
   - under `candidate_patterns[*].trust_hardening`
   - under `trusted_patterns[*].trust_hardening`
   - under `contested_patterns[*].trust_hardening`
   - under `pattern_signals[*].trust_hardening`

The metadata should remain the same object shape already stored on anchors:

1. `task_family`
2. `error_family`
3. `observed_task_families`
4. `observed_error_families`
5. `distinct_task_family_count`
6. `distinct_error_family_count`
7. `post_contest_observed_run_ids`
8. `post_contest_distinct_run_count`
9. `promotion_gate_kind`
10. `promotion_gate_satisfied`
11. `revalidation_floor_kind`
12. `revalidation_floor_satisfied`
13. `task_affinity_weighting_enabled`

## Non-Goals

This slice does not:

1. change promotion thresholds
2. change contested revalidation behavior
3. alter selector ordering
4. add hardening metadata to default planner/context packets
5. introduce new routes

## Runtime Surface Expectations

After this slice:

1. route-level selection output can explain *why* a pattern is trusted or still gated
2. introspection can show hardening state without reconstructing anchor internals manually
3. benchmark and route tests can lock the hardened model more explicitly

## Testing Requirements

Minimum required validation:

1. `tools/select` returns `trust_hardening` for matched pattern anchors
2. `execution/introspect` returns `trust_hardening` for trusted and contested pattern entries
3. `pattern_signals` in introspection also preserve the same metadata
4. existing selector and introspection behavior remains unchanged otherwise

## Success Criteria

This slice is successful when:

1. hardening metadata becomes runtime-visible on selector and introspection surfaces
2. contract tests lock the exact presence of those fields
3. no default planner/context surface grows heavier

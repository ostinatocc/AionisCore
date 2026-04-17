# Aionis Core 0.1.0 Release Note

Last reviewed: 2026-04-16

Historical status:

`release snapshot`

This release note intentionally preserves the 0.1.0 baseline as it was shipped. Do not read its benchmark numbers or package posture as the current repository baseline.

Release date: 2026-03-21

## Summary

`Aionis Core 0.1.0` is the first release baseline for the Aionis Core kernel.

This baseline establishes:

1. a local execution-memory kernel
2. a SQLite-backed continuity runtime
3. stable workflow guidance projected from execution continuity
4. tool-selection learning driven by recorded feedback

## Core Additions In 0.1.0

The `0.1.0` baseline includes:

1. a stable execution-memory-first planner/context surface
2. workflow progression from structured execution continuity into planner-visible workflow guidance
3. policy learning with `candidate`, `trusted`, `contested`, and `revalidated` pattern states
4. trust hardening with:
   - `3` distinct positive runs required before `trusted`
   - `2` fresh post-contest runs required before revalidation
   - task-affinity-weighted selector reuse
5. a slim default planner/context surface with explicit inspection paths
6. a repeatable real-task benchmark suite with an original `8/8 PASS` baseline

## Core Runtime Loops

This release baseline treats two loops as core behavior:

1. `Anchor-Guided Rehydration Loop`
   `stable execution -> workflow anchor -> recall -> runtime hint -> optional rehydration`
2. `Execution Policy Learning Loop`
   `feedback -> pattern -> recall -> selector reuse`

## Validation

Release validation for `0.1.0` is based on:

1. `npm run test:lite`
2. `npm run benchmark:lite:real`
3. `npm run smoke:lite`
4. `npm run smoke:lite:local-process`

Original `0.1.0` validation result:

1. `test:lite` passed
2. `benchmark:lite:real` passed with `8/8 PASS` and `100% suite score`
3. `smoke:lite` passed
4. `smoke:lite:local-process` passed

The benchmark baseline covers:

1. `policy_learning_loop`
2. `cross_task_isolation`
3. `nearby_task_generalization`
4. `contested_revalidation_cost`
5. `wrong_turn_recovery`
6. `workflow_progression_loop`
7. `multi_step_repair_loop`
8. `slim_surface_boundary`

Related report:

1. [LOCAL_RUNTIME_REAL_TASK_BENCHMARK_REPORT.md](LOCAL_RUNTIME_REAL_TASK_BENCHMARK_REPORT.md)

## Current Technical Maturity

As of `2026-03-23`, the current Lite baseline has advanced materially beyond the original `0.1.0` validation snapshot.

Current practical validation status:

1. `benchmark:lite:real` passes at `14/14 PASS`
2. benchmark baseline/profile regression gates are part of validation posture
3. replay, workflow, and tools all have bounded governance paths
4. Lite has passed an external HTTP governance shadow benchmark against an Anthropic-compatible backend with outcome match across:
   - workflow
   - tools
   - replay

## Recommended Reading

1. [AIONIS_PRODUCT_DEFINITION_V1.md](AIONIS_PRODUCT_DEFINITION_V1.md)
2. [AIONIS_RUNTIME_CAPABILITY_AUDIT_V1.md](AIONIS_RUNTIME_CAPABILITY_AUDIT_V1.md)
3. [LOCAL_RUNTIME_REAL_TASK_BENCHMARK_REPORT.md](LOCAL_RUNTIME_REAL_TASK_BENCHMARK_REPORT.md)

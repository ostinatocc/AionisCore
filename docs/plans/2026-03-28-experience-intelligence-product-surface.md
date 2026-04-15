# 2026-03-28 Experience Intelligence Product Surface

## Goal

Turn `experience_intelligence` into a clean kernel capability surface for Aionis Core:

- learned history improves the next tool choice
- learned history improves the next path choice
- upper layers can consume one stable kickoff surface

This document intentionally narrows scope.
It does not redesign Claude integration.
It does not add new governance layers.

## What We Learned

The current mainline is directionally correct but the default read surface is too wide.

Current problems:

1. The same learned recommendation is mirrored across multiple surfaces.
   - `experience_intelligence.recommendation`
   - `planning_summary.experience_intelligence_summary`
   - `assembly_summary.experience_intelligence_summary`
   - top-level `first_step_recommendation`

2. Default product surfaces and debug/operator surfaces are mixed.
   - `planning_context` and `context_assemble` currently expose more than an upper layer should need.

3. Write-side learning identities are not yet clean.
   - `task_signature`
   - `workflow_signature`
   - tools-pattern identity
   are not fully separated.

## Product Decision

The default product surface must be:

- one learned kickoff recommendation

That surface is:

- `first_step_recommendation`

It is the only field upper layers should need in the default planning/context path.

## Default Product Surface

`first_step_recommendation` must carry:

- `source_kind`
- `history_applied`
- `selected_tool`
- `file_path`
- `next_action`

This is the stable output for:

- planner kickoff
- task start recommendation
- upper-layer first-step suggestion

## What Leaves the Default Surface

These should not remain on the default `planning_context` and `context_assemble` product surface:

1. top-level `experience_intelligence`
2. `planning_summary.experience_intelligence_summary`
3. `assembly_summary.experience_intelligence_summary`

These are either:

- duplicated mirrors
- internal derivation payloads
- or debug/operator-oriented detail

## What Stays Available

The dedicated route:

- `POST /v1/memory/experience/intelligence`

remains the deeper recommendation surface.

Delegation-learning detail should follow the same rule:

- keep it on the dedicated `experience_intelligence` surface
- if planning/context routes need to expose it for operator debugging, place it under `layered_context`
- do not mirror it into the default `planning_summary` / `assembly_summary` product surface

But it should eventually be slimmed so the formal product response focuses on:

- `history_applied`
- `selected_tool`
- `path_source_kind`
- `file_path`
- `target_files`
- `next_action`
- `combined_next_action`
- `rationale.summary`

Internal detail such as:

- full `tools`
- full `experience_signals`

should move to explicit debug/operator surfaces later.

## Execution Order

### Step 1

Clean the default read-side product surface:

- keep `first_step_recommendation`
- remove mirrored `experience_intelligence` from default planning/context responses
- remove `experience_intelligence_summary` from planning/assembly summaries

### Step 2

Slim the dedicated `experience_intelligence` route:

- keep recommendation-level product fields
- move debug-heavy payload behind a non-default surface

### Step 3

Fix write-side learning identities:

- separate workflow identity from pattern identity
- stop using tools-pattern `workflow_signature` as a pattern hash carrier
- make feedback attach to stable identities

### Step 4

Make workflow governance control writes rather than merely annotating them.

## Success Criteria

The read-side product surface is considered clean when:

1. `planning_context` exposes one default learned kickoff field:
   - `first_step_recommendation`
2. the same learned recommendation is no longer mirrored in multiple default summaries
3. upper layers can consume kickoff guidance without parsing internal memory payloads
4. future evolution of learning recommendation requires changing one default contract, not many

## Product Metrics

The kickoff surface should be evaluated with product-facing repeated-task metrics rather than storage growth.

Current benchmark metrics:

1. `kickoff_hit_rate_after_learning`
   - whether learned history changes kickoff into the expected first-step recommendation
   - current fixture target: `1`

2. `path_hit_rate_after_learning`
   - whether learned history resolves to the expected file-level path, not only the expected tool
   - current fixture target: `1`

3. `stale_memory_interference_rate`
   - whether unrelated queries are incorrectly forced onto prior learned guidance
   - current fixture target: `0`

4. `repeated_task_cost_reduction_steps`
   - whether the learned kickoff removes at least one otherwise-manual step on the repeated task path
   - current fixture target: `>= 1`

These metrics are now reported by:

- [lite-real-task-benchmark.ts](../../scripts/lite-real-task-benchmark.ts)
- [LOCAL_RUNTIME_REAL_TASK_BENCHMARK_REPORT.md](../LOCAL_RUNTIME_REAL_TASK_BENCHMARK_REPORT.md)

Current repeated-task fixtures now span five families:

- `repair_export`
- `repair_billing_retry`
- `config_fix_vite`
- `migration_repair`
- `content_transformation`

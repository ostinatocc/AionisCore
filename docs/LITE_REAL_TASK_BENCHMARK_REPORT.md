# Aionis Real-Task Benchmark Report

Last updated: 2026-03-21

## Summary

The current Aionis real-task benchmark baseline passes in full:

1. `passed_scenarios = 8`
2. `total_scenarios = 8`
3. `score_pct = 100`

This benchmark suite is intended to show product-value behavior, not just narrow route correctness. It exercises live Aionis HTTP routes and fresh SQLite-backed runtimes.

Primary runner:

1. [scripts/lite-real-task-benchmark.ts](../scripts/lite-real-task-benchmark.ts)

Related benchmark spec and plan:

1. [docs/plans/2026-03-21-lite-real-task-benchmark-suite-spec.md](plans/2026-03-21-lite-real-task-benchmark-suite-spec.md)
2. [docs/plans/2026-03-21-lite-real-task-benchmark-suite.md](plans/2026-03-21-lite-real-task-benchmark-suite.md)

## Current Result

Overall result:

1. `8/8 PASS`
2. `100% suite score`

Scenarios:

1. `policy_learning_loop`
2. `cross_task_isolation`
3. `nearby_task_generalization`
4. `contested_revalidation_cost`
5. `wrong_turn_recovery`
6. `workflow_progression_loop`
7. `multi_step_repair_loop`
8. `slim_surface_boundary`

## What The Result Means

The current baseline shows:

1. Aionis learns tool policy from repeated successful use, but no longer trusts that policy after only two successes.
2. Aionis now requires `3` distinct positive runs before a pattern becomes `trusted`.
3. Aionis now requires `2` fresh post-contest runs before a contested pattern is revalidated.
4. Selector reuse is no longer flat across tasks; it now uses task-affinity weighting.
5. A materially different task can still recall a trusted pattern, but it does not automatically reuse it as trusted guidance.
6. A nearby task in the same task family can still benefit from learned reuse.
7. Repeated structured execution continuity can still progress into stable workflow guidance.
8. The default planner/context product surface remains slim while the heavy inspection surface stays available only on explicit debug/operator paths.

## Scenario Highlights

### 1. Policy Learning

Result:

1. `candidate` appears after the first positive feedback
2. `trusted` appears after the third distinct positive feedback
3. `contested` appears after negative counter-evidence
4. `revalidated_to_trusted` appears only after two fresh post-contest runs

Key observed metrics:

1. `candidate_pattern_count_after_first = 1`
2. `trusted_pattern_count_after_third = 1`
3. `contested_pattern_count_after_negative = 1`
4. `trusted_pattern_count_after_revalidation = 1`

### 2. Cross-Task Isolation

Result:

1. source-task trusted reuse still works after explicit rule disable
2. a materially different task does not inherit flat trusted reuse
3. the different task only recalls the pattern as lower-affinity visibility

Key observed metrics:

1. `source_task_selected_tool_after_rule_disable = "edit"`
2. `different_task_selected_tool = "bash"`
3. `different_task_recalled_affinity_levels = ["broader_similarity"]`
4. `cross_task_bleed_observed = false`

### 3. Nearby-Task Generalization

Result:

1. a nearby task with the same `task_family` still benefits from trusted reuse
2. that reuse now surfaces as affinity-weighted reuse rather than flat reuse

Key observed metrics:

1. `nearby_task_selected_tool = "edit"`
2. `nearby_task_used_trusted_pattern_affinity_levels = ["same_task_family"]`

### 4. Contested Revalidation Cost

Result:

1. duplicate positive evidence does not restore trust
2. one fresh positive run is still not enough
3. two fresh post-contest runs are required

Key observed metrics:

1. `contested_revalidation_fresh_runs_needed = 2`
2. `duplicate_positive_revalidated = false`
3. `trusted_pattern_count_after_first_fresh_positive = 0`
4. `trusted_pattern_count_after_second_fresh_positive = 1`

### 5. Wrong-Turn Recovery

Result:

1. a wrong-turn negative feedback immediately strips trusted reuse
2. selector falls back away from the contested path
3. trusted reuse only returns after deliberate recovery evidence

Key observed metrics:

1. `selected_before_negative = "edit"`
2. `contested_selected_tool = "bash"`
3. `recovered_selected_tool = "edit"`

### 6. Workflow Progression

Result:

1. repeated structured execution continuity still turns into planner-visible workflow guidance
2. workflow maturity changes are reflected on the default product surface

Key observed metrics:

1. `candidate_workflows_after_first = 1`
2. `observing_workflow_count_after_first = 1`
3. `recommended_workflows_after_second = 1`
4. `stable_workflow_count_after_second = 1`

### 7. Multi-Step Repair Continuity

Result:

1. a longer inspect/patch/validate sequence still converges into one stable workflow
2. later steps do not reopen duplicate candidates once stable workflow guidance exists

Key observed metrics:

1. `step_count = 3`
2. `stable_workflow_count_after_patch = 1`
3. `stable_workflow_count_after_validate = 1`
4. `continuity_projection_decisions_after_validate.skipped_stable_exists = 1`

### 8. Slim Surface Boundary

Result:

1. default `planning_context` remains slim
2. explicit debug `context_assemble` still exposes the heavy assembly surface

Key observed metrics:

1. `planning_has_layered_context = false`
2. `assemble_has_layered_context = true`

## Current Product Interpretation

As of this baseline, Aionis can reasonably claim all of the following:

1. it learns and governs tool-use policy rather than merely caching prior choices
2. it carries stable workflow guidance across repeated structured execution continuity
3. it prevents the most obvious cross-task trusted-pattern bleed
4. it preserves beneficial nearby-task reuse through task-affinity weighting
5. it keeps the default planner/context surface slim while maintaining separate heavy inspection paths

## Limits Of This Report

This report does not claim that Aionis is finished or production-hardened in every dimension.

It does not yet benchmark:

1. long cross-thread continuation chains
2. broader multi-tool sequencing beyond the current fixed slices
3. operator intervention loops as a dedicated benchmark category
4. hosted/server deployment characteristics

## How To Reproduce

Run:

```bash
npm run benchmark:lite:real
```

JSON output:

```bash
npx tsx scripts/lite-real-task-benchmark.ts --json
```

Persist artifacts:

```bash
npx tsx scripts/lite-real-task-benchmark.ts --out-json /tmp/lite-benchmark.json --out-md /tmp/lite-benchmark.md
```

Compare against a baseline:

```bash
npx tsx scripts/lite-real-task-benchmark.ts --baseline-json /tmp/lite-benchmark.json
```

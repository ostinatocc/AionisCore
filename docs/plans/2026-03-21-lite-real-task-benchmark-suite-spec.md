# Aionis Lite Real-Task Benchmark Suite Spec

## Goal

Add a repeatable `Lite` benchmark suite that measures execution-memory product value through live route behavior instead of only static contract tests.

The benchmark suite should answer:

1. does Lite learn execution policy from repeated successful tool use
2. does Lite correct that policy when counter-evidence appears
3. does Lite turn repeated structured execution continuity into planner-visible workflow guidance
4. does Lite carry that workflow guidance through a longer inspect/patch/validate repair sequence
5. does the default planner/context surface stay slim while the heavy inspection surface remains available

## Problem

Lite now has strong route contracts and real validation coverage, but those validations still live mostly as:

1. one-off route tests
2. one-off validation writeups
3. manual operator walkthroughs

This leaves a product gap:

1. we can prove the runtime works
2. but we do not yet have a single repeatable benchmark command that demonstrates why the runtime is valuable
3. and we do not yet have a standard benchmark summary that can be compared across future changes

## Design Principles

1. benchmark real route behavior, not helper functions
2. keep the first slice Lite-native and SQLite-backed
3. prefer fresh temporary databases per scenario
4. verify both route contract and product-value transitions
5. keep the suite outside default CI until it stabilizes
6. produce structured output that can later feed reports or automation

## Scope

The current suite should benchmark eight scenarios:

1. `policy_learning_loop`
2. `cross_task_isolation`
3. `nearby_task_generalization`
4. `contested_revalidation_cost`
5. `wrong_turn_recovery`
6. `workflow_progression_loop`
7. `multi_step_repair_loop`
8. `slim_surface_boundary`

These are the highest-signal demonstrations of current Lite value.

## Scenario 1: Policy Learning Loop

This scenario should exercise:

1. `POST /v1/memory/tools/select`
2. `POST /v1/memory/tools/feedback`
3. `POST /v1/memory/execution/introspect`

Expected benchmark progression:

1. first positive feedback creates `candidate`
2. third independent positive feedback promotes `trusted`
3. negative feedback moves the pattern to `contested`
4. only two fresh distinct positive runs after contest revalidate it back to `trusted`

The benchmark should record:

1. pattern counts by stage
2. selector provenance text
3. transition names observed

## Scenario 2: Cross-Task Isolation

This scenario should exercise:

1. `POST /v1/memory/tools/select`
2. `POST /v1/memory/tools/feedback`
3. a follow-up `POST /v1/memory/tools/select` after the source rule is disabled

Expected benchmark progression:

1. one task family learns a trusted pattern
2. that same task family still reuses the trusted pattern after explicit rule preference is removed
3. a nearby but materially different task context is probed for affinity-weighted recall
4. the benchmark records whether current runtime behavior shows flat trusted reuse bleed or only lower-affinity recall visibility

The benchmark should record:

1. selected tool on the source task after rule disable
2. selected tool on the different task
3. trusted-pattern counts, affinity labels, and provenance text for both selections
4. whether cross-task bleed was observed

## Scenario 3: Nearby-Task Generalization

This scenario should exercise:

1. `POST /v1/memory/tools/select`
2. `POST /v1/memory/tools/feedback`
3. a nearby-task `POST /v1/memory/tools/select` after the source rule is disabled

Expected benchmark progression:

1. one task learns a trusted pattern
2. a nearby task with the same `task_family` but a different `task_signature` is evaluated
3. the benchmark confirms that beneficial reuse survives through `same_task_family`

The benchmark should record:

1. selected tool on the nearby task
2. used trusted pattern tools
3. used affinity levels
4. provenance text for the nearby-task selection

## Scenario 4: Contested Revalidation Cost

This scenario should exercise:

1. `POST /v1/memory/tools/select`
2. `POST /v1/memory/tools/feedback`
3. `POST /v1/memory/execution/introspect`

Expected benchmark progression:

1. the pattern first reaches `trusted`
2. one negative feedback moves it to `contested`
3. a duplicate positive on an already-counted run does not restore trust
4. two fresh distinct positive runs restore `trusted`

The benchmark should record:

1. whether duplicate positive evidence was enough to revalidate
2. how many fresh runs were needed after contest
3. transition names and post-step pattern counts

## Scenario 5: Wrong-Turn Recovery

This scenario should exercise:

1. `POST /v1/memory/tools/select`
2. `POST /v1/memory/tools/feedback`
3. selector behavior before contest, during contested recovery, and after revalidation

Expected benchmark progression:

1. the source task first reaches `trusted`
2. one wrong-turn negative feedback moves the pattern into `contested`
3. selector immediately stops trusting the learned path
4. two fresh recovery runs are required before trusted reuse returns

The benchmark should record:

1. selected tool before negative feedback
2. selected tool while contested
3. selected tool after revalidation
4. contested and recovered provenance text

## Scenario 6: Workflow Progression Loop

This scenario should exercise:

1. `POST /v1/memory/write`
2. `POST /v1/memory/planning/context`
3. `POST /v1/memory/execution/introspect`

Expected benchmark progression:

1. first structured execution-continuity write produces candidate workflow guidance
2. second unique write for the same signature produces stable workflow guidance
3. planner packet and introspection stay aligned on the maturity change

The benchmark should record:

1. candidate vs recommended workflow counts
2. planner explanation text
3. workflow signal summary

## Scenario 7: Multi-Step Repair Loop

This scenario should exercise:

1. `POST /v1/memory/events`
2. `POST /v1/memory/planning/context`
3. `POST /v1/memory/execution/introspect`

Expected benchmark progression:

1. an inspect step creates one observing workflow candidate
2. a patch step for the same repair signature upgrades the run into stable workflow guidance
3. a later validate step keeps the stable workflow instead of reopening duplicate candidate rows
4. continuity-producer explain output shows the later step as `skipped_stable_exists`

The benchmark should record:

1. planner explanation text after inspect, patch, and validate
2. observing versus stable workflow counts across the three steps
3. continuity projection decision counts after the final step

## Scenario 8: Slim Surface Boundary

This scenario should exercise:

1. default `POST /v1/memory/planning/context`
2. debug `POST /v1/memory/context/assemble` with `return_layered_context=true`

Expected benchmark behavior:

1. default planner/context output remains slim
2. debug/operator output still exposes `layered_context`

The benchmark should record:

1. presence or absence of `layered_context`
2. product-vs-debug surface distinction in one result set

## Output Contract

The benchmark command should:

1. print a concise human-readable summary by default
2. support `--json` for machine-readable output
3. support `--out-json <path>` for artifact persistence
4. support `--out-md <path>` for a lightweight benchmark report artifact
5. support `--baseline-json <path>` to compare the current run against a prior benchmark artifact
6. emit per-scenario:
   1. `status`
   2. `duration_ms`
   3. `score_pct`
   4. `pass_criteria_summary`
   5. `assertions`
   6. `metrics`
   7. `notes`
    8. optional `compare_summary`
7. emit suite-level:
   1. `passed_scenarios`
   2. `total_scenarios`
   3. `score_pct`
   4. optional `compare_summary`

## Non-Goals

Phase 1 should not:

1. measure hosted/server performance
2. benchmark arbitrary prompt quality across external models
3. replace the existing route-contract suite
4. become part of the default `test:lite` command

## Success Criteria

Phase 1 is successful when:

1. the repository exposes one repeatable benchmark command
2. the command demonstrates Lite value across policy learning, cross-task isolation, nearby-task generalization, contested revalidation cost, wrong-turn recovery, workflow progression, multi-step repair continuity, and slim-surface behavior
3. failures are understandable from the benchmark output itself
4. no new default runtime surfaces are introduced

## Follow-On Work

Once Phase 1 is stable, follow-on work should include:

1. a `real-validation` section in the testing strategy
2. baseline benchmark snapshots for release comparison
3. extension toward more task-shaped benchmarks instead of route-shaped scenarios

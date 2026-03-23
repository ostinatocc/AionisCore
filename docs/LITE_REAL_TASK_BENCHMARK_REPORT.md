# Aionis Real-Task Benchmark Report

Last updated: 2026-03-23

## Summary

The current Aionis real-task benchmark baseline passes in full:

1. `passed_scenarios = 14`
2. `total_scenarios = 14`
3. `score_pct = 100`

This benchmark suite is intended to demonstrate product behavior, not just narrow route correctness.
It exercises live Aionis HTTP routes and fresh SQLite-backed runtimes.

Primary runner:

1. [scripts/lite-real-task-benchmark.ts](../scripts/lite-real-task-benchmark.ts)

## Current Result

Overall result:

1. `14/14 PASS`
2. `100% suite score`

Current scenarios:

1. `policy_learning_loop`
2. `cross_task_isolation`
3. `nearby_task_generalization`
4. `contested_revalidation_cost`
5. `wrong_turn_recovery`
6. `workflow_progression_loop`
7. `multi_step_repair_loop`
8. `governed_learning_runtime_loop`
9. `governed_replay_runtime_loop`
10. `governance_provider_precedence_runtime_loop`
11. `custom_model_client_runtime_loop`
12. `http_model_client_runtime_loop`
13. `http_model_client_shadow_compare_runtime_loop`
14. `slim_surface_boundary`

## External Shadow Validation

The benchmark suite now also includes real external governance shadow validation.

Current validated external shadow result:

1. backend kind: `external`
2. transport: `anthropic_messages_v1`
3. backend family: Anthropic-compatible HTTP
4. current verified model path: external HTTP governance client
5. current outcome:
   - `workflow_state_match = true`
   - `tools_state_match = true`
   - `replay_state_match = true`

Interpretation:

1. Aionis Lite is no longer only benchmarked against builtin/static governance
2. it has now been benchmarked against a real external LLM governance backend in shadow mode
3. the current external backend preserves governed outcomes across workflow, tools, and replay on the benchmark suite

## What The Result Means

The current baseline shows:

1. Aionis learns tool policy from repeated successful use, but does not trust it after only one or two positives
2. pattern trust hardening is real:
   - `3` distinct positive runs before `trusted`
   - `2` fresh post-contest runs before revalidation
3. selector reuse is affinity-weighted rather than flat across tasks
4. repeated structured execution continuity turns into stable workflow guidance
5. longer inspect/patch/validate sequences converge into one stable workflow instead of reopening duplicate candidates
6. provider-backed governed workflow promotion is real on the write path
7. provider-backed governed pattern formation is real on the tools path
8. provider-backed replay learning is real on the replay path
9. explicit governance reviews override provider fallback where expected
10. custom internal model-client replacement hooks are real on live runtime paths
11. HTTP model-client replacement hooks are real on live runtime paths
12. external HTTP shadow compare currently preserves the same governed outcomes as builtin/static governance
13. the default planner/context surface remains slim

## Scenario Highlights

### 1. Policy Learning

Result:

1. `candidate` appears after first positive feedback
2. `trusted` appears after the third distinct positive feedback
3. `contested` appears after negative counter-evidence
4. revalidation requires two fresh post-contest runs

Key observed metrics:

1. `candidate_pattern_count_after_first = 1`
2. `trusted_pattern_count_after_third = 1`
3. `contested_pattern_count_after_negative = 1`
4. `trusted_pattern_count_after_revalidation = 1`

### 2. Cross-Task Isolation And Nearby-Task Generalization

Result:

1. source-task trusted reuse still works after explicit rule disable
2. materially different tasks do not inherit flat trusted reuse
3. nearby tasks in the same family still benefit from trusted reuse

Key observed metrics:

1. `cross_task_bleed_observed = false`
2. `different_task_recalled_affinity_levels = ["broader_similarity"]`
3. `nearby_task_used_trusted_pattern_affinity_levels = ["same_task_family"]`

### 3. Contested Recovery

Result:

1. duplicate positive evidence does not restore trust
2. one fresh positive run is still not enough
3. two fresh post-contest runs restore trusted state

Key observed metrics:

1. `contested_revalidation_fresh_runs_needed = 2`
2. `duplicate_positive_revalidated = false`

### 4. Workflow Progression

Result:

1. repeated continuity writes become planner-visible workflow guidance
2. stable workflow guidance remains visible on the default product surface

Key observed metrics:

1. `candidate_workflows_after_first = 1`
2. `stable_workflow_count_after_second = 1`

### 5. Multi-Step Repair Continuity

Result:

1. a three-step inspect/patch/validate arc converges into one stable workflow
2. later steps do not reopen duplicate candidates once stable workflow guidance exists

Key observed metrics:

1. `stable_workflow_count_after_patch = 1`
2. `stable_workflow_count_after_validate = 1`
3. `continuity_projection_decisions_after_validate.skipped_stable_exists = 1`

### 6. Governed Learning On Live Runtime Paths

Result:

1. provider-backed governed workflow promotion is real on write-driven workflow learning
2. provider-backed governed pattern formation is real on tools feedback
3. provider-backed replay learning is real on replay repair review

Key observed metrics:

1. `governed_learning.workflow_promotion_state = "stable"`
2. `governed_learning.tools_pattern_state = "stable"`
3. `governed_learning.tools_credibility_state = "trusted"`
4. `governed_replay.replay_learning_rule_state = "shadow"`
5. `governed_replay.stable_workflow_count_after_replay = 1`

### 7. Governance Precedence And Replacement Hooks

Result:

1. explicit governance reviews override provider fallback
2. custom `modelClientFactory` replacements can take over workflow, tools, and replay
3. HTTP model-client replacements can also take over workflow, tools, and replay

Key observed metrics:

1. `governance_provider_precedence.workflow_provider_override_blocked = false`
2. `governance_provider_precedence.tools_provider_override_blocked = false`
3. `custom_model_client.workflow_governed_state = "stable"`
4. `http_model_client.workflow_governed_state = "stable"`

### 8. External HTTP Shadow Compare

Result:

1. external HTTP governance preserves workflow outcome
2. external HTTP governance preserves tools outcome
3. external HTTP governance preserves replay outcome
4. reason text can still differ while governed outcome stays aligned

Key observed metrics:

1. `http_shadow_compare.workflow_state_match = true`
2. `http_shadow_compare.tools_state_match = true`
3. `http_shadow_compare.replay_state_match = true`

### 9. Slim Surface Boundary

Result:

1. default `planning_context` remains slim
2. explicit debug `context_assemble` still exposes heavy inspection output

Key observed metrics:

1. `planning_has_layered_context = false`
2. `assemble_has_layered_context = true`

## Benchmark Profile And Regression Use

The benchmark suite now serves three purposes at once:

1. demonstrate current product value
2. produce a stable baseline artifact
3. enforce regression gates on:
   - status
   - suite/scenario score
   - hard/soft profile drift
   - HTTP governance contract drift

Important benchmark profile families now include:

1. workflow progression and multi-step repair progression
2. governed workflow/tools/replay outcome states
3. explicit-provider precedence outcomes
4. custom model-client replacement outcomes
5. HTTP model-client replacement outcomes
6. HTTP external shadow compare outcome-match signals
7. HTTP prompt contract versions
8. HTTP response schema versions
9. slim surface boundary signals

## Current Product Interpretation

As of this baseline, Aionis can reasonably claim all of the following:

1. it learns and governs tool-use policy instead of only caching prior choices
2. it carries stable workflow guidance across repeated structured execution continuity
3. it prevents the most obvious cross-task trusted-pattern bleed while preserving nearby-task generalization
4. it exposes real governed mutation behavior on replay, workflow, and tools paths
5. it supports internal model-client replacement through live runtime paths
6. it supports HTTP governance model-backed behavior through live runtime paths
7. it has now been validated against a real external LLM governance backend in shadow mode without governed outcome drift on the benchmark suite

## Limits Of This Report

This report does not claim that Aionis is finished or production-hardened in every dimension.

It does not yet benchmark:

1. broader multi-day or cross-thread lifecycle arcs
2. maintenance batch operations as a first-class product loop
3. latency, retry, and budget posture for external governance as a production default
4. broadly hosted deployment characteristics

## How To Reproduce

Run the local benchmark baseline:

```bash
npm run benchmark:lite:real
```

Run JSON mode:

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

Run a real external governance shadow compare:

```bash
LITE_EXTERNAL_GOVERNANCE_HTTP_BASE_URL=... \
LITE_EXTERNAL_GOVERNANCE_HTTP_API_KEY=... \
LITE_EXTERNAL_GOVERNANCE_HTTP_MODEL=... \
LITE_EXTERNAL_GOVERNANCE_HTTP_TRANSPORT=anthropic_messages_v1 \
npx tsx scripts/lite-real-task-benchmark.ts --external-http-shadow
```

Run isolated full validation outside the repository:

```bash
bash scripts/lite-real-validation.sh --workdir /tmp/aionis_lite_real_validation
```

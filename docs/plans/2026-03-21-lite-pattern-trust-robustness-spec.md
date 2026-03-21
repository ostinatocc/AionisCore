# Aionis Lite Pattern Trust Robustness Spec

## Goal

Define the next-stage robustness model for `Aionis Lite` execution-policy learning so learned pattern trust becomes harder to over-promote, harder to cheaply revalidate after counter-evidence, and easier to reason about across nearby but non-identical task contexts.

This spec does not change the current runtime immediately.
It defines:

1. what is weak in the current trust model
2. what robustness properties Lite should gain next
3. what must be benchmarked before tightening the live trust gates

Current status:

1. promotion is already hardened to `3` distinct runs
2. contested revalidation already requires `2` fresh post-contest runs
3. selector reuse already applies task-affinity weighting

## Problem

The current Lite pattern loop is real and useful:

1. positive feedback creates `candidate`
2. repeated distinct positive runs promote `trusted`
3. negative feedback opens `contested`
4. later positive feedback can revalidate back to `trusted`

But the current trust model is still a first working slice, not a production-hardened one.

Three risks are now visible.

### 1. Promotion is fast

The current baseline is:

1. `required_distinct_runs = 3`
2. three distinct successful runs can produce `trusted`

This is simple and explainable, but likely too aggressive for noisier real tasks.

### 2. Revalidation is also cheap

After counter-evidence, the current reopening cost is linear:

1. `required_distinct_runs + counter_evidence_count`
2. one new distinct success can often move a once-trusted pattern back to `trusted`

That keeps the state machine simple, but it may not be robust enough against oscillation or cheap recovery after a real failure signal.

### 3. Cross-task boundaries are soft

Patterns do carry `task_signature`, but current reuse is still recall-driven and similarity-shaped rather than strict task-equality-gated.

That means Lite currently lives in a middle state:

1. not globally unscoped
2. not fully task-isolated

This may be useful for nearby-task reuse, and the benchmark now shows a clearer boundary: nearby tasks may still recall a trusted pattern as `broader_similarity`, but they no longer receive flat trusted reuse from that lower-affinity match.

## Current Runtime Reality

Today the trust model is intentionally lightweight.

Current behavior:

1. promotion threshold is fixed at a minimum of `3` distinct runs
2. revalidation threshold increases only by `counter_evidence_count`
3. distinctness is primarily `run_id`-based
4. selector reuse is driven by recalled pattern similarity plus trust state
5. operator stop-loss now exists through `suppress/unsuppress`, but it is an overlay, not a trust-model fix

This is enough to prove product value.
It is not yet enough to claim robust production-grade trust semantics.

## Non-Goals

This spec does not propose:

1. replacing the current Lite trust model in one large rewrite
2. adding server-style moderation or multi-actor governance
3. introducing opaque model-scored trust
4. making every pattern route expose a new default planner surface
5. removing the current `candidate / trusted / contested` contract language

## Design Principles

1. keep trust semantics explainable
2. prefer bounded additional evidence requirements over opaque scoring
3. tighten trust gates before widening selector authority
4. benchmark first, then retune thresholds
5. separate operator intervention from learned trust
6. avoid making default planner/context surfaces heavier

## Weaknesses To Address

### A. Fast promotion under low diversity

Two successes in one narrow task family may be enough to produce `trusted`, even when the runtime has not seen:

1. multiple nearby task variants
2. multiple error-shape variants
3. multiple time-separated successful reuses

### B. Cheap oscillation after contest

The current revalidation model can move:

`trusted -> contested -> trusted`

with a small amount of fresh evidence.

That is good for recoverability, but too cheap a recovery path can turn real counter-evidence into a short-lived blip instead of a meaningful caution period.

### C. Unmeasured cross-task bleed

Because selector reuse is not hard-equality-gated by `task_signature`, nearby tasks may recall each other's patterns.

This may be beneficial when the tasks are genuinely similar.
It may also create false generalization when they are only superficially similar.

Right now Lite has mechanism here, but not enough measurement.

## Recommended Direction

The next trust-hardening phase should happen in two steps.

### Step 1: Add robustness benchmarks before changing live semantics

Before tightening thresholds, Lite should gain benchmark coverage for:

1. `cross_task_isolation`
2. `nearby_task_generalization`
3. `wrong_turn_recovery`
4. `contested_revalidation_cost`

This allows threshold changes to be judged against repeated evidence instead of intuition.

### Step 2: Move from fixed light thresholds to bounded robustness gates

Once benchmark coverage exists, the trust model should evolve from:

1. fixed minimum `2`
2. linear counter-evidence reopening cost

to a more robust but still explainable model based on:

1. distinct run count
2. task-family diversity
3. error-family diversity
4. contested recovery penalty

## Proposed Robustness Model

The recommended next model is still deterministic and explainable.

### Promotion to `trusted`

A pattern should only become `trusted` when all of the following hold:

1. `distinct_run_count >= min_distinct_runs`
2. `task_family_diversity >= min_task_family_diversity`
3. if an error signature exists, `error_family_diversity >= min_error_family_diversity`
4. no open counter-evidence exists

The first Lite hardening slice does not need a complex clustering system.
It can start with conservative derived buckets:

1. exact `task_signature`
2. normalized task-family label
3. normalized error-family label

### Revalidation from `contested`

Revalidation should be stricter than first-time promotion.

Recommended rule:

1. require fresh distinct successes after contest
2. require at least one success outside the exact triggering run shape
3. require a minimum revalidation floor, not only `+1` linear cost

In plain terms:

1. first promotion can be relatively fast
2. recovery after contest should be slower and more deliberate

### Cross-task reuse

Selector reuse should stay similarity-driven, but trust weight should be modulated by task affinity instead of treating all recalled trusted patterns equally.

Recommended ordering:

1. exact task-signature match
2. same task family
3. same error family
4. only then broader similarity

This preserves helpful generalization while reducing accidental bleed across unrelated tasks.

## Proposed Phase-1 Hardening Slice

The first concrete hardening slice should be intentionally small.

It should add:

1. benchmark coverage for `cross_task_isolation`
2. benchmark coverage for `contested_revalidation_cost`
3. explicit task-affinity reporting in benchmark output
4. a stricter revalidation floor after contest

It should not yet add:

1. probabilistic trust scores
2. full task ontology
3. multi-tenant trust calibration
4. planner-surface expansion

## Benchmark Requirements

This spec is not complete unless the benchmark suite grows with it.

Minimum new benchmark scenarios:

### 1. `cross_task_isolation`

Goal:

1. show whether a learned pattern for one task family is incorrectly reused for a nearby but meaningfully different task

Should record:

1. selected tool
2. recalled trusted pattern count
3. whether the recalled pattern came from the same or different task family
4. selector provenance text

### 2. `contested_revalidation_cost`

Goal:

1. show how much fresh evidence is currently needed to move a pattern from `contested` back to `trusted`

Should record:

1. how many fresh distinct runs were needed after contest
2. transition path
3. whether revalidation happened under same-task-only evidence

### 3. `nearby_task_generalization`

Goal:

1. distinguish useful nearby-task reuse from incorrect bleed

Should record:

1. task-family relation
2. selector reuse decision
3. whether trusted reuse was accepted or withheld

## Acceptance Criteria

This spec is successful when it gives Lite a clear next-stage trust-hardening direction without prematurely rewriting the current model.

That means:

1. the current lightweight model is explicitly acknowledged as provisional
2. the next hardening slice is benchmark-led
3. revalidation becomes a first-class robustness concern
4. cross-task isolation and nearby-task generalization become explicit validation targets

## Follow-On Work

After this spec, the next work should be:

1. add `cross_task_isolation` to the real-task benchmark suite
2. add `contested_revalidation_cost` to the real-task benchmark suite
3. define a small task-affinity model for trust weighting
4. only then consider changing the live promotion/revalidation thresholds

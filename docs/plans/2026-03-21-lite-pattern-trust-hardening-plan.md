Last reviewed: 2026-04-16

Document status: historical implementation plan

# Lite Pattern Trust Hardening Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden Lite pattern trust so promotion is less eager, contested recovery is less cheap, and selector reuse is modulated by task affinity instead of flat trusted-pattern reuse.

**Architecture:** Keep the current deterministic `candidate / trusted / contested / revalidated` state machine, but move trust gating into an explicit hardening layer with three new controls:

1. a higher promotion gate
2. a stronger post-contest revalidation floor
3. task-affinity weighting in selector reuse

Do this without widening the default planner/context surface and without replacing explainable thresholds with opaque scores.

**Tech Stack:** TypeScript, Fastify, Zod, SQLite Lite stores, existing pattern-anchor schemas, selector recall pipeline, benchmark harness in `scripts/lite-real-task-benchmark.ts`

**Current benchmark reality:** The live benchmark suite already shows:

1. `cross_task_bleed_observed = false`
2. `contested_revalidation_fresh_runs_needed = 2`
3. current promotion now reaches `trusted` after `3` distinct positive runs, and selector reuse now weights trusted patterns by `exact_task_signature -> same_task_family -> same_error_family -> broader_similarity`

This plan treats those as hardening inputs, not as final production semantics.

---

### Work Package 1: Formalize The Hardened Trust Inputs

**Files:**
- Modify: `src/memory/schemas.ts`
- Modify: `src/memory/tools-pattern-anchor.ts`
- Modify: `src/memory/tools-feedback.ts`

Add explicit structured fields for trust hardening inputs, rather than leaving them implicit in branch logic.

Required fields:

1. `task_family`
2. `error_family`
3. `distinct_task_family_count`
4. `distinct_error_family_count`
5. `post_contest_distinct_run_count`
6. `trust_hardening_v1`

`trust_hardening_v1` should carry compact, explainable gate metadata such as:

1. `promotion_gate_kind`
2. `promotion_gate_satisfied`
3. `revalidation_floor_kind`
4. `revalidation_floor_satisfied`
5. `task_affinity_weighting_enabled`

Do not yet change selector behavior here. This package only makes the hardening state explicit and recallable.

### Work Package 2: Raise The Promotion Gate Conservatively

**Files:**
- Modify: `src/memory/tools-pattern-anchor.ts`
- Modify: `src/memory/tools-feedback.ts`
- Modify: `scripts/ci/lite-tools-pattern-anchor.test.ts`

Replace the current minimal promotion rule:

`distinct_run_count >= 3`

with a bounded but stricter first hardening slice.

Recommended first slice:

1. `min_distinct_runs = 3`
2. `min_task_family_diversity = 1`
3. if error-family is available, `min_error_family_diversity = 1`
4. open counter-evidence still blocks promotion

This keeps the model explainable while reducing instant trust from two clean repeats.

Expected runtime change:

1. two positive runs remain `candidate`
2. trusted requires at least one more fresh distinct success
3. benchmark output should show higher promotion cost without changing planner/context shape

### Work Package 3: Add A Stronger Contested Revalidation Floor

**Files:**
- Modify: `src/memory/tools-pattern-anchor.ts`
- Modify: `src/memory/tools-feedback.ts`
- Modify: `scripts/ci/lite-tools-pattern-anchor.test.ts`

Current runtime behavior allows:

1. `trusted -> contested`
2. two fresh distinct successes
3. `revalidated_to_trusted`

That is too cheap for a hardened model.

Add an explicit revalidation floor that is stricter than first-time promotion.

Recommended first slice:

1. contested patterns require at least `2` fresh post-contest distinct successes
2. those successes must come from distinct run ids
3. duplicate positives on already-counted runs remain non-revalidating

Keep this deterministic and visible in structured fields.

Expected runtime change:

1. contested patterns stay contested longer
2. `contested_revalidation_fresh_runs_needed` rises above the current `1`
3. revalidation becomes a deliberate recovery path instead of a quick bounce

### Work Package 4: Add Task-Affinity Weighting To Selector Reuse

**Files:**
- Modify: `src/memory/tools-select.ts`
- Modify: `src/memory/tools-lifecycle-summary.ts`
- Modify: `src/app/planning-summary.ts`
- Modify: `src/memory/execution-introspection.ts`

Keep similarity-driven recall, but stop treating all trusted recalled patterns as equally strong.

Introduce a deterministic task-affinity ladder:

1. exact `task_signature`
2. same `task_family`
3. same `error_family`
4. broader similarity fallback

Apply this as weighting in the first slice, with `broader_similarity` remaining recall-visible but no longer receiving flat trusted reuse weight.

Required output behavior:

1. selector provenance should indicate affinity level
2. introspection should expose compact affinity labels for matched patterns
3. default planner/context response must stay slim

This package should directly reduce the currently measured `cross_task_bleed_observed` risk without forcing strict task-equality isolation.

### Work Package 5: Expand Benchmark Coverage For Trust Hardening

**Files:**
- Modify: `scripts/lite-real-task-benchmark.ts`
- Modify: `docs/plans/2026-03-21-lite-real-task-benchmark-suite-spec.md`
- Modify: `docs/CORE_TESTING_STRATEGY.md`

Extend the benchmark suite from “mechanism exists” to “hardening behavior holds.”

Required benchmark work:

1. keep `cross_task_isolation` but let it record affinity class, not only bleed
2. keep `contested_revalidation_cost` and expect a higher fresh-run floor
3. add `nearby_task_generalization`
4. add `wrong_turn_recovery`

Success criteria:

1. nearby tasks no longer receive flat trusted reuse with no affinity distinction
2. contested recovery is measurably harder than current baseline
3. hardening changes do not break the existing policy-learning loop

### Work Package 6: Rollout, Explainability, And Contract Locking

**Files:**
- Modify: `scripts/ci/lite-tools-select-route-contract.test.ts`
- Modify: `scripts/ci/lite-execution-introspection-route.test.ts`
- Modify: `docs/CORE_GOVERNANCE_AND_STRATEGY_STATUS.md`
- Modify: `docs/CORE_FOUNDATION_MEMORY_V3_IMPLEMENTATION_PLAN.md`

Before treating the hardened model as the new runtime baseline:

1. add route-level contract tests for affinity-aware selector provenance
2. add introspection contract tests for hardening metadata
3. update status docs to reflect the new trust semantics
4. keep `suppress-first` as operator stop-loss, not as a substitute for trust hardening

The goal of this package is not new capability. It is to make the hardened trust model stable, explainable, and benchmark-backed.

## Recommended Delivery Order

Recommended order:

1. `Work Package 1`
2. `Work Package 5`
3. `Work Package 2`
4. `Work Package 3`
5. `Work Package 4`
6. `Work Package 6`

Reason:

1. explicit hardening metadata should exist before changing live gates
2. benchmark pressure should keep the threshold changes honest
3. promotion hardening is the least invasive first semantic change
4. contested recovery should be tightened after promotion semantics are clear
5. task-affinity weighting should ride on the hardened trust model, not precede it
6. route contracts and status docs should only freeze after the new behavior is measured

## Definition Of Done

This plan is complete when:

1. promotion to `trusted` no longer occurs after only two clean runs, and the hardened baseline remains benchmark-backed
2. contested revalidation requires a stronger fresh-evidence floor than the current baseline
3. selector provenance exposes task-affinity weighting
4. benchmark results show the new trust cost explicitly
5. default planner/context responses remain slim

## Current Implementation Status

Completed:

1. `Work Package 1`
2. `Work Package 2`
3. `Work Package 3`
4. `Work Package 4`

Current runtime baseline:

1. promotion requires `3` distinct positive runs
2. contested revalidation requires `2` fresh post-contest runs
3. selector provenance exposes `exact_task_signature`, `same_task_family`, `same_error_family`, and `broader_similarity`
4. nearby cross-task recall remains visible, but benchmarked flat trusted reuse bleed is now `false`

Remaining:

1. `Work Package 5`
2. `Work Package 6`

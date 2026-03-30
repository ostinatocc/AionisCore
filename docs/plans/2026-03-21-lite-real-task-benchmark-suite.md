# Aionis Core Real-Task Benchmark Suite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a repeatable Aionis Core benchmark command that validates policy learning, nearby-task generalization, wrong-turn recovery, workflow progression, multi-step repair continuity, and slim planner/context surfaces through real route behavior.

**Architecture:** Build one `tsx` script that boots fresh in-process local-runtime route fixtures on temporary SQLite databases, runs deterministic scenarios, validates route outputs against the current contract schemas, and emits structured benchmark results in human-readable or JSON form.
The current active slice also emits stable compare fields such as scenario score and pass-criteria summary so future versions can be compared without rereading free-form notes.

**Tech Stack:** TypeScript, Fastify, SQLite-backed local stores, existing route registrations, node:assert, tsx.

---

### Task 1: Add the benchmark spec and script skeleton

**Files:**
- Create: `docs/plans/2026-03-21-lite-real-task-benchmark-suite-spec.md`
- Create: `scripts/lite-real-task-benchmark.ts`

**Step 1: Create the benchmark script skeleton**

Add a script that:

1. parses `--json`
2. defines benchmark result types
3. runs scenarios sequentially
4. exits non-zero on benchmark failure
5. can later write result artifacts to disk

**Step 2: Create empty scenario stubs**

Add stubs for:

1. `policy_learning_loop`
2. `cross_task_isolation`
3. `nearby_task_generalization`
4. `contested_revalidation_cost`
5. `wrong_turn_recovery`
6. `workflow_progression_loop`
7. `multi_step_repair_loop`
8. `slim_surface_boundary`

**Step 3: Verify the script starts**

Run:

```bash
npx tsx scripts/lite-real-task-benchmark.ts --json
```

Expected:

The command runs and returns placeholder scenario output.

### Task 2: Implement shared benchmark runtime helpers

**Files:**
- Modify: `scripts/lite-real-task-benchmark.ts`

**Step 1: Add temporary SQLite helpers**

Add helpers for:

1. creating temp db paths
2. creating request guards
3. creating local write/recall stores

**Step 2: Add route-registration helpers**

Inside the benchmark script, add one shared registration path for:

1. memory write routes
2. memory context runtime routes
3. memory access routes
4. memory feedback routes

**Step 3: Add direct fixture seeding helpers where needed**

Use current local write-store fixtures only for setup that has no dedicated benchmark route yet, such as:

1. initial active rule creation

**Step 4: Verify helper path works**

Run:

```bash
npx tsx scripts/lite-real-task-benchmark.ts
```

Expected:

The script boots and tears down benchmark runtimes cleanly.

### Task 3: Implement the policy-learning benchmark scenario

**Files:**
- Modify: `scripts/lite-real-task-benchmark.ts`

**Step 1: Seed one active tool rule**

Seed a lightweight `repair_export -> prefer edit` rule.

**Step 2: Run the loop**

Exercise:

1. tools select
2. positive feedback
3. second positive feedback
4. third positive feedback
5. negative feedback
6. two fresh positive revalidation runs
7. introspection checks after each key stage

**Step 3: Validate scenario assertions**

Require:

1. candidate appears after first success
2. trusted appears after third success
3. contested appears after negative feedback
4. trusted returns only after two fresh post-contest successes

**Step 4: Capture benchmark metrics**

Record:

1. selected tool
2. transition names
3. candidate/trusted/contested counts
4. selector provenance text
5. scenario score and pass-criteria summary

### Task 4: Implement the affinity and recovery benchmark scenarios

**Files:**
- Modify: `scripts/lite-real-task-benchmark.ts`

**Step 1: Implement `cross_task_isolation`**

Require:

1. source task still reuses the trusted pattern after rule disable
2. a materially different task only recalls the pattern as lower-affinity visibility
3. `cross_task_bleed_observed` is explicit in the benchmark result

**Step 2: Implement `nearby_task_generalization`**

Require:

1. a nearby task with the same `task_family` but different `task_signature` still reuses the trusted pattern
2. provenance exposes `same_task_family`

**Step 3: Implement `contested_revalidation_cost`**

Require:

1. duplicate positive evidence does not revalidate
2. two fresh post-contest runs are required to restore trusted

**Step 4: Implement `wrong_turn_recovery`**

Require:

1. one wrong-turn negative feedback moves the pattern to `contested`
2. selector immediately stops trusted reuse
3. trusted reuse only returns after deliberate fresh evidence

### Task 5: Implement the workflow-progression benchmark scenario

**Files:**
- Modify: `scripts/lite-real-task-benchmark.ts`

**Step 1: Write first structured execution-continuity event**

Use `/v1/memory/write` with structured execution continuity.

**Step 2: Validate candidate stage**

Require:

1. planner packet contains one candidate workflow
2. planner explanation shows candidate wording

**Step 3: Write a second unique matching event**

Use a distinct source event but the same workflow signature inputs.

**Step 4: Validate stable stage**

Require:

1. planner packet contains one recommended workflow
2. candidate workflows disappear from the planner product surface
3. introspection shows stable workflow count
4. scenario result includes stable compare fields

### Task 6: Implement the multi-step repair benchmark scenario

**Files:**
- Modify: `scripts/lite-real-task-benchmark.ts`

**Step 1: Run a three-step repair sequence through session events**

Exercise:

1. inspect event
2. patch event
3. validate event

All three steps should share one repair signature while still representing a longer task shape than the simpler workflow-progression scenario.

**Step 2: Validate maturity carry-forward**

Require:

1. inspect creates an observing candidate
2. patch upgrades to stable workflow guidance
3. validate keeps the stable workflow instead of reopening duplicate candidate rows

**Step 3: Validate producer explain output**

Require:

1. `continuity_projection_report` shows at least one `projected`
2. `continuity_projection_report` shows at least one `skipped_stable_exists`

**Step 4: Capture benchmark metrics**

Record:

1. planner explanation text after each step
2. observing/stable workflow counts
3. continuity projection decision counts

### Task 7: Implement the slim-surface benchmark scenario

**Files:**
- Modify: `scripts/lite-real-task-benchmark.ts`

**Step 1: Run default planning context**

Require:

1. no `layered_context`

**Step 2: Run debug context assemble**

Require:

1. `return_layered_context=true` restores `layered_context`

**Step 3: Record metrics**

Capture:

1. boolean surface flags
2. packet presence
3. summary presence

## Current Status

Implemented benchmark scenarios:

1. `policy_learning_loop`
2. `cross_task_isolation`
3. `nearby_task_generalization`
4. `contested_revalidation_cost`
5. `wrong_turn_recovery`
6. `workflow_progression_loop`
7. `multi_step_repair_loop`
8. `slim_surface_boundary`

Current benchmark baseline:

1. `cross_task_bleed_observed = false`
2. nearby-task trusted reuse survives through `same_task_family`
3. contested recovery requires `2` fresh post-contest runs
4. wrong-turn negative feedback immediately strips trusted reuse until deliberate recovery completes
5. scenario score and pass-criteria summary

### Task 7: Add npm entrypoint and docs links

**Files:**
- Modify: `package.json`
- Modify: `docs/CORE_TESTING_STRATEGY.md`
- Modify: `README.md`
- Modify: `docs/CORE_GOVERNANCE_AND_STRATEGY_STATUS.md`

**Step 1: Add benchmark command**

Expose:

```bash
npm run benchmark:lite:real
```

Also support direct artifact output such as:

```bash
npx tsx scripts/lite-real-task-benchmark.ts --out-json tmp/lite-benchmark.json --out-md tmp/lite-benchmark.md
```

And baseline comparison such as:

```bash
npx tsx scripts/lite-real-task-benchmark.ts --baseline-json tmp/lite-benchmark.json
```

**Step 2: Update testing strategy**

Document the benchmark suite as a repeatable real-validation command that complements, but does not replace, contract and smoke tests.

**Step 3: Update README and status docs**

Add one benchmark reference and one short rationale.

### Task 8: Verify the first slice

**Files:**
- Modify: `scripts/lite-real-task-benchmark.ts`

**Step 1: Run targeted verification**

Run:

```bash
npx tsx scripts/lite-real-task-benchmark.ts
npx tsx scripts/lite-real-task-benchmark.ts --json
npx tsx scripts/lite-real-task-benchmark.ts --out-json tmp/lite-benchmark.json --out-md tmp/lite-benchmark.md
```

Expected:

All runs pass, the JSON output contains eight scenario result objects, and artifact files are written.

**Step 3: Add baseline-compare verification**

Run:

```bash
npx tsx scripts/lite-real-task-benchmark.ts --baseline-json tmp/lite-benchmark/result.json
```

Expected:

The suite still passes and emits compare fields at both suite and scenario level.

**Step 2: Run baseline repo checks**

Run:

```bash
npx tsc --noEmit
npm run -s test:lite
```

Expected:

Both pass with no route-contract regressions.

# Runtime Recovery Compiler Design

Document status: Draft baseline
Status: Draft baseline

## Goal

Shift recovery improvement into `AionisRuntime` itself instead of continuing to patch benchmark adapters.

The Runtime already has strong downstream recovery structures:

- `execution_state_v1`
- `execution_packet_v1`
- `target_files`
- `acceptance_checks`
- `next_action`
- `workflow_signature`
- workflow/pattern/replay promotion machinery

The missing layer is an automatic compiler that can take a raw failed trajectory and turn it into an execution-ready recovery contract that the rest of the Runtime can reuse.

## Scope

This design adds four Runtime-first capabilities:

1. `trajectory_compile_v1`
   Compile a failed trajectory into:
   - `target_files`
   - `acceptance_checks`
   - `next_action`
   - `workflow_steps`
   - `pattern_hints`
   - `service_lifecycle_constraints`

2. First-class service lifecycle constraints
   Add formal packet/state semantics for:
   - `must_survive_agent_exit`
   - `revalidate_from_fresh_shell`
   - `detach_then_probe`

3. Stronger family-oriented recovery seeds
   The compiler should derive:
   - `task_family`
   - `task_signature`
   - `workflow_signature`
   - `key_steps`
   - reusable recall keywords

4. Promotion-friendly output
   The compiler output should be shaped so it can later feed existing workflow/pattern promotion paths instead of creating a benchmark-only side channel.

## Design

### 1. New compiler surface

Add a new lite access route:

- `POST /v1/memory/trajectory/compile`

The route accepts a generic trajectory request with:

- `query_text`
- `trajectory.steps`
- optional caller hints

The route returns a compiled recovery contract plus promotion seed material.

This keeps the feature Runtime-native and benchmark-agnostic. Benchmarks, SDKs, and real agents can all call the same surface.

### 2. Service lifecycle in execution state

Extend `ExecutionStateV1` and `ExecutionPacketV1` with `service_lifecycle_constraints`.

This makes service/process survival an execution primitive, not an adapter convention.

The initial shape is intentionally small:

- `service_kind`
- `label`
- `launch_reference`
- `endpoint`
- `must_survive_agent_exit`
- `revalidate_from_fresh_shell`
- `detach_then_probe`
- `health_checks`
- `teardown_notes`

### 3. Compiler heuristics

The compiler stays generic. It does not know benchmark task names.

It derives structure from:

- commands
- tool calls
- assistant summaries
- observations
- file paths
- localhost/service URLs

It also filters known non-actionable failure prose, such as:

- sandbox excuses
- handoff-only language
- source-review-only language

### 4. Memory-facing output

The compiler returns:

- a human/action contract
- promotion seed metadata

Promotion seed metadata is shaped to align with existing Runtime memory surfaces:

- `task_family`
- `task_signature`
- `workflow_signature`
- `key_steps`
- `recall_keywords`

This lets follow-on work connect compiler output to workflow/pattern promotion without re-inventing a second schema.

## Non-goals

This change does not try to:

- auto-write compiler output into memory yet
- redesign replay learning
- redesign tool selection
- solve every recovery family in one pass

The goal is to create the missing Runtime-native compile layer first.

## Verification

Initial verification should prove:

1. A failed trajectory compiles into actionable `target_files`, `acceptance_checks`, and `next_action`
2. Service-style traces produce service lifecycle constraints
3. Non-actionable recovery prose is filtered out of `next_action`
4. Execution packet assembly preserves lifecycle constraints

## Immediate follow-up

Once the compiler surface is stable, the next integration step is:

- feed compiler seeds into workflow/pattern promotion
- use compiled lifecycle constraints in planning/context surfaces
- then revisit unstable recovery cases like `configure-git-webserver`

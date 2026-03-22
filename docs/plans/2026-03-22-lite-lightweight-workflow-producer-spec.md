# Aionis Lite Lightweight Workflow Producer Spec

## Goal

Broaden Lite workflow-memory production one conservative step further by allowing lightweight handoff-style continuity writes to enter the same governed workflow-projection path that already exists for structured `execution_state_v1` and `execution_packet_v1`.

## Problem

Lite already has a working generic workflow producer, but its current eligibility gate is still narrow:

1. it accepts structured execution continuity through `execution_state_v1`
2. it accepts packet-only continuity through `execution_packet_v1`
3. it rejects lighter execution-continuity writes that still clearly describe a resumable handoff or patch trajectory

This leaves an avoidable kernel gap:

1. ordinary execution evidence can still fail to become workflow memory
2. callers that already write resumable continuity must over-specify execution state just to enter workflow promotion
3. workflow promotion remains more coupled to explicit packet/state scaffolding than necessary

## Design Principles

1. keep the producer conservative and deterministic
2. do not add a new public route
3. do not widen the default planner/context surface
4. preserve the current signature, observation, and stable-promotion model
5. only admit lightweight continuity when the write already carries clear handoff semantics

## Chosen Scope

This slice extends the current generic workflow producer to treat a source node as eligible when all of the following are true:

1. the node is an `event`
2. the node does not already carry workflow memory
3. the node slots describe handoff-style execution continuity with:
   - `summary_kind = "handoff"`
   - `handoff_kind`
   - `anchor`
   - at least one of `summary`, `text_summary`, or `title`
   - at least one resumable target signal from `target_files`, `file_path`, or `anchor`

When that shape is present, Lite should:

1. derive a synthetic continuity input from the lightweight handoff fields
2. generate the same deterministic workflow signature family used by the current producer
3. create a governed `workflow_candidate`
4. count observations with the same distinct-observation semantics
5. auto-promote to stable workflow anchor on repeated distinct observations

## Explicit Non-Goals

This slice does not:

1. infer workflow memory from arbitrary event text
2. add new planner packet fields
3. change required observation counts
4. create a separate handoff-only workflow type
5. broaden `memory/events` request contracts

## Producer Semantics

The producer should now accept three continuity sources:

1. `execution_state_v1`
2. `execution_packet_v1`
3. lightweight handoff-style continuity synthesized from source slots

Lightweight handoff synthesis should be intentionally narrow:

1. `task_brief` comes from `slots.summary`, `text_summary`, or `title`
2. `target_files` comes from `slots.target_files` or `slots.file_path`
3. `resume_anchor` comes from `slots.anchor`, `slots.file_path`, `slots.repo_root`, and `slots.symbol`
4. `next_action` comes from `slots.next_action` or `slots.handoff_text`

If these fields cannot produce a resumable continuity shape, the producer must still abstain.

## Runtime Surface Expectations

This slice should improve workflow promotion breadth without changing the visible default runtime surface:

1. more ordinary execution-like writes can become `workflow_candidate`
2. `planning_context` still consumes them through the existing candidate/stable workflow surfaces
3. `execution/introspect` should reflect the same lifecycle state
4. no new planner/context payload sections should appear

## Testing Requirements

Minimum coverage for this slice:

1. a `/v1/memory/write` handoff-style event without `execution_state_v1` or `execution_packet_v1` produces a candidate workflow
2. repeated distinct handoff-style writes with the same signature auto-promote to stable workflow guidance
3. lightweight continuity missing a resumable target signal is still rejected
4. existing packet/state-backed projection behavior remains unchanged

## Success Criteria

This slice is successful when:

1. Lite promotes lightweight handoff-style continuity into workflow memory through the existing producer path
2. distinct-observation and stable-promotion semantics remain unchanged
3. no new default route bloat is introduced
4. route and contract tests lock the new eligibility boundary down

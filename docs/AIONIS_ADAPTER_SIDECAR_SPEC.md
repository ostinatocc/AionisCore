# Aionis Adapter Sidecar Spec

## Goal

Define the first runnable sidecar process that turns the current adapter baseline into a real local integration surface for client execution events.

The sidecar exists to bridge the gap between:

1. a validated adapter contract in `src/adapter/`
2. a real client that can emit task and tool lifecycle events

## Product Role

The sidecar is not the final end-user product by itself.

It is the first practical execution layer that allows:

1. a client to emit normalized execution events
2. Aionis to participate automatically in the task loop
3. thin MCP to remain a compatibility and observation layer

## Why A Sidecar

The current adapter baseline already normalizes:

1. task start
2. pre-tool selection
3. execution evidence
4. task finalization

But clients still need a real local process that can:

1. accept those events
2. manage task-scoped state
3. call the adapter in order
4. expose a stable local integration interface

The sidecar is that process.

## Process Shape

The first sidecar should be a local source-owned Node process.

Recommended properties:

1. stdio or local HTTP input
2. local-only by default
3. no new persistence layer
4. delegates state to the adapter session layer and Aionis runtime

The sidecar should not:

1. add its own long-term memory
2. create a second control plane
3. fork trust logic or planner logic

## First Interface

The first sidecar should accept a small event family:

1. `task_started`
2. `tool_selection_requested`
3. `tool_executed`
4. `task_completed`
5. `task_blocked`
6. `task_failed`
7. `introspect_requested`

Each event should map directly onto the current adapter baseline.

## Event Ownership

### Client owns

1. detecting task start
2. detecting candidate tool set
3. detecting actual tool execution
4. detecting terminal task outcome

### Sidecar owns

1. validating event shape
2. preserving task session state
3. calling the adapter in the right order
4. returning normalized responses

### Aionis runtime owns

1. persistent memory
2. trust logic
3. workflow and pattern learning
4. introspection state

## Runtime Mapping

The sidecar should map events to adapter methods:

1. `task_started`
   - `adapter.beginTask(...)`
2. `tool_selection_requested`
   - `adapter.beforeToolUse(...)`
3. `tool_executed`
   - `adapter.recordToolOutcome(...)`
4. `task_completed` / `task_blocked` / `task_failed`
   - `adapter.finalizeTask(...)`
5. `introspect_requested`
   - `harness.introspect(...)`

The sidecar should not bypass the adapter to call Aionis runtime directly except through the already-defined adapter or harness abstractions.

## Client Wiring Strategy

The first sidecar should support a wrapper-style integration before any deeper client-native integration.

That means:

1. the client remains the execution host
2. the client emits task and tool lifecycle events to the sidecar
3. the sidecar translates them into adapter calls

This is the safest first step because it does not depend on unsupported or private client internals.

## Claude Code Direction

For Claude Code style usage, the first realistic path is:

1. a lightweight local wrapper or helper emits lifecycle events
2. the sidecar receives them
3. the adapter drives planning, selection, feedback, finalization, and introspection

This is preferable to relying on:

1. prompt habits
2. repeated user confirmations
3. the model choosing MCP tools at the right time

## Interface Constraints

The sidecar should stay narrow.

First release constraints:

1. single-user local only
2. one active local process space
3. minimal event schema
4. no auth layer beyond local runtime defaults
5. no UI

## Verification Requirements

The sidecar is useful only if it can prove a full loop:

1. task start calls planning
2. tool selection happens before tool execution
3. ambiguous step outcomes abstain
4. task finalization records once
5. introspection shows learned state after a repeated task

## Success Criteria

The sidecar direction succeeds when:

1. a client can use Aionis without prompt-level reminders
2. task completion no longer depends on conversational confirmation loops
3. the adapter path becomes more real than the thin MCP path for everyday use
4. thin MCP can remain small and stable

# ADR-0001: Position Aionis Core As An Agent Continuity Kernel

Last reviewed: 2026-04-16

Document status: accepted historical decision record

Status: Accepted

Date: 2026-03-20

This ADR still explains the kernel thesis, but it is not the canonical implementation reference for the current runtime.

For current runtime truth, start with:

1. [../LOCAL_RUNTIME_ARCHITECTURE_AND_COMPLETION.md](../LOCAL_RUNTIME_ARCHITECTURE_AND_COMPLETION.md)
2. [../AIONIS_PRODUCT_DEFINITION_V1.md](../AIONIS_PRODUCT_DEFINITION_V1.md)
3. [../RUNTIME_MAINLINE.md](../RUNTIME_MAINLINE.md)

## Context

The broader Aionis direction emphasizes learned kickoff, structured handoff, replay reuse, and execution memory evolution through action.

At the same time, the current `Aionis Core` repository already contains a real local runtime shell with:

1. SQLite-backed local persistence
2. replay and playbook execution
3. tool decision capture
4. context assembly and recall policy
5. a local automation kernel

However, the repository is not yet positioned around one narrow core thesis.

Without a clear thesis, the repository risks being described too broadly as:

1. a generic AI memory system
2. a local agent platform
3. a tool-centric AGI framework

Those labels create unnecessary ambiguity and encourage roadmap sprawl.

## Decision

We will position `Aionis Core` as an agent continuity kernel.

The primary product promise is:

1. turn prior execution into a better next-task start
2. preserve unfinished work as structured handoff packets
3. turn successful runs into replay and playbook reuse
4. distill execution evidence into reusable memory
5. rehydrate missing detail only when necessary

That phrase may still describe long-range research direction, but it will not define the current core identity.

## Rationale

### 1. This matches the current implementation

Lite already contains the strongest parts of an execution-memory story:

1. replay and playbooks
2. decision capture for tool selection
3. write distillation
4. context assembly with tier and forgetting controls

This means the positioning is supported by working product surfaces rather than speculative modules.

### 2. This avoids narrative overshoot

`AGI` language expands expectations faster than the current repository can satisfy.

`Agent continuity kernel` is narrower, more defensible, and easier to evaluate.

### 3. This creates better roadmap discipline

If Aionis Core is framed as an agent continuity kernel, roadmap choices become easier:

1. prefer learned kickoff over generic suggestion layers
2. prefer structured handoff over loose session summaries
3. prefer replay-linked memory over generic note storage
4. prefer workflow recall over broad semantic retrieval
5. prefer partial rehydration over full archival complexity

## Consequences

### Positive consequences

1. Aionis Core gains a clear kernel identity.
2. Existing replay and tool-decision work becomes central rather than incidental.
3. The memory roadmap can be evaluated with repeated-task metrics.
4. Architecture choices can focus on execution structure instead of broad knowledge accumulation.

### Negative consequences

1. Some broader research concepts will be intentionally deferred.
2. Public messaging will undersell the long-range AGI ambition in the short term.
3. Some existing general-memory surfaces may need to be reframed rather than expanded.

## Scope Guidance

### In scope for Aionis Core

1. learned kickoff and task-start guidance
2. structured handoff packets
3. execution trace capture
4. distilled execution anchors
5. workflow and replay reuse
6. partial payload rehydration
7. repeated-task optimization
8. basic importance decay and demotion

### Out of scope for the current core positioning

1. full autonomous multi-agent optimization
2. automatic tool discovery as a primary v1 feature
3. a full uncertainty-estimation subsystem
4. broad policy learning across all memory objects
5. complete dynamic lifecycle management across many memory tiers

## Architectural Implications

The preferred near-term progression for Lite memory is:

1. event memory
2. workflow memory
3. pattern memory

This is preferred over immediately implementing a deeper autonomous hierarchy such as:

1. raw event
2. distilled step
3. workflow
4. pattern
5. policy

The deeper hierarchy remains a possible future direction, but not a required v1 architecture.

## Evaluation Implications

Aionis Core should be evaluated primarily on:

1. task-start lift on repeated tasks
2. handoff recovery completeness
3. workflow reuse rate
4. repeated-task cost reduction
5. stale-memory interference rate
6. decision provenance coverage

Lite should not be evaluated primarily on:

1. total node count
2. raw storage growth
3. number of memory tiers introduced

## Follow-Up

Recommended next steps:

1. define an anchor schema for execution memory objects
2. add anchor-first recall to planning/context assembly
3. implement partial payload rehydration for replay-linked artifacts
4. add repeated-task evaluation fixtures and metrics reporting

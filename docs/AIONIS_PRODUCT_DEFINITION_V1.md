# Aionis Runtime Product Definition v1

Last reviewed: 2026-04-16

Document status: living public product definition

## One-Line Definition

Aionis Runtime is the local continuity runtime for coding agents.

It is built from the Aionis Core kernel in this repository and owns the runtime primitives that let an agent system start better, resume cleanly, and reuse prior execution.

## Core Definition

The runtime product in this repository is responsible for:

1. classifying task shape and execution intent
2. projecting prior execution into better kickoff guidance
3. recording structured execution evidence
4. storing execution-ready handoff packets
5. recording replay runs and compiling reusable playbooks
6. applying governance and workflow learning over execution memory

## Runtime Capability Surfaces

### 1. Task Start

Task Start turns prior execution into a better first action for the next similar task.

It is built from:

1. execution memory
2. tools select / tools feedback
3. workflow projection / experience intelligence
4. planning summary and kickoff recommendation

### 2. Task Handoff

Task Handoff stores and recovers structured task packets that carry execution state forward.

It is built from:

1. execution packets
2. acceptance checks
3. target files and next action
4. recovery context and continuity evidence

### 3. Task Replay

Task Replay records execution runs and turns successful work into reusable playbooks.

It is built from:

1. replay run / step lifecycle
2. compile / candidate / promote / run / dispatch
3. replay learning projection
4. governed repair and replay review

## Kernel Layers

The repository should be treated as three layers:

1. **Runtime Core**
   Memory, replay, handoff, governance, workflow learning, sandbox, automation, and route contracts.

2. **SDK + Bridge**
   Core SDK surfaces and bridge surfaces that expose the kernel to host systems.

3. **Validation**
   Benchmarks, regression checks, and internal runtime verification that prove the kernel stays coherent.

## Build Rule

New public-facing work belongs here when it strengthens one of these:

1. learned kickoff quality
2. handoff integrity and recovery quality
3. replay/playbook quality
4. execution-memory, governance, or workflow-learning substrate
5. bridge and SDK contract quality

## Decision Rule

When deciding what to build next, ask:

**Does this make Aionis Runtime a stronger runtime for task continuity, or the Aionis Core kernel beneath it stronger?**

If yes, it belongs here.

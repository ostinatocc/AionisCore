# Aionis Runtime Launch Messaging

Last reviewed: 2026-04-16

Document status: living public launch messaging baseline

This document is the external messaging baseline for the current `Aionis Runtime` release phase.

Current recommendation: launch `Aionis Runtime` as a technical beta for developers building coding agents, local runtimes, and agent infrastructure.

## One-Line Positioning

`Aionis Runtime` is a local continuity runtime that helps coding agents start better, resume cleanly, and reuse successful work.

## Short Pitch

Most agents can reason inside one session. They break when work spans retries, handoffs, or repeated tasks.

`Aionis Runtime` gives you the continuity layer underneath a coding agent:

1. learned kickoff for repeated tasks
2. structured handoff and resume
3. replay and playbook reuse

It ships today as a local runtime plus a typed SDK, with explicit contracts for memory, replay, handoff, automation, and sandbox flows.

## Who To Target First

Lead with:

1. developers building coding agents or local agent runtimes
2. AI tooling teams running repeated repair, review, refactor, and resume workflows
3. infrastructure teams that want explicit runtime contracts instead of hidden prompt state

Do not lead with:

1. non-technical no-code automation users
2. teams expecting a hosted multi-tenant control plane on day one
3. generic chatbot users looking for a conversation UI

## The Problem To Name

The best launch framing is not "memory for AI" in the abstract.

The problem is:

1. agents lose execution context between runs
2. pause/resume is usually ad hoc and hard to trust
3. successful runs do not automatically become reusable operating knowledge

That pain is especially obvious in coding workflows, where target files, next action, repair history, and tool choice matter more than raw chat transcripts.

## Messaging Pillars

### 1. Continuity Is The Product

`Aionis Runtime` is not a general agent wrapper. It is the continuity runtime layer that helps an agent carry work forward across sessions.

What to say:

- "Turn prior execution into a better first action."
- "Store handoffs that are execution-ready, not just conversational."
- "Promote successful runs into reusable playbooks."

### 2. Explicit Contracts Beat Opaque Agent State

The SDK and route surfaces are typed and deliberate. This matters for teams integrating agent behavior into real products.

What to say:

- "Use explicit runtime contracts instead of hiding behavior in prompts."
- "Inspect kickoff, replay, handoff, and review surfaces through stable APIs."

### 3. Local Runtime First

The current launch story should emphasize that Lite is a real local runtime, not a hosted platform preview.

What to say:

- "Validate continuity loops locally before you build a bigger control plane."
- "Replay, automation, sandbox, and handoff are already usable in the local runtime."

## Three Launch Use Cases

### 1. Learned Kickoff For Repeated Coding Tasks

Use when the same class of task keeps coming back: export bugs, flaky tests, billing retries, migration fixes, release chores.

Story:

1. the agent records execution evidence from prior runs
2. later, a similar task arrives
3. `taskStart` or `kickoffRecommendation` returns a stronger first action, often including tool choice and file-level guidance

This is the easiest use case to demo because the outcome is immediate and intuitive.

### 2. Structured Pause And Resume

Use when work spans sessions, operators, or checkpoints.

Story:

1. the agent pauses with a structured handoff packet
2. the next run recovers target files, next action, and execution context
3. resume quality is based on explicit continuity data instead of "please continue"

This is the best use case when the audience has already felt pain from brittle agent resumes.

### 3. Replay Successful Work Into Playbooks

Use when a successful repair or workflow should become reusable operating knowledge.

Story:

1. record replay run lifecycle
2. compile and promote a playbook from successful execution
3. reuse that playbook directly or run it through the Lite automation kernel

This is the strongest proof that Aionis is not just storage. It is trying to turn execution into reusable capability.

## Suggested Homepage Hero

Headline:

`Execution-memory kernel for coding agents`

Subhead:

`Help agents start repeated tasks with a better first action, resume work from structured handoffs, and turn successful runs into reusable playbooks.`

Supporting line:

`Ships today as a local runtime plus a typed SDK for replay, handoff, automation, sandbox, and continuity-aware task start.`

## Suggested Repo Intro

Use this when posting the repo in a launch thread:

`Aionis Runtime is a local continuity runtime for coding agents. Instead of treating continuity as prompt glue, it gives you explicit runtime surfaces for learned kickoff, structured handoff, replay, playbooks, and local automation. The current release is a local-first technical beta with a typed SDK and contract-tested Lite runtime.`

## Suggested "What It Is Not" Copy

Use these lines to reduce confusion early:

1. `Aionis Runtime` is not a generic chatbot wrapper.
2. Lite is not a multi-tenant control-plane product.
3. The launch focus is continuity for agent execution, especially in coding workflows.

## CTA Guidance

Primary CTA:

`Start the Lite runtime and try the SDK quickstart`

Secondary CTA:

`Run the bundled recall, replay, handoff, and automation examples`

## Launch Sequence

Recommended order:

1. lead with the one-line positioning
2. show the three core surfaces
3. demo one repeated-task kickoff flow
4. show one pause/resume handoff
5. point technical users to the SDK quickstart and examples

## Current Constraint To Acknowledge

Be direct about the current shape:

1. this is strongest today as a local-first technical beta
2. Lite intentionally excludes server-only control-plane surfaces
3. the SDK and contracts are ready to evaluate, but the broader product story should stay narrow for the first launch

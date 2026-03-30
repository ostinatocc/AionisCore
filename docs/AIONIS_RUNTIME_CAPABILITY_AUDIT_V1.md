# Aionis Core Capability Audit v1

Last reviewed: 2026-03-27

This document is a capability audit for Aionis Core based on direct inspection of:

1. [Aionis Core](/Volumes/ziel/AionisTest/Aioniscc)
2. its runtime assembly, route surface, memory kernel, and validation stack

It is a factual inventory of what Aionis Core already has, what is only partially productized, and what is still not activated through the current kernel activation path.

## Short Conclusion

Aionis Core already has substantial kernel capability.

Aionis Core already has real capability in:

1. execution memory
2. replay and playbooks
3. handoff and recovery
4. tool-policy learning
5. workflow learning
6. forgetting, archive, and rehydration
7. sandbox execution
8. automation kernel
9. governance with model-backed review providers
10. operator telemetry and control-plane primitives

The main current issue is that the current activation path only exercises a small control loop today:

1. task classification
2. phase selection
3. pre-tool decision
4. tool-result recording
5. turn completion

Most of the deeper kernel capabilities are still not being exercised by that path.

## Audit Labels

This audit uses four labels:

1. `real_and_exposed`
   Implemented and surfaced through runtime routes or stable runtime services
2. `real_but_not_yet_activated`
   Implemented in the kernel, but not yet materially exercised through the current activation path
3. `lite_kernel_only`
   Implemented in Lite form, but intentionally narrower than a future full product surface
4. `not_yet_real`
   Not found as a real capability

## Core Identity

The core self-description is already clear:

1. [package.json](/Volumes/ziel/AionisTest/Aioniscc/package.json)
2. [RUNTIME_MAINLINE.md](/Volumes/ziel/AionisTest/Aioniscc/docs/RUNTIME_MAINLINE.md)
3. [OPEN_CORE_BOUNDARY.md](/Volumes/ziel/AionisTest/Aioniscc/docs/OPEN_CORE_BOUNDARY.md)

It is shaped as an execution-memory-first kernel with replay, handoff, governance, and workflow learning.

## Capability Matrix

### 1. Session And Event Recording

Status: `real_and_exposed`

Primary evidence:

1. [sessions.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/sessions.ts)
2. [memory-access.ts](/Volumes/ziel/AionisTest/Aioniscc/src/routes/memory-access.ts)

What is real:

1. session creation
2. session listing
3. session event write
4. session event listing

Route surface:

1. `POST /v1/memory/sessions`
2. `GET /v1/memory/sessions`
3. `POST /v1/memory/events`
4. `GET /v1/memory/sessions/:session_id/events`

Current judgment:

This is real recording infrastructure, not a placeholder.
This official session and event path is not yet part of the default activation loop.

### 2. Recall And Retrieval

Status: `real_and_exposed`

Primary evidence:

1. [recall.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/recall.ts)
2. [find.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/find.ts)
3. [resolve.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/resolve.ts)
4. [memory-recall.ts](/Volumes/ziel/AionisTest/Aioniscc/src/routes/memory-recall.ts)
5. [memory-access.ts](/Volumes/ziel/AionisTest/Aioniscc/src/routes/memory-access.ts)

What is real:

1. recall
2. find
3. resolve
4. route-level auth and quota guards
5. recall observability

Current judgment:

Recall is one of the strongest already-real product surfaces.

### 3. Planning Context And Context Assembly

Status: `real_and_exposed`

Primary evidence:

1. [memory-context-runtime.ts](/Volumes/ziel/AionisTest/Aioniscc/src/routes/memory-context-runtime.ts)
2. [context.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/context.ts)
3. [context-orchestrator.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/context-orchestrator.ts)
4. [CORE_TESTING_STRATEGY.md](/Volumes/ziel/AionisTest/Aioniscc/docs/CORE_TESTING_STRATEGY.md)

What is real:

1. `planning_context`
2. `context_assemble`
3. slim default surface
4. explicit heavy inspection surface
5. planner packets and action-recall packets

Current judgment:

This is already product-defining kernel capability.
It is not yet part of the default activation loop.

### 4. Handoff

Status: `real_and_exposed`

Primary evidence:

1. [handoff.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/handoff.ts)
2. [handoff.ts](/Volumes/ziel/AionisTest/Aioniscc/src/routes/handoff.ts)

What is real:

1. handoff store
2. handoff recover
3. prompt-safe handoff
4. execution-ready handoff
5. target files
6. next action
7. acceptance checks
8. execution state and packet continuity

Current judgment:

This is a real recovery and continuation surface.
The current default activation loop does not yet store or recover through this surface.

### 5. Replay And Playbooks

Status: `real_and_exposed`

Primary evidence:

1. [replay.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/replay.ts)
2. [memory-replay-core.ts](/Volumes/ziel/AionisTest/Aioniscc/src/routes/memory-replay-core.ts)
3. [memory-replay-governed.ts](/Volumes/ziel/AionisTest/Aioniscc/src/routes/memory-replay-governed.ts)

What is real:

1. replay run start
2. replay step before
3. replay step after
4. replay run end
5. playbook compile
6. playbook get
7. playbook candidate
8. playbook promote
9. playbook repair
10. governed replay repair review

Current judgment:

Replay is one of the core's deepest subsystems.
It is already real and route-backed.
It is not yet connected to the default activation lifecycle.

### 6. Workflow Learning

Status: `real_but_not_activated_in_claude_code`

Primary evidence:

1. [replay-learning.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/replay-learning.ts)
2. [workflow-promotion-governance.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/workflow-promotion-governance.ts)
3. [workflow-write-projection.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/workflow-write-projection.ts)

What is real:

1. replay learning episodes
2. workflow promotion governance
3. stable workflow promotion
4. episode TTL policy
5. rule and episode generation

Current judgment:

This is already part of the runtime memory loop.
It is not being driven by the current activation flow.

### 7. Tool Feedback And Pattern Learning

Status: `real_and_exposed`

Primary evidence:

1. [tools-feedback.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/tools-feedback.ts)
2. [tools-pattern-anchor.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/tools-pattern-anchor.ts)
3. [memory-feedback-tools.ts](/Volumes/ziel/AionisTest/Aioniscc/src/routes/memory-feedback-tools.ts)

What is real:

1. tool selection feedback
2. pattern-anchor writes
3. candidate, trusted, contested pattern states
4. counter-evidence and revalidation
5. selector-facing tool decision surfaces

Route surface:

1. `POST /v1/memory/tools/select`
2. `POST /v1/memory/tools/decision`
3. `POST /v1/memory/tools/run`
4. `POST /v1/memory/tools/runs/list`
5. `POST /v1/memory/tools/feedback`

Current judgment:

This is a real execution-policy learning loop.
It is one of the strongest "Aionis gets smarter" capabilities already implemented.

### 8. Forgetting, Archive, And Rehydration

Status: `real_and_exposed`

Primary evidence:

1. [context-orchestrator.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/context-orchestrator.ts)
2. [layer-policy.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/layer-policy.ts)
3. [rehydrate.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/rehydrate.ts)
4. [rehydrate-anchor.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/rehydrate-anchor.ts)
5. [memory-lifecycle.ts](/Volumes/ziel/AionisTest/Aioniscc/src/routes/memory-lifecycle.ts)
6. [embedded-memory-runtime.ts](/Volumes/ziel/AionisTest/Aioniscc/src/store/embedded-memory-runtime.ts)

What is real:

1. forgetting policy by tier, lifecycle, and salience
2. dropped-items accounting
3. archive tier
4. archive rehydrate
5. anchor-first rehydration
6. decay rates
7. embedded runtime pruning of low-value nodes and edges

Current judgment:

Aionis does have forgetting.
It is not just "store everything forever".

### 9. Governance And Model-Backed Review

Status: `real_and_exposed`

Primary evidence:

1. [governance-operation-runner.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/governance-operation-runner.ts)
2. [governance-model-client.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/governance-model-client.ts)
3. [governance-model-client-http.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/governance-model-client-http.ts)
4. [promote-memory-governance.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/promote-memory-governance.ts)
5. [form-pattern-governance.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/form-pattern-governance.ts)

What is real:

1. provider-backed governance preview
2. builtin and HTTP model-client paths
3. governance adjudication modules
4. workflow and pattern promotion review
5. explicit review precedence

Current judgment:

This is real LLM-assisted runtime governance, not a future placeholder.

### 10. Sandbox

Status: `real_and_exposed`

Primary evidence:

1. [sandbox.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/sandbox.ts)
2. [memory-sandbox.ts](/Volumes/ziel/AionisTest/Aioniscc/src/routes/memory-sandbox.ts)
3. [runtime-services.ts](/Volumes/ziel/AionisTest/Aioniscc/src/app/runtime-services.ts)

What is real:

1. local process execution
2. remote HTTP executor path
3. allowed command filtering
4. heartbeats
5. stale recovery
6. artifact handling
7. budget and rate-limit support

Current judgment:

Sandbox execution is already a runtime subsystem, not a shell hack.

### 11. Automation Kernel

Status: `lite_kernel_only`

Primary evidence:

1. [automation-lite.ts](/Volumes/ziel/AionisTest/Aioniscc/src/memory/automation-lite.ts)
2. [automations.ts](/Volumes/ziel/AionisTest/Aioniscc/src/routes/automations.ts)
3. [lite-automation-kernel.test.ts](/Volumes/ziel/AionisTest/Aioniscc/scripts/ci/lite-automation-kernel.test.ts)

What is real:

1. automation definition create/get/list
2. graph validation
3. run
4. run get/list
5. cancel
6. resume
7. replay-backed execution path

What is explicitly not yet real in Lite:

1. richer reviewer assignment flows
2. compensation governance
3. broader automation-governance surfaces

Current judgment:

The automation kernel is real but intentionally narrower than a future full product surface.

### 12. Operator And Control-Plane Telemetry

Status: `real_and_exposed`

Primary evidence:

1. [control-plane.ts](/Volumes/ziel/AionisTest/Aioniscc/src/control-plane.ts)
2. [http-observability.ts](/Volumes/ziel/AionisTest/Aioniscc/src/app/http-observability.ts)
3. [request-guards.ts](/Volumes/ziel/AionisTest/Aioniscc/src/app/request-guards.ts)

What is real:

1. API key principal resolution
2. tenant quota primitives
3. request telemetry
4. context assembly telemetry
5. structured runtime observability

Current judgment:

This is real control-plane support, not just product copy.

## Validation Stack

The core is not only implemented.
It is also validated in layers.

Primary evidence:

1. [CORE_TESTING_STRATEGY.md](/Volumes/ziel/AionisTest/Aioniscc/docs/CORE_TESTING_STRATEGY.md)
2. [LOCAL_RUNTIME_REAL_TASK_BENCHMARK_REPORT.md](/Volumes/ziel/AionisTest/Aioniscc/docs/LOCAL_RUNTIME_REAL_TASK_BENCHMARK_REPORT.md)
3. `41` files under [scripts/ci](/Volumes/ziel/AionisTest/Aioniscc/scripts/ci)

Current validation signals:

1. baseline tests
2. contract tests
3. mainline behavior tests
4. surface-boundary tests
5. smoke tests
6. real-task benchmark

Reported benchmark status:

1. `14/14 PASS`
2. workflow, tools, and replay governance shadow checks reported aligned outcomes

## What Is Actually Missing

The missing piece is not runtime capability.

The missing piece is ability activation through the current default path.

Today the default activation path only activates a narrow kernel loop:

1. classify task
2. open phase
3. decide pre-tool allow/block
4. record tool result
5. complete turn

That means the following runtime capabilities are still mostly dormant in that path:

1. session and event recording into official runtime memory
2. handoff store and recover
3. replay run and playbook generation
4. memory recall into the next turn
5. workflow and pattern learning affecting future task startup
6. forgetting and rehydration assisting real context shaping

## Capability Activation Gap

### Already real in the kernel, but not yet truly activated

1. handoff recovery
2. replay playbook reuse
3. next-turn memory recall
4. replay-learning projection
5. workflow promotion guidance
6. archive rehydration

### Already partly activated through the current path

1. task classification
2. phase progression
3. pre-tool policy
4. turn completion truth

### Not the main current problem

1. missing core memory architecture
2. missing replay subsystem
3. missing handoff subsystem
4. missing forgetting or rehydration concepts

## Final Judgment

Aionis Core already has substantial kernel capability.

The strongest truthful statement is:

1. Aionis Core already has real execution-memory capability
2. Aionis Core already has real replay, handoff, learning, forgetting, and governance capability
3. Aionis Core already has strong kernel ability
4. The remaining gap is full activation of those abilities through the default path

That is the current product truth.

## Immediate Product Implication

The next important work should not be:

1. invent more shell surfaces
2. add more mock review views
3. keep rebuilding narrow shell-only behavior

The next important work should be:

1. write task turns into official runtime sessions/events
2. persist turn outcomes into handoff and replay surfaces
3. recall those surfaces on the next turn
4. let runtime learning affect future activation decisions

That is how the already-real Aionis Core capability becomes fully activated.

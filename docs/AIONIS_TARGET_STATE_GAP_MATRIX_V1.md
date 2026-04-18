Last reviewed: 2026-04-18

Internal status: active assessment

# Aionis target-state gap matrix

This document maps the current `Aionis Runtime` repository against:

1. the desktop `Aionis` migration candidates
2. `Dynamic Memory Evolution / Aionis Memory v2`
3. `Tool-Centric AGI Framework`

It is a practical gap matrix, not a marketing statement.

## Executive summary

- Highest-priority desktop migration is mostly complete.
- Second-priority desktop migration is mostly not started.
- Relative to `Dynamic Memory Evolution / Memory v2`, the current repository now has most of the kernel, but not the full operating system.
- Relative to `Tool-Centric AGI Framework`, the current repository is best understood as an `execution memory kernel`, not a full framework implementation.

## 1. Desktop Aionis migration status

| Migration area | Status | Evidence in current repo | Main remaining gap |
| --- | --- | --- | --- |
| `importance-dynamics.ts` | Implemented | [src/memory/importance-dynamics.ts](../src/memory/importance-dynamics.ts) | Continue broad caller adoption if needed |
| `node-feedback-state.ts` | Implemented | [src/memory/node-feedback-state.ts](../src/memory/node-feedback-state.ts) | No major kernel gap |
| `policy-memory.ts` | Implemented | [src/memory/policy-memory.ts](../src/memory/policy-memory.ts) | Needs broader product surfacing and more operators later |
| `evolution-inspect.ts` | Implemented | [src/memory/evolution-inspect.ts](../src/memory/evolution-inspect.ts) | Still exposed through review flow rather than a standalone public route |
| `agent-memory-inspect-core.ts` | Not implemented | Missing from `src/memory/` | Highest-value next façade migration |
| agent-memory module tests | Not implemented | Missing `scripts/ci/lite-agent-memory-inspect.test.ts` | Needed before façade routes |
| selective agent-memory routes | Not implemented | No `/v1/memory/agent/*` route family in current Lite host | Next route tranche after façade module |
| public SDK agent-memory methods | Not implemented | No `memory.agent.*` surface in [packages/full-sdk/src/client.ts](../packages/full-sdk/src/client.ts) | Depends on façade routes |
| internal CLI diagnostics | Not implemented | No selective evolution/agent-memory diagnostics command landed from desktop plan | Lower priority than façade routes |
| Python client subset | Not implemented | No `packages/python-sdk/` in current repo | Explicitly deferred |

### Migration completion estimate

| Scope | Completion estimate |
| --- | --- |
| Highest priority | 90% |
| Second priority | 15-20% |
| Overall desktop migration | 55-60% |

## 2. Dynamic Memory Evolution / Memory v2 matrix

### 2.1 Core concepts

| Target concept | Status | Current evidence | Main gap |
| --- | --- | --- | --- |
| Dynamic memory evolution | Partial | Lifecycle, pattern learning, policy memory, evolution inspect | Not yet one unified operator-facing evolution engine |
| Semantic forgetting | Partial | Archive, layer policy, some compression/distillation, cold-tier handling | Not yet a complete compression + abstraction + relocation system |
| Point-surface memory (`Anchor + Payload`) | Implemented | [docs/CORE_ANCHOR_SCHEMA.md](./CORE_ANCHOR_SCHEMA.md), anchor-linked payload rehydration, archive rehydrate | Differential payload recovery and broader product surfacing are still thin |
| Abstract layer model (`L0-L4`) | Partial | `L0-L5` layer concepts, `L4` policy memory, workflow/pattern/policy surfaces | Full generalized promotion/demotion across all layers not complete |

### 2.2 Memory layering and lifecycle

| Target capability | Status | Current evidence | Main gap |
| --- | --- | --- | --- |
| `L0 Raw Event` capture | Implemented | `memory.write`, event/evidence nodes, replay inputs | Broader arbitrary-event distillation still limited |
| `L1 Distilled Step` | Partial | [src/memory/write-distillation.ts](../src/memory/write-distillation.ts), distilled evidence/fact nodes | Not yet a generalized step-compression platform |
| `L2 Workflow` | Implemented | workflow anchors, workflow projection, replay learning | More explicit promotion APIs still missing |
| `L3 Pattern` | Implemented | tool pattern anchors, trusted/candidate/contested states | Pattern extraction is still strongest in tool-selection and replay-specific paths |
| `L4 Policy` | Partial-to-Implemented | [src/memory/policy-memory.ts](../src/memory/policy-memory.ts), `policy_contract`, governance apply | Policy layer exists, but not yet broad across all task classes |
| Execution -> Active -> Distillation -> Abstraction -> Demotion -> Archival -> Rehydration lifecycle | Partial | write/replay/tool feedback, archive/rehydrate, policy retirement/reactivation | Promotion/demotion/archival are not yet one coherent lifecycle operator system |

### 2.3 Importance and forgetting engine

| Target capability | Status | Current evidence | Main gap |
| --- | --- | --- | --- |
| Importance dynamics | Implemented | [src/memory/importance-dynamics.ts](../src/memory/importance-dynamics.ts) | Continue wider adoption as needed |
| Feedback-driven importance updates | Implemented | [src/memory/node-feedback-state.ts](../src/memory/node-feedback-state.ts), `nodes.activate`, `tools.feedback` | No major kernel gap |
| Demotion engine | Partial | archive tiering, contested/retired policy state, layer policy hints | No general demotion operator for all memory objects |
| Semantic forgetting | Partial | archive + compression + layer filtering | No full redundancy cleanup / stale-anchor cleanup / relocation engine |
| Archive relocation | Partial | archive tier, payload rehydration, cold-store language in docs | No broad external storage relocation substrate |

### 2.4 Recall and rehydration

| Target capability | Status | Current evidence | Main gap |
| --- | --- | --- | --- |
| Anchor recall | Implemented | recall, find/resolve, planning context, task start | Could be made more explicit in public action-retrieval language |
| Task-signature recall | Implemented | task signatures across anchors, planning, experience intelligence | No issue at kernel level |
| Tool-usage recall | Implemented | tool patterns, tool feedback, experience intelligence | Still tied mostly to specific strong paths |
| Error-pattern recall | Partial | error signatures exist in pattern/policy memory | Not yet fully generalized everywhere |
| Partial rehydration | Implemented | anchor payload rehydration, archive warm/hot rehydrate | Already productized enough |
| Full rehydration | Partial | payload rehydration supports deeper modes | Needs broader product surface and clearer story |
| Differential rehydration | Not implemented | No explicit public differential mode | Missing |

### 2.5 Pattern formation and policy learning

| Target capability | Status | Current evidence | Main gap |
| --- | --- | --- | --- |
| `Event -> Cluster -> Pattern -> Policy` | Partial-to-Implemented | replay learning, tool pattern anchors, policy memory | Not yet a single generalized automatic pipeline |
| Workflow extraction | Implemented | replay learning, workflow projection, workflow anchors | Good |
| Pattern formation from repeated success | Implemented | trusted/candidate/contested pattern loop | Good |
| Policy derivation from stable patterns | Partial-to-Implemented | persisted policy memory, derived policy, policy contract | Not yet broad across all task classes and memory object classes |
| Gradient-free policy learning | Implemented | `tools.feedback`, policy memory feedback, governance | Good |

### 2.6 Architecture blocks (Memory v2 section 13)

| Architecture block | Status | Current evidence | Main gap |
| --- | --- | --- | --- |
| Execution Capture Layer | Implemented | write, replay, tool feedback, event/evidence nodes | Good |
| Active Memory Layer | Partial-to-Implemented | sessions, planner packet, continuity pack, working context | Still not a fully isolated “active working set” subsystem |
| Distillation & Abstraction Layer | Partial | write distillation, replay learning, pattern/policy extraction | Still narrower than full target |
| Importance & Forgetting Engine | Partial | importance dynamics, archive, contested/retired states | Not yet full lifecycle OS |
| Recall & Rehydration Layer | Implemented to partial | recall, find/resolve, planning, anchor/payload rehydrate | Differential rehydration and broader retrieval policy remain missing |
| Storage Substrate | Partial | SQLite, archive tiering, embeddings, local stores | No broad external vector/graph/object substrate |

### Memory v2 completion estimate

| Scope | Estimate |
| --- | --- |
| Core kernel | 70-75% |
| Full target-state system | 60-65% |
| Remaining gap | 35-40% |

## 3. Tool-Centric AGI Framework matrix

### 3.1 Core loop and major modules

| Framework element | Status | Current evidence | Main gap |
| --- | --- | --- | --- |
| `Recall` | Implemented | recall, planning context, task start, execution introspect | Good |
| `Assess` / uncertainty judgment | Partial-to-missing | Some policy/risk/governance logic exists indirectly | No standalone uncertainty layer |
| `Retrieve` | Partial | recall, resolve, action-oriented retrieval seams, docs positioning | No stronger explicit action-retrieval fabric |
| `Act` | Partial-to-Implemented | sandbox, automation, tool selection, runtime surfaces | Strong enough for Lite public runtime |
| `Distill` | Partial | write distillation, replay learning, policy memory | Still narrower than full framework target |

### 3.2 Six framework modules

| Module | Status | Current evidence | Main gap |
| --- | --- | --- | --- |
| Reasoning Layer | Partial / externalized | LLM-facing orchestration around task start/planning exists, but not as the repo’s primary owned subsystem | Aionis assumes host/model reasoning rather than fully owning it |
| Recall Layer | Implemented | memory recall, task start, planning, replay reuse | Good |
| Uncertainty Layer | Not implemented as first-class layer | Some governance and contested-state logic | Missing explicit uncertainty subsystem |
| Retrieval Layer | Partial | memory recall, context assembly, action-oriented retrieval hints | No clear full “Action Retrieval” module |
| Action Layer | Partial-to-Implemented | sandbox, automations, tool selection, replay/playbooks | Good for Lite runtime |
| Distillation Layer | Partial | write distillation, replay learning, policy memory | Needs broader generalized distillation |

### 3.3 Specific framework capabilities

| Capability | Status | Current evidence | Main gap |
| --- | --- | --- | --- |
| Action memory | Implemented | replay, workflow memory, policy memory, continuity packs | Good |
| Action retrieval | Partial | task start, experience intelligence, workflow/pattern reuse | Not yet a fully explicit subsystem |
| Tool selection optimization | Implemented | `tools.select`, `tools.feedback`, policy memory | Good |
| Workflow selection optimization | Partial-to-Implemented | stable workflow reuse, replay promotion, experience intelligence | Could be more unified |
| Replay execution | Implemented | replay run/step/playbook surfaces | Good |
| Explainable action path | Implemented | rationale surfaces, review packs, introspection, evolution inspect | Good |
| New tool extensibility | Partial-to-Implemented | tool selection model and sandbox exist | “automatic tool discovery” not implemented |
| Multi-agent optimization | Partial | delegation records, handoff, continuity pack | Missing agent-facing façade and deeper coordination layer |
| Autonomous strategy evolution | Partial | policy memory + governance gives early strategy lifecycle | Still not full autonomous policy-evolution framework |

### 3.4 Aionis positioning inside the framework

| Positioning statement | Status |
| --- | --- |
| `Aionis = Execution Memory Kernel` | Accurate now |
| `Aionis = full Tool-Centric AGI Framework` | Not accurate yet |

### Tool-Centric AGI completion estimate

| Scope | Estimate |
| --- | --- |
| Full framework | 45-50% |
| Remaining gap | 50-55% |
| Execution Memory Kernel subset | 75-80% |

## 4. Practical next steps

If the goal is to maximize leverage from current momentum, the next work should not be “more broad framework.”

Priority order:

1. port `agent-memory-inspect-core.ts` and selective `/v1/memory/agent/*` routes
2. expose selective `memory.agent.*` surfaces in the public SDK
3. build 2-3 hard demos that prove:
   - better second task start
   - persisted policy memory after positive feedback
   - contested -> retire/reactivate governance flow
4. continue the `Memory v2` line:
   - broader distillation
   - promotion/demotion
   - semantic forgetting
   - stronger rehydration modes

That path deepens the part of the system that is already becoming real, instead of diluting effort into the full AGI framework too early.

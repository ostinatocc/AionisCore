# Runtime Canonical Execution Contract Refactor

Document status: Approved working plan  
Date: 2026-04-23

## Why this refactor exists

This plan is not benchmark-driven.

The full Runtime audit shows that Aionis does not primarily suffer from a missing feature. It suffers from fragmented ownership of the same continuity payload.

Today the same execution/recovery intent is assembled and re-assembled across multiple surfaces:

- trajectory compile
- handoff
- action retrieval
- planning summary assembly
- tools feedback materialization
- workflow write projection
- policy memory materialization

The result is architectural drift:

- the same fields are merged in multiple places
- trust and provenance are not owned centrally
- outcome requirements are not represented in one canonical contract
- every new feature risks adding one more parallel contract surface

The correct response is not to make Aionis smaller by deleting core capabilities. The correct response is to make ownership explicit.

## First-principles correction

Aionis is a full Runtime. It is not only a memory kernel.

The architecture must be understood as three layers:

1. `Runtime Platform`
   - runtime assembly
   - host/routes
   - persistence/store
   - sandbox
   - automation
   - replay execution infrastructure

2. `Continuity Kernel`
   - `Contract Compiler`
   - `Trust Gate`
   - `Orchestrator`
   - `Learning Loop`

3. `Lifecycle / Governance Plane`
   - semantic forgetting
   - archive relocation / rehydrate
   - workflow and policy governance
   - review and promotion lifecycle

Only the `Continuity Kernel` should be reduced to four core responsibilities. The full Runtime must remain broader than that.

## Non-negotiable invariants

The refactor will follow these invariants:

1. No benchmark-specific architecture.
   - No task-name branches.
   - No benchmark-only routes.
   - No contract fields that only make sense for one benchmark harness.

2. One canonical execution contract owner.
   - Compiler produces it.
   - Handoff carries it.
   - Orchestrator consumes it.
   - Learning/governance project from it.
   - Other surfaces may project it, but they do not own independent truth.

3. Existing product capabilities remain first-class.
   - continuity
   - replay
   - semantic forgetting
   - self-evolution / learning
   - policy memory
   - governance
   - sandbox / automation

4. Trust must gate steering.
   - weak contracts may exist
   - weak contracts may be recalled
   - weak contracts must not silently become strong steering or stable policy

## The real problem to solve

The problem is contract fragmentation.

Today the Runtime spreads execution intent across:

- `recovery_contract_v1`
- `execution_state_v1`
- `execution_packet_v1`
- `trajectory_compile_v1`
- `policy_contract`
- `derived_policy`
- host-facing kickoff / first-step summaries

These surfaces are useful, but they should not all be top-level contract owners.

The refactor therefore introduces a single canonical owner:

- `execution_contract_v1`

Everything else becomes either:

- an execution projection
- a governance projection
- a transport/compatibility projection
- a host-facing summary projection

## Canonical execution contract

`execution_contract_v1` becomes the continuity kernel's single source of truth.

It owns:

- `contract_trust`
- `task_family`
- `task_signature`
- `workflow_signature`
- `policy_memory_id`
- `selected_tool`
- `file_path`
- `target_files`
- `next_action`
- `workflow_steps`
- `pattern_hints`
- `service_lifecycle_constraints`
- `acceptance_checks`
- `success_invariants`
- `dependency_requirements`
- `environment_assumptions`
- `must_hold_after_exit`
- `external_visibility_requirements`
- provenance and evidence references

This contract is intentionally broader than the old recovery-only shape. It must represent not only "what to change next" but also "what final success requires".

## What changes and what does not

### What changes

- `trajectory compile` stops directly acting as a multi-surface writer and instead emits canonical contract first
- `handoff` stores and returns canonical contract
- `recovery_contract_v1` becomes a compatibility projection, not the main owner
- workflow/policy materialization will later project from canonical contract rather than recompute contract fields ad hoc

### What does not change

- replay stays
- semantic forgetting stays
- archive/rehydrate stays
- policy governance stays
- sandbox and automation stay
- Lite runtime platform structure stays

This is a unification refactor, not a product simplification through feature loss.

## Current refactor status

The refactor is already in progress. The current state is:

- Phase 1 is complete enough to serve as the new root:
  - canonical `execution_contract_v1` schema exists
  - trust is shared through a dedicated helper surface
  - outcome/delivery fields exist on the canonical contract
  - explicit canonical contracts now own their non-empty execution action surface; legacy projections may fill missing fields, but they must not append stale `target_files`, `workflow_steps`, `pattern_hints`, `acceptance_checks`, or service lifecycle constraints into an already-populated canonical contract
- Phase 2 is in progress and already landed on the main producer paths:
  - trajectory compile writes canonical contract first
  - handoff stores and recovers canonical contract
  - write distillation now emits canonical contract on distilled facts when execution signatures are present, instead of leaving execution metadata stranded in `execution_native_v1`
  - execution-native slot normalization now also normalizes `execution_contract_v1`, so anchors, continuity carriers, and execution-signature facts no longer depend on downstream consumers to reconstruct canonical contract later
- Phase 3 is materially underway:
  - action retrieval, experience intelligence, planning summary, and memory context assembly now consume canonical contract
  - action retrieval now resolves a canonical context contract only when explicit continuity surfaces are present; bare ambient request metadata such as `task_kind` no longer hardens into host-facing execution contract
  - action retrieval now merges context continuity, persisted policy memory, workflow memory, path recommendation, and tool selection into one canonical execution contract before projecting host-facing `recommended_*`, `path`, and kickoff surfaces
  - action retrieval now only applies trusted pattern memory when it is relevant to the current query/context; a same-tool pattern alone is not enough to mark history applied
  - replay / recall / execution introspection now read canonical contract directly instead of reconstructing it from thin projections
  - node-level execution interpretation is being centralized behind a shared execution surface instead of being repeated in each consumer
  - recall/action packet, runtime tool hints, pattern operator override, and execution introspection now consume the shared execution surface rather than carrying private slot interpreters
  - execution introspection workflow, pattern, policy, distillation, and continuity entries now resolve file path, target files, next action, workflow signatures, task family, trust, lifecycle constraints, and policy state through the shared node execution surface
- Phase 4 is underway:
  - tools feedback, workflow write projection, replay learning artifacts, policy memory, evolution review packs, and agent memory packs now project from canonical contract rather than owning a separate primary truth
  - tools feedback now extracts workflow feedback targets through canonical contract resolution; legacy recovery and trajectory surfaces feed the canonical builder instead of being parsed as separate primary surfaces
  - pattern trust shaping now resolves task family and affinity through canonical contract context first, while preserving natural task text as the task-signature cue
  - workflow write projection and policy memory lifecycle now read signatures, trust, target files, file path, and policy state through the shared execution surface instead of rebuilding them from `execution_native_v1` plus thin slots
  - tools-select pattern recall, recall action packets, and execution introspection pattern/policy views now consume the shared execution surface instead of manually re-reading mixed legacy slots
  - replay-learning workflow observation counting now keys off canonical workflow signature first, with `execution_native_v1` kept only as compatibility fallback
  - continuity review packs and agent memory review/resume/handoff packs now use canonical contract-first fields for `file_path`, `target_files`, `next_action`, and `acceptance_checks`; recovered handoff fields are fallback transport data, not primary steering truth
  - action retrieval, tools feedback materialization, evolution governance, agent memory packs, and context overlay now share the same action-surface merge helper; downstream consumers no longer call the raw scalar/list merge directly
  - tools feedback materialization now uses the current canonical execution contract as outcome evidence when deciding whether a learned pattern can become stable policy memory

The Trust Gate rule is now explicit:

- `authoritative` steering requires explicit authoritative trust
- `authoritative` steering also requires a canonical outcome signal, currently represented by non-empty `execution_contract_v1.outcome.success_invariants`
- computed confidence, pattern credibility, or workflow stability can support advisory guidance, but they cannot independently upgrade to authoritative
- persisted policy memory is distinct from computed guidance; stable workflow or trusted pattern guidance remains `computed` until a policy memory node is actually materialized
- advisory candidate policy memory may persist for hinting and governance, but it remains non-authoritative until stronger trust and outcome evidence are present

What still remains is not a new feature wave. It is the final ownership cleanup:

- continue moving downstream consumers to direct canonical reads
- keep legacy surfaces only as explicit compatibility projections
- delete or neutralize ad hoc reassembly paths once all important consumers read canonical contract directly

This means the refactor is past the experimental stage. The remaining work is consolidation and deletion of duplicate ownership.

## Phased execution plan

### Phase 1: Establish canonical ownership

Create a dedicated execution-contract module and schema.

Deliverables:

- `execution_contract_v1` schema
- merge and projection helpers
- outcome/delivery sub-structure
- provenance model

Initial producers updated in this phase:

- trajectory compiler path
- handoff store/recover path

Compatibility rule:

- legacy fields still project out for current consumers
- no new independent contract surfaces are added

### Phase 2: Refactor producer paths

Refactor producer paths so they write canonical contract first and legacy projections second.

Targets:

- `trajectory-compile-runtime`
- `handoff`
- route responses that expose continuity payloads

Success condition:

- producer paths no longer manually own multiple parallel field sets as primary truth

### Phase 3: Refactor orchestrator consumption

Refactor orchestration surfaces to consume canonical contract rather than re-deriving contract-like state from mixed sources.

Targets:

- `action-retrieval`
- `experience-intelligence`
- `planning-summary-assembly`
- `memory-context-runtime`
- shared node-level execution surface for downstream orchestration consumers

Success condition:

- orchestrator paths read one contract and make trust decisions from that contract
- anchor/pattern/tool interpretation no longer forks across consumer-specific slot parsing

### Phase 4: Refactor learning and governance projections

Refactor workflow/policy/promotion paths so they project from canonical contract.

Targets:

- `tools-feedback`
- `workflow-write-projection`
- `replay-learning-artifacts`
- `policy-memory`
- promotion/governance review helpers
- recall/introspection/runtime-tool-hints consumers that still reconstruct legacy pattern identity ad hoc

Success condition:

- learning loop does not define its own contract semantics
- stable policy/workflow promotion uses projected canonical data
- lifecycle/governance/introspection surfaces consume projected canonical state instead of re-owning mixed legacy contract fields

### Phase 5: Runtime dogfood

Validate the Runtime on real tasks instead of using benchmark tasks as the design source.

Required task families:

- service start + after-exit revalidation
- publish/install paths
- deploy/hook/web flows
- interrupted resume
- handoff across agents or roles

Primary metrics:

- first correct action
- wasted steps
- retries
- false-confidence rate
- after-exit correctness

Dogfood reports must also declare their proof boundary:

- whether execution evidence is `declared_fixture`, `external_probe`, or absent
- how many scenarios are live external execution validations
- which Runtime task families are covered
- which scenarios are negative controls for authority denial or false-confidence blocking

This prevents a contract compilation slice from being misread as live product execution proof.

The dogfood runner must also accept serializable task specs through `--tasks-json`, so real task traces and external probe evidence can be evaluated without adding task-specific code paths.

The Runtime dogfood suite also includes an `external-probe` runner that starts a real detached local service, waits for the launcher process to exit, validates the health endpoint from a fresh shell, and feeds the resulting evidence back through the same task-spec dogfood path.

Benchmarks are allowed only as validation after this dogfood pass.

## Implementation rules

1. No new benchmark-specific abstractions.
2. No single-task heuristics in canonical contract logic.
3. No direct new ownership of contract-like fields outside `execution_contract_v1`.
4. Any legacy surface kept for compatibility must be explicitly labeled as a projection.
5. If a field cannot be justified across multiple real Runtime task families, it does not belong in the canonical contract.
6. When merging contracts, scalar identity can be backfilled by priority order, but non-empty execution action surfaces must stay coherent with the highest-priority contract instead of being concatenated across stale projections.
7. `authoritative` is a Trust Gate outcome, not a recall score. It must be backed by explicit trust and outcome requirements.
8. Relevant pattern/workflow memory may guide action, but unrelated same-tool memory must not mark history applied or change the source kind.

## Immediate work order

The immediate work order for the current branch is:

1. Continue removing remaining legacy reassembly paths that still treat `execution_native_v1`, `recovery_contract_v1`, or `policy_contract_v1` as primary truth instead of canonical inputs
2. Keep compatibility projections explicit, but make downstream readers consume `execution_contract_v1` or the shared node execution surface first
3. Audit policy/workflow promotion paths for any remaining route-local trust upgrades
4. Finish deleting duplicate ownership in remaining lifecycle/governance consumers
5. Only after ownership cleanup is complete, move to Runtime dogfood across real task families

## Definition of success

This refactor succeeds when:

- the Runtime remains a full Runtime
- continuity kernel responsibilities become clearer
- replay / forgetting / governance remain intact
- the same execution intent is no longer owned independently by multiple modules
- outcome/delivery requirements are part of canonical contract truth
- trust can act on one canonical contract instead of a patchwork of parallel surfaces

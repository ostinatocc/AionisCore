# Aionis Runtime Architecture Map

Last reviewed: 2026-04-25

Document status: living architectural boundary reference

This document is the current architecture map for AionisRuntime. It is not a historical completion report and it is not a benchmark adapter plan. It defines the product surfaces, the four core runtime layers, and the boundary rules that future changes must preserve.

## Architectural position

AionisRuntime is a local-first execution-memory runtime.

The shipped runtime shape today is Lite: a local HTTP runtime with SQLite-backed persistence, local replay, local automation, local sandbox execution, SDK integration, and evidence-based memory recall.

The repository contains more than the Lite kernel, but Lite is the current product runtime boundary. Hosted control-plane capabilities, multi-tenant administration, server automation governance, compensation tooling, and shadow review surfaces are outside the current Lite completion target unless they are explicitly exposed as structured unsupported routes.

## Product surfaces

### 1. Runtime kernel

Owned by:

1. `apps/lite/`
2. `src/runtime-entry.ts`
3. `src/app/runtime-services.ts`
4. `src/app/request-guards.ts`
5. `src/host/http-host.ts`
6. `src/host/lite-edition.ts`
7. `src/memory/*`
8. `src/store/*`

Responsibilities:

1. start the Lite runtime shell
2. assemble stores, guards, recall policy, replay policy, sandbox budget, and host hooks
3. register the Lite HTTP route matrix
4. enforce local-first runtime defaults
5. close stores and executors through explicit host lifecycle hooks

### 2. HTTP API surface

Owned by:

1. `src/routes/memory-write.ts`
2. `src/routes/handoff.ts`
3. `src/routes/memory-access.ts`
4. `src/routes/memory-recall.ts`
5. `src/routes/memory-context-runtime.ts`
6. `src/routes/memory-feedback-tools.ts`
7. `src/routes/memory-replay-core.ts`
8. `src/routes/memory-replay-governed.ts`
9. `src/routes/automations.ts`
10. `src/routes/memory-lifecycle-lite.ts`
11. `src/routes/memory-sandbox.ts`

Responsibilities:

1. expose stable local runtime routes
2. compose prebuilt runtime services instead of defining policy ad hoc
3. return structured unsupported responses for server-only route groups
4. keep endpoint behavior aligned with `LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md`

Boundary rule:

Route modules must not import Trust Gate internals, build authority gates, assess execution evidence, or construct promotion/trust policy surfaces directly. They may assemble request identity, validation, rate limits, and stable app/runtime services, then call the appropriate memory or app boundary.

### 3. SDK and package surface

Owned by:

1. `packages/full-sdk/`
2. `packages/sdk/`
3. `packages/aionis-runtime/`
4. `packages/runtime-core/`
5. `packages/aionis-doc/`

Responsibilities:

1. provide the public SDK integration path
2. provide internal SDK coverage for runtime routes
3. package the local runtime CLI
4. preserve the runtime-core extraction seam
5. provide document parser/compiler primitives

### 4. Observation and proof surface

Owned by:

1. `apps/inspector/`
2. `apps/playground/`
3. `apps/docs/`
4. `examples/`
5. `scripts/ci/`
6. `scripts/lite-runtime-dogfood*.ts`

Responsibilities:

1. demonstrate the runtime path through SDK examples
2. validate the shipped Lite surface in CI
3. prove runtime behavior through dogfood tasks
4. make contract, continuity, learning, and boundary regressions visible

### 5. Documentation surface

Owned by:

1. `README.md`
2. `docs/README.md`
3. `docs/LOCAL_RUNTIME_ARCHITECTURE_AND_COMPLETION.md`
4. `docs/LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md`
5. `docs/LOCAL_RUNTIME_SOURCE_BOUNDARY.md`
6. `docs/AIONIS_RUNTIME_ARCHITECTURE_MAP.md`

Responsibilities:

1. define the current product boundary
2. describe the current source boundary
3. record supported and unsupported Lite surfaces
4. prevent benchmark-specific or stale planning docs from becoming product truth

## Core runtime layers

All new runtime behavior must fit inside one of these layers. If a proposed change cannot fit here, it needs an explicit architecture decision before implementation.

### 1. Contract Compiler

Purpose:

Compile raw execution, handoff, replay, workflow, policy, and trajectory signals into stable execution contracts.

Primary modules:

1. `src/memory/execution-contract.ts`
2. `src/memory/trajectory-compile.ts`
3. `src/memory/trajectory-compile-runtime.ts`
4. `src/memory/handoff.ts`
5. `src/memory/workflow-write-projection.ts`
6. `src/memory/node-execution-surface.ts`
7. `src/memory/write-execution-native.ts`
8. `src/memory/write-distillation.ts`

Stable contract outputs:

1. `execution_contract_v1`
2. `outcome_contract_v1` fields inside `execution_contract_v1.outcome`
3. `target_files`
4. `acceptance_checks`
5. `next_action`
6. `workflow_steps`
7. `pattern_hints`
8. `service_lifecycle_constraints`

Boundary rule:

Consumers must read execution meaning through contract and resolver surfaces. They must not directly parse legacy slot names such as `execution_native_v1` or `anchor_v1` unless they are an explicitly allowed boundary module.

### 2. Trust Gate

Purpose:

Decide whether a contract, pattern, workflow, policy, or replay-derived signal is authoritative, advisory, or observational.

Primary modules:

1. `src/memory/contract-trust.ts`
2. `src/memory/execution-evidence.ts`
3. `src/memory/authority-gate.ts`
4. `src/memory/authority-producer-registry.ts`
5. `src/memory/authority-visibility.ts`
6. `src/memory/authority-consumption.ts`
7. `src/memory/governance-*.ts`
8. `src/memory/*-governance*.ts`
9. `src/memory/replay-run-gates.ts`
10. `src/memory/replay-run-gate-step-outcomes.ts`

Stable decisions:

1. no authoritative promotion without sufficient outcome contract evidence
2. no hidden authority consumption without an explicit visibility surface
3. no replay or policy promotion without gateable evidence
4. false confidence is a runtime defect, not a presentation issue

Boundary rule:

Trust modules may consume canonical execution contracts and evidence surfaces. They must not recover authority by directly reading legacy storage slots.

Authority-producing modules must be declared in `src/memory/authority-producer-registry.ts` before they call `buildRuntimeAuthorityGate`, persist stable workflow memory, persist authoritative policy memory, or emit stable pattern guidance. Outcome-contract and execution-evidence gates must stay in declared trust-evaluation or authority-consuming boundaries.

Workflow and policy producers that persist `stable`, `active`, or `authoritative` reusable memory must bind the write to `runtime_authority_gate_v1`, `outcome_contract_gate_v1`, and execution-evidence assessment for that produced surface. Pattern producers are separate: a stable trusted pattern is advisory guidance only, must remain non-authoritative, and must carry promotion/revalidation or governance provenance.

Read-side consumers must preserve the same authority boundary. A candidate workflow may be surfaced for inspection, rehydration, recall evidence, and promotion review, but it must not emit stable workflow tool-source authority, stable workflow steps, workflow reuse policy hints, or default policy contracts. A trusted pattern by itself may select or prefer a tool, but it remains advisory candidate guidance until a stable workflow or a live authoritative execution contract supplies the policy authority.

Authority decision reporting is a read-only Trust Gate summary surface. It may explain outcome contract gates, execution evidence gates, stable promotion decisions, false-confidence blocking, candidate workflow inspect/rehydrate limits, trusted-pattern advisory limits, and policy default materialization decisions. It must not grant Runtime authority, mutate memory, or bypass producer gates.

The producer registry is the source manifest for authority write boundaries. CI boundary consumers must read the unified runtime boundary inventory instead of maintaining independent path allowlists, so a new producer cannot appear as an accidental code-search exception.

### 3. Orchestrator

Purpose:

Turn memory, policy, workflow, and recall signals into runtime-ready planning and action surfaces.

Primary modules:

1. `src/memory/context-orchestrator.ts`
2. `src/memory/action-retrieval.ts`
3. `src/memory/recall-action-packet.ts`
4. `src/memory/experience-intelligence.ts`
5. `src/app/planning-summary-*`
6. `src/app/recall-policy.ts`
7. `src/app/recall-text-embed.ts`
8. `src/routes/memory-context-runtime.ts`
9. `src/routes/memory-recall.ts`

Stable outputs:

1. planner packet
2. action packet
3. workflow signals
4. pattern signals
5. runtime tool hints
6. rehydration candidates
7. `execution_summary_v1` child summaries for strategy, collaboration, continuity, routing, maintenance, forgetting, delegation records, and instrumentation

Boundary rule:

The orchestrator composes canonical surfaces. It does not define persistence schema and does not directly parse legacy execution slots.

Orchestrator routes and modules must not mutate persistence, call memory write paths, import learning-loop writers, or import Trust Gate producer internals. They may consume resolver-backed node execution surfaces, recall access, planner packets, authority consumption state, and app-assembled summaries.

### 4. Learning Loop

Purpose:

Turn successful or failed execution traces into reusable workflows, patterns, policies, and lifecycle feedback.

Primary modules:

1. `src/memory/replay-*.ts`
2. `src/memory/replay-learning.ts`
3. `src/memory/replay-learning-artifacts.ts`
4. `src/memory/tools-feedback.ts`
5. `src/memory/tools-pattern-anchor.ts`
6. `src/memory/policy-memory.ts`
7. `src/memory/pattern-trust-shaping.ts`
8. `src/memory/semantic-forgetting.ts`
9. `src/memory/lifecycle-lite.ts`
10. `src/memory/nodes-activate.ts`

Stable outputs:

1. replay runs
2. playbooks
3. workflow anchors
4. trusted or contested patterns
5. policy memory
6. semantic forgetting decisions
7. activation and lifecycle feedback

Boundary rule:

Learning modules can create canonical write artifacts through write/projection boundaries. They must not become a second contract compiler by directly reading legacy slots for authority or orchestration decisions.

Learning modules may consume shared contract, trust, and policy-materialization surfaces. They must not call Orchestrator response builders directly; feedback-driven learning should materialize reusable policy/workflow memory through canonical learning or write boundaries, not by re-entering planner assembly.

## Memory retention and semantic forgetting

Memory retention is part of the Learning Loop, not a separate memory subsystem.

Owned by:

1. `src/memory/semantic-forgetting.ts`
2. `src/memory/importance-dynamics.ts`
3. `src/app/planning-summary-forgetting.ts`
4. `src/memory/evolution-operators.ts`
5. `src/memory/archive-relocation.ts`
6. `src/memory/differential-rehydration.ts`
7. `src/memory/lifecycle-lite.ts`

Purpose:

Decide whether memory should remain visible, move colder, be archived, or require review without losing canonical execution evidence.

Decision inputs:

1. node type, tier, title, and summary quality
2. salience, importance, and confidence
3. workflow, pattern, policy, and anchor surfaces resolved through `node-execution-surface`
4. trust state, policy memory state, credibility state, and lifecycle state
5. feedback quality and activation recency
6. archive relocation and rehydration metadata

Stable decision outputs:

1. `retain`
2. `demote`
3. `archive`
4. `review`

Public summary surface:

The planner-facing contract is `execution_forgetting_summary_v1`, exposed through planning and assembly summaries. It is a strict response contract, not an open-ended diagnostic blob. It reports substrate mode, suppressed pattern counts, semantic action counts, lifecycle state counts, archive relocation counts, rehydration mode counts, stale signal counts, and the recommended maintenance action.

Boundary rule:

Semantic forgetting may reduce visibility, move memory to colder tiers, mark contested or retired memory for review, and recommend archive or rehydrate actions. It must not delete canonical evidence, upgrade trust, bypass the Trust Gate, or create new authority. Archive is a cold-storage lifecycle state; return to active use must go through explicit rehydration or activation boundaries.

## Boundary inventory

Runtime boundary manifests are source-owned, not CI-owned.

The current boundary manifests are:

1. `src/memory/authority-producer-registry.ts`
2. `src/memory/legacy-access-registry.ts`

The unified inventory surface is `src/memory/runtime-boundary-inventory.ts`.

The local operator/debug route is `GET /v1/runtime/boundary-inventory`, registered by `src/routes/runtime-boundary-inventory.ts`.

The public response contract is `RuntimeBoundaryInventoryResponseSchema`. It is strict: route consumers may rely on the documented fields, and new passthrough debug fields must not be added without an explicit contract change.

Responsibilities:

1. expose all declared authority and legacy direct-access boundaries through one read-only inventory
2. preserve each entry's source registry, source id, file, role or boundary kind, and guard metadata
3. make cross-cutting boundary ownership visible without adding new producer or consumer authority
4. let CI verify inventory consistency against source manifests and consume inventory selectors instead of duplicating path allowlists
5. expose the same source-owned inventory through a read-only local API surface for operator audit and SDK debugging
6. validate the public API response through a strict schema instead of returning an extensible debug blob

Boundary rule:

The inventory is observational. It may aggregate manifests and expose summaries, but it must not decide trust, promote memory, mutate persistence, parse legacy slots, or grant new direct-access privileges.

## Direct legacy access boundary

The following legacy slot names are storage compatibility details:

1. `execution_native_v1`
2. `anchor_v1`

The direct-access manifest for these storage compatibility details is `src/memory/legacy-access-registry.ts`.

Direct access to those names is allowed only in these boundary categories:

1. schema definitions
2. write and projection builders
3. contract compiler and node execution surface resolvers
4. archive and rehydrate boundary modules
5. store adapters that translate persisted rows into canonical runtime surfaces

Runtime consumers outside those categories must use:

1. `resolveNodeExecutionContract`
2. `resolveNodeWorkflowSignature`
3. `resolveNodeTargetFiles`
4. `resolveNodeNextAction`
5. `resolveNodeAcceptanceChecks`
6. `resolveNodeServiceLifecycleConstraints`
7. other resolver helpers from `src/memory/node-execution-surface.ts`

This rule is enforced by `scripts/ci/lite-runtime-legacy-boundary.test.ts`, which must consume `src/memory/runtime-boundary-inventory.ts` instead of carrying an independent path allowlist.

## Passthrough schema boundary

Runtime public contracts should be strict by default. Any remaining `.passthrough()` in `src/memory/schemas.ts` must be explicitly classified in `src/memory/passthrough-schema-registry.ts` as one of:

1. `compatibility_boundary_allowed`
2. `debug_operator_payload_allowed`
3. `legacy_storage_allowed`

Stable public contracts that should reject undeclared fields must be registered as `public_contract_should_be_strict` with `disposition: "must_be_strict"` and `passthrough_count: 0`.

This rule is enforced by `scripts/ci/lite-runtime-passthrough-boundary.test.ts`. Adding a new open schema surface without classification is a CI failure.

## Product completeness assessment

Complete today:

1. local Lite runtime startup and shutdown lifecycle
2. local memory write, recall, context assembly, and action retrieval
3. task handoff and recovery
4. session, event, pack, find, resolve, and local rehydrate surfaces
5. replay run lifecycle and playbook compilation
6. local governed replay subset
7. local automation kernel
8. local sandbox execution surface
9. execution contract, trust gate, authority gate, and evidence surfaces
10. replay learning, workflow anchors, policy memory, memory retention, semantic forgetting, archive relocation, and lifecycle feedback
11. SDK, runtime package, examples, and CI proof surfaces

Not complete by design in Lite:

1. hosted admin/control plane
2. hardened production network exposure
3. multi-tenant quota and auth control plane
4. full server automation governance
5. shadow review and compensation orchestration
6. cloud-hosted runtime operations

Current architectural risk:

The runtime has enough capability to be a real local-first execution-memory product, but it also has enough surface area to become hard to reason about if new behavior bypasses the four core layers. The guardrail is therefore architectural, not benchmark-specific: new behavior must either compile contracts, gate authority, orchestrate canonical surfaces, or feed the learning loop.

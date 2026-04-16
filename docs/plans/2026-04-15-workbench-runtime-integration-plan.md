Last reviewed: 2026-04-16

Document status: historical implementation plan

# Workbench Runtime Integration Plan

## Goal

This plan defines which `Aionis Workbench` capabilities should be absorbed into `Aionis runtime`, which should become shared protocol surfaces, and which must remain outside the runtime boundary.

The target is not to merge Workbench wholesale into runtime. The target is to extract the parts of Workbench that are genuinely reusable execution-memory infrastructure and make them first-class runtime surfaces.

## Boundary Decision

`Aionis runtime` remains the continuity and execution-memory kernel.

`Aionis Workbench` remains the product shell, execution host adapter layer, and higher-level operator experience.

That means the following are explicitly out of scope for runtime:

- CLI shell flows such as `aionis ready`, `aionis run`, `aionis resume`, and `aionis session`
- `deepagents` execution-host integration and runtime bridge wiring
- app harness, live delivery, and delivery workspace/product shell behavior
- runtime process lifecycle management and operator dashboards

## What Should Move Into Runtime

### 1. Reviewer and Runtime Contracts

Workbench already defines a clean reviewer-facing and runtime-facing contract layer:

- `workbench/src/aionis_workbench/reviewer_contracts.py`
- `workbench/src/aionis_workbench/runtime_contracts.py`

These map directly to runtime infrastructure concerns:

- structured handoff recovery
- reviewer-ready continuity packs
- reviewer-ready evolution packs
- strict parsing of runtime responses at integration boundaries

Runtime already contains the server-side schema base for this:

- `src/execution/types.ts`
- `src/memory/reviewer-packs.ts`

The missing work is to make these contracts first-class on the public SDK/client boundary and keep the response shapes stable.

### 2. Execution and Provenance Summary Surfaces

Workbench defines a valuable execution-summary layer in:

- `workbench/src/aionis_workbench/execution_packet.py`

The most reusable structures are:

- `PlannerPacket`
- `StrategySummary`
- `PatternSignalSummary`
- `WorkflowSignalSummary`
- `RoutingSignalSummary`
- `MaintenanceSummary`
- `InstrumentationSummary`

Runtime already has partial equivalents in:

- `src/memory/context-orchestrator.ts`
- `src/app/planning-summary.ts`

The correct move is not to duplicate Workbench dataclasses inside runtime. The correct move is to converge runtime’s existing planner and introspection surfaces toward a single public contract that matches this execution-summary model.

### 3. Delegation, Collaboration, Artifact, and Forgetting Substrate

Workbench’s session substrate contains reusable execution-memory primitives:

- `DelegationPacket`
- `CollaborationPattern`
- `ArtifactReference`
- `ForgetEntry`

These come from:

- `workbench/src/aionis_workbench/session.py`
- `workbench/src/aionis_workbench/policies.py`

The runtime should absorb the substrate concepts, not the full Workbench `SessionState`.

The runtime-side outcome should be:

- reusable collaboration pattern records
- explicit artifact-reference routing signals
- explicit forgetting and suppression signals
- continuity snapshots that can survive across hosts and shells

### 4. Recovery Artifact Contracts

Workbench’s recovery service contains useful artifact contracts and recovery signals:

- validation result
- deterministic correction packet
- rollback hint
- timeout artifact

These originate in:

- `workbench/src/aionis_workbench/recovery_service.py`

The runtime should absorb the artifact contracts and memory representations, but not the entire recovery-service implementation or product workflow.

## What Stays In Workbench

The following should remain Workbench-only:

- CLI/product shell modules
- runtime-manager and local launcher behavior
- deepagents host integration
- app harness planning/evaluation/retry loops
- delivery workspace bootstrapping and live delivery flows
- operator dashboards and shell status surfaces

These are product-shell concerns, not runtime-kernel concerns.

## Phased Execution Plan

### P0. Contract Convergence

Objective: make existing runtime continuity/evolution surfaces first-class in the public SDK and freeze the contract boundary.

Deliverables:

- add typed `continuity review-pack` and `evolution review-pack` request/response contracts to `packages/full-sdk`
- expose review-pack routes on the public runtime SDK client
- document the new surface in the SDK quickstart
- keep runtime route behavior unchanged

Concrete files:

- `packages/full-sdk/src/contracts.ts`
- `packages/full-sdk/src/client.ts`
- `packages/full-sdk/test/client.test.ts`
- `docs/SDK_QUICKSTART.md`

### P1. Shared Execution Summary Layer

Objective: converge runtime planner/introspection outputs toward the Workbench execution-summary model.

Deliverables:

- formal runtime contract for planner packet and execution summary bundle
- stable routing, maintenance, and instrumentation summaries on the runtime side
- remove implicit-only summary derivation where possible

Concrete runtime focus:

- `src/memory/context-orchestrator.ts`
- `src/app/planning-summary.ts`
- `src/memory/execution-introspection.ts`
- `src/memory/schemas.ts`

Current progress on `2026-04-15`:

- runtime now exposes a unified `execution_summary_v1`
- `routing_signal_summary`, `maintenance_summary`, and `instrumentation_summary` are first-class runtime surfaces
- runtime now also exposes a runtime-native `strategy_summary` inside `execution_summary`, carrying the stable subset of Workbench `StrategySummary` semantics:
  - `trust_signal`
  - `strategy_profile`
  - `validation_style`
  - `task_family`
  - `family_scope`
  - `family_candidate_count`
  - `selected_working_set`
  - `selected_validation_paths`
  - `selected_pattern_summaries`
  - `preferred_artifact_refs`
  - `explanation`
- runtime now also exposes a runtime-native `collaboration_summary` inside `execution_summary`, carrying packet-side collaboration payload that Workbench previously held above the runtime boundary:
  - packet presence and coordination mode
  - current stage and active role
  - reviewer contract presence and review standard
  - resume-anchor presence and primary file path
  - packet artifact/evidence refs plus side-output artifact/evidence counts
- runtime now also exposes a host-agnostic `continuity_snapshot_summary` inside `execution_summary`, packaging the reusable subset of current execution state for resume/handoff-oriented consumers:
  - trust signal, strategy profile, and validation style
  - current coordination mode, stage, and active role
  - working set, validation paths, and selected pattern summaries
  - preferred artifact/evidence refs
  - reviewer-ready flag, resume-anchor file path, and maintenance action
- runtime now also exposes a runtime-native `forgetting_summary` inside `execution_summary`, carrying the first real forgetting/suppression substrate that can later back full records:
  - substrate mode (`stable`, `suppression_present`, `forgetting_active`)
  - forgotten item totals and primary forgetting reason
  - suppressed pattern anchor ids and source buckets
  - selected memory layers, savings levers, and stale-signal count
- runtime now also exposes a host-agnostic `collaboration_routing_summary` inside `execution_summary`, carrying the reusable routing slice that Workbench previously kept above the runtime boundary:
  - route mode, coordination mode, and route intent
  - target files, validation paths, blockers, and hard constraints
  - review contract outputs/checks plus preferred artifact/evidence refs
  - derived routing drivers from reviewer readiness, resume anchors, task family, and reuse signals
- runtime now also exposes `delegation_records_summary` inside `execution_summary`, carrying the first typed record layer below the routing summary:
  - one derived runtime-native delegation packet record for the current route
  - artifact/evidence routing records with explicit source attribution
  - an explicit `missing_record_types` gap for `delegation_returns`, so the persistence hole is modeled rather than hidden
- runtime now also persists `delegation_records_v1` on `handoff/store` nodes and returns it on `handoff/store` + `handoff/recover`, providing the first true record source beneath the summary layer:
  - packet/return/routing records are now written into continuity slots instead of only being derived at read time
  - `delegation_returns` can now be sourced from stored `execution_result_summary`
  - legacy handoff nodes still recover through a compatible fallback derivation path
- runtime now also exposes a standalone `POST /v1/memory/delegation/records` write surface for the same typed substrate:
  - hosts can persist runtime-native delegation packet/return/routing records without going through handoff
  - records are stored as `summary_kind=delegation_records` event nodes and stay queryable through the existing `find/resolve` APIs
  - default lane is `shared`, matching the collaboration/continuity substrate instead of private scratch memory
- runtime now also consumes persisted `delegation_records` nodes inside `planning_context`, `context_assemble`, and `execution_introspect`:
  - `execution_summary.delegation_records_summary` now prefers stored typed records over the derived fallback when a matching record is present
  - context routes use explicit `run_id` and `resume_anchor/handoff_anchor` lookup keys instead of fuzzy recent-node heuristics
  - introspection now surfaces the most recent persisted delegation records even without request-side execution packets
- runtime now also exposes a typed `POST /v1/memory/delegation/records/find` surface above generic `find`:
  - hosts can query delegation records by `record_id`, `run_id`, `handoff_anchor`, `route_role`, `task_family`, `family_scope`, and `record_mode`
  - responses return typed record entries plus an aggregate summary over record modes, return statuses, artifact sources, and continuity coverage
  - local consumer identity is applied by default, so private delegation records remain visible to the local actor without widening the access model
- runtime now also exposes a typed `POST /v1/memory/delegation/records/aggregate` surface for trend and coverage consumers:
  - hosts can ask for route-role and task-family buckets without first materializing every record client-side
  - aggregate responses now expose continuity coverage (`records_with_returns`, payload presence, missing-type coverage) plus recurring refs/checks/working-set files
  - aggregate responses now also expose normalized outcome trends and reusable delegation patterns grouped by `route_role + task_family`
  - aggregate responses now also expose structured learning recommendations (`capture_missing_returns`, `review_blocked_pattern`, `increase_artifact_capture`, `promote_reusable_pattern`) so hosts can act on the substrate without inventing their own heuristics first
  - this creates the first host-facing aggregation layer above the raw typed delegation record substrate
- runtime now also enriches `evolution_review_pack` with the same delegation learning slice:
  - review-pack consumers get a thin `learning_summary` plus structured `learning_recommendations` without needing a second aggregate call
  - the pack derives its aggregation scope from the best available task family on trusted patterns and learned workflows
  - private local delegation records remain visible through the same default local consumer identity used by the surrounding lite routes
- runtime now also enriches `experience_intelligence` with the same delegation learning slice and exposes it through the SDK:
  - the dedicated route now returns `learning_summary` plus `learning_recommendations` beside the learned tool/path recommendation
  - kickoff/task-start stay slim, but deeper callers can now inspect delegation learning without leaving the product recommendation surface
  - the public SDK now exposes `memory.experienceIntelligence()` so host code no longer needs raw HTTP for this route
- `planning_context` and `context_assemble` now project the same delegation learning slice into an explicit `operator_projection` contract, while keeping the older `layered_context.delegation_learning` mirror for compatibility when debug/operator inspection is explicitly requested:
  - default route summaries stay focused on `first_step_recommendation`
  - operator callers can inspect `operator_projection.delegation_learning` without parsing the full layered context envelope
  - `layered_context.delegation_learning` stays available for existing debug consumers during migration
  - the same shared helper now backs `experience_intelligence`, `evolution_review_pack`, and debug layered-context projection
  - the full SDK now also exports `resolveContextOperatorProjection()` and `resolveDelegationLearningProjection()` so host code can prefer the explicit operator contract and only fall back to the layered-context mirror when needed
  - the full SDK host bridge now exposes `inspectTaskContext()` so host integrations can request debug/operator planning context and receive normalized delegation learning without wiring the projection helper themselves
  - the full SDK host bridge now also exposes `planTaskStart()` so host/workbench adapters can combine debug/operator context inspection with kickoff into a single startup decision loop
  - the full SDK host bridge now also exposes `openTaskSession()` so host/workbench adapters can bind session events, startup planning, and pause/resume handoff into one task-scoped adapter
  - `openTaskSession()` now maintains an explicit host-side task session state machine with `active / paused / resumed / completed` status plus transition snapshots, `allowed_actions`, and structured transition guards, making it easier for workbench adapters to drive UI state without re-deriving lifecycle from raw responses
  - workbench Python integration has now started consuming the same controller semantics above raw runtime HTTP surfaces:
    - `workbench/src/aionis_workbench/aionis_bridge.py` now mirrors `inspect_task_context()` and `plan_task_start()` for Python-side hosts
    - `workbench/src/aionis_workbench/orchestrator.py` now uses `plan_task_start()` instead of raw kickoff-only startup, so planner explanation and delegation-learning family matches can shape the initial work prompt
  - the Python bridge now also exposes `open_task_session()` with a host-side task-session adapter that mirrors the same `allowed_actions` and transition-guard semantics used by the SDK host bridge
  - workbench `run()` now opens a runtime-backed task session and routes startup planning plus pause/complete lifecycle writes through that adapter, while keeping shell/orchestrator behavior outside runtime
  - workbench `resume()` now routes handoff recovery, operator-context inspection, and pause/complete lifecycle writes through the same Python task-session adapter, so startup and resume paths share one controller surface
  - workbench result payloads now project `aionis.task_session_state` into a stable `canonical_views.controller` view-model, so shell/UI layers can read `allowed_actions` and transition state without parsing the raw runtime envelope
  - shell dispatch now uses that same `canonical_views.controller` surface to preflight `/resume`, `/next`, and `/fix`, blocking invalid lifecycle transitions before they reach live runtime/workflow paths
  - `shell_status()` now projects a session-backed `controller` view plus compact allowed/blocking action summaries into the statusline, so `/status` can surface current task-session actions even outside a live runtime result envelope
  - `shell_status()` now also returns a structured `controller_action_bar`, so shell/UI consumers can read `recommended_command` and `allowed_commands` directly instead of reconstructing them from raw controller state
  - `inspect_session()` and `evaluate_session()` now return the same structured `controller_action_bar`, so `show/session/evaluate` surfaces and non-shell view-models can all consume one controller guidance contract
  - shell-dispatch workflow surfaces now also carry that same structured `controller_action_bar`, so `plan/review/work` payloads and their shell/UI adapters can reuse one controller-guidance contract instead of scraping `canonical_views.controller`
  - runtime-backed `WorkbenchRunResult` and CLI JSON payloads now also carry `controller_action_bar`, so programmatic consumers outside the interactive shell can read the same recommended/allowed controller commands without reconstructing them from `canonical_views.controller`
  - `validate_session()`, `workflow_next()`, `workflow_fix()`, and `backfill()` now also return the same structured `controller_action_bar`, so workflow/backfill operators and background consumers can reuse the same controller-guidance contract as shell and CLI surfaces
  - shell startup, `/status`, refresh, `show`, and `/help` now consume one shared controller action-bar summary, so the same `recommended` and `allowed` command set is rendered consistently instead of each surface carrying its own hint format
  - the interactive shell prompt now also carries one primary controller-recommended action such as `resume` or `next`, so the current task-session controller state shapes the default next move even before the user asks for `/status`
  - task-scoped `doc_*` persistence surfaces plus `app_ship` and `app_export` now also return the same structured `controller_action_bar`, `doc_inspect` now projects controller guidance for matching task-backed workflows, `doc_list` rows now carry row-level controller guidance when a latest task is known, and shell app/doc summaries including `app_show/app_plan/app_qa/...` now render that shared action bar directly instead of leaving these result surfaces on raw `canonical_views` only
  - workbench product tests now also lock cross-surface regressions for `active`, `paused`, and `completed` lifecycle states, checking that the same task yields identical `controller_action_bar` across `app_plan` or `doc_event`, `shell_status`, `inspect_session`, `evaluate_session`, `app_show`, `doc_inspect`, and `doc_list` row payloads, so future integration changes have to preserve controller-guidance parity across these task-scoped surfaces
  - workbench now has a narrow `scripts/run-controller-contract-suite.sh` runner that replays the active/paused/completed cross-surface regressions plus key shell/dispatch controller consumers in one command, so controller-guidance parity can be revalidated as a compact contract suite instead of relying on ad hoc pytest selections
  - `scripts/run-release-gates.sh` now also replays that controller-contract suite before the broader deterministic real-e2e and live-provider slices, so controller-guidance parity is part of the release gate rather than an optional manual preflight
  - the top-level repository now also exposes `.github/workflows/workbench-controller-contracts.yml`, wiring the same narrow controller-contract suite into GitHub Actions as a fast `controller-contracts` job that gates a heavier `deterministic-real-e2e` job for `workbench/**` changes, so CI can catch controller-guidance regressions before spending time on the broader deterministic regression slice
  - the top-level repository now also exposes `.github/workflows/workbench-live-e2e.yml`, giving workbench a manual `workflow_dispatch` live-provider lane with provider-profile selection, credential preflight, JUnit/log artifact upload, and a compact live summary in `GITHUB_STEP_SUMMARY`, so the model-backed slice has a first-class CI entry point instead of only a local shell script
  - the top-level repository now also exposes `.github/actions/setup-workbench/action.yml`, so those CI jobs share one Python/pip-cache/venv install path instead of duplicating setup logic and risking drift between the fast controller-contract lane and the heavier deterministic lane
  - those GitHub Actions jobs now also emit `tmp/ci/*.log` plus JUnit XML artifacts via `actions/upload-artifact`, so controller-contract or deterministic failures can be inspected directly from CI without rerunning locally just to recover the relevant pytest output
  - workbench now also exposes `workbench/scripts/summarize-junit.py`, and the same GitHub Actions workflow uses it to publish compact Markdown summaries for the controller-contract and deterministic lanes directly into `GITHUB_STEP_SUMMARY`, so CI surfaces the basic pytest result counts even before someone opens the uploaded artifacts
  - the integration boundary stays in the host/workbench layer rather than pushing shell-orchestrator semantics back into runtime

### P2. Collaboration and Forgetting Substrate

Objective: promote Workbench collaboration and forgetting concepts into runtime-native memory objects.

Deliverables:

- collaboration pattern schema and storage shape
- artifact reference routing schema
- forgetting/suppression signal schema
- continuity snapshot contract that is host-agnostic

### P3. Recovery Artifact Memory

Objective: treat correction, rollback, validation, and timeout artifacts as reusable runtime continuity objects.

Deliverables:

- runtime schemas for correction and rollback artifacts
- typed recovery-memory references in handoff/replay surfaces
- recovery-aware rehydration and review-pack enrichment

## Initial Implementation Decision

The first implementation slice starts with `P0`.

Reason:

- runtime already exposes the review-pack routes
- schemas already exist in `src/memory/schemas.ts`
- Workbench already depends on reviewer/runtime contracts around these surfaces
- the public SDK is the narrowest place where contract convergence immediately increases external usability without destabilizing runtime internals

## Success Criteria

The integration effort is moving in the right direction when:

- runtime exposes continuity/evolution reviewer surfaces through stable public SDK methods
- Workbench no longer needs to privately reinterpret obviously runtime-owned contracts
- execution continuity summaries become reusable across shells and hosts
- runtime remains a kernel, not a product shell

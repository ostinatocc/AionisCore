# Aionis Runtime API Capability Matrix

Last reviewed: 2026-04-25

Document status: living technical capability reference

This document records the current public API surface of the Lite runtime in this repository.

Named execution-memory mainline:

`Anchor-Guided Rehydration Loop`

Definition:

`stable execution -> workflow anchor -> recall -> runtime hint -> optional rehydration`

Named execution-policy loop:

`Execution Policy Learning Loop`

Definition:

`feedback -> pattern -> recall -> selector reuse`

It is intentionally narrower than the full runtime. When a surface is outside the current core local-runtime shell, the host should either:

1. not register it at all, or
2. return a structured `501`

Primary routing sources:

1. `src/host/http-host.ts`
2. `src/host/lite-edition.ts`
3. `src/routes/*.ts`

Related public references:

1. [SDK_QUICKSTART.md](SDK_QUICKSTART.md)
2. [../apps/docs/docs/reference/contracts-and-routes.md](../apps/docs/docs/reference/contracts-and-routes.md)
3. [../apps/docs/docs/reference/memory.md](../apps/docs/docs/reference/memory.md)

## Status Legend

Endpoint status labels used below:

1. `Supported`
   The route is registered in the local runtime shell and intended for normal use.
2. `Supported (Subset)`
   The route group exists in the local runtime shell, but only a reduced local subset is available.
3. `Conditional`
   The route is available only when the relevant local-runtime config is enabled.
4. `Unavailable in local shell (501)`
   The route or route group is outside the local runtime shell and returns a structured `501`.

## Stable System Surface

| Method | Path | Status | Notes |
| --- | --- | --- | --- |
| `GET` | `/health` | Supported | Stable Lite health contract with `runtime`, `storage`, `lite`, and `sandbox` envelopes. |

## Runtime Boundary And Introspection

These surfaces are local operator/debug views. They are read-only and do not grant authority, mutate memory, or change runtime decisions.

`GET /v1/runtime/boundary-inventory` is a stable public contract, not an open-ended debug blob. Its response is validated by `RuntimeBoundaryInventoryResponseSchema` and may only expose:

1. `surface_version`
2. `inventory_source`
3. `surface_semantics`
4. `summary`
5. `files`
6. `entries`
7. `sources.authority`
8. `sources.legacy_access`

| Method | Path | Status | Notes |
| --- | --- | --- | --- |
| `GET` | `/v1/runtime/boundary-inventory` | Supported | Source-owned boundary inventory for authority producers and allowed legacy direct-access boundaries. Returns summary counts, files, grouped entries, and read-only semantics. |

## Memory Write And Handoff

| Method | Path | Status | Notes |
| --- | --- | --- | --- |
| `POST` | `/v1/memory/write` | Supported | Primary local memory write path. |
| `POST` | `/v1/handoff/store` | Supported | Local handoff persistence. |
| `POST` | `/v1/handoff/recover` | Supported | Local handoff recovery. |

## Memory Access, Sessions, Packs, Find, Resolve

This is one of Lite's `Supported (Subset)` surfaces. The following routes are present:

| Method | Path | Status | Notes |
| --- | --- | --- | --- |
| `POST` | `/v1/memory/sessions` | Supported | Create a local session graph root. |
| `GET` | `/v1/memory/sessions` | Supported | List sessions. |
| `POST` | `/v1/memory/events` | Supported | Append a session event. |
| `GET` | `/v1/memory/sessions/:session_id/events` | Supported | List events for a session. |
| `POST` | `/v1/memory/packs/export` | Supported | Local pack export; no admin token required in Lite. |
| `POST` | `/v1/memory/packs/import` | Supported | Local pack import; no admin token required in Lite. |
| `POST` | `/v1/memory/find` | Supported | Local graph/search lookup. |
| `POST` | `/v1/memory/resolve` | Supported | Local node resolution. |
| `POST` | `/v1/memory/execution/introspect` | Supported | Demo/introspection surface for execution memory. Aggregates workflow/pattern signals, maintenance summaries, and demo-ready text in one local response. |
| `POST` | `/v1/memory/anchors/rehydrate_payload` | Supported | Anchor-linked payload rehydration by id or URI. In Lite, omitted `actor` defaults to the local actor identity, so private local anchors remain directly rehydratable through the normal single-user path. |

## Recall, Action Retrieval, And Context Runtime

This route group is one half of the `Anchor-Guided Rehydration Loop`.
It serves the `recall -> action retrieval -> runtime hint` portion of the loop.

Planner-packet contract:

1. `planning_context` and `context_assemble` now expose a stable `planner_packet`
2. the packet sections are:
   1. `recommended_workflows`
   2. `candidate_workflows`
   3. `candidate_patterns`
   4. `trusted_patterns`
   5. `contested_patterns`
   6. `rehydration_candidates`
   7. `supporting_knowledge`
3. both routes also expose canonical `pattern_signals` and `workflow_signals`
4. `planning_summary` and `execution_kernel` expose `action_packet_summary`, and `execution_kernel` also exposes `pattern_signal_summary` and `workflow_signal_summary`
5. `planner_explanation` now follows packet order and explains workflow guidance, pattern trust, rehydration availability, and supporting knowledge append behavior
6. lower-level `context.items` and `citations` may now expose `summary_kind`, `execution_kind`, `anchor_kind`, and `compression_layer` so planner-facing consumers can distinguish action memory from supporting knowledge without re-parsing raw slots
7. heavy recall substrate and demo-facing aggregation have moved to `POST /v1/memory/execution/introspect`
8. `planning_summary` and `assembly_summary` can now expose `action_retrieval_uncertainty` and `action_retrieval_gate`
9. when `return_layered_context=true`, `planning_context` and `context_assemble` can also expose `operator_projection.action_retrieval_gate` and `operator_projection.action_hints[]`

Recommended integrator read path:

1. prefer `planner_packet.sections.*` for full workflow/pattern/rehydration collections
2. read `workflow_signals` and `pattern_signals` directly as canonical signal surfaces
3. read `planning_summary` / `assembly_summary` and `execution_kernel` for compact aligned state
4. use `POST /v1/memory/action/retrieval` when you need the explicit tool/file/next-action decision layer instead of only planner context

`execution_summary_v1` exposes strict child contracts for packet assembly, strategy, collaboration, continuity snapshot, routing signals, maintenance, forgetting, collaboration routing, and instrumentation. These are public response contracts, not open-ended diagnostic blobs.

| Method | Path | Status | Notes |
| --- | --- | --- | --- |
| `POST` | `/v1/memory/recall` | Supported | Core Lite recall path. |
| `POST` | `/v1/memory/recall_text` | Supported | Context-runtime text recall. |
| `POST` | `/v1/memory/action/retrieval` | Supported | Explicit next-action retrieval with evidence, source kind, and uncertainty. |
| `POST` | `/v1/memory/planning/context` | Supported | Planning-context assembly. |
| `POST` | `/v1/memory/context/assemble` | Supported | Final context assembly route. |

## Feedback, Rules, And Tool Selection

The tooling surface now also supports the `Execution Policy Learning Loop`, the local tool-memory loop that grows pattern anchors from validated tool outcomes.

Selector rule:

1. explicit rule/policy `tool.prefer` stays ahead of recalled trusted patterns
2. trusted patterns can still refine ordering after explicit preference, but they do not override explicit operator or rule intent
3. `selection_summary.provenance_explanation` now uses the same trust language family as `planner_explanation`
4. the selection surface can therefore explicitly say whether a trusted pattern supported the selected tool, was available but not used, or was visible but not trusted

| Method | Path | Status | Notes |
| --- | --- | --- | --- |
| `POST` | `/v1/memory/feedback` | Supported | Local rule-feedback write path. |
| `POST` | `/v1/memory/rules/state` | Supported | Update local rule state. |
| `POST` | `/v1/memory/rules/evaluate` | Supported | Evaluate Lite rules. |
| `POST` | `/v1/memory/tools/select` | Supported | Local tool-selection decision path. |
| `POST` | `/v1/memory/tools/decision` | Supported | Fetch a tool decision. |
| `POST` | `/v1/memory/tools/run` | Supported | Fetch one tool run lifecycle. |
| `POST` | `/v1/memory/tools/runs/list` | Supported | List tool runs. |
| `POST` | `/v1/memory/tools/rehydrate_payload` | Supported | Runtime-friendly tool alias for anchor payload rehydration inside the `Anchor-Guided Rehydration Loop`. The normal Lite path inherits the default local actor, so planner/runtime hints can call it without restating identity. |
| `POST` | `/v1/memory/tools/feedback` | Supported | Store tool-selection feedback and distill validated tool outcomes into local pattern anchors. |

## Replay And Playbook Core

The replay kernel is present in Lite and is one of the major product subsystems.
It is also the producer side of the `Anchor-Guided Rehydration Loop`, where stable executions become workflow anchors.

Producer rule:

1. newly promoted stable playbooks are written as workflow anchors
2. if the latest playbook is already `shadow` or `active`, Lite normalizes that same latest node into a workflow anchor instead of leaving pre-anchor stable versions behind

| Method | Path | Status | Notes |
| --- | --- | --- | --- |
| `POST` | `/v1/memory/replay/run/start` | Supported | Start a replay run. |
| `POST` | `/v1/memory/replay/step/before` | Supported | Record pre-step state. |
| `POST` | `/v1/memory/replay/step/after` | Supported | Record post-step state. |
| `POST` | `/v1/memory/replay/run/end` | Supported | End a replay run. |
| `POST` | `/v1/memory/replay/runs/get` | Supported | Fetch one replay run. |
| `POST` | `/v1/memory/replay/playbooks/compile_from_run` | Supported | Compile a playbook from a replay run. |
| `POST` | `/v1/memory/replay/playbooks/get` | Supported | Fetch a playbook. |
| `POST` | `/v1/memory/replay/playbooks/candidate` | Supported | Candidate evaluation path. |
| `POST` | `/v1/memory/replay/playbooks/promote` | Supported | Promote a playbook version. |
| `POST` | `/v1/memory/replay/playbooks/repair` | Supported | Repair a playbook definition. |

## Governed Replay And Playbook Execution

This is a `Supported (Subset)` surface in Lite. The Lite routes are local-only and do not imply the full server governance model.

| Method | Path | Status | Notes |
| --- | --- | --- | --- |
| `POST` | `/v1/memory/replay/playbooks/repair/review` | Supported (Subset) | Lite keeps endpoint-scoped repair review behavior, not tenant-scoped control-plane overlays. |
| `POST` | `/v1/memory/replay/playbooks/run` | Supported (Subset) | Local playbook execution path. |
| `POST` | `/v1/memory/replay/playbooks/dispatch` | Supported (Subset) | Local dispatch path. |

## Lite Automation Kernel

Lite automation is intentionally a local playbook-driven kernel, not the full server orchestration surface.

Supported definition and run routes:

| Method | Path | Status | Notes |
| --- | --- | --- | --- |
| `POST` | `/v1/automations/create` | Supported | Create a Lite automation definition. |
| `POST` | `/v1/automations/get` | Supported | Fetch one definition. |
| `POST` | `/v1/automations/list` | Supported | List Lite automation definitions. |
| `POST` | `/v1/automations/validate` | Supported | Validate a Lite automation payload. |
| `POST` | `/v1/automations/graph/validate` | Supported | Graph validation alias. |
| `POST` | `/v1/automations/run` | Supported | Run a Lite automation graph. |
| `POST` | `/v1/automations/runs/get` | Supported | Fetch one run. |
| `POST` | `/v1/automations/runs/list` | Supported | List runs. |
| `POST` | `/v1/automations/runs/cancel` | Supported | Cancel a paused or active run where allowed. |
| `POST` | `/v1/automations/runs/resume` | Supported | Resume approval-gated Lite runs. |

Supported node kinds:

1. `playbook`
2. `approval`
3. `condition`
4. `artifact_gate`

Unsupported governance/orchestration routes:

| Method | Path | Status | Notes |
| --- | --- | --- | --- |
| `POST` | `/v1/automations/assign_reviewer` | Unsupported (501) | Returns `automation_feature_not_supported_in_lite`. |
| `POST` | `/v1/automations/promote` | Unsupported (501) | Returns `automation_feature_not_supported_in_lite`. |
| `POST` | `/v1/automations/shadow/report` | Unsupported (501) | Returns `automation_feature_not_supported_in_lite`. |
| `POST` | `/v1/automations/shadow/review` | Unsupported (501) | Returns `automation_feature_not_supported_in_lite`. |
| `POST` | `/v1/automations/shadow/validate` | Unsupported (501) | Returns `automation_feature_not_supported_in_lite`. |
| `POST` | `/v1/automations/shadow/validate/dispatch` | Unsupported (501) | Returns `automation_feature_not_supported_in_lite`. |
| `POST` | `/v1/automations/runs/assign_reviewer` | Unsupported (501) | Returns `automation_feature_not_supported_in_lite`. |
| `POST` | `/v1/automations/runs/approve_repair` | Unsupported (501) | Returns `automation_feature_not_supported_in_lite`. |
| `POST` | `/v1/automations/runs/reject_repair` | Unsupported (501) | Returns `automation_feature_not_supported_in_lite`. |
| `POST` | `/v1/automations/runs/compensation/retry` | Unsupported (501) | Returns `automation_feature_not_supported_in_lite`. |
| `POST` | `/v1/automations/runs/compensation/record_action` | Unsupported (501) | Returns `automation_feature_not_supported_in_lite`. |
| `POST` | `/v1/automations/runs/compensation/assign` | Unsupported (501) | Returns `automation_feature_not_supported_in_lite`. |
| `POST` | `/v1/automations/compensation/policy_matrix` | Unsupported (501) | Returns `automation_feature_not_supported_in_lite`. |
| `POST` | `/v1/automations/telemetry` | Unsupported (501) | Returns `automation_feature_not_supported_in_lite`. |

## Memory Lifecycle

Lite now exposes the local execution-memory lifecycle routes directly against the SQLite-backed store.

Memory retention and semantic forgetting are part of the local execution-memory lifecycle. They are not a separate deletion service and they do not grant authority. The Runtime uses `semantic_forgetting_v1`, archive relocation metadata, and `execution_forgetting_summary_v1` to decide and report whether memory should be retained, demoted, archived, reviewed, suppressed, or rehydrated.

Retention inputs:

1. node type, current tier, title, summary, and resolved execution surfaces
2. salience, importance, confidence, feedback quality, and activation recency
3. policy memory state, pattern credibility, execution contract trust, and lifecycle state
4. archive relocation state and rehydration mode

Retention outputs:

1. `retain` keeps useful memory visible in its current tier
2. `demote` moves memory colder when it is still useful but should not stay hot
3. `archive` moves retired or low-retention memory into the archive lifecycle
4. `review` prevents archive-tier memory from being implicitly reactivated without an explicit decision

Planner-facing summary:

`execution_forgetting_summary_v1` is visible through planning/context and context/assembly responses. It is validated as a strict contract and reports semantic action counts, lifecycle state counts, suppressed patterns, archive relocation counts, rehydration mode counts, stale signal counts, and a maintenance recommendation.

Boundary rule:

Forgetting may reduce visibility or require review, but it must not silently delete canonical evidence, upgrade trust, bypass the Trust Gate, or turn stale recall into authoritative guidance. Returning archived memory to active use must go through explicit rehydrate or activation routes.

Supported lifecycle routes:

| Method | Path | Status | Notes |
| --- | --- | --- | --- |
| `POST` | `/v1/memory/archive/rehydrate` | Supported | Rehydrates resolved nodes from colder tiers into `warm` or `hot` within Lite. |
| `POST` | `/v1/memory/nodes/activate` | Supported | Records reuse outcome and activation feedback on Lite memory nodes. |

## Sandbox

Sandbox is available in Lite and is now enabled by default for ordinary local users.

Runtime notes:

1. default mode is still `mock`
2. `npm run start:lite:local-process` enables the narrow `local_process_echo` preset
3. if `SANDBOX_ADMIN_ONLY=true`, the sandbox routes still require the admin token
4. if `SANDBOX_ENABLED=false`, sandbox routes return a structured `400`

Supported sandbox routes:

| Method | Path | Status | Notes |
| --- | --- | --- | --- |
| `POST` | `/v1/memory/sandbox/sessions` | Conditional | Available when `SANDBOX_ENABLED=true`. |
| `POST` | `/v1/memory/sandbox/execute` | Conditional | Sync and async execution entrypoint. |
| `POST` | `/v1/memory/sandbox/runs/get` | Conditional | Fetch one run. |
| `POST` | `/v1/memory/sandbox/runs/logs` | Conditional | Fetch stdout/stderr logs. |
| `POST` | `/v1/memory/sandbox/runs/artifact` | Conditional | Fetch one declared artifact. |
| `POST` | `/v1/memory/sandbox/runs/cancel` | Conditional | Cancel a queued or active run. |

## Explicitly Unsupported Lite Route Groups

These route groups are intentionally owned by the full/server runtime and return `server_only_in_lite`.

| Method | Path | Status | Notes |
| --- | --- | --- | --- |
| `ALL` | `/v1/admin/control/*` | Unsupported (501) | Admin/control-plane surface stays outside the current local-runtime shell. |

## Practical Product Boundary

The current Aionis API shape means:

1. Aionis is fully usable for local memory, replay, playbook, automation, sandbox, handoff, and pack flows.
2. Aionis is intentionally not a control-plane product.
3. Aionis automation is intentionally a local execution kernel, not a multi-tenant orchestration platform.
4. If a route is missing from this document, it should be treated as non-contractual until explicitly added.

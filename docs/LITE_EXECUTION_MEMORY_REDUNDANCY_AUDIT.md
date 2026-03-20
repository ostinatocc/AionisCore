# Aionis Lite Execution-Memory Redundancy Audit

Last reviewed: 2026-03-20

This document records the current duplication map of the execution-memory product surface.

It exists to answer one practical question:

`which repeated fields are intentional mirrors, and which were only implementation duplication`

Primary references:

1. [docs/LITE_EXECUTION_MEMORY_PRODUCT_CONTRACT_V1.md](/Volumes/ziel/Aionisgo/docs/LITE_EXECUTION_MEMORY_PRODUCT_CONTRACT_V1.md)
2. [docs/LITE_EXECUTION_MEMORY_CONTRACT_CLEANUP_PLAN.md](/Volumes/ziel/Aionisgo/docs/LITE_EXECUTION_MEMORY_CONTRACT_CLEANUP_PLAN.md)
3. [src/routes/memory-context-runtime.ts](/Volumes/ziel/Aionisgo/src/routes/memory-context-runtime.ts)
4. [src/memory/context-orchestrator.ts](/Volumes/ziel/Aionisgo/src/memory/context-orchestrator.ts)
5. [src/app/planning-summary.ts](/Volumes/ziel/Aionisgo/src/app/planning-summary.ts)

## Audit Status

Status:

`active phase-2 redundancy audit`

Current implementation note:

1. `planning_context` and `context_assemble` now emit packet mirrors through one shared helper:
   [buildPlannerPacketResponseSurface()](/Volumes/ziel/Aionisgo/src/routes/memory-context-runtime.ts)
2. this removes one clear source of accidental response-shape drift between the two route handlers
3. execution-memory summary families are now also produced through one shared bundle:
   [buildExecutionMemorySummaryBundle()](/Volumes/ziel/Aionisgo/src/app/planning-summary.ts)
4. the default planner/context routes no longer emit top-level full collection mirrors or `action_recall_packet`
5. heavy collection inspection now belongs on introspection or internal surfaces instead of the default planner/context response

## Surface Map

### 1. Planner/Context

Canonical owner:

1. `planner_packet`
2. `planning_summary`
3. `assembly_summary`
4. `execution_kernel`
5. `workflow_signals`
6. `pattern_signals`

Default route overlap:

1. packet sections plus `action_packet_summary`
2. packet sections plus workflow/pattern signal summaries
3. packet sections plus compact lifecycle and maintenance summaries

Interpretation:

1. this overlap is intentional compacting, not duplicated full collections
2. the default planner/context response no longer carries parallel full collection owners
3. any heavier collection surface belongs on introspection or internal assembly output

Derived summaries:

1. `planning_summary.action_packet_summary`
2. `planning_summary.workflow_signal_summary`
3. `planning_summary.workflow_lifecycle_summary`
4. `planning_summary.workflow_maintenance_summary`
5. `planning_summary.pattern_lifecycle_summary`
6. `planning_summary.pattern_maintenance_summary`
7. the matching `execution_kernel.*_summary` fields

Rule:

1. summaries are allowed to derive from canonical packet/signal surfaces
2. summaries must not become independent sources of truth

### 2. Selector

Canonical owner:

1. `decision.pattern_summary`
2. `selection_summary.provenance_explanation`
3. `selection_summary.pattern_lifecycle_summary`
4. `selection_summary.pattern_maintenance_summary`

Related but not canonical:

1. `pattern_matches`

Reason:

1. `pattern_matches` is the raw matching trace
2. `decision.pattern_summary` is the compact persisted decision provenance
3. `selection_summary.*` is the planner/operator-facing explanation surface

Rule:

1. `pattern_matches` may be more verbose
2. the product contract is centered on `decision.pattern_summary` and `selection_summary.*`

### 3. Replay Review

Canonical owner:

1. `learning_projection_result`

Related but not canonical:

1. `auto_promote_policy_resolution`
2. `shadow_validation`
3. `auto_promotion`

Reason:

1. `learning_projection_result` is the execution-memory producer outcome
2. the other fields are governance and review context, not the core product output

### 4. Introspection

Canonical owner:

1. `demo_surface`
2. `workflow_signal_summary`
3. `pattern_signal_summary`
4. `workflow_lifecycle_summary`
5. `workflow_maintenance_summary`
6. `pattern_lifecycle_summary`
7. `pattern_maintenance_summary`

Intentional overlap:

1. introspection also returns raw workflow/pattern collections
2. introspection also re-exposes `workflow_signals` and `pattern_signals`

Reason:

1. introspection is explicitly a demo/operator surface
2. raw collections and compact summaries are both first-class there
3. `workflow_signals` and `pattern_signals` remain canonically defined by the planner/context signal model, then reused by introspection

## Accidental Duplication Removed

This audit already removed one implementation-level duplicate:

1. `planning_context` and `context_assemble` no longer hand-maintain separate field spreads for planner packet mirrors
2. both now use the same response-surface helper in [src/routes/memory-context-runtime.ts](/Volumes/ziel/Aionisgo/src/routes/memory-context-runtime.ts)
3. `execution_kernel` and `planning_summary` no longer each hand-assemble the same execution-memory summary family
4. both now consume the same summary bundle logic in [src/app/planning-summary.ts](/Volumes/ziel/Aionisgo/src/app/planning-summary.ts)
5. `execution_introspection` no longer hand-assembles a separate signal/lifecycle summary family
6. it now reuses the same summary bundle logic in [src/app/planning-summary.ts](/Volumes/ziel/Aionisgo/src/app/planning-summary.ts)
7. the default planner/context routes no longer re-expose packet sections as top-level full collection fields

This is an implementation cleanup, not a public contract change.

## Current Decision

At this stage:

1. the default planner/context response is now slim by design
2. no canonical field is being renamed
3. the main phase-2 rule is to avoid reintroducing duplicated full collections on the default route
4. the full `execution_kernel.*_summary` family is currently retained as a compact aligned kernel contract
5. heavy inspection remains valid, but it belongs on introspection rather than planner/context defaults

## Next Decision Points

The next useful audit steps are:

1. decide whether any signal summaries should become packet-only in a future contract version
2. decide whether any future introspection surface should split demo-facing and operator-facing output
3. decide whether any future kernel contract should split operator-facing and runtime-facing summaries

## Current Versioning Position

The current audit position is now:

1. `Execution-Memory Product Contract v1` now treats the slim planner/context route as the baseline
2. `workflow_signals`, `pattern_signals`, and `execution_kernel.*_summary` remain retained compact/canonical route surfaces
3. `action_recall_packet` and raw collection-heavy inspection remain valid, but outside the default planner/context route

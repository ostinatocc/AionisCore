# Aionis Core Execution-Memory Contract Cleanup Plan

Last reviewed: 2026-04-16

Historical status: archive cleanup plan

These notes remain useful as repository history, but they are not canonical implementation references for the current runtime.

This document turns the `canonical vs transitional` split in the execution-memory product contract into a concrete cleanup plan.

Primary references:

1. [docs/CORE_EXECUTION_MEMORY_PRODUCT_CONTRACT_V1.md](CORE_EXECUTION_MEMORY_PRODUCT_CONTRACT_V1.md)
2. [docs/CORE_PLANNER_PACKET_AND_PROVENANCE_CONTRACT.md](CORE_PLANNER_PACKET_AND_PROVENANCE_CONTRACT.md)
3. [docs/CORE_EXECUTION_NATIVE_ROUTE_CONTRACT.md](CORE_EXECUTION_NATIVE_ROUTE_CONTRACT.md)
4. [docs/CORE_FOUNDATION_MEMORY_V3_IMPLEMENTATION_PLAN.md](CORE_FOUNDATION_MEMORY_V3_IMPLEMENTATION_PLAN.md)
5. [docs/CORE_EXECUTION_MEMORY_REDUNDANCY_AUDIT.md](CORE_EXECUTION_MEMORY_REDUNDANCY_AUDIT.md)
6. [docs/CORE_EXECUTION_MEMORY_V2_MIRROR_MIGRATION_SKETCH.md](CORE_EXECUTION_MEMORY_V2_MIRROR_MIGRATION_SKETCH.md)

## Purpose

The goal is not to redesign the execution-memory surface.

The goal is to make the current surface easier to keep stable by answering three practical questions:

1. which fields are the canonical long-term product contract
2. which heavy surfaces belong outside the default planner/context response
3. what testing and sequencing must happen before any response-shape cleanup

## Current Problem

The current execution-memory product surface is useful but intentionally redundant.

That redundancy is helping adoption right now, but it creates three risks:

1. the same packet state is exposed in too many shapes
2. one surface can drift semantically while others still look correct
3. future cleanup becomes risky if there is no explicit deprecation sequence

This plan exists to prevent that drift.

## Cleanup Objective

Move from:

`canonical packet + mixed default/debug/operator output`

to:

`slim default product surface + explicit heavy inspection surface`

That means:

1. the canonical product surfaces stay stable
2. the default planner/context routes stay slim
3. heavy recall substrate and debug/demo output move to introspection or internal surfaces

## Canonical Contract Surface

These fields are the long-term execution-memory contract and should be treated as product-owned.

### Planner/Context

1. `planner_packet`
2. `planning_summary`
3. `assembly_summary`
4. `execution_kernel`
5. `workflow_signals`
6. `pattern_signals`

### Selector

1. `selection_summary.provenance_explanation`
2. `selection_summary.pattern_lifecycle_summary`
3. `selection_summary.pattern_maintenance_summary`
4. `decision.pattern_summary`

### Replay Review

1. `learning_projection_result`

### Introspection

1. `demo_surface`
2. `workflow_signal_summary`
3. `pattern_signal_summary`
4. `workflow_lifecycle_summary`
5. `workflow_maintenance_summary`
6. `pattern_lifecycle_summary`
7. `pattern_maintenance_summary`

## Internal Or Heavy Surfaces

These remain part of the execution-memory contract family, but no longer belong in the default planner/context response:

1. `action_recall_packet`
2. introspection raw workflow/pattern collections
3. layered-context internal collections used for assembly and verification

Current rule:

1. default planner/context routes should not re-expose these shapes
2. they can remain available through internal assembly and introspection surfaces
3. new execution-memory meaning should still land on canonical packet, signal, or summary surfaces first

## Cleanup Phases

### Phase 1: Canonical Freeze

Goal:

Make the canonical execution-memory surface explicit and stable.

Required changes:

1. keep `planner_packet` and `execution_kernel` aligned as the default route schema family
2. keep `action_recall_packet` aligned as an internal/introspection substrate
3. ensure `planning_context` and `context_assemble` route tests assert canonical-first alignment without default mirrors

Primary files:

1. [src/memory/schemas.ts](../src/memory/schemas.ts)
2. [src/routes/memory-context-runtime.ts](../src/routes/memory-context-runtime.ts)
3. [src/memory/context-orchestrator.ts](../src/memory/context-orchestrator.ts)
4. [scripts/ci/lite-context-runtime-packet-contract.test.ts](../scripts/ci/lite-context-runtime-packet-contract.test.ts)

Exit criteria:

1. every canonical field is represented in route schema
2. canonical packet alignment is validated without top-level collection mirrors
3. docs call out introspection as the heavy surface rather than implying a fat default route

### Phase 2: Contract Redundancy Audit

Goal:

Find the remaining response duplication that exists only for convenience.

Required changes:

1. list every execution-memory field that appears in more than one route surface
2. classify each duplicate as:
   - canonical
   - compatibility mirror
   - accidental duplication
3. remove accidental duplication from handlers or summaries

Primary files:

1. [src/routes/memory-context-runtime.ts](../src/routes/memory-context-runtime.ts)
2. [src/app/planning-summary.ts](../src/app/planning-summary.ts)
3. [src/memory/context-orchestrator.ts](../src/memory/context-orchestrator.ts)
4. [src/memory/tools-lifecycle-summary.ts](../src/memory/tools-lifecycle-summary.ts)

Exit criteria:

1. route-level execution-memory duplication is intentional and named
2. packet, summary, and kernel each have a clearly bounded purpose
3. no field exists in multiple places without a written reason

### Phase 3: End-To-End Contract Hardening

Goal:

Strengthen the execution-memory contract at the flow level, not just field level.

Required changes:

1. keep `planning_context` end-to-end tests centered on packet-to-summary-to-kernel alignment
2. keep `context_assemble` end-to-end tests centered on packet-to-summary-to-kernel alignment
3. keep `tools_select` tests centered on pattern provenance and lifecycle alignment
4. keep `replay review` tests centered on governed learning projection outcomes

Primary files:

1. [scripts/ci/lite-context-runtime-packet-contract.test.ts](../scripts/ci/lite-context-runtime-packet-contract.test.ts)
2. [scripts/ci/lite-planning-summary.test.ts](../scripts/ci/lite-planning-summary.test.ts)
3. [scripts/ci/lite-tools-pattern-anchor.test.ts](../scripts/ci/lite-tools-pattern-anchor.test.ts)
4. [scripts/ci/lite-replay-governed-learning-projection-route.test.ts](../scripts/ci/lite-replay-governed-learning-projection-route.test.ts)
5. [scripts/ci/lite-tools-select-route-contract.test.ts](../scripts/ci/lite-tools-select-route-contract.test.ts)

Exit criteria:

1. every named loop has at least one end-to-end contract test
2. replay review remains covered as an execution-memory producer surface
3. selector contract is validated as a product surface, not just an implementation detail
4. `tools_select` and `replay review` route responses are schema-validated, not just field-asserted

### Phase 4: Response-Surface Boundary Decision

Goal:

Decide which fields stay on the default planner/context response versus introspection or internal surfaces.

Required changes:

1. keep the default planner/context response centered on `planner_packet`, signals, summaries, and `execution_kernel`
2. keep heavy inspection and debug output on introspection or internal surfaces
3. avoid reintroducing duplicated full collections onto the default route

Primary files:

1. [docs/CORE_EXECUTION_MEMORY_PRODUCT_CONTRACT_V1.md](CORE_EXECUTION_MEMORY_PRODUCT_CONTRACT_V1.md)
2. [docs/CORE_EXECUTION_NATIVE_ROUTE_CONTRACT.md](CORE_EXECUTION_NATIVE_ROUTE_CONTRACT.md)
3. [docs/LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md](LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md)
4. [README.md](../README.md)

Exit criteria:

1. the default planner/context response can be described in one pass without caveats
2. heavy inspection has a clear route home
3. release narrative no longer depends on mirror caveats

Current decision already made:

1. the default planner/context routes are already narrowed
2. the full `execution_kernel.*_summary` family is retained as the compact aligned kernel contract
3. `action_recall_packet` remains internal/introspection-facing rather than default route-facing
4. future open decisions are centered on narrower operator-specific surfaces, not on restoring default route mirrors

Current versioning rule:

1. `Execution-Memory Product Contract v1` now treats the slim default planner/context response as the baseline
2. heavy inspection output should use introspection rather than route-shape regrowth
3. `Phase 4` does not reopen the status of `workflow_signals`, `pattern_signals`, or `execution_kernel.*_summary`

Current explicit non-goals:

1. no reintroduction of top-level full collection mirrors onto the default planner/context response
2. no packet-only rewrite of introspection
3. no debug/operator payload mixed back into the default product surface

Current migration note:

1. any consumer that still expects a fat planner/context route should migrate to `planner_packet.sections.*` or `POST /v1/memory/execution/introspect`, depending on whether it needs product or inspection semantics

## Recommended Delivery Order

Recommended order:

1. `Phase 1`
2. `Phase 3`
3. `Phase 2`
4. `Phase 4`

Reason:

1. freeze the canonical contract first
2. harden end-to-end guarantees before removing any response redundancy
3. only then audit and reduce duplication
4. make keep/remove decisions last, once the contract is already stable

## Immediate Next Work

The most valuable immediate work is:

1. strengthen `planning_context` and `context_assemble` route-level contract assertions around canonical-vs-mirror alignment
2. strengthen `tools_select` end-to-end assertions around selector provenance and lifecycle
3. keep `replay review -> learning_projection_result` covered as a first-class execution-memory producer path

That work should happen before any field removal discussion.

# Aionis Core SDK Typed Contracts Spec

Date: 2026-03-23

## Goal

Move the first `@ostinato/aionis` surface from generic `payload -> response` pass-through functions to stable route-level typed contracts.

## Scope

Typed v1 coverage:

1. `memory.write`
2. `memory.planningContext`
3. `memory.contextAssemble`
4. `memory.executionIntrospect`
5. `memory.tools.select`
6. `memory.tools.feedback`
7. `memory.replay.repairReview`
8. `memory.anchors.rehydratePayload`

## Contract rule

The SDK should only lock fields that are already part of the public stable route contract.

It should not:

1. mirror every internal schema field
2. import runtime internals into the published package boundary
3. depend on internal source-file layout outside `packages/sdk`

## Shape rule

Use SDK-owned TypeScript contract types with:

1. stable named fields for the current public contract
2. passthrough index signatures so route responses can still carry extra fields without breaking the SDK

## Result

After this change:

1. SDK module methods expose concrete request/response types
2. examples become easier to read and autocomplete against
3. future SDK publishing is less coupled to runtime-internal schema placement

Last reviewed: 2026-04-16

Document status: historical implementation plan

# Aionis Core SDK Typed Contracts

This step moves `@ostinato/aionis` from a thin transport layer toward a real SDK surface.

## What changed

A new SDK-local contract module defines typed request/response shapes for the v1 surface:

1. memory write
2. planning context
3. context assemble
4. execution introspect
5. tools select
6. tools feedback
7. replay repair review
8. anchors rehydrate payload

The module functions now use those concrete types instead of generic `TRequest/TResponse` pass-through signatures.

## Why this approach

The runtime already has richer internal Zod schemas, but the SDK should not depend on runtime-internal file placement or copy every internal field one-to-one.

So the SDK contract layer now does this:

1. lock stable public fields
2. preserve room for additive route fields through passthrough object typing
3. stay publishable as its own package boundary

## Effect

This makes the SDK noticeably more product-ready:

1. better autocomplete
2. clearer examples
3. cleaner publish boundary
4. less accidental coupling between runtime internals and public SDK shape

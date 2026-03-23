# Lite HTTP Governance Shadow Benchmark

## Decision

Add a benchmark scenario that compares the builtin/static governance baseline against the HTTP governance model-client path under the same runtime task arcs.

## Shape

The benchmark keeps both sides isolated:

1. baseline runtime app / replay app
2. HTTP runtime app / replay app

Each side executes the same three governed paths:

1. workflow promotion
2. tools feedback
3. replay governed learning

The benchmark then compares the resulting runtime states rather than comparing raw review payloads.

## Why this shape

The important product question is not whether the review text matches. The important question is whether governance keeps the same execution-memory outcomes:

1. stable workflow promotion
2. stable/trusted tools pattern formation
3. replay-learning rule promotion to `shadow`

If those outcomes drift, the HTTP governance path is not a drop-in replacement.

## Expected result

The local stub-backed HTTP path should preserve the same runtime states as the builtin/static baseline, while reason strings may differ.

## Non-goals

This scenario does not measure:

1. latency
2. token cost
3. external network reliability
4. real third-party API correctness

It only validates that the current runtime replacement point preserves governed outcomes under a realistic local HTTP model-client loop.

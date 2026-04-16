# Aionis Runtime Open-Core Boundary

Last reviewed: 2026-04-16

Document status: living public boundary reference

This document describes the recommended boundary between the public Aionis Runtime surface and the tighter Aionis Core kernel implementation.

## Short version

Recommended distribution stance:

1. keep the public runtime packages open
2. keep route and SDK contracts explicit
3. keep the strongest kernel learning and governance implementation under tighter control

## Why this boundary makes sense now

The current repository already has real technical depth in:

1. execution-memory learning loops
2. governed replay, workflow, and tool behavior
3. benchmark and regression-gated runtime validation
4. external-LLM shadow-aligned governance evaluation

At the same time, Aionis Runtime benefits from:

1. developer adoption
2. easy integration
3. a clear core identity

## Recommended open surface

The default open surface should be:

1. `@ostinato/aionis`
2. `@ostinato/aionis-rtc`
3. `@aionis/doc`
4. typed SDK and route contracts
5. examples, quickstart, and publishing guidance
6. enough runtime documentation to explain how the SDK talks to the runtime

## Recommended controlled surface

The more controlled layer can include:

1. stronger governance orchestration
2. higher-value learning and maintenance internals
3. policy and evaluation logic
4. hosted or pro runtime distribution
5. deeper operational tooling around model-backed governance

## External positioning

Recommended public phrasing:

1. Aionis Runtime is the public continuity runtime
2. `@ostinato/aionis` is the primary developer interface
3. Aionis Core is the kernel beneath that runtime
4. stronger kernel layers are distributed selectively as the product matures

## Immediate implication

For the next release phase, the practical priority should be:

1. make the SDK easy to install, learn, and try
2. keep core contracts stable
3. preserve implementation leverage in the kernel

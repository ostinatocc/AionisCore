Last reviewed: 2026-04-16

Document status: historical implementation plan

# Lite HTTP Governance Model Client

## What changed

Lite governance now has a real HTTP-backed model-client baseline.

This is still internal-only and env-gated, but it means governance is no longer limited to:

1. static fallback
2. builtin deterministic client
3. mock model client

## New runtime path

The new mode is `http`.

It runs through the same governance layers that already exist:

1. adjudication modules
2. model client contract
3. model client factory
4. provider factory
5. runtime provider builder

## Why this matters

This gives Lite a real provider lifecycle for governance decisions without forcing the product surface to change.

It also means benchmark and validation can now test:

1. HTTP transport correctness
2. runtime provider replacement
3. per-path governance application through a real model-client boundary

## Benchmark shape

The first benchmark uses a local OpenAI-compatible stub server, not an external vendor dependency.

That keeps the benchmark:

1. repeatable
2. isolated
3. external-artifact safe

while still proving that replay, workflow, and tools can all consume a real HTTP model-client path.

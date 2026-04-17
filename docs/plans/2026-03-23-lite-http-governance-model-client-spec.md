Last reviewed: 2026-04-16

Document status: historical implementation plan

# Lite HTTP Governance Model Client Spec

Date: 2026-03-23
Status: implemented

## Goal

Add the first real HTTP-backed governance model client baseline for Lite.

This should let governance run against a real OpenAI-compatible model endpoint without changing any public product surface.

## Scope

The new path must stay:

1. internal-only
2. env-gated
3. replaceable through the existing model-client contract and factories

The initial implementation should support:

1. `promote_memory`
2. `form_pattern`

through a shared HTTP client config.

## Integration points

The path should plug into the existing layers:

1. governance model client contract
2. model client factory
3. provider factory
4. runtime provider builder

Route/runtime call sites must not need operation-specific changes beyond the existing wiring.

## Transport

The baseline transport is an OpenAI-compatible `POST /chat/completions` JSON API.

The client should:

1. send strict JSON-only prompts
2. parse object or `null`
3. validate returned objects against the existing semantic review schemas
4. return `null` on malformed or unavailable responses instead of throwing governance-wide failures

## Benchmark requirement

The real-task benchmark should gain one new scenario that proves:

1. workflow runtime path can use the HTTP model client
2. tools runtime path can use the HTTP model client
3. replay runtime path can use the HTTP model client

This benchmark should use a local stub server so the full provider lifecycle is testable without requiring an external API key.

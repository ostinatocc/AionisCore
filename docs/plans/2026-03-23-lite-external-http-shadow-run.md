# Lite External HTTP Shadow Run

## Summary

Lite already has an HTTP governance model client and a shadow-compare benchmark against the builtin/static baseline.

What it still lacks is a clean way to point that shadow compare at a real external LLM backend without contaminating the default benchmark suite.

## Decision

The existing `http_model_client_shadow_compare_runtime_loop` remains the single shadow-compare scenario.

By default it continues to use the local benchmark stub.

When explicitly enabled, it switches to a real external OpenAI-compatible backend via CLI/env config:

1. external-shadow is opt-in
2. config resolution is CLI-first, env-second
3. missing config is only an error when external-shadow was requested
4. output remains compare-only and artifact-driven

## Why This Shape

This keeps the default 14-scenario benchmark stable and credential-free while making a true external shadow run available on the same benchmark surface.

That is the right tradeoff right now:

1. no baseline pollution
2. no public surface change
3. immediate path to real backend testing
4. isolated artifact flow still works


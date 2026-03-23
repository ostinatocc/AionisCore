# Lite External HTTP Shadow Run Spec

## Goal

Add an internal-only, env-gated real external LLM shadow-run path for Lite governance benchmarking and isolated validation.

## Scope

1. Keep the default `benchmark:lite:real` suite deterministic and credential-free.
2. Allow the existing HTTP governance shadow-compare scenario to switch from the local benchmark stub to a real external OpenAI-compatible backend.
3. Keep all artifacts outside the repository tree.
4. Never let the shadow run change governed runtime outcomes. It remains compare-only.

## Requirements

1. The benchmark CLI must expose an explicit external-shadow switch.
2. External HTTP config must accept CLI overrides and env fallback.
3. The external-shadow mode must fail fast only when it is explicitly requested and config is incomplete.
4. The existing default benchmark run must remain green without external credentials.
5. Isolated validation must be able to forward the external-shadow request into the benchmark command.

## Non-Goals

1. No public route changes.
2. No new governed apply semantics.
3. No automatic use of a real external backend in default benchmark or CI-like flows.

## Verification

1. `npx tsc --noEmit`
2. `npm run -s test:lite`
3. `npx tsx scripts/lite-real-task-benchmark.ts`
4. External-shadow code path verification via an OpenAI-compatible local stub using the new CLI flag


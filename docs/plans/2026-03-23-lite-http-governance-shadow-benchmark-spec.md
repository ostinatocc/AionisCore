# Lite HTTP Governance Shadow Benchmark Spec

## Goal

Add a real benchmark scenario that compares the existing builtin/static governance path against the HTTP model-client governance path on the same execution-memory inputs.

## Why

The runtime can now execute governance through:

1. builtin/static providers
2. custom model-client replacement
3. HTTP model-backed governance client

What is still missing is a stable benchmark that answers a harder question:

Does the HTTP governance path preserve the same runtime outcomes as the existing internal baseline on the same task arc?

## Scope

Add one new benchmark scenario:

- `http_model_client_shadow_compare_runtime_loop`

This scenario should compare two isolated runs:

1. baseline run using existing builtin/static governance behavior
2. HTTP run using the local OpenAI-compatible governance chat stub

The scenario should cover three live paths:

1. workflow promotion
2. tools feedback / form-pattern
3. replay governed learning

## Assertions

The scenario should assert outcome parity for:

1. workflow governed stable state
2. tools pattern stable state
3. replay learning rule shadow state

It should also report whether the governance reason strings differ, but those reason-string differences should be informational rather than failure criteria.

## Metrics

Emit stable metrics:

- `workflow_state_match`
- `tools_state_match`
- `replay_state_match`
- `workflow_baseline_state`
- `workflow_http_state`
- `tools_baseline_state`
- `tools_http_state`
- `replay_baseline_state`
- `replay_http_state`
- `workflow_reason_changed`
- `tools_reason_changed`
- `replay_reason_changed`

## Profile policy

Add the three state-match metrics to the benchmark suite profile under a new section:

- `http_shadow_compare.workflow_state_match`
- `http_shadow_compare.tools_state_match`
- `http_shadow_compare.replay_state_match`

Treat them as hard profile indicators.

## Validation

Run:

1. `npx tsc --noEmit`
2. `npx tsx scripts/lite-real-task-benchmark.ts`
3. `bash scripts/lite-real-validation.sh --baseline-json <artifact> --workdir /tmp/...`

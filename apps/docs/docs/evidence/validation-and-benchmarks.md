---
title: Validation And Benchmarks
slug: /evidence/validation-and-benchmarks
---

# Validation and benchmarks

One of Aionis' strongest traits is that the runtime is not justified only by narrative. It is backed by green public test suites, reproducible proofs, real-provider A/B benchmarks, and systems snapshots.

<div class="doc-lead">
  <span class="doc-kicker">Why this page exists</span>
  <p>A continuity runtime is easy to describe and easy to fake. Validation matters because Aionis needs to prove that task start, handoff, replay, and Lite boundary behavior remain coherent as the code evolves.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">Build checks</span>
    <span class="doc-chip">Route and contract tests</span>
    <span class="doc-chip">Real-provider A/B</span>
    <span class="doc-chip">Systems snapshots</span>
  </div>
</div>

## Public validation snapshot

The current outward-facing validation state is:

| Surface | Current result |
| --- | --- |
| Lite runtime test suite | `211 / 211 pass` |
| Public SDK test suite | `14 / 14 pass` |
| Docs reference integrity | `47 active markdown files checked` |
| Real-provider A/B vs `thin_baseline` | `31 / 31 winner = aionis` |
| Real-provider A/B vs `chat_history_baseline` | `25 / 25 winner = aionis` |
| Real-provider A/B vs `vector_recall_baseline` | `25 / 25 winner = aionis` |
| Strict replay reuse | `3 / 3 success`, `0` replay tokens |

The real-provider benchmark stack used for the current external snapshot was:

- embeddings: `MiniMax / embo-01`
- governance: `Moonshot / kimi-k2.6`

## Repository validation layers

From the repository root you can already see the main validation commands:

```bash
npm run -s build
npm run -s lite:test
npm run -s sdk:test
node scripts/ci/docs-reference-check.mjs
npm run -s docs:check
```

These commands are doing different jobs:

| Command | What it proves |
| --- | --- |
| `npm run -s build` | The repository still builds as a coherent runtime and package set |
| `npm run -s lite:test` | Lite behavior, contracts, and route families still match expectations |
| `npm run -s sdk:test` | The public SDK surface still matches the published runtime behavior |
| `node scripts/ci/docs-reference-check.mjs` | Documentation links still resolve against the current public doc set |
| `npm run -s docs:check` | The docs site still builds cleanly with its current references intact |

## Real-provider Runtime A/B coverage

The current real-provider A/B snapshot covers these Runtime families:

- repeated-task guidance
- uncertainty-gated start
- continuity restoration
- real-repo handoff recovery
- policy-backed tool routing
- semantic forgetting recovery
- replay-guided follow-up
- multi-cycle refinement
- production simulation
- strict replay reuse

### Suite totals

| Suite | Challenger | Comparisons | Result |
| --- | --- | ---: | --- |
| Runtime execution-memory A/B | `thin_baseline` | `31` | `31 / 31 winner = aionis` |
| Runtime execution-memory A/B | `chat_history_baseline` | `25` | `25 / 25 winner = aionis` |
| Runtime execution-memory A/B | `vector_recall_baseline` | `25` | `25 / 25 winner = aionis` |

### Family breakdown

| Family | Thin | Chat | Vector | What it proves |
| --- | --- | --- | --- | --- |
| Repeated-task guidance | `5/5` | `5/5` | `5/5` | Prior execution becomes the next correct start |
| Uncertainty-gated start | `3/3` | `3/3` | `3/3` | Aionis changes the result of uncertainty instead of only surfacing uncertainty |
| Continuity restoration | `2/2` | `2/2` | `2/2` | Handoff continuity is restored as an execution contract |
| Real-repo handoff | `3/3` | `3/3` | `3/3` | Repo-specific target files and acceptance checks survive Aionis recovery |
| Policy tool routing | `3/3` | `3/3` | `3/3` | Aionis preserves focused routing through persisted policy memory |
| Semantic forgetting recovery | `3/3` | `3/3` | `3/3` | Archived workflows can be rehydrated after stale context falls out of the hot path |
| Replay-guided follow-up | `3/3` | `—` | `—` | Replay artifacts can carry repaired workflow guidance into the next stage |
| Multi-cycle refinement | `3/3` | `3/3` | `3/3` | Aionis preserves cycle1 -> cycle2 -> cycle3 contracts |
| Production simulation | `3/3` | `3/3` | `3/3` | Aionis preserves incident -> patch -> validation -> review contracts |
| Strict replay reuse | `3/3` | `—` | `—` | Successful workflows can be compiled into zero-token replay paths |

## Key findings

### Repeated-task guidance

Across the repeated-task guidance family, the challenger arms stall or miss the
expected file path while Aionis reaches `advance`. This proves Aionis is
turning prior execution into the next actionable start.

### Real-repo handoff recovery

Pinned real-repo handoff cases show:

- baseline preserved `0/4` target files
- baseline preserved `0/2` acceptance checks
- Aionis preserved `4/4` target files
- Aionis preserved `2/2` acceptance checks

This is execution-contract recovery, not note recovery.

### Semantic forgetting recovery

Against both `chat_history_baseline` and `vector_recall_baseline`:

- `3/3` baseline scenarios end in `escalate`
- baseline gate: `archive_recovery_missing`
- `3/3` Aionis scenarios end in `advance`
- Aionis gate: `archive_rehydrated_ready`
- cold expected-path hit: `false`
- warm expected-path hit: `true`

This proves Aionis can recover the right archived workflow after stale context
has moved out of the hot path.

### Strict replay reuse

On pinned real-repo strict replay cases:

- `compile_success = true`
- `replay1_success = true`
- `replay2_success = true`
- `replay1_tokens = 0`
- `replay2_tokens = 0`

This proves Aionis can compile a successful workflow into a deterministic
zero-token replay path instead of rerunning the whole reasoning loop.

### Replay-guided follow-up

Across the replay-guided follow-up family:

- thin baseline stalls
- Aionis advances
- `command_fragment_recovered = true`
- `repair_recommendation_recovered = true`
- `dispatch_decision = deterministic_replay_executed`
- `primary_inference_skipped = true`

This proves replay is not only rerun optimization. It can carry repaired
workflow guidance into the next stage.

### Multi-cycle refinement and production simulation

Across both long-chain families:

- thin/chat/vector challengers stall
- Aionis advances
- multi-cycle refinement preserves `cycle1 -> cycle2 -> cycle3`
- production simulation preserves `incident -> patch -> validation -> review`

This proves Aionis can preserve longer execution contracts instead of collapsing
work into a lossy final export.

## Systems snapshots

### Single-request snapshot

| Surface | Samples | p50 | p95 |
| --- | ---: | ---: | ---: |
| `memory.write` | `3/3` | `409.3837 ms` | `429.1686 ms` |
| `kickoffRecommendation` warm | `3/3` | `359.5082 ms` | `372.878 ms` |
| `actionRetrieval` warm | `3/3` | `364.6533 ms` | `426.945 ms` |
| `handoff.recover` | `3/3` | `3.2023 ms` | `6.731 ms` |
| `continuity_review_pack` | `3/3` | `3.7562 ms` | `4.5465 ms` |
| `replay.candidate` | `3/3` | `1.1481 ms` | `2.206 ms` |
| `replay.dispatch` | `3/3` | `4096.3294 ms` | `4715.6253 ms` |

The replay dispatch snapshot still satisfied:

- `replay_tokens = 0`
- `primary_inference_skipped = 1`

### Small-concurrency load snapshot

Current load parameters:

- concurrency: `3`
- rounds: `2`
- total samples per case: `6`

| Surface | Result | p50 | p95 | Throughput |
| --- | --- | ---: | ---: | ---: |
| `kickoff_recommendation_concurrent` | `6/6` | `388.0594 ms` | `542.3158 ms` | `2.3382 req/s` |
| `action_retrieval_concurrent` | `6/6` | `344.3946 ms` | `452.0812 ms` | `2.682 req/s` |
| `handoff_recover_concurrent` | `6/6` | `3.7095 ms` | `6.9341 ms` | `218.0351 req/s` |
| `continuity_review_pack_concurrent` | `6/6` | `3.5405 ms` | `4.5417 ms` | `268.9498 req/s` |
| `replay_candidate_concurrent` | `6/6` | `3.0744 ms` | `5.652 ms` | `272.3794 req/s` |

These snapshots show that the warmed continuity surfaces remain stable under
small-scale concurrent access, especially for handoff recovery, continuity
review, and replay candidate projection.

## Why this matters

For a continuity runtime, the important question is larger than "does the API respond?"

It is also:

1. does the learning loop stay coherent
2. does task-affinity weighting avoid bad cross-task bleed
3. do replay and workflow promotion paths remain stable
4. do forgetting and archive rehydration stay recoverable
5. do Lite boundaries stay explicit

The reason this matters is that continuity systems fail in subtle ways. A runtime can look alive while silently regressing:

- task start may stop surfacing useful first actions
- replay may continue to run but stop producing reusable outcomes
- handoff can degrade into vague summaries instead of recoverable state
- forgetting can silently turn into loss instead of controlled recovery
- Lite can accidentally blur boundaries and pretend unsupported routes are public

That is why validation in Aionis is not just "the server returned 200".

## What to look for when evaluating the evidence

If you are deciding whether the runtime is credible, focus on these questions:

1. Is the public Lite path actually exercised, or only internal code paths?
2. Are route and SDK surfaces validated together?
3. Is there evidence that continuity behavior is measured on real task shapes, not just toy examples?
4. Is the benchmark comparing against realistic challenger arms instead of a strawman?
5. Does the repo make unsupported Lite behavior explicit instead of hiding it?

The current validation story is strongest when you read build checks, smoke tests, and real-task benchmarks together rather than in isolation.

## Best evidence sources

- [Proof by Evidence](./proof-by-evidence.md)
- [Self-evolving demos](./self-evolving-demos.md)
- [Introduction](../intro.md)
- [Real-task benchmark report](https://github.com/ostinatocc/AionisCore/blob/main/docs/LOCAL_RUNTIME_REAL_TASK_BENCHMARK_REPORT.md)
- [Testing strategy](https://github.com/ostinatocc/AionisCore/blob/main/docs/CORE_TESTING_STRATEGY.md)
- [Lite runtime architecture](https://github.com/ostinatocc/AionisCore/blob/main/docs/LOCAL_RUNTIME_ARCHITECTURE_AND_COMPLETION.md)
- [Lite CI workflow](https://github.com/ostinatocc/AionisCore/blob/main/.github/workflows/lite-ci.yml)

## How to read the evidence with the rest of the docs

Use this page after you already understand the product and runtime shape:

1. read [Introduction](../intro.md) to understand the continuity problem
2. read [Architecture Overview](../architecture/overview.md) to understand what is being validated
3. come back here to judge whether the validation story is strong enough for your use case

## What this page does not prove yet

This page is already strong, but it is not the final benchmark program.

It does not yet prove:

- large-sample stability across `50 / 100+` scenarios
- formal cross-framework superiority against systems like LangGraph or Letta
- cost superiority or `cost per successful advance`
- higher-concurrency or higher-throughput saturation behavior

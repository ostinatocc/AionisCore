---
title: Validation And Benchmarks
slug: /evidence/validation-and-benchmarks
---

# Validation and benchmarks

One of Aionis' strongest traits is that the runtime is not justified only by narrative. It is backed by contract checks, smoke validation, and benchmark reporting.

<div class="doc-lead">
  <span class="doc-kicker">Why this page exists</span>
  <p>A continuity runtime is easy to describe and easy to fake. Validation matters because Aionis needs to prove that task start, handoff, replay, and Lite boundary behavior remain coherent as the code evolves.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">Build checks</span>
    <span class="doc-chip">Route and contract tests</span>
    <span class="doc-chip">Smoke validation</span>
    <span class="doc-chip">Real-task benchmarks</span>
  </div>
</div>

## Repository validation layers

From the repository root you can already see the main validation commands:

```bash
npm run -s build
npm run -s lite:test
npm run -s lite:benchmark:real
npm run -s smoke:lite
```

These commands are doing different jobs:

| Command | What it proves |
| --- | --- |
| `npm run -s build` | The repository still builds as a coherent runtime and package set |
| `npm run -s lite:test` | Lite behavior, contracts, and route families still match expectations |
| `npm run -s lite:benchmark:real` | The runtime can still produce useful continuity behavior on benchmarked task scenarios |
| `npm run -s smoke:lite` | The public local runtime boots and the main user-facing paths still respond |

## Why this matters

For a continuity kernel, the important question is not just "does the API respond?"

It is also:

1. does the learning loop stay coherent
2. does task-affinity weighting avoid bad cross-task bleed
3. do replay and workflow promotion paths remain stable
4. do Lite boundaries stay explicit

The reason this matters is that continuity systems fail in subtle ways. A runtime can look alive while silently regressing:

- task start may stop surfacing useful first actions
- replay may continue to run but stop producing reusable outcomes
- handoff can degrade into vague summaries instead of recoverable state
- Lite can accidentally blur boundaries and pretend unsupported routes are public

That is why validation in Aionis is not just "the server returned 200".

## What to look for when evaluating the evidence

If you are deciding whether the runtime is credible, focus on these questions:

1. Is the public Lite path actually exercised, or only internal code paths?
2. Are route and SDK surfaces validated together?
3. Is there evidence that continuity behavior is measured on real task shapes, not just toy examples?
4. Does the repo make unsupported Lite behavior explicit instead of hiding it?

The current validation story is strongest when you read build checks, smoke tests, and real-task benchmarks together rather than in isolation.

## Best evidence sources

- [Self-evolving demos](./self-evolving-demos.md)
- [Real-task benchmark report](https://github.com/ostinatocc/AionisCore/blob/main/docs/LOCAL_RUNTIME_REAL_TASK_BENCHMARK_REPORT.md)
- [Testing strategy](https://github.com/ostinatocc/AionisCore/blob/main/docs/CORE_TESTING_STRATEGY.md)
- [Lite runtime architecture](https://github.com/ostinatocc/AionisCore/blob/main/docs/LOCAL_RUNTIME_ARCHITECTURE_AND_COMPLETION.md)
- [Lite CI workflow](https://github.com/ostinatocc/AionisCore/blob/main/.github/workflows/lite-ci.yml)

## How to read the evidence with the rest of the docs

Use this page after you already understand the product and runtime shape:

1. read [Introduction](../intro.md) to understand the continuity problem
2. read [Architecture Overview](../architecture/overview.md) to understand what is being validated
3. come back here to judge whether the validation story is strong enough for your use case

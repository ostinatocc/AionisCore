---
title: Validation And Benchmarks
slug: /evidence/validation-and-benchmarks
---

# Validation and benchmarks

One of Aionis' strongest traits is that the runtime is not justified only by narrative. It is backed by contract checks, smoke validation, and benchmark reporting.

## Repository validation layers

From the repository root you can already see the main validation commands:

```bash
npm run -s build
npm run -s lite:test
npm run -s lite:benchmark:real
npm run -s smoke:lite
```

## Why this matters

For a continuity kernel, the important question is not just "does the API respond?"

It is also:

1. does the learning loop stay coherent
2. does task-affinity weighting avoid bad cross-task bleed
3. do replay and workflow promotion paths remain stable
4. do Lite boundaries stay explicit

## Best evidence sources

- [Real-task benchmark report](https://github.com/ostinatocc/AionisCore/blob/main/docs/LOCAL_RUNTIME_REAL_TASK_BENCHMARK_REPORT.md)
- [Testing strategy](https://github.com/ostinatocc/AionisCore/blob/main/docs/CORE_TESTING_STRATEGY.md)
- [Lite runtime architecture](https://github.com/ostinatocc/AionisCore/blob/main/docs/LOCAL_RUNTIME_ARCHITECTURE_AND_COMPLETION.md)
- [Lite CI workflow](https://github.com/ostinatocc/AionisCore/blob/main/.github/workflows/lite-ci.yml)

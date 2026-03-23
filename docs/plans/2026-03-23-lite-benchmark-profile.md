# Lite Benchmark Profile

## What changed

Lite real-task benchmark now emits a stable `suite_profile` alongside:

1. scenario status
2. scenario score
3. suite score

The profile is meant to capture the stable execution-memory shape of the benchmark suite.

## Why this matters

Status and score alone are too coarse.

A refactor can keep `PASS` and `100% score` while still changing important internal product signals, such as:

1. trusted versus provisional pattern state
2. workflow stable-count checkpoints
3. provider precedence behavior
4. slim-surface boundary guarantees

The profile gives Lite a narrower regression surface for these invariants.

## Runtime behavior

When a baseline JSON is provided, benchmark compare now computes:

1. suite score delta
2. scenario status changes
3. profile drift keys

And the run can fail on profile drift with:

```bash
npx tsx scripts/lite-real-task-benchmark.ts \
  --baseline-json /tmp/lite-benchmark-baseline.json \
  --fail-on-status-regression \
  --fail-on-profile-drift \
  --max-suite-score-drop 0 \
  --max-scenario-score-drop 0
```

## Isolation rule

The profile gate is wired through the isolated validation flow, so benchmark artifacts and validation output still land in an external workdir instead of polluting the Aionis repository.

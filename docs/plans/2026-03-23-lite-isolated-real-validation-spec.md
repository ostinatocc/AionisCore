# Lite Isolated Real Validation Spec

Date: 2026-03-23

## Goal

Add one repeatable Lite real-validation entrypoint that runs smoke and benchmark validation in an external workdir, not inside the repository tree.

## Problem

Lite already has:

1. `smoke:lite`
2. `smoke:lite:local-process`
3. `benchmark:lite:real`

The runtime side of those commands is mostly isolated already, but the repository still lacks:

1. one command that runs the full real-validation stack together
2. one external workdir that keeps logs and artifacts together
3. a default testing story that does not suggest repo-local `tmp/...` output

## Required Behavior

### Real validation entrypoint

Add a new command:

1. `npm run validate:lite:real`

It should:

1. create a new external workdir by default
2. keep that directory after the run
3. run:
   1. default smoke
   2. local-process smoke
   3. real-task benchmark
4. write logs and benchmark artifacts into that workdir
5. print the final workdir path so the operator can inspect outputs

### Smoke workdir support

`scripts/lite-smoke.sh` should support an explicit external workdir via environment variable.

Rules:

1. if no workdir is provided, preserve current behavior
2. if a workdir is provided, write artifacts there
3. do not delete a caller-provided workdir on exit

### Benchmark artifact defaults

User-facing docs should stop recommending repo-local `tmp/...` artifact paths.

Preferred examples should use:

1. the new `validate:lite:real` command
2. explicit external paths such as `/tmp/...`

## Non-Goals

This change does not:

1. expand public runtime surface
2. change benchmark semantics
3. change smoke semantics
4. add CI requirements for the full real-validation flow

## Validation

Minimum validation:

1. targeted tests for package/startup contract updates
2. `npx tsc --noEmit`
3. `npm run -s test:lite`
4. one actual `npm run -s validate:lite:real` run in a fresh external directory

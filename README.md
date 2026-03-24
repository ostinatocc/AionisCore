# Aionis Runtime

`Aionis-runtime` is the private runtime mainline for Aionis.

This repository is the source of truth for:

1. execution-memory internals
2. replay and workflow learning internals
3. governance/model-client internals
4. benchmark, regression, and operator runtime work

Public product direction remains:

1. Aionis Runtime
2. Aionis Suite SDK
3. adapters and integrations later

## Repository Split

1. public SDK/demo repo: [Cognary/Aionis](https://github.com/Cognary/Aionis)
2. private runtime mainline: [Cognary/Aionis-runtime](https://github.com/Cognary/Aionis-runtime)

The public repo should stay focused on:

1. `@cognary/aionis`
2. docs and examples
3. the `sdk_demo` quickstart shell

This repo should stay focused on:

1. the real runtime mainline
2. moat-bearing runtime implementation
3. deeper internal validation surfaces

## Core Source Areas

1. [src/app](/Volumes/ziel/Aionis-runtime/src/app)
2. [src/execution](/Volumes/ziel/Aionis-runtime/src/execution)
3. [src/memory](/Volumes/ziel/Aionis-runtime/src/memory)
4. [src/routes](/Volumes/ziel/Aionis-runtime/src/routes)
5. [src/store](/Volumes/ziel/Aionis-runtime/src/store)
6. [src/runtime-entry.ts](/Volumes/ziel/Aionis-runtime/src/runtime-entry.ts)
7. [src/index.ts](/Volumes/ziel/Aionis-runtime/src/index.ts)

## Mainline Rule

New moat-bearing runtime work should land here first.

Mirror changes back to the public repo only when they are required for:

1. the public SDK contract
2. the public demo shell
3. public docs/examples/contracts

## Key Docs

1. [REPO_CUTOVER.md](/Volumes/ziel/Aionis-runtime/REPO_CUTOVER.md)
2. [RUNTIME_MAINLINE.md](/Volumes/ziel/Aionis-runtime/docs/RUNTIME_MAINLINE.md)
3. [OPEN_CORE_BOUNDARY.md](/Volumes/ziel/Aionis-runtime/docs/OPEN_CORE_BOUNDARY.md)
4. [LITE_TESTING_STRATEGY.md](/Volumes/ziel/Aionis-runtime/docs/LITE_TESTING_STRATEGY.md)
5. [LITE_REAL_TASK_BENCHMARK_REPORT.md](/Volumes/ziel/Aionis-runtime/docs/LITE_REAL_TASK_BENCHMARK_REPORT.md)

## Validation

```bash
npm install
npm run -s build
npm run -s test:lite
npm run -s benchmark:lite:real
```

Use the public repo for SDK publishing/quickstart work.
Use this repo for runtime evolution.

The SDK copy inside this private repo is a mirrored integration surface, not the release source of truth.

For the private full-runtime SDK, use:

1. `@cognary/aionis-sdk`
2. [/Volumes/ziel/Aionis-runtime/docs/FULL_SDK_QUICKSTART.md](/Volumes/ziel/Aionis-runtime/docs/FULL_SDK_QUICKSTART.md)
3. [/Volumes/ziel/Aionis-runtime/examples/full-sdk/README.md](/Volumes/ziel/Aionis-runtime/examples/full-sdk/README.md)

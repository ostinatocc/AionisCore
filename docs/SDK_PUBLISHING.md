# Aionis SDK Publishing

This document defines the current release checklist for `@aionis/sdk`.

## Release goals

Each SDK release should prove:

1. the package builds
2. the package tests pass
3. the packed tarball contains the expected public files
4. a clean consumer can install and import the tarball

## Current commands

From the repository root:

```bash
npm run sdk:build
npm run sdk:test
npm run sdk:pack:dry-run
npm run sdk:release:check
```

## What `sdk:release:check` does

The release baseline script:

1. builds `@aionis/sdk`
2. runs package-level SDK tests
3. creates a tarball from `packages/sdk`
4. installs it in a clean `/tmp` consumer
5. verifies the published entrypoint and v1 surface imports

Artifacts are written outside the repository, for example:

1. `/tmp/aionis_sdk_release_baseline_*`

## Manual publish flow

When publish credentials are ready:

```bash
cd /Volumes/ziel/Aionisgo/packages/sdk
npm publish --access public
```

Run the baseline checks first. Do not publish straight from an unverified local build.

## Recommended release checklist

1. confirm version in [packages/sdk/package.json](/Volumes/ziel/Aionisgo/packages/sdk/package.json)
2. run `npm run sdk:build`
3. run `npm run sdk:test`
4. run `npm run sdk:pack:dry-run`
5. run `npm run sdk:release:check`
6. check [packages/sdk/README.md](/Volumes/ziel/Aionisgo/packages/sdk/README.md)
7. publish from `packages/sdk`

## Non-goals for the current release flow

The current repository does not yet include:

1. automatic version bumping
2. automated npm publish in CI
3. release note generation for the SDK package itself

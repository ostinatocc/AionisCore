# Aionis Runtime Package Publishing

Last reviewed: 2026-04-17

Document status: living public release checklist

This document defines the release checklist for the public Aionis Runtime npm packages.

## Public package set

1. [@ostinato/aionis](../packages/full-sdk/package.json)
2. [@ostinato/aionis-rtc](../packages/runtime-core/package.json)
3. [@aionis/doc](../packages/aionis-doc/package.json)

## Current prepared release target

Prepared next public SDK release:

1. `@ostinato/aionis@0.2.0`

Why this is a minor release instead of a patch:

1. Lite now exposes `memory.archive.rehydrate(...)` and `memory.nodes.activate(...)` through the public SDK path
2. SDK contracts were expanded to cover the Lite lifecycle request shape
3. README, quickstart, and docs site pages were updated so the public integration story matches the current runtime

## Release goals

Each package release should prove:

1. the package builds
2. package-level tests pass when the package defines them
3. the packed tarball contains the expected public files
4. a clean consumer can install and import the tarball

## Root commands

### `@ostinato/aionis`

```bash
npm run sdk:build
npm run sdk:test
npm run sdk:pack:dry-run
npm run sdk:publish:dry-run
npm run sdk:release:check
```

### `@ostinato/aionis-rtc`

```bash
npm run runtime-core:build
npm run runtime-core:pack:dry-run
npm run runtime-core:publish:dry-run
npm run runtime-core:release:check
```

### `@aionis/doc`

```bash
npm run aionis-doc:build
npm run aionis-doc:pack:dry-run
npm run aionis-doc:publish:dry-run
npm run aionis-doc:release:check
```

### Full package sweep

```bash
npm run packages:release:check
```

## What the release check does

Each `*:release:check` command:

1. builds the package
2. runs package tests when present
3. creates a tarball from the package directory
4. installs it in a clean `/tmp` consumer
5. verifies the expected public imports

Artifacts are written outside the repository, for example:

1. `/tmp/aionis_package_release_baseline_*`

## Manual publish flow

When publish credentials are ready:

```bash
cd /path/to/AionisRuntime/packages/full-sdk
npm publish --access public
```

### `@ostinato/aionis-rtc`

```bash
cd /path/to/AionisRuntime/packages/runtime-core
npm publish --access public
```

### `@aionis/doc`

```bash
cd /path/to/AionisRuntime/packages/aionis-doc
npm publish --access public
```

## Recommended release checklist

1. confirm versions in [packages/full-sdk/package.json](../packages/full-sdk/package.json), [packages/runtime-core/package.json](../packages/runtime-core/package.json), and [packages/aionis-doc/package.json](../packages/aionis-doc/package.json)
2. run `npm run aionis-doc:build`
3. run `npm run aionis-doc:pack:dry-run`
4. run `npm run aionis-doc:publish:dry-run`
5. run `npm run aionis-doc:release:check`
6. run `npm run sdk:build`
7. run `npm run sdk:test`
8. run `npm run sdk:pack:dry-run`
9. run `npm run sdk:publish:dry-run`
10. run `npm run sdk:release:check`
11. run `npm run runtime-core:build`
12. run `npm run runtime-core:pack:dry-run`
13. run `npm run runtime-core:publish:dry-run`
14. run `npm run runtime-core:release:check`
15. run `npm run packages:release:check`
16. check [packages/full-sdk/README.md](../packages/full-sdk/README.md), [packages/runtime-core/README.md](../packages/runtime-core/README.md), and [packages/aionis-doc/README.md](../packages/aionis-doc/README.md)
17. create and push the release tag
18. publish each package from its package directory

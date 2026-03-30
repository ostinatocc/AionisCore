# Aionis Core Package Publishing

This document defines the release checklist for the public Aionis Core npm packages.

## Public package set

1. [@ostinato/aionis](/Volumes/ziel/AionisTest/Aioniscc/packages/full-sdk/package.json)
2. [@ostinato/aionis-rtc](/Volumes/ziel/AionisTest/Aioniscc/packages/runtime-core/package.json)

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

cd /Volumes/ziel/AionisTest/Aioniscc/packages/full-sdk
npm publish --access public
```

### `@ostinato/aionis-rtc`

```bash
cd /Volumes/ziel/AionisTest/Aioniscc/packages/runtime-core
npm publish --access public
```

## Recommended release checklist

1. confirm versions in [packages/full-sdk/package.json](/Volumes/ziel/AionisTest/Aioniscc/packages/full-sdk/package.json) and [packages/runtime-core/package.json](/Volumes/ziel/AionisTest/Aioniscc/packages/runtime-core/package.json)
2. run `npm run sdk:build`
3. run `npm run sdk:test`
4. run `npm run sdk:pack:dry-run`
5. run `npm run sdk:publish:dry-run`
6. run `npm run sdk:release:check`
7. run `npm run runtime-core:build`
8. run `npm run runtime-core:pack:dry-run`
9. run `npm run runtime-core:publish:dry-run`
10. run `npm run runtime-core:release:check`
11. run `npm run packages:release:check`
12. check [packages/full-sdk/README.md](/Volumes/ziel/AionisTest/Aioniscc/packages/full-sdk/README.md) and [packages/runtime-core/README.md](/Volumes/ziel/AionisTest/Aioniscc/packages/runtime-core/README.md)
13. create and push the release tag
14. publish each package from its package directory

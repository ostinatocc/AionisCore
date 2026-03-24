# Aionis Suite SDK Publishing

This document defines the current release checklist for the public Aionis Suite SDK packages.

Private repo note:

1. this file is mirrored into `Aionis-runtime` for reference only
2. the authoritative publish flow lives in [Cognary/Aionis](https://github.com/Cognary/Aionis)
3. do not publish the SDK from `Aionis-runtime`

Current package names:

1. npm: `@cognary/aionis`
2. PyPI: `cognary-aionis`

Published package page:

1. [npm: `@cognary/aionis`](https://www.npmjs.com/package/@cognary/aionis)

CLI entrypoint:

1. binary: `aionis`
2. package form: `npx @cognary/aionis doctor`

## Release goals

Each SDK release should prove:

1. the package builds
2. the package tests pass
3. the packed tarball contains the expected public files
4. a clean consumer can install and import the tarball

## Current commands

From the repository root:

```bash
npm run sdk:release:status
npm run sdk:release:prepare
npm run sdk:build
npm run sdk:test
npm run sdk:pack:dry-run
npm run sdk:publish:dry-run
npm run sdk:release:check
```

## What `sdk:release:check` does

The release baseline script:

1. builds `@cognary/aionis`
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
Do not treat this private mirror as the npm release source.

## Recommended release checklist

1. confirm version in [packages/sdk/package.json](../packages/sdk/package.json)
2. run `npm run sdk:release:status`
3. run `npm run sdk:release:prepare`
4. run `npm run sdk:build`
5. run `npm run sdk:test`
6. run `npm run sdk:pack:dry-run`
7. run `npm run sdk:publish:dry-run`
8. run `npm run sdk:release:check`
9. check [packages/sdk/README.md](../packages/sdk/README.md)
10. create and push the release tag
11. publish from `packages/sdk`

Supporting docs:

1. [docs/SDK_RELEASE_CHECKLIST.md](SDK_RELEASE_CHECKLIST.md)
2. [docs/SDK_RELEASE_NOTE_TEMPLATE.md](SDK_RELEASE_NOTE_TEMPLATE.md)

## Non-goals for the current release flow

The current repository does not yet include:

1. automatic version bumping
2. automated npm publish in CI
3. release note generation for the SDK package itself

# Aionis Installer Spec

## Goal

Add the first actual installation layer for Aionis so a user can get a working `aionis` command onto their machine without having to remember `npm run ...`.

## Product Shape

The first installer slice should support:

1. one shell installer entry:
   - `bash scripts/install-aionis.sh`
2. one installer CLI:
   - `npx tsx src/product/aionis-installer.ts install`
3. one installed user command:
   - `aionis`

## Responsibilities

The installer should:

1. create a stable user launcher at `~/.local/bin/aionis`
2. point that launcher at the checked-out repository's top-level product CLI
3. write one small install manifest under `~/.aionis/install.json`
4. report whether the install was `created`, `updated`, or `unchanged`
5. report whether `~/.local/bin` is already on `PATH`

## Scope Of The First Slice

This first slice should include:

1. a local installer script
2. an installer CLI implementation
3. an install manifest
4. tests for install/update behavior
5. one guide for users

It should not yet include:

1. curl-pipe install hosting
2. packaged binary distribution
3. Homebrew formula
4. platform-specific native installers

## Success Criteria

This slice is successful when:

1. the repo can install a branded `aionis` command into the user's local bin
2. the install is idempotent
3. the install can be updated when the repo root changes
4. the user gets a clear next step if their bin directory is not on `PATH`

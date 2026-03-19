# Contributing

## Runtime Baseline

Use Node `22.x`.

Recommended setup:

```bash
nvm use
npm ci
npm run build
npm run test:lite
npm run smoke:lite
```

## Scope

This repository is for the standalone Lite runtime:

1. single-user local operation
2. SQLite-backed memory, replay, and playbook flows
3. Lite automation kernel
4. Lite operator and public-beta docs

Keep changes aligned with that scope. Multi-tenant control-plane and server-only governance surfaces do not belong here.

## Pull Request Expectations

Before opening a PR:

1. run `npm run build`
2. run `npm run test:lite`
3. run `npm run smoke:lite` for runtime-affecting changes
4. update docs when API, health, or operator behavior changes

## Contract Changes

If you change external behavior, keep these contracts coherent:

1. automation response envelopes
2. health response envelopes
3. error response envelopes
4. Lite route boundary semantics

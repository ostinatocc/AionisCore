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

This repository is for Aionis Core and its local runtime shell:

1. single-user local operation
2. SQLite-backed memory, replay, and playbook flows
3. local automation kernel
4. local runtime shell and operator docs

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
4. local runtime route boundary semantics

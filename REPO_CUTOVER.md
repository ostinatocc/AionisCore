# Runtime Repo Cutover

Current target topology:

1. `Cognary/Aionis` = public SDK-first repository
2. `Cognary/Aionis-runtime` = private runtime mainline repository

## Current Local Repositories

1. public repo: `/Volumes/ziel/Aionisgo`
2. private runtime repo: `/Volumes/ziel/Aionis-runtime`

## Current State

This repository is no longer the public product shell.
It is the private runtime mainline.

That means:

1. moat-bearing runtime work should land here first
2. benchmark, governance, learning, replay, and operator runtime internals can continue evolving here
3. the public repo should only receive:
   - SDK-facing contract changes
   - docs/examples updates
   - demo-shell changes that remain necessary for onboarding

## Public/Private Relationship

### Public `Cognary/Aionis`

Treat the public repo as:

1. the product landing surface
2. the home of `@aionis/sdk`
3. docs, examples, and public contracts
4. the weak `sdk_demo` runtime shell used for quickstart

### Private `Cognary/Aionis-runtime`

Treat this repo as:

1. the source of truth for runtime implementation
2. the home of deeper governance/learning internals
3. the home of stronger replay, maintenance, sandbox, and operator surfaces
4. the place where future moat-bearing runtime work should continue

## Sync Direction

Default sync direction should now be:

1. runtime work starts in `Cognary/Aionis-runtime`
2. only public-safe seams are copied or mirrored back to `Cognary/Aionis`
3. public shrink guardrails in `Cognary/Aionis` should be treated as a contract, not as something to bypass casually

## Validation

Before exporting any runtime change back to public:

1. confirm the surface is still needed by the public SDK/demo shell
2. confirm it does not violate `public:keep-manifest`
3. confirm the public repo can still pass:
   - `npm run -s public:keep-manifest`
   - `npm run -s test:lite`

## Immediate Next Step

The next implementation step is no longer additional public shrink.

It is:

1. continue runtime-core development here
2. keep the public repo narrow
3. only mirror public-safe SDK/demo contract changes outward

Last reviewed: 2026-04-16

Document status: historical implementation plan

# Aionis Core Docs Site Design

Date: 2026-04-16

## Why this exists

`Aionis Core` now has enough public surface area that the repository Markdown alone is no longer the right entrypoint for new users.

The current `docs/` tree mixes three different audiences:

1. public SDK and runtime consumers
2. contributors working on the runtime kernel
3. archived design history and implementation plans

That makes the current documentation correct but high-friction.

## Goals

The first docs site should:

1. explain what `Aionis Core` is in under one minute
2. get a developer from zero to local evaluation quickly
3. make the three product surfaces legible:
   - task start
   - handoff
   - replay
4. expose Lite runtime and SDK guidance without forcing users through internal design history
5. keep deeper architecture material available, but not on the main public path

## Non-goals

The first docs site should not:

1. version every historical document
2. mirror the full `docs/` filesystem structure
3. expose `docs/plans/*` in the public sidebar
4. become a full marketing website
5. attempt auto-generated API reference for every TypeScript type on day one

## Audience model

### Primary audience

Developers evaluating `Aionis Core` as an execution-memory kernel for coding agents.

### Secondary audience

Contributors who need architecture and boundary context after they already understand the public product shape.

### Tertiary audience

Internal or deep technical readers looking for benchmark reports, ADRs, and archived plans.

## Technology decision

Use `VitePress` for the first docs site.

### Why VitePress

1. it is lighter and faster to stand up for a repository-shaped docs site
2. it supports docs-focused navigation, sidebar structure, local search, and static deployment cleanly
3. it keeps the authoring model close to plain Markdown instead of adding framework overhead
4. it is a pragmatic choice for an SDK + runtime + examples repository that needs to move quickly

### Why not start with versioning

Versioning should come later, once there is a real released-docs lifecycle for `@ostinato/aionis`.

For the first site, `latest-only` keeps complexity low and avoids premature maintenance burden.

## Repository shape

Create a site app at:

- `apps/docs`

The app should contain:

1. VitePress config
2. homepage
3. curated docs pages for public readers
4. site styling and theme overrides

It should not replace the root `docs/` tree.

The root `docs/` tree remains the source of truth for deep technical material, while the site curates and points into it.

## Public information architecture

Recommended top-level docs navigation:

1. Overview
2. Getting Started
3. Concepts
4. Runtime
5. SDK
6. Guides
7. Reference
8. Evidence
9. Contributing

## Initial page set

The first site should launch with:

1. homepage
2. docs intro
3. getting started
4. task start concept
5. handoff concept
6. replay concept
7. Lite runtime
8. SDK client and host bridge
9. repeated-task kickoff guide
10. contracts and routes reference
11. validation and benchmarks
12. architecture and boundary notes

## Content strategy

The site should be summary-first, deep-link-second.

That means:

1. curated docs pages explain the public product simply
2. deep technical Markdown remains in the repository
3. curated pages link to deep-dive source docs on GitHub when needed

This avoids dragging internal plan history into the first-time reader path.

## Design direction

The docs site should feel technical and editorial rather than generic SaaS.

Preferred direction:

1. light-first theme
2. strong typography
3. restrained but intentional visual accents
4. clear hierarchy over marketing noise
5. obvious call-to-action into quickstart and examples

## Initial scripts

Add root scripts:

1. `docs:start`
2. `docs:build`
3. `docs:serve`

These should make the site runnable from the repository root without converting the whole repository to a workspace.

## Phase plan

### Phase 1

Deliver:

1. site skeleton
2. homepage
3. first public docs set
4. root scripts

### Phase 2

Deliver:

1. richer reference pages
2. docs CI build
3. deployment target wiring

### Phase 3

Consider:

1. docs versioning
2. generated API reference
3. split contributor or internal docs into separate sections or a second docs instance

## Risks

### Risk 1: duplicated content drifts

Mitigation:

Keep site pages curated and summary-oriented instead of copying every root doc verbatim.

### Risk 2: internal design history overwhelms public users

Mitigation:

Do not expose `docs/plans/*` in the primary sidebar.

### Risk 3: deployment assumptions harden too early

Mitigation:

Build the site app first; deployment can stay a separate decision.

## Acceptance for phase 1

Phase 1 is successful when:

1. `npm run docs:start` works locally
2. `npm run docs:build` succeeds
3. a new user can understand:
   - what Aionis is
   - why it exists
   - how to start evaluating it
4. the public docs path is visibly cleaner than the raw repository docs path

Last reviewed: 2026-04-17

Document status: active implementation plan

# Aionis Inspector and Playground Plan

Date: 2026-04-17

## Why this exists

`Aionis Runtime` is pure continuity infrastructure. It has no surface a human can look at. That shape creates two concrete problems:

1. users who have already integrated Aionis cannot see what the runtime is doing, learning, or recommending without reading SQLite or grepping logs
2. users who have not integrated Aionis cannot understand what the runtime produces without reading several pages of docs and running example scripts locally

The first problem hurts retention. The second problem hurts adoption.

The core product claim is that an agent learns continuously through Aionis. That claim is currently invisible. No screenshot, no animation, no shareable artefact demonstrates it. That is the gap this plan closes.

The plan proposes two coordinated UI deliverables:

1. `Aionis Inspector`: a local, read-only runtime observation UI that ships with Lite
2. `Aionis Playground`: a hosted, zero-install scenario demo that turns the "your agent learns every run" claim into a visible artefact

Inspector targets existing users. Playground targets strangers. Both are required. Neither replaces the other.

## Goals

The delivered UI layer should:

1. make execution memory, pattern trust state, workflow lifecycle, and task start recommendations visible without requiring SDK code
2. ship a local observation tool inside Lite so integrated users can inspect live runtime state
3. ship a public hosted demo that a stranger can understand in under one minute
4. keep the runtime kernel and public route contracts unchanged
5. produce visual artefacts (screenshots, animations, short screen recordings) that can be reused in blog posts, conference talks, BD conversations, and social distribution
6. reuse existing public SDK surfaces rather than introducing new runtime endpoints

## Non-goals

The delivered UI layer should not:

1. expose any write or destructive operation against live runtime state
2. provide multi-user, permissioned, or team workspace features
3. build a generic agent-observability tool that competes with LangSmith or Pydantic Logfire
4. provide a chat-with-your-memory experience
5. attempt to be a Cursor or VSCode extension on the first pass
6. add a hosted multi-tenant control plane, pricing layer, or billing surface
7. introduce new runtime HTTP routes for UI convenience before the SDK itself exposes them

## Audience model

### Primary audience for Inspector

Developers who have already started integrating `@ostinato/aionis` and need to observe Lite runtime state while building.

### Primary audience for Playground

Developers and infrastructure evaluators who have not yet installed Aionis and need to see what execution memory produces before investing time.

### Secondary audience for both

Content surfaces: blog posts, conference talks, demo videos, documentation screenshots, and external BD conversations. Both UIs should produce reusable visual artefacts as a natural by-product.

## Strategic positioning

UI is not added to make Aionis look better. UI is added to convert invisible runtime behavior into something a human eye can follow.

The unique visual assets Aionis already owns in the runtime are:

1. `candidate -> trusted -> contested -> revalidated` pattern state transitions
2. `observing -> promotion_ready -> stable` workflow lifecycle transitions
3. `first_action` kickoff recommendations with `source_kind` provenance
4. handoff packets with `target_files`, `next_action`, and `acceptance_checks`
5. replay run lifecycle with step-level evidence and playbook promotion
6. governance adjudication decisions with `reason` strings

These artefacts are richer than what competing memory products can display. Most competing products can only show "here are the stored facts". Aionis can show "here is what the agent learned, why, and what it will do next". That difference is currently invisible to anyone who is not reading source code. The UI layer makes it visible.

## Product decisions

### What is in scope for this plan

1. `Aionis Inspector`: a local, read-only web UI bundled with Lite
2. `Aionis Playground`: a hosted, pre-seeded demo site with scripted scenarios

### What is explicitly out of scope for this plan

1. `Aionis Studio`: a deeper IDE or editor integration surface
2. `Aionis Dashboard`: a hosted multi-tenant SaaS
3. CLI redesigns, shell wrappers, or TUI alternatives
4. browser extensions or IDE extensions of any kind

Those are reasonable future directions. They are not this plan.

## Inspector design

### Purpose

When Lite is running locally, a developer should be able to open a browser tab and see the runtime's current execution memory state, the pattern and workflow learning loop, and the effect of any task start request.

### Scope invariants

1. Inspector is read-only
2. Inspector does not add any runtime HTTP route beyond a static asset route for its own bundle
3. Inspector calls the same public SDK surfaces that external integrators use
4. Inspector must work against a freshly started Lite runtime with an empty SQLite store

### Tab structure

Inspector ships with four tabs. Each tab maps onto one class of runtime artefact.

#### Tab 1. Live

Purpose: show that the runtime is alive and that events are flowing.

Content:

1. runtime identity summary: edition, mode, storage path, sandbox state, uptime
2. recent memory write events with truncated input text and client id
3. recent recall and planning context calls with query text and result counts
4. active sessions, if any

Data sources:

1. `GET /health`
2. `POST /v1/memory/events` listing (latest N)
3. recent `recall`, `recall_text`, and `planning/context` calls via a lightweight local request log maintained by Inspector's own client

Inspector does not add a new server-side observability endpoint in this phase. If the SDK call log is insufficient, the next iteration can add a read-only runtime event stream behind a Lite-only guard.

#### Tab 2. Memory

Purpose: show the current memory library, grouped by scope.

Content:

1. node list with `client_id`, tier, last activation outcome, activation count, last reuse time
2. filter by scope, by state (hot/warm/cold/archived), by client id substring
3. node detail drawer: payload, related edges, recent reuse history

Data sources:

1. `POST /v1/memory/find`
2. `POST /v1/memory/resolve`
3. `POST /v1/memory/nodes/activate` results, read-only

Inspector does not expose write, archive, or delete actions in this phase.

#### Tab 3. Patterns and Workflows

This is the most important tab. It shows what Aionis has actually learned.

Purpose: display the pattern trust state machine and the workflow promotion lifecycle as first-class visible artefacts.

Content:

1. pattern list, grouped by state
   - `trusted`, `candidate`, `contested`, `governed`, `shadow`
2. each pattern shows a short textual trace
   - example: `candidate_observed -> candidate_observed -> promoted_to_trusted -> counter_evidence_opened -> revalidated_to_trusted`
3. workflow list, grouped by promotion state
   - `observing`, `promotion_ready`, `stable`
4. each workflow shows associated runs, goal text, and supporting knowledge counts
5. state transitions animate in when new data arrives
6. provenance panel: click a pattern to see the feedback events that produced it; click a workflow to see the replay runs that produced it

Data sources:

1. `POST /v1/memory/execution/introspect`
2. `POST /v1/memory/experience/intelligence`
3. `POST /v1/memory/tools/runs/list`

#### Tab 4. Playground

Purpose: a local form that lets the developer call `memory.taskStart` against the running Lite instance and see the full kickoff result.

Content:

1. form fields: tenant id, scope, query text, candidate tools
2. response panel: `first_action`, `kickoff_recommendation`, `source_kind`
3. provenance highlighting: the response panel links to any pattern, workflow, or rehydration candidate that was used to produce the result
4. raw JSON toggle for inspection

Data sources:

1. `POST /v1/memory/tools/select`
2. `POST /v1/memory/kickoff/recommendation`
3. `POST /v1/memory/experience/intelligence`
4. `POST /v1/memory/planning/context`

### Seed data

On first launch, if the target scope has no nodes, Inspector offers a one-click action to import a seed pack. The pack should be small and self-explanatory:

1. three pre-written patterns in different states
2. two pre-written workflows in `promotion_ready` and `stable` state
3. five pre-written replay runs with step lifecycle
4. one handoff packet

The seed pack is loaded through the existing `POST /v1/memory/packs/import` route. Inspector never fabricates data server-side.

### Technology decision

1. UI framework: `Preact` with `HTM` for templating, or `React` with `Vite` if the bundle size stays below 500 KB gzipped
2. styling: `Tailwind CSS` compiled ahead of time into a single static file
3. state: local state only, no Redux or Zustand; `fetch` wrappers around the public SDK
4. data layer: the public `@ostinato/aionis` SDK, consumed from the browser as a module
5. transport: standard HTTP against the running Lite instance on `127.0.0.1`
6. live updates: polling first, Server-Sent Events or WebSocket only if polling proves insufficient

### Bundling and delivery

1. Inspector source lives at `apps/inspector`
2. a build step produces a static bundle under `apps/inspector/dist`
3. Lite host registers a Lite-only static route group that serves this bundle at `/inspector`
4. the runtime host must not expose Inspector routes when `AIONIS_EDITION` is not `lite`
5. Inspector is bundled into the Lite release but can be disabled with `LITE_INSPECTOR_ENABLED=false`

### Acceptance criteria

Inspector is accepted for MVP when all of the following are true:

1. running `npm run lite:start` automatically serves Inspector at `http://127.0.0.1:3001/inspector`
2. all four tabs render against a freshly started runtime with only the seed pack loaded
3. no runtime HTTP route beyond the static asset route was added for Inspector's benefit
4. the Inspector bundle is below 800 KB gzipped
5. running Inspector against a runtime with zero data does not throw and produces a clean empty-state UI
6. a short screen recording can be produced that demonstrates pattern state transitions visibly and without explanation

## Playground design

### Purpose

A visitor who has never heard of Aionis should be able to open a web page and understand, within sixty seconds, that:

1. an agent without execution memory starts every similar task from zero
2. an agent with Aionis writes execution memory as it works
3. the next similar task then starts from a better first action
4. repeated work produces trusted patterns and promoted workflows that make future work faster and more reliable

The Playground is the conversion surface for docs traffic, social posts, and public demos.

### Scope invariants

1. zero installation on the visitor side
2. no login, no signup, no email capture on the first pass
3. no runtime mutation from the visitor side outside their own ephemeral scope
4. the Playground must run real Aionis behavior, not scripted fake state transitions

### Top surface

The Playground homepage presents three scenario cards:

1. `Repair a flaky retry bug`
2. `Fix an export serialization issue`
3. `Rewrite a launch article`

Each card describes the scenario in one sentence and offers a `Watch Aionis learn` action.

### Scenario view

Each scenario loads a split view:

1. left pane: the agent doing work
2. right pane: Aionis runtime state changing as the work happens

Both panes play back simultaneously. The visitor does not control fine-grained playback. Simple controls are offered:

1. `Play scenario`
2. `Replay from start`
3. `Skip to run 2`

The scenario plays run 1 and run 2 of the same class of task. Run 1 produces execution memory. Run 2 starts with learned first action and finishes in fewer steps.

### Required visual beats

1. agent initial approach on run 1 must feel unpolished, with multiple tools tried and multiple files touched
2. run 1 must emit visible memory writes on the right pane as it progresses
3. at least one pattern must move from `candidate_observed` to `promoted_to_trusted` during run 1
4. at least one workflow must move from `observing` to `promotion_ready` during run 1
5. run 2 must begin with a `first_action` that is visibly a direct file edit, not a search
6. run 2 step count must be visibly smaller than run 1 step count
7. both panes must share a unified timeline so cause and effect are legible

### Your turn section

Below the scenario, a short form invites the visitor to enter their own task description and see what Aionis would suggest. This calls the live backend and shows:

1. the selected first action
2. the memory items that influenced the selection
3. a note saying `this ran against a real Aionis Lite instance, isolated to your visitor session`

### Call to action

Below the your-turn section:

1. a copy-to-clipboard `npm install @ostinato/aionis` block
2. a secondary action linking to `npm run example:sdk:core-path`
3. a link to the Inspector documentation so visitors can understand they can run the same UI locally

### Backend model

The Playground is not a separate fork of Lite. It is one real Lite instance behind a thin web adapter.

1. one shared Lite instance, hosted on a small VPS or container platform
2. every visitor is assigned a short-lived scope such as `playground-<visitor-uuid>`
3. scenario data is preloaded into those scopes by the adapter using `packs/import`
4. rate limits are enforced per visitor session at the adapter layer, not at the Lite layer
5. visitor scopes expire after twenty four hours and are garbage collected
6. the adapter never exposes admin or control-plane routes; visitors only reach read-only and their-own-scope routes

### Content strategy

Scenario content is copy-heavy. Scenario design is a writing task, not only an engineering task.

Each scenario requires:

1. a one-sentence card description
2. a run 1 narrative script
3. a run 2 narrative script
4. a pre-seeded memory pack that makes run 2 believable
5. a glossary-free caption for every state transition animation

Scenarios should avoid internal runtime vocabulary in visible UI strings. Internal names may appear in tooltips or in a collapsed debug section.

### Technology decision

1. frontend framework: `Astro` or `Next.js`, optimized for static output with a small dynamic island for the live your-turn call
2. animation: `Framer Motion` or equivalent
3. hosting: `Vercel` or `Cloudflare Pages` for the static surface
4. Aionis instance: a single small VPS running Lite, reachable only through the Playground adapter
5. adapter: a thin Node service that enforces visitor scope isolation, rate limits, and scenario seeding

### Acceptance criteria

Playground is accepted for MVP when all of the following are true:

1. the homepage loads in under two seconds on a cold connection
2. at least one scenario runs through end to end without any manual intervention
3. the your-turn section returns a real `first_action` from a live Lite instance for a reasonable free-text task in under three seconds
4. the scenario view can be understood without any accompanying documentation
5. the page produces shareable artefacts: a looping animation of run 1 to run 2, and a single screenshot that makes the learning story visible
6. a non-technical observer can describe in their own words what Aionis did after watching once

## Shared design principles

The Inspector and the Playground follow the same visual and editorial rules.

### 1. Outcome before internals

User-visible strings describe what the runtime produced, not which internal type produced it. Internal type names may appear in secondary positions such as tooltips, code panels, and debug toggles.

### 2. Friendly aliases for internal vocabulary

UI strings use public-friendly aliases on first presentation. The canonical internal name is shown in parentheses or in a secondary label.

Recommended initial aliases:

1. `planner_packet` displayed as `Plan`
2. `anchor rehydration` displayed as `Reactivate memory`
3. `node activation` displayed as `Record reuse outcome`
4. `execution_kernel` displayed as `Runtime state`
5. `contested` displayed as `Pattern challenged`
6. `governed` displayed as `Reviewed by governance`
7. `shadow` displayed as `Shadowed`

Alias choices should be reviewed against the project's vocabulary tiering before shipping.

### 3. Animate state transitions

Pattern state changes, workflow lifecycle changes, and first-action swaps must animate. Hard content swaps are not acceptable for these specific transitions. Animations should be under five hundred milliseconds and must respect `prefers-reduced-motion`.

### 4. Click-through provenance

Every displayed learned artefact must be traceable by click. A pattern links to the feedback events that produced it. A workflow links to the replay runs that produced it. A first action links to the patterns, workflows, and rehydration candidates that influenced it. Provenance is the feature, not a hidden debug mode.

### 5. Zero-configuration demo data

Both surfaces must present meaningful content on first load without requiring the user to think about seeding. Inspector offers a single-click seed import. Playground preloads scenarios automatically.

### 6. No chat, no general observability

Neither surface adds a chat UI against memory. Neither surface attempts to compete with trace or observability tools for general agent frameworks. Staying out of those categories keeps the product story narrow.

## Repository shape

### Inspector

1. `apps/inspector/` owns Inspector source, build config, and bundle output
2. `apps/lite/` gains a static route registration for the built bundle
3. `src/host/lite-edition.ts` declares the static route group as Lite-only
4. no new files in `src/memory/*` or `src/routes/*` are required for MVP

### Playground

1. `apps/playground/` owns the public site source
2. `apps/playground-adapter/` owns the small server that sits between visitors and the shared Lite instance
3. `docs/plans/2026-04-17-aionis-playground-scenarios.md` is the recommended location for scenario scripts if they grow beyond what this plan includes
4. the shared Lite instance for the Playground is deployment, not source; it does not live in this repository beyond configuration

Both apps may share a small utility package for visual primitives such as state badges, transition arrows, and timeline layouts. If that package reaches a reasonable size, place it at `apps/ui-shared/` and publish it only as a workspace-local dependency.

## Dependency and scope boundary

The following invariants protect the runtime kernel from UI-driven pressure:

1. Inspector and Playground do not add runtime routes unless a corresponding public SDK surface already exists
2. Inspector and Playground do not add runtime event hooks, background jobs, or write-side invariants
3. `src/memory/*` is not modified by this plan
4. `src/host/*` gains only a static-asset registration path for Inspector; no new request hooks
5. visible UI copy does not invent new terminology that is not already canonical in the runtime or approved through the vocabulary tiering work

If the UI work discovers a genuine missing runtime surface, that surface is proposed as a separate plan, goes through the standard spec plus implementation pair, and ships to the SDK before the UI uses it.

## Phase plan

### Phase 1. Inspector MVP

Deliver:

1. Inspector source skeleton at `apps/inspector/`
2. Lite static route registration
3. four tabs wired against existing SDK surfaces
4. seed pack importer with three patterns, two workflows, five runs, one handoff
5. empty-state UI that does not crash against a clean runtime
6. production bundle under 800 KB gzipped

Exit criterion: every Inspector acceptance criterion above is satisfied.

### Phase 2. Inspector polish and screen recording pack

Deliver:

1. `prefers-reduced-motion` support
2. click-through provenance wired across patterns, workflows, and first actions
3. alias layer for internal vocabulary
4. a short screen recording that demonstrates the pattern state machine without narration
5. a still-image screenshot pack suitable for blog posts and docs

Exit criterion: docs site can embed a two-minute screen recording at the homepage and on the Task Start concept page without additional editing.

### Phase 3. Playground scenarios and seed packs

Deliver:

1. scenario scripts for `billing retry`, `export bug`, and `launch article rewrite`
2. seed packs for each scenario
3. run 1 and run 2 narrative copy free of internal runtime vocabulary in visible strings
4. adapter service that enforces visitor scope isolation and rate limits
5. local dev harness that exercises the full scenario playback end to end

Exit criterion: any of the three scenarios plays end to end locally against a real Lite instance without manual intervention.

### Phase 4. Playground launch

Deliver:

1. deployed static site at the chosen public domain
2. deployed adapter service in front of a hosted Lite instance
3. a launch blog post that references the Playground and the Inspector screen recording
4. a social media launch pack with animation clips and screenshots
5. Playground rate limits and abuse mitigations

Exit criterion: every Playground acceptance criterion above is satisfied, and the launch post is live with at least one external inbound link.

## Timeline

All durations assume one engineer on the primary implementation track plus part-time support from a second engineer for content, animation polish, and deployment.

1. Week 1 to 3: Inspector MVP
2. Week 2 to 4: Playground scenario writing and seed pack design, in parallel
3. Week 4 to 5: Inspector polish, screen recording, alias layer
4. Week 4 to 7: Playground frontend, adapter service, scenario playback
5. Week 6: Inspector ships with the next runtime release
6. Week 8: Playground launches with blog and social pack
7. Week 10 to 12: iteration based on visitor and integrator feedback

## Risks

### Risk 1. UI expansion pressure leaks into the runtime kernel

Mitigation: enforce the dependency and scope boundary section. Any proposed runtime route that exists only to serve UI needs goes through a separate plan before it is written.

### Risk 2. Scenario content becomes fragile or unrealistic

Mitigation: scenarios must be real Lite runs, not scripted fakes. Seed packs are generated from real recorded runs, not hand-authored JSON.

### Risk 3. Inspector bundle grows into a heavyweight SPA

Mitigation: set and enforce the 800 KB gzipped budget. Prefer `Preact` plus `HTM` over `React` plus `Vite` when bundle size is ambiguous.

### Risk 4. Playground becomes a free compute piñata

Mitigation: enforce visitor-scoped rate limits at the adapter. Scopes expire within twenty four hours. Admin and control-plane routes remain unreachable through the adapter.

### Risk 5. Visible UI copy drifts into internal runtime vocabulary

Mitigation: the alias layer is part of the Inspector acceptance criteria. A short visible-copy audit happens before each launch phase.

### Risk 6. Inspector tempts contributors into building a hosted multi-tenant dashboard

Mitigation: Inspector is Lite-only by host-edition guard. The hosted multi-tenant direction is explicitly out of scope for this plan. A separate plan is required before any such work begins.

### Risk 7. Playground becomes a substitute for documentation

Mitigation: Playground launch content links back to the docs site's core-path fragment. Scenario captions never try to replace the Architecture Overview or the SDK Quickstart.

## Evaluation

The UI work is successful when all of the following can be stated honestly:

1. an existing integrator uses Inspector to debug a real issue at least once within the first month after ship
2. a new visitor to Playground can describe in their own words what Aionis did after watching one scenario
3. the Inspector screen recording appears in at least one external conference talk, blog post, or developer newsletter within three months of launch
4. at least one community member produces a derived artefact, such as a tweet or a screenshot, that uses Playground or Inspector as its subject
5. the repository gains at least one inbound link from a coding agent project that credits the visible behavior shown in the UI

Inspector and Playground are not complete if only the engineering ships. They are complete when the artefacts they produce start showing up in places the project does not control.

## Relationship to other plans

1. the vocabulary tiering work for the concept density problem should land before or alongside the Inspector alias layer in Phase 2
2. the core path fragment at `docs/fragments/core-path.md` should be the canonical source for any three-tier messaging that the Playground or Inspector references
3. the future hosted control-plane direction remains out of scope and is tracked separately in `OPEN_CORE_BOUNDARY.md`

## Open questions

1. should the Inspector alias layer be code-driven via a JSON vocabulary file, or content-driven via copy in the UI source?
2. should the Playground adapter persist visitor scopes beyond twenty four hours if the visitor returns, or always treat each visit as fresh?
3. should the Playground backend expose the Inspector on the same hosted instance so visitors can also see the local UI running live, or is that deferred to Phase 5?
4. should Inspector ship a minimal read-only SDK wrapper at `packages/inspector-client` so third parties can reuse the data-access layer, or stay fully internal?

These are answered during Phase 1 and Phase 3 scoping, not at plan authoring time.

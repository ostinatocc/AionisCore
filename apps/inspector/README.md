# Aionis Inspector

A local, read-only observation UI for the Aionis Lite runtime.

Inspector lets you see what the runtime is doing, what it has learned, and what
it will recommend next, without reading SQLite or adding new server-side
observability. Everything it shows comes from the same public SDK surfaces that
external integrators use.

> This is the Phase 1 MVP from `docs/plans/2026-04-17-aionis-inspector-and-playground-plan.md`.
> The Lite static route, payload-aligned client, one-click seed pack, and
> Patterns → Memory provenance click-through are wired.

## What it shows

| Tab | What you see |
| --- | --- |
| Live | `/health`, a polled planning context probe, and an in-browser log of every SDK call made from this tab |
| Memory | Nodes in the current scope via `POST /v1/memory/find`, with filter and read-only detail drawer |
| Patterns · Workflows | Pattern trust state and workflow promotion state via `POST /v1/memory/execution/introspect`, grouped by state. Each card has an `Open in Memory →` button that jumps to the Memory tab with the originating node filtered and highlighted |
| Playground | A form that calls `POST /v1/memory/kickoff/recommendation` and renders the returned first action as a structured "Why this pick" panel: hero card (selected tool, file path, next action, source badge, `history applied` pill), parsed rationale narrative bullets, signal pills (token overlap, summary, history_applied, …), and a "Candidates considered" strip with the chosen tool highlighted |

Inspector never writes, archives, or deletes. It does not add a new runtime
HTTP route for itself.

## Running

The intended path for most users is to let Lite serve Inspector:

```bash
npm run inspector:install   # one-time
npm run inspector:build     # produces apps/inspector/dist
npm run lite:start          # serves the same bundle at http://127.0.0.1:3001/inspector
```

Lite's host registers a Lite-only static route at `/inspector` that serves the
compiled bundle. If the bundle is missing, Lite logs a warning and keeps
running; all other routes remain unaffected. Set `LITE_INSPECTOR_ENABLED=false`
to skip the static route entirely.

For iterative UI work, Inspector also has its own Vite dev server with
hot-reload:

```bash
npm run inspector:dev       # dev server at http://127.0.0.1:5180
```

By default the dev server proxies `/v1` and `/health` to
`http://127.0.0.1:3001`, which is where `npm run lite:start` serves Lite. To
point the dev server at a different runtime, set `AIONIS_RUNTIME_ORIGIN` before
`inspector:dev`.

Other useful scripts:

```bash
npm run inspector:preview   # serve the built bundle standalone
npm run inspector:typecheck # tsc --noEmit
```

## Seed pack

The Live tab has a `Load seed pack` button. It imports
`apps/inspector/public/seed-pack.json` into an isolated scope (`inspector:seed`
by default) via `POST /v1/memory/packs/import`, then switches the Inspector to
that scope so the other tabs immediately show real memory nodes, patterns, and
workflows.

The bundled pack is generated from a scope on a running Lite. To regenerate it
from your own recorded data (for example after running
`npm run example:sdk:core-path`), run:

```bash
npm run lite:start          # or keep an existing one running
npm run inspector:seed      # writes apps/inspector/public/seed-pack.json
npm run inspector:build     # copy the refreshed pack into dist/
```

Environment overrides for the generator:

- `BASE_URL` (default `http://127.0.0.1:3001`) — Lite HTTP origin
- `SOURCE_TENANT` / `SOURCE_SCOPE` (defaults `default`/`default`) — what to export
- `SEED_TENANT` / `SEED_SCOPE` (defaults `default`/`inspector:seed`) — what the
  pack is retagged as before it ships to Inspector

## Configuration

The connection bar at the top of the page lets you change:

1. `Runtime origin`: leave empty to call the same origin that served the HTML
2. `Tenant`: the `tenant_id` attached to every SDK call
3. `Scope`: the `scope` used for memory find, introspect, and kickoff

Values persist in `localStorage` under `aionis-inspector:runtime-config`.

## Provenance click-through

Every card on the Patterns · Workflows tab has a small `Open in Memory →`
button next to its id. Clicking it:

1. Switches to the Memory tab
2. Sets the filter to the node's full UUID so the list narrows to one row
3. Auto-selects the detail pane with that row's node
4. Highlights the row with a blue left border and a `focused` pill
5. Shows a banner at the top with `from pattern` / `from workflow`, the node
   title, and a `Clear focus` button that restores the unfiltered view

If the focused node is outside the current Memory page, Inspector issues a
one-shot `memory/find` by `id` so it still shows up; any error is surfaced in
the banner rather than silently hiding the node.

## Kickoff rationale parsing

The runtime returns `rationale.summary` as a loosely structured string using
`|` as the top-level delimiter and `;` as a sub-delimiter, with `key=value`
signals intermixed with free-form sentences. `lib/parse-rationale.ts` converts
that into:

1. `narrative[]` — human sentences like `selected tool: read`, rendered as
   bullets under **Why this pick**
2. `signals[]` — `key=value` facts like `token_overlap=4`, rendered as
   colour-coded pills (emerald for `true`, sky for numerics, slate for
   everything else)

Values that themselves contain `;` are kept intact: if a piece starts with a
`snake_case_key=`, the parser treats the whole remainder as the value rather
than splitting inside it. Unclassifiable rationale strings drop into
narrative so we never silently lose evidence.

## Technology

1. Preact 10 with Preact's Vite preset
2. Tailwind CSS v3
3. Local component state only; no Redux, no Zustand
4. `fetch` wrappers around the Aionis HTTP routes

Bundle budget: the Phase 1 MVP targets under 800 KB gzipped. The production
build report prints gzipped sizes; failing the budget is a bug.

## Accessibility

1. Inspector respects `prefers-reduced-motion`; animation-heavy features in
   Phase 2 (pattern transition animations) will honor the same preference
2. All interactive elements are real `button` or `a` tags with visible focus
   rings

## Boundaries

1. Inspector reads only. Any write, archive, delete, or governance mutation is
   out of scope for Inspector and belongs in explicit tooling
2. Inspector never invents terminology. The alias layer lives in
   `src/lib/alias.ts`; internal names are preserved in tooltips and JSON panels
3. Inspector does not add runtime HTTP routes. If a view needs one, it gets
   proposed as an SDK surface first and Inspector uses it from there

## Where things live

```
apps/inspector/
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── seed-pack.json          # bundled sample pack; see Seed pack
├── scripts/
│   └── generate-seed.mjs       # exports a live scope into seed-pack.json
└── src/
    ├── app.tsx                 # tab shell, connection bar, health polling
    ├── main.tsx                # entry
    ├── styles.css              # tailwind layers + a few custom component classes
    ├── components/
    │   ├── connection-bar.tsx  # origin / tenant / scope form
    │   ├── empty-state.tsx
    │   ├── json-view.tsx
    │   ├── seed-pack-button.tsx
    │   ├── section.tsx
    │   └── state-badge.tsx
    ├── lib/
    │   ├── aionis-client.ts    # fetch wrapper + request log
    │   ├── alias.ts            # vocabulary alias map
    │   ├── format.ts           # duration, relative time, truncation
    │   ├── parse-rationale.ts  # kickoff rationale → narrative + signals
    │   ├── runtime-config.ts   # origin / tenant / scope persistence
    │   └── use-async.ts        # tiny polling hook
    └── tabs/
        ├── live-tab.tsx
        ├── memory-tab.tsx
        ├── patterns-tab.tsx
        └── playground-tab.tsx
```

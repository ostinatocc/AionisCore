# Aionis Playground

Public hosted demo for Aionis Runtime. This is the MVP slice carved out of
the parent plan
[`docs/plans/2026-04-17-aionis-inspector-and-playground-plan.md`](../../docs/plans/2026-04-17-aionis-inspector-and-playground-plan.md)
and scoped in [`docs/plans/2026-04-17-playground-hosted-mvp.md`](../../docs/plans/2026-04-17-playground-hosted-mvp.md).

The page lets any visitor type a task description and receive a real
kickoff recommendation from an Aionis Lite backend, complete with
structured rationale, signal pills, and candidate highlighting. No install,
no signup.

## Scope

1. Vite + Preact + Tailwind, same stack as `apps/inspector`
2. Deploys as a static bundle to Vercel
3. Hits a remote read-only Aionis Lite backend at `VITE_AIONIS_API_URL`
4. Reads from a single shared demo scope, `default / playground:demo`, seeded
   by a host-side script. No visitor-side writes
5. Animated scripted scenarios (run-1 vs run-2) stay in the parent plan,
   Phase 4

## Layout

```
apps/playground/
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vercel.json
├── vite.config.ts
├── public/
│   └── seed-pack.json           # bundled sample pack (mirror of inspector's)
├── scripts/
│   └── seed-remote.mjs          # seeds playground:demo on a remote Lite
└── src/
    ├── main.tsx
    ├── app.tsx
    ├── styles.css
    ├── components/
    │   ├── hero.tsx
    │   ├── kickoff-card.tsx     # form + structured result
    │   ├── what-just-happened.tsx
    │   ├── install-block.tsx
    │   └── footer.tsx
    └── lib/
        ├── playground-client.ts # reads VITE_AIONIS_API_URL
        └── visitor-scope.ts     # DEMO_TENANT_ID / DEMO_SCOPE constants
```

Shared library code is vendored under `src/shared/` (alias, format,
parse-rationale, json-view) so the Playground can deploy as a standalone
Vercel project without reaching into sibling monorepo folders. The
canonical source lives in `apps/inspector/src/`; if you change it there,
mirror the change under `apps/playground/src/shared/`.

If the Playground grows a second tab, lift these into a real workspace
package instead.

## Environment contract

One variable:

- `VITE_AIONIS_API_URL`: origin of the Aionis Lite HTTPS adapter, no trailing
  slash. In development the Vite proxy forwards `/v1` and `/health` to
  `http://127.0.0.1:3001` automatically, so dev mode works with an empty env.
- Production builds without this variable **fail fast**. A silently wrong
  default would be worse than a loud failure.

## Develop against a local Lite

```bash
npm run lite:start           # in one terminal
npm run playground:seed      # seed default/playground:demo once
npm run playground:dev       # in another terminal → http://127.0.0.1:5190
```

## Build for production

```bash
VITE_AIONIS_API_URL=https://cloud.aionisos.com \
  npm run playground:build
```

The output lands in `apps/playground/dist` ready for static hosting.

## Deploy to Vercel

1. Connect this repository to a Vercel project scoped to
   `playground.aionisos.com`
2. In Vercel project settings:
   - **Root directory**: `apps/playground`
   - **Build command**: `npm run build` (honored by `vercel.json`)
   - **Output directory**: `dist`
   - **Environment variable**: `VITE_AIONIS_API_URL` =
     `https://cloud.aionisos.com`
3. Push to the default branch and Vercel will build and serve the bundle

## Backend: Aionis Lite on GCE

The hosted backend is a Fastify adapter in front of Aionis Lite, running
on a Google Compute Engine VM behind Caddy (TLS terminator). The public
origin is `https://cloud.aionisos.com`. See
[`docs/plans/2026-04-17-playground-hosted-mvp.md`](../../docs/plans/2026-04-17-playground-hosted-mvp.md)
for the full architecture and operator checklist.

Only two routes are exposed publicly:

| Method | Path                                    |
| ------ | --------------------------------------- |
| GET    | `/health`                               |
| POST   | `/v1/memory/kickoff/recommendation`     |

Everything else returns a stable 404 `route_not_allowed`. `packs/import` is
reachable only inside the container and is used exactly once, at first boot,
to seed the `default/playground:demo` scope.

## Seed the hosted backend manually

```bash
AIONIS_API_URL=https://cloud.aionisos.com \
  npm run playground:seed
```

In normal operation this is not needed — the container seeds itself on
first start and persists the marker file to the Fly volume. The command is
here for when you want to re-seed from your workstation against a Lite
instance whose adapter is temporarily disabled.

## Acceptance

Run from the repo root:

1. `npm run playground:typecheck` is clean
2. `VITE_AIONIS_API_URL=... npm run playground:build` emits a `dist/` with
   the JS chunk staying under 60 KB gzipped
3. With Lite running and the `playground:demo` scope seeded, the dev server
   returns `source_kind: experience_intelligence` and `history_applied: true`
   for the default "Execute Aionis Doc workflow" query
4. A query with no match (for example, "Investigate flaky payment retry on
   checkout") falls back to `source_kind: tool_selection` and
   `history_applied: false` without errors

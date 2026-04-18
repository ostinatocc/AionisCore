Last reviewed: 2026-04-17

Document status: historical — shipped, but the deployment target pivoted.
The hosted Playground ships at https://playground.aionisos.com (Vercel)
in front of a Lite instance on a Google Cloud VM at
https://cloud.aionisos.com (Debian 12 + systemd + Caddy). The Fly.io
path described below under "deployment plan" was explored but not
shipped; the related repo artefacts (`Dockerfile.playground`,
`fly.toml`, `scripts/playground-container-entrypoint.sh`,
`scripts/playground-fly-dns.sh`, and the `adapter:fly:*` / `adapter:docker:*`
npm scripts) were removed in a follow-up commit. Sections that reference
them are left intact as a record of the tradeoffs considered.

# Aionis Playground Hosted MVP

Date: 2026-04-17

This is a concrete sub-plan carved out of
`2026-04-17-aionis-inspector-and-playground-plan.md`. That document specifies
the full Playground vision (three scripted scenarios, run-1 vs run-2 animated
comparison, content strategy, VPS adapter). Landing all of it is a weeks-long
effort. This sub-plan scopes the smallest slice that produces a public,
shareable URL where a stranger can interact with real Aionis output.

Everything beyond this slice stays in the parent plan.

## Chosen shape

| Decision | Choice | Notes |
| --- | --- | --- |
| Frontend framework | Vite + Preact + Tailwind | reuses Inspector's stack, no new tooling |
| Frontend host | Vercel | static deploy, zero config |
| Backend mode | Real Lite behind HTTPS adapter | matches parent plan, rules out mock-only |
| Backend host | deferred; scaffolded to read `VITE_AIONIS_API_URL` | parent plan calls for a small VPS |
| URL | `playground.aionis.dev` | independent subdomain |
| Shared-scope model | per-visitor random scope seeded from `seed-pack.json` | isolates visitors, matches parent plan §Backend model |
| Write access | none from the visitor side | reads + kickoff only |
| Animations | out of scope here | belongs to parent plan Phase 4 |

## Goals for this slice

1. a new visitor can open `playground.aionis.dev` and understand in under sixty
   seconds what Aionis does
2. a new visitor can type a task description, click once, and see a real
   kickoff recommendation with its structured rationale
3. the frontend builds and deploys to Vercel with `vercel.json` and a CI-ready
   build command
4. nothing about the visitor experience depends on a local Lite being running;
   the only requirement is that `VITE_AIONIS_API_URL` points at a reachable
   read-only Aionis instance at build time
5. the existing Inspector is not regressed; the Playground is a separate app

## Non-goals for this slice

1. scripted scenarios with run-1 vs run-2 animation
2. a pattern-transition timeline visualization
3. per-visitor scope garbage collection on the server
4. backend adapter / rate limiting / VPS provisioning (separate follow-up)
5. marketing copy that competes with the docs site
6. a logged-in or multi-tenant experience

## Surface

### 1. Hero section

```
Aionis Playground

See what a coding agent remembers — and what it does differently
next time.

[ Try a kickoff ]   [ Read the docs ]
```

Sub-copy: three plain-English bullets, no runtime vocabulary on the first
read:

- every agent step is captured as execution memory
- repeated work turns into trusted patterns and promoted workflows
- the next similar task starts from a better first action, not from zero

### 2. "Your turn" card

A compact form with:

1. a task description textarea, pre-filled with a demo example
2. a read-only note showing the candidate tool set (baked in; the visitor
   does not need to pick tools on the first surface)
3. a `Get Aionis's first action` button

On submit, it calls the configured backend with the visitor's session scope
and renders the same structured "Why this pick" view the Inspector
Playground tab ships:

- hero card (selected tool, file path, next action, `history applied` pill,
  source_kind badge)
- narrative bullets parsed from `rationale.summary`
- signal pills parsed from `rationale.summary` key=value pieces
- raw response as a collapsed JSON view, labelled "for engineers"

### 3. "What just happened" callout

A short explainer under the result that says, plainly:

- Aionis looked up memory scoped to your visitor session
- it found an execution workflow that matched your query by token overlap
- it returned the first action that workflow recorded the last time a
  similar task ran
- none of this involved a model call; the match came from memory alone

### 4. Install block

A code block with `npm install @ostinato/aionis` and a secondary link to the
Inspector docs so a motivated visitor can run the same experience locally.

### 5. Footer

- link to the GitHub repo
- link to the docs site
- a note that the public instance is read-only and visitor scopes are
  ephemeral

## Visitor-scope model

1. on first load, the frontend reads or generates a random identifier from
   `localStorage` (key: `aionis-playground:visitor-id`)
2. the scope used for every call is `playground:<visitor-id>`
3. before the first kickoff call, the frontend issues a one-time
   `POST /v1/memory/packs/import` with the bundled seed pack, retagged to the
   visitor scope, so the visitor's session has something to match against
4. subsequent visits reuse the same scope; no re-seed unless the visitor
   clicks `Reset my session`
5. the backend is responsible for eventual cleanup (parent plan calls out a
   24h TTL); that cleanup is not in scope for this slice

## Frontend layout

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
│   ├── favicon.svg
│   └── seed-pack.json          # bundled sample pack, copied from apps/inspector/public
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
        ├── playground-client.ts # uses VITE_AIONIS_API_URL
        └── visitor-scope.ts     # localStorage + random-id allocation
```

Shared libs consumed by relative import (no workspace package needed yet):

- `apps/inspector/src/lib/alias.ts`
- `apps/inspector/src/lib/format.ts`
- `apps/inspector/src/lib/parse-rationale.ts`
- `apps/inspector/src/components/json-view.tsx`

If the Playground ever grows a second tab, the shared-by-relative-import
pattern should be replaced with a `packages/inspector-shared` workspace
package.

## Environment contract

The Playground build reads a single env var:

- `VITE_AIONIS_API_URL`: origin of the Aionis Lite HTTPS adapter. No trailing
  slash. Default in dev: `http://127.0.0.1:3001`. Production builds without
  this variable must fail fast rather than silently falling back.

The adapter itself is out of scope for this slice. The parent plan specifies
how it should behave; this slice only needs the URL to exist.

## Acceptance criteria

1. `npm run playground:build` produces a static `dist/` that loads in a
   browser with no HTTP errors when the env var is set
2. visiting `/` shows the hero, the kickoff card, and the explainer sections
   in order on a 1280x800 viewport without horizontal scroll
3. clicking `Get Aionis's first action` with the pre-filled query yields a
   rendered result with at least one narrative bullet and one signal pill,
   or a clear error surface if the backend is unreachable
4. typecheck and build are clean
5. gzipped JS bundle stays under 60 KB for the initial slice
6. the Inspector's own build is not changed and still passes its typecheck

## Out of scope (stays in parent plan)

1. three scripted scenarios with run-1 vs run-2 animation
2. pattern-transition timeline visualization
3. a backend adapter that enforces rate limits, scope TTLs, or per-IP quotas
4. a launch blog post and social pack
5. per-scope analytics or any visitor-tracking beyond the visitor id

## Follow-ups

Once the MVP is deployed, the obvious next work items are:

1. adapter service (parent plan Phase 4) so the public URL is actually safe
   to link from social posts
2. one scripted scenario with a timeline view, to give the URL a stronger
   narrative hook
3. Open Graph image and basic social share metadata

---

## Backend deployment on Fly.io (this slice, addendum)

After the frontend was up locally, we picked Fly.io for the backend because
Aionis Lite needs three things serverless platforms cannot give it: a
persistent filesystem for `node:sqlite`, an always-on process, and a stable
public hostname. Fly's volumes + shared-cpu-1x VMs cover all three with a
generous free allowance.

### Shape

A single Fly VM, one Docker image, two processes inside:

```
                          fly.io (sjc, shared-cpu-1x, 512mb)
┌──────────────────────────────────────────────────────────────────┐
│ /app/scripts/playground-container-entrypoint.sh                  │
│                                                                  │
│  (1) starts Aionis Lite                                          │
│      node apps/lite/src/index.js → 127.0.0.1:3001                │
│                                                                  │
│  (2) waits for Lite /health, then one-time seeds                 │
│      default/playground:demo if /data/.seeded is missing         │
│                                                                  │
│  (3) execs the public adapter                                    │
│      node apps/playground-adapter/src/server.mjs → :8080         │
│                                                                  │
│  /data  ← persistent volume (SQLite + .seeded marker)            │
└──────────────────────────────────────────────────────────────────┘
               ▲
               │ (HTTPS, fly proxy)
               │
      playground.aionis.dev sends kickoff requests via
      https://api-playground.aionis.dev/v1/memory/kickoff/recommendation
```

### Adapter surface (only two public routes)

| Method | Path                                    | Notes                                             |
| ------ | --------------------------------------- | ------------------------------------------------- |
| GET    | `/health`                               | Proxies Lite's own `/health`, returns a summary    |
| POST   | `/v1/memory/kickoff/recommendation`     | Rate-limited, 10 req/min per IP, CORS-restricted  |

Everything else is a stable `{ok:false, error:"route_not_allowed"}` 404.
`packs/import` is reachable only from inside the container, which is what
the seed step uses.

### Files added

- `apps/playground-adapter/` — Fastify app, CORS allowlist, per-IP rate
  limiter, short upstream timeout
- `Dockerfile.playground` — node:22-bookworm-slim, workspace `npm ci`,
  tini as PID 1
- `fly.toml` — app name, region, `/data` volume mount, `/health` check
- `scripts/playground-container-entrypoint.sh` — Lite → wait-for-health →
  one-time seed → exec adapter

Root `package.json` gained helpers: `adapter:dev`, `adapter:docker:build`,
`adapter:docker:run`, `adapter:fly:deploy`, `adapter:fly:logs`,
`adapter:fly:status`.

### Environment knobs the VM respects

| Variable                         | Default                             | Purpose                                 |
| -------------------------------- | ----------------------------------- | --------------------------------------- |
| `PORT`                           | `3001`                              | Lite internal port                      |
| `ADAPTER_PORT`                   | `8080`                              | Public port Fly routes to               |
| `LITE_UPSTREAM`                  | `http://127.0.0.1:3001`             | Adapter → Lite                          |
| `LITE_INSPECTOR_ENABLED`         | `false`                             | No static UI in production              |
| `LITE_REPLAY_SQLITE_PATH`        | `/data/aionis-lite-replay.sqlite`   | Persistent replay DB                    |
| `LITE_WRITE_SQLITE_PATH`         | `/data/aionis-lite-write.sqlite`    | Persistent write DB                     |
| `SEED_PACK_PATH`                 | `/app/apps/playground/public/seed-pack.json` | Used once, then skipped       |
| `DEMO_TENANT_ID` / `DEMO_SCOPE`  | `default` / `playground:demo`       | Shared demo scope                       |
| `ADAPTER_RATE_LIMIT_MAX` / `_WINDOW_MS` | `10` / `60000`               | Per-IP rolling window                   |
| `ADAPTER_ALLOWED_ORIGINS`        | `https://playground.aionis.dev,http://localhost:5173,http://127.0.0.1:5173` | Strict CORS allowlist |

### One-time operator checklist

```bash
# 0. install flyctl, sign in once
brew install flyctl
flyctl auth login

# 1. create the app (name is pinned to aionis-playground-api)
flyctl apps create aionis-playground-api --org personal

# 2. create a small persistent volume in the primary region
flyctl volumes create aionis_playground_data \
  --app aionis-playground-api --region sjc --size 1

# 3. first deploy (builds the image locally, pushes to Fly)
npm run adapter:fly:deploy

# 4. smoke test the public endpoint
curl -s https://aionis-playground-api.fly.dev/health | jq .

# 5. point a real DNS name at the app
flyctl certs create api-playground.aionis.dev --app aionis-playground-api
# then add the CNAME record Fly prints at your DNS provider
```

### Local verification before pushing

```bash
npm run adapter:docker:build
npm run adapter:docker:run &     # listens on :8080, seeds once into the volume
curl -s http://127.0.0.1:8080/health | jq .
curl -s -X POST http://127.0.0.1:8080/v1/memory/kickoff/recommendation \
  -H 'content-type: application/json' \
  -d '{"tenant_id":"default","scope":"playground:demo","request":{"task":{"intent":"Execute Aionis Doc workflow"}}}' \
  | jq '.selected_tool, .history_applied'
```

Expected: `"experience_intelligence"` and `true` — i.e. the seed pack was
imported and the kickoff path found a matching workflow.

### Custom domain + TLS (`api-playground.aionis.dev`)

Fly can serve the app under the default `aionis-playground-api.fly.dev`, but
we want the Playground to hit `https://api-playground.aionis.dev` so the
hostname is on a domain we own. That requires two things:

1. A DNS record at your provider (Cloudflare, Route 53, Namecheap, …) that
   points the subdomain at Fly.
2. A Fly certificate entry that tells Let's Encrypt to issue for that name.

There is a tiny helper script at `scripts/playground-fly-dns.sh` that
**prints the exact records you need**, then **probes them with `dig`** so
you can see status flip from `✗` to `✓` in real time.

#### One-time setup (run both)

```bash
# a. tell Fly we want a cert for the custom domain
npm run adapter:fly:certs   # runs: scripts/playground-fly-dns.sh --create-cert

# b. open the output and add the two records it prints at your DNS provider:
#      Type   Name                                   Value
#      -----  -------------------------------------  --------------------------------------
#      CNAME  api-playground.aionis.dev              aionis-playground-api.fly.dev
#      CNAME  _acme-challenge.api-playground…        <value printed by the script>
```

#### Watch propagation

```bash
npm run adapter:fly:dns     # re-run as often as you like; no side effects
```

The script queries `1.1.1.1` (not your local resolver, to avoid stale
caches) and a Fly API call, then prints something like:

```
1. Fly certificate for api-playground.aionis.dev
  ✓ cert entry already exists
2. Required DNS records at your provider
  CNAME  api-playground.aionis.dev          → aionis-playground-api.fly.dev
  CNAME  _acme-challenge.…                  → <provided by Fly>
3. Live DNS probe against 1.1.1.1
  ✓ CNAME api-playground.aionis.dev → aionis-playground-api.fly.dev
  ✓ api-playground.aionis.dev A    66.241.125.123
  ✓ api-playground.aionis.dev AAAA 2a09:8280:1::1:abcd
  ✓ CNAME _acme-challenge.api-playground.aionis.dev → api-playground.aionis.dev.<app>.flydns.net
4. HTTPS reachability
  ✓ https://api-playground.aionis.dev/health  →  200
```

Once step 4 goes green, the Playground frontend can point at the custom
hostname.

#### Cloudflare note

If your DNS provider is Cloudflare, set the proxy status for
`api-playground` to **DNS only** (grey cloud), not proxied (orange cloud).
A proxied record breaks Fly's own TLS and obscures the real client IP from
the adapter's rate limiter.

### Frontend cutover

Once the Fly URL answers, flip the Playground build:

```bash
VITE_AIONIS_API_URL=https://api-playground.aionis.dev npm run playground:build
# deploy apps/playground/dist to Vercel (vercel.json already committed)
```

Everything else in the frontend stays put — the adapter preserves the
response shape of `POST /v1/memory/kickoff/recommendation` byte-for-byte.

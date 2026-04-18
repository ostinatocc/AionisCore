# Aionis Playground Adapter

A very thin Fastify proxy that sits in front of an Aionis Lite runtime and
exposes **only** what the hosted Playground needs. Everything else 404s.

## Why it exists

- Lite speaks the full memory API, including write endpoints like
  `POST /v1/memory/packs/import`. We don't want random visitors on the open
  internet to hit those.
- CORS, rate limiting, and request logging belong in a small public-facing
  layer so Lite can stay focused on local/dev use.

## Route whitelist

| Method | Path                                    | Purpose                                    |
| ------ | --------------------------------------- | ------------------------------------------ |
| GET    | `/health`                               | Proxies Lite's health; returns `{ok:true}` |
| POST   | `/v1/memory/kickoff/recommendation`     | The single kickoff call the UI makes       |

Anything else returns **404 `route_not_allowed`**.

## Environment

| Variable                  | Default                  | Notes                                                               |
| ------------------------- | ------------------------ | ------------------------------------------------------------------- |
| `ADAPTER_PORT`            | `8080`                   | Port the adapter binds to. In production Caddy reverse-proxies to it on the loopback. |
| `ADAPTER_HOST`            | `0.0.0.0`                | Bind host. Use `127.0.0.1` when fronted by Caddy on the same host.  |
| `LITE_UPSTREAM`           | `http://127.0.0.1:3001`  | Where the sidecar Lite process is listening.                        |
| `ADAPTER_ALLOWED_ORIGINS` | `https://playground.aionisos.com,http://localhost:5173,http://127.0.0.1:5173` | Comma-separated CORS allowlist.    |
| `ADAPTER_RATE_LIMIT_MAX`  | `10`                     | Max kickoff requests per IP per window.                             |
| `ADAPTER_RATE_LIMIT_WINDOW_MS` | `60000`             | Rolling window for the rate limiter.                                |
| `ADAPTER_REQUEST_TIMEOUT_MS`   | `15000`             | Upstream timeout before we give up and return 504.                  |

## Local dev

```bash
# terminal 1 — start a local Lite
npm run lite:start

# terminal 2 — start the adapter
node apps/playground-adapter/src/server.mjs
```

Then:

```bash
curl -s http://127.0.0.1:8080/health | jq .

curl -s -X POST http://127.0.0.1:8080/v1/memory/kickoff/recommendation \
  -H 'content-type: application/json' \
  -d '{"tenant_id":"default","scope":"playground:demo","request":{"task":{"intent":"Execute Aionis Doc workflow"}}}' | jq .
```

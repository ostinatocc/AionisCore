// @ts-check
/**
 * Aionis Playground Adapter
 *
 * Public Fastify layer in front of a local Aionis Lite. Only a tiny set of
 * read-shaped routes is exposed. Everything else returns 404. Adds CORS,
 * per-IP rate limiting, and a short upstream timeout so a misbehaving client
 * cannot hold the single shared demo hostage.
 *
 * Keep this file dependency-light: it uses the root-workspace `fastify`
 * install and the standard library's `fetch`.
 */

import Fastify from "fastify";

const ADAPTER_PORT = Number(process.env.ADAPTER_PORT ?? 8080);
const ADAPTER_HOST = process.env.ADAPTER_HOST ?? "0.0.0.0";
const LITE_UPSTREAM = (process.env.LITE_UPSTREAM ?? "http://127.0.0.1:3001").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = Number(process.env.ADAPTER_REQUEST_TIMEOUT_MS ?? 15000);

const ALLOWED_ORIGINS = (process.env.ADAPTER_ALLOWED_ORIGINS ??
  "https://playground.aionisos.com,http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const RATE_LIMIT_MAX = Number(process.env.ADAPTER_RATE_LIMIT_MAX ?? 10);
const RATE_LIMIT_WINDOW_MS = Number(process.env.ADAPTER_RATE_LIMIT_WINDOW_MS ?? 60_000);

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    redact: {
      paths: ["req.headers.authorization", "req.headers.cookie"],
      censor: "[redacted]",
    },
  },
  bodyLimit: 256 * 1024, // 256 KiB is plenty for a kickoff payload.
  disableRequestLogging: false,
});

// ---------------------------------------------------------------------------
// CORS (hand-rolled, strict allowlist).
// ---------------------------------------------------------------------------

function applyCorsHeaders(request, reply) {
  const origin = request.headers.origin;
  if (!origin) return;
  if (!ALLOWED_ORIGINS.includes(origin)) return;
  reply.header("access-control-allow-origin", origin);
  reply.header("vary", "origin");
  reply.header("access-control-allow-methods", "GET, POST, OPTIONS");
  reply.header("access-control-allow-headers", "content-type");
  reply.header("access-control-max-age", "600");
}

fastify.addHook("onRequest", async (request, reply) => {
  applyCorsHeaders(request, reply);
});

fastify.options("/*", async (_request, reply) => {
  reply.code(204).send();
});

// ---------------------------------------------------------------------------
// Per-IP rate limiter (in-memory rolling window, good enough for a single VM).
// ---------------------------------------------------------------------------

const rateBuckets = new Map(); // ip -> { count, resetAt }

function checkRateLimit(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true, remaining: RATE_LIMIT_MAX - 1, retryAfterMs: 0 };
  }
  if (bucket.count >= RATE_LIMIT_MAX) {
    return { ok: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { ok: true, remaining: RATE_LIMIT_MAX - bucket.count, retryAfterMs: 0 };
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateBuckets.entries()) {
    if (bucket.resetAt <= now) rateBuckets.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS).unref();

// ---------------------------------------------------------------------------
// Upstream proxy helper.
// ---------------------------------------------------------------------------

async function proxyToLite({ method, path, body, requestId }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${LITE_UPSTREAM}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        "x-adapter-request-id": requestId,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let payload;
    try {
      payload = text.length > 0 ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text };
    }
    return { status: res.status, payload };
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Health.
// ---------------------------------------------------------------------------

fastify.get("/health", async (request, reply) => {
  try {
    const upstream = await proxyToLite({
      method: "GET",
      path: "/health",
      requestId: request.id,
    });
    if (upstream.status !== 200) {
      return reply.code(503).send({
        ok: false,
        error: "upstream_unhealthy",
        upstream_status: upstream.status,
      });
    }
    return reply.send({
      ok: true,
      adapter: {
        version: "0.1.0",
        rate_limit: { max: RATE_LIMIT_MAX, window_ms: RATE_LIMIT_WINDOW_MS },
      },
      upstream: {
        edition: upstream.payload?.runtime?.edition ?? null,
        mode: upstream.payload?.runtime?.mode ?? null,
      },
    });
  } catch (err) {
    request.log.error({ err }, "health: upstream error");
    return reply.code(503).send({ ok: false, error: "upstream_unreachable" });
  }
});

// ---------------------------------------------------------------------------
// The single whitelisted kickoff route.
// ---------------------------------------------------------------------------

fastify.post("/v1/memory/kickoff/recommendation", async (request, reply) => {
  const ip = request.ip ?? "unknown";
  const gate = checkRateLimit(ip);
  reply.header("x-ratelimit-limit", String(RATE_LIMIT_MAX));
  reply.header("x-ratelimit-remaining", String(gate.remaining));
  if (!gate.ok) {
    reply.header("retry-after", String(Math.ceil(gate.retryAfterMs / 1000)));
    return reply.code(429).send({
      ok: false,
      error: "rate_limited",
      retry_after_ms: gate.retryAfterMs,
    });
  }

  try {
    const upstream = await proxyToLite({
      method: "POST",
      path: "/v1/memory/kickoff/recommendation",
      body: request.body,
      requestId: request.id,
    });
    return reply.code(upstream.status).send(upstream.payload);
  } catch (err) {
    const aborted = err && typeof err === "object" && "name" in err && err.name === "AbortError";
    request.log.error({ err, aborted }, "kickoff: upstream error");
    return reply.code(aborted ? 504 : 502).send({
      ok: false,
      error: aborted ? "upstream_timeout" : "upstream_unreachable",
    });
  }
});

// ---------------------------------------------------------------------------
// Everything else → 404 with a stable shape.
// ---------------------------------------------------------------------------

fastify.setNotFoundHandler((request, reply) => {
  reply.code(404).send({
    ok: false,
    error: "route_not_allowed",
    method: request.method,
    path: request.url,
  });
});

// ---------------------------------------------------------------------------
// Boot.
// ---------------------------------------------------------------------------

async function start() {
  try {
    await fastify.listen({ port: ADAPTER_PORT, host: ADAPTER_HOST });
    fastify.log.info(
      {
        upstream: LITE_UPSTREAM,
        allowed_origins: ALLOWED_ORIGINS,
        rate_limit: { max: RATE_LIMIT_MAX, window_ms: RATE_LIMIT_WINDOW_MS },
      },
      "aionis-playground-adapter ready",
    );
  } catch (err) {
    fastify.log.error({ err }, "failed to start adapter");
    process.exit(1);
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    fastify.log.info({ signal }, "shutting down");
    try {
      await fastify.close();
    } finally {
      process.exit(0);
    }
  });
}

start();

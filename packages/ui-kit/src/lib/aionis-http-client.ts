/**
 * Minimal typed HTTP client for Aionis Lite / Runtime.
 *
 * Covers the routes the three UIs (Inspector, Playground, Workbench UI)
 * actually consume. Deliberately small — if a new route is needed, extend
 * here so every surface gets the same typing and error handling.
 *
 * Error handling rule: every failure is thrown as `AionisHttpError`; the
 * caller is responsible for rendering. Success responses are returned as
 * opaque `unknown` unless the caller passes a validator, because this
 * package intentionally does not duplicate zod schemas from `runtime-core`.
 */

export interface AionisHttpClientOptions {
  /** Base URL (no trailing slash). Empty string means same origin. */
  baseUrl?: string;
  /** Default tenant for recall/memory/patterns. */
  tenantId?: string;
  /** Default scope. */
  scope?: string;
  /** Extra headers (e.g. token auth for Workbench daemon). */
  headers?: Record<string, string>;
  /** Override fetch — used for tests; defaults to `globalThis.fetch`. */
  fetch?: typeof fetch;
  /** Per-request timeout in ms. 0 = no timeout. */
  timeoutMs?: number;
}

export class AionisHttpError extends Error {
  readonly status: number;
  readonly url: string;
  readonly body: unknown;

  constructor(message: string, status: number, url: string, body: unknown) {
    super(message);
    this.name = "AionisHttpError";
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

export interface AionisClient {
  readonly options: AionisHttpClientOptions;
  withOptions(patch: Partial<AionisHttpClientOptions>): AionisClient;

  get<T = unknown>(path: string, query?: Record<string, string | number | undefined | null>): Promise<T>;
  post<T = unknown>(path: string, body?: unknown): Promise<T>;

  health(): Promise<unknown>;
  recall(params?: { tenantId?: string; scope?: string }): Promise<unknown>;
  patterns(params?: { tenantId?: string; scope?: string }): Promise<unknown>;
  workflows(params?: { tenantId?: string; scope?: string }): Promise<unknown>;
  kickoff(body: Record<string, unknown>): Promise<unknown>;
  replayStart(body: Record<string, unknown>): Promise<unknown>;
  replayStep(body: Record<string, unknown>): Promise<unknown>;
  replayComplete(body: Record<string, unknown>): Promise<unknown>;
  packsImport(body: Record<string, unknown>): Promise<unknown>;
  sessions(params?: { tenantId?: string; scope?: string; limit?: number }): Promise<unknown>;
}

export function createAionisHttpClient(options: AionisHttpClientOptions = {}): AionisClient {
  return new AionisHttpClientImpl(options);
}

class AionisHttpClientImpl implements AionisClient {
  readonly options: AionisHttpClientOptions;

  constructor(options: AionisHttpClientOptions) {
    this.options = {
      baseUrl: (options.baseUrl ?? "").replace(/\/+$/, ""),
      tenantId: options.tenantId,
      scope: options.scope,
      headers: { ...(options.headers ?? {}) },
      fetch: options.fetch,
      timeoutMs: options.timeoutMs ?? 20_000,
    };
  }

  withOptions(patch: Partial<AionisHttpClientOptions>): AionisClient {
    return new AionisHttpClientImpl({ ...this.options, ...patch });
  }

  async get<T = unknown>(
    path: string,
    query?: Record<string, string | number | undefined | null>,
  ): Promise<T> {
    const url = this.resolve(path, query);
    return this.request<T>(url, { method: "GET" });
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const url = this.resolve(path);
    return this.request<T>(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  health(): Promise<unknown> {
    return this.get("/health");
  }

  recall(params?: { tenantId?: string; scope?: string }): Promise<unknown> {
    return this.get("/v1/memory/recall", {
      tenant_id: params?.tenantId ?? this.options.tenantId,
      scope: params?.scope ?? this.options.scope,
    });
  }

  patterns(params?: { tenantId?: string; scope?: string }): Promise<unknown> {
    return this.get("/v1/memory/patterns", {
      tenant_id: params?.tenantId ?? this.options.tenantId,
      scope: params?.scope ?? this.options.scope,
    });
  }

  workflows(params?: { tenantId?: string; scope?: string }): Promise<unknown> {
    return this.get("/v1/memory/workflows", {
      tenant_id: params?.tenantId ?? this.options.tenantId,
      scope: params?.scope ?? this.options.scope,
    });
  }

  kickoff(body: Record<string, unknown>): Promise<unknown> {
    return this.post("/v1/memory/kickoff/recommendation", this.withScope(body));
  }

  replayStart(body: Record<string, unknown>): Promise<unknown> {
    return this.post("/v1/replay/runs", this.withScope(body));
  }

  replayStep(body: Record<string, unknown>): Promise<unknown> {
    return this.post("/v1/replay/step", body);
  }

  replayComplete(body: Record<string, unknown>): Promise<unknown> {
    return this.post("/v1/replay/complete", body);
  }

  packsImport(body: Record<string, unknown>): Promise<unknown> {
    return this.post("/v1/memory/packs/import", body);
  }

  sessions(params?: { tenantId?: string; scope?: string; limit?: number }): Promise<unknown> {
    return this.get("/v1/sessions", {
      tenant_id: params?.tenantId ?? this.options.tenantId,
      scope: params?.scope ?? this.options.scope,
      limit: params?.limit,
    });
  }

  private withScope(body: Record<string, unknown>): Record<string, unknown> {
    const tenant = body.tenant_id ?? this.options.tenantId;
    const scope = body.scope ?? this.options.scope;
    const out = { ...body };
    if (tenant !== undefined && out.tenant_id === undefined) out.tenant_id = tenant;
    if (scope !== undefined && out.scope === undefined) out.scope = scope;
    return out;
  }

  private resolve(path: string, query?: Record<string, string | number | undefined | null>): string {
    const base = this.options.baseUrl ?? "";
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    let url = `${base}${cleanPath}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        params.set(k, String(v));
      }
      const qs = params.toString();
      if (qs) url = `${url}?${qs}`;
    }
    return url;
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const fetchImpl = this.options.fetch ?? globalThis.fetch;
    if (!fetchImpl) {
      throw new Error("fetch is not available in this environment");
    }
    const controller = this.options.timeoutMs ? new AbortController() : null;
    const timer = controller
      ? setTimeout(() => controller.abort(), this.options.timeoutMs)
      : null;
    try {
      const response = await fetchImpl(url, {
        ...init,
        headers: {
          accept: "application/json",
          ...(this.options.headers ?? {}),
          ...(init.headers ?? {}),
        },
        signal: controller?.signal ?? init.signal,
      });
      const text = await response.text();
      let parsed: unknown = text;
      if (text.length > 0) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }
      } else {
        parsed = null;
      }
      if (!response.ok) {
        const message = extractErrorMessage(parsed, response.status);
        throw new AionisHttpError(message, response.status, url, parsed);
      }
      return parsed as T;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

function extractErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const err = (body as Record<string, unknown>).error;
    if (typeof err === "string") return `HTTP ${status}: ${err}`;
    const msg = (body as Record<string, unknown>).message;
    if (typeof msg === "string") return `HTTP ${status}: ${msg}`;
  }
  if (typeof body === "string" && body.length > 0 && body.length < 240) {
    return `HTTP ${status}: ${body}`;
  }
  return `HTTP ${status}`;
}

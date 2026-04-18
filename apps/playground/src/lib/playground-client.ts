/**
 * Playground-side Aionis client.
 *
 * This is intentionally leaner than `apps/inspector/src/lib/aionis-client.ts`:
 *
 * 1. no in-memory request log / Live-tab wiring
 * 2. no runtime-config indirection; a single `API_URL` constant, read once at
 *    module load from `VITE_AIONIS_API_URL`
 * 3. read-only: the Playground MVP only needs `/health` and
 *    `/v1/memory/kickoff/recommendation`. Seeding the shared demo scope is a
 *    host-side operation, not something the browser does.
 *
 * The Playground runs against a remote read-only Lite adapter in production.
 * In dev it falls through Vite's proxy to a local Lite at
 * `http://127.0.0.1:3001`.
 */

const RAW_API_URL = (import.meta.env.VITE_AIONIS_API_URL as string | undefined)?.trim() ?? "";
// Empty string means same-origin; Vite's dev server proxies /v1 and /health to
// the local Lite when that's the case.
const API_URL = RAW_API_URL.replace(/\/$/, "");

export class AionisHttpError extends Error {
  public readonly status: number;
  public readonly route: string;
  public readonly body: unknown;

  constructor(route: string, status: number, message: string, body: unknown) {
    super(message);
    this.name = "AionisHttpError";
    this.route = route;
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  method: "GET" | "POST",
  route: string,
  body?: unknown,
): Promise<T> {
  const url = `${API_URL}${route}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new AionisHttpError(route, 0, message, null);
  }
  const text = await res.text();
  let parsed: unknown = null;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!res.ok) {
    const message = extractErrorMessage(parsed) ?? res.statusText;
    throw new AionisHttpError(route, res.status, message, parsed);
  }
  return parsed as T;
}

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (typeof record.message === "string") return record.message;
  return null;
}

export interface KickoffRecommendationResponse {
  summary_version?: string;
  tenant_id?: string;
  scope?: string;
  query_text?: string;
  kickoff_recommendation?: {
    source_kind?: string;
    history_applied?: boolean;
    selected_tool?: string | null;
    file_path?: string | null;
    next_action?: string | null;
    [key: string]: unknown;
  } | null;
  tool_selection?: Record<string, unknown> | null;
  workflow_summary?: Record<string, unknown> | null;
  recall_summary?: Record<string, unknown> | null;
  rationale?: unknown;
  [key: string]: unknown;
}

export interface HealthResponse {
  ok?: boolean;
  status?: string;
  edition?: string;
  mode?: string;
  [key: string]: unknown;
}

export const playgroundClient = {
  apiUrl: API_URL || "(same-origin, via dev proxy)",

  health: () => request<HealthResponse>("GET", "/health"),

  kickoffRecommendation: (payload: {
    tenant_id: string;
    scope: string;
    query_text: string;
    candidates: string[];
    context?: Record<string, unknown>;
  }) =>
    request<KickoffRecommendationResponse>(
      "POST",
      "/v1/memory/kickoff/recommendation",
      { context: {}, ...payload },
    ),
};

export type PlaygroundClient = typeof playgroundClient;

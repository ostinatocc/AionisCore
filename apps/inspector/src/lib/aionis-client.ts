import { resolveUrl, type RuntimeConfig } from "./runtime-config";

export class AionisHttpError extends Error {
  public readonly status: number;
  public readonly body: unknown;
  public readonly route: string;

  constructor(route: string, status: number, message: string, body: unknown) {
    super(message);
    this.name = "AionisHttpError";
    this.route = route;
    this.status = status;
    this.body = body;
  }
}

export interface RequestLogEntry {
  id: string;
  route: string;
  method: "GET" | "POST";
  status: number | null;
  startedAt: number;
  durationMs: number | null;
  errorMessage: string | null;
  summary: string | null;
}

type RequestLogListener = (log: readonly RequestLogEntry[]) => void;

const MAX_LOG_ENTRIES = 50;

class RequestLog {
  private entries: RequestLogEntry[] = [];
  private listeners = new Set<RequestLogListener>();

  snapshot(): readonly RequestLogEntry[] {
    return this.entries;
  }

  subscribe(listener: RequestLogListener): () => void {
    this.listeners.add(listener);
    listener(this.entries);
    return () => {
      this.listeners.delete(listener);
    };
  }

  append(entry: RequestLogEntry): void {
    this.entries = [entry, ...this.entries].slice(0, MAX_LOG_ENTRIES);
    for (const listener of this.listeners) listener(this.entries);
  }
}

export const requestLog = new RequestLog();

function nextId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function describeResponse(body: unknown): string | null {
  if (body === null || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (Array.isArray(record.items)) return `${record.items.length} items`;
  if (Array.isArray(record.events)) return `${record.events.length} events`;
  if (Array.isArray(record.nodes)) return `${record.nodes.length} nodes`;
  if (Array.isArray(record.recommended_workflows)) {
    const wf = record.recommended_workflows.length;
    const trusted = Array.isArray(record.trusted_patterns) ? record.trusted_patterns.length : 0;
    const candidates = Array.isArray(record.candidate_patterns)
      ? record.candidate_patterns.length
      : 0;
    return `${wf} workflows · ${trusted} trusted · ${candidates} candidates`;
  }
  if (record.kickoff_recommendation && typeof record.kickoff_recommendation === "object") {
    const k = record.kickoff_recommendation as Record<string, unknown>;
    if (typeof k.selected_tool === "string") return `kickoff tool=${k.selected_tool}`;
  }
  if (typeof record.status === "string") return `status=${record.status}`;
  if (typeof record.ok === "boolean") return `ok=${record.ok}`;
  return null;
}

async function request<T>(
  config: RuntimeConfig,
  method: "GET" | "POST",
  route: string,
  body?: unknown,
): Promise<T> {
  const id = nextId();
  const startedAt = Date.now();
  const entry: RequestLogEntry = {
    id,
    route,
    method,
    status: null,
    startedAt,
    durationMs: null,
    errorMessage: null,
    summary: null,
  };

  try {
    const res = await fetch(resolveUrl(config, route), {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const durationMs = Date.now() - startedAt;
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
      requestLog.append({
        ...entry,
        status: res.status,
        durationMs,
        errorMessage: message,
      });
      throw new AionisHttpError(route, res.status, message, parsed);
    }

    requestLog.append({
      ...entry,
      status: res.status,
      durationMs,
      summary: describeResponse(parsed),
    });
    return parsed as T;
  } catch (err) {
    if (err instanceof AionisHttpError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    requestLog.append({
      ...entry,
      status: null,
      durationMs: Date.now() - startedAt,
      errorMessage: message,
    });
    throw new AionisHttpError(route, 0, message, null);
  }
}

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const issues = (record.details as { issues?: unknown })?.issues ?? record.issues;
  if (Array.isArray(issues) && issues.length > 0) {
    const first = issues[0] as Record<string, unknown>;
    const path = typeof first.path === "string" ? first.path : "";
    const message = typeof first.message === "string" ? first.message : "";
    if (path || message) return `${record.message ?? "invalid"} (${path}: ${message})`;
  }
  if (typeof record.message === "string") return record.message;
  return null;
}

export interface HealthResponse {
  ok?: boolean;
  status?: string;
  edition?: string;
  mode?: string;
  uptime_ms?: number;
  storage?: { backend?: string; path?: string };
  sandbox?: { profile?: string; state?: string };
  runtime?: { edition?: string; mode?: string };
  lite?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Subset of NodeDTO fields Inspector relies on. Meta fields only appear when
 * the caller passes include_meta: true.
 */
export interface MemoryFindNode {
  uri?: string;
  id?: string;
  client_id?: string | null;
  type?: string;
  title?: string | null;
  text_summary?: string | null;
  tier?: string;
  memory_lane?: string;
  created_at?: string;
  updated_at?: string;
  last_activated?: string | null;
  salience?: number | null;
  importance?: number | null;
  confidence?: number | null;
  producer_agent_id?: string | null;
  slots_preview?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MemoryFindSummary {
  returned_nodes?: number;
  has_more?: boolean;
  type_counts?: Record<string, number>;
  tier_counts?: Record<string, number>;
  memory_lane_counts?: Record<string, number>;
  [key: string]: unknown;
}

export interface MemoryFindResponse {
  tenant_id?: string;
  scope?: string;
  mode?: string;
  nodes?: MemoryFindNode[];
  page?: {
    limit?: number;
    offset?: number;
    returned?: number;
    has_more?: boolean;
  };
  find_summary?: MemoryFindSummary;
  [key: string]: unknown;
}

/** Shared shape for PlannerPacketEntry items coming back from execution/introspect. */
export interface ExecutionPacketItem {
  anchor_id?: string;
  uri?: string;
  type?: string;
  title?: string | null;
  summary?: string | null;
  anchor_level?: string;
  source_kind?: string;
  promotion_origin?: string;
  promotion_state?: string;
  task_family?: string | null;
  observed_count?: number;
  required_observations?: number;
  promotion_ready?: boolean;
  last_transition?: string;
  last_transition_at?: string;
  maintenance_state?: string;
  offline_priority?: string;
  tool_set?: string[];
  task_signature?: string;
  workflow_signature?: string;
  file_path?: string | null;
  target_files?: string[];
  next_action?: string | null;
  confidence?: number;
  [key: string]: unknown;
}

export interface LifecycleSummary {
  candidate_count?: number;
  trusted_count?: number;
  stable_count?: number;
  contested_count?: number;
  promotion_ready_count?: number;
  near_promotion_count?: number;
  counter_evidence_open_count?: number;
  replay_source_count?: number;
  rehydration_ready_count?: number;
  transition_counts?: Record<string, number>;
  [key: string]: unknown;
}

export interface ExecutionIntrospectResponse {
  tenant_id?: string;
  scope?: string;
  summary_version?: string;
  inventory?: {
    raw_workflow_anchor_count?: number;
    raw_workflow_candidate_count?: number;
    suppressed_candidate_workflow_count?: number;
    continuity_projected_candidate_count?: number;
    continuity_auto_promoted_workflow_count?: number;
    raw_pattern_anchor_count?: number;
  };
  recommended_workflows?: ExecutionPacketItem[];
  candidate_workflows?: ExecutionPacketItem[];
  rehydration_candidates?: ExecutionPacketItem[];
  candidate_patterns?: ExecutionPacketItem[];
  trusted_patterns?: ExecutionPacketItem[];
  contested_patterns?: ExecutionPacketItem[];
  pattern_signals?: ExecutionPacketItem[];
  workflow_signals?: ExecutionPacketItem[];
  pattern_lifecycle_summary?: LifecycleSummary;
  workflow_lifecycle_summary?: LifecycleSummary;
  pattern_maintenance_summary?: Record<string, unknown>;
  workflow_maintenance_summary?: Record<string, unknown>;
  pattern_signal_summary?: Record<string, unknown>;
  workflow_signal_summary?: Record<string, unknown>;
  action_packet_summary?: Record<string, unknown>;
  continuity_projection_report?: Record<string, unknown>;
  execution_summary?: Record<string, unknown>;
  demo_surface?: Record<string, unknown>;
  [key: string]: unknown;
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

export interface ExperienceIntelligenceResponse extends KickoffRecommendationResponse {}

export function createClient(config: RuntimeConfig) {
  return {
    health: () => request<HealthResponse>(config, "GET", "/health"),

    memoryFind: (payload: {
      tenant_id?: string;
      scope?: string;
      limit?: number;
      type?: string;
      title_contains?: string;
      text_contains?: string;
      memory_lane?: "private" | "shared";
      include_meta?: boolean;
      include_slots_preview?: boolean;
      offset?: number;
      // Direct-lookup by node id. Used by the Patterns → Memory jump to fetch
      // nodes that fall outside the default page.
      id?: string;
    }) => request<MemoryFindResponse>(config, "POST", "/v1/memory/find", payload),

    executionIntrospect: (payload: {
      tenant_id?: string;
      scope?: string;
      consumer_agent_id?: string;
      consumer_team_id?: string;
      limit?: number;
    }) =>
      request<ExecutionIntrospectResponse>(
        config,
        "POST",
        "/v1/memory/execution/introspect",
        payload,
      ),

    kickoffRecommendation: (payload: {
      tenant_id?: string;
      scope?: string;
      query_text: string;
      candidates: string[];
      context?: Record<string, unknown>;
      strict?: boolean;
      reorder_candidates?: boolean;
    }) =>
      request<KickoffRecommendationResponse>(
        config,
        "POST",
        "/v1/memory/kickoff/recommendation",
        { context: {}, ...payload },
      ),

    experienceIntelligence: (payload: {
      tenant_id?: string;
      scope?: string;
      query_text: string;
      candidates: string[];
      context?: Record<string, unknown>;
    }) =>
      request<ExperienceIntelligenceResponse>(
        config,
        "POST",
        "/v1/memory/experience/intelligence",
        { context: {}, ...payload },
      ),

    planningContext: (payload: {
      tenant_id?: string;
      scope?: string;
      query_text: string;
      context?: Record<string, unknown>;
    }) =>
      request<Record<string, unknown>>(config, "POST", "/v1/memory/planning/context", {
        context: {},
        ...payload,
      }),

    toolsRunsList: (payload: { tenant_id?: string; scope?: string; limit?: number }) =>
      request<Record<string, unknown>>(config, "POST", "/v1/memory/tools/runs/list", payload),

    packsImport: (payload: Record<string, unknown>) =>
      request<Record<string, unknown>>(config, "POST", "/v1/memory/packs/import", payload),
  };
}

export type AionisClient = ReturnType<typeof createClient>;

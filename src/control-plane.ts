import type { Db } from "./db.js";
import { withClient, withTx } from "./db.js";
import { sha256Hex } from "./util/crypto.js";
import { TokenBucketLimiter } from "./util/ratelimit.js";

export type ApiKeyPrincipal = {
  tenant_id: string;
  agent_id: string | null;
  team_id: string | null;
  role: string | null;
  key_prefix: string | null;
};

export type TenantQuotaProfile = {
  tenant_id: string;
  recall_rps: number;
  recall_burst: number;
  write_rps: number;
  write_burst: number;
  write_max_wait_ms: number;
  debug_embed_rps: number;
  debug_embed_burst: number;
  recall_text_embed_rps: number;
  recall_text_embed_burst: number;
  recall_text_embed_max_wait_ms: number;
  updated_at: string;
};

type TenantQuotaDefaults = Omit<TenantQuotaProfile, "tenant_id" | "updated_at">;

type QuotaKind = "recall" | "write" | "debug_embeddings" | "recall_text_embed";

type QuotaLimit = {
  rps: number;
  burst: number;
  max_wait_ms: number;
};

type TenantQuotaResolved = Record<QuotaKind, QuotaLimit>;

type ControlAuditEventInput = {
  actor?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  tenant_id?: string | null;
  request_id?: string | null;
  details?: Record<string, unknown>;
};

export type MemoryRequestTelemetryInput = {
  tenant_id: string;
  scope: string;
  endpoint: "write" | "recall" | "recall_text" | "planning_context" | "context_assemble";
  status_code: number;
  latency_ms: number;
  api_key_prefix?: string | null;
  request_id?: string | null;
};

export type ContextAssemblyLayerName = "facts" | "episodes" | "rules" | "decisions" | "tools" | "citations";

export type MemoryContextAssemblyLayerTelemetryInput = {
  layer_name: ContextAssemblyLayerName;
  source_count: number;
  kept_count: number;
  dropped_count: number;
  budget_chars: number;
  used_chars: number;
  max_items: number;
};

export type MemoryContextAssemblyTelemetryInput = {
  tenant_id: string;
  scope: string;
  endpoint: "planning_context" | "context_assemble";
  layered_output: boolean;
  latency_ms: number;
  request_id?: string | null;
  total_budget_chars: number;
  used_chars: number;
  remaining_chars: number;
  source_items: number;
  kept_items: number;
  dropped_items: number;
  layers_with_content: number;
  merge_trace_included: boolean;
  selection_policy_name?: string | null;
  selection_policy_source?: string | null;
  selected_memory_layers?: string[];
  trust_anchor_layers?: string[];
  requested_allowed_layers?: string[];
  layers: MemoryContextAssemblyLayerTelemetryInput[];
};

export type ApiKeyPrincipalResolver = ((rawApiKey: string) => Promise<ApiKeyPrincipal | null>) & {
  invalidate: (rawApiKey: string) => void;
  clear: () => void;
};

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

function asJson(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return v as Record<string, unknown>;
}

function asStringArray(v: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(v)) return fallback;
  const out: string[] = [];
  for (const item of v) {
    const s = trimOrNull(item);
    if (!s) continue;
    out.push(s);
  }
  return out.length > 0 ? out : fallback;
}

function f64(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function i32(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function boundedInt(input: number, max = 10_000_000): number {
  if (!Number.isFinite(input)) return 0;
  return Math.max(0, Math.min(max, Math.trunc(input)));
}

function boundedMs(input: number): number {
  if (!Number.isFinite(input)) return 0;
  return Math.max(0, input);
}

async function getTenantQuotaProfile(db: Db, tenantIdRaw: string): Promise<TenantQuotaProfile | null> {
  const tenantId = trimOrNull(tenantIdRaw);
  if (!tenantId) return null;
  return await withClient(db, async (client) => {
    const q = await client.query("SELECT * FROM control_tenant_quotas WHERE tenant_id = $1 LIMIT 1", [tenantId]);
    return (q.rows[0] as TenantQuotaProfile | undefined) ?? null;
  });
}

export function createApiKeyPrincipalResolver(
  db: Db,
  opts?: { ttl_ms?: number; negative_ttl_ms?: number; max_entries?: number; cache_positive?: boolean },
): ApiKeyPrincipalResolver {
  const cachePositive = opts?.cache_positive === true;
  const ttlMs = cachePositive ? Math.max(5_000, Math.trunc(opts?.ttl_ms ?? 60_000)) : 0;
  const negativeTtlMs = Math.max(1_000, Math.trunc(opts?.negative_ttl_ms ?? 10_000));
  const maxEntries = Math.max(1, Math.trunc(opts?.max_entries ?? 20_000));
  const cache = new Map<string, { expires_at: number; principal: ApiKeyPrincipal | null }>();

  const cacheGet = (hash: string, now: number): ApiKeyPrincipal | null | undefined => {
    const hit = cache.get(hash);
    if (!hit) return undefined;
    if (hit.expires_at <= now) {
      cache.delete(hash);
      return undefined;
    }
    cache.delete(hash);
    cache.set(hash, hit);
    return hit.principal;
  };

  const cacheSet = (hash: string, principal: ApiKeyPrincipal | null, ttlMsLocal: number, now: number): void => {
    if (cache.has(hash)) cache.delete(hash);
    cache.set(hash, { expires_at: now + ttlMsLocal, principal });
    while (cache.size > maxEntries) {
      const oldest = cache.keys().next();
      if (oldest.done) break;
      cache.delete(oldest.value);
    }
  };

  const resolver = (async (rawApiKey: string): Promise<ApiKeyPrincipal | null> => {
    const key = trimOrNull(rawApiKey);
    if (!key) return null;
    const hash = sha256Hex(key);
    const now = Date.now();
    const cached = cacheGet(hash, now);
    if (cached !== undefined) return cached;

    try {
      const row = await withClient(db, async (client) => {
        const q = await client.query(
          `
          SELECT k.tenant_id, k.agent_id, k.team_id, k.role, k.key_prefix
          FROM control_api_keys k
          JOIN control_tenants t ON t.tenant_id = k.tenant_id
          WHERE k.key_hash = $1
            AND k.status = 'active'
            AND t.status = 'active'
          LIMIT 1
          `,
          [hash],
        );
        return q.rows[0] ?? null;
      });

      const principal: ApiKeyPrincipal | null = row
        ? {
            tenant_id: String(row.tenant_id),
            agent_id: trimOrNull(row.agent_id),
            team_id: trimOrNull(row.team_id),
            role: trimOrNull(row.role),
            key_prefix: trimOrNull(row.key_prefix),
          }
        : null;

      if (principal) {
        if (cachePositive) cacheSet(hash, principal, ttlMs, now);
      } else {
        cacheSet(hash, null, negativeTtlMs, now);
      }
      return principal;
    } catch (err: any) {
      if (String(err?.code ?? "") === "42P01") return null;
      throw err;
    }
  }) as ApiKeyPrincipalResolver;

  resolver.invalidate = (rawApiKey: string): void => {
    const key = trimOrNull(rawApiKey);
    if (!key) return;
    cache.delete(sha256Hex(key));
  };
  resolver.clear = () => cache.clear();
  return resolver;
}

export async function recordControlAuditEvent(db: Db, input: ControlAuditEventInput): Promise<void> {
  const action = trimOrNull(input.action);
  const resourceType = trimOrNull(input.resource_type);
  if (!action || !resourceType) return;
  const actor = trimOrNull(input.actor) ?? "admin_token";
  const resourceId = trimOrNull(input.resource_id);
  const tenantId = trimOrNull(input.tenant_id);
  const requestId = trimOrNull(input.request_id);
  const details = asJson(input.details);
  try {
    await withClient(db, async (client) => {
      await client.query(
        `
        INSERT INTO control_audit_events (
          actor, action, resource_type, resource_id, tenant_id, request_id, details
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
        `,
        [actor, action, resourceType, resourceId, tenantId, requestId, JSON.stringify(details)],
      );
    });
  } catch (err: any) {
    if (String(err?.code ?? "") === "42P01") return;
    throw err;
  }
}

export async function recordMemoryRequestTelemetry(db: Db, input: MemoryRequestTelemetryInput): Promise<void> {
  const tenantId = trimOrNull(input.tenant_id);
  const scope = trimOrNull(input.scope);
  const endpoint = trimOrNull(input.endpoint);
  if (!tenantId || !scope || !endpoint) return;
  const statusCode = Number.isFinite(input.status_code) ? Math.trunc(input.status_code) : 0;
  const latencyMs = Number.isFinite(input.latency_ms) ? Math.max(0, input.latency_ms) : 0;
  const apiKeyPrefix = trimOrNull(input.api_key_prefix);
  const requestId = trimOrNull(input.request_id);
  try {
    await withClient(db, async (client) => {
      await client.query(
        `
        INSERT INTO memory_request_telemetry (
          tenant_id, scope, endpoint, status_code, latency_ms, api_key_prefix, request_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [tenantId, scope, endpoint, statusCode, latencyMs, apiKeyPrefix, requestId],
      );
    });
  } catch (err: any) {
    const code = String(err?.code ?? "");
    if (code === "42P01") return;
    if (code === "23514" && (endpoint === "planning_context" || endpoint === "context_assemble")) return;
    throw err;
  }
}

export async function recordMemoryContextAssemblyTelemetry(
  db: Db,
  input: MemoryContextAssemblyTelemetryInput,
): Promise<void> {
  const tenantId = trimOrNull(input.tenant_id);
  const scope = trimOrNull(input.scope);
  const endpoint = trimOrNull(input.endpoint);
  if (!tenantId || !scope) return;
  if (endpoint !== "planning_context" && endpoint !== "context_assemble") return;

  const requestId = trimOrNull(input.request_id);
  const layeredOutput = input.layered_output === true;
  const totalBudgetChars = boundedInt(input.total_budget_chars);
  const usedChars = boundedInt(input.used_chars);
  const remainingChars = boundedInt(input.remaining_chars);
  const sourceItems = boundedInt(input.source_items);
  const keptItems = boundedInt(input.kept_items);
  const droppedItems = boundedInt(input.dropped_items);
  const layersWithContent = boundedInt(input.layers_with_content, 10_000);
  const mergeTraceIncluded = input.merge_trace_included === true;
  const latencyMs = boundedMs(input.latency_ms);
  const selectionPolicyName = trimOrNull(input.selection_policy_name);
  const selectionPolicySourceRaw = trimOrNull(input.selection_policy_source);
  const selectionPolicySource =
    selectionPolicySourceRaw === "endpoint_default" || selectionPolicySourceRaw === "request_override"
      ? selectionPolicySourceRaw
      : null;
  const selectedMemoryLayers = asStringArray(input.selected_memory_layers, []).filter((layer) =>
    ["L0", "L1", "L2", "L3", "L4", "L5"].includes(layer),
  );
  const trustAnchorLayers = asStringArray(input.trust_anchor_layers, []).filter((layer) =>
    ["L0", "L1", "L2", "L3", "L4", "L5"].includes(layer),
  );
  const requestedAllowedLayers = asStringArray(input.requested_allowed_layers, []).filter((layer) =>
    ["L0", "L1", "L2", "L3", "L4", "L5"].includes(layer),
  );
  const selectedMemoryLayersJson = JSON.stringify(selectedMemoryLayers);
  const trustAnchorLayersJson = JSON.stringify(trustAnchorLayers);
  const requestedAllowedLayersJson = JSON.stringify(requestedAllowedLayers);
  const headInsertSavepoint = "memory_context_assembly_head_insert_sp";

  const layers = (Array.isArray(input.layers) ? input.layers : [])
    .map((layer) => ({
      layer_name: layer.layer_name,
      source_count: boundedInt(layer.source_count),
      kept_count: boundedInt(layer.kept_count),
      dropped_count: boundedInt(layer.dropped_count),
      budget_chars: boundedInt(layer.budget_chars),
      used_chars: boundedInt(layer.used_chars),
      max_items: boundedInt(layer.max_items, 10_000),
    }))
    .filter((layer) => ["facts", "episodes", "rules", "decisions", "tools", "citations"].includes(layer.layer_name));

  try {
    await withTx(db, async (client) => {
      const attempts: Array<{ sql: string; params: unknown[] }> = [
        {
          sql: `
            INSERT INTO memory_context_assembly_telemetry (
              tenant_id, scope, endpoint, layered_output, request_id,
              total_budget_chars, used_chars, remaining_chars,
              source_items, kept_items, dropped_items, layers_with_content,
              merge_trace_included, selection_policy_name, selection_policy_source,
              selected_memory_layers_json, trust_anchor_layers_json, requested_allowed_layers_json,
              latency_ms
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING id
          `,
          params: [
            tenantId, scope, endpoint, layeredOutput, requestId,
            totalBudgetChars, usedChars, remainingChars,
            sourceItems, keptItems, droppedItems, layersWithContent,
            mergeTraceIncluded, selectionPolicyName, selectionPolicySource,
            selectedMemoryLayersJson, trustAnchorLayersJson, requestedAllowedLayersJson,
            latencyMs,
          ],
        },
        {
          sql: `
            INSERT INTO memory_context_assembly_telemetry (
              tenant_id, scope, endpoint, layered_output, request_id,
              total_budget_chars, used_chars, remaining_chars,
              source_items, kept_items, dropped_items, layers_with_content,
              merge_trace_included, latency_ms
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id
          `,
          params: [
            tenantId, scope, endpoint, layeredOutput, requestId,
            totalBudgetChars, usedChars, remainingChars,
            sourceItems, keptItems, droppedItems, layersWithContent,
            mergeTraceIncluded, latencyMs,
          ],
        },
        {
          sql: `
            INSERT INTO memory_context_assembly_telemetry (
              tenant_id, scope, endpoint, request_id,
              total_budget_chars, used_chars, remaining_chars,
              source_items, kept_items, dropped_items, layers_with_content,
              merge_trace_included, latency_ms
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
          `,
          params: [
            tenantId, scope, endpoint, requestId,
            totalBudgetChars, usedChars, remainingChars,
            sourceItems, keptItems, droppedItems, layersWithContent,
            mergeTraceIncluded, latencyMs,
          ],
        },
      ];

      let telemetryId = 0;
      let lastError: unknown = null;
      for (const attempt of attempts) {
        await client.query(`SAVEPOINT ${headInsertSavepoint}`);
        try {
          const q = await client.query(attempt.sql, attempt.params);
          await client.query(`RELEASE SAVEPOINT ${headInsertSavepoint}`);
          telemetryId = Number(q.rows[0]?.id ?? 0);
          lastError = null;
          break;
        } catch (err: any) {
          await client.query(`ROLLBACK TO SAVEPOINT ${headInsertSavepoint}`);
          await client.query(`RELEASE SAVEPOINT ${headInsertSavepoint}`);
          if (String(err?.code ?? "") !== "42703") throw err;
          lastError = err;
        }
      }

      if (!Number.isFinite(telemetryId) || telemetryId <= 0) {
        if (lastError) throw lastError;
        return;
      }

      for (const layer of layers) {
        await client.query(
          `
          INSERT INTO memory_context_assembly_layer_telemetry (
            telemetry_id, tenant_id, scope, endpoint, layer_name,
            source_count, kept_count, dropped_count, budget_chars, used_chars, max_items
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `,
          [
            telemetryId,
            tenantId,
            scope,
            endpoint,
            layer.layer_name,
            layer.source_count,
            layer.kept_count,
            layer.dropped_count,
            layer.budget_chars,
            layer.used_chars,
            layer.max_items,
          ],
        );
      }
    });
  } catch (err: any) {
    if (String(err?.code ?? "") === "42P01") return;
    throw err;
  }
}

export function createTenantQuotaResolver(db: Db, args: { defaults: TenantQuotaDefaults; cache_ttl_ms?: number }) {
  const defaults = args.defaults;
  const cacheTtlMs = Math.max(1_000, Math.trunc(args.cache_ttl_ms ?? 30_000));
  const cache = new Map<string, { expires_at: number; profile: TenantQuotaProfile | null }>();
  const limiterByConfig = new Map<string, TokenBucketLimiter>();

  const toResolved = (profile: TenantQuotaProfile | null): TenantQuotaResolved => {
    if (!profile) {
      return {
        recall: { rps: defaults.recall_rps, burst: defaults.recall_burst, max_wait_ms: 0 },
        write: { rps: defaults.write_rps, burst: defaults.write_burst, max_wait_ms: defaults.write_max_wait_ms },
        debug_embeddings: { rps: defaults.debug_embed_rps, burst: defaults.debug_embed_burst, max_wait_ms: 0 },
        recall_text_embed: {
          rps: defaults.recall_text_embed_rps,
          burst: defaults.recall_text_embed_burst,
          max_wait_ms: defaults.recall_text_embed_max_wait_ms,
        },
      };
    }
    return {
      recall: {
        rps: f64(profile.recall_rps, defaults.recall_rps),
        burst: i32(profile.recall_burst, defaults.recall_burst),
        max_wait_ms: 0,
      },
      write: {
        rps: f64(profile.write_rps, defaults.write_rps),
        burst: i32(profile.write_burst, defaults.write_burst),
        max_wait_ms: i32(profile.write_max_wait_ms, defaults.write_max_wait_ms),
      },
      debug_embeddings: {
        rps: f64(profile.debug_embed_rps, defaults.debug_embed_rps),
        burst: i32(profile.debug_embed_burst, defaults.debug_embed_burst),
        max_wait_ms: 0,
      },
      recall_text_embed: {
        rps: f64(profile.recall_text_embed_rps, defaults.recall_text_embed_rps),
        burst: i32(profile.recall_text_embed_burst, defaults.recall_text_embed_burst),
        max_wait_ms: i32(profile.recall_text_embed_max_wait_ms, defaults.recall_text_embed_max_wait_ms),
      },
    };
  };

  const fetchProfile = async (tenantId: string): Promise<TenantQuotaProfile | null> => {
    const now = Date.now();
    const cached = cache.get(tenantId);
    if (cached && cached.expires_at > now) return cached.profile;
    try {
      const profile = await getTenantQuotaProfile(db, tenantId);
      cache.set(tenantId, { expires_at: now + cacheTtlMs, profile });
      return profile;
    } catch (err: any) {
      if (String(err?.code ?? "") === "42P01") {
        cache.set(tenantId, { expires_at: now + cacheTtlMs, profile: null });
        return null;
      }
      throw err;
    }
  };

  const getLimiter = (tenantId: string, kind: QuotaKind, cfg: QuotaLimit) => {
    const key = `${tenantId}:${kind}:${cfg.rps}:${cfg.burst}`;
    let limiter = limiterByConfig.get(key);
    if (!limiter) {
      limiter = new TokenBucketLimiter({
        rate_per_sec: cfg.rps,
        burst: cfg.burst,
        ttl_ms: 10 * 60 * 1000,
        sweep_every_n: 300,
      });
      limiterByConfig.set(key, limiter);
      if (limiterByConfig.size > 10_000) limiterByConfig.clear();
    }
    return limiter;
  };

  const invalidate = (tenantId?: string) => {
    if (tenantId) cache.delete(tenantId);
    else cache.clear();
  };

  return {
    async resolve(tenantIdRaw: string): Promise<TenantQuotaResolved> {
      const tenantId = trimOrNull(tenantIdRaw) ?? "default";
      return toResolved(await fetchProfile(tenantId));
    },
    limiterFor(tenantIdRaw: string, kind: QuotaKind, cfg: QuotaLimit) {
      const tenantId = trimOrNull(tenantIdRaw) ?? "default";
      return getLimiter(tenantId, kind, cfg);
    },
    invalidate,
    defaults,
    nowIso,
  };
}

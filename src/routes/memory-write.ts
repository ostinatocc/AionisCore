import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type pg from "pg";
import type { Env } from "../config.js";
import type { InMemoryExecutionStateStore } from "../execution/state-store.js";
import type { EmbeddingProvider } from "../embeddings/types.js";
import { ExecutionStateV1Schema } from "../execution/types.js";
import { ExecutionStateTransitionV1Schema } from "../execution/transitions.js";
import { createEmbeddingSurfacePolicy, type EmbeddingSurfacePolicy } from "../embeddings/surface-policy.js";
import type { TopicClusterParams, TopicClusterResult } from "../jobs/topicClusterLib.js";
import { applyMemoryWrite, computeEffectiveWritePolicy, prepareMemoryWrite } from "../memory/write.js";
import type { WriteStoreAccess } from "../store/write-access.js";
import type { AuthPrincipal } from "../util/auth.js";
import { HttpError } from "../util/http.js";
import type { InflightGateToken } from "../util/inflight_gate.js";

type StoreLike = {
  withTx: <T>(fn: (client: pg.PoolClient) => Promise<T>) => Promise<T>;
};

type LiteWriteStoreLike = WriteStoreAccess & {
  withTx: <T>(fn: () => Promise<T>) => Promise<T>;
  setNodeEmbeddingReady: (args: {
    scope: string;
    id: string;
    embedding: number[];
    embeddingModel: string;
  }) => Promise<void>;
  setNodeEmbeddingFailed: (args: {
    scope: string;
    id: string;
    error: string;
  }) => Promise<void>;
  close?: () => Promise<void>;
  healthSnapshot?: () => unknown;
};

type MemoryWriteRequest = FastifyRequest<{ Body: unknown }>;

type PreparedWriteLike = Awaited<ReturnType<typeof prepareMemoryWrite>>;
type PreparedWriteRouteState = PreparedWriteLike & {
  trigger_topic_cluster?: boolean;
  topic_cluster_async?: boolean;
};

type WriteResultLike = Awaited<ReturnType<typeof applyMemoryWrite>>;
type EffectiveWritePolicyLike = ReturnType<typeof computeEffectiveWritePolicy>;
type WriteWarningLike = { code: string; message: string; details?: Record<string, unknown> };

type EmbeddedRuntimeLike = {
  applyWrite: (prepared: PreparedWriteLike, out: WriteResultLike) => Promise<void>;
};

function isEnqueuedTopicCluster(result: WriteResultLike["topic_cluster"]): result is { enqueued: true } {
  return !!result && "enqueued" in result && result.enqueued === true;
}

function resolveWriteScopeTenant(args: {
  out: WriteResultLike;
  prepared: PreparedWriteLike;
  env: Env;
}) {
  return {
    scope: args.out.scope ?? args.prepared.scope_public ?? args.env.MEMORY_SCOPE,
    tenantId: args.out.tenant_id ?? args.prepared.tenant_id ?? args.env.MEMORY_TENANT_ID,
  };
}

function readSlot(slots: Record<string, unknown>, key: string): unknown {
  return key in slots ? slots[key] : undefined;
}

function collectExecutionWriteOverlays(nodes: PreparedWriteLike["nodes"]): {
  states: Array<ReturnType<typeof ExecutionStateV1Schema.parse>>;
  transitions: Array<ReturnType<typeof ExecutionStateTransitionV1Schema.parse>>;
} {
  const states: Array<ReturnType<typeof ExecutionStateV1Schema.parse>> = [];
  const transitions: Array<ReturnType<typeof ExecutionStateTransitionV1Schema.parse>> = [];
  for (const node of nodes) {
    const slots = node.slots;
    if (!slots || typeof slots !== "object") continue;
    const executionState = readSlot(slots, "execution_state_v1");
    if (executionState !== undefined) {
      states.push(ExecutionStateV1Schema.parse(executionState));
    }
    const executionTransition = readSlot(slots, "execution_transition_v1");
    if (executionTransition !== undefined) {
      transitions.push(ExecutionStateTransitionV1Schema.parse(executionTransition));
    }
  }
  return { states, transitions };
}

async function completeLiteInlineEmbeddings(args: {
  prepared: PreparedWriteLike;
  embedder: EmbeddingProvider | null;
  liteWriteStore: LiteWriteStoreLike;
}): Promise<{
  attempted: number;
  updated: number;
  failed: number;
  error?: string;
} | null> {
  const { prepared, embedder, liteWriteStore } = args;
  if (!embedder || !prepared.auto_embed_effective) return null;

  const planned = ((prepared.nodes ?? []) as Array<{
    id: unknown;
    embedding?: unknown;
    embed_text?: unknown;
  }>)
    .filter((node) => !node.embedding && typeof node.embed_text === "string" && node.embed_text.trim().length > 0)
    .map((node) => ({
      id: String(node.id),
      text: String(node.embed_text),
    }));
  if (planned.length === 0) return null;

  const ready = await liteWriteStore.readyEmbeddingNodeIds(prepared.scope, planned.map((node) => node.id));
  const pending = planned.filter((node) => !ready.has(node.id));
  if (pending.length === 0) {
    return {
      attempted: planned.length,
      updated: 0,
      failed: 0,
    };
  }

  let vectors: number[][];
  try {
    vectors = await embedder.embed(pending.map((node) => node.text));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await liteWriteStore.withTx(async () => {
      for (const node of pending) {
        await liteWriteStore.setNodeEmbeddingFailed({
          scope: prepared.scope,
          id: node.id,
          error: message,
        });
      }
    });
    return {
      attempted: pending.length,
      updated: 0,
      failed: pending.length,
      error: message,
    };
  }
  if (vectors.length !== pending.length) {
    const message = `unexpected embedding count: expected ${pending.length}, got ${vectors.length}`;
    await liteWriteStore.withTx(async () => {
      for (const node of pending) {
        await liteWriteStore.setNodeEmbeddingFailed({
          scope: prepared.scope,
          id: node.id,
          error: message,
        });
      }
    });
    return {
      attempted: pending.length,
      updated: 0,
      failed: pending.length,
      error: message,
    };
  }

  await liteWriteStore.withTx(async () => {
    for (let i = 0; i < pending.length; i += 1) {
      await liteWriteStore.setNodeEmbeddingReady({
        scope: prepared.scope,
        id: pending[i].id,
        embedding: vectors[i] ?? [],
        embeddingModel: embedder.name,
      });
    }
  });

  return {
    attempted: pending.length,
    updated: pending.length,
    failed: 0,
  };
}

export function registerMemoryWriteRoutes(args: {
  app: FastifyInstance;
  env: Env;
  store: StoreLike;
  embedder: EmbeddingProvider | null;
  embeddingSurfacePolicy?: EmbeddingSurfacePolicy;
  embeddedRuntime: EmbeddedRuntimeLike | null;
  liteWriteStore?: LiteWriteStoreLike | null;
  writeAccessForClient: (client: pg.PoolClient) => WriteStoreAccess;
  requireMemoryPrincipal: (req: FastifyRequest) => Promise<AuthPrincipal | null>;
  withIdentityFromRequest: (
    req: FastifyRequest,
    body: unknown,
    principal: AuthPrincipal | null,
    kind: "write",
  ) => unknown;
  enforceRateLimit: (req: FastifyRequest, reply: FastifyReply, kind: "write") => Promise<void>;
  enforceTenantQuota: (req: FastifyRequest, reply: FastifyReply, kind: "write", tenantId: string) => Promise<void>;
  tenantFromBody: (body: unknown) => string;
  acquireInflightSlot: (kind: "write") => Promise<InflightGateToken>;
  runTopicClusterForEventIds: (client: pg.PoolClient, args: TopicClusterParams) => Promise<TopicClusterResult>;
  executionStateStore?: InMemoryExecutionStateStore | null;
}) {
  const {
    app,
    env,
    store,
    embedder,
    embeddingSurfacePolicy: embeddingSurfacePolicyArg,
    embeddedRuntime,
    liteWriteStore,
    writeAccessForClient,
    requireMemoryPrincipal,
    withIdentityFromRequest,
    enforceRateLimit,
    enforceTenantQuota,
    tenantFromBody,
    acquireInflightSlot,
    runTopicClusterForEventIds,
    executionStateStore,
  } = args;
  const embeddingSurfacePolicy =
    embeddingSurfacePolicyArg ?? createEmbeddingSurfacePolicy({ providerConfigured: !!embedder });
  const writeEmbedder = embeddingSurfacePolicy.providerFor("write_auto_embed", embedder);
  const topicClusterSurfaceEnabled = embeddingSurfacePolicy.isEnabled("topic_cluster");
  const resolveWritePolicy = (computedPolicy: EffectiveWritePolicyLike): EffectiveWritePolicyLike => ({
    ...computedPolicy,
    trigger_topic_cluster: computedPolicy.trigger_topic_cluster && topicClusterSurfaceEnabled,
  });
  const runCommittedMemoryWrite = async (args: {
    prepared: PreparedWriteRouteState;
    policy: EffectiveWritePolicyLike;
    liteModeActive: boolean;
  }): Promise<{ out: WriteResultLike; forcedLiteTopicClusterAsync: boolean }> => {
    const { prepared, policy, liteModeActive } = args;
    const forcedLiteTopicClusterAsync = liteModeActive && policy.trigger_topic_cluster && !policy.topic_cluster_async;
    const out = liteModeActive
      ? await (async () => {
          prepared.trigger_topic_cluster = policy.trigger_topic_cluster;
          // Lite write path cannot safely run sync clustering inside the SQLite write transaction.
          prepared.topic_cluster_async = policy.trigger_topic_cluster ? true : policy.topic_cluster_async;

          return liteWriteStore!.withTx(() => applyMemoryWrite({} as pg.PoolClient, prepared, {
            maxTextLen: env.MAX_TEXT_LEN,
            piiRedaction: env.PII_REDACTION,
            allowCrossScopeEdges: env.ALLOW_CROSS_SCOPE_EDGES,
            shadowDualWriteEnabled: env.MEMORY_SHADOW_DUAL_WRITE_ENABLED,
            shadowDualWriteStrict: env.MEMORY_SHADOW_DUAL_WRITE_STRICT,
            write_access: liteWriteStore!,
          }));
        })()
      : await store.withTx(async (client) => {
          prepared.trigger_topic_cluster = policy.trigger_topic_cluster;
          prepared.topic_cluster_async = policy.topic_cluster_async;

          const writeRes = await applyMemoryWrite(client, prepared, {
            maxTextLen: env.MAX_TEXT_LEN,
            piiRedaction: env.PII_REDACTION,
            allowCrossScopeEdges: env.ALLOW_CROSS_SCOPE_EDGES,
            shadowDualWriteEnabled: env.MEMORY_SHADOW_DUAL_WRITE_ENABLED,
            shadowDualWriteStrict: env.MEMORY_SHADOW_DUAL_WRITE_STRICT,
            write_access: writeAccessForClient(client),
          });

          if (policy.trigger_topic_cluster && !policy.topic_cluster_async) {
            const eventIds = prepared.nodes.filter((n) => n.type === "event").map((n) => n.id);
            if (eventIds.length > 0) {
              const clusterRes = await runTopicClusterForEventIds(client, {
                scope: prepared.scope,
                eventIds,
                simThreshold: env.TOPIC_SIM_THRESHOLD,
                minEventsPerTopic: env.TOPIC_MIN_EVENTS_PER_TOPIC,
                maxCandidatesPerEvent: env.TOPIC_MAX_CANDIDATES_PER_EVENT,
                maxTextLen: env.MAX_TEXT_LEN,
                piiRedaction: env.PII_REDACTION,
                strategy: env.TOPIC_CLUSTER_STRATEGY,
              });
              if (clusterRes.processed_events > 0) {
                writeRes.topic_cluster = clusterRes;
              }
            }
          }

          return writeRes;
        });
    return {
      out,
      forcedLiteTopicClusterAsync,
    };
  };
  const collectWriteWarnings = (args: {
    out: WriteResultLike;
    prepared: PreparedWriteLike;
    computedPolicy: EffectiveWritePolicyLike;
    policy: EffectiveWritePolicyLike;
    forcedLiteTopicClusterAsync: boolean;
    liteInlineEmbedding: Awaited<ReturnType<typeof completeLiteInlineEmbeddings>>;
  }): WriteWarningLike[] => {
    const { scope, tenantId } = resolveWriteScopeTenant({
      out: args.out,
      prepared: args.prepared,
      env,
    });
    const warnings: WriteWarningLike[] = [];
    if (args.forcedLiteTopicClusterAsync) {
      warnings.push({
        code: "lite_topic_cluster_forced_async",
        message: "lite edition forces topic clustering to async mode during memory write",
        details: {
          scope,
          tenant_id: tenantId,
          requested_async: false,
          applied_async: true,
        },
      });
    }
    if (args.computedPolicy.trigger_topic_cluster && !args.policy.trigger_topic_cluster) {
      warnings.push({
        code: "embedding_surface_disabled_topic_cluster",
        message: "topic clustering requested but disabled by embedding surface policy",
        details: {
          scope,
          tenant_id: tenantId,
          surface: "topic_cluster",
        },
      });
    }
    if (args.liteInlineEmbedding?.updated) {
      warnings.push({
        code: "lite_embedding_backfill_completed_inline",
        message: "lite edition completed embedding backfill inline after memory write",
        details: {
          scope,
          tenant_id: tenantId,
          updated_nodes: args.liteInlineEmbedding.updated,
        },
      });
    }
    if ((args.liteInlineEmbedding?.failed ?? 0) > 0) {
      warnings.push({
        code: "lite_embedding_backfill_inline_failed",
        message: "lite edition failed to complete inline embedding backfill; recallability may remain degraded",
        details: {
          scope,
          tenant_id: tenantId,
          failed_nodes: args.liteInlineEmbedding?.failed ?? 0,
          error: args.liteInlineEmbedding?.error ?? null,
        },
      });
    }
    if ((args.out.nodes?.length ?? 0) === 0) {
      warnings.push({
        code: "write_no_nodes",
        message: "write committed with 0 nodes; no new recallable memory was added by this request",
        details: {
          scope,
          tenant_id: tenantId,
          edge_count: args.out.edges?.length ?? 0,
        },
      });
    }
    return warnings;
  };
  const applyWriteSideEffects = async (args: {
    prepared: PreparedWriteRouteState;
    out: WriteResultLike;
    executionOverlays: ReturnType<typeof collectExecutionWriteOverlays> | null;
  }) => {
    if (executionStateStore && args.executionOverlays) {
      for (const state of args.executionOverlays.states) {
        executionStateStore.put(state);
      }
      for (const transition of args.executionOverlays.transitions) {
        executionStateStore.applyTransition(transition);
      }
    }
    if (embeddedRuntime) {
      await embeddedRuntime.applyWrite(args.prepared, args.out);
    }
  };
  const buildWriteLogPayload = (args: {
    out: WriteResultLike;
    warnings: WriteWarningLike[];
    scope: string;
    tenantId: string;
    ms: number;
  }) => ({
    scope: args.scope,
    tenant_id: args.tenantId,
    commit_id: args.out.commit_id,
    nodes: args.out.nodes?.length ?? 0,
    edges: args.out.edges?.length ?? 0,
    embedding_backfill_enqueued: !!args.out.embedding_backfill?.enqueued,
    embedding_pending_nodes: args.out.embedding_backfill?.pending_nodes ?? 0,
    topic_cluster_enqueued: isEnqueuedTopicCluster(args.out.topic_cluster),
    distillation_enabled: args.out.distillation?.enabled === true,
    distillation_sources: args.out.distillation?.sources_considered ?? 0,
    distilled_evidence_nodes: args.out.distillation?.generated_evidence_nodes ?? 0,
    distilled_fact_nodes: args.out.distillation?.generated_fact_nodes ?? 0,
    warnings: args.warnings.map((warning) => warning.code),
    ms: args.ms,
  });
  const prepareWriteRouteState = async (body: unknown) => {
    const prepared = await prepareMemoryWrite(
      body,
      env.MEMORY_SCOPE,
      env.MEMORY_TENANT_ID,
      {
        maxTextLen: env.MAX_TEXT_LEN,
        piiRedaction: env.PII_REDACTION,
        allowCrossScopeEdges: env.ALLOW_CROSS_SCOPE_EDGES,
      },
      writeEmbedder,
    );
    const preparedForRoute: PreparedWriteRouteState = prepared;
    const executionOverlays = executionStateStore ? collectExecutionWriteOverlays(preparedForRoute.nodes) : null;
    if (env.MEMORY_WRITE_REQUIRE_NODES && prepared.nodes.length === 0) {
      throw new HttpError(
        400,
        "write_nodes_required",
        "write request must include at least one node when MEMORY_WRITE_REQUIRE_NODES=true",
        {
          tenant_id: prepared.tenant_id,
          scope: prepared.scope_public,
          node_count: prepared.nodes.length,
          edge_count: prepared.edges.length,
        },
      );
    }

    const computedPolicy = computeEffectiveWritePolicy(preparedForRoute, {
      autoTopicClusterOnWrite: env.AUTO_TOPIC_CLUSTER_ON_WRITE,
      topicClusterAsyncOnWrite: env.TOPIC_CLUSTER_ASYNC_ON_WRITE,
    });

    return {
      prepared,
      preparedForRoute,
      executionOverlays,
      computedPolicy,
      policy: resolveWritePolicy(computedPolicy),
      liteModeActive: env.AIONIS_EDITION === "lite" && !!liteWriteStore,
    };
  };
  const finalizeWriteRoute = async (args: {
    req: MemoryWriteRequest;
    prepared: PreparedWriteLike;
    preparedForRoute: PreparedWriteRouteState;
    executionOverlays: ReturnType<typeof collectExecutionWriteOverlays> | null;
    out: WriteResultLike;
    computedPolicy: EffectiveWritePolicyLike;
    policy: EffectiveWritePolicyLike;
    forcedLiteTopicClusterAsync: boolean;
    liteModeActive: boolean;
    ms: number;
  }) => {
    const liteInlineEmbedding = args.liteModeActive
      ? await completeLiteInlineEmbeddings({
          prepared: args.preparedForRoute,
          embedder: writeEmbedder,
          liteWriteStore: liteWriteStore!,
        })
      : null;

    const warnings = collectWriteWarnings({
      out: args.out,
      prepared: args.prepared,
      computedPolicy: args.computedPolicy,
      policy: args.policy,
      forcedLiteTopicClusterAsync: args.forcedLiteTopicClusterAsync,
      liteInlineEmbedding,
    });
    const response = warnings.length > 0 ? { ...args.out, warnings } : args.out;

    await applyWriteSideEffects({
      prepared: args.preparedForRoute,
      out: args.out,
      executionOverlays: args.executionOverlays,
    });

    const writeContext = resolveWriteScopeTenant({
      out: args.out,
      prepared: args.prepared,
      env,
    });
    args.req.log.info(
      {
        write: buildWriteLogPayload({
          out: args.out,
          warnings,
          scope: writeContext.scope,
          tenantId: writeContext.tenantId,
          ms: args.ms,
        }),
      },
      "memory write",
    );

    return response;
  };

  app.post("/v1/memory/write", async (req: MemoryWriteRequest, reply: FastifyReply) => {
    const t0 = performance.now();
    const principal = await requireMemoryPrincipal(req);
    const body = withIdentityFromRequest(req, req.body, principal, "write");
    await enforceRateLimit(req, reply, "write");
    await enforceTenantQuota(req, reply, "write", tenantFromBody(body));
    const gate = await acquireInflightSlot("write");
    try {
      const { prepared, preparedForRoute, executionOverlays, computedPolicy, policy, liteModeActive } =
        await prepareWriteRouteState(body);
      const { out, forcedLiteTopicClusterAsync } = await runCommittedMemoryWrite({
        prepared: preparedForRoute,
        policy,
        liteModeActive,
      });
      const response = await finalizeWriteRoute({
        req,
        prepared,
        preparedForRoute,
        out,
        executionOverlays,
        computedPolicy,
        policy,
        forcedLiteTopicClusterAsync,
        liteModeActive,
        ms: performance.now() - t0,
      });
      return reply.code(200).send(response);
    } finally {
      gate.release();
    }
  });
}

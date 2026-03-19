import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type pg from "pg";
import { ReplayPlaybookDispatchRequest, ReplayPlaybookRunRequest } from "../memory/schemas.js";
import { replayPlaybookDispatch, replayPlaybookRepairReview, replayPlaybookRun } from "../memory/replay.js";
import type { AuthPrincipal } from "../util/auth.js";
import type { InflightGateToken } from "../util/inflight_gate.js";

type StoreLike = {
  withTx: <T>(fn: (client: pg.PoolClient) => Promise<T>) => Promise<T>;
  withClient: <T>(fn: (client: pg.PoolClient) => Promise<T>) => Promise<T>;
};

type ReplayGovernedRequest = FastifyRequest<{ Body: unknown }>;
type ReplayPlaybookReviewOptionsLike = Parameters<typeof replayPlaybookRepairReview>[2];
type ReplayPlaybookRunOptionsLike = Parameters<typeof replayPlaybookRun>[2];
type ReplayGovernedRequestKind =
  | "replay_playbook_repair_review"
  | "replay_playbook_run"
  | "replay_playbook_dispatch";
type ReplayGovernedRateKind = "write" | "recall";
type LiteWriteStoreLike = NonNullable<ReplayPlaybookReviewOptionsLike["writeAccess"]> & {
  withTx: <T>(fn: () => Promise<T>) => Promise<T>;
};

export function registerMemoryReplayGovernedRoutes(args: {
  app: FastifyInstance;
  env?: { AIONIS_EDITION?: string };
  store: StoreLike;
  liteWriteStore?: LiteWriteStoreLike | null;
  requireMemoryPrincipal: (req: FastifyRequest) => Promise<AuthPrincipal | null>;
  withIdentityFromRequest: (
    req: FastifyRequest,
    body: unknown,
    principal: AuthPrincipal | null,
    kind: ReplayGovernedRequestKind,
  ) => unknown;
  enforceRateLimit: (req: FastifyRequest, reply: FastifyReply, kind: ReplayGovernedRateKind) => Promise<void>;
  enforceTenantQuota: (req: FastifyRequest, reply: FastifyReply, kind: ReplayGovernedRateKind, tenantId: string) => Promise<void>;
  tenantFromBody: (body: unknown) => string;
  acquireInflightSlot: (kind: ReplayGovernedRateKind) => Promise<InflightGateToken>;
  withReplayRepairReviewDefaults: (body: unknown) => { body: Record<string, unknown>; resolution: unknown };
  buildReplayRepairReviewOptions: () => ReplayPlaybookReviewOptionsLike;
  buildReplayPlaybookRunOptions: (reply: FastifyReply, source: string) => ReplayPlaybookRunOptionsLike;
}) {
  const {
    app,
    env,
    store,
    liteWriteStore,
    requireMemoryPrincipal,
    withIdentityFromRequest,
    enforceRateLimit,
    enforceTenantQuota,
    tenantFromBody,
    acquireInflightSlot,
    withReplayRepairReviewDefaults,
    buildReplayRepairReviewOptions,
    buildReplayPlaybookRunOptions,
  } = args;
  const liteModeActive = env?.AIONIS_EDITION === "lite" && !!liteWriteStore;
  const executeGovernedWrite = <TResult>(
    body: unknown,
    operation: (client: pg.PoolClient, requestBody: unknown) => Promise<TResult>,
  ) =>
    liteModeActive
      ? liteWriteStore.withTx(() => operation({} as pg.PoolClient, body))
      : store.withTx((client) => operation(client, body));

  const executeGovernedRead = <TResult>(
    body: unknown,
    operation: (client: pg.PoolClient, requestBody: unknown) => Promise<TResult>,
  ) => store.withClient((client) => operation(client, body));

  const resolveReplayPlaybookRunRateKind = (body: unknown): ReplayGovernedRateKind => {
    const parsedForMode = ReplayPlaybookRunRequest.safeParse(body);
    const replayMode = parsedForMode.success ? parsedForMode.data.mode : "simulate";
    const prefersDeterministicExecution =
      parsedForMode.success
      && replayMode === "simulate"
      && parsedForMode.data.deterministic_gate?.enabled !== false
      && parsedForMode.data.deterministic_gate?.prefer_deterministic_execution !== false;
    return replayMode === "simulate" && !prefersDeterministicExecution ? "recall" : "write";
  };

  const resolveReplayPlaybookDispatchRateKind = (body: unknown): ReplayGovernedRateKind => {
    const parsed = ReplayPlaybookDispatchRequest.safeParse(body);
    const deterministicPossible =
      parsed.success
      && parsed.data.deterministic_gate?.enabled !== false
      && parsed.data.deterministic_gate?.prefer_deterministic_execution !== false;
    const executeFallback = parsed.success ? parsed.data.execute_fallback !== false : true;
    return deterministicPossible || executeFallback ? "write" : "recall";
  };

  const runGovernedRoute = async <TResult>(args: {
    req: ReplayGovernedRequest;
    reply: FastifyReply;
    requestKind: ReplayGovernedRequestKind;
    rateKind: ReplayGovernedRateKind;
    bodyFactory?: (body: unknown) => unknown;
    execute: (body: unknown) => Promise<TResult>;
  }): Promise<TResult> => {
    const { req, reply, requestKind, rateKind, bodyFactory, execute } = args;
    const principal = await requireMemoryPrincipal(req);
    const identifiedBody = withIdentityFromRequest(req, req.body, principal, requestKind);
    const body = bodyFactory ? bodyFactory(identifiedBody) : identifiedBody;
    await enforceRateLimit(req, reply, rateKind);
    await enforceTenantQuota(req, reply, rateKind, tenantFromBody(body));
    const gate = await acquireInflightSlot(rateKind);
    try {
      return await execute(body);
    } finally {
      gate.release();
    }
  };

  app.post("/v1/memory/replay/playbooks/repair/review", async (req: ReplayGovernedRequest, reply: FastifyReply) => {
    const defaulted = withReplayRepairReviewDefaults(
      withIdentityFromRequest(req, req.body, await requireMemoryPrincipal(req), "replay_playbook_repair_review"),
    );
    const out = await runGovernedRoute({
      req,
      reply,
      requestKind: "replay_playbook_repair_review",
      rateKind: "write",
      bodyFactory: () => {
        const body = defaulted.body;
        const metadata =
          body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
            ? { ...(body.metadata as Record<string, unknown>) }
            : {};
        body.metadata = {
          ...metadata,
          auto_promote_policy_resolution: defaulted.resolution,
        };
        return body;
      },
      execute: (body) => {
        const reviewOptions = buildReplayRepairReviewOptions();
        if (liteModeActive) {
          reviewOptions.writeAccess = liteWriteStore;
        }
        return executeGovernedWrite(body, (client, requestBody) =>
          replayPlaybookRepairReview(client, requestBody, reviewOptions),
        );
      },
    });
    if (out && typeof out === "object" && !Array.isArray(out)) {
      (out as Record<string, unknown>).auto_promote_policy_resolution = defaulted.resolution;
    }
    return reply.code(200).send(out);
  });

  app.post("/v1/memory/replay/playbooks/run", async (req: ReplayGovernedRequest, reply: FastifyReply) => {
    const principal = await requireMemoryPrincipal(req);
    const body = withIdentityFromRequest(req, req.body, principal, "replay_playbook_run");
    const rateKind = resolveReplayPlaybookRunRateKind(body);
    const out = await runGovernedRoute({
      req,
      reply,
      requestKind: "replay_playbook_run",
      rateKind,
      execute: (requestBody) => {
        const runOptions = buildReplayPlaybookRunOptions(reply, "replay_playbook_run");
        if (liteModeActive && runOptions.writeOptions) {
          runOptions.writeOptions.writeAccess = liteWriteStore;
        }
        return executeGovernedRead(requestBody, (client, resolvedBody) => replayPlaybookRun(client, resolvedBody, runOptions));
      },
    });
    return reply.code(200).send(out);
  });

  app.post("/v1/memory/replay/playbooks/dispatch", async (req: ReplayGovernedRequest, reply: FastifyReply) => {
    const principal = await requireMemoryPrincipal(req);
    const body = withIdentityFromRequest(req, req.body, principal, "replay_playbook_dispatch");
    const rateKind = resolveReplayPlaybookDispatchRateKind(body);
    const out = await runGovernedRoute({
      req,
      reply,
      requestKind: "replay_playbook_dispatch",
      rateKind,
      execute: (requestBody) => {
        const runOptions = buildReplayPlaybookRunOptions(reply, "replay_playbook_dispatch");
        if (liteModeActive && runOptions.writeOptions) {
          runOptions.writeOptions.writeAccess = liteWriteStore;
        }
        return executeGovernedRead(requestBody, (client, resolvedBody) =>
          replayPlaybookDispatch(client, resolvedBody, runOptions),
        );
      },
    });
    return reply.code(200).send(out);
  });
}

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type pg from "pg";
import type { Env } from "../config.js";
import { activateMemoryNodes } from "../memory/nodes-activate.js";
import { rehydrateArchiveNodes } from "../memory/rehydrate.js";
import type { AuthPrincipal } from "../util/auth.js";

type StoreLike = {
  withTx: <T>(fn: (client: pg.PoolClient) => Promise<T>) => Promise<T>;
};

type MemoryLifecycleRequest = FastifyRequest<{ Body: unknown }>;
type MemoryLifecycleRequestKind = "rehydrate" | "activate";

type MemoryLifecycleOperation = (client: pg.PoolClient, body: unknown) => Promise<unknown>;

type RegisterMemoryLifecycleRoutesArgs = {
  app: FastifyInstance;
  env: Env;
  store: StoreLike;
  requireMemoryPrincipal: (req: FastifyRequest) => Promise<AuthPrincipal | null>;
  withIdentityFromRequest: (
    req: FastifyRequest,
    body: unknown,
    principal: AuthPrincipal | null,
    kind: "rehydrate" | "activate",
  ) => unknown;
  enforceRateLimit: (req: FastifyRequest, reply: FastifyReply, kind: "write") => Promise<void>;
  enforceTenantQuota: (req: FastifyRequest, reply: FastifyReply, kind: "write", tenantId: string) => Promise<void>;
  tenantFromBody: (body: unknown) => string;
};

export function registerMemoryLifecycleRoutes(args: RegisterMemoryLifecycleRoutesArgs) {
  const {
    app,
    env,
    store,
    requireMemoryPrincipal,
    withIdentityFromRequest,
    enforceRateLimit,
    enforceTenantQuota,
    tenantFromBody,
  } = args;

  const registerMemoryLifecycleWriteRoute = (
    path: string,
    kind: MemoryLifecycleRequestKind,
    operation: MemoryLifecycleOperation,
  ) => {
    app.post(path, async (req: MemoryLifecycleRequest, reply: FastifyReply) => {
      const principal = await requireMemoryPrincipal(req);
      const body = withIdentityFromRequest(req, req.body, principal, kind);
      await enforceRateLimit(req, reply, "write");
      await enforceTenantQuota(req, reply, "write", tenantFromBody(body));
      const out = await store.withTx((client) => operation(client, body));
      return reply.code(200).send(out);
    });
  };

  registerMemoryLifecycleWriteRoute("/v1/memory/archive/rehydrate", "rehydrate", (client, body) =>
    rehydrateArchiveNodes(client, body, env.MEMORY_SCOPE, env.MEMORY_TENANT_ID, {
      maxTextLen: env.MAX_TEXT_LEN,
      piiRedaction: env.PII_REDACTION,
    }),
  );

  registerMemoryLifecycleWriteRoute("/v1/memory/nodes/activate", "activate", (client, body) =>
    activateMemoryNodes(client, body, env.MEMORY_SCOPE, env.MEMORY_TENANT_ID, {
      maxTextLen: env.MAX_TEXT_LEN,
      piiRedaction: env.PII_REDACTION,
    }),
  );
}

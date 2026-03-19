import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { replayPlaybookRun } from "../memory/replay.js";
import {
  automationCreateLite,
  automationGetLite,
  automationListLite,
  automationRunCancelLite,
  automationRunGetLite,
  automationRunListLite,
  automationRunLite,
  automationRunResumeLite,
  automationValidateLite,
} from "../memory/automation-lite.js";
import type { LiteAutomationStore } from "../store/lite-automation-store.js";
import type { LiteAutomationRunStore } from "../store/lite-automation-run-store.js";
import { buildLiteUnsupportedDetails, HttpError } from "../util/http.js";
import type { AuthPrincipal } from "../util/auth.js";
import type { InflightGateToken } from "../util/inflight_gate.js";

type AutomationRouteKind =
  | "automation_create"
  | "automation_get"
  | "automation_validate"
  | "automation_run"
  | "automation_run_get"
  | "automation_run_cancel"
  | "automation_run_resume";

type AutomationRequest = FastifyRequest<{ Body: unknown }>;

export function registerAutomationRoutes(args: {
  app: FastifyInstance;
  env: { MEMORY_SCOPE: string; MEMORY_TENANT_ID: string; LITE_LOCAL_ACTOR_ID: string };
  automationStore: LiteAutomationStore;
  automationRunStore: LiteAutomationRunStore;
  liteWriteStore?: any;
  requireMemoryPrincipal: (req: FastifyRequest) => Promise<AuthPrincipal | null>;
  withIdentityFromRequest: (
    req: FastifyRequest,
    body: unknown,
    principal: AuthPrincipal | null,
    kind: AutomationRouteKind,
  ) => unknown;
  enforceRateLimit: (req: FastifyRequest, reply: FastifyReply, kind: "write" | "recall") => Promise<void>;
  enforceTenantQuota: (req: FastifyRequest, reply: FastifyReply, kind: "write" | "recall", tenantId: string) => Promise<void>;
  tenantFromBody: (body: unknown) => string;
  acquireInflightSlot: (kind: "write" | "recall") => Promise<InflightGateToken>;
  buildAutomationReplayRunOptions: (reply: FastifyReply, source: string) => any;
}) {
  const {
    app,
    env,
    automationStore,
    automationRunStore,
    liteWriteStore,
    requireMemoryPrincipal,
    withIdentityFromRequest,
    enforceRateLimit,
    enforceTenantQuota,
    tenantFromBody,
    acquireInflightSlot,
    buildAutomationReplayRunOptions,
  } = args;
  const defaults = {
    defaultScope: env.MEMORY_SCOPE,
    defaultTenantId: env.MEMORY_TENANT_ID,
    defaultActorId: env.LITE_LOCAL_ACTOR_ID,
  };

  const runAutomationRoute = async <T>(args: {
    req: AutomationRequest;
    reply: FastifyReply;
    requestKind: AutomationRouteKind;
    inflightKind: "write" | "recall";
    execute: (body: unknown, reply: FastifyReply) => Promise<T> | T;
  }): Promise<T> => {
    const principal = await requireMemoryPrincipal(args.req);
    const body = withIdentityFromRequest(args.req, args.req.body, principal, args.requestKind);
    await enforceRateLimit(args.req, args.reply, args.inflightKind);
    await enforceTenantQuota(args.req, args.reply, args.inflightKind, tenantFromBody(body));
    const gate = await acquireInflightSlot(args.inflightKind);
    try {
      return await args.execute(body, args.reply);
    } finally {
      gate.release();
    }
  };

  app.post("/v1/automations/create", async (req: AutomationRequest, reply: FastifyReply) => {
    const out = await runAutomationRoute({
      req,
      reply,
      requestKind: "automation_create",
      inflightKind: "write",
      execute: (body) => automationCreateLite(automationStore, body, defaults),
    });
    return reply.code(200).send(out);
  });

  app.post("/v1/automations/get", async (req: AutomationRequest, reply: FastifyReply) => {
    const out = await runAutomationRoute({
      req,
      reply,
      requestKind: "automation_get",
      inflightKind: "recall",
      execute: (body) => automationGetLite(automationStore, body, defaults),
    });
    return reply.code(200).send(out);
  });

  app.post("/v1/automations/list", async (req: AutomationRequest, reply: FastifyReply) => {
    const out = await runAutomationRoute({
      req,
      reply,
      requestKind: "automation_get",
      inflightKind: "recall",
      execute: (body) => automationListLite(automationStore, body, defaults),
    });
    return reply.code(200).send(out);
  });

  app.post("/v1/automations/validate", async (req: AutomationRequest, reply: FastifyReply) => {
    const out = await runAutomationRoute({
      req,
      reply,
      requestKind: "automation_validate",
      inflightKind: "recall",
      execute: (body) => automationValidateLite(body, defaults),
    });
    return reply.code(200).send(out);
  });

  app.post("/v1/automations/graph/validate", async (req: AutomationRequest, reply: FastifyReply) => {
    const out = await runAutomationRoute({
      req,
      reply,
      requestKind: "automation_validate",
      inflightKind: "recall",
      execute: (body) => automationValidateLite(body, defaults),
    });
    return reply.code(200).send(out);
  });

  app.post("/v1/automations/run", async (req: AutomationRequest, reply: FastifyReply) => {
    const out = await runAutomationRoute({
      req,
      reply,
      requestKind: "automation_run",
      inflightKind: "write",
      execute: async (body, runReply) =>
        automationRunLite({
          definitionStore: automationStore,
          runStore: automationRunStore,
          body,
          defaults,
          deps: {
            buildReplayRunOptions: (source) => {
              const options = buildAutomationReplayRunOptions(runReply, source);
              if (liteWriteStore && options?.writeOptions && !options.writeOptions.writeAccess) {
                options.writeOptions.writeAccess = liteWriteStore;
              }
              return options;
            },
            replayRunner: (replayBody, replayOptions) => replayPlaybookRun({} as any, replayBody, replayOptions),
          },
        }),
    });
    return reply.code(200).send(out);
  });

  app.post("/v1/automations/runs/get", async (req: AutomationRequest, reply: FastifyReply) => {
    const out = await runAutomationRoute({
      req,
      reply,
      requestKind: "automation_run_get",
      inflightKind: "recall",
      execute: (body) => automationRunGetLite(automationRunStore, body, defaults),
    });
    return reply.code(200).send(out);
  });

  app.post("/v1/automations/runs/list", async (req: AutomationRequest, reply: FastifyReply) => {
    const out = await runAutomationRoute({
      req,
      reply,
      requestKind: "automation_run_get",
      inflightKind: "recall",
      execute: (body) => automationRunListLite(automationRunStore, body, defaults),
    });
    return reply.code(200).send(out);
  });

  app.post("/v1/automations/runs/cancel", async (req: AutomationRequest, reply: FastifyReply) => {
    const out = await runAutomationRoute({
      req,
      reply,
      requestKind: "automation_run_cancel",
      inflightKind: "write",
      execute: (body) => automationRunCancelLite(automationRunStore, body, defaults),
    });
    return reply.code(200).send(out);
  });

  app.post("/v1/automations/runs/resume", async (req: AutomationRequest, reply: FastifyReply) => {
    const out = await runAutomationRoute({
      req,
      reply,
      requestKind: "automation_run_resume",
      inflightKind: "write",
      execute: async (body, runReply) =>
        automationRunResumeLite({
          definitionStore: automationStore,
          runStore: automationRunStore,
          body,
          defaults,
          deps: {
            buildReplayRunOptions: (source) => {
              const options = buildAutomationReplayRunOptions(runReply, source);
              if (liteWriteStore && options?.writeOptions && !options.writeOptions.writeAccess) {
                options.writeOptions.writeAccess = liteWriteStore;
              }
              return options;
            },
            replayRunner: (replayBody, replayOptions) => replayPlaybookRun({} as any, replayBody, replayOptions),
          },
        }),
    });
    return reply.code(200).send(out);
  });

  const unsupported = async (req: FastifyRequest) => {
    const path = String(req.url ?? req.routeOptions?.url ?? "");
    throw new HttpError(
      501,
      "automation_feature_not_supported_in_lite",
      "lite automation kernel does not implement this automation surface yet",
      buildLiteUnsupportedDetails({
        route: path,
        surface: "automation_governance",
        reason: "lite automation kernel does not implement this automation surface yet",
      }),
    );
  };

  app.post("/v1/automations/assign_reviewer", unsupported);
  app.post("/v1/automations/promote", unsupported);
  app.post("/v1/automations/shadow/report", unsupported);
  app.post("/v1/automations/shadow/review", unsupported);
  app.post("/v1/automations/shadow/validate", unsupported);
  app.post("/v1/automations/shadow/validate/dispatch", unsupported);
  app.post("/v1/automations/runs/assign_reviewer", unsupported);
  app.post("/v1/automations/runs/approve_repair", unsupported);
  app.post("/v1/automations/runs/reject_repair", unsupported);
  app.post("/v1/automations/runs/compensation/retry", unsupported);
  app.post("/v1/automations/runs/compensation/record_action", unsupported);
  app.post("/v1/automations/runs/compensation/assign", unsupported);
  app.post("/v1/automations/compensation/policy_matrix", unsupported);
  app.post("/v1/automations/telemetry", unsupported);
}

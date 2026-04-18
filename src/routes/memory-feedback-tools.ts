import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type pg from "pg";
import type { Env } from "../config.js";
import type { EmbeddingProvider } from "../embeddings/types.js";
import { buildExecutionMemoryIntrospectionLite } from "../memory/execution-introspection.js";
import { buildExperienceIntelligenceResponse } from "../memory/experience-intelligence.js";
import { buildPolicyGovernanceContract, buildPolicyReviewSummary } from "../memory/evolution-inspect.js";
import { ruleFeedback } from "../memory/feedback.js";
import { applyPolicyMemoryGovernanceLite } from "../memory/policy-memory.js";
import { updateRuleState } from "../memory/rules.js";
import { evaluateRules } from "../memory/rules-evaluate.js";
import { rehydrateAnchorPayloadLite } from "../memory/rehydrate-anchor.js";
import { selectTools } from "../memory/tools-select.js";
import { getToolsDecisionById } from "../memory/tools-decision.js";
import { getToolsRunLifecycle, listToolsRuns } from "../memory/tools-run.js";
import { toolSelectionFeedback } from "../memory/tools-feedback.js";
import { suppressPatternAnchorLite, unsuppressPatternAnchorLite } from "../memory/pattern-operator-override.js";
import { resolveTenantScope } from "../memory/tenant.js";
import {
  buildLiteGovernanceRuntimeProviders,
  type LiteGovernanceRuntimeProviderBuilderOptions,
} from "../app/governance-runtime-providers.js";
import type { EmbeddedMemoryRuntime } from "../store/embedded-memory-runtime.js";
import type { RecallStoreAccess } from "../store/recall-access.js";
import type { LiteWriteStore } from "../store/lite-write-store.js";
import type { AuthPrincipal } from "../util/auth.js";
import type { InflightGateToken } from "../util/inflight_gate.js";
import {
  PolicyGovernanceApplyRequestSchema,
  PolicyGovernanceApplyResponseSchema,
  PolicyGovernanceContractSchema,
  type PolicyGovernanceApplyInput,
} from "../memory/schemas.js";

type MemoryFeedbackToolKind =
  | "feedback"
  | "rules_state"
  | "rules_evaluate"
  | "tools_select"
  | "tools_decision"
  | "tools_run"
  | "tools_feedback"
  | "policy_governance_apply"
  | "patterns_suppress"
  | "patterns_unsuppress"
  | "rehydrate_payload";
type MemoryFeedbackInflightKind = "write" | "recall";

type MemoryFeedbackToolRequest = FastifyRequest<{ Body: unknown }>;

type LiteFeedbackStoreLike =
  NonNullable<NonNullable<Parameters<typeof updateRuleState>[4]>["liteWriteStore"]>
  & NonNullable<NonNullable<Parameters<typeof evaluateRules>[4]>["liteWriteStore"]>
  & NonNullable<NonNullable<Parameters<typeof selectTools>[4]>["liteWriteStore"]>
  & NonNullable<NonNullable<Parameters<typeof getToolsDecisionById>[4]>["liteWriteStore"]>
  & NonNullable<NonNullable<Parameters<typeof getToolsRunLifecycle>[4]>["liteWriteStore"]>
  & NonNullable<NonNullable<Parameters<typeof listToolsRuns>[4]>["liteWriteStore"]>
  & NonNullable<NonNullable<Parameters<typeof toolSelectionFeedback>[4]>["liteWriteStore"]>
  & Pick<LiteWriteStore, "findNodes" | "updateNodeAnchorState">
  & Parameters<typeof rehydrateAnchorPayloadLite>[0]
  & {
    withTx: <T>(fn: () => Promise<T>) => Promise<T>;
  };

type RegisterMemoryFeedbackToolRoutesArgs = {
  app: FastifyInstance;
  env: Env;
  embedder: EmbeddingProvider | null;
  embeddedRuntime: EmbeddedMemoryRuntime | null;
  liteRecallAccess: RecallStoreAccess;
  liteWriteStore: LiteFeedbackStoreLike;
  requireMemoryPrincipal: (req: FastifyRequest) => Promise<AuthPrincipal | null>;
  withIdentityFromRequest: (
    req: FastifyRequest,
    body: unknown,
    principal: AuthPrincipal | null,
    kind: MemoryFeedbackToolKind,
  ) => unknown;
  enforceRateLimit: (req: FastifyRequest, reply: FastifyReply, kind: "write" | "recall") => Promise<void>;
  enforceTenantQuota: (req: FastifyRequest, reply: FastifyReply, kind: "write" | "recall", tenantId: string) => Promise<void>;
  tenantFromBody: (body: unknown) => string;
  acquireInflightSlot: (kind: "write" | "recall") => Promise<InflightGateToken>;
  governanceRuntimeProviderBuilderOptions?: LiteGovernanceRuntimeProviderBuilderOptions;
};

export function registerMemoryFeedbackToolRoutes(args: RegisterMemoryFeedbackToolRoutesArgs) {
  const {
    app,
    env,
    embedder,
    embeddedRuntime,
    liteRecallAccess,
    liteWriteStore,
    requireMemoryPrincipal,
    withIdentityFromRequest,
    enforceRateLimit,
    enforceTenantQuota,
    tenantFromBody,
    acquireInflightSlot,
  } = args;
  if (env.AIONIS_EDITION !== "lite") {
    throw new Error("aionis-lite memory-feedback-tools routes only support AIONIS_EDITION=lite");
  }
  const governanceProviders = buildLiteGovernanceRuntimeProviders(
    env,
    args.governanceRuntimeProviderBuilderOptions,
  );

  function buildAppliedPolicyGovernanceContract(args: {
    parsed: PolicyGovernanceApplyInput;
    appliedPolicyMemoryId: string;
    previousState: "active" | "contested" | "retired";
    nextState: "active" | "contested" | "retired";
    selectedTool: string | null;
    filePath: string | null;
    workflowSignature: string | null;
  }) {
    const rationale =
      args.parsed.action === "retire"
        ? "operator_forced_retire"
        : args.parsed.action === "reactivate"
          ? "operator_requested_policy_reactivation"
          : "operator_requested_policy_refresh";
    return PolicyGovernanceContractSchema.parse({
      contract_version: "policy_governance_contract_v1",
      action: args.parsed.action,
      applies: true,
      review_required: false,
      policy_memory_id: args.appliedPolicyMemoryId,
      current_state: args.previousState,
      target_state: args.nextState,
      selected_tool: args.selectedTool,
      file_path: args.filePath,
      workflow_signature: args.workflowSignature,
      rationale,
      next_action: null,
    });
  }

  const buildLiveGovernanceContext = async (body: unknown) => {
    const parsed = PolicyGovernanceApplyRequestSchema.parse(body);
    if (
      typeof parsed.query_text !== "string"
      || parsed.context === undefined
      || !Array.isArray(parsed.candidates)
      || parsed.candidates.length === 0
    ) {
      return {
        parsed,
        livePolicyContract: null,
        liveDerivedPolicy: null,
        governanceContract: null,
      };
    }

    const introspection = await buildExecutionMemoryIntrospectionLite(
      liteWriteStore,
      {
        tenant_id: parsed.tenant_id,
        scope: parsed.scope,
        consumer_agent_id: parsed.consumer_agent_id,
        consumer_team_id: parsed.consumer_team_id,
        limit: parsed.workflow_limit,
      },
      env.MEMORY_SCOPE,
      env.MEMORY_TENANT_ID,
      null,
    );
    const tools = await selectTools(
      null,
      {
        tenant_id: parsed.tenant_id,
        scope: parsed.scope,
        run_id: parsed.run_id,
        context: parsed.context,
        candidates: parsed.candidates,
        include_shadow: parsed.include_shadow ?? false,
        rules_limit: parsed.rules_limit ?? 50,
        strict: parsed.strict ?? true,
        reorder_candidates: parsed.reorder_candidates ?? true,
        execution_result_summary: parsed.execution_result_summary,
        execution_artifacts: parsed.execution_artifacts,
        execution_evidence: parsed.execution_evidence,
        execution_state_v1: parsed.execution_state_v1,
      },
      env.MEMORY_SCOPE,
      env.MEMORY_TENANT_ID,
      {
        embeddedRuntime,
        liteWriteStore,
        recallAccess: liteRecallAccess,
        embedder,
        persistDecision: false,
      },
    );
    const experience = buildExperienceIntelligenceResponse({
      parsed: {
        tenant_id: parsed.tenant_id,
        scope: parsed.scope,
        consumer_agent_id: parsed.consumer_agent_id,
        consumer_team_id: parsed.consumer_team_id,
        run_id: parsed.run_id,
        query_text: parsed.query_text,
        context: parsed.context,
        candidates: parsed.candidates,
        include_shadow: parsed.include_shadow ?? false,
        rules_limit: parsed.rules_limit ?? 50,
        strict: parsed.strict ?? true,
        reorder_candidates: parsed.reorder_candidates ?? true,
        execution_result_summary: parsed.execution_result_summary,
        execution_artifacts: parsed.execution_artifacts,
        execution_evidence: parsed.execution_evidence,
        execution_state_v1: parsed.execution_state_v1,
        workflow_limit: parsed.workflow_limit ?? 8,
      },
      tools,
      introspection,
    });
    const policyReview = buildPolicyReviewSummary({
      introspection,
      policyContract: experience.policy_contract,
    });
    const governanceContract = buildPolicyGovernanceContract({
      policyReview,
      policyContract: experience.policy_contract,
    });
    return {
      parsed,
      livePolicyContract: experience.policy_contract,
      liveDerivedPolicy: experience.derived_policy,
      governanceContract,
    };
  };

  const runFeedbackRoute = async <TResult>(args: {
    req: MemoryFeedbackToolRequest;
    reply: FastifyReply;
    requestKind: MemoryFeedbackToolKind;
    inflightKind: MemoryFeedbackInflightKind;
    withGate?: boolean;
    execute: (body: unknown) => Promise<TResult>;
  }): Promise<TResult> => {
    const { req, reply, requestKind, inflightKind, withGate = true, execute } = args;
    const principal = await requireMemoryPrincipal(req);
    const body = withIdentityFromRequest(req, req.body, principal, requestKind);
    await enforceRateLimit(req, reply, inflightKind);
    await enforceTenantQuota(req, reply, inflightKind, tenantFromBody(body));
    if (!withGate) {
      return await execute(body);
    }
    const gate = await acquireInflightSlot(inflightKind);
    try {
      return await execute(body);
    } finally {
      gate.release();
    }
  };
  const executeFeedbackWriteOperation = <TResult>(args: {
    executeLite: (liteStore: LiteFeedbackStoreLike) => Promise<TResult>;
  }) =>
    args.executeLite(liteWriteStore);
  const executeFeedbackReadOperation = <TResult>(args: {
    executeLite: (liteStore: LiteFeedbackStoreLike) => Promise<TResult>;
  }) =>
    args.executeLite(liteWriteStore);
  const registerFeedbackPostRoute = <TResult>(args: {
    path: string;
    requestKind: MemoryFeedbackToolKind;
    inflightKind: MemoryFeedbackInflightKind;
    withGate?: boolean;
    execute: (body: unknown) => Promise<TResult>;
  }) => {
    app.post(args.path, async (req: MemoryFeedbackToolRequest, reply: FastifyReply) => {
      const out = await runFeedbackRoute({
        req,
        reply,
        requestKind: args.requestKind,
        inflightKind: args.inflightKind,
        withGate: args.withGate,
        execute: args.execute,
      });
      return reply.code(200).send(out);
    });
  };

  registerFeedbackPostRoute({
    path: "/v1/memory/feedback",
    requestKind: "feedback",
    inflightKind: "write",
    withGate: false,
    execute: (body) =>
      liteWriteStore.withTx(() =>
        ruleFeedback({} as pg.PoolClient, body, env.MEMORY_SCOPE, env.MEMORY_TENANT_ID, {
          maxTextLen: env.MAX_TEXT_LEN,
          piiRedaction: env.PII_REDACTION,
          embeddedRuntime,
          liteWriteStore,
        }),
      ),
  });
  registerFeedbackPostRoute({
    path: "/v1/memory/rules/state",
    requestKind: "rules_state",
    inflightKind: "write",
    withGate: false,
    execute: (body) =>
      executeFeedbackWriteOperation({
        executeLite: (liteStore) =>
          liteStore.withTx(() =>
            updateRuleState({} as pg.PoolClient, body, env.MEMORY_SCOPE, env.MEMORY_TENANT_ID, {
              embeddedRuntime,
              liteWriteStore: liteStore,
            }),
          ),
      }),
  });
  registerFeedbackPostRoute({
    path: "/v1/memory/rules/evaluate",
    requestKind: "rules_evaluate",
    inflightKind: "recall",
    execute: (body) =>
      executeFeedbackReadOperation({
        executeLite: (liteStore) =>
          evaluateRules({} as pg.PoolClient, body, env.MEMORY_SCOPE, env.MEMORY_TENANT_ID, {
            embeddedRuntime,
            liteWriteStore: liteStore,
          }),
      }),
  });
  registerFeedbackPostRoute({
    path: "/v1/memory/tools/select",
    requestKind: "tools_select",
    inflightKind: "recall",
    execute: (body) =>
      executeFeedbackReadOperation({
        executeLite: (liteStore) =>
          selectTools(null, body, env.MEMORY_SCOPE, env.MEMORY_TENANT_ID, {
            embeddedRuntime,
            recallAccess: liteRecallAccess,
            embedder,
            liteWriteStore: liteStore,
          }),
      }),
  });
  registerFeedbackPostRoute({
    path: "/v1/memory/tools/decision",
    requestKind: "tools_decision",
    inflightKind: "recall",
    execute: (body) =>
      executeFeedbackReadOperation({
        executeLite: (liteStore) =>
          getToolsDecisionById(null, body, env.MEMORY_SCOPE, env.MEMORY_TENANT_ID, {
            liteWriteStore: liteStore,
          }),
      }),
  });
  registerFeedbackPostRoute({
    path: "/v1/memory/tools/run",
    requestKind: "tools_run",
    inflightKind: "recall",
    execute: (body) =>
      executeFeedbackReadOperation({
        executeLite: (liteStore) =>
          getToolsRunLifecycle(null, body, env.MEMORY_SCOPE, env.MEMORY_TENANT_ID, {
            liteWriteStore: liteStore,
          }),
      }),
  });
  registerFeedbackPostRoute({
    path: "/v1/memory/tools/runs/list",
    requestKind: "tools_run",
    inflightKind: "recall",
    execute: (body) =>
      executeFeedbackReadOperation({
        executeLite: (liteStore) =>
          listToolsRuns(null, body, env.MEMORY_SCOPE, env.MEMORY_TENANT_ID, {
            liteWriteStore: liteStore,
          }),
      }),
  });
  registerFeedbackPostRoute({
    path: "/v1/memory/tools/feedback",
    requestKind: "tools_feedback",
    inflightKind: "write",
    withGate: false,
    execute: (body) =>
      executeFeedbackWriteOperation({
        executeLite: (liteStore) =>
          liteStore.withTx(() =>
            toolSelectionFeedback(null, body, env.MEMORY_SCOPE, env.MEMORY_TENANT_ID, {
              maxTextLen: env.MAX_TEXT_LEN,
              piiRedaction: env.PII_REDACTION,
              embedder,
              embeddedRuntime,
              governanceReviewProviders: governanceProviders.toolsFeedback,
              liteWriteStore: liteStore,
            }),
          ),
      }),
  });
  registerFeedbackPostRoute({
    path: "/v1/memory/policies/governance/apply",
    requestKind: "policy_governance_apply",
    inflightKind: "write",
    withGate: false,
    execute: async (body) => {
      const { parsed, livePolicyContract, liveDerivedPolicy, governanceContract } = await buildLiveGovernanceContext(body);
      const effectiveGovernanceContract =
        governanceContract && (governanceContract.action === parsed.action || governanceContract.action === "none")
          ? governanceContract
          : null;
      const tenancy = resolveTenantScope(
        { scope: parsed.scope, tenant_id: parsed.tenant_id },
        { defaultScope: env.MEMORY_SCOPE, defaultTenantId: env.MEMORY_TENANT_ID },
      );
      const applied = await liteWriteStore.withTx(() =>
        applyPolicyMemoryGovernanceLite(liteWriteStore, {
          tenant_id: tenancy.tenant_id,
          scope: tenancy.scope_key,
          policy_memory_id: parsed.policy_memory_id,
          action: parsed.action,
          actor: parsed.actor ?? null,
          reason: parsed.reason ?? null,
          governance_contract: effectiveGovernanceContract,
          live_policy_contract: livePolicyContract,
          live_derived_policy: liveDerivedPolicy,
        }),
      );
      return PolicyGovernanceApplyResponseSchema.parse({
        ok: true,
        tenant_id: tenancy.tenant_id,
        scope: tenancy.scope,
        action: parsed.action,
        applied: true,
        actor: parsed.actor ?? null,
        reason: parsed.reason ?? null,
        policy_memory_id: applied.policy_memory.node_id,
        previous_state: applied.previous_state,
        next_state: applied.next_state,
        governance_contract:
          effectiveGovernanceContract
            ? effectiveGovernanceContract
            : buildAppliedPolicyGovernanceContract({
                parsed,
                appliedPolicyMemoryId: applied.policy_memory.node_id,
                previousState: applied.previous_state,
                nextState: applied.next_state,
                selectedTool: applied.policy_memory.selected_tool,
                filePath: applied.policy_memory.policy_contract.file_path,
                workflowSignature: applied.policy_memory.policy_contract.workflow_signature,
              }),
        live_policy_contract: livePolicyContract,
        policy_memory: applied.policy_memory,
      });
    },
  });
  registerFeedbackPostRoute({
    path: "/v1/memory/patterns/suppress",
    requestKind: "patterns_suppress",
    inflightKind: "write",
    withGate: false,
    execute: (body) =>
      executeFeedbackWriteOperation({
        executeLite: (liteStore) =>
          liteStore.withTx(() =>
            suppressPatternAnchorLite({
              body,
              defaultScope: env.MEMORY_SCOPE,
              defaultTenantId: env.MEMORY_TENANT_ID,
              liteWriteStore: liteStore,
            }),
          ),
      }),
  });
  registerFeedbackPostRoute({
    path: "/v1/memory/patterns/unsuppress",
    requestKind: "patterns_unsuppress",
    inflightKind: "write",
    withGate: false,
    execute: (body) =>
      executeFeedbackWriteOperation({
        executeLite: (liteStore) =>
          liteStore.withTx(() =>
            unsuppressPatternAnchorLite({
              body,
              defaultScope: env.MEMORY_SCOPE,
              defaultTenantId: env.MEMORY_TENANT_ID,
              liteWriteStore: liteStore,
            }),
          ),
      }),
  });
  registerFeedbackPostRoute({
    path: "/v1/memory/tools/rehydrate_payload",
    requestKind: "rehydrate_payload",
    inflightKind: "recall",
    execute: (body) =>
      executeFeedbackReadOperation({
        executeLite: (liteStore) =>
          rehydrateAnchorPayloadLite(liteStore, body, env.MEMORY_SCOPE, env.MEMORY_TENANT_ID, env.LITE_LOCAL_ACTOR_ID),
      }),
  });
}

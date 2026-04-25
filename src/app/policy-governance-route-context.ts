import type { Env } from "../config.js";
import type { EmbeddingProvider } from "../embeddings/types.js";
import { buildExecutionMemoryIntrospectionLite } from "../memory/execution-introspection.js";
import { buildExperienceIntelligenceResponse } from "../memory/experience-intelligence.js";
import {
  buildPolicyGovernanceContract,
  buildPolicyReviewSummary,
} from "../memory/evolution-inspect.js";
import {
  PolicyGovernanceApplyRequestSchema,
  PolicyGovernanceContractSchema,
  type DerivedPolicySurface,
  type PolicyContract,
  type PolicyGovernanceApplyInput,
  type PolicyGovernanceContract,
} from "../memory/schemas.js";
import { selectTools } from "../memory/tools-select.js";
import type { EmbeddedMemoryRuntime } from "../store/embedded-memory-runtime.js";
import type { LiteWriteStore } from "../store/lite-write-store.js";
import type { RecallStoreAccess } from "../store/recall-access.js";

export type PolicyGovernanceRouteContext = {
  parsed: PolicyGovernanceApplyInput;
  livePolicyContract: PolicyContract | null;
  liveDerivedPolicy: DerivedPolicySurface | null;
  governanceContract: PolicyGovernanceContract | null;
};

export function buildAppliedPolicyGovernanceContract(args: {
  parsed: PolicyGovernanceApplyInput;
  appliedPolicyMemoryId: string;
  previousState: "active" | "contested" | "retired";
  nextState: "active" | "contested" | "retired";
  selectedTool: string | null;
  filePath: string | null;
  workflowSignature: string | null;
}): PolicyGovernanceContract {
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

export async function buildLivePolicyGovernanceRouteContext(args: {
  body: unknown;
  env: Env;
  embedder: EmbeddingProvider | null;
  embeddedRuntime: EmbeddedMemoryRuntime | null;
  liteRecallAccess: RecallStoreAccess;
  liteWriteStore: LiteWriteStore;
}): Promise<PolicyGovernanceRouteContext> {
  const parsed = PolicyGovernanceApplyRequestSchema.parse(args.body);
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
    args.liteWriteStore,
    {
      tenant_id: parsed.tenant_id,
      scope: parsed.scope,
      consumer_agent_id: parsed.consumer_agent_id,
      consumer_team_id: parsed.consumer_team_id,
      limit: parsed.workflow_limit,
    },
    args.env.MEMORY_SCOPE,
    args.env.MEMORY_TENANT_ID,
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
    args.env.MEMORY_SCOPE,
    args.env.MEMORY_TENANT_ID,
    {
      embeddedRuntime: args.embeddedRuntime,
      liteWriteStore: args.liteWriteStore,
      recallAccess: args.liteRecallAccess,
      embedder: args.embedder,
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
}

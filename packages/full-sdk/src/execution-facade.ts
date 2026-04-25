import type {
  AionisExecutionIntrospectRequest,
  AionisExecutionIntrospectResponse,
  AionisReplayRunEndRequest,
  AionisReplayRunStartRequest,
  AionisReplayStepAfterRequest,
  AionisReplayStepBeforeRequest,
  AionisRetrieveWorkflowContractRequest,
  AionisRetrieveWorkflowContractResponse,
  AionisRuntimeResponse,
  AionisStoreExecutionOutcomeRequest,
  AionisStoreExecutionOutcomeResponse,
} from "./contracts.js";
import { AIONIS_SHARED_ROUTE_PATHS } from "./routes.js";
import type { AionisHttpClient } from "./types.js";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : [];
}

function sharedReplayFields(payload: AionisStoreExecutionOutcomeRequest) {
  return {
    tenant_id: payload.tenant_id,
    scope: payload.scope,
    actor: payload.actor,
    consumer_agent_id: payload.consumer_agent_id,
    consumer_team_id: payload.consumer_team_id,
    memory_lane: payload.memory_lane,
    producer_agent_id: payload.producer_agent_id,
    owner_agent_id: payload.owner_agent_id,
    owner_team_id: payload.owner_team_id,
  };
}

function replayPath(kind: "start" | "before" | "after" | "end"): string {
  if (kind === "start") return "/v1/memory/replay/run/start";
  if (kind === "before") return "/v1/memory/replay/step/before";
  if (kind === "after") return "/v1/memory/replay/step/after";
  return "/v1/memory/replay/run/end";
}

export function createStoreExecutionOutcomeMethod(client: AionisHttpClient) {
  return async function storeExecutionOutcome(
    payload: AionisStoreExecutionOutcomeRequest,
  ): Promise<AionisStoreExecutionOutcomeResponse> {
    const started = await client.post<AionisReplayRunStartRequest, AionisRuntimeResponse>({
      path: replayPath("start"),
      payload: {
        ...sharedReplayFields(payload),
        run_id: payload.run_id,
        goal: payload.goal,
        context_snapshot_ref: payload.context_snapshot_ref,
        context_snapshot_hash: payload.context_snapshot_hash,
        metadata: payload.metadata,
      },
    });
    const runId = stringValue(asRecord(started)?.run_id) ?? stringValue(payload.run_id);
    if (!runId) {
      throw new Error("storeExecutionOutcome could not resolve replay run_id from run start response");
    }

    const steps: AionisStoreExecutionOutcomeResponse["steps"] = [];
    for (const [index, step] of (payload.steps ?? []).entries()) {
      const stepIndex = step.step_index ?? index + 1;
      const before = await client.post<AionisReplayStepBeforeRequest, AionisRuntimeResponse>({
        path: replayPath("before"),
        payload: {
          ...sharedReplayFields(payload),
          run_id: runId,
          step_id: step.step_id,
          decision_id: step.decision_id,
          step_index: stepIndex,
          tool_name: step.tool_name,
          tool_input: step.tool_input,
          expected_output_signature: step.expected_output_signature,
          preconditions: step.preconditions,
          retry_policy: step.retry_policy,
          safety_level: step.safety_level,
          metadata: step.metadata,
        },
      });
      const stepId = stringValue(asRecord(before)?.step_id) ?? stringValue(step.step_id);
      const after = await client.post<AionisReplayStepAfterRequest, AionisRuntimeResponse>({
        path: replayPath("after"),
        payload: {
          ...sharedReplayFields(payload),
          run_id: runId,
          step_id: stepId ?? undefined,
          step_index: stepIndex,
          status: step.status,
          output_signature: step.output_signature,
          postconditions: step.postconditions,
          artifact_refs: step.artifact_refs,
          repair_applied: step.repair_applied,
          repair_note: step.repair_note,
          error: step.error,
          metadata: step.metadata,
        },
      });
      steps.push({
        step_index: stepIndex,
        step_id: stringValue(asRecord(after)?.step_id) ?? stepId,
        before,
        after,
      });
    }

    const ended = await client.post<AionisReplayRunEndRequest, AionisRuntimeResponse>({
      path: replayPath("end"),
      payload: {
        ...sharedReplayFields(payload),
        run_id: runId,
        status: payload.status,
        summary: payload.summary,
        success_criteria: payload.success_criteria,
        metrics: payload.metrics,
        metadata: payload.metadata,
      },
    });

    return {
      summary_version: "store_execution_outcome_v1",
      tenant_id: stringValue(asRecord(ended)?.tenant_id) ?? stringValue(asRecord(started)?.tenant_id) ?? payload.tenant_id ?? null,
      scope: stringValue(asRecord(ended)?.scope) ?? stringValue(asRecord(started)?.scope) ?? payload.scope ?? null,
      run_id: runId,
      status: payload.status,
      started,
      steps,
      ended,
    };
  };
}

function workflowContract(workflow: Record<string, unknown>): Record<string, unknown> | null {
  return asRecord(workflow.execution_contract_v1) ?? asRecord(workflow.execution_contract) ?? null;
}

function workflowMatches(workflow: Record<string, unknown>, request: AionisRetrieveWorkflowContractRequest): boolean {
  const contract = workflowContract(workflow);
  const targetFiles = new Set([
    ...stringList(workflow.target_files),
    ...stringList(contract?.target_files),
  ]);
  const anchorId = stringValue(workflow.anchor_id) ?? stringValue(workflow.node_id) ?? stringValue(workflow.id);
  const workflowSignature = stringValue(workflow.workflow_signature) ?? stringValue(contract?.workflow_signature);
  const taskFamily = stringValue(workflow.task_family) ?? stringValue(contract?.task_family);
  const filePath = stringValue(workflow.file_path) ?? stringValue(contract?.file_path);
  return (
    (!request.anchor_id || anchorId === request.anchor_id)
    && (!request.workflow_signature || workflowSignature === request.workflow_signature)
    && (!request.task_family || taskFamily === request.task_family)
    && (!request.file_path || filePath === request.file_path || targetFiles.has(request.file_path))
  );
}

export function createRetrieveWorkflowContractMethod(client: AionisHttpClient) {
  return async function retrieveWorkflowContract(
    payload: AionisRetrieveWorkflowContractRequest,
  ): Promise<AionisRetrieveWorkflowContractResponse> {
    const introspection = await client.post<AionisExecutionIntrospectRequest, AionisExecutionIntrospectResponse>({
      path: AIONIS_SHARED_ROUTE_PATHS.executionIntrospect,
      payload: {
        tenant_id: payload.tenant_id,
        scope: payload.scope,
        consumer_agent_id: payload.consumer_agent_id,
        consumer_team_id: payload.consumer_team_id,
        limit: payload.limit,
      },
    });
    const recommended = Array.isArray(introspection.recommended_workflows)
      ? introspection.recommended_workflows.map(asRecord).filter((entry): entry is Record<string, unknown> => !!entry)
      : [];
    const candidate = Array.isArray(introspection.candidate_workflows)
      ? introspection.candidate_workflows.map(asRecord).filter((entry): entry is Record<string, unknown> => !!entry)
      : [];
    const selectedRecommended = recommended.find((workflow) => workflowMatches(workflow, payload)) ?? null;
    const selectedCandidate = selectedRecommended
      ? null
      : candidate.find((workflow) => workflowMatches(workflow, payload)) ?? null;
    const selectedWorkflow = selectedRecommended ?? selectedCandidate;

    return {
      summary_version: "retrieve_workflow_contract_v1",
      tenant_id: introspection.tenant_id ?? payload.tenant_id ?? null,
      scope: introspection.scope ?? payload.scope ?? null,
      selected_source: selectedRecommended ? "recommended_workflows" : selectedCandidate ? "candidate_workflows" : "none",
      selected_workflow: selectedWorkflow,
      execution_contract_v1: selectedWorkflow ? workflowContract(selectedWorkflow) : null,
      introspection: payload.include_introspection === false ? null : introspection,
    };
  };
}

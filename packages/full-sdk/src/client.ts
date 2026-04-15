import type {
  AionisAnchorRehydratePayloadRequest,
  AionisArchiveRehydrateRequest,
  AionisAutomationCreateRequest,
  AionisAutomationGetRequest,
  AionisAutomationListRequest,
  AionisAutomationRunCancelRequest,
  AionisAutomationRunGetRequest,
  AionisAutomationRunListRequest,
  AionisAutomationRunRequest,
  AionisAutomationRunResumeRequest,
  AionisAutomationValidateRequest,
  AionisContextAssembleResponse,
  AionisContextAssembleRequest,
  AionisContinuityReviewPackRequest,
  AionisContinuityReviewPackResponse,
  AionisExecutionIntrospectRequest,
  AionisExecutionIntrospectResponse,
  AionisExperienceIntelligenceRequest,
  AionisExperienceIntelligenceResponse,
  AionisEvolutionReviewPackRequest,
  AionisEvolutionReviewPackResponse,
  AionisDelegationRecordsAggregateRequest,
  AionisDelegationRecordsAggregateResponse,
  AionisDelegationRecordsFindRequest,
  AionisDelegationRecordsFindResponse,
  AionisDelegationRecordsWriteRequest,
  AionisDelegationRecordsWriteResponse,
  AionisHandoffRecoverRequest,
  AionisHandoffStoreRequest,
  AionisHealthResponse,
  AionisKickoffRecommendationRequest,
  AionisKickoffRecommendationResponse,
  AionisTaskStartRequest,
  AionisTaskStartResponse,
  AionisMemoryFeedbackRequest,
  AionisMemoryFindRequest,
  AionisMemoryPackExportRequest,
  AionisMemoryPackImportRequest,
  AionisMemoryRecallRequest,
  AionisMemoryRecallTextRequest,
  AionisMemoryResolveRequest,
  AionisMemoryWriteRequest,
  AionisMemoryWriteResponse,
  AionisNodesActivateRequest,
  AionisPatternSuppressRequest,
  AionisPatternUnsuppressRequest,
  AionisPlanningContextResponse,
  AionisPlanningContextRequest,
  AionisReplayPlaybookCandidateRequest,
  AionisReplayPlaybookCompileFromRunRequest,
  AionisReplayPlaybookDispatchRequest,
  AionisReplayPlaybookGetRequest,
  AionisReplayPlaybookPromoteRequest,
  AionisReplayPlaybookRepairRequest,
  AionisReplayPlaybookRepairReviewRequest,
  AionisReplayPlaybookRunRequest,
  AionisReplayRunEndRequest,
  AionisReplayRunGetRequest,
  AionisReplayRunStartRequest,
  AionisReplayStepAfterRequest,
  AionisReplayStepBeforeRequest,
  AionisRuleStateRequest,
  AionisRulesEvaluateRequest,
  AionisRuntimeResponse,
  AionisSandboxExecuteRequest,
  AionisSandboxRunArtifactRequest,
  AionisSandboxRunCancelRequest,
  AionisSandboxRunGetRequest,
  AionisSandboxRunLogsRequest,
  AionisSandboxSessionCreateRequest,
  AionisSessionCreateRequest,
  AionisSessionEventsQuery,
  AionisSessionEventWriteRequest,
  AionisSessionListQuery,
  AionisToolsDecisionRequest,
  AionisToolsFeedbackRequest,
  AionisToolsRunRequest,
  AionisToolsRunsListRequest,
  AionisToolsSelectRequest,
} from "./contracts.js";
import { createAionisRuntimeHttpClient } from "./transport/http.js";
import type { AionisClientOptions, AionisHttpClient, AionisQueryPayload, AionisRequestPayload } from "./types.js";

function createPostMethod<TRequest extends AionisRequestPayload, TResponse = AionisRuntimeResponse>(
  client: AionisHttpClient,
  path: string,
) {
  return async function call(payload: TRequest): Promise<TResponse> {
    return await client.post<TRequest, TResponse>({ path, payload });
  };
}

function createGetMethod<TQuery extends AionisQueryPayload, TResponse = AionisRuntimeResponse>(
  client: AionisHttpClient,
  path: string,
) {
  return async function call(query?: TQuery): Promise<TResponse> {
    return await client.get<TQuery, TResponse>({ path, query });
  };
}

function createSessionEventsMethod(client: AionisHttpClient) {
  return async function sessionEvents(payload: AionisSessionEventsQuery): Promise<AionisRuntimeResponse> {
    const { session_id, ...query } = payload;
    return await client.get<typeof query, AionisRuntimeResponse>({
      path: `/v1/memory/sessions/${encodeURIComponent(session_id)}/events`,
      query,
    });
  };
}

function createTaskStartMethod(client: AionisHttpClient) {
  return async function taskStart(payload: AionisTaskStartRequest): Promise<AionisTaskStartResponse> {
    const response = await client.post<AionisTaskStartRequest, AionisKickoffRecommendationResponse>({
      path: "/v1/memory/kickoff/recommendation",
      payload,
    });
    const kickoff = response.kickoff_recommendation;
    return {
      ...response,
      summary_version: "task_start_v1",
      first_action: kickoff?.selected_tool
        ? {
            action_kind: kickoff.file_path ? "file_step" : "tool_step",
            source_kind: kickoff.source_kind,
            history_applied: kickoff.history_applied,
            selected_tool: kickoff.selected_tool,
            file_path: kickoff.file_path,
            next_action: kickoff.next_action,
          }
        : null,
    };
  };
}

export function createAionisRuntimeClient(options: AionisClientOptions) {
  const http = createAionisRuntimeHttpClient(options);

  return {
    system: {
      health: createGetMethod<Record<string, never>, AionisHealthResponse>(http, "/health"),
    },
    handoff: {
      store: createPostMethod<AionisHandoffStoreRequest>(http, "/v1/handoff/store"),
      recover: createPostMethod<AionisHandoffRecoverRequest>(http, "/v1/handoff/recover"),
    },
    automations: {
      create: createPostMethod<AionisAutomationCreateRequest>(http, "/v1/automations/create"),
      get: createPostMethod<AionisAutomationGetRequest>(http, "/v1/automations/get"),
      list: createPostMethod<AionisAutomationListRequest>(http, "/v1/automations/list"),
      validate: createPostMethod<AionisAutomationValidateRequest>(http, "/v1/automations/validate"),
      graphValidate: createPostMethod<AionisAutomationValidateRequest>(http, "/v1/automations/graph/validate"),
      run: createPostMethod<AionisAutomationRunRequest>(http, "/v1/automations/run"),
      runs: {
        get: createPostMethod<AionisAutomationRunGetRequest>(http, "/v1/automations/runs/get"),
        list: createPostMethod<AionisAutomationRunListRequest>(http, "/v1/automations/runs/list"),
        cancel: createPostMethod<AionisAutomationRunCancelRequest>(http, "/v1/automations/runs/cancel"),
        resume: createPostMethod<AionisAutomationRunResumeRequest>(http, "/v1/automations/runs/resume"),
      },
    },
    memory: {
      write: createPostMethod<AionisMemoryWriteRequest, AionisMemoryWriteResponse>(http, "/v1/memory/write"),
      recall: createPostMethod<AionisMemoryRecallRequest>(http, "/v1/memory/recall"),
      recallText: createPostMethod<AionisMemoryRecallTextRequest>(http, "/v1/memory/recall_text"),
      find: createPostMethod<AionisMemoryFindRequest>(http, "/v1/memory/find"),
      resolve: createPostMethod<AionisMemoryResolveRequest>(http, "/v1/memory/resolve"),
      feedback: createPostMethod<AionisMemoryFeedbackRequest>(http, "/v1/memory/feedback"),
      planningContext: createPostMethod<AionisPlanningContextRequest, AionisPlanningContextResponse>(
        http,
        "/v1/memory/planning/context",
      ),
      contextAssemble: createPostMethod<AionisContextAssembleRequest, AionisContextAssembleResponse>(
        http,
        "/v1/memory/context/assemble",
      ),
      experienceIntelligence: createPostMethod<AionisExperienceIntelligenceRequest, AionisExperienceIntelligenceResponse>(
        http,
        "/v1/memory/experience/intelligence",
      ),
      kickoffRecommendation: createPostMethod<AionisKickoffRecommendationRequest, AionisKickoffRecommendationResponse>(
        http,
        "/v1/memory/kickoff/recommendation",
      ),
      taskStart: createTaskStartMethod(http),
      executionIntrospect: createPostMethod<AionisExecutionIntrospectRequest, AionisExecutionIntrospectResponse>(
        http,
        "/v1/memory/execution/introspect",
      ),
      delegationRecords: {
        aggregate: createPostMethod<AionisDelegationRecordsAggregateRequest, AionisDelegationRecordsAggregateResponse>(
          http,
          "/v1/memory/delegation/records/aggregate",
        ),
        find: createPostMethod<AionisDelegationRecordsFindRequest, AionisDelegationRecordsFindResponse>(
          http,
          "/v1/memory/delegation/records/find",
        ),
        write: createPostMethod<AionisDelegationRecordsWriteRequest, AionisDelegationRecordsWriteResponse>(
          http,
          "/v1/memory/delegation/records",
        ),
      },
      reviewPacks: {
        continuity: createPostMethod<AionisContinuityReviewPackRequest, AionisContinuityReviewPackResponse>(
          http,
          "/v1/memory/continuity/review-pack",
        ),
        evolution: createPostMethod<AionisEvolutionReviewPackRequest, AionisEvolutionReviewPackResponse>(
          http,
          "/v1/memory/evolution/review-pack",
        ),
      },
      sessions: {
        create: createPostMethod<AionisSessionCreateRequest>(http, "/v1/memory/sessions"),
        list: createGetMethod<AionisSessionListQuery>(http, "/v1/memory/sessions"),
        writeEvent: createPostMethod<AionisSessionEventWriteRequest>(http, "/v1/memory/events"),
        events: createSessionEventsMethod(http),
      },
      packs: {
        exportPack: createPostMethod<AionisMemoryPackExportRequest>(http, "/v1/memory/packs/export"),
        importPack: createPostMethod<AionisMemoryPackImportRequest>(http, "/v1/memory/packs/import"),
      },
      archive: {
        rehydrate: createPostMethod<AionisArchiveRehydrateRequest>(http, "/v1/memory/archive/rehydrate"),
      },
      nodes: {
        activate: createPostMethod<AionisNodesActivateRequest>(http, "/v1/memory/nodes/activate"),
      },
      rules: {
        state: createPostMethod<AionisRuleStateRequest>(http, "/v1/memory/rules/state"),
        evaluate: createPostMethod<AionisRulesEvaluateRequest>(http, "/v1/memory/rules/evaluate"),
      },
      tools: {
        select: createPostMethod<AionisToolsSelectRequest>(http, "/v1/memory/tools/select"),
        decision: createPostMethod<AionisToolsDecisionRequest>(http, "/v1/memory/tools/decision"),
        run: createPostMethod<AionisToolsRunRequest>(http, "/v1/memory/tools/run"),
        runsList: createPostMethod<AionisToolsRunsListRequest>(http, "/v1/memory/tools/runs/list"),
        feedback: createPostMethod<AionisToolsFeedbackRequest>(http, "/v1/memory/tools/feedback"),
        rehydratePayload: createPostMethod<AionisAnchorRehydratePayloadRequest>(http, "/v1/memory/tools/rehydrate_payload"),
      },
      patterns: {
        suppress: createPostMethod<AionisPatternSuppressRequest>(http, "/v1/memory/patterns/suppress"),
        unsuppress: createPostMethod<AionisPatternUnsuppressRequest>(http, "/v1/memory/patterns/unsuppress"),
      },
      anchors: {
        rehydratePayload: createPostMethod<AionisAnchorRehydratePayloadRequest>(http, "/v1/memory/anchors/rehydrate_payload"),
      },
      replay: {
        run: {
          start: createPostMethod<AionisReplayRunStartRequest>(http, "/v1/memory/replay/run/start"),
          end: createPostMethod<AionisReplayRunEndRequest>(http, "/v1/memory/replay/run/end"),
          get: createPostMethod<AionisReplayRunGetRequest>(http, "/v1/memory/replay/runs/get"),
        },
        step: {
          before: createPostMethod<AionisReplayStepBeforeRequest>(http, "/v1/memory/replay/step/before"),
          after: createPostMethod<AionisReplayStepAfterRequest>(http, "/v1/memory/replay/step/after"),
        },
        playbooks: {
          compileFromRun: createPostMethod<AionisReplayPlaybookCompileFromRunRequest>(http, "/v1/memory/replay/playbooks/compile_from_run"),
          get: createPostMethod<AionisReplayPlaybookGetRequest>(http, "/v1/memory/replay/playbooks/get"),
          candidate: createPostMethod<AionisReplayPlaybookCandidateRequest>(http, "/v1/memory/replay/playbooks/candidate"),
          promote: createPostMethod<AionisReplayPlaybookPromoteRequest>(http, "/v1/memory/replay/playbooks/promote"),
          run: createPostMethod<AionisReplayPlaybookRunRequest>(http, "/v1/memory/replay/playbooks/run"),
          dispatch: createPostMethod<AionisReplayPlaybookDispatchRequest>(http, "/v1/memory/replay/playbooks/dispatch"),
          repair: createPostMethod<AionisReplayPlaybookRepairRequest>(http, "/v1/memory/replay/playbooks/repair"),
          repairReview: createPostMethod<AionisReplayPlaybookRepairReviewRequest>(http, "/v1/memory/replay/playbooks/repair/review"),
        },
      },
      sandbox: {
        sessions: {
          create: createPostMethod<AionisSandboxSessionCreateRequest>(http, "/v1/memory/sandbox/sessions"),
        },
        execute: createPostMethod<AionisSandboxExecuteRequest>(http, "/v1/memory/sandbox/execute"),
        runs: {
          get: createPostMethod<AionisSandboxRunGetRequest>(http, "/v1/memory/sandbox/runs/get"),
          logs: createPostMethod<AionisSandboxRunLogsRequest>(http, "/v1/memory/sandbox/runs/logs"),
          artifact: createPostMethod<AionisSandboxRunArtifactRequest>(http, "/v1/memory/sandbox/runs/artifact"),
          cancel: createPostMethod<AionisSandboxRunCancelRequest>(http, "/v1/memory/sandbox/runs/cancel"),
        },
      },
    },
  };
}

export const createAionisClient = createAionisRuntimeClient;
export type AionisRuntimeClient = ReturnType<typeof createAionisRuntimeClient>;

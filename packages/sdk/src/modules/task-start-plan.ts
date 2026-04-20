import type {
  AionisActionRetrievalUncertainty,
  AionisKickoffRecommendationResponse,
  AionisPlanningContextRequest,
  AionisPlanningContextResponse,
  AionisTaskStartPlanRequest,
  AionisTaskStartPlanResponse,
} from "../contracts.js";
import { AIONIS_SHARED_ROUTE_PATHS } from "../generated/full-sdk-routes.js";
import {
  buildTaskStartAction,
  resolveKickoffGateAction,
  shouldEscalateKickoffAction,
} from "../generated/full-sdk-task-start.js";
import type { AionisHttpClient } from "../types.js";

function readPlanningSummaryUncertainty(
  response: AionisPlanningContextResponse,
): AionisActionRetrievalUncertainty | null {
  return response.planning_summary?.action_retrieval_uncertainty ?? null;
}

function readPlanningSummaryGateAction(
  response: AionisPlanningContextResponse,
): AionisTaskStartPlanResponse["gate_action"] {
  const gateAction = response.planning_summary?.action_retrieval_gate?.gate_action;
  return gateAction === "inspect_context"
    || gateAction === "widen_recall"
    || gateAction === "rehydrate_payload"
    || gateAction === "request_operator_review"
    ? gateAction
    : null;
}

export function createTaskStartPlanModule(client: AionisHttpClient) {
  return async function taskStartPlan(
    payload: AionisTaskStartPlanRequest,
  ): Promise<AionisTaskStartPlanResponse> {
    const kickoffResponse = await client.post<AionisTaskStartPlanRequest, AionisKickoffRecommendationResponse>({
      path: AIONIS_SHARED_ROUTE_PATHS.kickoffRecommendation,
      payload,
    });
    const kickoffEscalated = shouldEscalateKickoffAction({
      kickoff: kickoffResponse.kickoff_recommendation,
      uncertainty: kickoffResponse.action_retrieval_uncertainty ?? null,
    });
    const kickoffGateAction = resolveKickoffGateAction({
      kickoff: kickoffResponse.kickoff_recommendation,
      uncertainty: kickoffResponse.action_retrieval_uncertainty ?? null,
    });
    const kickoffAction = buildTaskStartAction(
      kickoffResponse.kickoff_recommendation,
      kickoffResponse.action_retrieval_uncertainty ?? null,
    );
    if (kickoffAction) {
      return {
        summary_version: "task_start_plan_v1",
        resolution_source: "kickoff",
        tenant_id: kickoffResponse.tenant_id,
        scope: kickoffResponse.scope,
        query_text: kickoffResponse.query_text,
        kickoff_recommendation: kickoffResponse.kickoff_recommendation,
        gate_action: null,
        action_retrieval_uncertainty: kickoffResponse.action_retrieval_uncertainty ?? null,
        first_action: kickoffAction,
        planner_explanation: null,
        planner_packet: null,
        rationale: kickoffResponse.rationale,
      };
    }

    const planningResponse = await client.post<AionisPlanningContextRequest, AionisPlanningContextResponse>({
      path: AIONIS_SHARED_ROUTE_PATHS.planningContext,
      payload: {
        tenant_id: payload.tenant_id,
        scope: payload.scope,
        query_text: payload.query_text,
        consumer_agent_id: payload.consumer_agent_id,
        consumer_team_id: payload.consumer_team_id,
        context: payload.context,
        tool_candidates: payload.candidates,
      },
    });
    const fallbackKickoff =
      planningResponse.kickoff_recommendation
      ?? planningResponse.planning_summary.first_step_recommendation
      ?? null;
    const planningUncertainty = readPlanningSummaryUncertainty(planningResponse);
    const gateAction =
      kickoffGateAction
      ?? readPlanningSummaryGateAction(planningResponse)
      ?? resolveKickoffGateAction({
        kickoff: fallbackKickoff,
        uncertainty: planningUncertainty,
      });

    return {
      summary_version: "task_start_plan_v1",
      resolution_source: "planning_context",
      tenant_id: payload.tenant_id ?? "default",
      scope: payload.scope ?? "default",
      query_text: payload.query_text,
      kickoff_recommendation: fallbackKickoff,
      gate_action: gateAction,
      action_retrieval_uncertainty: kickoffResponse.action_retrieval_uncertainty ?? planningUncertainty,
      first_action: buildTaskStartAction(fallbackKickoff),
      planner_explanation: planningResponse.planning_summary.planner_explanation,
      planner_packet: planningResponse.planner_packet,
      rationale: {
        summary:
          kickoffEscalated
            ? `Escalated kickoff to planning_context because action retrieval uncertainty required deeper planning${gateAction ? ` (${gateAction})` : ""}. ${planningResponse.planning_summary.planner_explanation ?? ""}`.trim()
            : (
              planningResponse.planning_summary.planner_explanation
              ?? "Used planning context to derive the first action after kickoff fallback."
            ),
      },
    };
  };
}

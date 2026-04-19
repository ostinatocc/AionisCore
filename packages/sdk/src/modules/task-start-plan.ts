import type {
  AionisKickoffRecommendationResponse,
  AionisPlanningContextRequest,
  AionisPlanningContextResponse,
  AionisTaskStartPlanRequest,
  AionisTaskStartPlanResponse,
} from "../contracts.js";
import { AIONIS_SHARED_ROUTE_PATHS } from "../generated/full-sdk-routes.js";
import { buildTaskStartAction } from "../generated/full-sdk-task-start.js";
import type { AionisHttpClient } from "../types.js";

export function createTaskStartPlanModule(client: AionisHttpClient) {
  return async function taskStartPlan(
    payload: AionisTaskStartPlanRequest,
  ): Promise<AionisTaskStartPlanResponse> {
    const kickoffResponse = await client.post<AionisTaskStartPlanRequest, AionisKickoffRecommendationResponse>({
      path: AIONIS_SHARED_ROUTE_PATHS.kickoffRecommendation,
      payload,
    });
    const kickoffAction = buildTaskStartAction(kickoffResponse.kickoff_recommendation);
    if (kickoffAction) {
      return {
        summary_version: "task_start_plan_v1",
        resolution_source: "kickoff",
        tenant_id: kickoffResponse.tenant_id,
        scope: kickoffResponse.scope,
        query_text: kickoffResponse.query_text,
        kickoff_recommendation: kickoffResponse.kickoff_recommendation,
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

    return {
      summary_version: "task_start_plan_v1",
      resolution_source: "planning_context",
      tenant_id: payload.tenant_id ?? "default",
      scope: payload.scope ?? "default",
      query_text: payload.query_text,
      kickoff_recommendation: fallbackKickoff,
      first_action: buildTaskStartAction(fallbackKickoff),
      planner_explanation: planningResponse.planning_summary.planner_explanation,
      planner_packet: planningResponse.planner_packet,
      rationale: {
        summary:
          planningResponse.planning_summary.planner_explanation
          ?? "Used planning context to derive the first action after kickoff fallback.",
      },
    };
  };
}

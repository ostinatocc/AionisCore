import type {
  AionisKickoffRecommendation,
  AionisKickoffRecommendationResponse,
  AionisTaskStartAction,
  AionisTaskStartResponse,
} from "./contracts.js";

export function buildTaskStartAction(
  kickoff: AionisKickoffRecommendation | null | undefined,
): AionisTaskStartAction | null {
  if (!kickoff?.selected_tool) return null;
  return {
    action_kind: kickoff.file_path ? "file_step" : "tool_step",
    source_kind: kickoff.source_kind,
    history_applied: kickoff.history_applied,
    selected_tool: kickoff.selected_tool,
    file_path: kickoff.file_path,
    next_action: kickoff.next_action,
  };
}

export function toTaskStartResponse(
  response: AionisKickoffRecommendationResponse,
): AionisTaskStartResponse {
  return {
    ...response,
    summary_version: "task_start_v1",
    first_action: buildTaskStartAction(response.kickoff_recommendation),
  };
}

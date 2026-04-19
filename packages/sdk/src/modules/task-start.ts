import type {
  AionisKickoffRecommendationResponse,
  AionisTaskStartRequest,
  AionisTaskStartResponse,
} from "../contracts.js";
import { AIONIS_SHARED_ROUTE_PATHS } from "../generated/full-sdk-routes.js";
import { toTaskStartResponse } from "../generated/full-sdk-task-start.js";
import type { AionisHttpClient } from "../types.js";

export function createTaskStartModule(client: AionisHttpClient) {
  return async function taskStart(
    payload: AionisTaskStartRequest,
  ): Promise<AionisTaskStartResponse> {
    const response = await client.post<AionisTaskStartRequest, AionisKickoffRecommendationResponse>({
      path: AIONIS_SHARED_ROUTE_PATHS.kickoffRecommendation,
      payload,
    });
    return toTaskStartResponse(response);
  };
}

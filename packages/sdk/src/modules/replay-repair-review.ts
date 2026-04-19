import type { AionisReplayRepairReviewRequest, AionisReplayRepairReviewResponse } from "../contracts.js";
import { AIONIS_SHARED_ROUTE_PATHS } from "../generated/full-sdk-routes.js";
import type { AionisHttpClient } from "../types.js";

export function createReplayRepairReviewModule(client: AionisHttpClient) {
  return async function repairReview(
    payload: AionisReplayRepairReviewRequest,
  ): Promise<AionisReplayRepairReviewResponse> {
    return await client.post<AionisReplayRepairReviewRequest, AionisReplayRepairReviewResponse>({
      path: AIONIS_SHARED_ROUTE_PATHS.replayPlaybookRepairReview,
      payload,
    });
  };
}

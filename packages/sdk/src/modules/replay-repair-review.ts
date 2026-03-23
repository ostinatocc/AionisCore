import type { AionisReplayRepairReviewRequest, AionisReplayRepairReviewResponse } from "../contracts.js";
import type { AionisHttpClient } from "../types.js";

export function createReplayRepairReviewModule(client: AionisHttpClient) {
  return async function repairReview(
    payload: AionisReplayRepairReviewRequest,
  ): Promise<AionisReplayRepairReviewResponse> {
    return await client.post<AionisReplayRepairReviewRequest, AionisReplayRepairReviewResponse>({
      path: "/v1/memory/replay/playbooks/repair/review",
      payload,
    });
  };
}

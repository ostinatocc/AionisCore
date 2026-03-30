import type {
  AionisKickoffRecommendationRequest,
  AionisKickoffRecommendationResponse,
} from "../contracts.js";
import type { AionisHttpClient } from "../types.js";

export function createKickoffRecommendationModule(client: AionisHttpClient) {
  return async function kickoffRecommendation(
    payload: AionisKickoffRecommendationRequest,
  ): Promise<AionisKickoffRecommendationResponse> {
    return await client.post<AionisKickoffRecommendationRequest, AionisKickoffRecommendationResponse>({
      path: "/v1/memory/kickoff/recommendation",
      payload,
    });
  };
}

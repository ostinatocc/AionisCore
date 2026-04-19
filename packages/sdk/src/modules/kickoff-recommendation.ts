import type {
  AionisKickoffRecommendationRequest,
  AionisKickoffRecommendationResponse,
} from "../contracts.js";
import { AIONIS_SHARED_ROUTE_PATHS } from "../generated/full-sdk-routes.js";
import type { AionisHttpClient } from "../types.js";

export function createKickoffRecommendationModule(client: AionisHttpClient) {
  return async function kickoffRecommendation(
    payload: AionisKickoffRecommendationRequest,
  ): Promise<AionisKickoffRecommendationResponse> {
    return await client.post<AionisKickoffRecommendationRequest, AionisKickoffRecommendationResponse>({
      path: AIONIS_SHARED_ROUTE_PATHS.kickoffRecommendation,
      payload,
    });
  };
}

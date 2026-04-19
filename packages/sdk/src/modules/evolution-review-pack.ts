import type { AionisEvolutionReviewPackRequest, AionisEvolutionReviewPackResponse } from "../contracts.js";
import { AIONIS_SHARED_ROUTE_PATHS } from "../generated/full-sdk-routes.js";
import type { AionisHttpClient } from "../types.js";

export function createEvolutionReviewPackModule(client: AionisHttpClient) {
  return async function evolutionReview(
    payload: AionisEvolutionReviewPackRequest,
  ): Promise<AionisEvolutionReviewPackResponse> {
    return await client.post<AionisEvolutionReviewPackRequest, AionisEvolutionReviewPackResponse>({
      path: AIONIS_SHARED_ROUTE_PATHS.evolutionReviewPack,
      payload,
    });
  };
}

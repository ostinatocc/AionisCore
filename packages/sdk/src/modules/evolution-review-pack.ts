import type { AionisEvolutionReviewPackRequest, AionisEvolutionReviewPackResponse } from "../contracts.js";
import type { AionisHttpClient } from "../types.js";

export function createEvolutionReviewPackModule(client: AionisHttpClient) {
  return async function evolutionReview(
    payload: AionisEvolutionReviewPackRequest,
  ): Promise<AionisEvolutionReviewPackResponse> {
    return await client.post<AionisEvolutionReviewPackRequest, AionisEvolutionReviewPackResponse>({
      path: "/v1/memory/evolution/review-pack",
      payload,
    });
  };
}

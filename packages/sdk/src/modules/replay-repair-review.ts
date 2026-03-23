import type { AionisHttpClient, AionisRequestPayload, AionisResponsePayload } from "../types.js";

export function createReplayRepairReviewModule(client: AionisHttpClient) {
  return async function repairReview<
    TRequest extends AionisRequestPayload,
    TResponse = AionisResponsePayload,
  >(payload: TRequest): Promise<TResponse> {
    return await client.post<TRequest, TResponse>({
      path: "/v1/memory/replay/playbooks/repair/review",
      payload,
    });
  };
}

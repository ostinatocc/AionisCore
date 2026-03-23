import type { AionisHttpClient, AionisRequestPayload, AionisResponsePayload } from "../types.js";

export function createAnchorsRehydratePayloadModule(client: AionisHttpClient) {
  return async function rehydratePayload<
    TRequest extends AionisRequestPayload,
    TResponse = AionisResponsePayload,
  >(payload: TRequest): Promise<TResponse> {
    return await client.post<TRequest, TResponse>({
      path: "/v1/memory/anchors/rehydrate_payload",
      payload,
    });
  };
}

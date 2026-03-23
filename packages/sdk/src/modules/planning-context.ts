import type { AionisHttpClient, AionisRequestPayload, AionisResponsePayload } from "../types.js";

export function createPlanningContextModule(client: AionisHttpClient) {
  return async function planningContext<
    TRequest extends AionisRequestPayload,
    TResponse = AionisResponsePayload,
  >(payload: TRequest): Promise<TResponse> {
    return await client.post<TRequest, TResponse>({
      path: "/v1/memory/planning/context",
      payload,
    });
  };
}

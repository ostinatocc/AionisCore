import type { AionisHttpClient, AionisRequestPayload, AionisResponsePayload } from "../types.js";

export function createExecutionIntrospectModule(client: AionisHttpClient) {
  return async function executionIntrospect<
    TRequest extends AionisRequestPayload,
    TResponse = AionisResponsePayload,
  >(payload: TRequest): Promise<TResponse> {
    return await client.post<TRequest, TResponse>({
      path: "/v1/memory/execution/introspect",
      payload,
    });
  };
}

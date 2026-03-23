import type { AionisExecutionIntrospectRequest, AionisExecutionIntrospectResponse } from "../contracts.js";
import type { AionisHttpClient } from "../types.js";

export function createExecutionIntrospectModule(client: AionisHttpClient) {
  return async function executionIntrospect(
    payload: AionisExecutionIntrospectRequest,
  ): Promise<AionisExecutionIntrospectResponse> {
    return await client.post<AionisExecutionIntrospectRequest, AionisExecutionIntrospectResponse>({
      path: "/v1/memory/execution/introspect",
      payload,
    });
  };
}

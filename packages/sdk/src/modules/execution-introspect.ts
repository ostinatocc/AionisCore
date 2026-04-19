import type { AionisExecutionIntrospectRequest, AionisExecutionIntrospectResponse } from "../contracts.js";
import { AIONIS_SHARED_ROUTE_PATHS } from "../generated/full-sdk-routes.js";
import type { AionisHttpClient } from "../types.js";

export function createExecutionIntrospectModule(client: AionisHttpClient) {
  return async function executionIntrospect(
    payload: AionisExecutionIntrospectRequest,
  ): Promise<AionisExecutionIntrospectResponse> {
    return await client.post<AionisExecutionIntrospectRequest, AionisExecutionIntrospectResponse>({
      path: AIONIS_SHARED_ROUTE_PATHS.executionIntrospect,
      payload,
    });
  };
}

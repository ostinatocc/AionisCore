import type { AionisAgentMemoryInspectRequest, AionisAgentMemoryInspectResponse } from "../contracts.js";
import { AIONIS_SHARED_ROUTE_PATHS } from "../generated/full-sdk-routes.js";
import type { AionisHttpClient } from "../types.js";

export function createAgentMemoryInspectModule(client: AionisHttpClient) {
  return async function inspect(
    payload: AionisAgentMemoryInspectRequest,
  ): Promise<AionisAgentMemoryInspectResponse> {
    return await client.post<AionisAgentMemoryInspectRequest, AionisAgentMemoryInspectResponse>({
      path: AIONIS_SHARED_ROUTE_PATHS.agentInspect,
      payload,
    });
  };
}

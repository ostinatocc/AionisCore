import type { AionisAgentMemoryInspectRequest, AionisAgentMemoryInspectResponse } from "../contracts.js";
import type { AionisHttpClient } from "../types.js";

export function createAgentMemoryInspectModule(client: AionisHttpClient) {
  return async function inspect(
    payload: AionisAgentMemoryInspectRequest,
  ): Promise<AionisAgentMemoryInspectResponse> {
    return await client.post<AionisAgentMemoryInspectRequest, AionisAgentMemoryInspectResponse>({
      path: "/v1/memory/agent/inspect",
      payload,
    });
  };
}

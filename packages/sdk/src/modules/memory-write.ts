import type { AionisMemoryWriteRequest, AionisMemoryWriteResponse } from "../contracts.js";
import type { AionisHttpClient } from "../types.js";

export function createMemoryWriteModule(client: AionisHttpClient) {
  return async function write(payload: AionisMemoryWriteRequest): Promise<AionisMemoryWriteResponse> {
    return await client.post<AionisMemoryWriteRequest, AionisMemoryWriteResponse>({
      path: "/v1/memory/write",
      payload,
    });
  };
}

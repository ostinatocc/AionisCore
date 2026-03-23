import type { AionisContextAssembleRequest, AionisContextAssembleResponse } from "../contracts.js";
import type { AionisHttpClient } from "../types.js";

export function createContextAssembleModule(client: AionisHttpClient) {
  return async function contextAssemble(
    payload: AionisContextAssembleRequest,
  ): Promise<AionisContextAssembleResponse> {
    return await client.post<AionisContextAssembleRequest, AionisContextAssembleResponse>({
      path: "/v1/memory/context/assemble",
      payload,
    });
  };
}

import type { AionisContextAssembleRequest, AionisContextAssembleResponse } from "../contracts.js";
import { AIONIS_SHARED_ROUTE_PATHS } from "../generated/full-sdk-routes.js";
import type { AionisHttpClient } from "../types.js";

export function createContextAssembleModule(client: AionisHttpClient) {
  return async function contextAssemble(
    payload: AionisContextAssembleRequest,
  ): Promise<AionisContextAssembleResponse> {
    return await client.post<AionisContextAssembleRequest, AionisContextAssembleResponse>({
      path: AIONIS_SHARED_ROUTE_PATHS.contextAssemble,
      payload,
    });
  };
}

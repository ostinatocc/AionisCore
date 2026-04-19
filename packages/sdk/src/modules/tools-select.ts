import type { AionisToolsSelectRequest, AionisToolsSelectResponse } from "../contracts.js";
import { AIONIS_SHARED_ROUTE_PATHS } from "../generated/full-sdk-routes.js";
import type { AionisHttpClient } from "../types.js";

export function createToolsSelectModule(client: AionisHttpClient) {
  return async function selectTool(payload: AionisToolsSelectRequest): Promise<AionisToolsSelectResponse> {
    return await client.post<AionisToolsSelectRequest, AionisToolsSelectResponse>({
      path: AIONIS_SHARED_ROUTE_PATHS.toolsSelect,
      payload,
    });
  };
}

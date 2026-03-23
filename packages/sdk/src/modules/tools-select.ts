import type { AionisToolsSelectRequest, AionisToolsSelectResponse } from "../contracts.js";
import type { AionisHttpClient } from "../types.js";

export function createToolsSelectModule(client: AionisHttpClient) {
  return async function selectTool(payload: AionisToolsSelectRequest): Promise<AionisToolsSelectResponse> {
    return await client.post<AionisToolsSelectRequest, AionisToolsSelectResponse>({
      path: "/v1/memory/tools/select",
      payload,
    });
  };
}

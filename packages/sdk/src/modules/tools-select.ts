import type { AionisHttpClient, AionisRequestPayload, AionisResponsePayload } from "../types.js";

export function createToolsSelectModule(client: AionisHttpClient) {
  return async function selectTool<
    TRequest extends AionisRequestPayload,
    TResponse = AionisResponsePayload,
  >(payload: TRequest): Promise<TResponse> {
    return await client.post<TRequest, TResponse>({
      path: "/v1/memory/tools/select",
      payload,
    });
  };
}

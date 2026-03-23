import type { AionisHttpClient, AionisRequestPayload, AionisResponsePayload } from "../types.js";

export function createToolsFeedbackModule(client: AionisHttpClient) {
  return async function feedback<
    TRequest extends AionisRequestPayload,
    TResponse = AionisResponsePayload,
  >(payload: TRequest): Promise<TResponse> {
    return await client.post<TRequest, TResponse>({
      path: "/v1/memory/tools/feedback",
      payload,
    });
  };
}

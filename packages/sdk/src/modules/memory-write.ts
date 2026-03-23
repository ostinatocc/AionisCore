import type { AionisHttpClient, AionisRequestPayload, AionisResponsePayload } from "../types.js";

export function createMemoryWriteModule(client: AionisHttpClient) {
  return async function write<
    TRequest extends AionisRequestPayload,
    TResponse = AionisResponsePayload,
  >(payload: TRequest): Promise<TResponse> {
    return await client.post<TRequest, TResponse>({
      path: "/v1/memory/write",
      payload,
    });
  };
}

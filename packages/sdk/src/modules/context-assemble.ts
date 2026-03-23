import type { AionisHttpClient, AionisRequestPayload, AionisResponsePayload } from "../types.js";

export function createContextAssembleModule(client: AionisHttpClient) {
  return async function contextAssemble<
    TRequest extends AionisRequestPayload,
    TResponse = AionisResponsePayload,
  >(payload: TRequest): Promise<TResponse> {
    return await client.post<TRequest, TResponse>({
      path: "/v1/memory/context/assemble",
      payload,
    });
  };
}

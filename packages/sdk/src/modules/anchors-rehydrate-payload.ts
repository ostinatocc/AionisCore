import type {
  AionisAnchorsRehydratePayloadRequest,
  AionisAnchorsRehydratePayloadResponse,
} from "../contracts.js";
import type { AionisHttpClient } from "../types.js";

export function createAnchorsRehydratePayloadModule(client: AionisHttpClient) {
  return async function rehydratePayload(
    payload: AionisAnchorsRehydratePayloadRequest,
  ): Promise<AionisAnchorsRehydratePayloadResponse> {
    return await client.post<AionisAnchorsRehydratePayloadRequest, AionisAnchorsRehydratePayloadResponse>({
      path: "/v1/memory/anchors/rehydrate_payload",
      payload,
    });
  };
}

import type {
  AionisAnchorsRehydratePayloadRequest,
  AionisAnchorsRehydratePayloadResponse,
} from "../contracts.js";
import { AIONIS_SHARED_ROUTE_PATHS } from "../generated/full-sdk-routes.js";
import type { AionisHttpClient } from "../types.js";

export function createAnchorsRehydratePayloadModule(client: AionisHttpClient) {
  return async function rehydratePayload(
    payload: AionisAnchorsRehydratePayloadRequest,
  ): Promise<AionisAnchorsRehydratePayloadResponse> {
    return await client.post<AionisAnchorsRehydratePayloadRequest, AionisAnchorsRehydratePayloadResponse>({
      path: AIONIS_SHARED_ROUTE_PATHS.anchorsRehydratePayload,
      payload,
    });
  };
}

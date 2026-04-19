import type { AionisPlanningContextRequest, AionisPlanningContextResponse } from "../contracts.js";
import { AIONIS_SHARED_ROUTE_PATHS } from "../generated/full-sdk-routes.js";
import type { AionisHttpClient } from "../types.js";

export function createPlanningContextModule(client: AionisHttpClient) {
  return async function planningContext(
    payload: AionisPlanningContextRequest,
  ): Promise<AionisPlanningContextResponse> {
    return await client.post<AionisPlanningContextRequest, AionisPlanningContextResponse>({
      path: AIONIS_SHARED_ROUTE_PATHS.planningContext,
      payload,
    });
  };
}

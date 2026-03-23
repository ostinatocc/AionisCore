import type { AionisPlanningContextRequest, AionisPlanningContextResponse } from "../contracts.js";
import type { AionisHttpClient } from "../types.js";

export function createPlanningContextModule(client: AionisHttpClient) {
  return async function planningContext(
    payload: AionisPlanningContextRequest,
  ): Promise<AionisPlanningContextResponse> {
    return await client.post<AionisPlanningContextRequest, AionisPlanningContextResponse>({
      path: "/v1/memory/planning/context",
      payload,
    });
  };
}

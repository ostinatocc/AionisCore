import type { AionisToolsFeedbackRequest, AionisToolsFeedbackResponse } from "../contracts.js";
import { AIONIS_SHARED_ROUTE_PATHS } from "../generated/full-sdk-routes.js";
import type { AionisHttpClient } from "../types.js";

export function createToolsFeedbackModule(client: AionisHttpClient) {
  return async function feedback(payload: AionisToolsFeedbackRequest): Promise<AionisToolsFeedbackResponse> {
    return await client.post<AionisToolsFeedbackRequest, AionisToolsFeedbackResponse>({
      path: AIONIS_SHARED_ROUTE_PATHS.toolsFeedback,
      payload,
    });
  };
}

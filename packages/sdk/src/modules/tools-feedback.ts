import type { AionisToolsFeedbackRequest, AionisToolsFeedbackResponse } from "../contracts.js";
import type { AionisHttpClient } from "../types.js";

export function createToolsFeedbackModule(client: AionisHttpClient) {
  return async function feedback(payload: AionisToolsFeedbackRequest): Promise<AionisToolsFeedbackResponse> {
    return await client.post<AionisToolsFeedbackRequest, AionisToolsFeedbackResponse>({
      path: "/v1/memory/tools/feedback",
      payload,
    });
  };
}

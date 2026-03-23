import { createAnchorsRehydratePayloadModule } from "./modules/anchors-rehydrate-payload.js";
import { createContextAssembleModule } from "./modules/context-assemble.js";
import { createExecutionIntrospectModule } from "./modules/execution-introspect.js";
import { createMemoryWriteModule } from "./modules/memory-write.js";
import { createPlanningContextModule } from "./modules/planning-context.js";
import { createReplayRepairReviewModule } from "./modules/replay-repair-review.js";
import { createToolsFeedbackModule } from "./modules/tools-feedback.js";
import { createToolsSelectModule } from "./modules/tools-select.js";
import { createAionisHttpClient } from "./transport/http.js";
import type { AionisClientOptions } from "./types.js";

export function createAionisClient(options: AionisClientOptions) {
  const http = createAionisHttpClient(options);

  return {
    memory: {
      write: createMemoryWriteModule(http),
      planningContext: createPlanningContextModule(http),
      contextAssemble: createContextAssembleModule(http),
      executionIntrospect: createExecutionIntrospectModule(http),
      tools: {
        select: createToolsSelectModule(http),
        feedback: createToolsFeedbackModule(http),
      },
      replay: {
        repairReview: createReplayRepairReviewModule(http),
      },
      anchors: {
        rehydratePayload: createAnchorsRehydratePayloadModule(http),
      },
    },
  };
}

export type AionisClient = ReturnType<typeof createAionisClient>;

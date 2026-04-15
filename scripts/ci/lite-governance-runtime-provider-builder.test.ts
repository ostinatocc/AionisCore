import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { buildLiteGovernanceRuntimeProviders } from "../../src/app/governance-runtime-providers.ts";

const TEST_GOVERNANCE_HTTP_TIMEOUT_MS = 5000;

function buildEnv(overrides: Record<string, unknown> = {}) {
  return {
    REPLAY_GOVERNANCE_STATIC_PROMOTE_MEMORY_PROVIDER_ENABLED: false,
    REPLAY_GOVERNANCE_MOCK_MODEL_PROMOTE_MEMORY_PROVIDER_ENABLED: false,
    REPLAY_GOVERNANCE_HTTP_MODEL_PROMOTE_MEMORY_PROVIDER_ENABLED: false,
    WORKFLOW_GOVERNANCE_STATIC_PROMOTE_MEMORY_PROVIDER_ENABLED: false,
    WORKFLOW_GOVERNANCE_MOCK_MODEL_PROMOTE_MEMORY_PROVIDER_ENABLED: false,
    WORKFLOW_GOVERNANCE_HTTP_MODEL_PROMOTE_MEMORY_PROVIDER_ENABLED: false,
    TOOLS_GOVERNANCE_STATIC_FORM_PATTERN_PROVIDER_ENABLED: false,
    TOOLS_GOVERNANCE_MOCK_MODEL_FORM_PATTERN_PROVIDER_ENABLED: false,
    TOOLS_GOVERNANCE_HTTP_MODEL_FORM_PATTERN_PROVIDER_ENABLED: false,
    GOVERNANCE_MODEL_CLIENT_BASE_URL: "",
    GOVERNANCE_MODEL_CLIENT_API_KEY: "",
    GOVERNANCE_MODEL_CLIENT_MODEL: "",
    GOVERNANCE_MODEL_CLIENT_TIMEOUT_MS: TEST_GOVERNANCE_HTTP_TIMEOUT_MS,
    GOVERNANCE_MODEL_CLIENT_MAX_TOKENS: 200,
    GOVERNANCE_MODEL_CLIENT_TEMPERATURE: 0,
    ...overrides,
  } as any;
}

async function withChatCompletionStub(
  handler: (body: any) => unknown,
  fn: (baseUrl: string) => Promise<void>,
) {
  const app = Fastify();
  app.post("/chat/completions", async (request) => {
    const content = handler(request.body);
    return {
      choices: [
        {
          message: {
            content: typeof content === "string" ? content : JSON.stringify(content),
          },
        },
      ],
    };
  });
  const address = await app.listen({ host: "127.0.0.1", port: 0 });
  try {
    await fn(address);
  } finally {
    await app.close();
  }
}

test("lite governance runtime builder returns empty groups when all gates are off", () => {
  const providers = buildLiteGovernanceRuntimeProviders(buildEnv());
  assert.deepEqual(providers, {});
});

test("lite governance runtime builder returns replay workflow and tools provider groups when gates are on", () => {
  const providers = buildLiteGovernanceRuntimeProviders(buildEnv({
    REPLAY_GOVERNANCE_STATIC_PROMOTE_MEMORY_PROVIDER_ENABLED: true,
    WORKFLOW_GOVERNANCE_STATIC_PROMOTE_MEMORY_PROVIDER_ENABLED: true,
    TOOLS_GOVERNANCE_STATIC_FORM_PATTERN_PROVIDER_ENABLED: true,
  }));

  assert.equal(typeof providers.replayRepairReview?.promote_memory?.resolveReviewResult, "function");
  assert.equal(typeof providers.workflowProjection?.promote_memory?.resolveReviewResult, "function");
  assert.equal(typeof providers.toolsFeedback?.form_pattern?.resolveReviewResult, "function");
});

test("lite governance runtime builder prefers mock-model-backed providers over static fallback", async () => {
  const providers = buildLiteGovernanceRuntimeProviders(buildEnv({
    REPLAY_GOVERNANCE_STATIC_PROMOTE_MEMORY_PROVIDER_ENABLED: true,
    REPLAY_GOVERNANCE_MOCK_MODEL_PROMOTE_MEMORY_PROVIDER_ENABLED: true,
    WORKFLOW_GOVERNANCE_STATIC_PROMOTE_MEMORY_PROVIDER_ENABLED: true,
    WORKFLOW_GOVERNANCE_MOCK_MODEL_PROMOTE_MEMORY_PROVIDER_ENABLED: true,
    TOOLS_GOVERNANCE_STATIC_FORM_PATTERN_PROVIDER_ENABLED: true,
    TOOLS_GOVERNANCE_MOCK_MODEL_FORM_PATTERN_PROVIDER_ENABLED: true,
  }));

  const replayReview = await providers.replayRepairReview?.promote_memory?.resolveReviewResult({
    reviewPacket: {
      deterministic_gate: { gate_satisfied: true },
      requested_target_kind: "workflow",
      requested_target_level: "L2",
      candidate_examples: [{ workflow_signature: "wf:test" }],
    } as any,
    suppliedReviewResult: null,
  });
  const workflowReview = await providers.workflowProjection?.promote_memory?.resolveReviewResult({
    reviewPacket: {
      deterministic_gate: { gate_satisfied: true },
      requested_target_kind: "workflow",
      requested_target_level: "L2",
      candidate_examples: [{ workflow_signature: "wf:test" }],
    } as any,
    suppliedReviewResult: null,
  });
  const toolsReview = await providers.toolsFeedback?.form_pattern?.resolveReviewResult({
    reviewPacket: {
      deterministic_gate: { gate_satisfied: true },
    } as any,
    suppliedReviewResult: null,
  });

  assert.equal(replayReview?.adjudication.reason, "mock model found workflow-signature evidence");
  assert.equal(workflowReview?.adjudication.reason, "mock model found workflow-signature evidence");
  assert.equal(toolsReview?.adjudication.reason, "mock model found grouped signature evidence");
});

test("lite governance runtime builder can use injected custom model client factory override", async () => {
  const providers = buildLiteGovernanceRuntimeProviders(buildEnv({
    REPLAY_GOVERNANCE_STATIC_PROMOTE_MEMORY_PROVIDER_ENABLED: true,
  }), {
    modelClientFactory: ({ operation }) =>
      operation === "promote_memory"
        ? {
            reviewPromoteMemory: () => ({
              review_version: "promote_memory_semantic_review_v1",
              adjudication: {
                operation: "promote_memory",
                disposition: "recommend",
                target_kind: "workflow",
                target_level: "L2",
                reason: "runtime custom factory",
                confidence: 0.95,
                strategic_value: "high",
              },
            }),
          }
        : undefined,
    modelClientModes: {
      replayRepairReview: {
        promote_memory: "custom",
      },
    },
  });

  const review = await providers.replayRepairReview?.promote_memory?.resolveReviewResult({
    reviewPacket: {
      deterministic_gate: { gate_satisfied: true },
      requested_target_kind: "workflow",
      requested_target_level: "L2",
      candidate_examples: [{ workflow_signature: "wf:test" }],
    } as any,
    suppliedReviewResult: null,
  });

  assert.equal(review?.adjudication.reason, "runtime custom factory");
});

test("lite governance runtime builder can use http-backed providers", async () => {
  await withChatCompletionStub(
    (body) => {
      const raw = body?.messages?.[1]?.content;
      const parsed = typeof raw === "string" ? JSON.parse(raw) : {};
      if (parsed.operation === "form_pattern") {
        return {
          review_version: "form_pattern_semantic_review_v1",
          adjudication: {
            operation: "form_pattern",
            disposition: "recommend",
            target_kind: "pattern",
            target_level: "L3",
            reason: "runtime http form_pattern",
            confidence: 0.94,
          },
        };
      }
      return {
        review_version: "promote_memory_semantic_review_v1",
        adjudication: {
          operation: "promote_memory",
          disposition: "recommend",
          target_kind: "workflow",
          target_level: "L2",
          reason: "runtime http promote_memory",
          confidence: 0.95,
          strategic_value: "high",
        },
      };
    },
    async (baseUrl) => {
      const providers = buildLiteGovernanceRuntimeProviders(buildEnv({
        REPLAY_GOVERNANCE_HTTP_MODEL_PROMOTE_MEMORY_PROVIDER_ENABLED: true,
        WORKFLOW_GOVERNANCE_HTTP_MODEL_PROMOTE_MEMORY_PROVIDER_ENABLED: true,
        TOOLS_GOVERNANCE_HTTP_MODEL_FORM_PATTERN_PROVIDER_ENABLED: true,
        GOVERNANCE_MODEL_CLIENT_BASE_URL: baseUrl,
        GOVERNANCE_MODEL_CLIENT_API_KEY: "test-key",
        GOVERNANCE_MODEL_CLIENT_MODEL: "test-model",
      }));

      const replayReview = await providers.replayRepairReview?.promote_memory?.resolveReviewResult({
        reviewPacket: {
          deterministic_gate: { gate_satisfied: true },
          requested_target_kind: "workflow",
          requested_target_level: "L2",
          candidate_examples: [{ workflow_signature: "wf:test" }],
        } as any,
        suppliedReviewResult: null,
      });
      const toolsReview = await providers.toolsFeedback?.form_pattern?.resolveReviewResult({
        reviewPacket: {
          deterministic_gate: { gate_satisfied: true },
        } as any,
        suppliedReviewResult: null,
      });

      assert.equal(replayReview?.adjudication.reason, "runtime http promote_memory");
      assert.equal(toolsReview?.adjudication.reason, "runtime http form_pattern");
    },
  );
});

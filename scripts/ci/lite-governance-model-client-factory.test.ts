import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { buildLiteGovernanceModelClient } from "../../src/memory/governance-model-client-factory.ts";

const TEST_GOVERNANCE_HTTP_TIMEOUT_MS = 5000;

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

test("lite governance model client factory returns empty client when all modes are off", () => {
  const client = buildLiteGovernanceModelClient({});
  assert.deepEqual(client, {});
});

test("lite governance model client factory can build promote_memory mock resolver", () => {
  const client = buildLiteGovernanceModelClient({
    promoteMemory: {
      mode: "mock",
    },
  });

  const review = client.reviewPromoteMemory?.({
    reviewPacket: {
      deterministic_gate: { gate_satisfied: true },
      requested_target_kind: "workflow",
      requested_target_level: "L2",
      candidate_examples: [{ workflow_signature: "wf:test" }],
    } as any,
    suppliedReviewResult: null,
  });

  assert.equal(review?.adjudication.reason, "mock model found workflow-signature evidence");
});

test("lite governance model client factory can build promote_memory builtin resolver", () => {
  const client = buildLiteGovernanceModelClient({
    promoteMemory: {
      mode: "builtin",
    },
  });

  const review = client.reviewPromoteMemory?.({
    reviewPacket: {
      deterministic_gate: { gate_satisfied: true },
      requested_target_kind: "workflow",
      requested_target_level: "L2",
      candidate_examples: [{ workflow_signature: "wf:test" }],
    } as any,
    suppliedReviewResult: null,
  });

  assert.equal(review?.adjudication.reason, "mock model found workflow-signature evidence");
});

test("lite governance model client factory can build form_pattern mock resolver", () => {
  const client = buildLiteGovernanceModelClient({
    formPattern: {
      mode: "mock",
    },
  });

  const review = client.reviewFormPattern?.({
    reviewPacket: {
      deterministic_gate: { gate_satisfied: true },
    } as any,
    suppliedReviewResult: null,
  });

  assert.equal(review?.adjudication.reason, "mock model found grouped signature evidence");
});

test("lite governance model client factory can build form_pattern builtin resolver", () => {
  const client = buildLiteGovernanceModelClient({
    formPattern: {
      mode: "builtin",
    },
  });

  const review = client.reviewFormPattern?.({
    reviewPacket: {
      deterministic_gate: { gate_satisfied: true },
    } as any,
    suppliedReviewResult: null,
  });

  assert.equal(review?.adjudication.reason, "mock model found grouped signature evidence");
});

test("lite governance model client factory can build combined mock client", () => {
  const client = buildLiteGovernanceModelClient({
    promoteMemory: {
      mode: "mock",
    },
    formPattern: {
      mode: "mock",
    },
  });

  assert.equal(typeof client.reviewPromoteMemory, "function");
  assert.equal(typeof client.reviewFormPattern, "function");
});

test("lite governance model client factory can build promote_memory http resolver", async () => {
  await withChatCompletionStub(
    () => ({
      review_version: "promote_memory_semantic_review_v1",
      adjudication: {
        operation: "promote_memory",
        disposition: "recommend",
        target_kind: "workflow",
        target_level: "L2",
        reason: "factory http promote_memory",
        confidence: 0.96,
        strategic_value: "high",
      },
    }),
    async (baseUrl) => {
      const client = buildLiteGovernanceModelClient({
        promoteMemory: {
          mode: "http",
        },
      }, {
        httpClientConfig: {
          baseUrl,
          apiKey: "test-key",
          model: "test-model",
          timeoutMs: TEST_GOVERNANCE_HTTP_TIMEOUT_MS,
          maxTokens: 200,
          temperature: 0,
        },
      });

      const review = await client.reviewPromoteMemory?.({
        reviewPacket: {
          deterministic_gate: { gate_satisfied: true },
          requested_target_kind: "workflow",
          requested_target_level: "L2",
          candidate_examples: [{ workflow_signature: "wf:test" }],
        } as any,
        suppliedReviewResult: null,
      });

      assert.equal(review?.adjudication.reason, "factory http promote_memory");
    },
  );
});

test("lite governance model client factory can use injected custom factory", () => {
  const client = buildLiteGovernanceModelClient({
    promoteMemory: {
      mode: "custom",
    },
  }, {
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
                reason: "custom factory",
                confidence: 0.99,
                strategic_value: "high",
              },
            }),
          }
        : undefined,
  });

  const review = client.reviewPromoteMemory?.({
    reviewPacket: {} as any,
    suppliedReviewResult: null,
  });

  assert.equal(review?.adjudication.reason, "custom factory");
});

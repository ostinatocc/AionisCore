import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import {
  createHttpFormPatternGovernanceModelClient,
  createHttpPromoteMemoryGovernanceModelClient,
} from "../../src/memory/governance-model-client-http.ts";

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

test("http promote_memory governance client can parse a valid review result", async () => {
  await withChatCompletionStub(
    () => ({
      review_version: "promote_memory_semantic_review_v1",
      adjudication: {
        operation: "promote_memory",
        disposition: "recommend",
        target_kind: "workflow",
        target_level: "L2",
        reason: "http test promote_memory review",
        confidence: 0.94,
        strategic_value: "high",
      },
    }),
    async (baseUrl) => {
      const client = createHttpPromoteMemoryGovernanceModelClient({
        baseUrl,
        apiKey: "test-key",
        model: "test-model",
        timeoutMs: 1000,
        maxTokens: 200,
        temperature: 0,
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
      assert.equal(review?.adjudication.reason, "http test promote_memory review");
    },
  );
});

test("http form_pattern governance client can parse a valid review result", async () => {
  await withChatCompletionStub(
    () => ({
      review_version: "form_pattern_semantic_review_v1",
      adjudication: {
        operation: "form_pattern",
        disposition: "recommend",
        target_kind: "pattern",
        target_level: "L3",
        reason: "http test form_pattern review",
        confidence: 0.93,
      },
    }),
    async (baseUrl) => {
      const client = createHttpFormPatternGovernanceModelClient({
        baseUrl,
        apiKey: "test-key",
        model: "test-model",
        timeoutMs: 1000,
        maxTokens: 200,
        temperature: 0,
      });
      const review = await client.reviewFormPattern?.({
        reviewPacket: {
          deterministic_gate: { gate_satisfied: true },
        } as any,
        suppliedReviewResult: null,
      });
      assert.equal(review?.adjudication.reason, "http test form_pattern review");
    },
  );
});

test("http governance client returns null on invalid JSON payload", async () => {
  await withChatCompletionStub(
    () => "not-json",
    async (baseUrl) => {
      const client = createHttpPromoteMemoryGovernanceModelClient({
        baseUrl,
        apiKey: "test-key",
        model: "test-model",
        timeoutMs: 1000,
        maxTokens: 200,
        temperature: 0,
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
      assert.equal(review, null);
    },
  );
});

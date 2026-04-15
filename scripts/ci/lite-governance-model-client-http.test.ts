import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import {
  createHttpFormPatternGovernanceModelClient,
  createHttpPromoteMemoryGovernanceModelClient,
} from "../../src/memory/governance-model-client-http.ts";

// These tests boot local Fastify stubs. Under the full concurrent suite, a 1s
// transport timeout is tight enough to cause false negatives on otherwise
// healthy loopback requests.
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

async function withAnthropicMessagesStub(
  handler: (body: any) => unknown,
  fn: (baseUrl: string) => Promise<void>,
) {
  const app = Fastify();
  app.post("/anthropic/v1/messages", async (request) => {
    const content = handler(request.body);
    return {
      content: [
        {
          type: "text",
          text: typeof content === "string" ? content : JSON.stringify(content),
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
        timeoutMs: TEST_GOVERNANCE_HTTP_TIMEOUT_MS,
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
        timeoutMs: TEST_GOVERNANCE_HTTP_TIMEOUT_MS,
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
        timeoutMs: TEST_GOVERNANCE_HTTP_TIMEOUT_MS,
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

test("http promote_memory governance client can parse a valid anthropic review result", async () => {
  await withAnthropicMessagesStub(
    () => ({
      review_version: "promote_memory_semantic_review_v1",
      adjudication: {
        operation: "promote_memory",
        disposition: "recommend",
        target_kind: "workflow",
        target_level: "L2",
        reason: "anthropic test promote_memory review",
        confidence: 0.94,
        strategic_value: "high",
      },
    }),
    async (baseUrl) => {
      const client = createHttpPromoteMemoryGovernanceModelClient({
        baseUrl: `${baseUrl}/anthropic`,
        apiKey: "test-key",
        model: "test-model",
        transport: "anthropic_messages_v1",
        timeoutMs: TEST_GOVERNANCE_HTTP_TIMEOUT_MS,
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
      assert.equal(review?.adjudication.reason, "anthropic test promote_memory review");
    },
  );
});

test("http form_pattern governance client can parse a valid anthropic review result", async () => {
  await withAnthropicMessagesStub(
    () => ({
      review_version: "form_pattern_semantic_review_v1",
      adjudication: {
        operation: "form_pattern",
        disposition: "recommend",
        target_kind: "pattern",
        target_level: "L3",
        reason: "anthropic test form_pattern review",
        confidence: 0.93,
      },
    }),
    async (baseUrl) => {
      const client = createHttpFormPatternGovernanceModelClient({
        baseUrl: `${baseUrl}/anthropic`,
        apiKey: "test-key",
        model: "test-model",
        transport: "anthropic_messages_v1",
        timeoutMs: TEST_GOVERNANCE_HTTP_TIMEOUT_MS,
        maxTokens: 200,
        temperature: 0,
      });
      const review = await client.reviewFormPattern?.({
        reviewPacket: {
          deterministic_gate: { gate_satisfied: true },
        } as any,
        suppliedReviewResult: null,
      });
      assert.equal(review?.adjudication.reason, "anthropic test form_pattern review");
    },
  );
});

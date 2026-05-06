import test from "node:test";
import assert from "node:assert/strict";
import { createEmbeddedMemoryRuntime } from "../../src/store/embedded-memory-runtime.ts";

test("embedded memory runtime recalls execution-native workflow procedures without anchor_v1", async () => {
  const runtime = createEmbeddedMemoryRuntime({ autoPersist: false });
  await runtime.applyWrite(
    {
      scope: "default",
      auto_embed_effective: false,
      nodes: [
        {
          id: "workflow-procedure-native-only",
          scope: "default",
          type: "procedure",
          tier: "warm",
          memory_lane: "shared",
          title: "Fix export workflow",
          text_summary: "Inspect failing export test, patch code, and rerun the focused suite.",
          slots: {
            execution_native_v1: {
              schema_version: "execution_native_v1",
              execution_kind: "workflow_anchor",
              summary_kind: "workflow_anchor",
              task_signature: "repair-export-node-tests",
            },
          },
          embedding: [1, 0, 0],
          confidence: 0.9,
          salience: 0.9,
        },
        {
          id: "plain-procedure",
          scope: "default",
          type: "procedure",
          tier: "warm",
          memory_lane: "shared",
          title: "Plain procedure",
          text_summary: "A procedure without runtime workflow anchor semantics.",
          slots: {},
          embedding: [1, 0, 0],
          confidence: 0.9,
          salience: 0.9,
        },
      ],
      edges: [],
    },
    {
      commit_id: "commit-embedded-recall-1",
      commit_hash: "commit-embedded-recall-1",
    },
  );

  const out = await runtime.createRecallAccess().stage1CandidatesAnn({
    queryEmbedding: [1, 0, 0],
    scope: "default",
    oversample: 10,
    limit: 10,
    consumerAgentId: null,
    consumerTeamId: null,
  });

  assert.ok(
    out.some((candidate) => candidate.id === "workflow-procedure-native-only"),
    "execution-native workflow procedures should be recallable without anchor_v1",
  );
  assert.equal(
    out.some((candidate) => candidate.id === "plain-procedure"),
    false,
    "plain procedures must still be filtered out of stage1 recall",
  );
});

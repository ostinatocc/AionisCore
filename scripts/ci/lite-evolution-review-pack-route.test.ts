import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { FakeEmbeddingProvider } from "../../src/embeddings/fake.ts";
import { createRequestGuards } from "../../src/app/request-guards.ts";
import { registerHostErrorHandler } from "../../src/host/http-host.ts";
import { registerMemoryAccessRoutes } from "../../src/routes/memory-access.ts";
import { EvolutionReviewPackResponseSchema, MemoryAnchorV1Schema } from "../../src/memory/schemas.ts";
import { applyMemoryWrite, prepareMemoryWrite } from "../../src/memory/write.ts";
import { createLiteRecallStore } from "../../src/store/lite-recall-store.ts";
import { createLiteWriteStore } from "../../src/store/lite-write-store.ts";
import { InflightGate } from "../../src/util/inflight_gate.ts";

function tmpDbPath(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-lite-evolution-review-pack-"));
  return path.join(dir, `${name}.sqlite`);
}

function buildEnv() {
  return {
    AIONIS_EDITION: "lite",
    MEMORY_AUTH_MODE: "off",
    TENANT_QUOTA_ENABLED: false,
    LITE_LOCAL_ACTOR_ID: "local-user",
    MEMORY_TENANT_ID: "default",
    MEMORY_SCOPE: "default",
    APP_ENV: "test",
    ADMIN_TOKEN: "",
    TRUST_PROXY: false,
    TRUSTED_PROXY_CIDRS: [],
    RATE_LIMIT_ENABLED: false,
    RATE_LIMIT_BYPASS_LOOPBACK: false,
    WRITE_RATE_LIMIT_MAX_WAIT_MS: 0,
    RECALL_TEXT_EMBED_RATE_LIMIT_MAX_WAIT_MS: 0,
    MAX_TEXT_LEN: 10000,
    PII_REDACTION: false,
    ALLOW_CROSS_SCOPE_EDGES: false,
  } as any;
}

function registerApp(args: {
  app: ReturnType<typeof Fastify>;
  liteWriteStore: ReturnType<typeof createLiteWriteStore>;
  liteRecallStore: ReturnType<typeof createLiteRecallStore>;
}) {
  const env = buildEnv();
  const guards = createRequestGuards({
    env,
    embedder: FakeEmbeddingProvider,
    recallLimiter: null,
    debugEmbedLimiter: null,
    writeLimiter: null,
    sandboxWriteLimiter: null,
    sandboxReadLimiter: null,
    recallTextEmbedLimiter: null,
    recallInflightGate: new InflightGate({ maxInflight: 8, maxQueue: 8, queueTimeoutMs: 100 }),
    writeInflightGate: new InflightGate({ maxInflight: 8, maxQueue: 8, queueTimeoutMs: 100 }),
  });

  registerHostErrorHandler(args.app);
  registerMemoryAccessRoutes({
    app: args.app,
    env,
    embedder: FakeEmbeddingProvider,
    liteWriteStore: args.liteWriteStore,
    liteRecallAccess: args.liteRecallStore.createRecallAccess(),
    writeAccessShadowMirrorV2: false,
    requireStoreFeatureCapability: () => {},
    requireMemoryPrincipal: guards.requireMemoryPrincipal,
    withIdentityFromRequest: guards.withIdentityFromRequest,
    enforceRateLimit: guards.enforceRateLimit,
    enforceTenantQuota: guards.enforceTenantQuota,
    tenantFromBody: guards.tenantFromBody,
    acquireInflightSlot: guards.acquireInflightSlot,
  });
}

async function seedEvolutionFixture(dbPath: string) {
  const liteWriteStore = createLiteWriteStore(dbPath);
  const [sharedEmbedding] = await FakeEmbeddingProvider.embed(["repair export failure in node tests"]);
  const trustedPattern = MemoryAnchorV1Schema.parse({
    anchor_kind: "pattern",
    anchor_level: "L3",
    pattern_state: "stable",
    credibility_state: "trusted",
    task_signature: "tools_select:repair-export",
    task_family: "task:repair_export",
    error_family: "error:node-export-mismatch",
    pattern_signature: "repair-export-stable-edit",
    summary: "Stable pattern: prefer edit for export repair.",
    tool_set: ["bash", "edit", "test"],
    selected_tool: "edit",
    file_path: "src/routes/export.ts",
    target_files: ["src/routes/export.ts"],
    next_action: "Patch src/routes/export.ts and rerun export tests.",
    outcome: { status: "success", result_class: "tool_selection_pattern_stable", success_score: 0.94 },
    source: { source_kind: "tool_decision", decision_id: randomUUID() },
    payload_refs: { node_ids: [], decision_ids: [], run_ids: [randomUUID(), randomUUID(), randomUUID()], step_ids: [], commit_ids: [] },
    metrics: { usage_count: 0, reuse_success_count: 3, reuse_failure_count: 0, distinct_run_count: 3, last_used_at: null },
    promotion: {
      required_distinct_runs: 3,
      distinct_run_count: 3,
      observed_run_ids: [randomUUID(), randomUUID(), randomUUID()],
      counter_evidence_count: 0,
      counter_evidence_open: false,
      credibility_state: "trusted",
      previous_credibility_state: "candidate",
      last_transition: "promoted_to_trusted",
      last_transition_at: new Date().toISOString(),
      stable_at: new Date().toISOString(),
      last_validated_at: new Date().toISOString(),
      last_counter_evidence_at: null,
    },
    trust_hardening: {
      task_family: "task:repair_export",
      error_family: "error:node-export-mismatch",
      observed_task_families: ["task:repair_export"],
      observed_error_families: ["error:node-export-mismatch"],
      distinct_task_family_count: 1,
      distinct_error_family_count: 1,
      post_contest_observed_run_ids: [],
      post_contest_distinct_run_count: 0,
      promotion_gate_kind: "current_distinct_runs_v1",
      promotion_gate_satisfied: true,
      revalidation_floor_kind: "post_contest_two_fresh_runs_v1",
      revalidation_floor_satisfied: true,
      task_affinity_weighting_enabled: true,
    },
    maintenance: {
      model: "lazy_online_v1",
      maintenance_state: "retain",
      offline_priority: "retain_trusted",
      lazy_update_fields: ["usage_count", "last_used_at"],
      last_maintenance_at: "2026-03-20T00:00:00Z",
    },
    schema_version: "anchor_v1",
  });

  const workflowAnchor = MemoryAnchorV1Schema.parse({
    anchor_kind: "workflow",
    anchor_level: "L2",
    task_signature: "execution_task:repair-export",
    task_class: "execution_write_projection",
    workflow_signature: "execution_workflow:repair-export",
    summary: "Stable workflow for repairing export failures.",
    tool_set: ["edit", "test"],
    file_path: "src/routes/export.ts",
    target_files: ["src/routes/export.ts"],
    next_action: "Patch src/routes/export.ts and rerun export tests.",
    outcome: { status: "success", result_class: "execution_write_stable", success_score: 0.88 },
    source: { source_kind: "execution_write", node_id: randomUUID(), run_id: null, playbook_id: null, commit_id: null },
    payload_refs: { node_ids: [], decision_ids: [], run_ids: [], step_ids: [], commit_ids: [] },
    rehydration: {
      default_mode: "partial",
      payload_cost_hint: "low",
      recommended_when: ["workflow_summary_is_not_enough"],
    },
    metrics: { usage_count: 0, reuse_success_count: 0, reuse_failure_count: 0, distinct_run_count: 0, last_used_at: null },
    maintenance: {
      model: "lazy_online_v1",
      maintenance_state: "retain",
      offline_priority: "retain_workflow",
      lazy_update_fields: ["usage_count", "last_used_at"],
      last_maintenance_at: "2026-03-20T00:00:00Z",
    },
    workflow_promotion: {
      promotion_state: "stable",
      promotion_origin: "execution_write_auto_promotion",
      required_observations: 2,
      observed_count: 2,
      last_transition: "promoted_to_stable",
      last_transition_at: "2026-03-20T00:00:00Z",
      source_status: null,
    },
    schema_version: "anchor_v1",
  });

  const prepared = await prepareMemoryWrite(
    {
      tenant_id: "default",
      scope: "default",
      actor: "local-user",
      input_text: "seed evolution review pack fixture",
      auto_embed: false,
      memory_lane: "shared",
      nodes: [
        {
          id: randomUUID(),
          type: "concept",
          title: "Stable edit pattern",
          text_summary: trustedPattern.summary,
          slots: {
            summary_kind: "pattern_anchor",
            compression_layer: "L3",
            anchor_v1: trustedPattern,
            execution_native_v1: {
              schema_version: "execution_native_v1",
              execution_kind: "pattern_anchor",
              summary_kind: "pattern_anchor",
              compression_layer: "L3",
              task_signature: trustedPattern.task_signature,
              task_family: trustedPattern.task_family,
              error_family: trustedPattern.error_family,
              pattern_signature: trustedPattern.pattern_signature,
              anchor_kind: "pattern",
              anchor_level: "L3",
              tool_set: trustedPattern.tool_set,
              selected_tool: trustedPattern.selected_tool,
              pattern_state: "stable",
              credibility_state: "trusted",
              file_path: trustedPattern.file_path,
              target_files: trustedPattern.target_files,
              next_action: trustedPattern.next_action,
              promotion: trustedPattern.promotion,
              trust_hardening: trustedPattern.trust_hardening,
              maintenance: trustedPattern.maintenance,
            },
          },
          embedding: sharedEmbedding,
          embedding_model: FakeEmbeddingProvider.name,
          salience: 0.8,
          importance: 0.9,
          confidence: 0.9,
        },
        {
          id: randomUUID(),
          type: "procedure",
          title: "Fix export failure",
          text_summary: workflowAnchor.summary,
          slots: {
            summary_kind: "workflow_anchor",
            compression_layer: "L2",
            anchor_v1: workflowAnchor,
            execution_native_v1: {
              schema_version: "execution_native_v1",
              execution_kind: "workflow_anchor",
              summary_kind: "workflow_anchor",
              compression_layer: "L2",
              task_signature: workflowAnchor.task_signature,
              workflow_signature: workflowAnchor.workflow_signature,
              anchor_kind: "workflow",
              anchor_level: "L2",
              tool_set: workflowAnchor.tool_set,
              file_path: workflowAnchor.file_path,
              target_files: workflowAnchor.target_files,
              next_action: workflowAnchor.next_action,
              workflow_promotion: workflowAnchor.workflow_promotion,
              maintenance: workflowAnchor.maintenance,
            },
          },
          embedding: sharedEmbedding,
          embedding_model: FakeEmbeddingProvider.name,
          salience: 0.8,
          importance: 0.9,
          confidence: 0.88,
        },
      ],
      edges: [],
    },
    "default",
    "default",
    {
      maxTextLen: 10000,
      piiRedaction: false,
      allowCrossScopeEdges: false,
    },
    null,
  );
  await liteWriteStore.withTx(() =>
    applyMemoryWrite({} as any, prepared, {
      maxTextLen: 10000,
      piiRedaction: false,
      allowCrossScopeEdges: false,
      shadowDualWriteEnabled: false,
      shadowDualWriteStrict: false,
      associativeLinkOrigin: "memory_write",
      write_access: liteWriteStore,
    }),
  );
}

test("memory evolution review-pack route exposes stable workflow and reviewer-friendly contract", async () => {
  const dbPath = tmpDbPath("evolution-review-pack");
  const app = Fastify();
  const liteWriteStore = createLiteWriteStore(dbPath);
  const liteRecallStore = createLiteRecallStore(dbPath);
  try {
    registerApp({ app, liteWriteStore, liteRecallStore });
    await seedEvolutionFixture(dbPath);

    const response = await app.inject({
      method: "POST",
      url: "/v1/memory/evolution/review-pack",
      payload: {
        tenant_id: "default",
        scope: "default",
        query_text: "repair export failure in node tests",
        context: {
          task: { id: "task-1", brief: "repair export route" },
        },
        candidates: ["edit", "bash", "test"],
      },
    });
    assert.equal(response.statusCode, 200, response.body);
    const parsed = EvolutionReviewPackResponseSchema.parse(JSON.parse(response.body));
    assert.equal(parsed.evolution_review_pack.pack_version, "evolution_review_pack_v1");
    assert.equal(parsed.evolution_review_pack.review_contract.selected_tool, "edit");
    assert.equal(parsed.evolution_review_pack.review_contract.file_path, "src/routes/export.ts");
    assert.ok(parsed.evolution_review_pack.stable_workflow);
    assert.ok(parsed.evolution_review_pack.review_contract.trusted_pattern_anchor_ids.length >= 1);
  } finally {
    await app.close();
  }
});

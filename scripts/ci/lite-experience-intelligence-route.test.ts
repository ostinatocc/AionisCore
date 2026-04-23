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
import { registerMemoryWriteRoutes } from "../../src/routes/memory-write.ts";
import {
  ActionRetrievalResponseSchema,
  ExperienceIntelligenceResponseSchema,
  KickoffRecommendationResponseSchema,
  MemoryAnchorV1Schema,
} from "../../src/memory/schemas.ts";
import { toolSelectionFeedback } from "../../src/memory/tools-feedback.ts";
import { applyMemoryWrite, prepareMemoryWrite } from "../../src/memory/write.ts";
import { createLiteRecallStore } from "../../src/store/lite-recall-store.ts";
import { createLiteWriteStore } from "../../src/store/lite-write-store.ts";
import { InflightGate } from "../../src/util/inflight_gate.ts";

function tmpDbPath(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-lite-experience-intelligence-"));
  return path.join(dir, `${name}.sqlite`);
}

function buildRequestGuards() {
  return createRequestGuards({
    env: {
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
    } as any,
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
}

async function seedStableWorkflowFixture(dbPath: string) {
  const liteWriteStore = createLiteWriteStore(dbPath);
  const liteRecallStore = createLiteRecallStore(dbPath);
  const [sharedEmbedding] = await FakeEmbeddingProvider.embed(["repair export failure in node tests"]);
  const trustedPattern = MemoryAnchorV1Schema.parse({
    anchor_kind: "pattern",
    anchor_level: "L3",
    pattern_state: "stable",
    credibility_state: "trusted",
    task_signature: "tools_select:repair-export",
    task_class: "tools_select_pattern",
    task_family: "task:repair_export",
    error_family: "error:node-export-mismatch",
    pattern_signature: "repair-export-stable-edit",
    summary: "Stable pattern: prefer edit for export repair after repeated successful runs.",
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

  const prepared = await prepareMemoryWrite(
    {
      tenant_id: "default",
      scope: "default",
      actor: "local-user",
      input_text: "seed stable workflow and trusted edit pattern fixture",
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
          text_summary: "Reusable workflow for export repair in node tests",
          slots: {
            summary_kind: "workflow_anchor",
            compression_layer: "L2",
            anchor_v1: {
              anchor_kind: "workflow",
              anchor_level: "L2",
              task_signature: "execution_task:repair-export",
              task_class: "execution_write_projection",
              workflow_signature: "execution_workflow:repair-export",
              task_family: "task:repair_export",
              summary: "Stable workflow for repairing export failures in node tests.",
              tool_set: ["edit", "test"],
              file_path: "src/routes/export.ts",
              target_files: ["src/routes/export.ts"],
              next_action: "Patch src/routes/export.ts and rerun export tests.",
              workflow_steps: [
                "Inspect src/routes/export.ts for export response handling.",
                "Patch the export serialization logic with edit.",
                "Rerun export-focused tests before handing off.",
              ],
              pattern_hints: [
                "Prefer edit for route-level export repairs.",
                "Keep response serialization changes scoped to src/routes/export.ts.",
              ],
              service_lifecycle_constraints: [
                {
                  version: 1,
                  service_kind: "generic",
                  label: "export test verification shell",
                  launch_reference: null,
                  endpoint: null,
                  must_survive_agent_exit: false,
                  revalidate_from_fresh_shell: true,
                  detach_then_probe: false,
                  health_checks: ["npm test -- export"],
                  teardown_notes: [],
                },
              ],
              outcome: { status: "success", result_class: "execution_write_stable", success_score: 0.88 },
              source: { source_kind: "execution_write", node_id: randomUUID(), run_id: null, playbook_id: null, commit_id: null },
              payload_refs: { node_ids: [], decision_ids: [], run_ids: [], step_ids: [], commit_ids: [] },
              rehydration: {
                default_mode: "partial",
                payload_cost_hint: "low",
                recommended_when: ["workflow_summary_is_not_enough", "resume_anchor_requires_detail"],
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
            },
            execution_native_v1: {
              schema_version: "execution_native_v1",
              execution_kind: "workflow_anchor",
              summary_kind: "workflow_anchor",
              compression_layer: "L2",
              task_signature: "execution_task:repair-export",
              task_family: "task:repair_export",
              workflow_signature: "execution_workflow:repair-export",
              anchor_kind: "workflow",
              anchor_level: "L2",
              tool_set: ["edit", "test"],
              file_path: "src/routes/export.ts",
              target_files: ["src/routes/export.ts"],
              next_action: "Patch src/routes/export.ts and rerun export tests.",
              workflow_steps: [
                "Inspect src/routes/export.ts for export response handling.",
                "Patch the export serialization logic with edit.",
                "Rerun export-focused tests before handing off.",
              ],
              pattern_hints: [
                "Prefer edit for route-level export repairs.",
                "Keep response serialization changes scoped to src/routes/export.ts.",
              ],
              service_lifecycle_constraints: [
                {
                  version: 1,
                  service_kind: "generic",
                  label: "export test verification shell",
                  launch_reference: null,
                  endpoint: null,
                  must_survive_agent_exit: false,
                  revalidate_from_fresh_shell: true,
                  detach_then_probe: false,
                  health_checks: ["npm test -- export"],
                  teardown_notes: [],
                },
              ],
              workflow_promotion: {
                promotion_state: "stable",
                promotion_origin: "execution_write_auto_promotion",
                required_observations: 2,
                observed_count: 2,
                last_transition: "promoted_to_stable",
                last_transition_at: "2026-03-20T00:00:00Z",
                source_status: null,
              },
              maintenance: {
                model: "lazy_online_v1",
                maintenance_state: "retain",
                offline_priority: "retain_workflow",
                lazy_update_fields: ["usage_count", "last_used_at"],
                last_maintenance_at: "2026-03-20T00:00:00Z",
              },
              rehydration: {
                default_mode: "partial",
                payload_cost_hint: "low",
                recommended_when: ["workflow_summary_is_not_enough", "resume_anchor_requires_detail"],
              },
            },
            target_files: ["src/routes/export.ts"],
          },
        },
      ],
      edges: [],
    },
    "default",
    "default",
    {
      maxTextLen: 10_000,
      piiRedaction: false,
      allowCrossScopeEdges: false,
    },
    null,
  );

  await liteWriteStore.withTx(() =>
    applyMemoryWrite({} as any, prepared, {
      maxTextLen: 10_000,
      piiRedaction: false,
      allowCrossScopeEdges: false,
      shadowDualWriteEnabled: false,
      shadowDualWriteStrict: false,
      associativeLinkOrigin: "memory_write",
      write_access: liteWriteStore,
    }),
  );

  return { liteWriteStore, liteRecallStore };
}

test("experience intelligence route combines trusted tool memory with learned workflow path guidance", async () => {
  const app = Fastify();
  const { liteWriteStore, liteRecallStore } = await seedStableWorkflowFixture(tmpDbPath("stable-route"));
  try {
    const guards = buildRequestGuards();
    registerHostErrorHandler(app);
    registerMemoryAccessRoutes({
      app,
      env: {
        AIONIS_EDITION: "lite",
        APP_ENV: "test",
        MEMORY_SCOPE: "default",
        MEMORY_TENANT_ID: "default",
        LITE_LOCAL_ACTOR_ID: "local-user",
        MAX_TEXT_LEN: 10_000,
        PII_REDACTION: false,
        ALLOW_CROSS_SCOPE_EDGES: false,
        MEMORY_SHADOW_DUAL_WRITE_ENABLED: false,
        MEMORY_SHADOW_DUAL_WRITE_STRICT: false,
      } as any,
      embedder: FakeEmbeddingProvider,
      liteWriteStore,
      liteRecallAccess: liteRecallStore.createRecallAccess(),
      writeAccessShadowMirrorV2: false,
      requireStoreFeatureCapability: () => {},
      requireMemoryPrincipal: guards.requireMemoryPrincipal,
      withIdentityFromRequest: guards.withIdentityFromRequest,
      enforceRateLimit: guards.enforceRateLimit,
      enforceTenantQuota: guards.enforceTenantQuota,
      tenantFromBody: guards.tenantFromBody,
      acquireInflightSlot: guards.acquireInflightSlot,
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/memory/experience/intelligence",
      payload: {
        tenant_id: "default",
        scope: "default",
        query_text: "repair export failure in node tests",
        context: {
          task_kind: "repair_export",
          goal: "repair export failure in node tests",
          error: {
            signature: "node-export-mismatch",
          },
        },
        candidates: ["bash", "edit", "test"],
      },
    });

    assert.equal(response.statusCode, 200);
    const body = ExperienceIntelligenceResponseSchema.parse(response.json());
    assert.equal(body.action_retrieval.summary_version, "action_retrieval_v1");
    assert.equal(body.recommendation.history_applied, true);
    assert.equal(body.recommendation.tool.selected_tool, "edit");
    assert.equal(body.recommendation.path.source_kind, "recommended_workflow");
    assert.equal(body.recommendation.path.file_path, "src/routes/export.ts");
    assert.deepEqual(body.recommendation.path.target_files, ["src/routes/export.ts"]);
    assert.match(body.recommendation.combined_next_action ?? "", /src\/routes\/export\.ts/);
    assert.equal(body.policy_hints.total_hints >= 2, true);
    const workflowReuseHint = body.policy_hints.hints.find((entry) => entry.hint_kind === "workflow_reuse");
    assert.deepEqual(body.recommendation.path.workflow_steps, [
      "Inspect src/routes/export.ts for export response handling.",
      "Patch the export serialization logic with edit.",
      "Rerun export-focused tests before handing off.",
    ]);
    assert.deepEqual(body.recommendation.path.pattern_hints, [
      "Prefer edit for route-level export repairs.",
      "Keep response serialization changes scoped to src/routes/export.ts.",
    ]);
    assert.equal(body.derived_policy?.selected_tool, "edit");
    assert.deepEqual(body.derived_policy?.workflow_steps, [
      "Inspect src/routes/export.ts for export response handling.",
      "Patch the export serialization logic with edit.",
      "Rerun export-focused tests before handing off.",
    ]);
    assert.deepEqual(body.derived_policy?.pattern_hints, [
      "Prefer edit for route-level export repairs.",
      "Keep response serialization changes scoped to src/routes/export.ts.",
    ]);
    assert.equal(body.derived_policy?.service_lifecycle_constraints?.[0]?.label, "export test verification shell");
    assert.equal(body.policy_contract?.selected_tool, "edit");
    assert.equal(body.policy_contract?.materialization_state, "computed");
    assert.deepEqual(body.policy_contract?.workflow_steps, [
      "Inspect src/routes/export.ts for export response handling.",
      "Patch the export serialization logic with edit.",
      "Rerun export-focused tests before handing off.",
    ]);
    assert.deepEqual(body.policy_contract?.pattern_hints, [
      "Prefer edit for route-level export repairs.",
      "Keep response serialization changes scoped to src/routes/export.ts.",
    ]);
    assert.equal(body.policy_contract?.service_lifecycle_constraints?.[0]?.revalidate_from_fresh_shell, true);
    assert.ok(workflowReuseHint);
    assert.deepEqual(workflowReuseHint?.workflow_steps, [
      "Inspect src/routes/export.ts for export response handling.",
      "Patch the export serialization logic with edit.",
      "Rerun export-focused tests before handing off.",
    ]);
    assert.deepEqual(workflowReuseHint?.pattern_hints, [
      "Prefer edit for route-level export repairs.",
      "Keep response serialization changes scoped to src/routes/export.ts.",
    ]);
    assert.equal(workflowReuseHint?.service_lifecycle_constraints?.[0]?.label, "export test verification shell");
    assert.deepEqual(body.learning_summary, {
      task_family: "task:repair_export",
      matched_records: 0,
      truncated: false,
      route_role_counts: {},
      record_outcome_counts: {},
      recommendation_count: 0,
    });
    assert.deepEqual(body.learning_recommendations, []);
    assert.match(body.rationale.summary, /trusted_patterns=1/);
    assert.match(body.rationale.summary, /stable_workflows=1/);
    assert.match(body.rationale.summary, /policy_contract=default:edit/);
  } finally {
    await app.close();
    await liteRecallStore.close();
    await liteWriteStore.close();
  }
});

test("action retrieval route exposes explicit retrieval evidence and low uncertainty for a stable learned path", async () => {
  const app = Fastify();
  const { liteWriteStore, liteRecallStore } = await seedStableWorkflowFixture(tmpDbPath("action-retrieval-stable"));
  try {
    const guards = buildRequestGuards();
    registerHostErrorHandler(app);
    registerMemoryAccessRoutes({
      app,
      env: {
        AIONIS_EDITION: "lite",
        APP_ENV: "test",
        MEMORY_SCOPE: "default",
        MEMORY_TENANT_ID: "default",
        LITE_LOCAL_ACTOR_ID: "local-user",
        MAX_TEXT_LEN: 10_000,
        PII_REDACTION: false,
        ALLOW_CROSS_SCOPE_EDGES: false,
        MEMORY_SHADOW_DUAL_WRITE_ENABLED: false,
        MEMORY_SHADOW_DUAL_WRITE_STRICT: false,
      } as any,
      embedder: FakeEmbeddingProvider,
      liteWriteStore,
      liteRecallAccess: liteRecallStore.createRecallAccess(),
      writeAccessShadowMirrorV2: false,
      requireStoreFeatureCapability: () => {},
      requireMemoryPrincipal: guards.requireMemoryPrincipal,
      withIdentityFromRequest: guards.withIdentityFromRequest,
      enforceRateLimit: guards.enforceRateLimit,
      enforceTenantQuota: guards.enforceTenantQuota,
      tenantFromBody: guards.tenantFromBody,
      acquireInflightSlot: guards.acquireInflightSlot,
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/memory/action/retrieval",
      payload: {
        tenant_id: "default",
        scope: "default",
        query_text: "repair export failure in node tests",
        context: {
          task_kind: "repair_export",
          goal: "repair export failure in node tests",
          error: {
            signature: "node-export-mismatch",
          },
        },
        candidates: ["bash", "edit", "test"],
      },
    });

    assert.equal(response.statusCode, 200);
    const body = ActionRetrievalResponseSchema.parse(response.json());
    assert.equal(body.history_applied, true);
    assert.equal(body.selected_tool, "edit");
    assert.equal(body.recommended_file_path, "src/routes/export.ts");
    assert.match(body.recommended_next_action ?? "", /src\/routes\/export\.ts/);
    assert.equal(body.path.source_kind, "recommended_workflow");
    assert.equal(body.tool_source_kind, "blended");
    assert.equal(body.uncertainty.level, "low");
    assert.equal(body.evidence.stable_workflow_count >= 1, true);
    assert.equal(body.evidence.trusted_pattern_count >= 1, true);
    assert.equal(body.evidence.entries.some((entry) => entry.source_kind === "stable_workflow"), true);
    assert.equal(body.evidence.entries.some((entry) => entry.source_kind === "trusted_pattern"), true);
  } finally {
    await app.close();
    await liteRecallStore.close();
    await liteWriteStore.close();
  }
});

test("action retrieval route surfaces higher uncertainty when no learned path matches", async () => {
  const app = Fastify();
  const { liteWriteStore, liteRecallStore } = await seedStableWorkflowFixture(tmpDbPath("action-retrieval-unrelated"));
  try {
    const guards = buildRequestGuards();
    registerHostErrorHandler(app);
    registerMemoryAccessRoutes({
      app,
      env: {
        AIONIS_EDITION: "lite",
        APP_ENV: "test",
        MEMORY_SCOPE: "default",
        MEMORY_TENANT_ID: "default",
        LITE_LOCAL_ACTOR_ID: "local-user",
        MAX_TEXT_LEN: 10_000,
        PII_REDACTION: false,
        ALLOW_CROSS_SCOPE_EDGES: false,
        MEMORY_SHADOW_DUAL_WRITE_ENABLED: false,
        MEMORY_SHADOW_DUAL_WRITE_STRICT: false,
      } as any,
      embedder: FakeEmbeddingProvider,
      liteWriteStore,
      liteRecallAccess: liteRecallStore.createRecallAccess(),
      writeAccessShadowMirrorV2: false,
      requireStoreFeatureCapability: () => {},
      requireMemoryPrincipal: guards.requireMemoryPrincipal,
      withIdentityFromRequest: guards.withIdentityFromRequest,
      enforceRateLimit: guards.enforceRateLimit,
      enforceTenantQuota: guards.enforceTenantQuota,
      tenantFromBody: guards.tenantFromBody,
      acquireInflightSlot: guards.acquireInflightSlot,
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/memory/action/retrieval",
      payload: {
        tenant_id: "default",
        scope: "default",
        query_text: "summarize competitor pricing deltas for the quarterly market memo",
        context: {
          task_kind: "market_pricing_memo",
          goal: "summarize competitor pricing deltas for the quarterly market memo",
          error: {
            signature: "pricing-table-delta",
          },
        },
        candidates: ["bash", "grep", "read"],
      },
    });

    assert.equal(response.statusCode, 200);
    const body = ActionRetrievalResponseSchema.parse(response.json());
    assert.equal(body.history_applied, false);
    assert.equal(body.selected_tool, "bash");
    assert.equal(body.path.source_kind, "none");
    assert.equal(body.tool_source_kind, "tools_select");
    assert.equal(body.recommended_file_path, null);
    assert.equal(body.recommended_next_action, null);
    assert.equal(body.uncertainty.level, "high");
    assert.equal(body.uncertainty.recommended_actions.includes("widen_recall"), true);
  } finally {
    await app.close();
    await liteRecallStore.close();
    await liteWriteStore.close();
  }
});

test("experience intelligence route exposes delegation learning guidance when matching records exist", async () => {
  const app = Fastify();
  const { liteWriteStore, liteRecallStore } = await seedStableWorkflowFixture(tmpDbPath("delegation-learning"));
  try {
    const guards = buildRequestGuards();
    registerHostErrorHandler(app);
    registerMemoryAccessRoutes({
      app,
      env: {
        AIONIS_EDITION: "lite",
        APP_ENV: "test",
        MEMORY_SCOPE: "default",
        MEMORY_TENANT_ID: "default",
        LITE_LOCAL_ACTOR_ID: "local-user",
        MAX_TEXT_LEN: 10_000,
        PII_REDACTION: false,
        ALLOW_CROSS_SCOPE_EDGES: false,
        MEMORY_SHADOW_DUAL_WRITE_ENABLED: false,
        MEMORY_SHADOW_DUAL_WRITE_STRICT: false,
      } as any,
      embedder: FakeEmbeddingProvider,
      liteWriteStore,
      liteRecallAccess: liteRecallStore.createRecallAccess(),
      writeAccessShadowMirrorV2: false,
      requireStoreFeatureCapability: () => {},
      requireMemoryPrincipal: guards.requireMemoryPrincipal,
      withIdentityFromRequest: guards.withIdentityFromRequest,
      enforceRateLimit: guards.enforceRateLimit,
      enforceTenantQuota: guards.enforceTenantQuota,
      tenantFromBody: guards.tenantFromBody,
      acquireInflightSlot: guards.acquireInflightSlot,
    });

    for (const payload of [
      {
        tenant_id: "default",
        scope: "default",
        run_id: "run:experience-export-001",
        route_role: "patch",
        task_family: "task:repair_export",
        delegation_records_v1: {
          summary_version: "execution_delegation_records_v1",
          record_mode: "packet_backed",
          route_role: "patch",
          packet_count: 1,
          return_count: 1,
          artifact_routing_count: 2,
          missing_record_types: [],
          delegation_packets: [{
            version: 1,
            role: "patch",
            mission: "Apply the export repair patch and rerun node tests.",
            working_set: ["src/routes/export.ts"],
            acceptance_checks: ["npm run -s test:lite -- export"],
            output_contract: "Return patch result and final node test status.",
            preferred_artifact_refs: ["artifact://repair-export/patch"],
            inherited_evidence: ["evidence://repair-export/failure"],
            routing_reason: "repair patch route",
            task_family: "task:repair_export",
            family_scope: "aionis://runtime/repair-export",
            source_mode: "packet_backed",
          }],
          delegation_returns: [{
            version: 1,
            role: "patch",
            status: "passed",
            summary: "Patch applied and export tests passed.",
            evidence: ["evidence://repair-export/test"],
            working_set: ["src/routes/export.ts"],
            acceptance_checks: ["npm run -s test:lite -- export"],
            source_mode: "packet_backed",
          }],
          artifact_routing_records: [{
            version: 1,
            ref: "artifact://repair-export/patch",
            ref_kind: "artifact",
            route_role: "patch",
            route_intent: "patch",
            route_mode: "packet_backed",
            task_family: "task:repair_export",
            family_scope: "aionis://runtime/repair-export",
            routing_reason: "patch artifact route",
            source: "execution_packet",
          }, {
            version: 1,
            ref: "evidence://repair-export/test",
            ref_kind: "evidence",
            route_role: "patch",
            route_intent: "patch",
            route_mode: "packet_backed",
            task_family: "task:repair_export",
            family_scope: "aionis://runtime/repair-export",
            routing_reason: "patch evidence route",
            source: "execution_packet",
          }],
        },
        execution_result_summary: {
          status: "passed",
          summary: "Patch applied and export tests passed.",
        },
        execution_artifacts: [{ ref: "artifact://repair-export/patch" }],
        execution_evidence: [{ ref: "evidence://repair-export/test" }],
      },
      {
        tenant_id: "default",
        scope: "default",
        memory_lane: "private",
        run_id: "run:experience-export-002",
        route_role: "patch",
        task_family: "task:repair_export",
        delegation_records_v1: {
          summary_version: "execution_delegation_records_v1",
          record_mode: "memory_only",
          route_role: "patch",
          packet_count: 1,
          return_count: 0,
          artifact_routing_count: 1,
          missing_record_types: ["delegation_returns"],
          delegation_packets: [{
            version: 1,
            role: "patch",
            mission: "Apply the export fallback patch before retrying tests.",
            working_set: ["src/routes/export.ts"],
            acceptance_checks: ["npm run -s test:lite -- export"],
            output_contract: "Return applied patch metadata.",
            preferred_artifact_refs: ["artifact://repair-export/fallback-patch"],
            inherited_evidence: [],
            routing_reason: "fallback memory patch route",
            task_family: "task:repair_export",
            family_scope: "aionis://runtime/repair-export",
            source_mode: "memory_only",
          }],
          delegation_returns: [],
          artifact_routing_records: [{
            version: 1,
            ref: "artifact://repair-export/fallback-patch",
            ref_kind: "artifact",
            route_role: "patch",
            route_intent: "memory_guided",
            route_mode: "memory_only",
            task_family: "task:repair_export",
            family_scope: "aionis://runtime/repair-export",
            routing_reason: "memory-guided patch route",
            source: "strategy_summary",
          }],
        },
      },
    ]) {
      const writeResponse = await app.inject({
        method: "POST",
        url: "/v1/memory/delegation/records",
        payload,
      });
      assert.equal(writeResponse.statusCode, 200, writeResponse.body);
    }

    const response = await app.inject({
      method: "POST",
      url: "/v1/memory/experience/intelligence",
      payload: {
        tenant_id: "default",
        scope: "default",
        query_text: "repair export failure in node tests",
        context: {
          task_kind: "repair_export",
          goal: "repair export failure in node tests",
          error: {
            signature: "node-export-mismatch",
          },
        },
        candidates: ["bash", "edit", "test"],
      },
    });

    assert.equal(response.statusCode, 200);
    const body = ExperienceIntelligenceResponseSchema.parse(response.json());
    assert.deepEqual(body.learning_summary, {
      task_family: "task:repair_export",
      matched_records: 2,
      truncated: false,
      route_role_counts: {
        patch: 2,
      },
      record_outcome_counts: {
        completed: 1,
        missing_return: 1,
      },
      recommendation_count: 3,
    });
    assert.deepEqual(
      body.learning_recommendations.map((entry) => entry.recommendation_kind),
      ["capture_missing_returns", "increase_artifact_capture", "promote_reusable_pattern"],
    );
    assert.equal(
      body.learning_recommendations[0]?.recommended_action,
      "Capture delegation returns consistently for patch / task:repair_export.",
    );
    assert.equal(
      body.learning_recommendations[2]?.sample_mission,
      "Apply the export repair patch and rerun node tests.",
    );
  } finally {
    await app.close();
    await liteRecallStore.close();
    await liteWriteStore.close();
  }
});

test("kickoff recommendation can recover file-level workflow guidance from host-shaped task_kind continuity", async () => {
  const dbPath = tmpDbPath("host-shaped-task-kind");
  const app = Fastify();
  const liteWriteStore = createLiteWriteStore(dbPath);
  const liteRecallStore = createLiteRecallStore(dbPath);
  try {
    const guards = buildRequestGuards();
    registerHostErrorHandler(app);
    registerMemoryWriteRoutes({
      app,
      env: {
        AIONIS_EDITION: "lite",
        APP_ENV: "test",
        MEMORY_SCOPE: "default",
        MEMORY_TENANT_ID: "default",
        LITE_LOCAL_ACTOR_ID: "local-user",
        MAX_TEXT_LEN: 10_000,
        PII_REDACTION: false,
        ALLOW_CROSS_SCOPE_EDGES: false,
        MEMORY_SHADOW_DUAL_WRITE_ENABLED: false,
        MEMORY_SHADOW_DUAL_WRITE_STRICT: false,
      } as any,
      store: {
        withTx: async <T>(fn: (client: any) => Promise<T>) => await fn({} as any),
      },
      embedder: FakeEmbeddingProvider,
      embeddedRuntime: null,
      liteWriteStore,
      writeAccessForClient: () => liteWriteStore,
      requireMemoryPrincipal: guards.requireMemoryPrincipal,
      withIdentityFromRequest: guards.withIdentityFromRequest,
      enforceRateLimit: guards.enforceRateLimit,
      enforceTenantQuota: guards.enforceTenantQuota,
      tenantFromBody: guards.tenantFromBody,
      acquireInflightSlot: guards.acquireInflightSlot,
      runTopicClusterForEventIds: async () => ({ processed_events: 0 }),
      executionStateStore: null,
    });
    registerMemoryAccessRoutes({
      app,
      env: {
        AIONIS_EDITION: "lite",
        APP_ENV: "test",
        MEMORY_SCOPE: "default",
        MEMORY_TENANT_ID: "default",
        LITE_LOCAL_ACTOR_ID: "local-user",
        MAX_TEXT_LEN: 10_000,
        PII_REDACTION: false,
        ALLOW_CROSS_SCOPE_EDGES: false,
        MEMORY_SHADOW_DUAL_WRITE_ENABLED: false,
        MEMORY_SHADOW_DUAL_WRITE_STRICT: false,
      } as any,
      embedder: FakeEmbeddingProvider,
      liteWriteStore,
      liteRecallAccess: liteRecallStore.createRecallAccess(),
      writeAccessShadowMirrorV2: false,
      requireStoreFeatureCapability: () => {},
      requireMemoryPrincipal: guards.requireMemoryPrincipal,
      withIdentityFromRequest: guards.withIdentityFromRequest,
      enforceRateLimit: guards.enforceRateLimit,
      enforceTenantQuota: guards.enforceTenantQuota,
      tenantFromBody: guards.tenantFromBody,
      acquireInflightSlot: guards.acquireInflightSlot,
    });

    for (const [index, title] of ["Host continuity run one", "Host continuity run two"].entries()) {
      const response = await app.inject({
        method: "POST",
        url: "/v1/memory/write",
        payload: {
          tenant_id: "default",
          scope: "default",
          actor: "local-user",
          input_text: `修复导出路由的响应序列化问题 continuity run ${index + 1}`,
          auto_embed: true,
          memory_lane: "private",
          nodes: [
            {
              client_id: `host-shaped-${index + 1}`,
              type: "event",
              title,
              text_summary: "Fix export failure in node tests",
              slots: {
                summary_kind: "handoff",
                task_kind: "repo_repair",
                execution_packet_v1: {
                  version: 1,
                  state_id: `state-${index + 1}`,
                  current_stage: "patch",
                  active_role: "patch",
                  task_brief: "Fix export failure in node tests",
                  target_files: ["src/routes/export.ts"],
                  next_action: "Patch src/routes/export.ts and rerun export tests.",
                  hard_constraints: [],
                  accepted_facts: [],
                  rejected_paths: [],
                  pending_validations: ["npm run -s test:lite -- export"],
                  unresolved_blockers: [],
                  rollback_notes: [],
                  review_contract: null,
                  resume_anchor: {
                    anchor: "resume:src/routes/export.ts",
                    file_path: "src/routes/export.ts",
                    symbol: null,
                    repo_root: "/Volumes/ziel/Aionisgo",
                  },
                  artifact_refs: [],
                  evidence_refs: [],
                },
              },
            },
          ],
          edges: [],
        },
      });
      assert.equal(response.statusCode, 200);
    }

    for (let i = 0; i < 3; i += 1) {
      await liteWriteStore.withTx(() =>
        toolSelectionFeedback(null, {
          tenant_id: "default",
          scope: "default",
          actor: "local-user",
          run_id: randomUUID(),
          outcome: "positive",
          context: {
            task_kind: "repo_repair",
            goal: "修复导出路由的响应序列化问题",
          },
          candidates: ["read", "glob", "grep", "bash", "edit", "write", "ls"],
          selected_tool: "edit",
          target: "tool",
          note: "Edit solved the repo repair startup path",
          input_text: "修复导出路由的响应序列化问题",
        }, "default", "default", {
          maxTextLen: 10_000,
          piiRedaction: false,
          embedder: FakeEmbeddingProvider,
          liteWriteStore,
        }),
      );
    }

    const response = await app.inject({
      method: "POST",
      url: "/v1/memory/kickoff/recommendation",
      payload: {
        tenant_id: "default",
        scope: "default",
        query_text: "修复导出路由的响应序列化问题",
        context: {
          task_kind: "repo_repair",
          goal: "修复导出路由的响应序列化问题",
          host_tool_profile: "Repository-repair request detected; inspect current failure state first, then repair and verify within the local workspace.",
          host_preferred_tool: "read",
        },
        candidates: ["read", "glob", "grep", "bash", "edit", "write", "ls"],
      },
    });

    assert.equal(response.statusCode, 200);
    const body = KickoffRecommendationResponseSchema.parse(response.json());
    assert.equal(body.kickoff_recommendation?.history_applied, true);
    assert.equal(body.kickoff_recommendation?.selected_tool, "edit");
    assert.equal(body.kickoff_recommendation?.source_kind, "experience_intelligence");
    assert.equal(body.kickoff_recommendation?.file_path, "src/routes/export.ts");
    assert.match(body.kickoff_recommendation?.next_action ?? "", /src\/routes\/export\.ts/);
    assert.equal(body.action_retrieval_uncertainty?.summary_version, "action_retrieval_uncertainty_v1");
    assert.notEqual(body.action_retrieval_uncertainty?.level, "high");
    assert.ok((body.action_retrieval_uncertainty?.confidence ?? 0) >= 0.48);
    assert.ok(!(body.action_retrieval_uncertainty?.recommended_actions ?? []).includes("request_operator_review"));
    assert.equal(body.policy_contract?.selected_tool, "edit");
    assert.equal(body.policy_contract?.materialization_state, "persisted");
  } finally {
    await app.close();
    await liteRecallStore.close();
    await liteWriteStore.close();
  }
});

test("experience intelligence route does not force unrelated queries onto an unrelated learned workflow", async () => {
  const app = Fastify();
  const { liteWriteStore, liteRecallStore } = await seedStableWorkflowFixture(tmpDbPath("stable-route-unrelated"));
  try {
    const guards = buildRequestGuards();
    registerHostErrorHandler(app);
    registerMemoryAccessRoutes({
      app,
      env: {
        AIONIS_EDITION: "lite",
        APP_ENV: "test",
        MEMORY_SCOPE: "default",
        MEMORY_TENANT_ID: "default",
        LITE_LOCAL_ACTOR_ID: "local-user",
        MAX_TEXT_LEN: 10_000,
        PII_REDACTION: false,
        ALLOW_CROSS_SCOPE_EDGES: false,
        MEMORY_SHADOW_DUAL_WRITE_ENABLED: false,
        MEMORY_SHADOW_DUAL_WRITE_STRICT: false,
      } as any,
      embedder: FakeEmbeddingProvider,
      liteWriteStore,
      liteRecallAccess: liteRecallStore.createRecallAccess(),
      writeAccessShadowMirrorV2: false,
      requireStoreFeatureCapability: () => {},
      requireMemoryPrincipal: guards.requireMemoryPrincipal,
      withIdentityFromRequest: guards.withIdentityFromRequest,
      enforceRateLimit: guards.enforceRateLimit,
      enforceTenantQuota: guards.enforceTenantQuota,
      tenantFromBody: guards.tenantFromBody,
      acquireInflightSlot: guards.acquireInflightSlot,
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/memory/experience/intelligence",
      payload: {
        tenant_id: "default",
        scope: "default",
        query_text: "summarize competitor pricing deltas for the quarterly market memo",
        context: {
          task_kind: "market_pricing_memo",
          goal: "summarize competitor pricing deltas for the quarterly market memo",
          error: {
            signature: "pricing-table-delta",
          },
        },
        candidates: ["bash", "grep", "read"],
      },
    });

    assert.equal(response.statusCode, 200);
    const body = ExperienceIntelligenceResponseSchema.parse(response.json());
    assert.equal(body.action_retrieval.path.source_kind, "none");
    assert.equal(body.recommendation.history_applied, false);
    assert.equal(body.recommendation.tool.selected_tool, "bash");
    assert.equal(body.recommendation.path.source_kind, "none");
    assert.equal(body.recommendation.path.file_path, null);
    assert.equal(body.recommendation.combined_next_action, null);
  } finally {
    await app.close();
    await liteRecallStore.close();
    await liteWriteStore.close();
  }
});

test("experience intelligence route learns a stronger next recommendation after repeated positive tool feedback", async () => {
  const dbPath = tmpDbPath("feedback-learning");
  const app = Fastify();
  const liteWriteStore = createLiteWriteStore(dbPath);
  const liteRecallStore = createLiteRecallStore(dbPath);
  try {
    const guards = buildRequestGuards();
    registerHostErrorHandler(app);
    registerMemoryAccessRoutes({
      app,
      env: {
        AIONIS_EDITION: "lite",
        APP_ENV: "test",
        MEMORY_SCOPE: "default",
        MEMORY_TENANT_ID: "default",
        LITE_LOCAL_ACTOR_ID: "local-user",
        MAX_TEXT_LEN: 10_000,
        PII_REDACTION: false,
        ALLOW_CROSS_SCOPE_EDGES: false,
        MEMORY_SHADOW_DUAL_WRITE_ENABLED: false,
        MEMORY_SHADOW_DUAL_WRITE_STRICT: false,
      } as any,
      embedder: FakeEmbeddingProvider,
      liteWriteStore,
      liteRecallAccess: liteRecallStore.createRecallAccess(),
      writeAccessShadowMirrorV2: false,
      requireStoreFeatureCapability: () => {},
      requireMemoryPrincipal: guards.requireMemoryPrincipal,
      withIdentityFromRequest: guards.withIdentityFromRequest,
      enforceRateLimit: guards.enforceRateLimit,
      enforceTenantQuota: guards.enforceTenantQuota,
      tenantFromBody: guards.tenantFromBody,
      acquireInflightSlot: guards.acquireInflightSlot,
    });

    const payload = {
      tenant_id: "default",
      scope: "default",
      query_text: "repair export failure in node tests",
      context: {
        task_kind: "repair_export",
        task_family: "task:repair_export",
        workflow_signature: "execution_workflow:repair-export",
        goal: "repair export failure in node tests",
        target_files: ["src/routes/export.ts"],
        next_action: "Patch src/routes/export.ts and rerun export tests.",
        error: {
          signature: "node-export-mismatch",
        },
        recovery_contract_v1: {
          task_family: "task:repair_export",
          task_signature: "repair-export-route",
          workflow_signature: "execution_workflow:repair-export",
          contract: {
            target_files: ["src/routes/export.ts"],
            next_action: "Patch src/routes/export.ts and rerun export tests.",
            workflow_steps: [
              "Inspect src/routes/export.ts for the export mismatch.",
              "Patch the route export serialization.",
              "Rerun export-focused tests before handoff.",
            ],
            pattern_hints: [
              "prefer_edit_for_route_level_repairs",
              "keep_changes_scoped_to_export_route",
            ],
            service_lifecycle_constraints: [
              {
                version: 1,
                service_kind: "generic",
                label: "export test verification shell",
                launch_reference: null,
                endpoint: null,
                must_survive_agent_exit: false,
                revalidate_from_fresh_shell: true,
                detach_then_probe: false,
                healthcheck_commands: ["npm test -- export"],
                notes: ["rerun export tests from a fresh shell before handoff"],
              },
            ],
          },
        },
      },
      candidates: ["bash", "edit", "test"],
    };

    const before = ExperienceIntelligenceResponseSchema.parse((await app.inject({
      method: "POST",
      url: "/v1/memory/experience/intelligence",
      payload,
    })).json());
    assert.equal(before.recommendation.tool.selected_tool, "bash");
    assert.equal(before.recommendation.history_applied, false);

    for (let i = 0; i < 3; i += 1) {
      await liteWriteStore.withTx(() =>
        toolSelectionFeedback(null, {
          tenant_id: "default",
          scope: "default",
          actor: "local-user",
          run_id: randomUUID(),
          outcome: "positive",
          context: payload.context,
          candidates: payload.candidates,
          selected_tool: "edit",
          target: "tool",
          note: "Edit solved the export repair path",
          input_text: payload.query_text,
        }, "default", "default", {
          maxTextLen: 10_000,
          piiRedaction: false,
          embedder: FakeEmbeddingProvider,
          liteWriteStore,
        }),
      );
    }

    const afterResponse = await app.inject({
      method: "POST",
      url: "/v1/memory/experience/intelligence",
      payload,
    });
    assert.equal(afterResponse.statusCode, 200);
    const after = ExperienceIntelligenceResponseSchema.parse(afterResponse.json());
    assert.equal(after.recommendation.tool.selected_tool, "edit");
    assert.equal(after.recommendation.history_applied, true);
    assert.ok(after.recommendation.tool.trusted_pattern_anchor_ids.length > 0);
    assert.equal(after.policy_contract?.selected_tool, "edit");
    assert.equal(after.policy_contract?.materialization_state, "persisted");
    assert.equal(after.policy_contract?.policy_memory_state, "active");
    assert.ok(typeof after.policy_contract?.policy_memory_id === "string" && after.policy_contract.policy_memory_id.length > 0);
    assert.equal(after.policy_contract?.task_family, "task:repair_export");
    assert.deepEqual(after.policy_contract?.target_files, ["src/routes/export.ts"]);
    assert.equal(after.policy_contract?.file_path, "src/routes/export.ts");
    assert.equal(after.policy_contract?.next_action, "Patch src/routes/export.ts and rerun export tests.");
    assert.deepEqual(after.policy_contract?.workflow_steps, [
      "Inspect src/routes/export.ts for the export mismatch.",
      "Patch the route export serialization.",
      "Rerun export-focused tests before handoff.",
    ]);
    assert.deepEqual(after.policy_contract?.pattern_hints, [
      "prefer_edit_for_route_level_repairs",
      "keep_changes_scoped_to_export_route",
    ]);
    assert.equal(after.policy_contract?.service_lifecycle_constraints?.[0]?.revalidate_from_fresh_shell, true);
    assert.match(after.rationale.summary, /persisted_policy_memory=/);
    assert.match(after.rationale.summary, /trusted pattern support/i);
  } finally {
    await app.close();
    await liteRecallStore.close();
    await liteWriteStore.close();
  }
});

test("kickoff recommendation route can recover file-level guidance from family-level persisted policy memory", async () => {
  const app = Fastify();
  const dbPath = tmpDbPath("kickoff-route-persisted-policy-memory");
  const liteWriteStore = createLiteWriteStore(dbPath);
  const liteRecallStore = createLiteRecallStore(dbPath);
  try {
    const guards = buildRequestGuards();
    registerHostErrorHandler(app);
    registerMemoryAccessRoutes({
      app,
      env: {
        AIONIS_EDITION: "lite",
        APP_ENV: "test",
        MEMORY_SCOPE: "default",
        MEMORY_TENANT_ID: "default",
        LITE_LOCAL_ACTOR_ID: "local-user",
        MAX_TEXT_LEN: 10_000,
        PII_REDACTION: false,
        ALLOW_CROSS_SCOPE_EDGES: false,
        MEMORY_SHADOW_DUAL_WRITE_ENABLED: false,
        MEMORY_SHADOW_DUAL_WRITE_STRICT: false,
      } as any,
      embedder: FakeEmbeddingProvider,
      liteWriteStore,
      liteRecallAccess: liteRecallStore.createRecallAccess(),
      writeAccessShadowMirrorV2: false,
      requireStoreFeatureCapability: () => {},
      requireMemoryPrincipal: guards.requireMemoryPrincipal,
      withIdentityFromRequest: guards.withIdentityFromRequest,
      enforceRateLimit: guards.enforceRateLimit,
      enforceTenantQuota: guards.enforceTenantQuota,
      tenantFromBody: guards.tenantFromBody,
      acquireInflightSlot: guards.acquireInflightSlot,
    });

    const feedbackContext = {
      task_kind: "repair_export",
      task_family: "task:repair_export",
      workflow_signature: "execution_workflow:repair-export",
      goal: "repair export failure in node tests",
      target_files: ["src/routes/export.ts"],
      next_action: "Patch src/routes/export.ts and rerun export tests.",
      error: {
        signature: "node-export-mismatch",
      },
      recovery_contract_v1: {
        task_family: "task:repair_export",
        task_signature: "repair-export-route",
        workflow_signature: "execution_workflow:repair-export",
        contract: {
          target_files: ["src/routes/export.ts"],
          next_action: "Patch src/routes/export.ts and rerun export tests.",
          workflow_steps: [
            "Inspect src/routes/export.ts for the export mismatch.",
            "Patch the route export serialization.",
            "Rerun export-focused tests before handoff.",
          ],
          pattern_hints: [
            "prefer_edit_for_route_level_repairs",
            "keep_changes_scoped_to_export_route",
          ],
          service_lifecycle_constraints: [
            {
              version: 1,
              service_kind: "generic",
              label: "export test verification shell",
              launch_reference: null,
              endpoint: null,
              must_survive_agent_exit: false,
              revalidate_from_fresh_shell: true,
              detach_then_probe: false,
              healthcheck_commands: ["npm test -- export"],
              notes: ["rerun export tests from a fresh shell before handoff"],
            },
          ],
        },
      },
    };

    for (let i = 0; i < 3; i += 1) {
      await liteWriteStore.withTx(() =>
        toolSelectionFeedback(null, {
          tenant_id: "default",
          scope: "default",
          actor: "local-user",
          run_id: randomUUID(),
          outcome: "positive",
          context: feedbackContext,
          candidates: ["bash", "edit", "test"],
          selected_tool: "edit",
          target: "tool",
          note: "Edit solved the export repair path and should persist as reusable guidance.",
          input_text: "repair export failure in node tests",
        }, "default", "default", {
          maxTextLen: 10_000,
          piiRedaction: false,
          embedder: FakeEmbeddingProvider,
          liteWriteStore,
        }),
      );
    }

    const response = await app.inject({
      method: "POST",
      url: "/v1/memory/kickoff/recommendation",
      payload: {
        tenant_id: "default",
        scope: "default",
        query_text: "Repository repair request: fix the export mismatch and verify the fix.",
        context: {
          task_kind: "repair_export",
          task_family: "task:repair_export",
          host_tool_profile: "Repository-repair request detected; inspect current failure state first, patch the broken export path, then verify from a fresh shell.",
          error: {
            signature: "node-export-mismatch",
          },
        },
        candidates: ["bash", "edit", "test"],
      },
    });

    assert.equal(response.statusCode, 200);
    const body = KickoffRecommendationResponseSchema.parse(response.json());
    assert.deepEqual(body.kickoff_recommendation, {
      source_kind: "experience_intelligence",
      history_applied: true,
      selected_tool: "edit",
      task_family: "task:repair_export",
      workflow_signature: "execution_workflow:repair-export",
      policy_memory_id: body.policy_contract?.policy_memory_id ?? null,
      file_path: "src/routes/export.ts",
      next_action: "Patch src/routes/export.ts and rerun export tests.",
    });
    assert.equal(body.policy_contract?.materialization_state, "persisted");
    assert.equal(body.policy_contract?.task_family, "task:repair_export");
    assert.deepEqual(body.policy_contract?.target_files, ["src/routes/export.ts"]);
    assert.equal(body.policy_contract?.service_lifecycle_constraints?.[0]?.revalidate_from_fresh_shell, true);
    assert.match(body.rationale.summary, /persisted_policy_memory=/);
  } finally {
    await app.close();
    await liteRecallStore.close();
    await liteWriteStore.close();
  }
});

test("kickoff recommendation route returns a host-consumable file-level kickoff from learned history", async () => {
  const app = Fastify();
  const { liteWriteStore, liteRecallStore } = await seedStableWorkflowFixture(tmpDbPath("kickoff-route-history"));
  try {
    const guards = buildRequestGuards();
    registerHostErrorHandler(app);
    registerMemoryAccessRoutes({
      app,
      env: {
        AIONIS_EDITION: "lite",
        APP_ENV: "test",
        MEMORY_SCOPE: "default",
        MEMORY_TENANT_ID: "default",
        LITE_LOCAL_ACTOR_ID: "local-user",
        MAX_TEXT_LEN: 10_000,
        PII_REDACTION: false,
        ALLOW_CROSS_SCOPE_EDGES: false,
        MEMORY_SHADOW_DUAL_WRITE_ENABLED: false,
        MEMORY_SHADOW_DUAL_WRITE_STRICT: false,
      } as any,
      embedder: FakeEmbeddingProvider,
      liteWriteStore,
      liteRecallAccess: liteRecallStore.createRecallAccess(),
      writeAccessShadowMirrorV2: false,
      requireStoreFeatureCapability: () => {},
      requireMemoryPrincipal: guards.requireMemoryPrincipal,
      withIdentityFromRequest: guards.withIdentityFromRequest,
      enforceRateLimit: guards.enforceRateLimit,
      enforceTenantQuota: guards.enforceTenantQuota,
      tenantFromBody: guards.tenantFromBody,
      acquireInflightSlot: guards.acquireInflightSlot,
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/memory/kickoff/recommendation",
      payload: {
        tenant_id: "default",
        scope: "default",
        query_text: "repair export failure in node tests",
        context: {
          task_kind: "repair_export",
          goal: "repair export failure in node tests",
          error: {
            signature: "node-export-mismatch",
          },
        },
        candidates: ["bash", "edit", "test"],
      },
    });

    assert.equal(response.statusCode, 200);
    const body = KickoffRecommendationResponseSchema.parse(response.json());
    assert.ok(!("recommendation" in (body as Record<string, unknown>)));
    assert.deepEqual(body.kickoff_recommendation, {
      source_kind: "experience_intelligence",
      history_applied: true,
      selected_tool: "edit",
      task_family: "task:repair_export",
      workflow_signature: "execution_workflow:repair-export",
      policy_memory_id: null,
      file_path: "src/routes/export.ts",
      next_action: "Patch src/routes/export.ts and rerun export tests.",
    });
    assert.equal(body.policy_contract?.selected_tool, "edit");
    assert.equal(body.policy_contract?.materialization_state, "computed");
    assert.match(body.rationale.summary, /stable_workflows=1/);
  } finally {
    await app.close();
    await liteRecallStore.close();
    await liteWriteStore.close();
  }
});

test("kickoff recommendation route falls back to tool-only kickoff for unrelated queries", async () => {
  const app = Fastify();
  const { liteWriteStore, liteRecallStore } = await seedStableWorkflowFixture(tmpDbPath("kickoff-route-unrelated"));
  try {
    const guards = buildRequestGuards();
    registerHostErrorHandler(app);
    registerMemoryAccessRoutes({
      app,
      env: {
        AIONIS_EDITION: "lite",
        APP_ENV: "test",
        MEMORY_SCOPE: "default",
        MEMORY_TENANT_ID: "default",
        LITE_LOCAL_ACTOR_ID: "local-user",
        MAX_TEXT_LEN: 10_000,
        PII_REDACTION: false,
        ALLOW_CROSS_SCOPE_EDGES: false,
        MEMORY_SHADOW_DUAL_WRITE_ENABLED: false,
        MEMORY_SHADOW_DUAL_WRITE_STRICT: false,
      } as any,
      embedder: FakeEmbeddingProvider,
      liteWriteStore,
      liteRecallAccess: liteRecallStore.createRecallAccess(),
      writeAccessShadowMirrorV2: false,
      requireStoreFeatureCapability: () => {},
      requireMemoryPrincipal: guards.requireMemoryPrincipal,
      withIdentityFromRequest: guards.withIdentityFromRequest,
      enforceRateLimit: guards.enforceRateLimit,
      enforceTenantQuota: guards.enforceTenantQuota,
      tenantFromBody: guards.tenantFromBody,
      acquireInflightSlot: guards.acquireInflightSlot,
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/memory/kickoff/recommendation",
      payload: {
        tenant_id: "default",
        scope: "default",
        query_text: "summarize competitor pricing deltas for the quarterly market memo",
        context: {
          task_kind: "market_pricing_memo",
          goal: "summarize competitor pricing deltas for the quarterly market memo",
          error: {
            signature: "pricing-table-delta",
          },
        },
        candidates: ["bash", "grep", "read"],
      },
    });

    assert.equal(response.statusCode, 200);
    const body = KickoffRecommendationResponseSchema.parse(response.json());
    assert.deepEqual(body.kickoff_recommendation, {
      source_kind: "tool_selection",
      history_applied: false,
      selected_tool: "bash",
      task_family: null,
      workflow_signature: null,
      policy_memory_id: null,
      file_path: null,
      next_action: "Inspect the current context before starting with bash.",
    });
    assert.equal(body.action_retrieval_uncertainty?.summary_version, "action_retrieval_uncertainty_v1");
    assert.equal(body.action_retrieval_uncertainty?.level, "high");
    assert.ok(body.action_retrieval_uncertainty?.recommended_actions.includes("inspect_context"));
  } finally {
    await app.close();
    await liteRecallStore.close();
    await liteWriteStore.close();
  }
});

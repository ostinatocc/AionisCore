import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Fastify from "fastify";
import { createRequestGuards } from "../../src/app/request-guards.ts";
import { registerHostErrorHandler } from "../../src/host/http-host.ts";
import {
  DelegationRecordsAggregateResponseSchema,
  DelegationRecordsFindResponseSchema,
  DelegationRecordsWriteResponseSchema,
} from "../../src/memory/schemas.ts";
import { registerMemoryAccessRoutes } from "../../src/routes/memory-access.ts";
import { createLiteRecallStore } from "../../src/store/lite-recall-store.ts";
import { createLiteWriteStore } from "../../src/store/lite-write-store.ts";
import { InflightGate } from "../../src/util/inflight_gate.ts";

function tmpDbPath(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-lite-delegation-records-"));
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
    MEMORY_SHADOW_DUAL_WRITE_ENABLED: false,
    MEMORY_SHADOW_DUAL_WRITE_STRICT: false,
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
    embedder: null,
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
    embedder: null,
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

test("delegation records route persists a standalone execution delegation record event", async () => {
  const dbPath = tmpDbPath("delegation-records");
  const app = Fastify();
  const liteWriteStore = createLiteWriteStore(dbPath);
  const liteRecallStore = createLiteRecallStore(dbPath);
  try {
    registerApp({ app, liteWriteStore, liteRecallStore });

    const response = await app.inject({
      method: "POST",
      url: "/v1/memory/delegation/records",
      payload: {
        tenant_id: "default",
        scope: "default",
        run_id: "run:export-review-001",
        handoff_anchor: "resume:src/routes/export.ts",
        delegation_records_v1: {
          summary_version: "execution_delegation_records_v1",
          record_mode: "packet_backed",
          route_role: "review",
          packet_count: 1,
          return_count: 1,
          artifact_routing_count: 2,
          missing_record_types: [],
          delegation_packets: [{
            version: 1,
            role: "review",
            mission: "Review the export patch and verify the final checks.",
            working_set: ["src/routes/export.ts"],
            acceptance_checks: ["npm run -s test:lite -- export"],
            output_contract: "Return review findings and exact validation status.",
            preferred_artifact_refs: ["artifact://export/patch"],
            inherited_evidence: ["evidence://export/test"],
            routing_reason: "packet-backed review route",
            task_family: "patch_handoff",
            family_scope: "aionis://runtime/export-review",
            source_mode: "packet_backed",
          }],
          delegation_returns: [{
            version: 1,
            role: "review",
            status: "passed",
            summary: "Review completed and export checks passed.",
            evidence: ["evidence://export/test"],
            working_set: ["src/routes/export.ts"],
            acceptance_checks: ["npm run -s test:lite -- export"],
            source_mode: "packet_backed",
          }],
          artifact_routing_records: [{
            version: 1,
            ref: "artifact://export/patch",
            ref_kind: "artifact",
            route_role: "review",
            route_intent: "review",
            route_mode: "packet_backed",
            task_family: "patch_handoff",
            family_scope: "aionis://runtime/export-review",
            routing_reason: "review artifact route",
            source: "execution_packet",
          }, {
            version: 1,
            ref: "evidence://export/test",
            ref_kind: "evidence",
            route_role: "review",
            route_intent: "review",
            route_mode: "packet_backed",
            task_family: "patch_handoff",
            family_scope: "aionis://runtime/export-review",
            routing_reason: "review evidence route",
            source: "execution_packet",
          }],
        },
        execution_result_summary: {
          status: "passed",
          summary: "Review completed and export checks passed.",
        },
        execution_artifacts: [{ ref: "artifact://export/patch" }],
        execution_evidence: [{ ref: "evidence://export/test" }],
        execution_state_v1: {
          version: 1,
          state_id: "state:export-review-001",
          scope: "aionis://runtime/export-review",
          task_brief: "Review export patch",
          current_stage: "review",
          active_role: "review",
          owned_files: ["src/routes/export.ts"],
          modified_files: ["src/routes/export.ts"],
          pending_validations: ["npm run -s test:lite -- export"],
          completed_validations: [],
          last_accepted_hypothesis: null,
          rejected_paths: [],
          unresolved_blockers: [],
          rollback_notes: [],
          reviewer_contract: null,
          resume_anchor: {
            anchor: "resume:src/routes/export.ts",
            file_path: "src/routes/export.ts",
            symbol: null,
            repo_root: "/repo",
          },
          updated_at: "2026-04-15T12:00:00.000Z",
        },
        execution_packet_v1: {
          version: 1,
          state_id: "state:export-review-001",
          current_stage: "review",
          active_role: "review",
          task_brief: "Review export patch",
          target_files: ["src/routes/export.ts"],
          next_action: "Review src/routes/export.ts and rerun export checks",
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
            repo_root: "/repo",
          },
          artifact_refs: ["artifact://export/patch"],
          evidence_refs: ["evidence://export/test"],
        },
      },
    });
    assert.equal(response.statusCode, 200, response.body);
    const parsed = DelegationRecordsWriteResponseSchema.parse(response.json());
    assert.equal(parsed.record_event?.memory_lane, "shared");
    assert.equal(parsed.record_event?.route_role, "review");
    assert.equal(parsed.record_event?.run_id, "run:export-review-001");
    assert.equal(parsed.delegation_records_v1.return_count, 1);
    assert.equal(parsed.execution_result_summary?.status, "passed");

    const findResponse = await app.inject({
      method: "POST",
      url: "/v1/memory/find",
      payload: {
        tenant_id: "default",
        scope: "default",
        type: "event",
        limit: 5,
        include_slots_preview: true,
        slots_preview_keys: 20,
        slots_contains: {
          summary_kind: "delegation_records",
          run_id: "run:export-review-001",
        },
      },
    });
    assert.equal(findResponse.statusCode, 200, findResponse.body);
    const findBody = findResponse.json();
    assert.equal(findBody.nodes.length, 1);
    assert.equal(findBody.nodes[0]?.slots_preview?.summary_kind, "delegation_records");
    assert.equal(findBody.nodes[0]?.slots_preview?.run_id, "run:export-review-001");

    const resolveResponse = await app.inject({
      method: "POST",
      url: "/v1/memory/resolve",
      payload: {
        tenant_id: "default",
        scope: "default",
        uri: parsed.record_event?.uri,
        include_slots: true,
        include_meta: true,
      },
    });
    assert.equal(resolveResponse.statusCode, 200, resolveResponse.body);
    const resolveBody = resolveResponse.json();
    assert.equal(resolveBody.node.memory_lane, "shared");
    assert.equal(resolveBody.node.slots.summary_kind, "delegation_records");
    assert.equal(resolveBody.node.slots.route_role, "review");
    assert.equal(resolveBody.node.slots.delegation_records_v1.summary_version, "execution_delegation_records_v1");
    assert.equal(resolveBody.node.slots.delegation_records_v1.return_count, 1);
    assert.equal(resolveBody.node.slots.execution_result_summary.status, "passed");
  } finally {
    await app.close();
    await liteWriteStore.close();
  }
});

test("delegation records find route returns typed records with aggregation summary", async () => {
  const dbPath = tmpDbPath("delegation-records-find");
  const app = Fastify();
  const liteWriteStore = createLiteWriteStore(dbPath);
  const liteRecallStore = createLiteRecallStore(dbPath);
  try {
    registerApp({ app, liteWriteStore, liteRecallStore });

    const writes = [
      {
        tenant_id: "default",
        scope: "default",
        run_id: "run:review-001",
        handoff_anchor: "resume:src/routes/export.ts",
        route_role: "review",
        task_family: "patch_handoff",
        delegation_records_v1: {
          summary_version: "execution_delegation_records_v1",
          record_mode: "packet_backed",
          route_role: "review",
          packet_count: 1,
          return_count: 1,
          artifact_routing_count: 2,
          missing_record_types: [],
          delegation_packets: [{
            version: 1,
            role: "review",
            mission: "Review the export patch and verify the final checks.",
            working_set: ["src/routes/export.ts"],
            acceptance_checks: ["npm run -s test:lite -- export"],
            output_contract: "Return review findings and exact validation status.",
            preferred_artifact_refs: ["artifact://export/patch"],
            inherited_evidence: ["evidence://export/test"],
            routing_reason: "packet-backed review route",
            task_family: "patch_handoff",
            family_scope: "aionis://runtime/export-review",
            source_mode: "packet_backed",
          }],
          delegation_returns: [{
            version: 1,
            role: "review",
            status: "passed",
            summary: "Review completed and export checks passed.",
            evidence: ["evidence://export/test"],
            working_set: ["src/routes/export.ts"],
            acceptance_checks: ["npm run -s test:lite -- export"],
            source_mode: "packet_backed",
          }],
          artifact_routing_records: [{
            version: 1,
            ref: "artifact://export/patch",
            ref_kind: "artifact",
            route_role: "review",
            route_intent: "review",
            route_mode: "packet_backed",
            task_family: "patch_handoff",
            family_scope: "aionis://runtime/export-review",
            routing_reason: "review artifact route",
            source: "execution_packet",
          }, {
            version: 1,
            ref: "evidence://export/test",
            ref_kind: "evidence",
            route_role: "review",
            route_intent: "review",
            route_mode: "packet_backed",
            task_family: "patch_handoff",
            family_scope: "aionis://runtime/export-review",
            routing_reason: "review evidence route",
            source: "execution_packet",
          }],
        },
        execution_result_summary: {
          status: "passed",
          summary: "Review completed and export checks passed.",
        },
        execution_artifacts: [{ ref: "artifact://export/patch" }],
        execution_evidence: [{ ref: "evidence://export/test" }],
      },
      {
        tenant_id: "default",
        scope: "default",
        memory_lane: "private",
        run_id: "run:review-002",
        handoff_anchor: "resume:src/lib/export.ts",
        route_role: "review",
        task_family: "patch_handoff",
        delegation_records_v1: {
          summary_version: "execution_delegation_records_v1",
          record_mode: "memory_only",
          route_role: "review",
          packet_count: 1,
          return_count: 1,
          artifact_routing_count: 1,
          missing_record_types: [],
          delegation_packets: [{
            version: 1,
            role: "review",
            mission: "Review the export helper patch before merge.",
            working_set: ["src/lib/export.ts"],
            acceptance_checks: ["npm run -s lint"],
            output_contract: "Return reviewer decision with any blocking issues.",
            preferred_artifact_refs: ["artifact://export/helper.patch"],
            inherited_evidence: [],
            routing_reason: "memory-only review route",
            task_family: "patch_handoff",
            family_scope: "aionis://runtime/export-review",
            source_mode: "memory_only",
          }],
          delegation_returns: [{
            version: 1,
            role: "review",
            status: "blocked",
            summary: "Review found one blocking API compatibility issue.",
            evidence: ["evidence://export/api-check"],
            working_set: ["src/lib/export.ts"],
            acceptance_checks: ["npm run -s lint"],
            source_mode: "memory_only",
          }],
          artifact_routing_records: [{
            version: 1,
            ref: "artifact://export/helper.patch",
            ref_kind: "artifact",
            route_role: "review",
            route_intent: "memory_guided",
            route_mode: "memory_only",
            task_family: "patch_handoff",
            family_scope: "aionis://runtime/export-review",
            routing_reason: "memory-guided artifact route",
            source: "strategy_summary",
          }],
        },
        execution_result_summary: {
          status: "blocked",
          summary: "Review found one blocking API compatibility issue.",
        },
      },
      {
        tenant_id: "default",
        scope: "default",
        run_id: "run:patch-003",
        route_role: "patch",
        task_family: "patch_handoff",
        delegation_records_v1: {
          summary_version: "execution_delegation_records_v1",
          record_mode: "packet_backed",
          route_role: "patch",
          packet_count: 1,
          return_count: 0,
          artifact_routing_count: 1,
          missing_record_types: ["delegation_returns"],
          delegation_packets: [{
            version: 1,
            role: "patch",
            mission: "Apply the export patch.",
            working_set: ["src/routes/export.ts"],
            acceptance_checks: ["npm run -s test:lite -- export"],
            output_contract: "Return applied patch metadata.",
            preferred_artifact_refs: ["artifact://export/patch"],
            inherited_evidence: [],
            routing_reason: "patch route",
            task_family: "patch_handoff",
            family_scope: "aionis://runtime/export-review",
            source_mode: "packet_backed",
          }],
          delegation_returns: [],
          artifact_routing_records: [{
            version: 1,
            ref: "artifact://export/patch",
            ref_kind: "artifact",
            route_role: "patch",
            route_intent: "patch",
            route_mode: "packet_backed",
            task_family: "patch_handoff",
            family_scope: "aionis://runtime/export-review",
            routing_reason: "patch artifact route",
            source: "execution_packet",
          }],
        },
      },
    ];

    for (const payload of writes) {
      const response = await app.inject({
        method: "POST",
        url: "/v1/memory/delegation/records",
        payload,
      });
      assert.equal(response.statusCode, 200, response.body);
    }

    const response = await app.inject({
      method: "POST",
      url: "/v1/memory/delegation/records/find",
      payload: {
        tenant_id: "default",
        scope: "default",
        route_role: "review",
        task_family: "patch_handoff",
        include_payload: true,
        limit: 10,
      },
    });
    assert.equal(response.statusCode, 200, response.body);
    const parsed = DelegationRecordsFindResponseSchema.parse(response.json());
    assert.equal(parsed.summary.returned_records, 2);
    assert.equal(parsed.summary.has_more, false);
    assert.equal(parsed.summary.invalid_records, 0);
    assert.deepEqual(parsed.summary.filters_applied, ["route_role", "task_family"]);
    assert.deepEqual(parsed.summary.record_mode_counts, {
      memory_only: 1,
      packet_backed: 1,
    });
    assert.deepEqual(parsed.summary.memory_lane_counts, {
      private: 1,
      shared: 1,
    });
    assert.deepEqual(parsed.summary.route_role_counts, {
      review: 2,
    });
    assert.deepEqual(parsed.summary.task_family_counts, {
      patch_handoff: 2,
    });
    assert.deepEqual(parsed.summary.return_status_counts, {
      blocked: 1,
      passed: 1,
    });
    assert.deepEqual(parsed.summary.artifact_source_counts, {
      execution_packet: 2,
      strategy_summary: 1,
    });
    assert.equal(parsed.summary.packet_count, 2);
    assert.equal(parsed.summary.return_count, 2);
    assert.equal(parsed.summary.artifact_routing_count, 3);
    assert.equal(parsed.summary.run_id_count, 2);
    assert.equal(parsed.summary.handoff_anchor_count, 2);
    assert.equal(parsed.records.length, 2);
    assert.ok(parsed.records.some((record) => record.memory_lane === "private"));
    assert.ok(parsed.records.some((record) => record.record_mode === "packet_backed"));
    const latestReview = parsed.records.find((record) => record.run_id === "run:review-002");
    assert.ok(latestReview);
    assert.equal(latestReview?.execution_side_outputs.result_present, true);
    assert.equal(latestReview?.execution_side_outputs.artifact_count, 0);
    assert.equal(latestReview?.execution_side_outputs.evidence_count, 0);
    assert.equal(latestReview?.execution_result_summary?.status, "blocked");
    assert.deepEqual(
      latestReview?.delegation_records_v1.delegation_returns.map((record) => record.status),
      ["blocked"],
    );

    const aggregateResponse = await app.inject({
      method: "POST",
      url: "/v1/memory/delegation/records/aggregate",
      payload: {
        tenant_id: "default",
        scope: "default",
        route_role: "review",
        task_family: "patch_handoff",
        limit: 10,
      },
    });
    assert.equal(aggregateResponse.statusCode, 200, aggregateResponse.body);
    const aggregate = DelegationRecordsAggregateResponseSchema.parse(aggregateResponse.json());
    assert.equal(aggregate.summary.matched_records, 2);
    assert.equal(aggregate.summary.truncated, false);
    assert.equal(aggregate.summary.invalid_records, 0);
    assert.deepEqual(aggregate.summary.filters_applied, ["route_role", "task_family"]);
    assert.equal(aggregate.summary.records_with_returns, 2);
    assert.equal(aggregate.summary.records_with_missing_types, 0);
    assert.equal(aggregate.summary.records_with_payload_result, 2);
    assert.equal(aggregate.summary.records_with_payload_artifacts, 1);
    assert.equal(aggregate.summary.records_with_payload_evidence, 1);
    assert.equal(aggregate.summary.records_with_payload_state, 0);
    assert.equal(aggregate.summary.records_with_payload_packet, 0);
    assert.deepEqual(aggregate.summary.route_role_buckets, [{
      key: "review",
      record_count: 2,
      packet_count: 2,
      return_count: 2,
      artifact_routing_count: 3,
      record_mode_counts: {
        memory_only: 1,
        packet_backed: 1,
      },
      task_family_counts: {
        patch_handoff: 2,
      },
      return_status_counts: {
        blocked: 1,
        passed: 1,
      },
      artifact_source_counts: {
        execution_packet: 2,
        strategy_summary: 1,
      },
    }]);
    assert.deepEqual(aggregate.summary.task_family_buckets, [{
      key: "patch_handoff",
      record_count: 2,
      packet_count: 2,
      return_count: 2,
      artifact_routing_count: 3,
      record_mode_counts: {
        memory_only: 1,
        packet_backed: 1,
      },
      route_role_counts: {
        review: 2,
      },
      return_status_counts: {
        blocked: 1,
        passed: 1,
      },
      artifact_source_counts: {
        execution_packet: 2,
        strategy_summary: 1,
      },
    }]);
    assert.deepEqual(aggregate.summary.normalized_return_status_counts, {
      blocked: 1,
      completed: 1,
    });
    assert.deepEqual(aggregate.summary.record_outcome_counts, {
      blocked: 1,
      completed: 1,
    });
    assert.equal(aggregate.summary.completion_rate, 0.5);
    assert.equal(aggregate.summary.blocked_rate, 0.5);
    assert.equal(aggregate.summary.missing_return_rate, 0);
    assert.deepEqual(aggregate.summary.top_reusable_patterns, [{
      route_role: "review",
      task_family: "patch_handoff",
      record_count: 2,
      record_mode_counts: {
        memory_only: 1,
        packet_backed: 1,
      },
      record_outcome_counts: {
        blocked: 1,
        completed: 1,
      },
      sample_mission: "Review the export patch and verify the final checks.",
      sample_acceptance_checks: ["npm run -s test:lite -- export"],
      sample_working_set_files: ["src/routes/export.ts"],
      sample_artifact_refs: ["artifact://export/patch"],
    }]);
    assert.deepEqual(aggregate.summary.learning_recommendations, [{
      recommendation_kind: "review_blocked_pattern",
      priority: "high",
      route_role: "review",
      task_family: "patch_handoff",
      recommended_action: "Review the blocked delegation pattern for review / patch_handoff before reusing it broadly.",
      rationale: "1 captured records for this pattern ended blocked, so its routing contract still needs tightening.",
      sample_mission: "Review the export patch and verify the final checks.",
      sample_acceptance_checks: ["npm run -s test:lite -- export"],
      sample_working_set_files: ["src/routes/export.ts"],
      sample_artifact_refs: ["artifact://export/patch"],
    }, {
      recommendation_kind: "increase_artifact_capture",
      priority: "medium",
      route_role: "review",
      task_family: "patch_handoff",
      recommended_action: "Capture artifacts and evidence more consistently for review / patch_handoff.",
      rationale: "Only 1/2 records carried payload artifacts and 1/2 carried payload evidence.",
      sample_mission: "Review the export patch and verify the final checks.",
      sample_acceptance_checks: ["npm run -s test:lite -- export"],
      sample_working_set_files: ["src/routes/export.ts"],
      sample_artifact_refs: ["artifact://export/patch"],
    }, {
      recommendation_kind: "promote_reusable_pattern",
      priority: "medium",
      route_role: "review",
      task_family: "patch_handoff",
      recommended_action: "Promote the review / patch_handoff delegation pattern into a reusable host recipe.",
      rationale: "1 successful captures already include reusable checks, working-set files, and artifact refs for this pattern.",
      sample_mission: "Review the export patch and verify the final checks.",
      sample_acceptance_checks: ["npm run -s test:lite -- export"],
      sample_working_set_files: ["src/routes/export.ts"],
      sample_artifact_refs: ["artifact://export/patch"],
    }]);
    assert.deepEqual(aggregate.summary.top_artifact_refs, [
      {
        ref: "artifact://export/helper.patch",
        ref_kind: "artifact",
        count: 1,
        source_counts: {
          strategy_summary: 1,
        },
      },
      {
        ref: "artifact://export/patch",
        ref_kind: "artifact",
        count: 1,
        source_counts: {
          execution_packet: 1,
        },
      },
      {
        ref: "evidence://export/test",
        ref_kind: "evidence",
        count: 1,
        source_counts: {
          execution_packet: 1,
        },
      },
    ]);
    assert.deepEqual(aggregate.summary.top_acceptance_checks, [
      { value: "npm run -s lint", count: 2 },
      { value: "npm run -s test:lite -- export", count: 2 },
    ]);
    assert.deepEqual(aggregate.summary.top_working_set_files, [
      { value: "src/lib/export.ts", count: 2 },
      { value: "src/routes/export.ts", count: 2 },
    ]);

    const patchAggregateResponse = await app.inject({
      method: "POST",
      url: "/v1/memory/delegation/records/aggregate",
      payload: {
        tenant_id: "default",
        scope: "default",
        route_role: "patch",
        task_family: "patch_handoff",
        limit: 10,
      },
    });
    assert.equal(patchAggregateResponse.statusCode, 200, patchAggregateResponse.body);
    const patchAggregate = DelegationRecordsAggregateResponseSchema.parse(patchAggregateResponse.json());
    assert.equal(patchAggregate.summary.matched_records, 1);
    assert.deepEqual(patchAggregate.summary.record_outcome_counts, {
      missing_return: 1,
    });
    assert.equal(patchAggregate.summary.missing_return_rate, 1);
    assert.deepEqual(patchAggregate.summary.learning_recommendations, [{
      recommendation_kind: "capture_missing_returns",
      priority: "high",
      route_role: "patch",
      task_family: "patch_handoff",
      recommended_action: "Capture delegation returns consistently for patch / patch_handoff.",
      rationale: "1 matching records are still missing delegation returns, so the learning loop cannot close cleanly.",
      sample_mission: null,
      sample_acceptance_checks: [],
      sample_working_set_files: [],
      sample_artifact_refs: [],
    }, {
      recommendation_kind: "increase_artifact_capture",
      priority: "medium",
      route_role: "patch",
      task_family: "patch_handoff",
      recommended_action: "Capture artifacts and evidence more consistently for patch / patch_handoff.",
      rationale: "Only 0/1 records carried payload artifacts and 0/1 carried payload evidence.",
      sample_mission: "Apply the export patch.",
      sample_acceptance_checks: ["npm run -s test:lite -- export"],
      sample_working_set_files: ["src/routes/export.ts"],
      sample_artifact_refs: ["artifact://export/patch"],
    }]);
  } finally {
    await app.close();
    await liteRecallStore.close();
    await liteWriteStore.close();
  }
});

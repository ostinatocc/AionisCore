import assert from "node:assert/strict";
import test from "node:test";
import { createAionisClient } from "../src/client.js";
import { AionisSdkHttpError } from "../src/error.js";

test("createAionisClient exposes the v1 memory surface and routes requests to the expected paths", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = createAionisClient({
    baseUrl: "http://127.0.0.1:3001/",
    headers: {
      authorization: "Bearer test-token",
    },
    fetch: async (input, init) => {
      const url = String(input);
      calls.push({
        url,
        init,
      });
      if (url.endsWith("/v1/memory/kickoff/recommendation")) {
        return new Response(JSON.stringify({
          summary_version: "kickoff_recommendation_v1",
          tenant_id: "default",
          scope: "sdk-test-kickoff",
          query_text: "repair export failure",
          kickoff_recommendation: {
            source_kind: "tool_selection",
            history_applied: false,
            selected_tool: "bash",
            file_path: null,
            next_action: "Start with bash as the next step.",
          },
          rationale: {
            summary: "Fallback kickoff response for SDK route mapping.",
          },
        }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }
      return new Response(JSON.stringify({
        ok: true,
        echoed_path: url,
      }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    },
  });

  await client.memory.write({
    tenant_id: "default",
    scope: "sdk-test-write",
    input_text: "write request",
    nodes: [],
    edges: [],
  });
  await client.memory.planningContext({
    tenant_id: "default",
    scope: "sdk-test-planning",
    query_text: "repair export failure",
    context: { goal: "repair export failure" },
  });
  await client.memory.contextAssemble({
    tenant_id: "default",
    scope: "sdk-test-assemble",
    query_text: "repair export failure",
    context: { goal: "repair export failure" },
  });
  await client.memory.kickoffRecommendation({
    tenant_id: "default",
    scope: "sdk-test-kickoff",
    query_text: "repair export failure",
    context: { goal: "repair export failure" },
    candidates: ["bash", "edit"],
  });
  await client.memory.taskStart({
    tenant_id: "default",
    scope: "sdk-test-task-start",
    query_text: "repair export failure",
    context: { goal: "repair export failure" },
    candidates: ["bash", "edit"],
  });
  await client.memory.taskStartPlan({
    tenant_id: "default",
    scope: "sdk-test-task-start-plan",
    query_text: "repair export failure",
    context: { goal: "repair export failure" },
    candidates: ["bash", "edit"],
  });
  await client.memory.executionIntrospect({
    tenant_id: "default",
    scope: "sdk-test-introspect",
  });
  await client.memory.agent.inspect({
    tenant_id: "default",
    scope: "sdk-test-agent-inspect",
    query_text: "repair export failure",
    context: { goal: "repair export failure" },
    candidates: ["bash", "edit"],
    file_path: "src/routes/export.ts",
    repo_root: "/repo",
    anchor: "resume:src/routes/export.ts",
    handoff_kind: "patch_handoff",
  });
  await client.memory.reviewPacks.evolution({
    tenant_id: "default",
    scope: "sdk-test-evolution-review",
    query_text: "repair export failure",
    context: { goal: "repair export failure" },
    candidates: ["bash", "edit"],
  });
  await client.memory.tools.select({
    tenant_id: "default",
    scope: "sdk-test-tools-select",
    context: { goal: "repair export failure" },
    candidates: ["bash", "edit"],
  });
  await client.memory.tools.feedback({
    tenant_id: "default",
    scope: "sdk-test-tools-feedback",
    outcome: "positive",
    context: { goal: "repair export failure" },
    candidates: ["bash", "edit"],
    selected_tool: "edit",
    input_text: "tool feedback",
  });
  await client.memory.replay.repairReview({
    tenant_id: "default",
    scope: "sdk-test-replay",
    playbook_id: "00000000-0000-0000-0000-000000000123",
    action: "approve",
  });
  await client.memory.anchors.rehydratePayload({
    tenant_id: "default",
    scope: "sdk-test-anchor",
    anchor_id: "anchor-123",
  });

  assert.deepEqual(
    calls.map((entry) => entry.url),
    [
      "http://127.0.0.1:3001/v1/memory/write",
      "http://127.0.0.1:3001/v1/memory/planning/context",
      "http://127.0.0.1:3001/v1/memory/context/assemble",
      "http://127.0.0.1:3001/v1/memory/kickoff/recommendation",
      "http://127.0.0.1:3001/v1/memory/kickoff/recommendation",
      "http://127.0.0.1:3001/v1/memory/kickoff/recommendation",
      "http://127.0.0.1:3001/v1/memory/execution/introspect",
      "http://127.0.0.1:3001/v1/memory/agent/inspect",
      "http://127.0.0.1:3001/v1/memory/evolution/review-pack",
      "http://127.0.0.1:3001/v1/memory/tools/select",
      "http://127.0.0.1:3001/v1/memory/tools/feedback",
      "http://127.0.0.1:3001/v1/memory/replay/playbooks/repair/review",
      "http://127.0.0.1:3001/v1/memory/anchors/rehydrate_payload",
    ],
  );

  for (const call of calls) {
    assert.equal(call.init?.method, "POST");
    assert.equal((call.init?.headers as Record<string, string>)["content-type"], "application/json");
    assert.equal((call.init?.headers as Record<string, string>).authorization, "Bearer test-token");
  }
});

test("taskStart derives a first_action from kickoff recommendation", async () => {
  const client = createAionisClient({
    baseUrl: "http://127.0.0.1:3001/",
    fetch: async () =>
      new Response(JSON.stringify({
        summary_version: "kickoff_recommendation_v1",
        tenant_id: "default",
        scope: "sdk-test-task-start",
        query_text: "repair export failure",
        kickoff_recommendation: {
          source_kind: "experience_intelligence",
          history_applied: true,
          selected_tool: "edit",
          file_path: "src/routes/export.ts",
          next_action: "Patch src/routes/export.ts and rerun export tests",
        },
        rationale: {
          summary: "Use the learned export repair path.",
        },
      }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
  });

  const response = await client.memory.taskStart({
    tenant_id: "default",
    scope: "sdk-test-task-start",
    query_text: "repair export failure",
    context: { goal: "repair export failure" },
    candidates: ["bash", "edit"],
  });

  assert.equal(response.summary_version, "task_start_v1");
  assert.deepEqual(response.first_action, {
    action_kind: "file_step",
    source_kind: "experience_intelligence",
    history_applied: true,
    selected_tool: "edit",
    file_path: "src/routes/export.ts",
    next_action: "Patch src/routes/export.ts and rerun export tests",
  });
});

test("taskStartPlan resolves from kickoff when learned kickoff is already enough", async () => {
  const client = createAionisClient({
    baseUrl: "http://127.0.0.1:3001/",
    fetch: async () =>
      new Response(JSON.stringify({
        summary_version: "kickoff_recommendation_v1",
        tenant_id: "default",
        scope: "sdk-test-task-start-plan",
        query_text: "repair export failure",
        kickoff_recommendation: {
          source_kind: "experience_intelligence",
          history_applied: true,
          selected_tool: "edit",
          file_path: "src/routes/export.ts",
          next_action: "Patch src/routes/export.ts and rerun export tests",
        },
        rationale: {
          summary: "Use the learned export repair path.",
        },
      }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
  });

  const response = await client.memory.taskStartPlan({
    tenant_id: "default",
    scope: "sdk-test-task-start-plan",
    query_text: "repair export failure",
    context: { goal: "repair export failure" },
    candidates: ["bash", "edit"],
  });

  assert.equal(response.summary_version, "task_start_plan_v1");
  assert.equal(response.resolution_source, "kickoff");
  assert.deepEqual(response.first_action, {
    action_kind: "file_step",
    source_kind: "experience_intelligence",
    history_applied: true,
    selected_tool: "edit",
    file_path: "src/routes/export.ts",
    next_action: "Patch src/routes/export.ts and rerun export tests",
  });
  assert.equal(response.planner_packet, null);
});

test("taskStartPlan falls back to planning context when kickoff has no actionable first step", async () => {
  const requests: string[] = [];
  const client = createAionisClient({
    baseUrl: "http://127.0.0.1:3001/",
    fetch: async (input) => {
      const url = String(input);
      requests.push(url);
      if (url.endsWith("/v1/memory/kickoff/recommendation")) {
        return new Response(JSON.stringify({
          summary_version: "kickoff_recommendation_v1",
          tenant_id: "default",
          scope: "sdk-test-task-start-plan-fallback",
          query_text: "repair billing retry timeout in service code",
          kickoff_recommendation: null,
          rationale: {
            summary: "No learned kickoff available.",
          },
        }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }
      return new Response(JSON.stringify({
        planner_packet: {
          packet_version: "planner_packet_v1",
          sections: {
            recommended_workflows: [],
            candidate_workflows: [],
            candidate_patterns: [],
            trusted_patterns: [],
            contested_patterns: [],
            rehydration_candidates: [],
            supporting_knowledge: [],
          },
          merged_text: "Plan the billing retry repair.",
        },
        pattern_signals: [],
        workflow_signals: [],
        execution_kernel: {
          packet_source_mode: "none",
          state_first_assembly: false,
          execution_packet_v1_present: false,
          execution_state_v1_present: false,
          pattern_signal_summary: {
            candidate_pattern_count: 0,
            candidate_pattern_tools: [],
            trusted_pattern_count: 0,
            contested_pattern_count: 0,
            trusted_pattern_tools: [],
            contested_pattern_tools: [],
          },
          workflow_signal_summary: {
            stable_workflow_count: 0,
            promotion_ready_workflow_count: 0,
            observing_workflow_count: 0,
            stable_workflow_titles: [],
            promotion_ready_workflow_titles: [],
            observing_workflow_titles: [],
          },
          workflow_lifecycle_summary: {},
          workflow_maintenance_summary: { model: "none" },
          pattern_lifecycle_summary: {},
          pattern_maintenance_summary: { model: "none" },
          action_packet_summary: {
            recommended_workflow_count: 0,
            candidate_workflow_count: 0,
            candidate_pattern_count: 0,
            trusted_pattern_count: 0,
            contested_pattern_count: 0,
            supporting_knowledge_count: 0,
            rehydration_candidate_count: 0,
            workflow_anchor_ids: [],
            candidate_workflow_anchor_ids: [],
            candidate_pattern_anchor_ids: [],
            trusted_pattern_anchor_ids: [],
            contested_pattern_anchor_ids: [],
            rehydration_anchor_ids: [],
          },
        },
        planning_summary: {
          summary_version: "planning_summary_v1",
          planner_explanation: "Use planning context fallback for billing retry repair.",
          first_step_recommendation: {
            source_kind: "tool_selection",
            history_applied: false,
            selected_tool: "edit",
            file_path: "src/services/billing.ts",
            next_action: "Patch src/services/billing.ts and rerun export tests",
          },
          workflow_signal_summary: {
            stable_workflow_count: 0,
            promotion_ready_workflow_count: 0,
            observing_workflow_count: 0,
            stable_workflow_titles: [],
            promotion_ready_workflow_titles: [],
            observing_workflow_titles: [],
          },
          action_packet_summary: {
            recommended_workflow_count: 0,
            candidate_workflow_count: 0,
            candidate_pattern_count: 0,
            trusted_pattern_count: 0,
            contested_pattern_count: 0,
            supporting_knowledge_count: 0,
            rehydration_candidate_count: 0,
            workflow_anchor_ids: [],
            candidate_workflow_anchor_ids: [],
            candidate_pattern_anchor_ids: [],
            trusted_pattern_anchor_ids: [],
            contested_pattern_anchor_ids: [],
            rehydration_anchor_ids: [],
          },
          workflow_lifecycle_summary: {},
          workflow_maintenance_summary: { model: "none" },
          pattern_lifecycle_summary: {},
          pattern_maintenance_summary: { model: "none" },
          trusted_pattern_count: 0,
          contested_pattern_count: 0,
          trusted_pattern_tools: [],
          contested_pattern_tools: [],
        },
        kickoff_recommendation: null,
      }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    },
  });

  const response = await client.memory.taskStartPlan({
    tenant_id: "default",
    scope: "sdk-test-task-start-plan-fallback",
    query_text: "repair billing retry timeout in service code",
    context: { goal: "repair billing retry timeout in service code" },
    candidates: ["bash", "edit"],
  });

  assert.deepEqual(requests, [
    "http://127.0.0.1:3001/v1/memory/kickoff/recommendation",
    "http://127.0.0.1:3001/v1/memory/planning/context",
  ]);
  assert.equal(response.summary_version, "task_start_plan_v1");
  assert.equal(response.resolution_source, "planning_context");
  assert.deepEqual(response.first_action, {
    action_kind: "file_step",
    source_kind: "tool_selection",
    history_applied: false,
    selected_tool: "edit",
    file_path: "src/services/billing.ts",
    next_action: "Patch src/services/billing.ts and rerun export tests",
  });
  assert.equal(response.planner_explanation, "Use planning context fallback for billing retry repair.");
});

test("SDK client throws AionisSdkHttpError with response payload when the request fails", async () => {
  const client = createAionisClient({
    baseUrl: "http://127.0.0.1:3001",
    fetch: async () =>
      new Response(JSON.stringify({
        error: "bad_request",
        message: "payload rejected",
      }), {
        status: 400,
        headers: {
          "content-type": "application/json",
        },
      }),
  });

  await assert.rejects(
    client.memory.write({
      tenant_id: "default",
      scope: "sdk-test-write",
      input_text: "write request",
      nodes: [],
      edges: [],
    }),
    (error: unknown) => {
      assert.ok(error instanceof AionisSdkHttpError);
      assert.equal(error.status, 400);
      assert.deepEqual(error.payload, {
        error: "bad_request",
        message: "payload rejected",
      });
      return true;
    },
  );
});

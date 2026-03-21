import test from "node:test";
import assert from "node:assert/strict";
import { createAionisAdapterSidecar } from "../../src/adapter/sidecar.js";
import type { AionisMcpEnv } from "../../src/mcp/client.js";

const ENV: AionisMcpEnv = {
  AIONIS_BASE_URL: "http://127.0.0.1:3011",
  AIONIS_SCOPE: "default",
  AIONIS_TIMEOUT_MS: 10_000,
  AIONIS_MAX_TOOL_TEXT_CHARS: 8_000,
};

test("sidecar dispatch routes lifecycle events through the harness", async () => {
  const calls: Array<{ path: string; body: any }> = [];
  const sidecar = createAionisAdapterSidecar({
    env: ENV,
    postJson: async (_env, path, body) => {
      calls.push({ path, body });
      if (path === "/v1/memory/planning/context") {
        return {
          tenant_id: "default",
          scope: "default",
          planner_packet: { sections: { recommended_workflows: [], candidate_workflows: [] } },
          workflow_signals: [],
          pattern_signals: [],
          planning_summary: { planner_explanation: null, trusted_pattern_count: 0, contested_pattern_count: 0 },
          execution_kernel: {},
        };
      }
      if (path === "/v1/memory/tools/select") {
        return {
          tenant_id: "default",
          scope: "default",
          selection: { selected: "edit", ordered: ["edit", "bash"], preferred: ["edit"] },
          decision: { decision_id: "decision-1", decision_uri: "aionis://decision-1", run_id: "task-1" },
          selection_summary: {
            provenance_explanation: "trusted pattern support: edit [exact_task_signature]",
            used_trusted_pattern_tools: ["edit"],
            used_trusted_pattern_affinity_levels: ["exact_task_signature"],
          },
        };
      }
      if (path === "/v1/memory/tools/feedback") {
        return { pattern_anchor: { credibility_state: "candidate" } };
      }
      if (path === "/v1/memory/execution/introspect") {
        return {
          tenant_id: "default",
          scope: "default",
          workflow_signal_summary: { stable_workflow_count: 0, promotion_ready_workflow_count: 0, observing_workflow_count: 0 },
          pattern_signal_summary: { candidate_pattern_count: 1, trusted_pattern_count: 0, contested_pattern_count: 0 },
          recommended_workflows: [],
          trusted_patterns: [],
          contested_patterns: [],
        };
      }
      throw new Error(`unexpected path ${path}`);
    },
  });

  const started = await sidecar.dispatch({
    request_id: "r1",
    event: {
      event_type: "task_started",
      task_id: "task-1",
      query_text: "repair export failure",
      context: { task_kind: "repair_export" },
      tool_candidates: ["bash", "edit"],
    },
  });
  assert.equal(started.ok, true);
  assert.equal(started.event_type, "task_started");

  const selected = await sidecar.dispatch({
    request_id: "r2",
    event: {
      event_type: "tool_selection_requested",
      task_id: "task-1",
      candidates: ["bash", "edit"],
    },
  });
  assert.equal(selected.ok, true);
  assert.equal((selected as any).result.selection.selected_tool, "edit");

  const executed = await sidecar.dispatch({
    request_id: "r3",
    event: {
      event_type: "tool_executed",
      task_id: "task-1",
      step_id: "step-1",
      selected_tool: "edit",
      candidates: ["bash", "edit"],
      context: { task_kind: "repair_export" },
      validated: true,
    },
  });
  assert.equal(executed.ok, true);
  assert.equal((executed as any).result.classification, "positive");

  const introspected = await sidecar.dispatch({
    request_id: "r4",
    event: {
      event_type: "introspect_requested",
      limit: 5,
    },
  });
  assert.equal(introspected.ok, true);
  assert.equal((introspected as any).result.pattern_signal_summary.candidate_pattern_count, 1);

  assert.deepEqual(
    calls.map((entry) => entry.path),
    [
      "/v1/memory/planning/context",
      "/v1/memory/tools/select",
      "/v1/memory/tools/feedback",
      "/v1/memory/execution/introspect",
    ],
  );
});

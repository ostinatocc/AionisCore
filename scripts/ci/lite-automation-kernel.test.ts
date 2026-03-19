import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createLiteAutomationStore } from "../../src/store/lite-automation-store.ts";
import { createLiteAutomationRunStore } from "../../src/store/lite-automation-run-store.ts";
import {
  automationCreateLite,
  automationGetLite,
  automationListLite,
  automationRunCancelLite,
  automationRunGetLite,
  automationRunListLite,
  automationRunLite,
  automationRunResumeLite,
  automationValidateLite,
} from "../../src/memory/automation-lite.ts";
import { HttpError } from "../../src/util/http.ts";

const DEFAULTS = {
  defaultScope: "default",
  defaultTenantId: "default",
  defaultActorId: "local-user",
};

function tmpDbPath(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-lite-automation-"));
  return path.join(dir, `${name}.sqlite`);
}

function createKernelStores(name: string) {
  const dbPath = tmpDbPath(name);
  return {
    automationStore: createLiteAutomationStore(dbPath),
    automationRunStore: createLiteAutomationRunStore(dbPath),
  };
}

function simpleReplayRunner(tag: string) {
  const calls: Array<{ body: unknown; options: unknown }> = [];
  return {
    calls,
    deps: {
      buildReplayRunOptions: (source: string) => ({ source, tag }),
      replayRunner: async (body: unknown, options: unknown) => {
        calls.push({ body, options });
        return {
          mode: "simulate",
          summary: { replay_readiness: "ready" },
          run: { run_id: `${tag}-run-${calls.length}` },
          playbook: { version: 1 },
          steps: [],
        };
      },
    },
  };
}

test("lite automation validate accepts a simple playbook-driven graph", () => {
  const out = automationValidateLite({
    graph: {
      nodes: [
        { node_id: "step_a", kind: "playbook", playbook_id: "pb_a", version: 1, inputs: {} },
        { node_id: "gate_b", kind: "approval", inputs: { source: "$nodes.step_a.summary.status" } },
      ],
      edges: [{ from: "step_a", to: "gate_b", type: "on_success" }],
    },
  }, DEFAULTS);
  assert.deepEqual(out.validation.topological_order, ["step_a", "gate_b"]);
  assert.equal(out.graph.node_count, 2);
  assert.equal(out.runtime.edition, "lite");
  assert.equal(out.runtime.automation_kernel, "local_playbook_v1");
  assert.deepEqual(out.runtime.supported_node_kinds, ["playbook", "approval", "condition", "artifact_gate"]);
  assert.match(out.runtime.supported_routes?.[0] ?? "", /\/v1\/automations\/create$/);
});

test("lite automation create/get/list persists definitions in sqlite", async () => {
  const store = createLiteAutomationStore(tmpDbPath("kernel"));
  try {
    const created = automationCreateLite(store, {
      automation_id: "local_sync",
      name: "Local Sync",
      status: "draft",
      graph: {
        nodes: [
          { node_id: "step_a", kind: "playbook", playbook_id: "pb_sync", version: 1, inputs: {} },
        ],
        edges: [],
      },
      metadata: { owner: "lite" },
    }, DEFAULTS);

    assert.equal(created.automation.automation_id, "local_sync");
    assert.equal(created.automation.latest_version, 1);
    assert.equal(created.automation.version.graph.nodes.length, 1);
    assert.equal(created.runtime.edition, "lite");
    assert.equal(created.runtime.automation_kernel, "local_playbook_v1");

    const fetched = automationGetLite(store, {
      automation_id: "local_sync",
    }, DEFAULTS);
    assert.equal(fetched.automation.name, "Local Sync");
    assert.equal(fetched.automation.version.version, 1);
    assert.equal(fetched.runtime.edition, "lite");
    assert.equal(fetched.runtime.automation_kernel, "local_playbook_v1");

    const listed = automationListLite(store, {
      limit: 10,
    }, DEFAULTS);
    assert.equal(listed.automations.length, 1);
    assert.equal(listed.automations[0]?.automation_id, "local_sync");
    assert.equal(listed.runtime.edition, "lite");
    assert.equal(listed.runtime.automation_kernel, "local_playbook_v1");
  } finally {
    await store.close();
  }
});

test("lite automation list rejects reviewer-scoped server-style filters", async () => {
  const store = createLiteAutomationStore(tmpDbPath("filters"));
  try {
    let err: unknown;
    try {
      automationListLite(store, { limit: 10, reviewer: "ops@example.com" }, DEFAULTS);
    } catch (next) {
      err = next;
    }
    assert.ok(err instanceof HttpError);
    assert.equal(err.code, "automation_feature_not_supported_in_lite");
    assert.deepEqual(err.details, {
      contract: "lite_error_v1",
      edition: "lite",
      supported_in_lite: false,
      route: "/v1/automations/list",
      surface: "automation_governance",
      route_group: null,
      reason: "reviewer-scoped listing is not supported in lite automation kernel",
      unsupported: ["reviewer"],
    });
  } finally {
    await store.close();
  }
});

test("lite automation run list reports unsupported inbox filters in structured error details", async () => {
  const { automationRunStore } = createKernelStores("run-list-filters");
  try {
    let err: unknown;
    try {
      automationRunListLite(automationRunStore, { limit: 10, actionable_only: true, reviewer: "ops@example.com" }, DEFAULTS);
    } catch (next) {
      err = next;
    }
    assert.ok(err instanceof HttpError);
    assert.equal(err.code, "automation_feature_not_supported_in_lite");
    assert.deepEqual(err.details, {
      contract: "lite_error_v1",
      edition: "lite",
      supported_in_lite: false,
      route: "/v1/automations/runs/list",
      surface: "automation_governance",
      route_group: null,
      reason: "advanced run inbox filters are not supported in lite automation kernel",
      unsupported: ["actionable_only", "reviewer"],
    });
  } finally {
    await automationRunStore.close();
  }
});

test("lite automation run executes a single playbook node and persists run state", async () => {
  const { automationStore, automationRunStore } = createKernelStores("run-success");
  const replay = simpleReplayRunner("success");
  try {
    automationCreateLite(automationStore, {
      automation_id: "local_sync",
      name: "Local Sync",
      status: "active",
      graph: {
        nodes: [
          { node_id: "step_a", kind: "playbook", playbook_id: "pb_sync", version: 1, inputs: { topic: "$params.topic" } },
        ],
        edges: [],
      },
      metadata: { owner: "lite" },
    }, DEFAULTS);

    const run = await automationRunLite({
      definitionStore: automationStore,
      runStore: automationRunStore,
      body: {
        automation_id: "local_sync",
        actor: "lucio",
        params: { topic: "alpha" },
        options: { execution_mode: "default" },
      },
      defaults: DEFAULTS,
      deps: replay.deps,
    });

    assert.equal(run.lifecycle_state, "terminal");
    assert.equal(run.terminal_outcome, "succeeded");
    assert.equal(run.summary_json.total_nodes, 1);
    assert.equal(run.nodes[0]?.terminal_outcome, "succeeded");
    assert.equal(run.nodes[0]?.playbook_run_id, "success-run-1");
    assert.equal(replay.calls.length, 1);
    assert.deepEqual((replay.calls[0]?.body as any)?.params?.topic, "alpha");
    assert.equal((replay.calls[0]?.body as any)?.consumer_agent_id, "lucio");
    assert.equal((replay.calls[0]?.body as any)?.owner_agent_id, "lucio");
    assert.equal((replay.calls[0]?.body as any)?.memory_lane, "private");

    const fetched = automationRunGetLite(automationRunStore, {
      run_id: run.run_id,
    }, DEFAULTS);
    assert.equal(fetched.run.run_id, run.run_id);
    assert.equal(fetched.run.nodes.length, 1);
    assert.equal(fetched.runtime.edition, "lite");
    assert.equal(fetched.runtime.automation_kernel, "local_playbook_v1");

    const listed = automationRunListLite(automationRunStore, {
      automation_id: "local_sync",
      limit: 10,
    }, DEFAULTS);
    assert.equal(listed.runs.length, 1);
    assert.equal(listed.runs[0]?.run_id, run.run_id);
    assert.equal(listed.runtime.edition, "lite");
    assert.equal(listed.runtime.automation_kernel, "local_playbook_v1");
  } finally {
    await automationRunStore.close();
    await automationStore.close();
  }
});

test("lite automation run falls back to the configured local actor identity", async () => {
  const { automationStore, automationRunStore } = createKernelStores("run-default-actor");
  const replay = simpleReplayRunner("default-actor");
  try {
    automationCreateLite(automationStore, {
      automation_id: "local_sync",
      name: "Local Sync",
      status: "active",
      graph: {
        nodes: [
          { node_id: "step_a", kind: "playbook", playbook_id: "pb_sync", version: 1, inputs: {} },
        ],
        edges: [],
      },
      metadata: { owner: "lite" },
    }, DEFAULTS);

    const run = await automationRunLite({
      definitionStore: automationStore,
      runStore: automationRunStore,
      body: {
        automation_id: "local_sync",
        options: { execution_mode: "default" },
      },
      defaults: DEFAULTS,
      deps: replay.deps,
    });

    assert.equal(run.requested_by, "local-user");
    assert.equal((replay.calls[0]?.body as any)?.consumer_agent_id, "local-user");
    assert.equal((replay.calls[0]?.body as any)?.owner_agent_id, "local-user");
  } finally {
    await automationRunStore.close();
    await automationStore.close();
  }
});

test("lite automation run pauses on approval and resume completes the graph", async () => {
  const { automationStore, automationRunStore } = createKernelStores("run-resume");
  const replay = simpleReplayRunner("resume");
  try {
    automationCreateLite(automationStore, {
      automation_id: "approval_flow",
      name: "Approval Flow",
      status: "active",
      graph: {
        nodes: [
          { node_id: "step_a", kind: "playbook", playbook_id: "pb_sync", version: 1, inputs: { topic: "$params.topic" } },
          { node_id: "gate_b", kind: "approval", approval_key: "local_gate", inputs: { source: "$nodes.step_a.summary.replay_readiness" } },
        ],
        edges: [{ from: "step_a", to: "gate_b", type: "on_success" }],
      },
      metadata: { owner: "lite" },
    }, DEFAULTS);

    const paused = await automationRunLite({
      definitionStore: automationStore,
      runStore: automationRunStore,
      body: {
        automation_id: "approval_flow",
        actor: "lucio",
        params: { topic: "beta" },
        options: { execution_mode: "default" },
      },
      defaults: DEFAULTS,
      deps: replay.deps,
    });

    assert.equal(paused.lifecycle_state, "paused");
    assert.equal(paused.pause_reason, "approval_required");
    assert.equal(paused.root_cause_node_id, "gate_b");
    assert.equal(paused.nodes.find((node) => node.node_id === "step_a")?.terminal_outcome, "succeeded");
    assert.equal(paused.nodes.find((node) => node.node_id === "gate_b")?.lifecycle_state, "paused");

    const resumed = await automationRunResumeLite({
      definitionStore: automationStore,
      runStore: automationRunStore,
      body: {
        run_id: paused.run_id,
        actor: "operator",
        reason: "approved locally",
      },
      defaults: DEFAULTS,
      deps: replay.deps,
    });

    const approvalNode = resumed.nodes.find((node) => node.node_id === "gate_b");
    assert.equal(resumed.lifecycle_state, "terminal");
    assert.equal(resumed.terminal_outcome, "succeeded");
    assert.equal(approvalNode?.terminal_outcome, "succeeded");
    assert.equal((approvalNode?.output_snapshot_json as any)?.approved_by, "operator");
    assert.equal((approvalNode?.output_snapshot_json as any)?.approval_reason, "approved locally");
    assert.equal(replay.calls.length, 1);
  } finally {
    await automationRunStore.close();
    await automationStore.close();
  }
});

test("lite automation cancel turns a paused approval run into a terminal cancelled run", async () => {
  const { automationStore, automationRunStore } = createKernelStores("run-cancel");
  const replay = simpleReplayRunner("cancel");
  try {
    automationCreateLite(automationStore, {
      automation_id: "approval_flow",
      name: "Approval Flow",
      status: "active",
      graph: {
        nodes: [
          { node_id: "step_a", kind: "playbook", playbook_id: "pb_sync", version: 1, inputs: {} },
          { node_id: "gate_b", kind: "approval", approval_key: "local_gate", inputs: {} },
        ],
        edges: [{ from: "step_a", to: "gate_b", type: "on_success" }],
      },
      metadata: { owner: "lite" },
    }, DEFAULTS);

    const paused = await automationRunLite({
      definitionStore: automationStore,
      runStore: automationRunStore,
      body: {
        automation_id: "approval_flow",
        actor: "lucio",
        options: { execution_mode: "default" },
      },
      defaults: DEFAULTS,
      deps: replay.deps,
    });

    const cancelled = automationRunCancelLite(automationRunStore, {
      run_id: paused.run_id,
      actor: "operator",
      reason: "user stopped local flow",
    }, DEFAULTS);

    assert.equal(cancelled.run.lifecycle_state, "terminal");
    assert.equal(cancelled.run.terminal_outcome, "cancelled");
    assert.equal(cancelled.run.status_summary, "cancelled");
    assert.equal(cancelled.run.nodes.find((node) => node.node_id === "step_a")?.terminal_outcome, "succeeded");
    assert.equal(cancelled.run.nodes.find((node) => node.node_id === "gate_b")?.terminal_outcome, "rejected");
    assert.equal(cancelled.run.root_cause_code, "automation_run_cancelled");
    assert.equal(cancelled.runtime.edition, "lite");
    assert.equal(cancelled.runtime.automation_kernel, "local_playbook_v1");
  } finally {
    await automationRunStore.close();
    await automationStore.close();
  }
});

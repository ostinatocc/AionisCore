import assert from "node:assert/strict";
import test from "node:test";
import { createAionisRuntimeClient } from "../src/client.js";
import { createAionisHostBridge } from "../src/host-bridge.js";
import { AionisRuntimeSdkHttpError } from "../src/error.js";

test("createAionisRuntimeClient exposes the full Aionis Core SDK surface and maps requests to expected routes", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = createAionisRuntimeClient({
    baseUrl: "http://127.0.0.1:3001/",
    headers: {
      authorization: "Bearer private-token",
    },
    fetch: async (input, init) => {
      calls.push({ url: String(input), init });
      return new Response(JSON.stringify({
        ok: true,
        echoed_path: String(input),
      }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    },
  });

  await client.system.health();
  await client.memory.recallText({
    tenant_id: "default",
    scope: "runtime-sdk",
    query_text: "debug replay failure",
  });
  await client.memory.kickoffRecommendation({
    tenant_id: "default",
    scope: "runtime-sdk",
    query_text: "repair export failure",
    context: { goal: "repair export failure" },
    candidates: ["bash", "edit"],
  });
  await client.memory.experienceIntelligence({
    tenant_id: "default",
    scope: "runtime-sdk",
    query_text: "repair export failure",
    context: { goal: "repair export failure" },
    candidates: ["bash", "edit"],
  });
  await client.memory.taskStart({
    tenant_id: "default",
    scope: "runtime-sdk-task-start",
    query_text: "repair export failure",
    context: { goal: "repair export failure" },
    candidates: ["bash", "edit"],
  });
  await client.memory.sessions.list({
    tenant_id: "default",
    scope: "runtime-sdk",
    limit: 10,
  });
  await client.memory.sessions.events({
    session_id: "session-123",
    tenant_id: "default",
    scope: "runtime-sdk",
    limit: 5,
  });
  await client.memory.rules.evaluate({
    tenant_id: "default",
    scope: "runtime-sdk",
    context: { goal: "repair automation run" },
  });
  await client.memory.replay.playbooks.run({
    tenant_id: "default",
    scope: "runtime-sdk",
    playbook_id: "00000000-0000-0000-0000-000000000123",
  });
  await client.memory.sandbox.execute({
    tenant_id: "default",
    scope: "runtime-sdk",
    session_id: "00000000-0000-0000-0000-000000000111",
    action: {
      kind: "command",
      argv: ["echo", "hi"],
    },
  });
  await client.handoff.store({
    tenant_id: "default",
    scope: "runtime-sdk",
    handoff_kind: "repair",
    anchor: "handoff://anchor",
    summary: "repair handoff",
    handoff_text: "continue from failed replay step",
  });
  await client.handoff.recover({
    tenant_id: "default",
    scope: "runtime-sdk",
    anchor: "handoff://anchor",
    handoff_kind: "repair",
    repo_root: "/tmp/demo-repo",
    file_path: "src/routes/export.ts",
    symbol: "handleExport",
  });
  await client.memory.reviewPacks.continuity({
    tenant_id: "default",
    scope: "runtime-sdk",
    anchor: "handoff://anchor",
    handoff_kind: "repair",
    repo_root: "/tmp/demo-repo",
    file_path: "src/routes/export.ts",
    symbol: "handleExport",
  });
  await client.memory.reviewPacks.evolution({
    tenant_id: "default",
    scope: "runtime-sdk",
    query_text: "repair export route",
    context: { goal: "repair export route" },
    candidates: ["bash", "edit", "test"],
  });
  await client.memory.delegationRecords.write({
    tenant_id: "default",
    scope: "runtime-sdk",
    run_id: "run-sdk-123",
    handoff_anchor: "handoff://anchor",
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
        family_scope: "aionis://runtime-sdk/export",
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
        family_scope: "aionis://runtime-sdk/export",
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
        family_scope: "aionis://runtime-sdk/export",
        routing_reason: "review evidence route",
        source: "execution_packet",
      }],
    },
  });
  await client.memory.delegationRecords.find({
    tenant_id: "default",
    scope: "runtime-sdk",
    route_role: "review",
    task_family: "patch_handoff",
    include_payload: true,
    limit: 5,
  });
  await client.memory.delegationRecords.aggregate({
    tenant_id: "default",
    scope: "runtime-sdk",
    route_role: "review",
    task_family: "patch_handoff",
    limit: 25,
  });
  await client.automations.run({
    tenant_id: "default",
    scope: "runtime-sdk",
    automation_id: "nightly-repair",
  });

  assert.deepEqual(
    calls.map((entry) => entry.url),
    [
      "http://127.0.0.1:3001/health",
      "http://127.0.0.1:3001/v1/memory/recall_text",
      "http://127.0.0.1:3001/v1/memory/kickoff/recommendation",
      "http://127.0.0.1:3001/v1/memory/experience/intelligence",
      "http://127.0.0.1:3001/v1/memory/kickoff/recommendation",
      "http://127.0.0.1:3001/v1/memory/sessions?tenant_id=default&scope=runtime-sdk&limit=10",
      "http://127.0.0.1:3001/v1/memory/sessions/session-123/events?tenant_id=default&scope=runtime-sdk&limit=5",
      "http://127.0.0.1:3001/v1/memory/rules/evaluate",
      "http://127.0.0.1:3001/v1/memory/replay/playbooks/run",
      "http://127.0.0.1:3001/v1/memory/sandbox/execute",
      "http://127.0.0.1:3001/v1/handoff/store",
      "http://127.0.0.1:3001/v1/handoff/recover",
      "http://127.0.0.1:3001/v1/memory/continuity/review-pack",
      "http://127.0.0.1:3001/v1/memory/evolution/review-pack",
      "http://127.0.0.1:3001/v1/memory/delegation/records",
      "http://127.0.0.1:3001/v1/memory/delegation/records/find",
      "http://127.0.0.1:3001/v1/memory/delegation/records/aggregate",
      "http://127.0.0.1:3001/v1/automations/run",
    ],
  );

  assert.equal(calls[0]?.init?.method, "GET");
  assert.equal(calls[1]?.init?.method, "POST");
  assert.equal(calls[2]?.init?.method, "POST");
  assert.equal(calls[3]?.init?.method, "POST");
  assert.equal(calls[4]?.init?.method, "POST");
  assert.equal(calls[5]?.init?.method, "GET");
  assert.equal(calls[6]?.init?.method, "GET");
  for (const call of [calls[1], calls[2], calls[3], calls[4], calls[7], calls[8], calls[9], calls[10], calls[11], calls[12], calls[13], calls[14], calls[15], calls[16], calls[17]]) {
    assert.equal(call?.init?.method, "POST");
    assert.equal((call?.init?.headers as Record<string, string>)["content-type"], "application/json");
  }
  for (const call of calls) {
    assert.equal((call.init?.headers as Record<string, string>).authorization, "Bearer private-token");
  }
});

test("runtime SDK taskStart derives first_action from kickoff recommendation", async () => {
  const client = createAionisRuntimeClient({
    baseUrl: "http://127.0.0.1:3001/",
    fetch: async () =>
      new Response(JSON.stringify({
        summary_version: "kickoff_recommendation_v1",
        tenant_id: "default",
        scope: "runtime-sdk-task-start",
        query_text: "repair billing retry timeout in service code",
        kickoff_recommendation: {
          source_kind: "experience_intelligence",
          history_applied: true,
          selected_tool: "edit",
          file_path: "src/services/billing.ts",
          next_action: "Patch src/services/billing.ts and rerun export tests",
        },
        rationale: {
          summary: "Use the learned billing retry repair path.",
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
    scope: "runtime-sdk-task-start",
    query_text: "repair billing retry timeout in service code",
    context: { goal: "repair billing retry timeout in service code" },
    candidates: ["bash", "edit"],
  });

  assert.equal(response.summary_version, "task_start_v1");
  assert.deepEqual(response.first_action, {
    action_kind: "file_step",
    source_kind: "experience_intelligence",
    history_applied: true,
    selected_tool: "edit",
    file_path: "src/services/billing.ts",
    next_action: "Patch src/services/billing.ts and rerun export tests",
  });
});

test("runtime SDK throws AionisRuntimeSdkHttpError with response payload on failures", async () => {
  const client = createAionisRuntimeClient({
    baseUrl: "http://127.0.0.1:3001",
    fetch: async () =>
      new Response(JSON.stringify({
        error: "forbidden",
        message: "admin token required",
      }), {
        status: 403,
        headers: {
          "content-type": "application/json",
        },
      }),
  });

  await assert.rejects(
    client.memory.sandbox.execute({
      tenant_id: "default",
      scope: "runtime-sdk",
      session_id: "00000000-0000-0000-0000-000000000111",
      action: {
        kind: "command",
        argv: ["echo", "hi"],
      },
    }),
    (error: unknown) => {
      assert.ok(error instanceof AionisRuntimeSdkHttpError);
      assert.equal(error.status, 403);
      assert.deepEqual(error.payload, {
        error: "forbidden",
        message: "admin token required",
      });
      return true;
    },
  );
});

test("host bridge folds task start, pause, resume, and complete into four calls", async () => {
  const calls: Array<{ url: string; payload?: Record<string, unknown> }> = [];
  const bridge = createAionisHostBridge({
    baseUrl: "http://127.0.0.1:3001/",
    fetch: async (input, init) => {
      const url = String(input);
      const payload = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
      calls.push({ url, payload });

      if (url.endsWith("/v1/memory/kickoff/recommendation")) {
        return new Response(JSON.stringify({
          summary_version: "kickoff_recommendation_v1",
          tenant_id: "default",
          scope: "host-bridge",
          query_text: "repair export route",
          kickoff_recommendation: {
            source_kind: "experience_intelligence",
            history_applied: true,
            selected_tool: "edit",
            file_path: "src/routes/export.ts",
            next_action: "Patch src/routes/export.ts",
          },
          rationale: {
            summary: "Use the learned export-route repair path.",
          },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      if (url.endsWith("/v1/handoff/store")) {
        return new Response(JSON.stringify({
          ok: true,
          anchor: payload?.anchor,
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      if (url.endsWith("/v1/handoff/recover")) {
        return new Response(JSON.stringify({
          ok: true,
          anchor: payload?.anchor,
          target_files: ["src/routes/export.ts"],
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      if (url.endsWith("/v1/memory/replay/playbooks/compile_from_run")) {
        return new Response(JSON.stringify({
          playbook_id: "playbook-1",
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      if (url.endsWith("/v1/memory/replay/playbooks/run")) {
        return new Response(JSON.stringify({
          summary: {
            replay_readiness: "ready",
          },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  }, {
    tenant_id: "default",
    scope: "host-bridge",
    actor: "host-v1",
  });

  const start = await bridge.startTask({
    task_id: "task-1",
    text: "repair export route",
  });
  const pause = await bridge.pauseTask({
    task_id: "task-1",
    text: "repair export route",
    summary: "pause export repair",
    handoff_text: "resume export route repair",
    target_files: ["src/routes/export.ts"],
    next_action: "Patch src/routes/export.ts",
  });
  const resume = await bridge.resumeTask({
    task_id: "task-1",
  });
  const complete = await bridge.completeTask({
    task_id: "task-1",
    text: "repair export route",
    steps: [
      {
        tool_name: "read",
        tool_input: { file_path: "src/routes/export.ts" },
        status: "success",
      },
    ],
  });

  assert.equal(start.first_action?.selected_tool, "edit");
  assert.equal((pause.handoff as { anchor?: string }).anchor, "task-1");
  assert.equal((resume.handoff as { anchor?: string }).anchor, "task-1");
  assert.equal((complete.playbook_compile as { playbook_id?: string }).playbook_id, "playbook-1");
  assert.equal(((complete.playbook_simulation as { summary?: { replay_readiness?: string } }).summary?.replay_readiness), "ready");
  assert.equal(calls[1]?.payload?.memory_lane, "shared");
  assert.deepEqual(calls[1]?.payload?.execution_state_v1, {
    state_id: "handoff-anchor:task-1",
    scope: "aionis://handoff/task-1",
    task_brief: "pause export repair",
    current_stage: "resume",
    active_role: "resume",
    owned_files: ["src/routes/export.ts"],
    modified_files: [],
    pending_validations: [],
    completed_validations: [],
    last_accepted_hypothesis: null,
    rejected_paths: [],
    unresolved_blockers: [],
    rollback_notes: [],
    reviewer_contract: null,
    resume_anchor: {
      anchor: "task-1",
      file_path: null,
      symbol: null,
      repo_root: null,
    },
    updated_at: calls[1]?.payload?.execution_state_v1 && typeof calls[1]?.payload?.execution_state_v1 === "object"
      ? (calls[1]?.payload?.execution_state_v1 as Record<string, unknown>).updated_at
      : undefined,
    version: 1,
  });
  assert.match(String((calls[1]?.payload?.execution_state_v1 as Record<string, unknown>)?.updated_at ?? ""), /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(calls[1]?.payload?.execution_packet_v1, {
    version: 1,
    state_id: "handoff-anchor:task-1",
    current_stage: "resume",
    active_role: "resume",
    task_brief: "pause export repair",
    target_files: ["src/routes/export.ts"],
    next_action: "Patch src/routes/export.ts",
    hard_constraints: [],
    accepted_facts: [],
    rejected_paths: [],
    pending_validations: [],
    unresolved_blockers: [],
    rollback_notes: [],
    review_contract: null,
    resume_anchor: {
      anchor: "task-1",
      file_path: null,
      symbol: null,
      repo_root: null,
    },
    artifact_refs: [],
    evidence_refs: [],
  });
  assert.equal(calls[2]?.payload?.handoff_kind, "task_handoff");
  assert.equal(calls[3]?.payload?.memory_lane, "shared");

  assert.deepEqual(
    calls.map((entry) => entry.url),
    [
      "http://127.0.0.1:3001/v1/memory/kickoff/recommendation",
      "http://127.0.0.1:3001/v1/handoff/store",
      "http://127.0.0.1:3001/v1/handoff/recover",
      "http://127.0.0.1:3001/v1/memory/replay/run/start",
      "http://127.0.0.1:3001/v1/memory/replay/step/before",
      "http://127.0.0.1:3001/v1/memory/replay/step/after",
      "http://127.0.0.1:3001/v1/memory/replay/run/end",
      "http://127.0.0.1:3001/v1/memory/replay/playbooks/compile_from_run",
      "http://127.0.0.1:3001/v1/memory/replay/playbooks/run",
    ],
  );
});

test("host bridge inspectTaskContext requests debug planning context and resolves delegation learning from operator projection", async () => {
  const calls: Array<{ url: string; payload?: Record<string, unknown> }> = [];
  const bridge = createAionisHostBridge({
    baseUrl: "http://127.0.0.1:3001/",
    fetch: async (input, init) => {
      const url = String(input);
      const payload = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
      calls.push({ url, payload });

      return new Response(JSON.stringify({
        tenant_id: "default",
        scope: "host-bridge",
        execution_kernel: {},
        execution_summary: {},
        query: { text: payload?.query_text ?? null },
        recall: {},
        runtime_tool_hints: [],
        planner_packet: {},
        pattern_signals: [],
        workflow_signals: [],
        planning_summary: {},
        operator_projection: {
          delegation_learning: {
            summary_version: "delegation_learning_projection_v1",
            learning_summary: {
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
            },
            learning_recommendations: [{
              recommendation_kind: "capture_missing_returns",
              priority: "high",
              route_role: "patch",
              task_family: "task:repair_export",
              recommended_action: "Capture the missing delegation return for the patch route.",
              rationale: "One persisted patch route is still missing a return packet.",
              sample_mission: "Apply the export repair patch and rerun node tests.",
              sample_acceptance_checks: ["npm run -s test:lite -- export"],
              sample_working_set_files: ["src/routes/export.ts"],
              sample_artifact_refs: ["artifact://repair-export/patch"],
            }],
          },
        },
        layered_context: {
          delegation_learning: {
            summary_version: "delegation_learning_projection_v1",
            learning_summary: {
              task_family: "task:stale_mirror",
              matched_records: 1,
              truncated: false,
              route_role_counts: {
                review: 1,
              },
              record_outcome_counts: {
                completed: 1,
              },
              recommendation_count: 1,
            },
            learning_recommendations: [],
          },
        },
        cost_signals: {},
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  }, {
    tenant_id: "default",
    scope: "host-bridge",
    actor: "host-v1",
  });

  const inspect = await bridge.inspectTaskContext({
    task_id: "task-ctx-1",
    text: "repair export route",
    context: {
      task_kind: "repair_export",
      owner: "host-operator",
    },
  });

  assert.equal(inspect.summary_version, "host_bridge_task_context_v1");
  assert.equal(inspect.task_id, "task-ctx-1");
  assert.equal(inspect.delegation_learning?.learning_summary.task_family, "task:repair_export");
  assert.equal(inspect.operator_projection?.delegation_learning?.learning_summary.task_family, "task:repair_export");
  assert.equal(inspect.planning_context.query.text, "repair export route");
  assert.deepEqual(calls.map((entry) => entry.url), [
    "http://127.0.0.1:3001/v1/memory/planning/context",
  ]);
  assert.equal(calls[0]?.payload?.return_layered_context, true);
  assert.equal(calls[0]?.payload?.include_shadow, false);
  assert.equal(calls[0]?.payload?.rules_limit, 50);
  assert.deepEqual(calls[0]?.payload?.tool_candidates, ["read", "glob", "grep", "bash", "edit", "write", "ls"]);
  assert.deepEqual(calls[0]?.payload?.context, {
    goal: "repair export route",
    task_kind: "repair_export",
    owner: "host-operator",
    operator_mode: "debug",
  });
});

test("host bridge planTaskStart combines inspectTaskContext and startTask into a host-facing startup decision", async () => {
  const calls: Array<{ url: string; payload?: Record<string, unknown> }> = [];
  const bridge = createAionisHostBridge({
    baseUrl: "http://127.0.0.1:3001/",
    fetch: async (input, init) => {
      const url = String(input);
      const payload = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
      calls.push({ url, payload });

      if (url.endsWith("/v1/memory/planning/context")) {
        return new Response(JSON.stringify({
          tenant_id: "default",
          scope: "host-bridge",
          execution_kernel: {},
          execution_summary: {},
          query: { text: payload?.query_text ?? null },
          recall: {},
          runtime_tool_hints: [],
          planner_packet: {},
          pattern_signals: [],
          workflow_signals: [],
          planning_summary: {
            planner_explanation: "promotion-ready workflow candidates: Fix export failure in node tests; selected tool: edit",
          },
          operator_projection: {
            delegation_learning: {
              summary_version: "delegation_learning_projection_v1",
              learning_summary: {
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
              },
              learning_recommendations: [],
            },
          },
          layered_context: {},
          cost_signals: {},
        }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        summary_version: "kickoff_recommendation_v1",
        tenant_id: "default",
        scope: "host-bridge",
        query_text: payload?.query_text ?? null,
        kickoff_recommendation: {
          source_kind: "experience_intelligence",
          history_applied: true,
          selected_tool: "edit",
          file_path: "src/routes/export.ts",
          next_action: "Patch src/routes/export.ts and rerun serializer checks.",
        },
        rationale: {
          summary: "Use the learned export-route repair path.",
        },
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  }, {
    tenant_id: "default",
    scope: "host-bridge",
    actor: "host-v1",
  });

  const plan = await bridge.planTaskStart({
    task_id: "task-plan-1",
    text: "repair export route",
    context: {
      task_kind: "repair_export",
    },
    candidates: ["bash", "edit", "test"],
  });

  assert.equal(plan.summary_version, "host_bridge_task_start_plan_v1");
  assert.equal(plan.first_action?.selected_tool, "edit");
  assert.equal(plan.decision.summary_version, "host_bridge_startup_decision_v1");
  assert.equal(plan.decision.startup_mode, "learned_kickoff");
  assert.equal(plan.decision.tool, "edit");
  assert.equal(plan.decision.file_path, "src/routes/export.ts");
  assert.equal(plan.decision.instruction, "Patch src/routes/export.ts and rerun serializer checks.");
  assert.equal(plan.decision.planner_explanation, "promotion-ready workflow candidates: Fix export failure in node tests; selected tool: edit");
  assert.equal(plan.decision.task_family, "task:repair_export");
  assert.equal(plan.decision.matched_records, 2);
  assert.equal(plan.decision.recommendation_count, 3);
  assert.equal(plan.task_context.delegation_learning?.learning_summary.task_family, "task:repair_export");
  assert.equal(plan.task_start.first_action?.history_applied, true);
  assert.deepEqual(calls.map((entry) => entry.url).sort(), [
    "http://127.0.0.1:3001/v1/memory/kickoff/recommendation",
    "http://127.0.0.1:3001/v1/memory/planning/context",
  ]);
});

test("host bridge openTaskSession binds session, planning, handoff, and resume flows into one adapter", async () => {
  const calls: Array<{ url: string; payload?: Record<string, unknown> }> = [];
  const bridge = createAionisHostBridge({
    baseUrl: "http://127.0.0.1:3001/",
    fetch: async (input, init) => {
      const url = String(input);
      const payload = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
      calls.push({ url, payload });

      if (url.endsWith("/v1/memory/sessions")) {
        return new Response(JSON.stringify({
          session_id: "session-host-1",
          ok: true,
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      if (url.endsWith("/v1/memory/events")) {
        return new Response(JSON.stringify({
          ok: true,
          session_id: payload?.session_id,
          event_text: payload?.event_text,
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      if (url.includes("/v1/memory/sessions/session-host-1/events")) {
        return new Response(JSON.stringify({
          items: [{
            event_text: "observed serializer failure",
          }],
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      if (url.endsWith("/v1/memory/planning/context")) {
        return new Response(JSON.stringify({
          tenant_id: "default",
          scope: "host-bridge",
          execution_kernel: {},
          execution_summary: {},
          query: { text: payload?.query_text ?? null },
          recall: {},
          runtime_tool_hints: [],
          planner_packet: {},
          pattern_signals: [],
          workflow_signals: [],
          planning_summary: {
            planner_explanation: "promotion-ready workflow candidates: Fix export failure in node tests; selected tool: edit",
          },
          operator_projection: {
            delegation_learning: {
              summary_version: "delegation_learning_projection_v1",
              learning_summary: {
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
              },
              learning_recommendations: [],
            },
          },
          layered_context: {},
          cost_signals: {},
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      if (url.endsWith("/v1/memory/kickoff/recommendation")) {
        return new Response(JSON.stringify({
          summary_version: "kickoff_recommendation_v1",
          tenant_id: "default",
          scope: "host-bridge",
          query_text: payload?.query_text ?? null,
          kickoff_recommendation: {
            source_kind: "experience_intelligence",
            history_applied: true,
            selected_tool: "edit",
            file_path: "src/routes/export.ts",
            next_action: "Patch src/routes/export.ts and rerun serializer checks.",
          },
          rationale: {
            summary: "Use the learned export-route repair path.",
          },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      if (url.endsWith("/v1/handoff/store")) {
        return new Response(JSON.stringify({
          ok: true,
          anchor: payload?.anchor,
          target_files: payload?.target_files ?? [],
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      if (url.endsWith("/v1/handoff/recover")) {
        return new Response(JSON.stringify({
          ok: true,
          anchor: payload?.anchor,
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      if (url.endsWith("/v1/memory/replay/run/start")) {
        return new Response(JSON.stringify({
          ok: true,
          run_id: payload?.run_id,
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      if (url.endsWith("/v1/memory/replay/step/before")) {
        return new Response(JSON.stringify({
          step_id: "replay-step-1",
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      if (url.endsWith("/v1/memory/replay/step/after")) {
        return new Response(JSON.stringify({
          ok: true,
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      if (url.endsWith("/v1/memory/replay/run/end")) {
        return new Response(JSON.stringify({
          ok: true,
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      throw new Error(`unexpected fetch url: ${url}`);
    },
  }, {
    tenant_id: "default",
    scope: "host-bridge",
    actor: "host-v1",
  });

  const taskSession = await bridge.openTaskSession({
    task_id: "task-session-1",
    text: "repair export route",
    title: "Repair export route session",
  });
  const initialState = taskSession.snapshotState();
  const event = await taskSession.recordEvent({
    event_text: "observed serializer failure",
    metadata: {
      stage: "inspect",
    },
  });
  const events = await taskSession.listEvents({
    limit: 5,
  });
  const plan = await taskSession.planTaskStart({
    context: {
      task_kind: "repair_export",
    },
  });
  const pause = await taskSession.pauseTask({
    summary: "pause export repair",
    handoff_text: "resume export route repair",
    target_files: ["src/routes/export.ts"],
    next_action: "Patch src/routes/export.ts",
  });
  const pausedState = taskSession.snapshotState();
  const resume = await taskSession.resumeTask();
  const resumedState = taskSession.snapshotState();
  const complete = await taskSession.completeTask({
    text: "repair export route",
    steps: [{
      tool_name: "edit",
      tool_input: {
        file_path: "src/routes/export.ts",
      },
      status: "success",
    }],
    compile_playbook: false,
  });
  const completedState = taskSession.snapshotState();

  assert.equal(taskSession.summary_version, "host_bridge_task_session_v1");
  assert.equal(taskSession.session_id, "session-host-1");
  assert.equal(initialState.status, "active");
  assert.equal(initialState.transition_count, 1);
  assert.deepEqual(initialState.transitions.map((entry) => entry.transition_kind), ["session_opened"]);
  assert.equal((event as { session_id?: string }).session_id, "session-host-1");
  assert.deepEqual((events as { items?: Array<{ event_text?: string }> }).items?.map((entry) => entry.event_text), ["observed serializer failure"]);
  assert.equal(plan.decision.startup_mode, "learned_kickoff");
  assert.equal(plan.decision.task_family, "task:repair_export");
  assert.equal((pause.handoff as { anchor?: string }).anchor, "task-session-1");
  assert.equal((resume.handoff as { anchor?: string }).anchor, "task-session-1");
  assert.equal(completedState.status, "completed");
  assert.equal(completedState.last_startup_mode, "learned_kickoff");
  assert.equal(completedState.last_handoff_anchor, "task-session-1");
  assert.equal(completedState.last_event_text, "observed serializer failure");
  assert.deepEqual(completedState.transitions.map((entry) => entry.transition_kind), [
    "session_opened",
    "event_recorded",
    "startup_planned",
    "paused",
    "resumed",
    "completed",
  ]);
  assert.equal(pausedState.status, "paused");
  assert.equal(resumedState.status, "resumed");
  assert.equal((complete as { replay_run_id?: string }).replay_run_id != null, true);
  assert.equal(calls[0]?.payload?.title, "Repair export route session");
  assert.equal(calls[1]?.payload?.session_id, "session-host-1");
  assert.equal(calls[5]?.payload?.anchor, "task-session-1");
  assert.equal(calls[6]?.payload?.anchor, "task-session-1");
  assert.deepEqual(calls.map((entry) => entry.url), [
    "http://127.0.0.1:3001/v1/memory/sessions",
    "http://127.0.0.1:3001/v1/memory/events",
    "http://127.0.0.1:3001/v1/memory/sessions/session-host-1/events?tenant_id=default&scope=host-bridge&limit=5",
    "http://127.0.0.1:3001/v1/memory/planning/context",
    "http://127.0.0.1:3001/v1/memory/kickoff/recommendation",
    "http://127.0.0.1:3001/v1/handoff/store",
    "http://127.0.0.1:3001/v1/handoff/recover",
    "http://127.0.0.1:3001/v1/memory/replay/run/start",
    "http://127.0.0.1:3001/v1/memory/replay/step/before",
    "http://127.0.0.1:3001/v1/memory/replay/step/after",
    "http://127.0.0.1:3001/v1/memory/replay/run/end",
  ]);
});

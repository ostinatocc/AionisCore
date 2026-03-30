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
      "http://127.0.0.1:3001/v1/memory/kickoff/recommendation",
      "http://127.0.0.1:3001/v1/memory/sessions?tenant_id=default&scope=runtime-sdk&limit=10",
      "http://127.0.0.1:3001/v1/memory/sessions/session-123/events?tenant_id=default&scope=runtime-sdk&limit=5",
      "http://127.0.0.1:3001/v1/memory/rules/evaluate",
      "http://127.0.0.1:3001/v1/memory/replay/playbooks/run",
      "http://127.0.0.1:3001/v1/memory/sandbox/execute",
      "http://127.0.0.1:3001/v1/handoff/store",
      "http://127.0.0.1:3001/v1/handoff/recover",
      "http://127.0.0.1:3001/v1/automations/run",
    ],
  );

  assert.equal(calls[0]?.init?.method, "GET");
  assert.equal(calls[1]?.init?.method, "POST");
  assert.equal(calls[2]?.init?.method, "POST");
  assert.equal(calls[3]?.init?.method, "POST");
  assert.equal(calls[4]?.init?.method, "GET");
  assert.equal(calls[5]?.init?.method, "GET");
  for (const call of [calls[1], calls[2], calls[3], calls[6], calls[7], calls[8], calls[9], calls[10], calls[11]]) {
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

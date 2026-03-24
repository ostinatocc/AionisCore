import assert from "node:assert/strict";
import test from "node:test";
import { createAionisRuntimeClient } from "../src/client.js";
import { AionisRuntimeSdkHttpError } from "../src/error.js";

test("createAionisRuntimeClient exposes the private full-runtime surface and maps requests to expected routes", async () => {
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
      "http://127.0.0.1:3001/v1/memory/sessions?tenant_id=default&scope=runtime-sdk&limit=10",
      "http://127.0.0.1:3001/v1/memory/sessions/session-123/events?tenant_id=default&scope=runtime-sdk&limit=5",
      "http://127.0.0.1:3001/v1/memory/rules/evaluate",
      "http://127.0.0.1:3001/v1/memory/replay/playbooks/run",
      "http://127.0.0.1:3001/v1/memory/sandbox/execute",
      "http://127.0.0.1:3001/v1/handoff/store",
      "http://127.0.0.1:3001/v1/automations/run",
    ],
  );

  assert.equal(calls[0]?.init?.method, "GET");
  assert.equal(calls[1]?.init?.method, "POST");
  assert.equal(calls[2]?.init?.method, "GET");
  assert.equal(calls[3]?.init?.method, "GET");
  for (const call of [calls[1], calls[4], calls[5], calls[6], calls[7], calls[8]]) {
    assert.equal(call?.init?.method, "POST");
    assert.equal((call?.init?.headers as Record<string, string>)["content-type"], "application/json");
  }
  for (const call of calls) {
    assert.equal((call.init?.headers as Record<string, string>).authorization, "Bearer private-token");
  }
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

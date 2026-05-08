import assert from "node:assert/strict";
import test from "node:test";
import { hookAdditionalContext, renderAionisHookContext } from "../lib/aionis-codex-format.mjs";

const config = {
  baseUrl: "http://127.0.0.1:3101",
  tenantId: "local-codex",
  scope: "codex:project:test",
  globalScope: "codex:global",
  cwd: "/tmp/aionis-codex-test",
  contextCharLimit: 14000,
};

test("hookAdditionalContext emits Codex hookSpecificOutput", () => {
  const output = hookAdditionalContext("hello", "UserPromptSubmit");
  assert.deepEqual(output, {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: "hello",
    },
  });
});

test("renderAionisHookContext includes core runtime binding and planner data", () => {
  const text = renderAionisHookContext({
    config,
    sessionId: "session-1",
    turnId: "turn-1",
    runId: "run-1",
    prompt: "Implement feature",
    runtimeStatus: { ok: true, started: false },
    contextAssemble: {
      assembly_summary: { planner_explanation: "inspect before editing" },
      tools: { selection: { selected: "functions.exec_command" } },
      planner_packet: { next_action: "read code" },
      operator_projection: { validation: "run tests" },
      layered_context: { task: "feature" },
    },
    projectAgentResume: {
      agent_memory_resume_pack: {
        resume_next_action: "continue implementation",
        resume_target_files: ["src/example.ts"],
      },
    },
    projectAgentReview: {
      agent_memory_review_pack: {
        acceptance_checks: ["npm test"],
      },
    },
  });

  assert.match(text, /# Aionis Runtime Context/);
  assert.match(text, /project_scope=codex:project:test/);
  assert.match(text, /run_id=run-1/);
  assert.match(text, /inspect before editing/);
  assert.match(text, /src\/example\.ts/);
  assert.match(text, /npm test/);
});

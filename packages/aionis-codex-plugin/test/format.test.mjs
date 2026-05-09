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

test("renderAionisHookContext suppresses generic tool-only candidate patterns", () => {
  const text = renderAionisHookContext({
    config,
    sessionId: "session-1",
    turnId: "turn-2",
    runId: "run-2",
    prompt: "Update release copy",
    runtimeStatus: { ok: true, started: false },
    contextAssemble: {
      assembly_summary: { planner_explanation: "stale release copy found" },
      planner_packet: {
        sections: {
          candidate_patterns: [
            "candidate pattern: prefer Bash; Candidate pattern: for Codex Bash completed with success, prefer Bash after one successful tool selection.",
            "candidate pattern: release copy workflow; task_family=release_docs; target_files=README.md; next_action=update README version",
          ],
        },
      },
      runtime_tool_hints: [
        {
          tool_name: "rehydrate_payload",
          anchor: {
            anchor_kind: "pattern",
            title: "Pattern: prefer Bash for Codex Bash completed with success",
            summary: "Candidate pattern: for Codex Bash completed with success, prefer Bash after one successful tool selection.",
            selected_tool: "Bash",
          },
        },
        {
          tool_name: "rehydrate_payload",
          anchor: {
            anchor_kind: "workflow",
            title: "Release docs workflow",
            summary: "Update README release copy and rerun site build.",
            target_files: ["README.md"],
          },
        },
      ],
      layered_context: {
        layers: {
          facts: {
            items: [
              "Candidate pattern: for Codex Bash completed with success, prefer Bash after one successful tool selection.",
              "runtime package latest is 0.2.3",
            ],
          },
        },
      },
    },
  });

  assert.match(text, /suppressed_generic_tool_patterns=/);
  assert.doesNotMatch(text, /one successful tool selection/);
  assert.doesNotMatch(text, /Pattern: prefer Bash/);
  assert.match(text, /release_docs/);
  assert.match(text, /target_files=README\.md/);
  assert.match(text, /runtime package latest is 0\.2\.3/);
  assert.match(text, /Release docs workflow/);
});

test("renderAionisHookContext renders structured non-fatal error diagnostics", () => {
  const error = new Error("context_assemble: timed out after 3000ms");
  error.aionis_non_fatal = {
    label: "context_assemble",
    category: "timeout",
    code: "runtime_request_timeout",
    method: "POST",
    route_path: "/v1/memory/context/assemble",
    duration_ms: 3004,
    timeout_ms: 3000,
    message: "timed out after 3000ms",
  };

  const text = renderAionisHookContext({
    config,
    sessionId: "session-1",
    turnId: "turn-3",
    runId: "run-3",
    prompt: "Continue dogfood",
    runtimeStatus: { ok: true, started: false },
    contextAssemble: null,
    errors: [error],
  });

  assert.match(text, /context_assemble: timed out after 3000ms/);
  assert.match(text, /category=timeout/);
  assert.match(text, /code=runtime_request_timeout/);
  assert.match(text, /method=POST/);
  assert.match(text, /route=\/v1\/memory\/context\/assemble/);
  assert.match(text, /duration_ms=3004/);
  assert.match(text, /timeout_ms=3000/);
});

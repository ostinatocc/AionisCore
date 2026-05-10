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
              "runtime package latest is 0.2.4",
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
  assert.match(text, /runtime package latest is 0\.2\.4/);
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

test("renderAionisHookContext keeps fast planning facts visible when full assembly fails", () => {
  const error = new Error("context_assemble: timed out after 3000ms");
  error.aionis_non_fatal = {
    label: "context_assemble",
    category: "timeout",
    code: "runtime_request_timeout",
    method: "POST",
    route_path: "/v1/memory/context/assemble",
    duration_ms: 3005,
    timeout_ms: 3000,
    message: "timed out after 3000ms",
  };

  const text = renderAionisHookContext({
    config,
    sessionId: "session-1",
    turnId: "turn-4",
    runId: "run-4",
    prompt: "Continue dogfood",
    runtimeStatus: { ok: true, started: false },
    planningContext: {
      planning_summary: {
        planner_explanation: "candidate workflows visible but not yet promoted: Goal: run 10 real Codex tasks with Aionis hooks enabled and improve recall, compaction, and display quality from observed useful/noisy context.; trusted patterns available but not used: Bash",
      },
      tools: { selection: { selected: "functions.exec_command" } },
      execution_kernel: {
        workflow_signal_summary: {
          observing_workflow_titles: [
            "Long intro before signal\n\n```text\nAionis Codex recall dogfood loop: 4 of 10 real tasks completed; next fix is fast planning context fallback.; selected tool: functions.exec_command\n```",
          ],
        },
      },
      planner_packet: {
        sections: {
          candidate_workflows: [
            "Aionis Codex recall dogfood loop: 4 of 10 real tasks completed; next action is to preserve task facts above noise.",
          ],
        },
      },
    },
    contextAssemble: null,
    errors: [error],
  });

  assert.match(text, /## Fast Task Facts/);
  assert.match(text, /candidate workflows visible/);
  assert.match(text, /Goal: run 10 real Codex tasks/);
  assert.doesNotMatch(text, /trusted patterns available but not used/);
  assert.match(text, /tools_selected=functions\.exec_command/);
  assert.match(text, /Aionis Codex recall dogfood loop: 4 of 10 real tasks completed/);
  assert.doesNotMatch(text, /Long intro before signal/);
  assert.match(text, /## Fast Planner Packet/);
  assert.match(text, /context_assemble: timed out after 3000ms/);
  assert.match(text, /category=timeout/);
});

test("renderAionisHookContext keeps direct handoff visible when heavy context is unavailable", () => {
  const error = new Error("planning_context_fast: timed out after 3000ms");
  error.aionis_non_fatal = {
    label: "planning_context_fast",
    category: "timeout",
    code: "runtime_request_timeout",
    method: "POST",
    route_path: "/v1/memory/planning/context",
    duration_ms: 3004,
    timeout_ms: 3000,
    message: "timed out after 3000ms",
  };

  const text = renderAionisHookContext({
    config,
    sessionId: "session-1",
    turnId: "turn-5",
    runId: "run-5",
    prompt: "Continue dogfood",
    runtimeStatus: { ok: true, started: false },
    projectHandoffFast: {
      handoff: {
        summary: "Aionis Codex recall dogfood loop: 10 of 10 real tasks completed; Task 10 verified npm latest and repo_root recovery.",
        next_action: "Use Aionis in normal Codex work and measure recall quality.",
        target_files: ["packages/aionis-codex-plugin/hooks/aionis-codex-hook.mjs"],
        acceptance_checks: ["hook exposes 10 of 10"],
        uri: "aionis://local-codex/codex%3AAionisRuntime/event/task-10",
      },
    },
    planningContext: null,
    contextAssemble: null,
    errors: [error],
  });

  assert.match(text, /## Fast Task Facts/);
  assert.match(text, /dogfood_progress=Aionis Codex recall dogfood loop: 10 of 10 real tasks completed/);
  assert.match(text, /latest_task_handoff=Aionis Codex recall dogfood loop: 10 of 10 real tasks completed/);
  assert.match(text, /## Project Direct Handoff/);
  assert.match(text, /next_action=Use Aionis in normal Codex work and measure recall quality/);
  assert.match(text, /hook exposes 10 of 10/);
  assert.match(text, /planning_context_fast: timed out after 3000ms/);
});

test("renderAionisHookContext ranks high-signal direct handoff nodes above newer generic handoffs", () => {
  const text = renderAionisHookContext({
    config,
    sessionId: "session-1",
    turnId: "turn-6",
    runId: "run-6",
    prompt: "Project status",
    runtimeStatus: { ok: true, started: false },
    projectHandoffFast: {
      nodes: [
        {
          title: "Handoff /tmp/repo#newer",
          text_summary: "Generic recent conversation summary that should not hide the dogfood status.",
          uri: "aionis://local-codex/codex%3Aproject/event/newer",
        },
        {
          title: "Aionis Codex recall dogfood task 10 complete",
          text_summary: "Aionis Codex recall dogfood loop: 10 of 10 real tasks completed; Task 10 verified npm latest and repo_root recovery.",
          uri: "aionis://local-codex/codex%3Aproject/event/dogfood-10",
        },
      ],
    },
    planningContext: null,
    contextAssemble: null,
  });

  assert.match(text, /dogfood_progress=Aionis Codex recall dogfood loop: 10 of 10 real tasks completed/);
  assert.match(text, /latest_task_handoff=Aionis Codex recall dogfood loop: 10 of 10 real tasks completed/);
  assert.match(text, /handoff_uri=aionis:\/\/local-codex\/codex%3Aproject\/event\/dogfood-10/);
  assert.doesNotMatch(text, /other_task_handoff=/);
  assert.doesNotMatch(text, /Generic recent conversation summary/);
});

test("renderAionisHookContext prefers newer dogfood follow-up over old completed progress handoff", () => {
  const text = renderAionisHookContext({
    config,
    sessionId: "session-1",
    turnId: "turn-7",
    runId: "run-7",
    prompt: "Continue dogfood",
    runtimeStatus: { ok: true, started: false },
    projectHandoffFast: {
      nodes: [
        {
          title: "Aionis Codex display context cleaned after 0.2.6 dogfood",
          text_summary: "Aionis Codex display-quality dogfood follow-up: cleaned task-start context after 0.2.6 and installed the local rebuilt plugin.",
          uri: "aionis://local-codex/codex%3Aproject/event/display-follow-up",
        },
        {
          title: "Aionis Runtime 0.2.6 release verified",
          text_summary: "Aionis Codex recall dogfood loop: 10 of 10 real tasks completed; 0.2.6 follow-up published and verified @ostinato/aionis-runtime@0.2.6.",
          uri: "aionis://local-codex/codex%3Aproject/event/release-026",
        },
      ],
    },
    planningContext: null,
    contextAssemble: null,
  });

  assert.match(text, /latest_task_handoff=Aionis Codex display-quality dogfood follow-up/);
  assert.match(text, /handoff_uri=aionis:\/\/local-codex\/codex%3Aproject\/event\/display-follow-up/);
  assert.doesNotMatch(text, /latest_task_handoff=Aionis Codex recall dogfood loop: 10 of 10/);
});

test("renderAionisHookContext promotes latest dogfood progress and suppresses stale workflow entries", () => {
  const text = renderAionisHookContext({
    config,
    sessionId: "session-1",
    turnId: "turn-5",
    runId: "run-5",
    prompt: "Continue dogfood",
    runtimeStatus: { ok: true, started: false },
    planningContext: {
      planning_summary: { planner_explanation: "selected tool: functions.exec_command" },
      tools: { selection: { selected: "functions.exec_command" } },
    },
    contextAssemble: {
      assembly_summary: { planner_explanation: "candidate workflows visible" },
      planner_packet: {
        sections: {
          candidate_workflows: [
            "candidate workflow: Aionis Codex recall dogfood loop: 2 of 10 real tasks completed; next fix was old handoff recovery.",
            "candidate workflow: Aionis Codex recall dogfood loop: 7 of 10 real tasks completed; Task 7 published @ostinato/aionis-runtime@0.2.4 and verified live Codex watchdog uses the Runtime fixes.; anchor=dogfood-7",
            "candidate workflow: Aionis Codex recall dogfood loop: 4 of 10 real tasks completed; next fix was fast planning fallback.",
          ],
        },
      },
      tools: { selection: { selected: "functions.exec_command" } },
    },
  });

  assert.match(text, /## Fast Task Facts/);
  assert.match(text, /dogfood_progress=Aionis Codex recall dogfood loop: 7 of 10 real tasks completed/);
  assert.match(text, /Task 7 published @ostinato\/aionis-runtime@0\.2\.4/);
  assert.match(text, /suppressed_stale_dogfood_workflows=2/);
  assert.doesNotMatch(text, /2 of 10/);
  assert.doesNotMatch(text, /4 of 10/);
  assert.match(text, /7 of 10/);
});

test("renderAionisHookContext compacts noisy planner and layered display payloads", () => {
  const text = renderAionisHookContext({
    config,
    sessionId: "session-1",
    turnId: "turn-7",
    runId: "run-7",
    prompt: "Continue dogfood",
    runtimeStatus: { ok: true, started: false },
    projectHandoffFast: {
      handoff: {
        title: "Aionis Runtime 0.2.6 release verified",
        summary: "Aionis Codex recall dogfood loop: 10 of 10 real tasks completed; 0.2.6 follow-up published and verified @ostinato/aionis-runtime@0.2.6. " + "release evidence ".repeat(80),
        uri: "aionis://local-codex/codex%3Aproject/event/release-026",
      },
    },
    contextAssemble: {
      assembly_summary: {
        planner_explanation: "selected tool: functions.exec_command; supporting knowledge appended: 3; action retrieval uncertainty: high; no learned workflow matched this request yet",
      },
      tools: { selection: { selected: "functions.exec_command" } },
      planner_packet: {
        packet_version: "planner_packet_v1",
        sections: {
          candidate_workflows: [
            "candidate workflow: unrelated long research note " + "x".repeat(500),
            "candidate workflow: Aionis Codex recall dogfood loop: 7 of 10 real tasks completed; stale release state.",
          ],
          supporting_knowledge: [
            "supporting knowledge: Codex session dogfood-live-task8 in AionisRuntime",
            "supporting knowledge: ok 开始继续推进吧",
            "supporting knowledge: 0.2.6 package is installed and runtime status is PASS.",
          ],
        },
      },
      layered_context: {
        layers: {
          facts: {
            items: [
              "Codex session manual-verify-final-ranked-clean in AionisRuntime (uri:aionis://local-codex/topic/manual)",
              "0.2.6 package is installed and runtime status is PASS. " + "z".repeat(400),
            ],
          },
          tools: {
            items: [
              "selected tool: functions.exec_command",
              "tool ranking: functions.exec_command, filesystem, git",
            ],
            workflow_signals: [
              {
                title: "他做的测试本质上是一个 " + "无关内容".repeat(120),
              },
            ],
          },
        },
      },
    },
  });

  assert.match(text, /latest_task_handoff=Aionis Codex recall dogfood loop: 10 of 10 real tasks completed/);
  assert.match(text, /suppressed_stale_dogfood_workflows=/);
  assert.match(text, /suppressed_low_signal_context=/);
  assert.match(text, /compacted_display_entries=/);
  assert.doesNotMatch(text, /unrelated long research note/);
  assert.doesNotMatch(text, /7 of 10/);
  assert.doesNotMatch(text, /ok 开始继续推进吧/);
  assert.doesNotMatch(text, /manual-verify-final-ranked-clean/);
  assert.doesNotMatch(text, /tool ranking:/);
  assert.doesNotMatch(text, /无关内容/);
  assert.doesNotMatch(text, /latest_task_handoff=.*\n\.\.\. \[truncated/);
  assert.match(text, /0\.2\.6 package is installed and runtime status is PASS/);
});

test("renderAionisHookContext compacts markdown task handoffs and avoids duplicate latest handoff", () => {
  const text = renderAionisHookContext({
    config,
    sessionId: "session-1",
    turnId: "turn-8",
    runId: "run-8",
    prompt: "推进吧",
    runtimeStatus: { ok: true, started: false },
    projectHandoffFast: {
      handoff: {
        summary: "这一步已经推进完，修的是第二个真实 dogfood 问题：**下一步怎么推进的纯策略回答不应该覆盖 latest_task_handoff**。 改动很小： - [aionis-codex-hook.mjs](/Volumes/ziel/AionisRuntime/packages/aionis-codex-plugin/hooks/aionis-codex-hook.mjs:259) 增加 planning advice suppression。 - [hook.test.mjs](/Volumes/ziel/AionisRuntime/packages/aionis-codex-plugin/test/hook.test.mjs:198) 新增回归测试。 验证结果： - npm run -s codex-plugin:test：24 pass - npm --prefix packages/aionis-runtime run test：7 pass - npm --prefix packages/aionis-runtime run pack:dry-run：通过 - Codex status：PASS。",
        next_action: "Continue dogfood by improving task-start context display quality.",
        uri: "aionis://local-codex/codex%3Aproject/event/planning-noise",
      },
    },
  });

  const latestMatches = text.match(/latest_task_handoff=/g) || [];
  assert.equal(latestMatches.length, 1);
  assert.match(text, /latest_task_handoff=这一步已经推进完/);
  assert.match(text, /evidence: tests=24 pass, 7 pass; pack_dry_run=pass; codex_status=pass/);
  assert.doesNotMatch(text, /\[aionis-codex-hook\.mjs\]\(/);
  assert.doesNotMatch(text, /hook\.test\.mjs.*新增回归测试/);
  assert.match(text, /## Project Direct Handoff/);
  assert.match(text, /next_action=Continue dogfood by improving task-start context display quality/);
});

test("renderAionisHookContext keeps release outcome evidence visible", () => {
  const text = renderAionisHookContext({
    config,
    sessionId: "session-1",
    turnId: "turn-release",
    runId: "run-release",
    prompt: "继续推进吧",
    runtimeStatus: { ok: true, started: false },
    projectHandoffFast: {
      handoff: {
        summary: [
          "0.2.10 发布闭环完成了。",
          "npm latest：@ostinato/aionis-runtime@0.2.10。",
          "clean npx --yes @ostinato/aionis-runtime@0.2.10 --version 返回 0.2.10。",
          "隔离 HOME 新用户安装验证：codex status --json 返回 ok: true。",
          "Codex install / watchdog / runtime health：PASS。",
        ].join(" "),
        uri: "aionis://local-codex/codex%3Aproject/event/release-0.2.10",
      },
    },
  });

  assert.doesNotMatch(text, /latest_task_handoff=0\.2\.10 发布闭环完成了/);
  assert.match(text, /latest_release_outcome=0\.2\.10 发布闭环完成了/);
  assert.match(text, /npm_latest=0\.2\.10/);
  assert.match(text, /clean_npx=0\.2\.10/);
  assert.match(text, /clean_install=pass/);
  assert.match(text, /codex_status=pass/);
});

test("renderAionisHookContext keeps release outcome visible when a newer task handoff exists", () => {
  const text = renderAionisHookContext({
    config,
    sessionId: "session-1",
    turnId: "turn-release-after-source",
    runId: "run-release-after-source",
    prompt: "继续推进吧",
    runtimeStatus: { ok: true, started: false },
    projectHandoffFast: {
      handoff: {
        summary: "这轮继续推进完了，新增 dogfood 总结报告并修了 Fast Facts 发布证据显示。提交 7862d4f。验证：codex-plugin:test 32 pass，runtime test 7 pass，pack dry-run 通过。",
        uri: "aionis://local-codex/codex%3Aproject/event/source-0.2.11",
      },
    },
    projectReleaseOutcomeFast: {
      nodes: [
        {
          summary: [
            "源码是 0.2.11 候选。",
            "npm latest 仍是 @ostinato/aionis-runtime@0.2.10。",
            "没有误发包，下一步验证通过后再发布。",
          ].join(" "),
          tags: ["codex", "release", "release_outcome", "0.2.10"],
          execution_result_summary: {
            release_outcome: true,
            version: "0.2.10",
          },
          uri: "aionis://local-codex/codex%3Aproject/event/false-release-0.2.10",
        },
        {
          summary: [
            "0.2.10 发布闭环完成了。",
            "npm latest：@ostinato/aionis-runtime@0.2.10。",
            "clean npx --yes @ostinato/aionis-runtime@0.2.10 --version 返回 0.2.10。",
            "隔离 HOME 新用户安装验证：codex status --json 返回 ok: true。",
            "Codex install / watchdog / runtime health：PASS。",
          ].join(" "),
          tags: ["codex", "release", "release_outcome", "0.2.10"],
          execution_result_summary: {
            release_outcome: true,
            version: "0.2.10",
          },
          uri: "aionis://local-codex/codex%3Aproject/event/release-0.2.10",
        },
      ],
    },
  });

  assert.match(text, /latest_task_handoff=这轮继续推进完了/);
  assert.match(text, /latest_release_outcome=0\.2\.10 发布闭环完成了/);
  assert.match(text, /npm_latest=0\.2\.10/);
  assert.match(text, /clean_npx=0\.2\.10/);
  assert.match(text, /clean_install=pass/);
  assert.doesNotMatch(text, /没有误发包/);
});

test("renderAionisHookContext suppresses low-signal status and conceptual handoffs", () => {
  const text = renderAionisHookContext({
    config,
    sessionId: "session-1",
    turnId: "turn-low-signal",
    runId: "run-low-signal",
    prompt: "继续推进吧",
    runtimeStatus: { ok: true, started: false },
    projectHandoffFast: {
      nodes: [
        {
          summary: [
            "你这个质疑是对的：context 质量就是 Aionis 的核心能力，不是外围小问题。",
            "Aionis 不是不行，而是现在刚进入真实使用校准阶段。",
            "它还需要避免把待发布状态误判成发布完成。",
            "release outcome 只是分类名，不代表真的完成发布。",
          ].join(" "),
          uri: "aionis://local-codex/codex%3Aproject/event/conceptual",
        },
        {
          summary: [
            "整体现在是：终于进入能真实用、能公开试用的状态了，但还不是成熟产品。",
            "npm latest 已经是 @ostinato/aionis-runtime@0.2.11。",
            "Codex status 全 PASS。",
          ].join(" "),
          tags: ["codex", "release", "release_outcome", "0.2.11"],
          execution_result_summary: {
            release_outcome: true,
            version: "0.2.11",
          },
          uri: "aionis://local-codex/codex%3Aproject/event/status",
        },
        {
          summary: [
            "发布被 npm 拦住了，不是代码问题。",
            "npm error code EOTP，需要一次性验证码。",
            "给了用户 npm publish --access public --otp=你的6位验证码。",
          ].join(" "),
          uri: "aionis://local-codex/codex%3Aproject/event/eotp",
        },
        {
          summary: [
            "接下来不要再盲目加功能了。现在最应该推进的是把 Aionis 从能接入 Codex 打磨成用户每天用时能明确感到有帮助。",
            "我建议按这个顺序走：做 Context Quality Audit，继续做 10 个真实任务 dogfood，压缩展示质量。",
          ].join(" "),
          uri: "aionis://local-codex/codex%3Aproject/event/planning-advice",
        },
        {
          summary: "修复了 Codex context 质量过滤：状态问答不再覆盖 latest_task_handoff，release outcome 必须有明确发布闭环信号。验证：codex-plugin:test 36 pass。",
          uri: "aionis://local-codex/codex%3Aproject/event/actionable",
        },
      ],
    },
    projectReleaseOutcomeFast: {
      nodes: [
        {
          summary: [
            "0.2.11 发布闭环完成了。",
            "npm latest：@ostinato/aionis-runtime@0.2.11。",
            "clean npx --yes @ostinato/aionis-runtime@latest --version 返回 0.2.11。",
            "隔离 HOME 新用户安装验证：codex status --json 返回 ok: true。",
          ].join(" "),
          tags: ["codex", "release", "release_outcome", "0.2.11"],
          execution_result_summary: {
            release_outcome: true,
            version: "0.2.11",
          },
          uri: "aionis://local-codex/codex%3Aproject/event/release",
        },
      ],
    },
  });

  assert.match(text, /latest_task_handoff=修复了 Codex context 质量过滤/);
  assert.match(text, /latest_release_outcome=0\.2\.11 发布闭环完成了/);
  assert.doesNotMatch(text, /latest_task_handoff=你这个质疑/);
  assert.doesNotMatch(text, /latest_task_handoff=发布被 npm 拦住/);
  assert.doesNotMatch(text, /latest_task_handoff=接下来不要再盲目加功能/);
  assert.doesNotMatch(text, /latest_release_outcome=整体现在是/);
});

test("renderAionisHookContext keeps commit-heavy handoff summaries untruncated", () => {
  const text = renderAionisHookContext({
    config,
    sessionId: "session-1",
    turnId: "turn-9",
    runId: "run-9",
    prompt: "继续推进吧",
    runtimeStatus: { ok: true, started: false },
    projectHandoffFast: {
      handoff: {
        summary: "推进了两块，并都已经提交： - 337d967 Suppress planning advice handoff noise “下一步怎么推进”这类纯策略回答不再写 task_handoff，只写 session/replay。 - 00885b3 Compact Codex handoff display latest_task_handoff 现在会压缩 markdown/验证列表，并且只在 Fast Facts 出现一次。 验证过： - npm run -s codex-plugin:test：25 pass - npm --prefix packages/aionis-runtime run test：7 pass - npm --prefix packages/aionis-runtime run pack:dry-run：通过 - 本地 codex install：PASS - Codex status / watchdog / runtime health：PASS 当前状态：main 干净，但相对 aioniscore/main 是 ahead 2。",
        uri: "aionis://local-codex/codex%3Aproject/event/display-compact",
      },
    },
  });

  assert.match(text, /latest_task_handoff=推进了两块，并都已经提交/);
  assert.match(text, /evidence: commits=337d967,00885b3; tests=25 pass, 7 pass; pack_dry_run=pass; codex_status=pass/);
  assert.doesNotMatch(text, /latest_task_handoff=.*truncated/);
  assert.doesNotMatch(text, /当前状态：main 干净/);
});

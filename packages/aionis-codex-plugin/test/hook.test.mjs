import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "..");

function runHook(input, options = {}) {
  const runtimeHome = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-codex-hook-test-"));
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["hooks/aionis-codex-hook.mjs"], {
      cwd: pluginRoot,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        AIONIS_CODEX_AUTOSTART: "false",
        AIONIS_BASE_URL: options.baseUrl || "http://127.0.0.1:1",
        AIONIS_CODEX_RUNTIME_HOME: runtimeHome,
        ...(options.env || {}),
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`hook exited ${code}: ${stderr}`));
        return;
      }
      resolve({ stdout, stderr });
    });
    child.stdin.end(`${JSON.stringify(input)}\n`);
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address()));
  });
}

test("UserPromptSubmit hook degrades with explicit Aionis-unavailable context", async () => {
  const result = await runHook({
    hook_event_name: "UserPromptSubmit",
    session_id: "test-session",
    turn_id: "test-turn",
    cwd: pluginRoot,
    prompt: "Use Aionis for this task",
  });
  const output = JSON.parse(result.stdout);
  assert.equal(output.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.match(output.hookSpecificOutput.additionalContext, /Aionis Runtime is configured/);
  assert.match(output.hookSpecificOutput.additionalContext, /could not reach/);
});

test("root hooks manifest exposes Codex lifecycle hooks", () => {
  const rootHooks = JSON.parse(fs.readFileSync(path.join(pluginRoot, "hooks.json"), "utf8"));
  const legacyHooks = JSON.parse(fs.readFileSync(path.join(pluginRoot, "hooks", "hooks.json"), "utf8"));

  assert.deepEqual(rootHooks, legacyHooks);
  for (const event of ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop"]) {
    assert.ok(Array.isArray(rootHooks.hooks[event]), `${event} hook should be configured`);
  }
});

test("PreToolUse hook stays non-blocking when runtime is unavailable", async () => {
  const result = await runHook({
    hook_event_name: "PreToolUse",
    session_id: "test-session",
    cwd: pluginRoot,
    tool_name: "functions.exec_command",
    tool_input: { cmd: "pwd" },
  });
  assert.deepEqual(JSON.parse(result.stdout), {});
});

test("UserPromptSubmit skips blocking planning context when project handoff is already usable", async () => {
  const routes = [];
  const server = http.createServer((req, res) => {
    routes.push(req.url);
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" });
      if (req.url === "/health") {
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      if (req.url === "/v1/memory/find") {
        res.end(JSON.stringify({
          nodes: [
            {
              title: "Aionis display-quality follow-up",
              text_summary: "Aionis Codex display-quality follow-up after 0.2.6 cleaned task-start context and should be enough to resume without blocking on planning context.",
              uri: "aionis://local-codex/test/handoff",
            },
          ],
        }));
        return;
      }
      res.end(JSON.stringify({ ok: true, body: body ? JSON.parse(body) : null }));
    });
  });
  const address = await listen(server);
  try {
    const result = await runHook({
      hook_event_name: "UserPromptSubmit",
      session_id: "test-session",
      turn_id: "test-turn",
      cwd: pluginRoot,
      prompt: "Continue dogfood",
    }, {
      baseUrl: `http://127.0.0.1:${address.port}`,
    });
    const output = JSON.parse(result.stdout);
    const text = output.hookSpecificOutput.additionalContext;
    assert.match(text, /latest_task_handoff=Aionis Codex display-quality follow-up/);
    assert.doesNotMatch(text, /planning_context_fast/);
    assert.equal(routes.includes("/v1/memory/planning/context"), false);
    assert.equal(routes.includes("/v1/memory/context/assemble"), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Stop hook does not store status-only assistant replies as task handoffs", async () => {
  const routes = [];
  const bodies = {};
  const server = http.createServer((req, res) => {
    routes.push(req.url);
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (body) {
        bodies[req.url] = bodies[req.url] || [];
        bodies[req.url].push(JSON.parse(body));
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  const address = await listen(server);
  try {
    const result = await runHook({
      hook_event_name: "Stop",
      session_id: "test-session",
      turn_id: "status-turn",
      cwd: pluginRoot,
      last_assistant_message: "整体现在是一个比较健康的状态。Git 和 npm 都已经对齐，Codex status 全 PASS。",
    }, {
      baseUrl: `http://127.0.0.1:${address.port}`,
    });
    assert.deepEqual(JSON.parse(result.stdout), {});
    assert.equal(routes.includes("/v1/memory/events"), true);
    assert.equal(routes.includes("/v1/memory/replay/run/end"), true);
    assert.equal(routes.includes("/v1/handoff/store"), false);
    assert.equal(bodies["/v1/memory/events"][0].metadata.handoff_quality.store_handoff, false);
    assert.equal(bodies["/v1/memory/events"][0].metadata.handoff_quality.category, "status_report");
    assert.ok(bodies["/v1/memory/events"][0].metadata.handoff_quality.reasons.includes("status_only_assistant_text"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Stop hook does not store release-looking overall status as release outcome", async () => {
  const routes = [];
  const bodies = {};
  const server = http.createServer((req, res) => {
    routes.push(req.url);
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (body) {
        bodies[req.url] = bodies[req.url] || [];
        bodies[req.url].push(JSON.parse(body));
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  const address = await listen(server);
  try {
    const result = await runHook({
      hook_event_name: "Stop",
      session_id: "test-session",
      turn_id: "overall-status-turn",
      cwd: pluginRoot,
      prompt: "现在整体怎么样了？",
      last_assistant_message: [
        "整体现在是：终于进入能真实用、能公开试用的状态了，但还不是成熟产品。",
        "npm latest 已经是 @ostinato/aionis-runtime@0.2.11。",
        "本地源码版本也是 0.2.11，Codex status 全 PASS。",
        "之前那个真实 hook 目录 stale 的问题已经修掉并发布了。",
      ].join(" "),
    }, {
      baseUrl: `http://127.0.0.1:${address.port}`,
    });
    assert.deepEqual(JSON.parse(result.stdout), {});
    assert.equal(routes.includes("/v1/memory/events"), true);
    assert.equal(routes.includes("/v1/memory/replay/run/end"), true);
    assert.equal(routes.includes("/v1/handoff/store"), false);
    assert.equal(bodies["/v1/handoff/store"], undefined);
    assert.equal(bodies["/v1/memory/events"][0].metadata.handoff_quality.store_handoff, false);
    assert.equal(bodies["/v1/memory/events"][0].metadata.handoff_quality.category, "status_report");
    assert.ok(bodies["/v1/memory/events"][0].metadata.handoff_quality.reasons.includes("status_only_assistant_text"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Stop hook does not store overall release-closed status as release outcome", async () => {
  const routes = [];
  const bodies = {};
  const server = http.createServer((req, res) => {
    routes.push(req.url);
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (body) {
        bodies[req.url] = bodies[req.url] || [];
        bodies[req.url].push(JSON.parse(body));
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  const address = await listen(server);
  try {
    const result = await runHook({
      hook_event_name: "Stop",
      session_id: "test-session",
      turn_id: "overall-closed-status-turn",
      cwd: pluginRoot,
      prompt: "现在整体怎么样了？",
      last_assistant_message: [
        "现在整体状态是：AionisRuntime 这一条线已经稳定到可以继续 dogfood。",
        "npm latest：@ostinato/aionis-runtime@0.2.22。",
        "本地 package：0.2.22。",
        "0.2.22 发布闭环成立，Runtime 在线，codex audit PASS。",
      ].join(" "),
    }, {
      baseUrl: `http://127.0.0.1:${address.port}`,
    });
    assert.deepEqual(JSON.parse(result.stdout), {});
    assert.equal(routes.includes("/v1/memory/events"), true);
    assert.equal(routes.includes("/v1/handoff/store"), false);
    assert.equal(bodies["/v1/handoff/store"], undefined);
    assert.equal(bodies["/v1/memory/events"][0].metadata.handoff_quality.store_handoff, false);
    assert.equal(bodies["/v1/memory/events"][0].metadata.handoff_quality.category, "status_report");
    assert.ok(bodies["/v1/memory/events"][0].metadata.handoff_quality.reasons.includes("status_or_command_prompt"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Stop hook does not store conceptual product answers as task handoffs", async () => {
  const routes = [];
  const bodies = {};
  const server = http.createServer((req, res) => {
    routes.push(req.url);
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (body) {
        bodies[req.url] = bodies[req.url] || [];
        bodies[req.url].push(JSON.parse(body));
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  const address = await listen(server);
  try {
    const result = await runHook({
      hook_event_name: "Stop",
      session_id: "test-session",
      turn_id: "conceptual-turn",
      cwd: pluginRoot,
      prompt: "这些不是Aionis本身的能力吗？是Aionis不行吗？",
      last_assistant_message: [
        "你这个质疑是对的：context 质量就是 Aionis 的核心能力，不是外围小问题。",
        "Aionis 不是不行，而是现在刚进入真实使用校准阶段。",
        "它还需要避免把待发布状态误判成发布完成。",
        "release outcome 只是分类名，不代表真的完成发布。",
        "本质上 Aionis 有三层：存储能力、召回能力、展示能力。",
      ].join(" "),
    }, {
      baseUrl: `http://127.0.0.1:${address.port}`,
    });
    assert.deepEqual(JSON.parse(result.stdout), {});
    assert.equal(routes.includes("/v1/memory/events"), true);
    assert.equal(routes.includes("/v1/memory/replay/run/end"), true);
    assert.equal(routes.includes("/v1/handoff/store"), false);
    assert.equal(bodies["/v1/memory/events"][0].metadata.handoff_quality.store_handoff, false);
    assert.equal(bodies["/v1/memory/events"][0].metadata.handoff_quality.category, "conceptual_answer");
    assert.ok(bodies["/v1/memory/events"][0].metadata.handoff_quality.reasons.includes("conceptual_discussion_only"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Stop hook still stores implementation summaries as task handoffs", async () => {
  const routes = [];
  const bodies = {};
  const server = http.createServer((req, res) => {
    routes.push(req.url);
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (body) {
        bodies[req.url] = bodies[req.url] || [];
        bodies[req.url].push(JSON.parse(body));
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  const address = await listen(server);
  try {
    const result = await runHook({
      hook_event_name: "Stop",
      session_id: "test-session",
      turn_id: "implementation-turn",
      cwd: pluginRoot,
      last_assistant_message: "Implemented the Codex Stop hook handoff suppression fix and verified npm run -s codex-plugin:test passes.",
    }, {
      baseUrl: `http://127.0.0.1:${address.port}`,
    });
    assert.deepEqual(JSON.parse(result.stdout), {});
    assert.equal(routes.includes("/v1/handoff/store"), true);
    const handoff = bodies["/v1/handoff/store"][0];
    assert.equal(handoff.execution_result_summary.handoff_quality.store_handoff, true);
    assert.equal(handoff.execution_result_summary.handoff_quality.category, "execution_outcome");
    assert.ok(handoff.execution_result_summary.handoff_quality.reasons.includes("task_handoff_evidence"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Stop hook stores verified release outcomes even when the reply is status-shaped", async () => {
  const routes = [];
  const bodies = {};
  const server = http.createServer((req, res) => {
    routes.push(req.url);
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (body) {
        bodies[req.url] = bodies[req.url] || [];
        bodies[req.url].push(JSON.parse(body));
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  const address = await listen(server);
  try {
    const result = await runHook({
      hook_event_name: "Stop",
      session_id: "test-session",
      turn_id: "release-turn",
      cwd: pluginRoot,
      prompt: "执行 npm publish吧",
      last_assistant_message: [
        "发布完成。",
        "`@ostinato/aionis-runtime@0.2.9` 已经成功发到 npm。",
        "`npm view @ostinato/aionis-runtime version` 返回 `0.2.9`。",
        "dist-tag latest 也是 `0.2.9`，`git push aioniscore main` 已完成。",
      ].join(" "),
    }, {
      baseUrl: `http://127.0.0.1:${address.port}`,
    });
    assert.deepEqual(JSON.parse(result.stdout), {});
    assert.equal(routes.includes("/v1/handoff/store"), true);
    const handoff = bodies["/v1/handoff/store"][0];
    assert.match(handoff.anchor, /#release:0\.2\.9$/);
    assert.ok(handoff.tags.includes("release_outcome"));
    assert.equal(handoff.execution_result_summary.release_outcome, true);
    assert.equal(handoff.execution_result_summary.version, "0.2.9");
    assert.equal(handoff.execution_result_summary.handoff_quality.category, "release_outcome");
    assert.equal(handoff.execution_result_summary.handoff_quality.store_handoff, true);
    assert.ok(handoff.execution_result_summary.handoff_quality.reasons.includes("release_completion_signal"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Stop hook marks confirmed publish closeout summaries as release outcomes", async () => {
  const routes = [];
  const bodies = {};
  const server = http.createServer((req, res) => {
    routes.push(req.url);
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (body) {
        bodies[req.url] = bodies[req.url] || [];
        bodies[req.url].push(JSON.parse(body));
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  const address = await listen(server);
  try {
    const result = await runHook({
      hook_event_name: "Stop",
      session_id: "test-session",
      turn_id: "release-closeout-turn",
      cwd: pluginRoot,
      prompt: "发布好了",
      last_assistant_message: [
        "确认发布成功，`0.2.15` 闭环成立。",
        "验证结果：",
        "- npm latest：`@ostinato/aionis-runtime@0.2.15`",
        "- 干净 npx 拉取：返回 `0.2.15`",
        "- `codex audit`：Runtime PASS，当前会话正常",
      ].join(" "),
    }, {
      baseUrl: `http://127.0.0.1:${address.port}`,
    });
    assert.deepEqual(JSON.parse(result.stdout), {});
    assert.equal(routes.includes("/v1/handoff/store"), true);
    const handoff = bodies["/v1/handoff/store"][0];
    assert.match(handoff.anchor, /#release:0\.2\.15$/);
    assert.ok(handoff.tags.includes("release_outcome"));
    assert.equal(handoff.execution_result_summary.release_outcome, true);
    assert.equal(handoff.execution_result_summary.version, "0.2.15");
    assert.equal(handoff.execution_result_summary.handoff_quality.category, "release_outcome");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Stop hook does not mark unpublished release status as release outcome", async () => {
  const routes = [];
  const bodies = {};
  const server = http.createServer((req, res) => {
    routes.push(req.url);
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (body) {
        bodies[req.url] = bodies[req.url] || [];
        bodies[req.url].push(JSON.parse(body));
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  const address = await listen(server);
  try {
    const result = await runHook({
      hook_event_name: "Stop",
      session_id: "test-session",
      turn_id: "candidate-turn",
      cwd: pluginRoot,
      prompt: "继续推进吧",
      last_assistant_message: [
        "这轮继续推进完了。",
        "源码是 0.2.11 候选，npm latest 仍是 @ostinato/aionis-runtime@0.2.10。",
        "没有误发包，下一步真实启动验证通过后再发布 0.2.11。",
        "验证：codex-plugin:test 33 pass，runtime test 7 pass。",
      ].join(" "),
    }, {
      baseUrl: `http://127.0.0.1:${address.port}`,
    });
    assert.deepEqual(JSON.parse(result.stdout), {});
    assert.equal(routes.includes("/v1/handoff/store"), true);
    const handoff = bodies["/v1/handoff/store"][0];
    assert.doesNotMatch(handoff.anchor, /#release:0\.2\.10$/);
    assert.equal(handoff.tags.includes("release_outcome"), false);
    assert.equal(handoff.execution_result_summary.release_outcome, undefined);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Stop hook does not store next-step planning advice as task handoffs", async () => {
  const routes = [];
  const server = http.createServer((req, res) => {
    routes.push(req.url);
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  const address = await listen(server);
  try {
    const result = await runHook({
      hook_event_name: "Stop",
      session_id: "test-session",
      turn_id: "planning-advice-turn",
      cwd: pluginRoot,
      prompt: "接下来应该怎么继续推进呢？",
      last_assistant_message: "接下来不要再开新坑。现在最该做的是把 0.2.8 当作第一个可用基线，连续真实使用，把有没有价值打穿。",
    }, {
      baseUrl: `http://127.0.0.1:${address.port}`,
    });
    assert.deepEqual(JSON.parse(result.stdout), {});
    assert.equal(routes.includes("/v1/memory/events"), true);
    assert.equal(routes.includes("/v1/memory/replay/run/end"), true);
    assert.equal(routes.includes("/v1/handoff/store"), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Stop hook does not store rich next-step audit plans as task handoffs", async () => {
  const routes = [];
  const bodies = {};
  const server = http.createServer((req, res) => {
    routes.push(req.url);
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (body) {
        bodies[req.url] = bodies[req.url] || [];
        bodies[req.url].push(JSON.parse(body));
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  const address = await listen(server);
  try {
    const result = await runHook({
      hook_event_name: "Stop",
      session_id: "test-session",
      turn_id: "rich-planning-advice-turn",
      cwd: pluginRoot,
      prompt: "接下来应该怎么继续推进？",
      last_assistant_message: [
        "接下来不要再盲目加功能了。现在最应该推进的是把 Aionis 从能接入 Codex 打磨成用户每天用时能明确感到有帮助。",
        "我建议按这个顺序走：",
        "1. 做 Context Quality Audit，增加命令 `npx @ostinato/aionis-runtime codex audit`。",
        "2. 继续做 10 个真实任务 dogfood。",
        "3. 压缩展示质量，release 信息只保留版本、结果、证据。",
      ].join(" "),
    }, {
      baseUrl: `http://127.0.0.1:${address.port}`,
    });
    assert.deepEqual(JSON.parse(result.stdout), {});
    assert.equal(routes.includes("/v1/memory/events"), true);
    assert.equal(routes.includes("/v1/memory/replay/run/end"), true);
    assert.equal(routes.includes("/v1/handoff/store"), false);
    assert.equal(bodies["/v1/memory/events"][0].metadata.handoff_quality.store_handoff, false);
    assert.equal(bodies["/v1/memory/events"][0].metadata.handoff_quality.category, "planning_advice");
    assert.ok(bodies["/v1/memory/events"][0].metadata.handoff_quality.reasons.includes("next_step_planning_advice"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

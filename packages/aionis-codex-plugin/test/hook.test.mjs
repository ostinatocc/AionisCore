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
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Stop hook still stores implementation summaries as task handoffs", async () => {
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
      turn_id: "implementation-turn",
      cwd: pluginRoot,
      last_assistant_message: "Implemented the Codex Stop hook handoff suppression fix and verified npm run -s codex-plugin:test passes.",
    }, {
      baseUrl: `http://127.0.0.1:${address.port}`,
    });
    assert.deepEqual(JSON.parse(result.stdout), {});
    assert.equal(routes.includes("/v1/handoff/store"), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

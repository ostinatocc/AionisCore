import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "..");

function startMcp() {
  const runtimeHome = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-codex-mcp-test-"));
  const child = spawn(process.execPath, ["mcp/aionis-codex-mcp.mjs"], {
    cwd: pluginRoot,
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      AIONIS_CODEX_AUTOSTART: "false",
      AIONIS_BASE_URL: "http://127.0.0.1:1",
      AIONIS_CODEX_RUNTIME_HOME: runtimeHome,
    },
  });
  let buffer = "";
  const pending = new Map();
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      const message = JSON.parse(line);
      const resolver = pending.get(message.id);
      if (resolver) {
        pending.delete(message.id);
        resolver(message);
      }
    }
  });
  return {
    child,
    request(method, params = {}) {
      const id = pending.size + 1 + Math.floor(Math.random() * 100000);
      const message = { jsonrpc: "2.0", id, method, params };
      const promise = new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`timeout waiting for ${method}`));
        }, 3000);
        pending.set(id, (response) => {
          clearTimeout(timer);
          resolve(response);
        });
      });
      child.stdin.write(`${JSON.stringify(message)}\n`);
      return promise;
    },
    close() {
      child.kill("SIGTERM");
    },
  };
}

test("MCP server initializes and exposes Aionis tools", async () => {
  const mcp = startMcp();
  try {
    const init = await mcp.request("initialize", { protocolVersion: "2024-11-05" });
    assert.equal(init.result.serverInfo.name, "aionis-runtime");
    const list = await mcp.request("tools/list");
    const names = new Set(list.result.tools.map((tool) => tool.name));
    assert.equal(names.has("aionis_context_assemble"), true);
    assert.equal(names.has("aionis_agent_resume_pack"), true);
    assert.equal(names.has("aionis_replay_run_get"), true);
    assert.equal(names.has("aionis_automation_create"), true);
    assert.equal(names.has("aionis_store_execution_outcome"), true);
    assert.equal(names.has("aionis_runtime_call"), true);
  } finally {
    mcp.close();
  }
});

test("MCP route call returns structured error content when runtime is unavailable", async () => {
  const mcp = startMcp();
  try {
    await mcp.request("initialize", { protocolVersion: "2024-11-05" });
    const response = await mcp.request("tools/call", {
      name: "aionis_health",
      arguments: {},
    });
    assert.equal(response.result.isError, true);
    assert.match(response.result.content[0].text, /Aionis Runtime/);
  } finally {
    mcp.close();
  }
});

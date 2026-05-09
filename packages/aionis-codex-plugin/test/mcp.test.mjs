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
const repoRoot = path.resolve(pluginRoot, "..", "..");

function startMcp(options = {}) {
  const runtimeHome = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-codex-mcp-test-"));
  const child = spawn(process.execPath, ["mcp/aionis-codex-mcp.mjs"], {
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

function listen(server) {
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address()));
  });
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

function walkFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, acc);
    } else if (/\.(?:mjs|js|ts|json)$/.test(entry.name)) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function extractRuntimeRoutes(files) {
  const routes = new Set();
  for (const file of files) {
    for (const route of extractRoutesFromText(fs.readFileSync(file, "utf8"))) {
      routes.add(route);
    }
  }
  return routes;
}

function extractRoutesFromText(text) {
  const routes = new Set();
  const pattern = /["'`]((?:\/health|\/v1\/)[^"'`\s$]*)["'`]/g;
  let match;
  while ((match = pattern.exec(text))) {
    routes.add(match[1].replace(/\?.*$/, ""));
  }
  return routes;
}

function readRepoFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

function extractSharedSdkRoutePaths() {
  const source = readRepoFile("packages", "full-sdk", "src", "routes.ts");
  const routes = {};
  const pattern = /^\s*([a-zA-Z0-9_]+):\s*"([^"]+)"/gm;
  let match;
  while ((match = pattern.exec(source))) {
    routes[match[1]] = match[2];
  }
  return routes;
}

function extractMcpToolPath(source, toolName) {
  const marker = `${toolName}:`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${toolName} should exist`);
  const nextTool = source.indexOf("\n  aionis_", start + marker.length);
  const block = source.slice(start, nextTool === -1 ? source.length : nextTool);
  const match = block.match(/path:\s*"([^"]+)"/);
  assert.ok(match, `${toolName} should declare a path`);
  return match[1];
}

function extractFunctionBlock(source, functionName) {
  const start = source.indexOf(functionName);
  assert.notEqual(start, -1, `${functionName} should exist`);
  const bodyStart = source.indexOf("{", start);
  assert.notEqual(bodyStart, -1, `${functionName} should have a body`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert.fail(`${functionName} body was not closed`);
}

test("MCP declared runtime routes exist in Runtime source", () => {
  const pluginRoutes = extractRuntimeRoutes(walkFiles(pluginRoot));
  const runtimeRoutes = extractRuntimeRoutes(walkFiles(path.join(repoRoot, "src")));
  const missing = [...pluginRoutes]
    .filter((route) => !runtimeRoutes.has(route))
    .sort();

  assert.deepEqual(missing, []);
});

test("MCP host-facing shared routes mirror full-sdk route constants", () => {
  const sdkRoutes = extractSharedSdkRoutePaths();
  const mcpSource = fs.readFileSync(path.join(pluginRoot, "mcp", "aionis-codex-mcp.mjs"), "utf8");

  assert.equal(extractMcpToolPath(mcpSource, "aionis_context_assemble"), sdkRoutes.contextAssemble);
  assert.equal(extractMcpToolPath(mcpSource, "aionis_planning_context"), sdkRoutes.planningContext);
  assert.equal(extractMcpToolPath(mcpSource, "aionis_action_retrieval"), sdkRoutes.actionRetrieval);
  assert.equal(extractMcpToolPath(mcpSource, "aionis_kickoff_recommendation"), sdkRoutes.kickoffRecommendation);
  assert.equal(extractMcpToolPath(mcpSource, "aionis_execution_introspect"), sdkRoutes.executionIntrospect);
  assert.equal(extractMcpToolPath(mcpSource, "aionis_workflow_contract"), sdkRoutes.executionIntrospect);
  assert.equal(extractMcpToolPath(mcpSource, "aionis_agent_inspect"), sdkRoutes.agentInspect);
  assert.equal(extractMcpToolPath(mcpSource, "aionis_tools_select"), sdkRoutes.toolsSelect);
  assert.equal(extractMcpToolPath(mcpSource, "aionis_tools_feedback"), sdkRoutes.toolsFeedback);
  assert.equal(extractMcpToolPath(mcpSource, "aionis_memory_anchors_rehydrate_payload"), sdkRoutes.anchorsRehydratePayload);
});

test("MCP execution outcome helper covers the full-sdk execution outcome route contract", () => {
  const sdkContractSource = readRepoFile("packages", "full-sdk", "src", "host-api-contract.ts");
  const storeExecutionOutcomeSection = sdkContractSource.slice(
    sdkContractSource.indexOf('sdk_method: "memory.storeExecutionOutcome"'),
    sdkContractSource.indexOf('sdk_method: "memory.retrieveWorkflowContract"'),
  );
  const requiredRoutes = extractRoutesFromText(storeExecutionOutcomeSection);
  const mcpSource = fs.readFileSync(path.join(pluginRoot, "mcp", "aionis-codex-mcp.mjs"), "utf8");
  const implementationRoutes = extractRoutesFromText(extractFunctionBlock(mcpSource, "async function storeExecutionOutcome"));
  const missing = [...requiredRoutes].filter((route) => !implementationRoutes.has(route)).sort();

  assert.deepEqual(missing, []);
});

test("MCP store execution outcome can compile and simulate a playbook", async () => {
  const routes = [];
  const server = http.createServer((req, res) => {
    routes.push(req.url);
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" });
      if (req.url === "/health") {
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      if (req.url === "/v1/memory/replay/run/start") {
        res.end(JSON.stringify({ run_id: "run-1" }));
        return;
      }
      if (req.url === "/v1/memory/replay/step/before") {
        res.end(JSON.stringify({ step_id: "step-1" }));
        return;
      }
      if (req.url === "/v1/memory/replay/playbooks/compile_from_run") {
        res.end(JSON.stringify({ playbook_id: "playbook-1" }));
        return;
      }
      res.end(JSON.stringify({ ok: true }));
    });
  });
  const address = await listen(server);
  const mcp = startMcp({ baseUrl: `http://127.0.0.1:${address.port}` });
  try {
    await mcp.request("initialize", { protocolVersion: "2024-11-05" });
    const response = await mcp.request("tools/call", {
      name: "aionis_store_execution_outcome",
      arguments: {
        goal: "verify execution outcome facade parity",
        status: "success",
        summary: "mock execution stored",
        compile_playbook: true,
        simulate_playbook: true,
        steps: [
          {
            tool_name: "mock_tool",
            tool_input: { ok: true },
            status: "success",
            output_signature: { ok: true },
          },
        ],
      },
    });
    assert.equal(response.result.isError, false);
    assert.match(response.result.content[0].text, /"playbook_simulation"/);
    assert.deepEqual(routes, [
      "/health",
      "/v1/memory/replay/run/start",
      "/v1/memory/replay/step/before",
      "/v1/memory/replay/step/after",
      "/v1/memory/replay/run/end",
      "/v1/memory/replay/playbooks/compile_from_run",
      "/v1/memory/replay/playbooks/run",
    ]);
  } finally {
    mcp.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

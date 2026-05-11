import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveConfig, runtimePost, sha12 } from "../lib/aionis-codex-runtime.mjs";

function listen(server) {
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address()));
  });
}

test("runtimePost classifies request timeouts with actionable metadata", async () => {
  const server = http.createServer((_req, res) => {
    setTimeout(() => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
    }, 250);
  });
  const address = await listen(server);
  try {
    await assert.rejects(
      () => runtimePost({
        baseUrl: `http://127.0.0.1:${address.port}`,
        timeoutMs: 50,
        headers: {},
      }, "/v1/memory/context/assemble", { query_text: "slow" }),
      (error) => {
        assert.equal(error.code, "runtime_request_timeout");
        assert.equal(error.category, "timeout");
        assert.equal(error.method, "POST");
        assert.equal(error.routePath, "/v1/memory/context/assemble");
        assert.equal(error.timeoutMs, 50);
        assert.equal(error.aionis_runtime_error.code, "runtime_request_timeout");
        assert.equal(error.aionis_runtime_error.category, "timeout");
        assert.equal(error.aionis_runtime_error.route_path, "/v1/memory/context/assemble");
        assert.equal(typeof error.aionis_runtime_error.duration_ms, "number");
        assert.match(error.aionis_runtime_error.message, /timed out after 50ms/);
        return true;
      },
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("runtimePost classifies invalid JSON responses", async () => {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end("not-json");
  });
  const address = await listen(server);
  try {
    await assert.rejects(
      () => runtimePost({
        baseUrl: `http://127.0.0.1:${address.port}`,
        timeoutMs: 1000,
        headers: {},
      }, "/health", {}),
      (error) => {
        assert.equal(error.code, "runtime_response_parse_error");
        assert.equal(error.category, "response_parse");
        assert.equal(error.method, "POST");
        assert.equal(error.routePath, "/health");
        assert.equal(error.aionis_runtime_error.route_path, "/health");
        return true;
      },
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("resolveConfig canonicalizes explicit workspace cwd before deriving scope", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-codex-canonical-cwd-"));
  const realWorkspace = path.join(root, "workspace");
  const linkedWorkspace = path.join(root, "linked-workspace");
  fs.mkdirSync(realWorkspace, { recursive: true });
  fs.symlinkSync(realWorkspace, linkedWorkspace, "dir");
  const expectedCwd = fs.realpathSync.native
    ? fs.realpathSync.native(realWorkspace)
    : fs.realpathSync(realWorkspace);
  const previousScope = process.env.AIONIS_CODEX_SCOPE;
  const previousCodeCwd = process.env.CODEX_CWD;
  try {
    delete process.env.AIONIS_CODEX_SCOPE;
    delete process.env.CODEX_CWD;
    const config = resolveConfig({ cwd: linkedWorkspace });
    assert.equal(config.cwd, expectedCwd);
    assert.equal(config.projectName, "workspace");
    assert.equal(config.projectHash, sha12(expectedCwd).slice(0, 8));
    assert.equal(config.scope, `codex:workspace:${sha12(expectedCwd).slice(0, 8)}`);
  } finally {
    if (previousScope === undefined) delete process.env.AIONIS_CODEX_SCOPE;
    else process.env.AIONIS_CODEX_SCOPE = previousScope;
    if (previousCodeCwd === undefined) delete process.env.CODEX_CWD;
    else process.env.CODEX_CWD = previousCodeCwd;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

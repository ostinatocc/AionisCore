import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { runtimePost } from "../lib/aionis-codex-runtime.mjs";

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

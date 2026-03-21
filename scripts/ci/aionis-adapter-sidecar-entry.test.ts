import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { AddressInfo } from "node:net";
import { spawn } from "node:child_process";

async function withJsonServer(
  handler: (req: { url: string; body: any }) => any | Promise<any>,
  run: (baseUrl: string) => Promise<void>,
) {
  const server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const raw = Buffer.concat(chunks).toString("utf8");
    const body = raw ? JSON.parse(raw) : null;
    const payload = await handler({ url: req.url ?? "", body });
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(payload));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("sidecar entrypoint starts and handles one request over stdin", async () => {
  await withJsonServer(
    ({ url }) => {
      if (url !== "/v1/memory/planning/context") throw new Error(`unexpected url ${url}`);
      return {
        tenant_id: "default",
        scope: "default",
        planner_packet: { sections: { recommended_workflows: [], candidate_workflows: [] } },
        workflow_signals: [],
        pattern_signals: [],
        planning_summary: { planner_explanation: null, trusted_pattern_count: 0, contested_pattern_count: 0 },
        execution_kernel: {},
      };
    },
    async (baseUrl) => {
      const child = spawn("npx", ["tsx", "src/adapter/aionis-adapter-sidecar.ts"], {
        cwd: "/Volumes/ziel/Aionisgo",
        env: {
          ...process.env,
          AIONIS_BASE_URL: baseUrl,
          AIONIS_SCOPE: "default",
        },
        stdio: ["pipe", "pipe", "pipe"],
      });

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      child.stdout.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
      child.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));

      child.stdin.write(JSON.stringify({
        request_id: "r1",
        event: {
          event_type: "task_started",
          task_id: "task-1",
          query_text: "repair export failure",
          context: { task_kind: "repair_export" },
        },
      }));
      child.stdin.end();

      const exitCode = await new Promise<number>((resolve, reject) => {
        child.on("error", reject);
        child.on("close", (code) => resolve(code ?? 0));
      });

      assert.equal(exitCode, 0, Buffer.concat(stderrChunks).toString("utf8"));
      const output = Buffer.concat(stdoutChunks).toString("utf8").trim();
      const parsed = JSON.parse(output);
      assert.equal(parsed.ok, true);
      assert.equal(parsed.request_id, "r1");
      assert.equal(parsed.event_type, "task_started");
    },
  );
});

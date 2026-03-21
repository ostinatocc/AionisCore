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

test("wrapper entrypoint runs one command-backed task loop over stdin", async () => {
  const calls: string[] = [];
  await withJsonServer(
    ({ url }) => {
      calls.push(url);
      if (url === "/v1/memory/planning/context") {
        return {
          tenant_id: "default",
          scope: "default",
          planner_packet: { sections: { recommended_workflows: [], candidate_workflows: [] } },
          workflow_signals: [],
          pattern_signals: [],
          planning_summary: { planner_explanation: null, trusted_pattern_count: 0, contested_pattern_count: 0 },
          execution_kernel: {},
        };
      }
      if (url === "/v1/memory/tools/select") {
        return {
          tenant_id: "default",
          scope: "default",
          selection: { selected: "bash", ordered: ["bash", "test"], preferred: ["bash"] },
          decision: { decision_id: "decision-1", decision_uri: "aionis://decision-1", run_id: "task-1" },
          selection_summary: {
            provenance_explanation: "candidate workflows visible but not yet promoted",
            used_trusted_pattern_tools: [],
            used_trusted_pattern_affinity_levels: [],
          },
        };
      }
      if (url === "/v1/memory/tools/feedback") {
        return { pattern_anchor: { credibility_state: "candidate" } };
      }
      if (url === "/v1/memory/execution/introspect") {
        return {
          tenant_id: "default",
          scope: "default",
          pattern_signal_summary: { candidate_pattern_count: 1, trusted_pattern_count: 0, contested_pattern_count: 0 },
          workflow_signal_summary: { stable_workflow_count: 0, promotion_ready_workflow_count: 0, observing_workflow_count: 0 },
        };
      }
      throw new Error(`unexpected url ${url}`);
    },
    async (baseUrl) => {
      const child = spawn("npx", ["tsx", "src/adapter/aionis-adapter-wrapper.ts"], {
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
        task: {
          task_id: "task-1",
          query_text: "repair export failure in node tests",
          context: { task_kind: "repair_export" },
          tool_candidates: ["bash", "test"],
        },
        step: {
          step_id: "step-1",
          selected_tool: "bash",
          command: process.execPath,
          args: ["-e", "process.exit(0)"],
          candidates: ["bash", "test"],
          context: { task_kind: "repair_export" },
          note: "run command-backed wrapper loop",
        },
        finalization: {
          outcome: "completed",
          note: "task completed after wrapper loop",
        },
        introspect: {
          limit: 5,
        },
      }));
      child.stdin.end();

      const exitCode = await new Promise<number>((resolve, reject) => {
        child.on("error", reject);
        child.on("close", (code) => resolve(code ?? 0));
      });

      assert.equal(exitCode, 0, Buffer.concat(stderrChunks).toString("utf8"));
      const parsed = JSON.parse(Buffer.concat(stdoutChunks).toString("utf8").trim());
      assert.equal(parsed.ok, true);
      assert.equal(parsed.result.execution.exit_code, 0);
      assert.equal(parsed.result.feedback.ok, true);
      assert.equal(parsed.result.finalization.ok, true);
      assert.equal(parsed.result.introspection.ok, true);
    },
  );

  assert.deepEqual(calls, [
    "/v1/memory/planning/context",
    "/v1/memory/tools/select",
    "/v1/memory/tools/feedback",
    "/v1/memory/tools/feedback",
    "/v1/memory/execution/introspect",
  ]);
});

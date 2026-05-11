import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(packageDir, "dist", "bin", "aionis-runtime.mjs");

function safeSnapshotName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "project";
}

function spawnCli(args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

test("runtime cli prints help", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /aionis-runtime start/);
  assert.match(result.stdout, /aionis-runtime codex install/);
});

test("runtime cli prints package version", () => {
  const result = spawnSync(process.execPath, [cliPath, "--version"], {
    encoding: "utf8",
  });
  const packageJson = JSON.parse(readFileSync(path.join(packageDir, "package.json"), "utf8"));

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), packageJson.version);
});

test("runtime cli prints standalone lite defaults", () => {
  const cwd = path.join(packageDir, ".tmp", "consumer-cwd");
  mkdirSync(cwd, { recursive: true });
  const result = spawnSync(process.execPath, [cliPath, "start", "--print-env"], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      LITE_SANDBOX_PROFILE: "local_process_echo",
    },
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);

  assert.equal(parsed.AIONIS_EDITION, "lite");
  assert.equal(parsed.AIONIS_MODE, "local");
  assert.equal(parsed.APP_ENV, "dev");
  assert.equal(parsed.AIONIS_LISTEN_HOST, "127.0.0.1");
  assert.equal(parsed.MEMORY_AUTH_MODE, "off");
  assert.equal(parsed.TENANT_QUOTA_ENABLED, "false");
  assert.equal(parsed.RATE_LIMIT_BYPASS_LOOPBACK, "true");
  assert.equal(parsed.LITE_INSPECTOR_ENABLED, "false");
  assert.equal(parsed.SANDBOX_ENABLED, "true");
  assert.equal(parsed.SANDBOX_EXECUTOR_MODE, "local_process");
  assert.equal(parsed.SANDBOX_ALLOWED_COMMANDS_JSON, "[\"echo\"]");
  assert.equal(
    parsed.LITE_REPLAY_SQLITE_PATH,
    path.join(cwd, ".tmp", "aionis-lite-replay.sqlite"),
  );
  assert.equal(
    parsed.LITE_WRITE_SQLITE_PATH,
    path.join(cwd, ".tmp", "aionis-lite-write.sqlite"),
  );
});

test("runtime cli resolves tsx through the public package export", () => {
  const source = readFileSync(path.join(packageDir, "src", "cli.mjs"), "utf8");

  assert.match(source, /require\.resolve\("tsx\/cli"\)/);
  assert.doesNotMatch(source, /tsx\/dist\/cli\.mjs/);
});

test("runtime cli starts the executable runtime entrypoint", () => {
  const source = readFileSync(path.join(packageDir, "src", "cli.mjs"), "utf8");

  assert.match(source, /src", "index\.ts"/);
  assert.doesNotMatch(source, /src", "runtime-entry\.ts"/);
});

test("runtime cli bundles and installs the Codex plugin into a stable home directory", () => {
  const home = mkdtempSync(path.join(os.tmpdir(), "aionis-codex-home-"));
  const runtimeHome = path.join(home, ".aionis", "codex");
  const env = {
    ...process.env,
    HOME: home,
    AIONIS_CODEX_RUNTIME_HOME: runtimeHome,
  };

  assert.ok(existsSync(path.join(packageDir, "dist", "codex-plugin", ".codex-plugin", "plugin.json")));

  const install = spawnSync(process.execPath, [cliPath, "codex", "install", "--no-watchdog", "--skip-doctor"], {
    encoding: "utf8",
    env,
  });
  assert.equal(install.status, 0, install.stderr);
  assert.match(install.stdout, /Aionis Codex plugin materialized/);

  const pluginDir = path.join(runtimeHome, "plugin");
  const pluginCacheDir = path.join(home, ".codex", "plugins", "cache", "local", "aionis-codex", "0.1.0");
  assert.ok(existsSync(path.join(pluginDir, ".codex-plugin", "plugin.json")));
  assert.ok(existsSync(path.join(pluginCacheDir, "hooks.json")));
  assert.ok(existsSync(path.join(pluginCacheDir, "skills", "aionis-runtime", "SKILL.md")));
  assert.ok(existsSync(path.join(home, "plugins", "aionis-codex")));
  const codexConfig = readFileSync(path.join(home, ".codex", "config.toml"), "utf8");
  assert.match(codexConfig, /codex_hooks = true/);
  assert.match(codexConfig, /\[hooks\]/);
  assert.match(codexConfig, /UserPromptSubmit\s*=/);
  assert.match(codexConfig, /PostToolUse\s*=/);
  assert.match(codexConfig, /aionis-codex-hook\.mjs/);
  assert.match(readFileSync(path.join(home, ".agents", "plugins", "marketplace.json"), "utf8"), /aionis-codex/);

  const sessionId = "status-session";
  const turnId = "status-turn";
  mkdirSync(path.join(runtimeHome, "state", "sessions"), { recursive: true });
  writeFileSync(path.join(runtimeHome, "state", "active-project.json"), JSON.stringify({
    cwd: packageDir,
    project_name: "aionis-runtime",
    project_hash: "testhash",
    scope: "codex:aionis-runtime:testhash",
    global_scope: "codex:global",
    tenant_id: "local-codex",
    updated_at: new Date().toISOString(),
  }));
  writeFileSync(path.join(runtimeHome, "state", "sessions", `${sessionId}.json`), JSON.stringify({
    session_id: sessionId,
    active_turn_id: turnId,
    active_run_id: "status-run",
    turns: {
      [turnId]: {
        turn_id: turnId,
        run_id: "status-run",
        prompt: "Check Aionis Codex status.",
      },
    },
    steps: {
      "status-step": {
        step_id: "status-step",
        run_id: "status-run",
      },
    },
    updated_at: new Date().toISOString(),
  }));

  const status = spawnSync(process.execPath, [cliPath, "codex", "status", "--no-runtime", "--no-watchdog"], {
    cwd: packageDir,
    encoding: "utf8",
    env,
  });
  assert.equal(status.status, 0, `${status.stdout}\n${status.stderr}`);
  assert.match(status.stdout, /project - codex:aionis-runtime:testhash/);
  assert.match(status.stdout, /active_project - MATCH/);
  assert.match(status.stdout, /session - status-session turns=1 steps=1/);
  assert.match(status.stdout, /latest_prompt - Check Aionis Codex status\./);
  assert.match(status.stdout, /PASS installed plugin/);
  assert.match(status.stdout, /PASS Codex plugin symlink/);
  assert.match(status.stdout, /PASS managed hooks/);

  const jsonStatus = spawnSync(process.execPath, [cliPath, "codex", "status", "--json", "--no-runtime", "--no-watchdog"], {
    cwd: packageDir,
    encoding: "utf8",
    env,
  });
  assert.equal(jsonStatus.status, 0, `${jsonStatus.stdout}\n${jsonStatus.stderr}`);
  const parsed = JSON.parse(jsonStatus.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.runtime_home, runtimeHome);
  assert.equal(parsed.plugin_dir, pluginDir);
  assert.equal(parsed.project.cwd, packageDir);
  assert.equal(parsed.project.scope, "codex:aionis-runtime:testhash");
  assert.equal(parsed.project.active_matches_cwd, true);
  assert.equal(parsed.session.session_id, sessionId);
  assert.equal(parsed.session.turn_count, 1);
  assert.equal(parsed.session.step_count, 1);
  assert.deepEqual(parsed.warnings, []);
  assert.ok(parsed.checks.some((check) => check.name === "installed plugin" && check.ok));
  assert.ok(parsed.checks.some((check) => check.name === "managed hooks" && check.ok));

  writeFileSync(path.join(runtimeHome, "state", "watchdog-status.json"), JSON.stringify({
    ok: true,
    health: {
      ok: true,
      runtime: {
        edition: "lite",
      },
    },
    updated_at: new Date().toISOString(),
  }));
  const sandboxLikeStatus = spawnSync(process.execPath, [cliPath, "codex", "status", "--json", "--no-watchdog"], {
    cwd: packageDir,
    encoding: "utf8",
    env: {
      ...env,
      AIONIS_CODEX_BASE_URL: "http://127.0.0.1:9",
    },
  });
  assert.equal(sandboxLikeStatus.status, 0, `${sandboxLikeStatus.stdout}\n${sandboxLikeStatus.stderr}`);
  const sandboxLikeParsed = JSON.parse(sandboxLikeStatus.stdout);
  assert.equal(sandboxLikeParsed.ok, true);
  assert.match(
    sandboxLikeParsed.checks.find((check) => check.name === "runtime health").details,
    /via watchdog status/,
  );
});

test("runtime cli audits local Codex state without Runtime", () => {
  const home = mkdtempSync(path.join(os.tmpdir(), "aionis-codex-audit-home-"));
  const runtimeHome = path.join(home, ".aionis", "codex");
  const sessionId = "audit-session";
  const turnId = "audit-turn";
  const runId = "audit-run";
  const env = {
    ...process.env,
    HOME: home,
    AIONIS_CODEX_RUNTIME_HOME: runtimeHome,
  };

  mkdirSync(path.join(runtimeHome, "state", "sessions"), { recursive: true });
  writeFileSync(path.join(runtimeHome, "state", "active-project.json"), JSON.stringify({
    cwd: packageDir,
    project_name: "aionis-runtime",
    project_hash: "testhash",
    scope: "codex:aionis-runtime:testhash",
    global_scope: "codex:global",
    tenant_id: "local-codex",
    updated_at: new Date().toISOString(),
  }));
  writeFileSync(path.join(runtimeHome, "state", "sessions", `${sessionId}.json`), JSON.stringify({
    session_id: sessionId,
    active_turn_id: turnId,
    active_run_id: runId,
    turns: {
      [turnId]: {
        turn_id: turnId,
        run_id: runId,
        prompt: "Audit the Aionis Codex context quality.",
      },
    },
    steps: {
      "step-1": {
        step_id: "step-1",
        run_id: runId,
        tool_name: "Bash",
      },
    },
    updated_at: new Date().toISOString(),
  }));

  const audit = spawnSync(process.execPath, [cliPath, "codex", "audit", "--json", "--no-runtime", "--session", sessionId], {
    cwd: packageDir,
    encoding: "utf8",
    env,
  });
  assert.equal(audit.status, 0, `${audit.stdout}\n${audit.stderr}`);
  const parsed = JSON.parse(audit.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.runtime.skipped, true);
  assert.equal(parsed.project.scope, "codex:aionis-runtime:testhash");
  assert.equal(parsed.session.session_id, sessionId);
  assert.equal(parsed.session.active_turn_id, turnId);
  assert.equal(parsed.session.step_count, 1);
  assert.match(parsed.session.latest_prompt, /Audit the Aionis Codex context quality/);
  assert.deepEqual(parsed.remediations, []);
});

test("runtime cli audit reports actionable Runtime timeout diagnostics", async () => {
  const home = mkdtempSync(path.join(os.tmpdir(), "aionis-codex-audit-timeout-home-"));
  const runtimeHome = path.join(home, ".aionis", "codex");
  const sessionId = "audit-timeout-session";
  const turnId = "audit-timeout-turn";

  mkdirSync(path.join(runtimeHome, "state", "sessions"), { recursive: true });
  writeFileSync(path.join(runtimeHome, "state", "active-project.json"), JSON.stringify({
    cwd: packageDir,
    project_name: "aionis-runtime",
    project_hash: "testhash",
    scope: "codex:aionis-runtime:testhash",
    global_scope: "codex:global",
    tenant_id: "local-codex",
    updated_at: new Date().toISOString(),
  }));
  writeFileSync(path.join(runtimeHome, "state", "sessions", `${sessionId}.json`), JSON.stringify({
    session_id: sessionId,
    active_turn_id: turnId,
    turns: {
      [turnId]: {
        turn_id: turnId,
        run_id: "audit-timeout-run",
        prompt: "Audit should explain timeout failures.",
      },
    },
    steps: {},
    updated_at: new Date().toISOString(),
  }));

  const server = createServer((req, res) => {
    if (req.url === "/health") {
      setTimeout(() => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      }, 200);
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    const audit = await spawnCli(["codex", "audit", "--json", "--session", sessionId], {
      cwd: packageDir,
      env: {
        ...process.env,
        HOME: home,
        AIONIS_CODEX_RUNTIME_HOME: runtimeHome,
        AIONIS_CODEX_BASE_URL: `http://127.0.0.1:${address.port}`,
        AIONIS_CODEX_AUDIT_TIMEOUT_MS: "25",
      },
    });
    assert.equal(audit.status, 0, `${audit.stdout}\n${audit.stderr}`);
    const parsed = JSON.parse(audit.stdout);

    assert.equal(parsed.runtime.ok, false);
    assert.equal(parsed.runtime.error, "GET /health timed out after 25ms");
    assert.ok(parsed.warnings.includes("runtime unavailable: GET /health timed out after 25ms"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("runtime cli audit gives handoff lookup more time than fast health checks", async () => {
  const home = mkdtempSync(path.join(os.tmpdir(), "aionis-codex-audit-find-timeout-home-"));
  const runtimeHome = path.join(home, ".aionis", "codex");
  const sessionId = "audit-slow-find-session";
  const turnId = "audit-slow-find-turn";

  mkdirSync(path.join(runtimeHome, "state", "sessions"), { recursive: true });
  writeFileSync(path.join(runtimeHome, "state", "active-project.json"), JSON.stringify({
    cwd: packageDir,
    project_name: "aionis-runtime",
    project_hash: "testhash",
    scope: "codex:aionis-runtime:testhash",
    global_scope: "codex:global",
    tenant_id: "local-codex",
    updated_at: new Date().toISOString(),
  }));
  writeFileSync(path.join(runtimeHome, "state", "sessions", `${sessionId}.json`), JSON.stringify({
    session_id: sessionId,
    active_turn_id: turnId,
    turns: {
      [turnId]: {
        turn_id: turnId,
        run_id: "audit-slow-find-run",
        prompt: "Audit should tolerate slower handoff lookup.",
      },
    },
    steps: {},
    updated_at: new Date().toISOString(),
  }));

  const server = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.url?.startsWith(`/v1/memory/sessions/${sessionId}/events`)) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ events: [] }));
      return;
    }
    if (req.url === "/v1/memory/find") {
      req.resume();
      req.on("end", () => {
        setTimeout(() => {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({
            nodes: [
              {
                uri: "aionis://local-codex/test/slow-handoff",
                text_summary: "确认发布成功，0.2.16 闭环成立。npm latest：@ostinato/aionis-runtime@0.2.16。干净 npx 拉取：返回 0.2.16。",
                slots: {
                  handoff_text: "确认发布成功，0.2.16 闭环成立。",
                  execution_result_summary: {
                    handoff_quality: {
                      store_handoff: true,
                      category: "release_outcome",
                      confidence: 0.95,
                      reasons: ["release_completion_signal"],
                    },
                    release_outcome: true,
                    version: "0.2.16",
                  },
                },
              },
            ],
          }));
        }, 3300);
      });
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    const audit = await spawnCli(["codex", "audit", "--json", "--session", sessionId], {
      cwd: packageDir,
      env: {
        ...process.env,
        HOME: home,
        AIONIS_CODEX_RUNTIME_HOME: runtimeHome,
        AIONIS_CODEX_BASE_URL: `http://127.0.0.1:${address.port}`,
      },
    });
    assert.equal(audit.status, 0, `${audit.stdout}\n${audit.stderr}`);
    const parsed = JSON.parse(audit.stdout);

    assert.equal(parsed.runtime.ok, true);
    assert.equal(parsed.runtime.error, null);
    assert.equal(parsed.handoffs.length, 1);
    assert.equal(parsed.handoffs[0].handoff_quality.category, "release_outcome");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("runtime cli audit emits a context quality report for a healthy handoff mix", async () => {
  const home = mkdtempSync(path.join(os.tmpdir(), "aionis-codex-audit-quality-home-"));
  const runtimeHome = path.join(home, ".aionis", "codex");
  const sessionId = "audit-quality-session";
  const turnId = "audit-quality-turn";
  const runId = "audit-quality-run";

  mkdirSync(path.join(runtimeHome, "state", "sessions"), { recursive: true });
  writeFileSync(path.join(runtimeHome, "state", "active-project.json"), JSON.stringify({
    cwd: packageDir,
    project_name: "aionis-runtime",
    project_hash: "testhash",
    scope: "codex:aionis-runtime:testhash",
    global_scope: "codex:global",
    tenant_id: "local-codex",
    consumer_agent_id: "codex",
    consumer_team_id: "local-codex",
    updated_at: new Date().toISOString(),
  }));
  writeFileSync(path.join(runtimeHome, "state", "sessions", `${sessionId}.json`), JSON.stringify({
    session_id: sessionId,
    active_turn_id: turnId,
    active_run_id: runId,
    turns: {
      [turnId]: {
        turn_id: turnId,
        run_id: runId,
        prompt: "Audit healthy context quality.",
      },
    },
    steps: {},
    updated_at: new Date().toISOString(),
  }));

  const executionQuality = {
    store_handoff: true,
    category: "execution_outcome",
    confidence: 0.82,
    reasons: ["task_handoff_evidence"],
  };
  const releaseQuality = {
    store_handoff: true,
    category: "release_outcome",
    confidence: 0.95,
    reasons: ["release_version", "release_completion_signal", "external_release_surface"],
  };
  const oldLongSummary = [
    "Implemented an older broad context-quality pass and verified runtime test coverage.",
    ...Array.from({ length: 28 }, (_, index) =>
      `Historical detail ${index + 1}: this older handoff is intentionally verbose but should not count as current task-start context.`
    ),
  ].join(" ");
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    res.setHeader("content-type", "application/json");
    if (req.method === "GET" && url.pathname === "/health") {
      res.end(JSON.stringify({ ok: true, runtime: { edition: "lite" } }));
      return;
    }
    if (req.method === "GET" && url.pathname === `/v1/memory/sessions/${sessionId}/events`) {
      res.end(JSON.stringify({
        events: [
          {
            title: "Codex turn ended",
            created_at: new Date().toISOString(),
            text_summary: "继续推进完了，修复 context quality report。验证：runtime test 12 pass，pack dry-run 通过。",
            slots: {
              phase: "Stop",
              turn_id: turnId,
              run_id: runId,
              handoff_quality: executionQuality,
            },
          },
        ],
      }));
      return;
    }
    if (req.method === "POST" && url.pathname === "/v1/memory/find") {
      req.resume();
      req.on("end", () => {
        res.end(JSON.stringify({
          nodes: [
            {
              uri: "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/execution",
              created_at: "2026-05-10T18:20:00.000Z",
              text_summary: "继续推进完了，修复 context quality report。验证：runtime test 12 pass，pack dry-run 通过。",
              slots: {
                execution_result_summary: {
                  handoff_quality: executionQuality,
                },
              },
            },
            {
              uri: "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/release",
              created_at: "2026-05-10T18:10:00.000Z",
              text_summary: "0.2.17 发布闭环确认完成。npm latest：@ostinato/aionis-runtime@0.2.17。干净 npx 返回 0.2.17。",
              slots: {
                execution_result_summary: {
                  handoff_quality: releaseQuality,
                  release_outcome: true,
                  version: "0.2.17",
                },
              },
            },
            {
              uri: "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/old-long-execution",
              created_at: "2026-05-10T18:00:00.000Z",
              text_summary: oldLongSummary,
              slots: {
                execution_result_summary: {
                  handoff_quality: executionQuality,
                },
              },
            },
          ],
        }));
      });
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "not found" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    const env = {
      ...process.env,
      HOME: home,
      AIONIS_CODEX_RUNTIME_HOME: runtimeHome,
      AIONIS_CODEX_BASE_URL: `http://127.0.0.1:${address.port}`,
    };
    const audit = await spawnCli(["codex", "audit", "--json", "--session", sessionId, "--limit", "4"], {
      cwd: packageDir,
      env,
    });
    assert.equal(audit.status, 0, `${audit.stdout}\n${audit.stderr}`);
    const parsed = JSON.parse(audit.stdout);

    assert.equal(parsed.context_quality_report.status, "pass");
    assert.equal(parsed.context_quality_report.score, 100);
    assert.equal(parsed.context_quality_report.current_context.status, "pass");
    assert.equal(parsed.context_quality_report.historical_debt.status, "pass");
    assert.equal(parsed.context_quality_report.latest.task_handoff.uri, "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/execution");
    assert.equal(parsed.context_quality_report.latest.release_outcome.uri, "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/release");
    assert.equal(parsed.context_quality_report.counts.visible_task_handoffs, 2);
    assert.equal(parsed.context_quality_report.counts.visible_release_outcomes, 1);
    assert.equal(parsed.context_quality_report.counts.oversized_visible, 0);
    assert.deepEqual(parsed.context_quality_report.issues, []);

    const textAudit = await spawnCli(["codex", "audit", "--session", sessionId, "--limit", "4"], {
      cwd: packageDir,
      env,
    });
    assert.equal(textAudit.status, 0, `${textAudit.stdout}\n${textAudit.stderr}`);
    assert.match(textAudit.stdout, /Context Quality Report - PASS score=100/);
    assert.match(textAudit.stdout, /PASS visible_task_handoff/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("runtime cli audit includes local snapshot handoffs ahead of stale runtime handoffs", async () => {
  const home = mkdtempSync(path.join(os.tmpdir(), "aionis-codex-audit-snapshot-home-"));
  const runtimeHome = path.join(home, ".aionis", "codex");
  const sessionId = "audit-snapshot-session";
  const turnId = "audit-snapshot-turn";
  const runId = "audit-snapshot-run";
  const scope = "codex:aionis-runtime:testhash";
  const executionQuality = {
    store_handoff: true,
    category: "execution_outcome",
    confidence: 0.92,
    reasons: ["task_handoff_evidence"],
  };

  mkdirSync(path.join(runtimeHome, "state", "sessions"), { recursive: true });
  mkdirSync(path.join(runtimeHome, "state", "project-context"), { recursive: true });
  writeFileSync(path.join(runtimeHome, "state", "active-project.json"), JSON.stringify({
    cwd: packageDir,
    project_name: "aionis-runtime",
    project_hash: "testhash",
    scope,
    global_scope: "codex:global",
    tenant_id: "local-codex",
    updated_at: new Date().toISOString(),
  }));
  writeFileSync(path.join(runtimeHome, "state", "sessions", `${sessionId}.json`), JSON.stringify({
    session_id: sessionId,
    active_turn_id: turnId,
    active_run_id: runId,
    turns: {
      [turnId]: {
        turn_id: turnId,
        run_id: runId,
        prompt: "Continue from the latest local snapshot.",
      },
    },
    steps: {},
    updated_at: new Date().toISOString(),
  }));
  writeFileSync(path.join(runtimeHome, "state", "project-context", `${safeSnapshotName(scope)}.json`), JSON.stringify({
    version: 1,
    cwd: packageDir,
    project_name: "aionis-runtime",
    project_hash: "testhash",
    scope,
    tenant_id: "local-codex",
    created_at: "2026-05-10T00:00:00.000Z",
    updated_at: "2026-05-11T16:52:29.717Z",
    project_handoff_fast: {
      snapshot_source: "stop_hook",
      snapshot_captured_at: "2026-05-11T16:52:29.717Z",
      nodes: [
        {
          uri: "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/snapshot/latest-task",
          summary: "Task 9 已闭环，Runtime restart 和 Codex watchdog 验证通过。测试：56 pass，20 pass，pack dry-run pass。",
          text_summary: "Task 9 已闭环，Runtime restart 和 Codex watchdog 验证通过。测试：56 pass，20 pass，pack dry-run pass。",
          slots: {
            next_action: "Continue with Task 10 product verdict.",
            execution_result_summary: {
              handoff_quality: executionQuality,
            },
          },
        },
      ],
    },
  }));

  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    res.setHeader("content-type", "application/json");
    if (req.method === "GET" && url.pathname === "/health") {
      res.end(JSON.stringify({ ok: true, runtime: { edition: "lite" } }));
      return;
    }
    if (req.method === "GET" && url.pathname === `/v1/memory/sessions/${sessionId}/events`) {
      res.end(JSON.stringify({ events: [] }));
      return;
    }
    if (req.method === "POST" && url.pathname === "/v1/memory/find") {
      req.resume();
      req.on("end", () => {
        res.end(JSON.stringify({
          nodes: [
            {
              uri: "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/stale-task",
              created_at: "2026-05-11T14:24:01.446Z",
              text_summary: "Task 8 已推进完并提交。验证：fresh install pass。",
              slots: {
                execution_result_summary: {
                  handoff_quality: executionQuality,
                },
              },
            },
          ],
        }));
      });
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "not found" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    const audit = await spawnCli(["codex", "audit", "--json", "--session", sessionId, "--limit", "4"], {
      cwd: packageDir,
      env: {
        ...process.env,
        HOME: home,
        AIONIS_CODEX_RUNTIME_HOME: runtimeHome,
        AIONIS_CODEX_BASE_URL: `http://127.0.0.1:${address.port}`,
      },
    });
    assert.equal(audit.status, 0, `${audit.stdout}\n${audit.stderr}`);
    const parsed = JSON.parse(audit.stdout);

    assert.equal(parsed.context_quality_report.status, "pass");
    assert.equal(parsed.context_quality_report.latest.task_handoff.uri, "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/snapshot/latest-task");
    assert.equal(parsed.context_quality_report.latest.task_handoff.source, "local_snapshot");
    assert.equal(parsed.context_quality_report.latest.task_handoff.snapshot_source, "stop_hook");
    assert.equal(parsed.context_quality_report.counts.local_snapshot_handoffs, 1);
    assert.equal(parsed.context_quality_report.counts.stored_handoffs, 1);
    assert.equal(parsed.handoffs[0].source, "local_snapshot");
    assert.equal(parsed.handoffs[1].source, "runtime");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("runtime cli audit separates current context quality from historical debt", async () => {
  const home = mkdtempSync(path.join(os.tmpdir(), "aionis-codex-audit-debt-home-"));
  const runtimeHome = path.join(home, ".aionis", "codex");
  const sessionId = "audit-debt-session";
  const turnId = "audit-debt-turn";
  const runId = "audit-debt-run";
  const taskQuality = {
    store_handoff: true,
    category: "execution_outcome",
    confidence: 0.92,
    reasons: ["explicit_cli_handoff", "task_handoff_evidence"],
  };
  const releaseQuality = {
    store_handoff: true,
    category: "release_outcome",
    confidence: 0.98,
    reasons: ["explicit_cli_release", "release_completion_signal"],
  };
  const noisyQuality = {
    store_handoff: true,
    category: "execution_outcome",
    confidence: 0.82,
    reasons: ["task_handoff_evidence"],
  };
  const noisySummary = "接下来不要再盲目加功能了。我建议按这个顺序走，把 context 质量继续打磨。";

  mkdirSync(path.join(runtimeHome, "state", "sessions"), { recursive: true });
  writeFileSync(path.join(runtimeHome, "state", "active-project.json"), JSON.stringify({
    cwd: packageDir,
    project_name: "aionis-runtime",
    project_hash: "testhash",
    scope: "codex:aionis-runtime:testhash",
    global_scope: "codex:global",
    tenant_id: "local-codex",
    consumer_agent_id: "codex",
    consumer_team_id: "local-codex",
    updated_at: new Date().toISOString(),
  }));
  writeFileSync(path.join(runtimeHome, "state", "sessions", `${sessionId}.json`), JSON.stringify({
    session_id: sessionId,
    active_turn_id: turnId,
    active_run_id: runId,
    turns: {
      [turnId]: {
        turn_id: turnId,
        run_id: runId,
        prompt: "Audit should separate current quality from historical debt.",
      },
    },
    steps: {},
    updated_at: new Date().toISOString(),
  }));

  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    res.setHeader("content-type", "application/json");
    if (req.method === "GET" && url.pathname === "/health") {
      res.end(JSON.stringify({ ok: true, runtime: { edition: "lite" } }));
      return;
    }
    if (req.method === "GET" && url.pathname === `/v1/memory/sessions/${sessionId}/events`) {
      res.end(JSON.stringify({
        events: [
          {
            title: "Codex turn ended",
            created_at: new Date().toISOString(),
            text_summary: noisySummary,
            slots: {
              phase: "Stop",
              turn_id: turnId,
              run_id: runId,
              handoff_quality: noisyQuality,
            },
          },
        ],
      }));
      return;
    }
    if (req.method === "POST" && url.pathname === "/v1/memory/find") {
      req.resume();
      req.on("end", () => {
        res.end(JSON.stringify({
          nodes: [
            {
              uri: "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/release",
              created_at: "2026-05-10T19:24:00.000Z",
              text_summary: "0.2.19 published and verified.",
              slots: {
                execution_result_summary: {
                  handoff_quality: releaseQuality,
                  release_outcome: true,
                  version: "0.2.19",
                },
              },
            },
            {
              uri: "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/task",
              created_at: "2026-05-10T19:20:00.000Z",
              text_summary: "Implemented explicit Codex handoff commands and verified tests plus pack dry-run.",
              slots: {
                execution_result_summary: {
                  handoff_quality: taskQuality,
                },
              },
            },
            {
              uri: "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/noise",
              created_at: "2026-05-10T18:00:00.000Z",
              text_summary: noisySummary,
              slots: {
                execution_result_summary: {
                  handoff_quality: noisyQuality,
                },
              },
            },
          ],
        }));
      });
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "not found" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    const env = {
      ...process.env,
      HOME: home,
      AIONIS_CODEX_RUNTIME_HOME: runtimeHome,
      AIONIS_CODEX_BASE_URL: `http://127.0.0.1:${address.port}`,
    };
    const audit = await spawnCli(["codex", "audit", "--json", "--session", sessionId, "--limit", "4"], {
      cwd: packageDir,
      env,
    });
    assert.equal(audit.status, 0, `${audit.stdout}\n${audit.stderr}`);
    const parsed = JSON.parse(audit.stdout);

    assert.equal(parsed.context_quality_report.status, "pass");
    assert.equal(parsed.context_quality_report.score, 100);
    assert.deepEqual(parsed.context_quality_report.issues, []);
    assert.equal(parsed.context_quality_report.current_context.status, "pass");
    assert.equal(parsed.context_quality_report.historical_debt.status, "warn");
    assert.ok(parsed.context_quality_report.debt_issues.some((issue) => issue.id === "filtered_noise"));
    assert.equal(parsed.context_quality_report.counts.filtered_handoffs, 1);
    assert.equal(parsed.context_quality_report.counts.filtered_events, 1);

    const textAudit = await spawnCli(["codex", "audit", "--session", sessionId, "--limit", "4"], {
      cwd: packageDir,
      env,
    });
    assert.equal(textAudit.status, 0, `${textAudit.stdout}\n${textAudit.stderr}`);
    assert.match(textAudit.stdout, /Context Quality Report - PASS score=100 debt=WARN/);
    assert.match(textAudit.stdout, /Current Context/);
    assert.match(textAudit.stdout, /Historical Debt/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("runtime cli audit does not warn historical debt for transient event-only noise", async () => {
  const home = mkdtempSync(path.join(os.tmpdir(), "aionis-codex-audit-event-noise-home-"));
  const runtimeHome = path.join(home, ".aionis", "codex");
  const sessionId = "audit-event-noise-session";
  const turnId = "audit-event-noise-turn";
  const runId = "audit-event-noise-run";
  const taskQuality = {
    store_handoff: true,
    category: "execution_outcome",
    confidence: 0.92,
    reasons: ["explicit_cli_handoff", "task_handoff_evidence"],
  };
  const releaseQuality = {
    store_handoff: true,
    category: "release_outcome",
    confidence: 0.98,
    reasons: ["explicit_cli_release", "release_completion_signal"],
  };
  const noisyQuality = {
    store_handoff: false,
    category: "planning_advice",
    confidence: 0.9,
    reasons: ["next_step_planning_advice"],
  };

  mkdirSync(path.join(runtimeHome, "state", "sessions"), { recursive: true });
  writeFileSync(path.join(runtimeHome, "state", "active-project.json"), JSON.stringify({
    cwd: packageDir,
    project_name: "aionis-runtime",
    project_hash: "testhash",
    scope: "codex:aionis-runtime:testhash",
    global_scope: "codex:global",
    tenant_id: "local-codex",
    consumer_agent_id: "codex",
    consumer_team_id: "local-codex",
    updated_at: new Date().toISOString(),
  }));
  writeFileSync(path.join(runtimeHome, "state", "sessions", `${sessionId}.json`), JSON.stringify({
    session_id: sessionId,
    active_turn_id: turnId,
    active_run_id: runId,
    turns: {
      [turnId]: {
        turn_id: turnId,
        run_id: runId,
        prompt: "Audit should keep event-only noise out of historical debt.",
      },
    },
    steps: {},
    updated_at: new Date().toISOString(),
  }));

  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    res.setHeader("content-type", "application/json");
    if (req.method === "GET" && url.pathname === "/health") {
      res.end(JSON.stringify({ ok: true, runtime: { edition: "lite" } }));
      return;
    }
    if (req.method === "GET" && url.pathname === `/v1/memory/sessions/${sessionId}/events`) {
      res.end(JSON.stringify({
        events: [
          {
            title: "Codex turn ended",
            created_at: new Date().toISOString(),
            text_summary: "接下来不要再盲目加功能了。我建议按这个顺序走，把 context 质量继续打磨。",
            slots: {
              phase: "Stop",
              turn_id: turnId,
              run_id: runId,
              handoff_quality: noisyQuality,
            },
          },
        ],
      }));
      return;
    }
    if (req.method === "POST" && url.pathname === "/v1/memory/find") {
      req.resume();
      req.on("end", () => {
        res.end(JSON.stringify({
          nodes: [
            {
              uri: "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/release",
              created_at: "2026-05-10T20:00:00.000Z",
              text_summary: "0.2.21 published and verified.",
              slots: {
                execution_result_summary: {
                  handoff_quality: releaseQuality,
                  release_outcome: true,
                  version: "0.2.21",
                },
              },
            },
            {
              uri: "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/task",
              created_at: "2026-05-10T19:58:00.000Z",
              text_summary: "Implemented strict audit visibility verification and verified tests plus pack dry-run.",
              slots: {
                execution_result_summary: {
                  handoff_quality: taskQuality,
                },
              },
            },
          ],
        }));
      });
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "not found" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    const env = {
      ...process.env,
      HOME: home,
      AIONIS_CODEX_RUNTIME_HOME: runtimeHome,
      AIONIS_CODEX_BASE_URL: `http://127.0.0.1:${address.port}`,
    };
    const audit = await spawnCli(["codex", "audit", "--json", "--session", sessionId, "--limit", "4"], {
      cwd: packageDir,
      env,
    });
    assert.equal(audit.status, 0, `${audit.stdout}\n${audit.stderr}`);
    const parsed = JSON.parse(audit.stdout);
    const filteredNoise = parsed.context_quality_report.historical_debt.checks.find((check) => check.id === "filtered_noise");

    assert.equal(parsed.context_quality_report.status, "pass");
    assert.equal(parsed.context_quality_report.current_context.status, "pass");
    assert.equal(parsed.context_quality_report.historical_debt.status, "pass");
    assert.equal(parsed.context_quality_report.debt_score, 100);
    assert.equal(parsed.context_quality_report.counts.filtered_handoffs, 0);
    assert.equal(parsed.context_quality_report.counts.filtered_events, 1);
    assert.equal(filteredNoise.status, "pass");
    assert.equal(filteredNoise.evidence.stored_handoff_debt, 0);
    assert.equal(filteredNoise.evidence.transient_event_noise, 1);

    const textAudit = await spawnCli(["codex", "audit", "--session", sessionId, "--limit", "4"], {
      cwd: packageDir,
      env,
    });
    assert.equal(textAudit.status, 0, `${textAudit.stdout}\n${textAudit.stderr}`);
    assert.match(textAudit.stdout, /Context Quality Report - PASS score=100 debt=PASS debt_score=100/);
    assert.match(textAudit.stdout, /PASS filtered_noise: Only transient recent events would be hidden/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("runtime cli audit excludes release-looking status reports from latest release outcome", async () => {
  const home = mkdtempSync(path.join(os.tmpdir(), "aionis-codex-audit-release-status-home-"));
  const runtimeHome = path.join(home, ".aionis", "codex");
  const sessionId = "audit-release-status-session";
  const turnId = "audit-release-status-turn";
  const runId = "audit-release-status-run";
  const taskQuality = {
    store_handoff: true,
    category: "execution_outcome",
    confidence: 0.92,
    reasons: ["explicit_cli_handoff", "task_handoff_evidence"],
  };
  const releaseQuality = {
    store_handoff: true,
    category: "release_outcome",
    confidence: 0.98,
    reasons: ["explicit_cli_release", "release_completion_signal"],
  };

  mkdirSync(path.join(runtimeHome, "state", "sessions"), { recursive: true });
  writeFileSync(path.join(runtimeHome, "state", "active-project.json"), JSON.stringify({
    cwd: packageDir,
    project_name: "aionis-runtime",
    project_hash: "testhash",
    scope: "codex:aionis-runtime:testhash",
    global_scope: "codex:global",
    tenant_id: "local-codex",
    updated_at: new Date().toISOString(),
  }));
  writeFileSync(path.join(runtimeHome, "state", "sessions", `${sessionId}.json`), JSON.stringify({
    session_id: sessionId,
    active_turn_id: turnId,
    active_run_id: runId,
    turns: {
      [turnId]: {
        turn_id: turnId,
        run_id: runId,
        prompt: "Audit should exclude release-looking status reports.",
      },
    },
    steps: {},
    updated_at: new Date().toISOString(),
  }));

  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    res.setHeader("content-type", "application/json");
    if (req.method === "GET" && url.pathname === "/health") {
      res.end(JSON.stringify({ ok: true, runtime: { edition: "lite" } }));
      return;
    }
    if (req.method === "GET" && url.pathname === `/v1/memory/sessions/${sessionId}/events`) {
      res.end(JSON.stringify({ events: [] }));
      return;
    }
    if (req.method === "POST" && url.pathname === "/v1/memory/find") {
      req.resume();
      req.on("end", () => {
        res.end(JSON.stringify({
          nodes: [
            {
              uri: "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/status-release",
              created_at: "2026-05-10T20:05:00.000Z",
              text_summary: "现在整体状态是：AionisRuntime 已可继续 dogfood。npm latest：@ostinato/aionis-runtime@0.2.22。0.2.22 发布闭环成立。",
              slots: {
                execution_result_summary: {
                  handoff_quality: releaseQuality,
                  release_outcome: true,
                  version: "0.2.22",
                },
              },
            },
            {
              uri: "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/release",
              created_at: "2026-05-10T20:00:00.000Z",
              text_summary: "0.2.22 published and verified. codex audit now treats transient event-only filtered noise as non-debt.",
              slots: {
                execution_result_summary: {
                  handoff_quality: releaseQuality,
                  release_outcome: true,
                  version: "0.2.22",
                },
              },
            },
            {
              uri: "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/task",
              created_at: "2026-05-10T19:58:00.000Z",
              text_summary: "Implemented strict audit visibility verification and verified tests plus pack dry-run.",
              slots: {
                execution_result_summary: {
                  handoff_quality: taskQuality,
                },
              },
            },
          ],
        }));
      });
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "not found" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    const env = {
      ...process.env,
      HOME: home,
      AIONIS_CODEX_RUNTIME_HOME: runtimeHome,
      AIONIS_CODEX_BASE_URL: `http://127.0.0.1:${address.port}`,
    };
    const audit = await spawnCli(["codex", "audit", "--json", "--session", sessionId, "--limit", "4"], {
      cwd: packageDir,
      env,
    });
    assert.equal(audit.status, 0, `${audit.stdout}\n${audit.stderr}`);
    const parsed = JSON.parse(audit.stdout);

    assert.equal(parsed.context_quality_report.latest.release_outcome.uri, "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/release");
    assert.equal(parsed.context_quality_report.counts.visible_release_outcomes, 1);
    assert.equal(parsed.context_quality_report.counts.filtered_handoffs, 1);
    assert.ok(parsed.remediations.some((remediation) =>
      remediation.uri === "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/status-release" &&
      remediation.reasons.includes("release_outcome_status_lead")));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("runtime cli codex release stores a structured release outcome handoff", async () => {
  const home = mkdtempSync(path.join(os.tmpdir(), "aionis-codex-release-home-"));
  const runtimeHome = path.join(home, ".aionis", "codex");
  const requests = [];
  const handoffUri = "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/release-0.2.19";
  const server = createServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      requests.push({ method: req.method, url: req.url, body: body ? JSON.parse(body) : null });
      res.writeHead(200, { "content-type": "application/json" });
      if (req.url === "/v1/handoff/store") {
        res.end(JSON.stringify({
          ok: true,
          handoff: {
            uri: handoffUri,
          },
        }));
        return;
      }
      if (req.url === "/v1/memory/find") {
        res.end(JSON.stringify({
          nodes: [
            {
              uri: handoffUri,
              slots: {
                anchor: `${packageDir}#release:0.2.19`,
                repo_root: packageDir,
              },
            },
          ],
        }));
        return;
      }
      res.end(JSON.stringify({ ok: true }));
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    const release = await spawnCli([
      "codex",
      "release",
      "0.2.19",
      "--summary",
      "0.2.19 published and verified.",
      "--cwd",
      packageDir,
      "--json",
    ], {
      cwd: os.tmpdir(),
      env: {
        ...process.env,
        HOME: home,
        AIONIS_CODEX_RUNTIME_HOME: runtimeHome,
        AIONIS_CODEX_BASE_URL: `http://127.0.0.1:${address.port}`,
      },
    });
    assert.equal(release.status, 0, `${release.stdout}\n${release.stderr}`);
    const parsed = JSON.parse(release.stdout);
    assert.equal(parsed.project.cwd, packageDir);
    assert.equal(parsed.stored.release_outcome, true);
    assert.equal(parsed.stored.version, "0.2.19");
    assert.equal(parsed.stored.handoff_quality.category, "release_outcome");
    assert.equal(parsed.stored.uri, handoffUri);
    assert.equal(parsed.project_context_snapshot.ok, true);
    assert.equal(parsed.project_context_snapshot.release_outcome, true);
    assert.equal(parsed.audit_visibility.ok, true);
    assert.equal(parsed.audit_visibility.project_cwd, packageDir);
    assert.equal(parsed.audit_visibility.scope, parsed.project.scope);
    assert.equal(parsed.audit_visibility.repo_root, packageDir);
    assert.match(parsed.audit_visibility.audit_command, /aionis-runtime codex audit --limit 8/);

    const snapshotPath = path.join(runtimeHome, "state", "project-context", `${safeSnapshotName(parsed.project.scope)}.json`);
    assert.equal(parsed.project_context_snapshot.path, snapshotPath);
    const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
    assert.equal(snapshot.cwd, packageDir);
    assert.equal(snapshot.scope, parsed.project.scope);
    assert.equal(snapshot.project_release_outcome_fast.nodes[0].uri, handoffUri);
    assert.equal(snapshot.project_release_outcome_fast.nodes[0].summary, "0.2.19 published and verified.");
    assert.equal(snapshot.project_release_outcome_fast.nodes[0].execution_result_summary.release_outcome, true);
    assert.equal(snapshot.project_release_outcome_fast.nodes[0].execution_result_summary.version, "0.2.19");
    assert.equal(snapshot.project_release_outcome_fast.nodes[0].slots.anchor, `${packageDir}#release:0.2.19`);

    assert.equal(requests.length, 2);
    assert.equal(requests[0].method, "POST");
    assert.equal(requests[0].url, "/v1/handoff/store");
    assert.equal(requests[0].body.anchor, `${packageDir}#release:0.2.19`);
    assert.equal(requests[0].body.repo_root, packageDir);
    assert.equal(requests[0].body.execution_result_summary.release_outcome, true);
    assert.equal(requests[0].body.execution_result_summary.version, "0.2.19");
    assert.equal(requests[0].body.execution_result_summary.handoff_quality.store_handoff, true);
    assert.equal(requests[0].body.execution_result_summary.handoff_quality.category, "release_outcome");
    assert.ok(requests[0].body.tags.includes("release_outcome"));
    assert.ok(requests[0].body.tags.includes("0.2.19"));
    assert.equal(requests[1].method, "POST");
    assert.equal(requests[1].url, "/v1/memory/find");
    assert.equal(requests[1].body.scope, parsed.project.scope);
    assert.deepEqual(requests[1].body.slots_contains, {
      summary_kind: "handoff",
      handoff_kind: "task_handoff",
      repo_root: packageDir,
      anchor: `${packageDir}#release:0.2.19`,
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("runtime cli codex handoff stores a structured task outcome handoff", async () => {
  const home = mkdtempSync(path.join(os.tmpdir(), "aionis-codex-handoff-home-"));
  const runtimeHome = path.join(home, ".aionis", "codex");
  const requests = [];
  const handoffUri = "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/task-handoff";
  const server = createServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      requests.push({ method: req.method, url: req.url, body: body ? JSON.parse(body) : null });
      res.writeHead(200, { "content-type": "application/json" });
      if (req.url === "/v1/handoff/store") {
        res.end(JSON.stringify({
          ok: true,
          handoff: {
            uri: handoffUri,
          },
        }));
        return;
      }
      if (req.url === "/v1/memory/find") {
        const parsedBody = body ? JSON.parse(body) : {};
        res.end(JSON.stringify({
          nodes: [
            {
              uri: handoffUri,
              slots: parsedBody.slots_contains,
            },
          ],
        }));
        return;
      }
      res.end(JSON.stringify({ ok: true }));
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    const handoff = await spawnCli([
      "codex",
      "handoff",
      "--summary",
      "Implemented the explicit Codex handoff CLI and verified the request payload.",
      "--next-action",
      "Run the runtime CLI tests and package dry-run before publishing.",
      "--target-file",
      "packages/aionis-runtime/src/cli.mjs",
      "--acceptance-check",
      "runtime CLI tests pass",
      "--tag",
      "dogfood",
      "--json",
    ], {
      cwd: packageDir,
      env: {
        ...process.env,
        HOME: home,
        AIONIS_CODEX_RUNTIME_HOME: runtimeHome,
        AIONIS_CODEX_BASE_URL: `http://127.0.0.1:${address.port}`,
      },
    });
    assert.equal(handoff.status, 0, `${handoff.stdout}\n${handoff.stderr}`);
    const parsed = JSON.parse(handoff.stdout);
    assert.equal(parsed.stored.release_outcome, false);
    assert.equal(parsed.stored.handoff_quality.category, "execution_outcome");
    assert.equal(parsed.project_context_snapshot.ok, true);
    assert.equal(parsed.project_context_snapshot.release_outcome, false);
    assert.equal(parsed.audit_visibility.ok, true);
    assert.equal(parsed.audit_visibility.uri, handoffUri);

    const snapshotPath = path.join(runtimeHome, "state", "project-context", `${safeSnapshotName(parsed.project.scope)}.json`);
    assert.equal(parsed.project_context_snapshot.path, snapshotPath);
    const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
    assert.equal(snapshot.cwd, packageDir);
    assert.equal(snapshot.scope, parsed.project.scope);
    assert.equal(snapshot.project_handoff_fast.nodes[0].uri, handoffUri);
    assert.equal(snapshot.project_handoff_fast.nodes[0].summary, "Implemented the explicit Codex handoff CLI and verified the request payload.");
    assert.equal(snapshot.project_handoff_fast.nodes[0].execution_result_summary.handoff_quality.category, "execution_outcome");
    assert.equal(snapshot.project_handoff_fast.nodes[0].slots.anchor, requests[0].body.anchor);

    assert.equal(requests.length, 2);
    assert.equal(requests[0].method, "POST");
    assert.equal(requests[0].url, "/v1/handoff/store");
    assert.match(requests[0].body.anchor, new RegExp(`^${packageDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}#handoff:`));
    assert.equal(requests[0].body.execution_result_summary.release_outcome, undefined);
    assert.equal(requests[0].body.execution_result_summary.handoff_quality.store_handoff, true);
    assert.equal(requests[0].body.execution_result_summary.handoff_quality.category, "execution_outcome");
    assert.deepEqual(requests[0].body.target_files, ["packages/aionis-runtime/src/cli.mjs"]);
    assert.deepEqual(requests[0].body.acceptance_checks, ["runtime CLI tests pass"]);
    assert.ok(requests[0].body.tags.includes("manual_handoff"));
    assert.ok(requests[0].body.tags.includes("dogfood"));
    assert.equal(requests[1].url, "/v1/memory/find");
    assert.equal(requests[1].body.slots_contains.repo_root, packageDir);
    assert.equal(requests[1].body.slots_contains.anchor, requests[0].body.anchor);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("runtime cli codex handoff canonicalizes symlink cwd before deriving project scope", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "aionis-cli-canonical-cwd-"));
  const realWorkspace = path.join(root, "workspace");
  const linkedWorkspace = path.join(root, "linked-workspace");
  mkdirSync(realWorkspace, { recursive: true });
  symlinkSync(realWorkspace, linkedWorkspace, "dir");
  const canonicalWorkspace = realpathSync.native
    ? realpathSync.native(realWorkspace)
    : realpathSync(realWorkspace);

  const home = path.join(root, "home");
  mkdirSync(home, { recursive: true });
  const runtimeHome = path.join(home, ".aionis", "codex");
  const requests = [];
  const handoffUri = "aionis://local-codex/codex%3Aworkspace%3Acanonical/event/task-handoff";
  const server = createServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      requests.push({ method: req.method, url: req.url, body: body ? JSON.parse(body) : null });
      res.writeHead(200, { "content-type": "application/json" });
      if (req.url === "/v1/handoff/store") {
        res.end(JSON.stringify({
          ok: true,
          handoff: {
            uri: handoffUri,
          },
        }));
        return;
      }
      if (req.url === "/v1/memory/find") {
        const parsedBody = body ? JSON.parse(body) : {};
        res.end(JSON.stringify({
          nodes: [
            {
              uri: handoffUri,
              slots: parsedBody.slots_contains,
            },
          ],
        }));
        return;
      }
      res.end(JSON.stringify({ ok: true }));
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    const handoff = await spawnCli([
      "codex",
      "handoff",
      "--summary",
      "Verified canonical workspace paths for fresh install handoffs.",
      "--cwd",
      linkedWorkspace,
      "--json",
    ], {
      cwd: root,
      env: {
        ...process.env,
        HOME: home,
        AIONIS_CODEX_RUNTIME_HOME: runtimeHome,
        AIONIS_CODEX_BASE_URL: `http://127.0.0.1:${address.port}`,
      },
    });
    assert.equal(handoff.status, 0, `${handoff.stdout}\n${handoff.stderr}`);
    const parsed = JSON.parse(handoff.stdout);
    assert.equal(parsed.project.cwd, canonicalWorkspace);
    assert.equal(parsed.stored.repo_root, canonicalWorkspace);
    assert.match(parsed.stored.anchor, new RegExp(`^${canonicalWorkspace.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}#handoff:`));
    assert.equal(parsed.audit_visibility.project_cwd, canonicalWorkspace);
    assert.equal(parsed.audit_visibility.repo_root, canonicalWorkspace);

    const snapshotPath = path.join(runtimeHome, "state", "project-context", `${safeSnapshotName(parsed.project.scope)}.json`);
    const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
    assert.equal(snapshot.cwd, canonicalWorkspace);
    assert.equal(snapshot.scope, parsed.project.scope);
    assert.equal(requests[0].body.repo_root, canonicalWorkspace);
    assert.equal(requests[1].body.slots_contains.repo_root, canonicalWorkspace);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(root, { recursive: true, force: true });
  }
});

test("runtime cli codex handoff warns when audit cannot see the stored uri", async () => {
  const home = mkdtempSync(path.join(os.tmpdir(), "aionis-codex-handoff-mismatch-home-"));
  const runtimeHome = path.join(home, ".aionis", "codex");
  const storedUri = "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/new-task-handoff";
  const staleUri = "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/stale-task-handoff";
  const server = createServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" });
      if (req.url === "/v1/handoff/store") {
        res.end(JSON.stringify({
          ok: true,
          handoff: {
            uri: storedUri,
          },
        }));
        return;
      }
      if (req.url === "/v1/memory/find") {
        res.end(JSON.stringify({
          nodes: [
            {
              uri: staleUri,
            },
          ],
        }));
        return;
      }
      res.end(JSON.stringify({ ok: true }));
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    const handoff = await spawnCli([
      "codex",
      "handoff",
      "--summary",
      "Stored uri visibility should not pass on stale audit nodes.",
      "--json",
    ], {
      cwd: packageDir,
      env: {
        ...process.env,
        HOME: home,
        AIONIS_CODEX_RUNTIME_HOME: runtimeHome,
        AIONIS_CODEX_BASE_URL: `http://127.0.0.1:${address.port}`,
      },
    });
    assert.equal(handoff.status, 0, `${handoff.stdout}\n${handoff.stderr}`);
    const parsed = JSON.parse(handoff.stdout);
    assert.equal(parsed.stored.uri, storedUri);
    assert.equal(parsed.audit_visibility.ok, false);
    assert.equal(parsed.audit_visibility.node_count, 1);
    assert.equal(parsed.audit_visibility.uri, null);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("runtime cli codex handoff rejects a missing summary value before Runtime calls", async () => {
  const handoff = await spawnCli(["codex", "handoff", "--summary", "--json"], {
    cwd: packageDir,
    env: {
      ...process.env,
      AIONIS_CODEX_BASE_URL: "http://127.0.0.1:9",
    },
  });

  assert.equal(handoff.status, 1);
  assert.match(handoff.stderr, /codex handoff requires --summary TEXT/);
});

test("runtime cli audit reports remediation for filtered historical handoffs", async () => {
  const home = mkdtempSync(path.join(os.tmpdir(), "aionis-codex-audit-remediation-home-"));
  const runtimeHome = path.join(home, ".aionis", "codex");
  const sessionId = "audit-remediation-session";
  const turnId = "audit-remediation-turn";
  const runId = "audit-remediation-run";
  const pollutedSummary =
    "接下来不要再盲目加功能了。现在最应该推进的是把 Aionis 的 context 质量继续打磨。我建议按这个顺序走。";
  const legacyExplainerSummary =
    "我不是把这些内容完全不记录，而是做了两层隔离。Stop hook 还是会写普通 session event，但只有真正有执行结果的内容才会升级成 handoff。";
  const quality = {
    store_handoff: true,
    category: "execution_outcome",
    confidence: 0.82,
    reasons: ["task_handoff_evidence"],
  };

  mkdirSync(path.join(runtimeHome, "state", "sessions"), { recursive: true });
  writeFileSync(path.join(runtimeHome, "state", "active-project.json"), JSON.stringify({
    cwd: packageDir,
    project_name: "aionis-runtime",
    project_hash: "testhash",
    scope: "codex:aionis-runtime:testhash",
    global_scope: "codex:global",
    tenant_id: "local-codex",
    consumer_agent_id: "codex",
    consumer_team_id: "local-codex",
    updated_at: new Date().toISOString(),
  }));
  writeFileSync(path.join(runtimeHome, "state", "sessions", `${sessionId}.json`), JSON.stringify({
    session_id: sessionId,
    active_turn_id: turnId,
    active_run_id: runId,
    turns: {
      [turnId]: {
        turn_id: turnId,
        run_id: runId,
        prompt: "Audit filtered historical context.",
      },
    },
    steps: {},
    updated_at: new Date().toISOString(),
  }));

  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    res.setHeader("content-type", "application/json");
    if (req.method === "GET" && url.pathname === "/health") {
      res.end(JSON.stringify({ ok: true, runtime: { edition: "lite" } }));
      return;
    }
    if (req.method === "GET" && url.pathname === `/v1/memory/sessions/${sessionId}/events`) {
      res.end(JSON.stringify({
        events: [
          {
            title: "Codex turn ended",
            created_at: new Date().toISOString(),
            text_summary: pollutedSummary,
            slots: {
              phase: "Stop",
              turn_id: turnId,
              run_id: runId,
              handoff_quality: quality,
            },
          },
        ],
      }));
      return;
    }
    if (req.method === "POST" && url.pathname === "/v1/memory/find") {
      req.resume();
      req.on("end", () => {
        res.end(JSON.stringify({
          nodes: [
            {
              uri: "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/polluted",
              created_at: new Date().toISOString(),
              text_summary: pollutedSummary,
              slots: {
                execution_result_summary: {
                  handoff_quality: quality,
                },
              },
            },
            {
              uri: "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/legacy-explainer",
              created_at: new Date().toISOString(),
              text_summary: legacyExplainerSummary,
              slots: {},
            },
          ],
        }));
      });
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "not found" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    const audit = await spawnCli(["codex", "audit", "--json", "--session", sessionId, "--limit", "4"], {
      cwd: packageDir,
      env: {
        ...process.env,
        HOME: home,
        AIONIS_CODEX_RUNTIME_HOME: runtimeHome,
        AIONIS_CODEX_BASE_URL: `http://127.0.0.1:${address.port}`,
      },
    });
    assert.equal(audit.status, 0, `${audit.stdout}\n${audit.stderr}`);
    const parsed = JSON.parse(audit.stdout);

    assert.equal(parsed.quality_summary.accepted, 1);
    assert.equal(parsed.quality_summary.filtered_by_current_policy, 1);
    assert.equal(parsed.handoff_display_summary.filtered, 2);
    assert.equal(parsed.remediations.length, 2);
    assert.equal(parsed.remediations[0].kind, "filtered_historical_handoff");
    assert.equal(parsed.remediations[0].action, "keep_hidden_from_task_start_context");
    assert.equal(parsed.remediations[0].uri, "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/polluted");
    assert.deepEqual(parsed.remediations[0].reasons, ["planning_advice_without_execution_evidence"]);
    assert.equal(parsed.remediations[1].uri, "aionis://local-codex/codex%3Aaionis-runtime%3Atesthash/event/legacy-explainer");
    assert.deepEqual(parsed.remediations[1].reasons, ["status_or_discussion_lead"]);
    assert.equal(parsed.context_quality_report.status, "warn");
    assert.equal(parsed.context_quality_report.current_context.status, "warn");
    assert.equal(parsed.context_quality_report.historical_debt.status, "warn");
    assert.ok(parsed.context_quality_report.issues.some((issue) => issue.id === "visible_task_handoff"));
    assert.ok(parsed.context_quality_report.debt_issues.some((issue) => issue.id === "filtered_noise"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

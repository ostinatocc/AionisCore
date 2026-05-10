import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(packageDir, "dist", "bin", "aionis-runtime.mjs");

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

  const status = spawnSync(process.execPath, [cliPath, "codex", "status", "--no-runtime", "--no-watchdog"], {
    encoding: "utf8",
    env,
  });
  assert.equal(status.status, 0, `${status.stdout}\n${status.stderr}`);
  assert.match(status.stdout, /PASS installed plugin/);
  assert.match(status.stdout, /PASS Codex plugin symlink/);
  assert.match(status.stdout, /PASS managed hooks/);

  const jsonStatus = spawnSync(process.execPath, [cliPath, "codex", "status", "--json", "--no-runtime", "--no-watchdog"], {
    encoding: "utf8",
    env,
  });
  assert.equal(jsonStatus.status, 0, `${jsonStatus.stdout}\n${jsonStatus.stderr}`);
  const parsed = JSON.parse(jsonStatus.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.runtime_home, runtimeHome);
  assert.equal(parsed.plugin_dir, pluginDir);
  assert.ok(parsed.checks.some((check) => check.name === "installed plugin" && check.ok));
  assert.ok(parsed.checks.some((check) => check.name === "managed hooks" && check.ok));

  mkdirSync(path.join(runtimeHome, "state"), { recursive: true });
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
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

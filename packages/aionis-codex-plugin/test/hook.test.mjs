import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "..");

function runHook(input) {
  const runtimeHome = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-codex-hook-test-"));
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["hooks/aionis-codex-hook.mjs"], {
      cwd: pluginRoot,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        AIONIS_CODEX_AUTOSTART: "false",
        AIONIS_BASE_URL: "http://127.0.0.1:1",
        AIONIS_CODEX_RUNTIME_HOME: runtimeHome,
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

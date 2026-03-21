import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import { spawn } from "node:child_process";

test("aionis installer entrypoint installs the launcher", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "aionis-installer-home-"));

  const output = await new Promise<string>((resolve, reject) => {
    const child = spawn("npx", ["tsx", "src/product/aionis-installer.ts", "install"], {
      cwd: "/Volumes/ziel/Aionisgo",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        AIONIS_INSTALL_HOME: home,
      },
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.on("error", reject);
    child.on("close", (code) => {
      if ((code ?? 0) !== 0) {
        reject(new Error(Buffer.concat(stderr).toString("utf8")));
        return;
      }
      resolve(Buffer.concat(stdout).toString("utf8"));
    });
  });

  const parsed = JSON.parse(output);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.command, "install");
  assert.equal(parsed.result.install_state, "created");
  assert.equal(parsed.result.paths.launcher_path, path.join(home, ".local", "bin", "aionis"));
});

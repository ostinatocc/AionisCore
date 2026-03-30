import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  buildAionisDevLaunchSpec,
  findAionisRepoRoot,
  formatAionisCommand,
  looksLikeAionisRepoRoot,
  parseAionisCliArgs,
  pickAvailablePort,
  resolveAionisRepoRoot,
} from "../src/cli-support.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");

test("CLI arg parsing supports repo, local-process, dry-run, and forwarded args", () => {
  const parsed = parseAionisCliArgs([
    "dev",
    "--repo",
    "/tmp/Aionis",
    "--port",
    "3011",
    "--local-process",
    "--dry-run",
    "--",
    "--verbose",
  ]);

  assert.equal(parsed.command, "dev");
  assert.equal(parsed.options.repoRoot, "/tmp/Aionis");
  assert.equal(parsed.options.port, "3011");
  assert.equal(parsed.options.localProcess, true);
  assert.equal(parsed.options.dryRun, true);
  assert.deepEqual(parsed.options.forwardedArgs, ["--verbose"]);
});

test("CLI can detect the Aionis repo root from a nested path", () => {
  const nested = path.join(repoRoot, "packages", "sdk", "src");
  assert.equal(looksLikeAionisRepoRoot(repoRoot), true);
  assert.equal(findAionisRepoRoot(nested), repoRoot);
});

test("CLI resolves explicit repo root before cwd detection", () => {
  const resolved = resolveAionisRepoRoot({
    explicitRepoRoot: repoRoot,
    envRepoRoot: "/tmp/does-not-exist",
    cwd: "/tmp",
  });

  assert.equal(resolved, repoRoot);
});

test("CLI builds the default demo launch command for npm-based startup", () => {
  const spec = buildAionisDevLaunchSpec({
    repoRoot,
    port: "3011",
    localProcess: false,
    forwardedArgs: ["--verbose"],
    platform: "darwin",
  });

  assert.equal(spec.profile, "sdk_demo");
  assert.equal(spec.port, "3011");
  assert.equal(spec.npmCommand, "npm");
  assert.deepEqual(spec.npmArgs, [
    "--prefix",
    path.join(repoRoot, "apps", "lite"),
    "run",
    "start:sdk-demo",
    "--",
    "--verbose",
  ]);
  assert.match(formatAionisCommand(spec), /^npm --prefix /);
});

test("CLI builds the local-process launch command when requested", () => {
  const spec = buildAionisDevLaunchSpec({
    repoRoot,
    port: "3011",
    localProcess: true,
    forwardedArgs: [],
    platform: "win32",
  });

  assert.equal(spec.profile, "local_process");
  assert.equal(spec.npmCommand, "npm.cmd");
  assert.equal(spec.npmArgs[3], "start:local-process");
});

test("CLI can allocate an available port", async () => {
  const port = await pickAvailablePort(3001, 3010);
  assert.equal(typeof port, "number");
  assert.ok(port >= 3001);
});

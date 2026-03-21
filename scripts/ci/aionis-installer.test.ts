import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile } from "node:fs/promises";
import { installAionisCli } from "../../src/product/aionis-installer.js";

test("aionis installer writes manifest and launcher", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "aionis-installer-home-"));
  const previousInstallHome = process.env.AIONIS_INSTALL_HOME;
  const previousPath = process.env.PATH;
  process.env.AIONIS_INSTALL_HOME = home;
  process.env.PATH = `${path.join(home, ".local", "bin")}${path.delimiter}${previousPath ?? ""}`;
  try {
    const result = await installAionisCli("/Volumes/ziel/Aionisgo");
    assert.equal(result.install_state, "created");
    assert.equal(result.bin_on_path, true);
    const manifestRaw = await readFile(result.paths.manifest_path, "utf8");
    const launcherRaw = await readFile(result.paths.launcher_path, "utf8");
    assert.match(manifestRaw, /Aionisgo/);
    assert.match(launcherRaw, /product:aionis/);
  } finally {
    if (previousInstallHome === undefined) delete process.env.AIONIS_INSTALL_HOME;
    else process.env.AIONIS_INSTALL_HOME = previousInstallHome;
    if (previousPath === undefined) delete process.env.PATH;
    else process.env.PATH = previousPath;
  }
});

test("aionis installer is idempotent and reports updated when repo root changes", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "aionis-installer-home-"));
  const previousInstallHome = process.env.AIONIS_INSTALL_HOME;
  process.env.AIONIS_INSTALL_HOME = home;
  try {
    const created = await installAionisCli("/Volumes/ziel/Aionisgo");
    assert.equal(created.install_state, "created");
    const unchanged = await installAionisCli("/Volumes/ziel/Aionisgo");
    assert.equal(unchanged.install_state, "unchanged");
    const updated = await installAionisCli("/tmp/another-aionis-root");
    assert.equal(updated.install_state, "updated");
    assert.equal(updated.manifest.repo_root, "/tmp/another-aionis-root");
  } finally {
    if (previousInstallHome === undefined) delete process.env.AIONIS_INSTALL_HOME;
    else process.env.AIONIS_INSTALL_HOME = previousInstallHome;
  }
});

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

export type AionisInstallerManifest = {
  repo_root: string;
  launcher_path: string;
  installed_at: string;
};

export type AionisInstallerPaths = {
  install_root: string;
  manifest_path: string;
  launcher_path: string;
};

export type AionisInstallerResult = {
  install_state: "created" | "updated" | "unchanged";
  paths: AionisInstallerPaths;
  manifest: AionisInstallerManifest;
  bin_on_path: boolean;
};

type InstallerFs = {
  mkdir: typeof mkdir;
  readFile: typeof readFile;
  stat: typeof stat;
  writeFile: typeof writeFile;
};

function pathExists(fs: InstallerFs, target: string): Promise<boolean> {
  return fs.stat(target).then(() => true).catch(() => false);
}

function shellEscape(value: string) {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

function repoRootFromHere() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

function resolveInstallerHome() {
  return process.env.AIONIS_INSTALL_HOME ?? process.env.HOME ?? os.homedir();
}

export function resolveAionisInstallerPaths(): AionisInstallerPaths {
  const home = resolveInstallerHome();
  const install_root = path.join(home, ".aionis");
  return {
    install_root,
    manifest_path: path.join(install_root, "install.json"),
    launcher_path: path.join(home, ".local", "bin", "aionis"),
  };
}

function buildLauncherScript(repo_root: string) {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    `exec npm --prefix ${shellEscape(repo_root)} run -s product:aionis -- "$@"`,
    "",
  ].join("\n");
}

function isOnPath(targetDir: string) {
  return (process.env.PATH ?? "").split(path.delimiter).includes(targetDir);
}

export async function installAionisCli(
  repo_root = repoRootFromHere(),
  deps: { fs?: InstallerFs } = {},
): Promise<AionisInstallerResult> {
  const fs = deps.fs ?? { mkdir, readFile, stat, writeFile };
  const paths = resolveAionisInstallerPaths();
  const launcherScript = buildLauncherScript(repo_root);

  let install_state: "created" | "updated" | "unchanged" = "created";
  if (await pathExists(fs, paths.manifest_path) && await pathExists(fs, paths.launcher_path)) {
    const currentManifest = JSON.parse(await fs.readFile(paths.manifest_path, "utf8")) as AionisInstallerManifest;
    const currentLauncher = await fs.readFile(paths.launcher_path, "utf8");
    if (currentManifest.repo_root === repo_root && currentLauncher === launcherScript) {
      install_state = "unchanged";
    } else {
      install_state = "updated";
    }
  }

  const manifest: AionisInstallerManifest = {
    repo_root,
    launcher_path: paths.launcher_path,
    installed_at: new Date().toISOString(),
  };

  await fs.mkdir(paths.install_root, { recursive: true });
  await fs.mkdir(path.dirname(paths.launcher_path), { recursive: true });
  await fs.writeFile(paths.manifest_path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.writeFile(paths.launcher_path, buildLauncherScript(repo_root), { encoding: "utf8", mode: 0o755 });

  return {
    install_state,
    paths,
    manifest,
    bin_on_path: isOnPath(path.dirname(paths.launcher_path)),
  };
}

async function main() {
  const [command = "install"] = process.argv.slice(2);
  if (command !== "install") {
    process.stdout.write(JSON.stringify({
      ok: false,
      error: "unsupported_command",
      supported: ["install"],
    }, null, 2) + "\n");
    process.exitCode = 1;
    return;
  }

  const result = await installAionisCli();
  process.stdout.write(JSON.stringify({ ok: true, command: "install", result }, null, 2) + "\n");
}

await main();

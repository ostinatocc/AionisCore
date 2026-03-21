import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  doctorCodexProductShell,
  disableCodexProductShell,
  enableCodexProductShell,
  readCodexProductShellConfig,
  removeCodexProductShell,
  restoreCodexProductShellHooks,
  startCodexProductShellRuntime,
  writeCodexProductShellInstall,
} from "./codex-product-shell.js";

function parseFlag(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const direct = args.find((arg) => arg.startsWith(prefix));
  if (direct) return direct.slice(prefix.length);
  const index = args.indexOf(`--${name}`);
  if (index >= 0) return args[index + 1];
  return undefined;
}

function repoRootFromHere() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

async function launchCodex(codexHome?: string): Promise<void> {
  await startCodexProductShellRuntime(codexHome);
  const codexBin = process.env.AIONIS_CODEX_BIN || "codex";
  const child = spawn(codexBin, [], {
    stdio: "inherit",
    env: process.env,
  });
  await new Promise<void>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      process.exitCode = code ?? 0;
      resolve();
    });
  });
}

async function ensureCodexInstalled(args: {
  codex_home?: string;
  base_url?: string;
  scope?: string;
}): Promise<void> {
  const existing = await readCodexProductShellConfig(args.codex_home);
  if (existing) return;
  await writeCodexProductShellInstall({
    repo_root: repoRootFromHere(),
    codex_home: args.codex_home,
    base_url: args.base_url,
    scope: args.scope,
  });
}

async function executeCodexCommand(args: {
  subcommand: "setup" | "doctor" | "status" | "enable" | "disable" | "restore" | "remove" | "start" | "launch";
  codex_home?: string;
  base_url?: string;
  scope?: string;
}): Promise<void> {
  switch (args.subcommand) {
    case "setup": {
      const result = await writeCodexProductShellInstall({
        repo_root: repoRootFromHere(),
        codex_home: args.codex_home,
        base_url: args.base_url,
        scope: args.scope,
      });
      process.stdout.write(JSON.stringify({ ok: true, command: "codex setup", result }, null, 2) + "\n");
      return;
    }
    case "doctor": {
      const result = await doctorCodexProductShell(args.codex_home);
      process.stdout.write(JSON.stringify({ ok: true, command: "codex doctor", result }, null, 2) + "\n");
      return;
    }
    case "status": {
      const result = await doctorCodexProductShell(args.codex_home);
      process.stdout.write(JSON.stringify({ ok: true, command: "codex status", result }, null, 2) + "\n");
      return;
    }
    case "enable": {
      const result = await enableCodexProductShell(args.codex_home);
      process.stdout.write(JSON.stringify({ ok: true, command: "codex enable", result }, null, 2) + "\n");
      return;
    }
    case "disable": {
      const result = await disableCodexProductShell(args.codex_home);
      process.stdout.write(JSON.stringify({ ok: true, command: "codex disable", result }, null, 2) + "\n");
      return;
    }
    case "restore": {
      const result = await restoreCodexProductShellHooks(args.codex_home);
      process.stdout.write(JSON.stringify({ ok: true, command: "codex restore", result }, null, 2) + "\n");
      return;
    }
    case "remove": {
      const result = await removeCodexProductShell(args.codex_home);
      process.stdout.write(JSON.stringify({ ok: true, command: "codex remove", result }, null, 2) + "\n");
      return;
    }
    case "start": {
      const result = await startCodexProductShellRuntime(args.codex_home);
      process.stdout.write(JSON.stringify({ ok: true, command: "codex start", result }, null, 2) + "\n");
      return;
    }
    case "launch": {
      await ensureCodexInstalled(args);
      await launchCodex(args.codex_home);
      return;
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const codex_home = parseFlag(args, "codex-home");
  const base_url = parseFlag(args, "base-url");
  const scope = parseFlag(args, "scope");
  const [command = "launch", subcommand] = args.filter((arg, index, list) => {
    if (arg.startsWith("--")) return false;
    if (index > 0 && list[index - 1]?.startsWith("--")) return false;
    return true;
  });

  if (command === "launch") {
    await executeCodexCommand({ subcommand: "launch", codex_home, base_url, scope });
    return;
  }

  if (["install", "doctor", "status", "enable", "disable", "restore", "remove", "start"].includes(command)) {
    const alias = command === "install" ? "setup" : command;
    await executeCodexCommand({
      subcommand: alias as "setup" | "doctor" | "status" | "enable" | "disable" | "restore" | "remove" | "start",
      codex_home,
      base_url,
      scope,
    });
    return;
  }

  if (command !== "codex") {
    process.stdout.write(JSON.stringify({
      ok: false,
      error: "unsupported_command",
      supported: ["launch", "install", "doctor", "status", "enable", "disable", "restore", "remove", "start", "codex"],
    }, null, 2) + "\n");
    process.exitCode = 1;
    return;
  }

  if (!["setup", "doctor", "status", "enable", "disable", "restore", "remove", "start", "launch"].includes(subcommand ?? "status")) {
    process.stdout.write(JSON.stringify({
      ok: false,
      error: "unsupported_codex_subcommand",
      supported: ["setup", "doctor", "status", "enable", "disable", "restore", "remove", "start", "launch"],
    }, null, 2) + "\n");
    process.exitCode = 1;
    return;
  }
  await executeCodexCommand({
    subcommand: (subcommand ?? "status") as "setup" | "doctor" | "status" | "enable" | "disable" | "restore" | "remove" | "start" | "launch",
    codex_home,
    base_url,
    scope,
  });
}

await main();

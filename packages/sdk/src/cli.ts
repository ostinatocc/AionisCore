#!/usr/bin/env node
import { spawn } from "node:child_process";
import process from "node:process";
import { createRequire } from "node:module";
import {
  buildAionisDevLaunchSpec,
  formatAionisCommand,
  parseAionisCliArgs,
  pickAvailablePort,
  resolveAionisRepoRoot,
} from "./cli-support.js";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { name?: string; version?: string };
const PACKAGE_NAME = packageJson.name ?? "@cognary/aionis";
const PACKAGE_VERSION = packageJson.version ?? "0.1.0";
const PACKAGE_PAGE = "https://www.npmjs.com/package/@cognary/aionis";
const REPO_URL = "https://github.com/Cognary/Aionis";

async function main() {
  const parsed = parseAionisCliArgs(process.argv.slice(2));

  switch (parsed.command) {
    case "doctor":
      runDoctor(parsed.options.repoRoot);
      return;
    case "example":
      runExample();
      return;
    case "dev":
      await runDev(parsed.options);
      return;
    case "help":
    default:
      printHelp();
  }
}

function printHelp() {
  console.log([
    "Aionis Suite CLI",
    "",
    `Package: ${PACKAGE_NAME}@${PACKAGE_VERSION}`,
    "",
    "Commands:",
    "  aionis doctor",
    "  aionis example",
    "  aionis dev --repo /path/to/Aionis",
    "  aionis dev --repo /path/to/Aionis --port 3101",
    "  aionis dev --repo /path/to/Aionis --local-process",
    "  aionis dev --repo /path/to/Aionis --dry-run",
    "",
    "Notes:",
    "  - This CLI is a thin launcher around the public sdk_demo shell.",
    "  - The runtime still lives in the public Aionis repository.",
    `  - Package page: ${PACKAGE_PAGE}`,
    `  - Repository: ${REPO_URL}`,
  ].join("\n"));
}

function runDoctor(explicitRepoRoot?: string) {
  const repoRoot = resolveAionisRepoRoot({
    explicitRepoRoot,
    envRepoRoot: process.env.AIONIS_REPO_DIR,
    cwd: process.cwd(),
  });

  console.log([
    "# Aionis Doctor",
    "",
    `- Package: \`${PACKAGE_NAME}\``,
    `- Version: \`${PACKAGE_VERSION}\``,
    `- Current working directory: \`${process.cwd()}\``,
    `- Detected repo root: ${repoRoot ? `\`${repoRoot}\`` : "`not found`"}`,
    `- Default runtime URL: \`${process.env.AIONIS_BASE_URL ?? "http://127.0.0.1:3001"}\``,
    `- Package page: ${PACKAGE_PAGE}`,
    "",
    "## Recommended next step",
    repoRoot
      ? `- Run \`aionis dev --repo ${repoRoot}\` to start the public sdk_demo runtime shell.`
      : "- Clone the public Aionis repo and rerun with `aionis dev --repo /path/to/Aionis`.",
  ].join("\n"));
}

function runExample() {
  console.log([
    "# Aionis Example",
    "",
    "1. Install the SDK:",
    `   npm install ${PACKAGE_NAME}`,
    "",
    "2. Start the public demo runtime:",
    `   npx ${PACKAGE_NAME} dev --repo /path/to/Aionis`,
    "",
    "3. Connect from your app:",
    "   import { createAionisClient } from \"@cognary/aionis\";",
    "   const aionis = createAionisClient({ baseUrl: \"http://127.0.0.1:3001\" });",
    "",
    `Package page: ${PACKAGE_PAGE}`,
    `Repository: ${REPO_URL}`,
  ].join("\n"));
}

async function runDev(options: ReturnType<typeof parseAionisCliArgs>["options"]) {
  const repoRoot = resolveAionisRepoRoot({
    explicitRepoRoot: options.repoRoot,
    envRepoRoot: process.env.AIONIS_REPO_DIR,
    cwd: process.cwd(),
  });

  if (!repoRoot) {
    console.error("Aionis repo root not found.");
    console.error("Clone https://github.com/Cognary/Aionis and rerun with:");
    console.error("  aionis dev --repo /path/to/Aionis");
    process.exitCode = 1;
    return;
  }

  const port = options.port ?? process.env.PORT ?? String(await pickAvailablePort());

  const spec = buildAionisDevLaunchSpec({
    repoRoot,
    port,
    localProcess: options.localProcess,
    forwardedArgs: options.forwardedArgs,
    platform: process.platform,
  });

  if (options.dryRun) {
    console.log([
      "# Aionis Dev Dry Run",
      "",
      `- Repo root: \`${spec.repoRoot}\``,
      `- App dir: \`${spec.appDir}\``,
      `- Profile: \`${spec.profile}\``,
      `- Port: \`${spec.port}\``,
      `- URL: \`http://127.0.0.1:${spec.port}\``,
      `- Command: \`${formatAionisCommand(spec)}\``,
    ].join("\n"));
    return;
  }

  console.log(`Starting Aionis dev on http://127.0.0.1:${spec.port} (${spec.profile})`);

  const child = spawn(spec.npmCommand, spec.npmArgs, {
    stdio: "inherit",
    cwd: spec.repoRoot,
    env: {
      ...process.env,
      PORT: spec.port,
    },
  });

  const exit = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });

  if (exit.signal) {
    process.kill(process.pid, exit.signal);
    return;
  }

  process.exitCode = exit.code ?? 0;
}

await main();

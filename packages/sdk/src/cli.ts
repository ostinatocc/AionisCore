#!/usr/bin/env node
import { spawn } from "node:child_process";
import process from "node:process";
import { createRequire } from "node:module";
import {
  buildAionisDevLaunchSpec,
  formatAionisCommand,
  parseAionisDiagnosticsCliArgs,
  parseAionisCliArgs,
  pickAvailablePort,
  resolveAionisRepoRoot,
} from "./cli-support.js";
import { createAionisClient } from "./client.js";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { name?: string; version?: string };
const PACKAGE_NAME = packageJson.name ?? "@ostinato/aionis";
const PACKAGE_VERSION = packageJson.version ?? "0.1.0";
const PACKAGE_PAGE = "https://www.npmjs.com/package/@ostinato/aionis";
const REPO_URL = "https://github.com/ostinatocc/AionisCore";

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
    case "agent-inspect":
      await runAgentInspect(parsed.options.forwardedArgs);
      return;
    case "evolution-review":
      await runEvolutionReview(parsed.options.forwardedArgs);
      return;
    case "help":
    default:
      printHelp();
  }
}

function printHelp() {
  console.log([
    "Aionis Core CLI",
    "",
    `Package: ${PACKAGE_NAME}@${PACKAGE_VERSION}`,
    "",
    "Commands:",
    "  aionis-internal doctor",
    "  aionis-internal example",
    "  aionis-internal dev --repo /path/to/Aionis",
    "  aionis-internal dev --repo /path/to/Aionis --port 3101",
    "  aionis-internal dev --repo /path/to/Aionis --local-process",
    "  aionis-internal dev --repo /path/to/Aionis --dry-run",
    "  aionis-internal agent-inspect --query \"repair export route\" --file src/routes/export.ts",
    "  aionis-internal evolution-review --query \"repair export route\" --file src/routes/export.ts",
    "",
    "Notes:",
    "  - This CLI is a thin launcher around the local Aionis Core runtime shell.",
    "  - The runtime lives in the Aionis repository.",
    `  - Package page: ${PACKAGE_PAGE}`,
    `  - Repository: ${REPO_URL}`,
  ].join("\n"));
}

async function runAgentInspect(argv: string[]) {
  const options = parseAionisDiagnosticsCliArgs(argv);
  if (!options.queryText.trim()) {
    console.error("agent-inspect requires --query");
    process.exitCode = 1;
    return;
  }

  const client = createAionisClient({ baseUrl: options.baseUrl });
  const response = await client.memory.agent.inspect({
    tenant_id: options.tenantId,
    scope: options.scope,
    query_text: options.queryText,
    context: {
      goal: options.queryText,
      ...(options.repoRoot ? { repo_root: options.repoRoot } : {}),
      ...(options.filePath ? { file_path: options.filePath } : {}),
    },
    candidates: options.candidates,
    ...(options.filePath ? { file_path: options.filePath } : {}),
    ...(options.repoRoot ? { repo_root: options.repoRoot } : {}),
    ...(options.anchor ? { anchor: options.anchor } : {}),
    ...(options.handoffKind ? { handoff_kind: options.handoffKind } : {}),
    ...(options.includeMeta ? { include_meta: true } : {}),
  });

  console.log(JSON.stringify(response, null, 2));
}

async function runEvolutionReview(argv: string[]) {
  const options = parseAionisDiagnosticsCliArgs(argv);
  if (!options.queryText.trim()) {
    console.error("evolution-review requires --query");
    process.exitCode = 1;
    return;
  }

  const client = createAionisClient({ baseUrl: options.baseUrl });
  const response = await client.memory.reviewPacks.evolution({
    tenant_id: options.tenantId,
    scope: options.scope,
    query_text: options.queryText,
    context: {
      goal: options.queryText,
      ...(options.repoRoot ? { repo_root: options.repoRoot } : {}),
      ...(options.filePath ? { file_path: options.filePath } : {}),
    },
    candidates: options.candidates,
  });

  console.log(JSON.stringify(response, null, 2));
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
      ? `- Run \`aionis-internal dev --repo ${repoRoot}\` to start the local Aionis Core runtime shell.`
      : "- Clone the public Aionis repo and rerun with `aionis-internal dev --repo /path/to/Aionis`.",
  ].join("\n"));
}

function runExample() {
  console.log([
    "# Aionis Example",
    "",
    "1. Install the SDK:",
    `   npm install ${PACKAGE_NAME}`,
    "",
    "2. Start the local Aionis Core runtime:",
    "   aionis-internal dev --repo /path/to/Aionis",
    "",
    "3. Connect from your app:",
    "   import { createAionisClient } from \"@ostinato/aionis\";",
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
    console.error("  aionis-internal dev --repo /path/to/Aionis");
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

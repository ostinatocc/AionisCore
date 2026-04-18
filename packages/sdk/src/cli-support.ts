import fs from "node:fs";
import net from "node:net";
import path from "node:path";

export type AionisCliCommand = "help" | "doctor" | "example" | "dev" | "agent-inspect" | "evolution-review";

export type AionisCliOptions = {
  repoRoot?: string;
  port?: string;
  localProcess: boolean;
  dryRun: boolean;
  forwardedArgs: string[];
};

export type ParsedAionisCliArgs = {
  command: AionisCliCommand;
  options: AionisCliOptions;
};

export type AionisDiagnosticsCliOptions = {
  baseUrl: string;
  tenantId: string;
  scope: string;
  queryText: string;
  candidates: string[];
  filePath?: string;
  repoRoot?: string;
  anchor?: string;
  handoffKind?: string;
  includeMeta: boolean;
};

export type AionisDevLaunchSpec = {
  repoRoot: string;
  appDir: string;
  npmCommand: string;
  npmArgs: string[];
  profile: "sdk_demo" | "local_process";
  port: string;
};

const REPO_SENTINELS = [
  ["apps", "lite", "package.json"],
  ["package.json"],
] as const;

export function parseAionisCliArgs(argv: string[]): ParsedAionisCliArgs {
  const [rawCommand, ...rest] = argv;
  const command = normalizeCommand(rawCommand);
  const options: AionisCliOptions = {
    repoRoot: undefined,
    port: undefined,
    localProcess: false,
    dryRun: false,
    forwardedArgs: [],
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--") {
      options.forwardedArgs = rest.slice(index + 1);
      break;
    }
    if (arg === "--repo") {
      options.repoRoot = rest[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith("--repo=")) {
      options.repoRoot = arg.slice("--repo=".length);
      continue;
    }
    if (arg === "--port") {
      options.port = rest[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith("--port=")) {
      options.port = arg.slice("--port=".length);
      continue;
    }
    if (arg === "--local-process") {
      options.localProcess = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (command === "help") {
      continue;
    }
    options.forwardedArgs.push(arg);
  }

  return {
    command,
    options,
  };
}

export function normalizeCommand(rawCommand?: string): AionisCliCommand {
  switch (rawCommand) {
    case undefined:
    case "":
    case "help":
    case "--help":
    case "-h":
      return "help";
    case "doctor":
      return "doctor";
    case "example":
      return "example";
    case "dev":
      return "dev";
    case "agent-inspect":
      return "agent-inspect";
    case "evolution-review":
      return "evolution-review";
    default:
      return "help";
  }
}

export function parseAionisDiagnosticsCliArgs(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): AionisDiagnosticsCliOptions {
  const options: AionisDiagnosticsCliOptions = {
    baseUrl: env.AIONIS_BASE_URL ?? "http://127.0.0.1:3001",
    tenantId: env.AIONIS_TENANT_ID ?? "default",
    scope: env.AIONIS_SCOPE ?? "default",
    queryText: "",
    candidates: [],
    filePath: undefined,
    repoRoot: undefined,
    anchor: undefined,
    handoffKind: "patch_handoff",
    includeMeta: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--base-url" && next) {
      options.baseUrl = next;
      index += 1;
      continue;
    }
    if (arg.startsWith("--base-url=")) {
      options.baseUrl = arg.slice("--base-url=".length);
      continue;
    }
    if (arg === "--tenant" && next) {
      options.tenantId = next;
      index += 1;
      continue;
    }
    if (arg.startsWith("--tenant=")) {
      options.tenantId = arg.slice("--tenant=".length);
      continue;
    }
    if (arg === "--scope" && next) {
      options.scope = next;
      index += 1;
      continue;
    }
    if (arg.startsWith("--scope=")) {
      options.scope = arg.slice("--scope=".length);
      continue;
    }
    if (arg === "--query" && next) {
      options.queryText = next;
      index += 1;
      continue;
    }
    if (arg.startsWith("--query=")) {
      options.queryText = arg.slice("--query=".length);
      continue;
    }
    if (arg === "--candidate" && next) {
      options.candidates.push(next);
      index += 1;
      continue;
    }
    if (arg.startsWith("--candidate=")) {
      options.candidates.push(arg.slice("--candidate=".length));
      continue;
    }
    if (arg === "--file" && next) {
      options.filePath = next;
      index += 1;
      continue;
    }
    if (arg.startsWith("--file=")) {
      options.filePath = arg.slice("--file=".length);
      continue;
    }
    if (arg === "--repo-root" && next) {
      options.repoRoot = next;
      index += 1;
      continue;
    }
    if (arg.startsWith("--repo-root=")) {
      options.repoRoot = arg.slice("--repo-root=".length);
      continue;
    }
    if (arg === "--anchor" && next) {
      options.anchor = next;
      index += 1;
      continue;
    }
    if (arg.startsWith("--anchor=")) {
      options.anchor = arg.slice("--anchor=".length);
      continue;
    }
    if (arg === "--handoff-kind" && next) {
      options.handoffKind = next;
      index += 1;
      continue;
    }
    if (arg.startsWith("--handoff-kind=")) {
      options.handoffKind = arg.slice("--handoff-kind=".length);
      continue;
    }
    if (arg === "--include-meta") {
      options.includeMeta = true;
      continue;
    }
  }

  if (options.candidates.length === 0) {
    options.candidates = ["bash", "edit", "test"];
  }
  if (!options.anchor && options.filePath) {
    options.anchor = `resume:${options.filePath}`;
  }
  return options;
}

export function findAionisRepoRoot(startDir: string): string | null {
  let current = path.resolve(startDir);
  while (true) {
    if (looksLikeAionisRepoRoot(current)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

export function looksLikeAionisRepoRoot(candidate: string): boolean {
  return REPO_SENTINELS.every((segments) => fs.existsSync(path.join(candidate, ...segments)));
}

export function resolveAionisRepoRoot(args: { explicitRepoRoot?: string; cwd: string; envRepoRoot?: string }): string | null {
  const explicitCandidates = [args.explicitRepoRoot, args.envRepoRoot].filter((value): value is string => typeof value === "string" && value.length > 0);
  for (const candidate of explicitCandidates) {
    const resolved = path.resolve(candidate);
    if (looksLikeAionisRepoRoot(resolved)) {
      return resolved;
    }
  }
  return findAionisRepoRoot(args.cwd);
}

export function buildAionisDevLaunchSpec(args: {
  repoRoot: string;
  port: string;
  localProcess: boolean;
  forwardedArgs?: string[];
  platform?: NodeJS.Platform;
}): AionisDevLaunchSpec {
  const appDir = path.join(args.repoRoot, "apps", "lite");
  const npmCommand = args.platform === "win32" ? "npm.cmd" : "npm";
  const npmArgs = [
    "--prefix",
    appDir,
    "run",
    args.localProcess ? "start:local-process" : "start:sdk-demo",
    "--",
    ...(args.forwardedArgs ?? []),
  ];

  return {
    repoRoot: args.repoRoot,
    appDir,
    npmCommand,
    npmArgs,
    profile: args.localProcess ? "local_process" : "sdk_demo",
    port: args.port,
  };
}

export function formatAionisCommand(spec: AionisDevLaunchSpec): string {
  const pieces = [spec.npmCommand, ...spec.npmArgs].map(shellQuote);
  return pieces.join(" ");
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:@=-]+$/.test(value)) {
    return value;
  }
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

export async function pickAvailablePort(startPort = 3001, endPort = 3099): Promise<number> {
  for (let port = startPort; port <= endPort; port += 1) {
    if (await canListen(port)) {
      return port;
    }
  }
  return await pickEphemeralPort();
}

async function canListen(port: number): Promise<boolean> {
  return await new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ host: "127.0.0.1", port }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function pickEphemeralPort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("failed to allocate an ephemeral port")));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

import { AionisDocExecutionResultSchema, AionisDocRunInputKindSchema } from "./contracts.js";
import { AionisDocRunError, runAionisDoc } from "./run.js";

class CliUsageError extends Error {}

type InputKind = "source" | "compile-envelope" | "plan";

type CliFlags = {
  inputKind: InputKind;
  registry: string | null;
  out: string | null;
  compact: boolean;
  help: boolean;
};

function printHelp(): void {
  process.stdout.write(
    [
      "run-aionis-doc",
      "",
      "Usage:",
      "  run-aionis-doc <input-file> [--input-kind source|compile-envelope|plan] --registry <path> [--out <path>] [--compact]",
      "",
      "Options:",
      "  --input-kind <kind>   Select source, compile-envelope, or plan input. Default: source",
      "  --registry <path>     Path to a module registry JSON file",
      "  --out <path>          Write output JSON to a file instead of stdout",
      "  --compact             Print compact JSON instead of pretty JSON",
      "  --help                Show this message",
      "",
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): { inputPath: string | null; flags: CliFlags } {
  let inputPath: string | null = null;
  const flags: CliFlags = {
    inputKind: "source",
    registry: null,
    out: null,
    compact: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      flags.help = true;
      continue;
    }
    if (token === "--compact") {
      flags.compact = true;
      continue;
    }
    if (token === "--input-kind") {
      const next = argv[i + 1];
      if (!next) throw new CliUsageError("Missing value for --input-kind.");
      flags.inputKind = AionisDocRunInputKindSchema.parse(next);
      i += 1;
      continue;
    }
    if (token === "--registry") {
      const next = argv[i + 1];
      if (!next) throw new CliUsageError("Missing value for --registry.");
      flags.registry = next;
      i += 1;
      continue;
    }
    if (token === "--out") {
      const next = argv[i + 1];
      if (!next) throw new CliUsageError("Missing value for --out.");
      flags.out = next;
      i += 1;
      continue;
    }
    if (token.startsWith("--")) {
      throw new CliUsageError(`Unknown flag '${token}'.`);
    }
    if (inputPath) throw new CliUsageError("Only one input file may be provided.");
    inputPath = token;
  }

  return { inputPath, flags };
}

async function writeOutput(pathname: string, contents: string): Promise<void> {
  await mkdir(dirname(pathname), { recursive: true });
  await writeFile(pathname, contents, "utf8");
}

async function main(): Promise<void> {
  const { inputPath, flags } = parseArgs(process.argv.slice(2));
  if (flags.help) {
    printHelp();
    return;
  }
  if (!inputPath) throw new CliUsageError("An input file path is required.");
  if (!flags.registry) throw new CliUsageError("A --registry path is required.");

  const result = await runAionisDoc({
    inputPath,
    inputKind: flags.inputKind,
    registryPath: flags.registry,
  });

  const parsed = AionisDocExecutionResultSchema.parse(result);
  const rendered = flags.compact ? JSON.stringify(parsed) : `${JSON.stringify(parsed, null, 2)}\n`;

  if (flags.out) {
    await writeOutput(resolve(process.cwd(), flags.out), rendered);
  } else {
    process.stdout.write(rendered);
  }

  if (parsed.status === "failed") {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  if (error instanceof CliUsageError || error instanceof AionisDocRunError) {
    process.stderr.write(`${error.message}\n`);
    if (error instanceof CliUsageError) printHelp();
    process.exitCode = error instanceof CliUsageError ? 2 : 1;
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});

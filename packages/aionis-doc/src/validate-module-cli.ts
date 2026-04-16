#!/usr/bin/env node
import { resolve } from "node:path";
import process from "node:process";

import { resolveOutputPath, validateAionisDocModule, writeValidationOutput } from "./validate.js";

class CliUsageError extends Error {}

type CliFlags = {
  declaredModule: string | null;
  out: string | null;
  compact: boolean;
  help: boolean;
};

function printHelp(): void {
  process.stdout.write(
    [
      "validate-aionis-doc-module",
      "",
      "Usage:",
      "  validate-aionis-doc-module <entry-file> [--declared-module <module>] [--out <path>] [--compact]",
      "",
      "Options:",
      "  --declared-module <module>  Require the entry manifest to match the declared module id",
      "  --out <path>                Write output JSON to a file instead of stdout",
      "  --compact                   Print compact JSON instead of pretty JSON",
      "  --help                      Show this message",
      "",
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): { entryPath: string | null; flags: CliFlags } {
  let entryPath: string | null = null;
  const flags: CliFlags = {
    declaredModule: null,
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
    if (token === "--declared-module") {
      const next = argv[i + 1];
      if (!next) throw new CliUsageError("Missing value for --declared-module.");
      flags.declaredModule = next;
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
    if (token.startsWith("--")) throw new CliUsageError(`Unknown flag '${token}'.`);
    if (entryPath) throw new CliUsageError("Only one entry file may be provided.");
    entryPath = token;
  }

  return { entryPath, flags };
}

async function main(): Promise<void> {
  const { entryPath, flags } = parseArgs(process.argv.slice(2));
  if (flags.help) {
    printHelp();
    return;
  }
  if (!entryPath) throw new CliUsageError("An entry file path is required.");

  const result = await validateAionisDocModule({
    entryPath,
    declaredModule: flags.declaredModule ?? undefined,
    cwd: process.cwd(),
  });
  const rendered = flags.compact ? JSON.stringify(result) : `${JSON.stringify(result, null, 2)}\n`;

  if (flags.out) {
    await writeValidationOutput(resolveOutputPath(flags.out), rendered);
    return;
  }
  process.stdout.write(rendered);
}

main().catch((error: unknown) => {
  if (error instanceof CliUsageError) {
    process.stderr.write(`${error.message}\n`);
    printHelp();
    process.exitCode = 2;
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});

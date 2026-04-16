#!/usr/bin/env node
import { resolve } from "node:path";
import process from "node:process";

import { resolveOutputPath, validateAionisDocRegistry, writeValidationOutput } from "./validate.js";

class CliUsageError extends Error {}

type CliFlags = {
  out: string | null;
  compact: boolean;
  help: boolean;
};

function printHelp(): void {
  process.stdout.write(
    [
      "validate-aionis-doc-registry",
      "",
      "Usage:",
      "  validate-aionis-doc-registry <registry-file> [--out <path>] [--compact]",
      "",
      "Options:",
      "  --out <path>      Write output JSON to a file instead of stdout",
      "  --compact         Print compact JSON instead of pretty JSON",
      "  --help            Show this message",
      "",
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): { registryPath: string | null; flags: CliFlags } {
  let registryPath: string | null = null;
  const flags: CliFlags = {
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
    if (token === "--out") {
      const next = argv[i + 1];
      if (!next) throw new CliUsageError("Missing value for --out.");
      flags.out = next;
      i += 1;
      continue;
    }
    if (token.startsWith("--")) throw new CliUsageError(`Unknown flag '${token}'.`);
    if (registryPath) throw new CliUsageError("Only one registry file may be provided.");
    registryPath = token;
  }

  return { registryPath, flags };
}

async function main(): Promise<void> {
  const { registryPath, flags } = parseArgs(process.argv.slice(2));
  if (flags.help) {
    printHelp();
    return;
  }
  if (!registryPath) throw new CliUsageError("A registry file path is required.");

  const result = await validateAionisDocRegistry({
    registryPath: resolve(process.cwd(), registryPath),
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

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  formatRuntimeDogfoodMarkdown,
  runRuntimeDogfoodSuite,
} from "./lib/lite-runtime-dogfood.ts";

type CliOptions = {
  json: boolean;
  outJson: string | null;
  outMarkdown: string | null;
};

function usage(): string {
  return [
    "Usage:",
    "  npx tsx scripts/lite-runtime-dogfood.ts [--json] [--out-json /path/result.json] [--out-md /path/result.md]",
    "",
    "Runs a product dogfood slice over real Runtime task families.",
  ].join("\n");
}

function parseArgs(argv: string[]): CliOptions {
  let json = false;
  let outJson: string | null = null;
  let outMarkdown: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--out-json") {
      outJson = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg === "--out-md") {
      outMarkdown = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      console.log(usage());
      process.exit(0);
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  return { json, outJson, outMarkdown };
}

function ensureParent(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const result = runRuntimeDogfoodSuite();
  if (options.outJson) {
    ensureParent(options.outJson);
    fs.writeFileSync(options.outJson, `${JSON.stringify(result, null, 2)}\n`);
  }
  if (options.outMarkdown) {
    ensureParent(options.outMarkdown);
    fs.writeFileSync(options.outMarkdown, formatRuntimeDogfoodMarkdown(result));
  }
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatRuntimeDogfoodMarkdown(result));
  }
  if (result.overall_status !== "pass") {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}

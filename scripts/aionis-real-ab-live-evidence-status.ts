import fs from "node:fs";
import path from "node:path";
import {
  buildRealAbLiveEvidenceStatusReport,
  renderRealAbLiveEvidenceStatusMarkdown,
} from "./lib/aionis-real-ab-live-evidence-status.ts";

type CliOptions = {
  manifestPath: string | null;
  outJson: string | null;
  outMarkdown: string | null;
  printJson: boolean;
  failOnNotReady: boolean;
};

function printHelp() {
  process.stdout.write(`Aionis real A/B live evidence status

Usage:
  npx tsx scripts/aionis-real-ab-live-evidence-status.ts --manifest .artifacts/real-ab/first-live-2026-04-27/manifest.json

Flags:
  --manifest <path>       Live evidence manifest.
  --json                  Print JSON instead of Markdown.
  --out-json <path>       Write status report JSON.
  --out-md <path>         Write status report Markdown.
  --fail-on-not-ready     Exit non-zero when any arm/probe is not ready for live evidence assembly.
  --help                  Show this help.
`);
}

function readValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    manifestPath: null,
    outJson: null,
    outMarkdown: null,
    printJson: false,
    failOnNotReady: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--manifest":
        options.manifestPath = readValue(argv, index, arg);
        index += 1;
        break;
      case "--json":
        options.printJson = true;
        break;
      case "--out-json":
        options.outJson = readValue(argv, index, arg);
        index += 1;
        break;
      case "--out-md":
        options.outMarkdown = readValue(argv, index, arg);
        index += 1;
        break;
      case "--fail-on-not-ready":
        options.failOnNotReady = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.manifestPath) {
    throw new Error("--manifest is required");
  }
  return options;
}

function ensureParent(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

const options = parseArgs(process.argv.slice(2));
const report = buildRealAbLiveEvidenceStatusReport({
  manifest_path: path.resolve(options.manifestPath ?? ""),
});
const json = `${JSON.stringify(report, null, 2)}\n`;
const markdown = renderRealAbLiveEvidenceStatusMarkdown(report);

if (options.outJson) {
  const outPath = path.resolve(options.outJson);
  ensureParent(outPath);
  fs.writeFileSync(outPath, json);
}
if (options.outMarkdown) {
  const outPath = path.resolve(options.outMarkdown);
  ensureParent(outPath);
  fs.writeFileSync(outPath, markdown);
}

process.stdout.write(options.printJson ? json : markdown);

if (options.failOnNotReady && !report.ready_for_live_evidence) {
  process.exitCode = 1;
}

import fs from "node:fs";
import path from "node:path";
import {
  buildRealAbLiveEvidenceBundleFiles,
  type RealAbLiveEvidenceBundleOptions,
} from "./lib/aionis-real-ab-live-evidence-bundle.ts";
import type { RealAbSuiteKind } from "./lib/aionis-real-ab-validation.ts";

type CliOptions = {
  outDir: string | null;
  suiteId: string | null;
  suiteKind: Exclude<RealAbSuiteKind, "harness_calibration">;
  taskIds: string[];
  generatedAt: string | null;
  force: boolean;
};

function printHelp() {
  process.stdout.write(`Aionis real A/B live evidence bundle initializer

Usage:
  npx tsx scripts/aionis-real-ab-live-evidence-init.ts --out-dir ./runs/first-live --suite-id first-live --task-id external_probe_service_after_exit

Flags:
  --out-dir <path>        Directory where the evidence bundle scaffold will be created.
  --suite-id <id>         Stable suite id for this four-arm live evidence run.
  --suite-kind <kind>     pilot_real_trace or product_real_trace. Defaults to pilot_real_trace.
  --task-id <id>          Dogfood probe id to require. Can be repeated or comma-separated.
  --task-ids <ids>        Comma-separated dogfood probe ids.
  --generated-at <iso>    Optional manifest timestamp.
  --force                 Overwrite existing generated template files.
  --help                  Show this help.

The initializer does not create dogfood-run.json files. Those must come from real arm runs.
`);
}

function readValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function addTaskIds(target: string[], value: string) {
  for (const taskId of value.split(",")) {
    const trimmed = taskId.trim();
    if (trimmed.length > 0) target.push(trimmed);
  }
}

function parseSuiteKind(value: string): Exclude<RealAbSuiteKind, "harness_calibration"> {
  if (value === "pilot_real_trace" || value === "product_real_trace") {
    return value;
  }
  throw new Error("--suite-kind must be pilot_real_trace or product_real_trace");
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    outDir: null,
    suiteId: null,
    suiteKind: "pilot_real_trace",
    taskIds: [],
    generatedAt: null,
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--out-dir":
        options.outDir = readValue(argv, index, arg);
        index += 1;
        break;
      case "--suite-id":
        options.suiteId = readValue(argv, index, arg);
        index += 1;
        break;
      case "--suite-kind":
        options.suiteKind = parseSuiteKind(readValue(argv, index, arg));
        index += 1;
        break;
      case "--task-id":
      case "--task-ids":
        addTaskIds(options.taskIds, readValue(argv, index, arg));
        index += 1;
        break;
      case "--generated-at":
        options.generatedAt = readValue(argv, index, arg);
        index += 1;
        break;
      case "--force":
        options.force = true;
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

  if (!options.outDir) {
    throw new Error("--out-dir is required");
  }
  if (!options.suiteId) {
    throw new Error("--suite-id is required");
  }
  if (options.taskIds.length === 0) {
    throw new Error("--task-id is required");
  }

  return options;
}

function writeBundle(options: CliOptions) {
  const outDir = path.resolve(options.outDir ?? "");
  const bundleOptions: RealAbLiveEvidenceBundleOptions = {
    suite_id: options.suiteId ?? "",
    suite_kind: options.suiteKind,
    task_ids: options.taskIds,
    ...(options.generatedAt ? { generated_at: options.generatedAt } : {}),
  };
  const files = buildRealAbLiveEvidenceBundleFiles(bundleOptions);
  const targets = files.map((file) => ({
    relative_path: file.relative_path,
    absolute_path: path.join(outDir, file.relative_path),
    content: file.content,
  }));
  const existingFiles = targets.filter((target) => fs.existsSync(target.absolute_path));

  if (existingFiles.length > 0 && !options.force) {
    const fileList = existingFiles.map((target) => `- ${target.relative_path}`).join("\n");
    throw new Error(`Refusing to overwrite existing evidence bundle files. Re-run with --force only if these are still templates:\n${fileList}`);
  }

  for (const target of targets) {
    fs.mkdirSync(path.dirname(target.absolute_path), { recursive: true });
    fs.writeFileSync(target.absolute_path, target.content);
  }

  process.stdout.write([
    `Initialized Aionis real A/B live evidence bundle at ${outDir}`,
    "",
    "Next:",
    "1. Run each arm independently and write real dogfood-run.json files into its arm directory.",
    "2. Replace empty agent-events.json arrays with captured agent action/tool events.",
    "3. Validate with: npm run -s ab:evidence:live -- --manifest manifest.json --report --fail-on-invalid",
    "",
  ].join("\n"));
}

const options = parseArgs(process.argv.slice(2));
writeBundle(options);

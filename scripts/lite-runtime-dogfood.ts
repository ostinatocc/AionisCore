import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  formatRuntimeDogfoodMarkdown,
  runRuntimeDogfoodSuite,
  runtimeDogfoodTasksFromSpecs,
  type RuntimeDogfoodTaskSpec,
} from "./lib/lite-runtime-dogfood.ts";

type CliOptions = {
  json: boolean;
  reportJson: boolean;
  outJson: string | null;
  outReportJson: string | null;
  outMarkdown: string | null;
  tasksJson: string | null;
};

function usage(): string {
  return [
    "Usage:",
    "  npx tsx scripts/lite-runtime-dogfood.ts [--json|--report-json] [--tasks-json /path/tasks.json] [--out-json /path/result.json] [--out-report-json /path/report.json] [--out-md /path/result.md]",
    "",
    "Runs a product dogfood slice over real Runtime task families.",
    "",
    "tasks.json may be an array of task specs or an object with a tasks array.",
  ].join("\n");
}

function parseArgs(argv: string[]): CliOptions {
  let json = false;
  let reportJson = false;
  let outJson: string | null = null;
  let outReportJson: string | null = null;
  let outMarkdown: string | null = null;
  let tasksJson: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--report-json") {
      reportJson = true;
      continue;
    }
    if (arg === "--out-json") {
      outJson = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg === "--out-report-json") {
      outReportJson = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg === "--out-md") {
      outMarkdown = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg === "--tasks-json") {
      tasksJson = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      console.log(usage());
      process.exit(0);
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  return { json, reportJson, outJson, outReportJson, outMarkdown, tasksJson };
}

function ensureParent(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readTaskSpecs(filePath: string): RuntimeDogfoodTaskSpec[] {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  const tasks = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).tasks)
      ? (raw as Record<string, unknown>).tasks
      : null;
  if (!tasks) {
    throw new Error("tasks-json must contain an array or an object with a tasks array");
  }
  return tasks as RuntimeDogfoodTaskSpec[];
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const tasks = options.tasksJson
    ? runtimeDogfoodTasksFromSpecs(readTaskSpecs(options.tasksJson))
    : undefined;
  const result = runRuntimeDogfoodSuite(tasks);
  if (options.outJson) {
    ensureParent(options.outJson);
    fs.writeFileSync(options.outJson, `${JSON.stringify(result, null, 2)}\n`);
  }
  if (options.outReportJson) {
    ensureParent(options.outReportJson);
    fs.writeFileSync(options.outReportJson, `${JSON.stringify(result.report, null, 2)}\n`);
  }
  if (options.outMarkdown) {
    ensureParent(options.outMarkdown);
    fs.writeFileSync(options.outMarkdown, formatRuntimeDogfoodMarkdown(result));
  }
  if (options.reportJson) {
    console.log(JSON.stringify(result.report, null, 2));
  } else if (options.json) {
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

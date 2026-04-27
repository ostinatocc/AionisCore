import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { formatRuntimeDogfoodMarkdown } from "./lib/lite-runtime-dogfood.ts";
import {
  runRuntimeDogfoodExternalProbe,
  runtimeDogfoodExternalProbeSlices,
  type RuntimeDogfoodExternalProbeSlice,
} from "./lib/lite-runtime-dogfood-external-probe.ts";

type CliOptions = {
  json: boolean;
  reportJson: boolean;
  gateJson: boolean;
  requireLiveReadiness: boolean;
  listSlices: boolean;
  slices: RuntimeDogfoodExternalProbeSlice[];
  outJson: string | null;
  outReportJson: string | null;
  outGateJson: string | null;
  outMarkdown: string | null;
  outTasksJson: string | null;
  port: number | null;
};

function usage(): string {
  return [
    "Usage:",
    "  npx tsx scripts/lite-runtime-dogfood-external-probe.ts [--json|--report-json|--gate-json] [--require-live-readiness] [--list-slices] [--slice service_after_exit] [--port 43000] [--out-json /path/result.json] [--out-report-json /path/report.json] [--out-gate-json /path/gate.json] [--out-md /path/result.md] [--out-tasks-json /path/tasks.json]",
    "",
    "Runs Runtime dogfood slices backed by live fresh-shell external probe evidence for service, publish/install, deploy/web, interrupted resume, handoff, and agent takeover task families.",
  ].join("\n");
}

function parseSliceValue(value: string): RuntimeDogfoodExternalProbeSlice[] {
  const available = new Set<string>(runtimeDogfoodExternalProbeSlices);
  return value.split(",").map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    if (!available.has(entry)) {
      throw new Error(`invalid --slice: ${entry}. Available slices: ${runtimeDogfoodExternalProbeSlices.join(", ")}`);
    }
    return entry as RuntimeDogfoodExternalProbeSlice;
  });
}

function parseArgs(argv: string[]): CliOptions {
  let json = false;
  let reportJson = false;
  let gateJson = false;
  let requireLiveReadiness = false;
  let listSlices = false;
  const slices: RuntimeDogfoodExternalProbeSlice[] = [];
  let outJson: string | null = null;
  let outReportJson: string | null = null;
  let outGateJson: string | null = null;
  let outMarkdown: string | null = null;
  let outTasksJson: string | null = null;
  let port: number | null = null;
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
    if (arg === "--gate-json") {
      gateJson = true;
      continue;
    }
    if (arg === "--require-live-readiness") {
      requireLiveReadiness = true;
      continue;
    }
    if (arg === "--list-slices") {
      listSlices = true;
      continue;
    }
    if (arg === "--slice") {
      const raw = argv[i + 1] ?? "";
      if (!raw) throw new Error("missing value for --slice");
      slices.push(...parseSliceValue(raw));
      i += 1;
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
    if (arg === "--out-gate-json") {
      outGateJson = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg === "--out-md") {
      outMarkdown = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg === "--out-tasks-json") {
      outTasksJson = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg === "--port") {
      const parsed = Number.parseInt(argv[i + 1] ?? "", 10);
      if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`invalid --port: ${argv[i + 1] ?? ""}`);
      port = parsed;
      i += 1;
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      console.log(usage());
      process.exit(0);
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  return { json, reportJson, gateJson, requireLiveReadiness, listSlices, slices, outJson, outReportJson, outGateJson, outMarkdown, outTasksJson, port };
}

function ensureParent(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.listSlices) {
    console.log(runtimeDogfoodExternalProbeSlices.join("\n"));
    return;
  }
  const run = await runRuntimeDogfoodExternalProbe({
    port: options.port ?? undefined,
    slices: options.slices.length > 0 ? options.slices : undefined,
  });
  if (options.outJson) {
    ensureParent(options.outJson);
    fs.writeFileSync(options.outJson, `${JSON.stringify(run, null, 2)}\n`);
  }
  if (options.outReportJson) {
    ensureParent(options.outReportJson);
    fs.writeFileSync(options.outReportJson, `${JSON.stringify(run.dogfood_result.report, null, 2)}\n`);
  }
  if (options.outGateJson) {
    ensureParent(options.outGateJson);
    fs.writeFileSync(options.outGateJson, `${JSON.stringify(run.dogfood_result.report.readiness_gate, null, 2)}\n`);
  }
  if (options.outTasksJson) {
    ensureParent(options.outTasksJson);
    fs.writeFileSync(options.outTasksJson, `${JSON.stringify({ tasks: run.task_specs }, null, 2)}\n`);
  }
  if (options.outMarkdown) {
    ensureParent(options.outMarkdown);
    fs.writeFileSync(options.outMarkdown, formatRuntimeDogfoodMarkdown(run.dogfood_result));
  }
  if (options.gateJson) {
    console.log(JSON.stringify(run.dogfood_result.report.readiness_gate, null, 2));
  } else if (options.reportJson) {
    console.log(JSON.stringify(run.dogfood_result.report, null, 2));
  } else if (options.json) {
    console.log(JSON.stringify(run, null, 2));
  } else {
    console.log(formatRuntimeDogfoodMarkdown(run.dogfood_result));
  }
  if (run.dogfood_result.overall_status !== "pass" || !run.fresh_shell_probe_passed) {
    process.exitCode = 1;
  }
  if (options.requireLiveReadiness && run.dogfood_result.report.readiness_gate.live_product_status !== "pass") {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

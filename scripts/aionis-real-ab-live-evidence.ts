import fs from "node:fs";
import path from "node:path";
import {
  assembleRealAbDogfoodPairedCaptureFromLiveEvidence,
  validateRealAbLiveEvidenceAssemblerInputs,
  type RealAbLiveEvidenceAgentEventsFile,
  type RealAbLiveEvidenceLoadedInputs,
  type RealAbLiveEvidenceManifest,
} from "./lib/aionis-real-ab-live-evidence-assembler.ts";
import {
  compileRealAbDogfoodPairedCapture,
  validateRealAbDogfoodPairedCapture,
} from "./lib/aionis-real-ab-dogfood-capture.ts";
import {
  compileRealAbTraceCapture,
  validateRealAbTraceCapture,
} from "./lib/aionis-real-ab-trace-capture.ts";
import {
  realAbRequiredArms,
  renderRealAbMarkdownReport,
  runRealAbValidationSuite,
  type RealAbArm,
  type RealAbTraceEvent,
} from "./lib/aionis-real-ab-validation.ts";
import type { RuntimeDogfoodExternalProbeRun } from "./lib/lite-runtime-dogfood-external-probe.ts";

type CliOptions = {
  manifestPath: string | null;
  outPaired: string | null;
  outCapture: string | null;
  outReportJson: string | null;
  outReportMarkdown: string | null;
  printReport: boolean;
  failOnInvalid: boolean;
};

function printHelp() {
  process.stdout.write(`Aionis real A/B live evidence assembler\n\nUsage:\n  npx tsx scripts/aionis-real-ab-live-evidence.ts --manifest path/to/manifest.json\n\nFlags:\n  --manifest <path>       Read a manifest that references four arm dogfood run JSON files and agent event JSON files.\n  --out-paired <path>     Write compiled dogfood paired capture JSON.\n  --out-capture <path>    Write compiled aionis_real_ab_trace_capture_v1 JSON.\n  --out-report-json <path> Write validation report JSON.\n  --out-report-md <path>  Write validation report Markdown.\n  --report                Print validation report Markdown instead of paired JSON.\n  --fail-on-invalid       Exit non-zero when any assembler/dogfood/capture/validation gate fails.\n  --help                  Show this help.\n`);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    manifestPath: null,
    outPaired: null,
    outCapture: null,
    outReportJson: null,
    outReportMarkdown: null,
    printReport: false,
    failOnInvalid: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--manifest":
        options.manifestPath = argv[++index] ?? null;
        break;
      case "--out-paired":
        options.outPaired = argv[++index] ?? null;
        break;
      case "--out-capture":
        options.outCapture = argv[++index] ?? null;
        break;
      case "--out-report-json":
        options.outReportJson = argv[++index] ?? null;
        break;
      case "--out-report-md":
        options.outReportMarkdown = argv[++index] ?? null;
        break;
      case "--report":
        options.printReport = true;
        break;
      case "--fail-on-invalid":
        options.failOnInvalid = true;
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

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function resolveFromManifestDir(manifestPath: string, targetPath: string): string {
  if (path.isAbsolute(targetPath)) return targetPath;
  return path.resolve(path.dirname(manifestPath), targetPath);
}

function loadInputs(manifestPath: string, manifest: RealAbLiveEvidenceManifest): RealAbLiveEvidenceLoadedInputs {
  const loaded = {} as RealAbLiveEvidenceLoadedInputs;
  for (const arm of realAbRequiredArms) {
    const armManifest = manifest.arms[arm];
    loaded[arm as RealAbArm] = {
      dogfood_run: readJson<RuntimeDogfoodExternalProbeRun>(
        resolveFromManifestDir(manifestPath, armManifest.dogfood_run_path),
      ),
      agent_events: readJson<RealAbLiveEvidenceAgentEventsFile | Record<string, RealAbTraceEvent[]>>(
        resolveFromManifestDir(manifestPath, armManifest.agent_events_path),
      ),
    };
  }
  return loaded;
}

function printFailedGate(name: string, failed: { id: string; message: string }[]) {
  if (failed.length === 0) return;
  process.stderr.write(`${name} failed:\n`);
  for (const requirement of failed) {
    process.stderr.write(`- ${requirement.id}: ${requirement.message}\n`);
  }
}

const options = parseArgs(process.argv.slice(2));
const manifestPath = path.resolve(options.manifestPath ?? "");
const manifest = readJson<RealAbLiveEvidenceManifest>(manifestPath);
const loaded = loadInputs(manifestPath, manifest);
const assemblerRequirements = validateRealAbLiveEvidenceAssemblerInputs({ manifest, loaded });
const paired = assembleRealAbDogfoodPairedCaptureFromLiveEvidence({ manifest, loaded });
const dogfoodRequirements = validateRealAbDogfoodPairedCapture(paired);
const capture = compileRealAbDogfoodPairedCapture(paired);
const captureRequirements = validateRealAbTraceCapture(capture);
const suite = compileRealAbTraceCapture(capture);
const report = runRealAbValidationSuite(suite);
const markdown = renderRealAbMarkdownReport(report);

const failedAssemblerRequirements = assemblerRequirements.filter((requirement) => requirement.status === "fail");
const failedDogfoodRequirements = dogfoodRequirements.filter((requirement) => requirement.status === "fail");
const failedCaptureRequirements = captureRequirements.filter((requirement) => requirement.status === "fail");

if (options.outPaired) {
  const outPath = path.resolve(options.outPaired);
  ensureParent(outPath);
  fs.writeFileSync(outPath, `${JSON.stringify(paired, null, 2)}\n`);
}

if (options.outCapture) {
  const outPath = path.resolve(options.outCapture);
  ensureParent(outPath);
  fs.writeFileSync(outPath, `${JSON.stringify(capture, null, 2)}\n`);
}

if (options.outReportJson) {
  const outPath = path.resolve(options.outReportJson);
  ensureParent(outPath);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
}

if (options.outReportMarkdown) {
  const outPath = path.resolve(options.outReportMarkdown);
  ensureParent(outPath);
  fs.writeFileSync(outPath, markdown);
}

if (options.printReport) {
  process.stdout.write(markdown);
} else {
  process.stdout.write(`${JSON.stringify(paired, null, 2)}\n`);
}

printFailedGate("Live evidence assembler gate", failedAssemblerRequirements);
printFailedGate("Dogfood paired capture gate", failedDogfoodRequirements);
printFailedGate("Trace capture gate", failedCaptureRequirements);

if (
  options.failOnInvalid
  && (
    failedAssemblerRequirements.length > 0
    || failedDogfoodRequirements.length > 0
    || failedCaptureRequirements.length > 0
    || report.gate.status !== "pass"
  )
) {
  process.exitCode = 1;
}

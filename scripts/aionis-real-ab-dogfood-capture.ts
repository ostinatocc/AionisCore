import fs from "node:fs";
import path from "node:path";
import {
  compileRealAbDogfoodPairedCapture,
  validateRealAbDogfoodPairedCapture,
  type RealAbDogfoodPairedCaptureInput,
} from "./lib/aionis-real-ab-dogfood-capture.ts";
import {
  compileRealAbTraceCapture,
  validateRealAbTraceCapture,
} from "./lib/aionis-real-ab-trace-capture.ts";
import {
  renderRealAbMarkdownReport,
  runRealAbValidationSuite,
} from "./lib/aionis-real-ab-validation.ts";

type CliOptions = {
  pairedPath: string | null;
  outCapture: string | null;
  outReportJson: string | null;
  outReportMarkdown: string | null;
  printReport: boolean;
  failOnInvalid: boolean;
};

function printHelp() {
  process.stdout.write(`Aionis real A/B dogfood capture\n\nUsage:\n  npx tsx scripts/aionis-real-ab-dogfood-capture.ts --paired path/to/paired-dogfood.json\n\nFlags:\n  --paired <path>         Read paired dogfood external-probe runs for all four A/B arms.\n  --out-capture <path>    Write compiled aionis_real_ab_trace_capture_v1 JSON.\n  --out-report-json <path> Write validation report JSON.\n  --out-report-md <path>  Write validation report Markdown.\n  --report                Print validation report Markdown instead of capture JSON.\n  --fail-on-invalid       Exit non-zero when dogfood/capture/validation gates fail.\n  --help                  Show this help.\n`);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    pairedPath: null,
    outCapture: null,
    outReportJson: null,
    outReportMarkdown: null,
    printReport: false,
    failOnInvalid: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--paired":
        options.pairedPath = argv[++index] ?? null;
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

  if (!options.pairedPath) {
    throw new Error("--paired is required");
  }

  return options;
}

function ensureParent(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readPaired(pathValue: string): RealAbDogfoodPairedCaptureInput {
  return JSON.parse(fs.readFileSync(path.resolve(pathValue), "utf8")) as RealAbDogfoodPairedCaptureInput;
}

const options = parseArgs(process.argv.slice(2));
const paired = readPaired(options.pairedPath ?? "");
const dogfoodRequirements = validateRealAbDogfoodPairedCapture(paired);
const capture = compileRealAbDogfoodPairedCapture(paired);
const captureRequirements = validateRealAbTraceCapture(capture);
const suite = compileRealAbTraceCapture(capture);
const report = runRealAbValidationSuite(suite);
const markdown = renderRealAbMarkdownReport(report);

const failedDogfoodRequirements = dogfoodRequirements.filter((requirement) => requirement.status === "fail");
const failedCaptureRequirements = captureRequirements.filter((requirement) => requirement.status === "fail");

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
  process.stdout.write(`${JSON.stringify(capture, null, 2)}\n`);
}

if (failedDogfoodRequirements.length > 0) {
  process.stderr.write("Dogfood paired capture gate failed:\n");
  for (const requirement of failedDogfoodRequirements) {
    process.stderr.write(`- ${requirement.id}: ${requirement.message}\n`);
  }
}

if (failedCaptureRequirements.length > 0) {
  process.stderr.write("Trace capture gate failed:\n");
  for (const requirement of failedCaptureRequirements) {
    process.stderr.write(`- ${requirement.id}: ${requirement.message}\n`);
  }
}

if (
  options.failOnInvalid
  && (failedDogfoodRequirements.length > 0 || failedCaptureRequirements.length > 0 || report.gate.status !== "pass")
) {
  process.exitCode = 1;
}

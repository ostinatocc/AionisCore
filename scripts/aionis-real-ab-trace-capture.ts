import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  compileRealAbTraceCapture,
  validateRealAbTraceCapture,
  type RealAbTraceCaptureInput,
} from "./lib/aionis-real-ab-trace-capture.ts";
import {
  renderRealAbMarkdownReport,
  runRealAbValidationSuite,
} from "./lib/aionis-real-ab-validation.ts";

type CliOptions = {
  capturePath: string | null;
  useSample: boolean;
  outSuite: string | null;
  outReportJson: string | null;
  outReportMarkdown: string | null;
  printReport: boolean;
  failOnInvalid: boolean;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const samplePath = path.join(repoRoot, "scripts", "fixtures", "real-ab-validation", "trace-capture.json");

function printHelp() {
  process.stdout.write(`Aionis real A/B trace capture\n\nUsage:\n  npx tsx scripts/aionis-real-ab-trace-capture.ts --sample\n  npx tsx scripts/aionis-real-ab-trace-capture.ts --capture path/to/capture.json --out-suite /tmp/suite.json\n\nFlags:\n  --sample                 Use the bundled capture fixture.\n  --capture <path>         Read a trace capture JSON file.\n  --out-suite <path>       Write the compiled validation suite JSON.\n  --out-report-json <path> Write the validation report JSON.\n  --out-report-md <path>   Write the validation report Markdown.\n  --report                 Print the validation report Markdown instead of the compiled suite JSON.\n  --fail-on-invalid        Exit non-zero when capture or validation gates fail.\n  --help                   Show this help.\n`);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    capturePath: null,
    useSample: false,
    outSuite: null,
    outReportJson: null,
    outReportMarkdown: null,
    printReport: false,
    failOnInvalid: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--sample":
        options.useSample = true;
        break;
      case "--capture":
        options.capturePath = argv[++index] ?? null;
        break;
      case "--out-suite":
        options.outSuite = argv[++index] ?? null;
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

  if (!options.useSample && !options.capturePath) {
    options.useSample = true;
  }

  if (options.useSample && options.capturePath) {
    throw new Error("Use either --sample or --capture, not both");
  }

  return options;
}

function ensureParent(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readCapture(options: CliOptions): RealAbTraceCaptureInput {
  const sourcePath = options.capturePath ? path.resolve(options.capturePath) : samplePath;
  return JSON.parse(fs.readFileSync(sourcePath, "utf8")) as RealAbTraceCaptureInput;
}

const options = parseArgs(process.argv.slice(2));
const capture = readCapture(options);
const captureRequirements = validateRealAbTraceCapture(capture);
const suite = compileRealAbTraceCapture(capture);
const report = runRealAbValidationSuite(suite);
const markdown = renderRealAbMarkdownReport(report);
const failedCaptureRequirements = captureRequirements.filter((requirement) => requirement.status === "fail");

if (options.outSuite) {
  const outPath = path.resolve(options.outSuite);
  ensureParent(outPath);
  fs.writeFileSync(outPath, `${JSON.stringify(suite, null, 2)}\n`);
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
  process.stdout.write(`${JSON.stringify(suite, null, 2)}\n`);
}

if (failedCaptureRequirements.length > 0) {
  process.stderr.write("Trace capture gate failed:\n");
  for (const requirement of failedCaptureRequirements) {
    process.stderr.write(`- ${requirement.id}: ${requirement.message}\n`);
  }
}

if (options.failOnInvalid && (failedCaptureRequirements.length > 0 || report.gate.status !== "pass")) {
  process.exitCode = 1;
}

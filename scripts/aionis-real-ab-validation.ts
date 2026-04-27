import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderRealAbMarkdownReport,
  runRealAbValidationSuite,
  type RealAbSuiteInput,
} from "./lib/aionis-real-ab-validation.ts";

type CliOptions = {
  specPath: string | null;
  useSeed: boolean;
  outJson: string | null;
  outMarkdown: string | null;
  printJson: boolean;
  failOnRegression: boolean;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const seedPath = path.join(repoRoot, "scripts", "fixtures", "real-ab-validation", "seed-suite.json");

function printHelp() {
  process.stdout.write(`Aionis real A/B validation\n\nUsage:\n  npx tsx scripts/aionis-real-ab-validation.ts --seed [--json]\n  npx tsx scripts/aionis-real-ab-validation.ts --spec path/to/spec.json\n\nFlags:\n  --seed                 Use the bundled harness calibration suite.\n  --spec <path>          Read a real A/B suite JSON file.\n  --out-json <path>      Write the report JSON.\n  --out-markdown <path>  Write the Markdown report.\n  --json                 Print report JSON to stdout instead of Markdown.\n  --fail-on-regression   Exit non-zero when the A/B gate fails.\n  --help                 Show this help.\n`);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    specPath: null,
    useSeed: false,
    outJson: null,
    outMarkdown: null,
    printJson: false,
    failOnRegression: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--seed":
        options.useSeed = true;
        break;
      case "--spec":
        options.specPath = argv[++index] ?? null;
        break;
      case "--out-json":
        options.outJson = argv[++index] ?? null;
        break;
      case "--out-markdown":
        options.outMarkdown = argv[++index] ?? null;
        break;
      case "--json":
        options.printJson = true;
        break;
      case "--fail-on-regression":
        options.failOnRegression = true;
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

  if (!options.useSeed && !options.specPath) {
    options.useSeed = true;
  }

  if (options.useSeed && options.specPath) {
    throw new Error("Use either --seed or --spec, not both");
  }

  return options;
}

function ensureParent(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readSuite(options: CliOptions): RealAbSuiteInput {
  const sourcePath = options.specPath ? path.resolve(options.specPath) : seedPath;
  return JSON.parse(fs.readFileSync(sourcePath, "utf8")) as RealAbSuiteInput;
}

const options = parseArgs(process.argv.slice(2));
const suite = readSuite(options);
const report = runRealAbValidationSuite(suite);
const markdown = renderRealAbMarkdownReport(report);

if (options.outJson) {
  const outPath = path.resolve(options.outJson);
  ensureParent(outPath);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
}

if (options.outMarkdown) {
  const outPath = path.resolve(options.outMarkdown);
  ensureParent(outPath);
  fs.writeFileSync(outPath, markdown);
}

if (options.printJson) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  process.stdout.write(markdown);
}

if (options.failOnRegression && report.gate.status !== "pass") {
  process.exitCode = 1;
}


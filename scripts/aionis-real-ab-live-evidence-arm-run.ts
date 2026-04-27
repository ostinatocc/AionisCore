import fs from "node:fs";
import path from "node:path";
import {
  buildRealAbLiveEvidenceArmRunPacket,
  renderRealAbLiveEvidenceArmRunPacketMarkdown,
} from "./lib/aionis-real-ab-live-evidence-arm-run-packet.ts";
import {
  realAbRequiredArms,
  type RealAbArm,
} from "./lib/aionis-real-ab-validation.ts";
import type {
  RealAbLiveEvidenceManifest,
} from "./lib/aionis-real-ab-live-evidence-assembler.ts";

type CliOptions = {
  manifestPath: string | null;
  arm: RealAbArm | null;
  outJson: string | null;
  outMarkdown: string | null;
  printMarkdown: boolean;
};

function printHelp() {
  process.stdout.write(`Aionis real A/B live evidence arm run packet

Usage:
  npx tsx scripts/aionis-real-ab-live-evidence-arm-run.ts --manifest .artifacts/real-ab/first-live-2026-04-27/manifest.json --arm aionis_assisted --md

Flags:
  --manifest <path>       Live evidence manifest.
  --arm <arm>             baseline, aionis_assisted, negative_control, or positive_control.
  --out-json <path>       Write the arm run packet JSON.
  --out-md <path>         Write a Markdown runbook.
  --md                    Print Markdown instead of JSON.
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

function parseArm(value: string): RealAbArm {
  if ((realAbRequiredArms as readonly string[]).includes(value)) {
    return value as RealAbArm;
  }
  throw new Error(`--arm must be one of: ${realAbRequiredArms.join(", ")}`);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    manifestPath: null,
    arm: null,
    outJson: null,
    outMarkdown: null,
    printMarkdown: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--manifest":
        options.manifestPath = readValue(argv, index, arg);
        index += 1;
        break;
      case "--arm":
        options.arm = parseArm(readValue(argv, index, arg));
        index += 1;
        break;
      case "--out-json":
        options.outJson = readValue(argv, index, arg);
        index += 1;
        break;
      case "--out-md":
        options.outMarkdown = readValue(argv, index, arg);
        index += 1;
        break;
      case "--md":
        options.printMarkdown = true;
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
  if (!options.arm) {
    throw new Error("--arm is required");
  }
  return options;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function ensureParent(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

const options = parseArgs(process.argv.slice(2));
const manifestPath = path.resolve(options.manifestPath ?? "");
const manifest = readJson<RealAbLiveEvidenceManifest>(manifestPath);
const packet = buildRealAbLiveEvidenceArmRunPacket({
  manifest,
  manifest_path: manifestPath,
  arm: options.arm ?? "baseline",
});
const packetJson = `${JSON.stringify(packet, null, 2)}\n`;
const packetMarkdown = renderRealAbLiveEvidenceArmRunPacketMarkdown(packet);

if (options.outJson) {
  const outPath = path.resolve(options.outJson);
  ensureParent(outPath);
  fs.writeFileSync(outPath, packetJson);
}
if (options.outMarkdown) {
  const outPath = path.resolve(options.outMarkdown);
  ensureParent(outPath);
  fs.writeFileSync(outPath, packetMarkdown);
}

if (options.printMarkdown) {
  process.stdout.write(packetMarkdown);
} else {
  process.stdout.write(packetJson);
}

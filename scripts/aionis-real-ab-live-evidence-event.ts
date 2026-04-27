import fs from "node:fs";
import path from "node:path";
import {
  appendRealAbLiveEvidenceAgentEvent,
  type RealAbLiveEvidenceEventDraft,
} from "./lib/aionis-real-ab-live-evidence-event-recorder.ts";
import {
  realAbRequiredArms,
  type RealAbArm,
  type RealAbTraceEvent,
  type RealAbTraceEventKind,
} from "./lib/aionis-real-ab-validation.ts";
import type {
  RealAbLiveEvidenceAgentEventsFile,
  RealAbLiveEvidenceManifest,
} from "./lib/aionis-real-ab-live-evidence-assembler.ts";

type CliOptions = {
  manifestPath: string | null;
  arm: RealAbArm | null;
  eventsPath: string | null;
  probeId: string | null;
  event: RealAbLiveEvidenceEventDraft;
  dryRun: boolean;
};

const allowedKinds: RealAbTraceEventKind[] = [
  "action",
  "tool_call",
  "verification",
  "external_probe",
  "agent_claim",
  "retry",
  "human_intervention",
];

function printHelp() {
  process.stdout.write(`Aionis real A/B live evidence event recorder

Usage:
  npx tsx scripts/aionis-real-ab-live-evidence-event.ts --manifest .artifacts/real-ab/first-live-2026-04-27/manifest.json --arm aionis_assisted --probe external_probe_service_after_exit --kind tool_call --command "nohup node scripts/server.mjs &" --touched-file scripts/server.mjs --correct

Flags:
  --manifest <path>       Resolve the arm agent-events file from a live evidence manifest.
  --arm <arm>             baseline, aionis_assisted, negative_control, or positive_control.
  --events <path>         Write directly to an agent-events JSON file instead of using --manifest/--arm.
  --probe <id>            Dogfood probe id whose event list should receive the event.
  --kind <kind>           Event kind: action, tool_call, verification, external_probe, agent_claim, retry, human_intervention.
  --text <text>           Natural-language action or claim text.
  --command <command>     Shell/tool command for tool_call or action events.
  --touched-file <path>   File touched by the event. Can be repeated.
  --touched-files <paths> Comma-separated touched files.
  --timestamp-ms <n>      Optional timestamp offset.
  --tokens <n>            Optional token count.
  --correct               Mark event as correct.
  --incorrect             Mark event as incorrect.
  --wasted                Mark event as wasted/noisy.
  --not-wasted            Mark event as not wasted.
  --retry                 Mark retry signal.
  --success               Mark verifier/action success.
  --failure               Mark verifier/action failure.
  --verifier              Mark verifier event.
  --after-exit            Mark after-exit evidence.
  --fresh-shell           Mark fresh-shell evidence.
  --claimed-success       Mark an agent success claim.
  --false-confidence      Mark a false-confidence signal.
  --human-intervention    Mark human intervention.
  --dry-run               Print the updated JSON without writing.
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

function parseKind(value: string): RealAbTraceEventKind {
  if ((allowedKinds as readonly string[]).includes(value)) {
    return value as RealAbTraceEventKind;
  }
  throw new Error(`--kind must be one of: ${allowedKinds.join(", ")}`);
}

function parseNumber(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a non-negative number`);
  }
  return parsed;
}

function addTouchedFiles(event: RealAbLiveEvidenceEventDraft, value: string) {
  event.touched_files = event.touched_files ?? [];
  for (const filePath of value.split(",")) {
    const trimmed = filePath.trim();
    if (trimmed.length > 0) event.touched_files.push(trimmed);
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    manifestPath: null,
    arm: null,
    eventsPath: null,
    probeId: null,
    event: {
      kind: "action",
    },
    dryRun: false,
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
      case "--events":
        options.eventsPath = readValue(argv, index, arg);
        index += 1;
        break;
      case "--probe":
        options.probeId = readValue(argv, index, arg);
        index += 1;
        break;
      case "--kind":
        options.event.kind = parseKind(readValue(argv, index, arg));
        index += 1;
        break;
      case "--text":
        options.event.text = readValue(argv, index, arg);
        index += 1;
        break;
      case "--command":
        options.event.command = readValue(argv, index, arg);
        index += 1;
        break;
      case "--touched-file":
      case "--touched-files":
        addTouchedFiles(options.event, readValue(argv, index, arg));
        index += 1;
        break;
      case "--timestamp-ms":
        options.event.timestamp_ms = parseNumber(readValue(argv, index, arg), arg);
        index += 1;
        break;
      case "--tokens":
        options.event.tokens = parseNumber(readValue(argv, index, arg), arg);
        index += 1;
        break;
      case "--correct":
        options.event.correct = true;
        break;
      case "--incorrect":
        options.event.correct = false;
        break;
      case "--wasted":
        options.event.wasted = true;
        break;
      case "--not-wasted":
        options.event.wasted = false;
        break;
      case "--retry":
        options.event.retry = true;
        break;
      case "--success":
        options.event.success = true;
        break;
      case "--failure":
        options.event.success = false;
        break;
      case "--verifier":
        options.event.verifier = true;
        break;
      case "--after-exit":
        options.event.after_exit = true;
        break;
      case "--fresh-shell":
        options.event.fresh_shell = true;
        break;
      case "--claimed-success":
        options.event.claimed_success = true;
        break;
      case "--false-confidence":
        options.event.false_confidence = true;
        break;
      case "--human-intervention":
        options.event.human_intervention = true;
        break;
      case "--dry-run":
        options.dryRun = true;
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

  if (!options.probeId) {
    throw new Error("--probe is required");
  }
  if (!options.eventsPath && (!options.manifestPath || !options.arm)) {
    throw new Error("provide either --events or both --manifest and --arm");
  }
  return options;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function resolveFromManifest(manifestPath: string, targetPath: string): string {
  if (path.isAbsolute(targetPath)) return targetPath;
  return path.resolve(path.dirname(manifestPath), targetPath);
}

function resolveEventsPath(options: CliOptions): string {
  if (options.eventsPath) {
    return path.resolve(options.eventsPath);
  }
  const manifestPath = path.resolve(options.manifestPath ?? "");
  const manifest = readJson<RealAbLiveEvidenceManifest>(manifestPath);
  const arm = options.arm;
  if (!arm) {
    throw new Error("--arm is required when using --manifest");
  }
  return resolveFromManifest(manifestPath, manifest.arms[arm].agent_events_path);
}

const options = parseArgs(process.argv.slice(2));
const eventsPath = resolveEventsPath(options);
const eventsFile = readJson<RealAbLiveEvidenceAgentEventsFile | Record<string, RealAbTraceEvent[]>>(eventsPath);
const updated = appendRealAbLiveEvidenceAgentEvent({
  events_file: eventsFile,
  probe_id: options.probeId ?? "",
  event: options.event,
});
const serialized = `${JSON.stringify(updated, null, 2)}\n`;

if (options.dryRun) {
  process.stdout.write(serialized);
} else {
  fs.writeFileSync(eventsPath, serialized);
  process.stdout.write(`Recorded ${options.event.kind} event for ${options.probeId} in ${eventsPath}\n`);
}

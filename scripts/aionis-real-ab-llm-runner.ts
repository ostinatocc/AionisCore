import fs from "node:fs";
import path from "node:path";
import {
  applyRealAbLlmArmAttemptToAgentEvents,
  buildRealAbLlmArmPrompt,
  runRealAbLlmArmAttempt,
} from "./lib/aionis-real-ab-llm-runner.ts";
import {
  realAbRequiredArms,
  type RealAbArm,
  type RealAbTraceEvent,
} from "./lib/aionis-real-ab-validation.ts";
import type {
  RealAbLiveEvidenceAgentEventsFile,
  RealAbLiveEvidenceManifest,
} from "./lib/aionis-real-ab-live-evidence-assembler.ts";

type CliOptions = {
  manifestPath: string | null;
  arm: RealAbArm | null;
  probeId: string | null;
  command: string | null;
  eventsPath: string | null;
  cwd: string | null;
  timeoutMs: number;
  outJson: string | null;
  dryRun: boolean;
};

function printHelp() {
  process.stdout.write(`Aionis real A/B LLM/agent arm runner

Usage:
  npx tsx scripts/aionis-real-ab-llm-runner.ts --manifest .artifacts/real-ab/run/manifest.json --arm aionis_assisted --probe external_probe_service_after_exit --command "codex exec ..."

Flags:
  --manifest <path>       Live evidence manifest JSON.
  --arm <arm>             baseline, aionis_assisted, negative_control, or positive_control.
  --probe <id>            Dogfood probe id this command will execute.
  --command <command>     Shell command for the external LLM/agent CLI.
  --events <path>         Optional agent-events JSON override. Defaults to manifest arm agent_events_path.
  --cwd <path>            Optional command working directory. Defaults to current repo/process cwd.
  --timeout-ms <n>        Command timeout. Defaults to 300000.
  --out-json <path>       Optional run result JSON path.
  --dry-run               Print the generated agent prompt and resolved paths without running.
  --help                  Show this help.

The command receives these environment variables:
  AIONIS_AB_PROMPT, AIONIS_AB_ARM, AIONIS_AB_PROBE_ID, AIONIS_AB_SUITE_ID,
  AIONIS_AB_MEMORY_MODE, AIONIS_AB_AUTHORITY_LEVEL, AIONIS_AB_PACKET_SOURCE,
  AIONIS_AB_MANIFEST_PATH, AIONIS_AB_AGENT_EVENTS_PATH

The command must print JSON only:
  {"output_version":"aionis_real_ab_llm_agent_output_v1","probe_id":"...","events":[{"kind":"action","text":"..."}]}
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

function parseNonNegativeNumber(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a non-negative number`);
  }
  return parsed;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    manifestPath: null,
    arm: null,
    probeId: null,
    command: null,
    eventsPath: null,
    cwd: null,
    timeoutMs: 300_000,
    outJson: null,
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
      case "--probe":
        options.probeId = readValue(argv, index, arg);
        index += 1;
        break;
      case "--command":
        options.command = readValue(argv, index, arg);
        index += 1;
        break;
      case "--events":
        options.eventsPath = readValue(argv, index, arg);
        index += 1;
        break;
      case "--cwd":
        options.cwd = readValue(argv, index, arg);
        index += 1;
        break;
      case "--timeout-ms":
        options.timeoutMs = parseNonNegativeNumber(readValue(argv, index, arg), arg);
        index += 1;
        break;
      case "--out-json":
        options.outJson = readValue(argv, index, arg);
        index += 1;
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

  if (!options.manifestPath) throw new Error("--manifest is required");
  if (!options.arm) throw new Error("--arm is required");
  if (!options.probeId) throw new Error("--probe is required");
  if (!options.command && !options.dryRun) throw new Error("--command is required unless --dry-run is set");
  return options;
}

function ensureParent(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, value: unknown) {
  ensureParent(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function resolveFromManifestDir(manifestPath: string, targetPath: string): string {
  if (path.isAbsolute(targetPath)) return targetPath;
  return path.resolve(path.dirname(manifestPath), targetPath);
}

function resolveEventsPath(args: {
  options: CliOptions;
  manifestPath: string;
  manifest: RealAbLiveEvidenceManifest;
}): string {
  if (args.options.eventsPath) {
    return path.resolve(args.options.eventsPath);
  }
  const arm = args.options.arm;
  if (!arm) {
    throw new Error("--arm is required");
  }
  return resolveFromManifestDir(args.manifestPath, args.manifest.arms[arm].agent_events_path);
}

function readEventsFile(eventsPath: string): RealAbLiveEvidenceAgentEventsFile | Record<string, RealAbTraceEvent[]> {
  if (!fs.existsSync(eventsPath)) {
    return { events_by_probe_id: {} };
  }
  return readJson<RealAbLiveEvidenceAgentEventsFile | Record<string, RealAbTraceEvent[]>>(eventsPath);
}

const options = parseArgs(process.argv.slice(2));
const manifestPath = path.resolve(options.manifestPath ?? "");
const manifest = readJson<RealAbLiveEvidenceManifest>(manifestPath);
const eventsPath = resolveEventsPath({ options, manifestPath, manifest });
const arm = options.arm;
const probeId = options.probeId;

if (!arm || !probeId) {
  throw new Error("--arm and --probe are required");
}

if (options.dryRun) {
  const prompt = buildRealAbLlmArmPrompt({
    manifest,
    manifest_path: manifestPath,
    arm,
    probe_id: probeId,
  });
  process.stdout.write(`${JSON.stringify({
    dry_run: true,
    manifest_path: manifestPath,
    arm,
    probe_id: probeId,
    events_path: eventsPath,
    cwd: options.cwd ? path.resolve(options.cwd) : process.cwd(),
    prompt,
  }, null, 2)}\n`);
} else {
  const attempt = await runRealAbLlmArmAttempt({
    manifest,
    manifest_path: manifestPath,
    arm,
    probe_id: probeId,
    command: options.command ?? "",
    cwd: options.cwd ? path.resolve(options.cwd) : process.cwd(),
    timeout_ms: options.timeoutMs,
    agent_events_path: eventsPath,
  });
  const existingEvents = readEventsFile(eventsPath);
  const updatedEvents = applyRealAbLlmArmAttemptToAgentEvents({
    events_file: existingEvents,
    attempt,
  });
  writeJson(eventsPath, updatedEvents);

  const result = {
    ...attempt,
    agent_events_path: eventsPath,
    agent_events_patch: updatedEvents,
  };
  if (options.outJson) {
    writeJson(path.resolve(options.outJson), result);
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

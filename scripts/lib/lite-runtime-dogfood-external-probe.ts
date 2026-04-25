import { execFile } from "node:child_process";
import fs from "node:fs";
import net, { type AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  runRuntimeDogfoodSuite,
  runtimeDogfoodTasksFromSpecs,
  type RuntimeDogfoodSuiteResult,
  type RuntimeDogfoodTaskSpec,
} from "./lite-runtime-dogfood.ts";

export type RuntimeDogfoodExternalProbeRun = {
  run_version: "runtime_dogfood_external_probe_run_v1";
  endpoint: string;
  service_pid: number | null;
  launcher_exit_code: number | null;
  fresh_shell_probe_passed: boolean;
  fresh_shell_probe_output: string;
  task_specs: RuntimeDogfoodTaskSpec[];
  dogfood_result: RuntimeDogfoodSuiteResult;
};

type ExternalProbeOptions = {
  port?: number;
};

type CommandResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const serviceRelativePath = "scripts/fixtures/runtime-dogfood/service-after-exit-server.mjs";
const servicePath = path.join(repoRoot, serviceRelativePath);

function execFileResult(command: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: 5000 }, (error, stdout, stderr) => {
      const code = typeof (error as NodeJS.ErrnoException | null)?.code === "number"
        ? (error as NodeJS.ErrnoException).code as number
        : error
          ? 1
          : 0;
      resolve({
        code,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
      });
    });
  });
}

async function findOpenPort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      server.close(() => resolve(address.port));
    });
  });
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function writeLauncher(args: {
  tempDir: string;
  port: number;
  pidFile: string;
}): string {
  const launcherPath = path.join(args.tempDir, "launch-detached-service.mjs");
  fs.writeFileSync(
    launcherPath,
    [
      'import { spawn } from "node:child_process";',
      'import fs from "node:fs";',
      `const child = spawn(process.execPath, [${JSON.stringify(servicePath)}, "--port", ${JSON.stringify(String(args.port))}], { detached: true, stdio: "ignore" });`,
      "child.unref();",
      `fs.writeFileSync(${JSON.stringify(args.pidFile)}, JSON.stringify({ pid: child.pid, launched_at: new Date().toISOString() }) + "\\n");`,
    ].join("\n"),
  );
  return launcherPath;
}

async function probeFreshShell(endpoint: string): Promise<CommandResult> {
  const command = `curl -fsS ${shellQuote(`${endpoint}/healthz`)}`;
  const shell = process.platform === "win32" ? "cmd.exe" : "sh";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", command] : ["-lc", command];
  return await execFileResult(shell, args);
}

async function waitForFreshShellProbe(endpoint: string): Promise<CommandResult> {
  let last: CommandResult = { code: 1, stdout: "", stderr: "probe_not_started" };
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    last = await probeFreshShell(endpoint);
    if (last.code === 0) return last;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return last;
}

function killService(pid: number | null): void {
  if (!pid) return;
  try {
    process.kill(pid, "SIGTERM");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ESRCH") throw error;
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTaskSpec(args: {
  endpoint: string;
  probe: CommandResult;
  servicePid: number | null;
  launcherExitCode: number | null;
}): RuntimeDogfoodTaskSpec {
  const validationPassed = args.probe.code === 0;
  const healthCheck = `curl -fsS ${args.endpoint}/healthz`;
  return {
    id: "external_probe_service_after_exit",
    title: "External probe service after-exit validation",
    query_text: "Keep the Runtime dogfood service alive after the launcher exits and prove it from a fresh shell.",
    evidence_source: "external_probe",
    trajectory: {
      title: "Runtime dogfood detached service validation",
      task_family: "service_publish_validate",
      steps: [
        { role: "assistant", text: "The Runtime dogfood service must survive the launcher process exit and stay externally reachable." },
        {
          role: "tool",
          tool_name: "bash",
          command: `nohup node ${serviceRelativePath} --port ${new URL(args.endpoint).port} >/tmp/aionis-runtime-dogfood-service.log 2>&1 &`,
        },
        { role: "tool", tool_name: "bash", command: healthCheck },
        {
          role: "assistant",
          text: `Update ${serviceRelativePath}, launch it detached, then rerun ${healthCheck} from a fresh shell after the launcher exits.`,
        },
      ],
    },
    execution_evidence: {
      validation_passed: validationPassed,
      after_exit_revalidated: validationPassed,
      fresh_shell_probe_passed: validationPassed,
      failure_reason: validationPassed
        ? null
        : `fresh_shell_probe_failed:${(args.probe.stderr || args.probe.stdout || "unknown").trim().slice(0, 220)}`,
      false_confidence_detected: !validationPassed,
      evidence_refs: [
        `external_probe:fresh_shell:${args.endpoint}/healthz`,
        `launcher_exit_code:${args.launcherExitCode ?? "null"}`,
        `service_pid:${args.servicePid ?? "null"}`,
      ],
    },
    expectations: {
      target_files_include: [serviceRelativePath],
      acceptance_checks_match: [escapeRegex(healthCheck)],
      next_action_match: [escapeRegex(serviceRelativePath), "fresh shell"],
      success_invariants_include: ["fresh_shell_revalidation_passes"],
      dependency_requirements_match: ["service launch must not depend on the agent shell"],
      environment_assumptions_include: [
        "detached_process_supported",
        "fresh_shell_available_for_revalidation",
        "validation_can_run_from_fresh_shell",
      ],
      must_hold_after_exit_include: [
        "task_result_remains_valid_after_agent_exit",
        "fresh_shell_revalidation_still_passes_after_agent_exit",
      ],
      external_visibility_requirements_match: [escapeRegex(`endpoint_reachable:${args.endpoint}/healthz`)],
      service_lifecycle_required: true,
      after_exit_required: true,
      authoritative_gate_allows: true,
      evidence_allows_authoritative: validationPassed,
      stable_promotion_allowed: validationPassed,
      evidence_reasons_include: validationPassed ? [] : ["fresh_shell_probe_failed"],
    },
  };
}

export async function runRuntimeDogfoodExternalProbe(options: ExternalProbeOptions = {}): Promise<RuntimeDogfoodExternalProbeRun> {
  const port = options.port ?? await findOpenPort();
  const endpoint = `http://127.0.0.1:${port}`;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-runtime-dogfood-external-"));
  const pidFile = path.join(tempDir, "service-pid.json");
  let servicePid: number | null = null;
  let launcherExitCode: number | null = null;
  let probe: CommandResult = { code: 1, stdout: "", stderr: "probe_not_run" };

  try {
    const launcherPath = writeLauncher({ tempDir, port, pidFile });
    const launcher = await execFileResult(process.execPath, [launcherPath]);
    launcherExitCode = launcher.code;
    const metadata = JSON.parse(fs.readFileSync(pidFile, "utf8")) as { pid?: unknown };
    servicePid = typeof metadata.pid === "number" ? metadata.pid : null;
    probe = await waitForFreshShellProbe(endpoint);
  } finally {
    killService(servicePid);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const taskSpecs = [buildTaskSpec({ endpoint, probe, servicePid, launcherExitCode })];
  const dogfoodResult = runRuntimeDogfoodSuite(runtimeDogfoodTasksFromSpecs(taskSpecs));
  return {
    run_version: "runtime_dogfood_external_probe_run_v1",
    endpoint,
    service_pid: servicePid,
    launcher_exit_code: launcherExitCode,
    fresh_shell_probe_passed: probe.code === 0,
    fresh_shell_probe_output: probe.stdout.trim(),
    task_specs: taskSpecs,
    dogfood_result: dogfoodResult,
  };
}

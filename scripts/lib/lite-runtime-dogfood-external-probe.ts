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

export type RuntimeDogfoodExternalProbeSlice =
  | "service_after_exit"
  | "publish_install"
  | "deploy_hook_web"
  | "interrupted_resume"
  | "handoff_next_day"
  | "agent_takeover";

export type RuntimeDogfoodExternalProbeScenarioRun = {
  id: string;
  task_family_hint: string;
  endpoint: string;
  service_pid: number | null;
  launcher_exit_code: number | null;
  fresh_shell_probe_passed: boolean;
  fresh_shell_probe_output: string;
  task_spec: RuntimeDogfoodTaskSpec;
};

export type RuntimeDogfoodExternalProbeRun = {
  run_version: "runtime_dogfood_external_probe_run_v1";
  endpoint: string;
  service_pid: number | null;
  launcher_exit_code: number | null;
  fresh_shell_probe_passed: boolean;
  fresh_shell_probe_output: string;
  probes: RuntimeDogfoodExternalProbeScenarioRun[];
  task_specs: RuntimeDogfoodTaskSpec[];
  dogfood_result: RuntimeDogfoodSuiteResult;
};

type ExternalProbeOptions = {
  port?: number;
  slices?: RuntimeDogfoodExternalProbeSlice[];
};

type CommandResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

type ExecFileOptions = {
  timeoutMs?: number;
  cwd?: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const serviceRelativePath = "scripts/fixtures/runtime-dogfood/service-after-exit-server.mjs";
const servicePath = path.join(repoRoot, serviceRelativePath);
const defaultSlices: RuntimeDogfoodExternalProbeSlice[] = [
  "service_after_exit",
  "publish_install",
  "deploy_hook_web",
  "interrupted_resume",
  "handoff_next_day",
  "agent_takeover",
];

let cachedPython: string | null = null;

function execFileResult(command: string, args: string[], options: ExecFileOptions = {}): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile(command, args, {
      cwd: options.cwd,
      timeout: options.timeoutMs ?? 5000,
    }, (error, stdout, stderr) => {
      const errorCode = (error as NodeJS.ErrnoException | null)?.code;
      const code = typeof errorCode === "number"
        ? errorCode
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

async function findOpenPorts(count: number): Promise<number[]> {
  const ports: number[] = [];
  for (let index = 0; index < count; index += 1) {
    ports.push(await findOpenPort());
  }
  return ports;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

async function resolvePython(): Promise<string> {
  if (cachedPython) return cachedPython;
  const candidates = [
    process.env.PYTHON,
    "python3",
    "python",
  ].filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
  for (const candidate of candidates) {
    const result = await execFileResult(candidate, ["--version"]);
    if (result.code === 0) {
      cachedPython = candidate;
      return candidate;
    }
  }
  throw new Error("python is required for runtime dogfood publish/install and deploy/web external probes");
}

function writeDetachedLauncher(args: {
  tempDir: string;
  pidFile: string;
  command: string;
  commandArgs: string[];
}): string {
  const launcherPath = path.join(args.tempDir, "launch-detached-process.mjs");
  fs.writeFileSync(
    launcherPath,
    [
      'import { spawn } from "node:child_process";',
      'import fs from "node:fs";',
      `const child = spawn(${JSON.stringify(args.command)}, ${JSON.stringify(args.commandArgs)}, { detached: true, stdio: "ignore" });`,
      "child.unref();",
      `fs.writeFileSync(${JSON.stringify(args.pidFile)}, JSON.stringify({ pid: child.pid, launched_at: new Date().toISOString() }) + "\\n");`,
    ].join("\n"),
  );
  return launcherPath;
}

async function launchDetachedProcess(args: {
  tempDir: string;
  command: string;
  commandArgs: string[];
}): Promise<{ pid: number | null; launcherExitCode: number | null }> {
  const pidFile = path.join(args.tempDir, "service-pid.json");
  const launcherPath = writeDetachedLauncher({
    tempDir: args.tempDir,
    pidFile,
    command: args.command,
    commandArgs: args.commandArgs,
  });
  const launcher = await execFileResult(process.execPath, [launcherPath]);
  let pid: number | null = null;
  if (fs.existsSync(pidFile)) {
    const metadata = JSON.parse(fs.readFileSync(pidFile, "utf8")) as { pid?: unknown };
    pid = typeof metadata.pid === "number" ? metadata.pid : null;
  }
  return { pid, launcherExitCode: launcher.code };
}

async function probeFreshShellCommand(command: string, timeoutMs = 5000): Promise<CommandResult> {
  const shell = process.platform === "win32" ? "cmd.exe" : "sh";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", command] : ["-lc", command];
  return await execFileResult(shell, args, { timeoutMs });
}

async function waitForFreshShellCommand(command: string, timeoutMs = 8000): Promise<CommandResult> {
  let last: CommandResult = { code: 1, stdout: "", stderr: "probe_not_started" };
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    last = await probeFreshShellCommand(command);
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

function validationFailureReason(kind: string, probe: CommandResult): string | null {
  if (probe.code === 0) return null;
  return `${kind}:${(probe.stderr || probe.stdout || "unknown").trim().slice(0, 220)}`;
}

function writeVectoropsWheel(args: {
  tempDir: string;
  python: string;
  wheelPath: string;
}): Promise<CommandResult> {
  const wheelScript = path.join(args.tempDir, "create-vectorops-wheel.py");
  fs.writeFileSync(
    wheelScript,
    [
      "import sys",
      "import zipfile",
      "",
      "wheel_path = sys.argv[1]",
      "dist_info = 'vectorops-0.1.0.dist-info'",
      "files = [",
      "    ('vectorops/__init__.py', \"__version__ = '0.1.0'\\ndef ping():\\n    return 'vectorops-live'\\n\"),",
      "    (f'{dist_info}/METADATA', 'Metadata-Version: 2.1\\nName: vectorops\\nVersion: 0.1.0\\nSummary: Aionis Runtime dogfood package\\n'),",
      "    (f'{dist_info}/WHEEL', 'Wheel-Version: 1.0\\nGenerator: aionis-runtime-dogfood\\nRoot-Is-Purelib: true\\nTag: py3-none-any\\n'),",
      "]",
      "record_lines = [f'{name},,' for name, _content in files]",
      "record_lines.append(f'{dist_info}/RECORD,,')",
      "with zipfile.ZipFile(wheel_path, 'w', zipfile.ZIP_DEFLATED) as archive:",
      "    for name, content in files:",
      "        archive.writestr(name, content)",
      "    archive.writestr(f'{dist_info}/RECORD', '\\n'.join(record_lines) + '\\n')",
    ].join("\n"),
  );
  return execFileResult(args.python, [wheelScript, args.wheelPath], { timeoutMs: 10000 });
}

async function prepareVectoropsIndex(args: {
  tempDir: string;
  python: string;
}): Promise<string> {
  const distDir = path.join(args.tempDir, "publish-index");
  const simpleDir = path.join(distDir, "simple", "vectorops");
  const wheelName = "vectorops-0.1.0-py3-none-any.whl";
  const wheelPath = path.join(distDir, wheelName);
  fs.mkdirSync(simpleDir, { recursive: true });
  const wheel = await writeVectoropsWheel({ tempDir: args.tempDir, python: args.python, wheelPath });
  if (wheel.code !== 0) {
    throw new Error(`failed to create vectorops wheel: ${(wheel.stderr || wheel.stdout || "unknown").trim()}`);
  }
  fs.writeFileSync(
    path.join(simpleDir, "index.html"),
    `<html><body><a href="../../${wheelName}">${wheelName}</a></body></html>\n`,
  );
  return distDir;
}

function buildServiceTaskSpec(args: {
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
      failure_reason: validationFailureReason("fresh_shell_probe_failed", args.probe),
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

function buildPublishInstallTaskSpec(args: {
  endpoint: string;
  probe: CommandResult;
  servicePid: number | null;
  launcherExitCode: number | null;
}): RuntimeDogfoodTaskSpec {
  const validationPassed = args.probe.code === 0;
  const indexCheck = `curl -fsS ${args.endpoint}/simple/vectorops/`;
  const installCheck = `pip install --index-url ${args.endpoint}/simple vectorops==0.1.0`;
  return {
    id: "external_probe_publish_install",
    title: "External probe publish/install clean-client validation",
    query_text: "Recover the local package index so clean clients can install vectorops from a fresh shell after worker exit.",
    evidence_source: "external_probe",
    trajectory: {
      title: "Vectorops live package publish validation",
      task_family: "package_publish_validate",
      steps: [
        { role: "assistant", text: "The package index must serve vectorops to a clean client after the worker exits." },
        {
          role: "tool",
          tool_name: "bash",
          command: `python scripts/build_index.py && nohup python -m http.server ${new URL(args.endpoint).port} --directory dist >/tmp/aionis-runtime-dogfood-index.log 2>&1 &`,
        },
        { role: "tool", tool_name: "bash", command: indexCheck },
        { role: "tool", tool_name: "bash", command: installCheck },
        {
          role: "assistant",
          text: `Update scripts/build_index.py and src/vectorops/__init__.py, relaunch the index detached, then rerun ${indexCheck} and ${installCheck} from a fresh shell.`,
        },
      ],
    },
    hints: {
      repo_root: "/workspace/vectorops",
    },
    execution_evidence: {
      validation_passed: validationPassed,
      after_exit_revalidated: validationPassed,
      fresh_shell_probe_passed: validationPassed,
      failure_reason: validationFailureReason("clean_client_install_failed", args.probe),
      false_confidence_detected: !validationPassed,
      evidence_refs: [
        `external_probe:fresh_shell:${args.endpoint}/simple/vectorops/`,
        `external_probe:clean_client_install:${args.endpoint}/simple`,
        `launcher_exit_code:${args.launcherExitCode ?? "null"}`,
        `service_pid:${args.servicePid ?? "null"}`,
      ],
    },
    expectations: {
      target_files_include: ["scripts/build_index.py", "src/vectorops/__init__.py"],
      acceptance_checks_match: [
        escapeRegex(indexCheck),
        `pip install .*--index-url ${escapeRegex(`${args.endpoint}/simple`)}.*vectorops==0\\.1\\.0`,
      ],
      next_action_match: ["scripts/build_index\\.py", "fresh shell"],
      success_invariants_include: ["clean_client_install_succeeds", "fresh_shell_revalidation_passes"],
      dependency_requirements_match: ["package artifacts and index metadata", "intended package index"],
      environment_assumptions_include: ["repo_root:/workspace/vectorops", "validation_can_run_from_fresh_shell"],
      must_hold_after_exit_include: ["task_result_remains_valid_after_agent_exit"],
      external_visibility_requirements_match: ["package_install_visible_to_clean_client"],
      service_lifecycle_required: true,
      after_exit_required: true,
      authoritative_gate_allows: true,
      evidence_allows_authoritative: validationPassed,
      stable_promotion_allowed: validationPassed,
      evidence_reasons_include: validationPassed ? [] : ["fresh_shell_probe_failed"],
    },
  };
}

function buildDeployHookWebTaskSpec(args: {
  endpoint: string;
  probe: CommandResult;
  contentMatched: boolean;
}): RuntimeDogfoodTaskSpec {
  const validationPassed = args.probe.code === 0 && args.contentMatched;
  const webCheck = `curl -fsS ${args.endpoint}/index.html`;
  return {
    id: "external_probe_deploy_hook_web",
    title: "External probe deploy/hook/web visible outcome",
    query_text: "Repair the git deploy webserver hook so a pushed revision is visible through the served web endpoint.",
    evidence_source: "external_probe",
    trajectory: {
      title: "Git webserver live deploy validation",
      steps: [
        { role: "assistant", text: "The deploy hook reports success, but the webserver must serve the new revision from the published endpoint." },
        { role: "tool", tool_name: "bash", command: "git config --global receive.denyCurrentBranch updateInstead" },
        { role: "tool", tool_name: "bash", command: webCheck },
        {
          role: "assistant",
          text: `Update hooks/post-receive and /var/www/main/index.html, push a fixture commit, and rerun ${webCheck} from a fresh shell until the served content matches the deployed revision.`,
        },
      ],
    },
    execution_evidence: {
      validation_passed: validationPassed,
      fresh_shell_probe_passed: validationPassed,
      failure_reason: validationPassed
        ? null
        : validationFailureReason("served_web_content_probe_failed", args.probe) ?? "served_web_content_mismatch",
      false_confidence_detected: !validationPassed,
      evidence_refs: [
        `external_probe:fresh_shell:${args.endpoint}/index.html`,
        "served_web_content_matches_deployed_revision",
      ],
    },
    expectations: {
      target_files_include: ["hooks/post-receive", "/var/www/main/index.html"],
      acceptance_checks_match: [escapeRegex(webCheck)],
      next_action_match: ["hooks/post-receive", "fresh shell"],
      success_invariants_include: ["deployed_web_content_visible_from_served_endpoint", "fresh_shell_revalidation_passes"],
      dependency_requirements_match: ["git deploy or hook path", "webserver content must come from the deployed revision"],
      environment_assumptions_include: ["validation_can_run_from_fresh_shell"],
      must_hold_after_exit_include: [],
      external_visibility_requirements_match: [
        "served_web_content_matches_deployed_revision",
        escapeRegex(`external_probe:${webCheck}`),
      ],
      service_lifecycle_required: false,
      after_exit_required: false,
      authoritative_gate_allows: true,
      evidence_allows_authoritative: validationPassed,
      stable_promotion_allowed: validationPassed,
      evidence_reasons_include: validationPassed ? [] : ["fresh_shell_probe_failed"],
    },
  };
}

function buildLiveCommandTaskSpec(args: {
  id: string;
  title: string;
  queryText: string;
  trajectoryTitle: string;
  taskFamily?: string;
  targetFiles: string[];
  validationCommand: string;
  nextAction: string;
  successInvariants: string[];
  dependencyRequirements?: string[];
  evidenceRef: string;
  probe: CommandResult;
}): RuntimeDogfoodTaskSpec {
  const validationPassed = args.probe.code === 0;
  return {
    id: args.id,
    title: args.title,
    query_text: args.queryText,
    evidence_source: "external_probe",
    trajectory: {
      title: args.trajectoryTitle,
      task_family: args.taskFamily,
      steps: [
        { role: "assistant", text: `Live dogfood workspace targets ${args.targetFiles.join(" and ")}.` },
        { role: "tool", tool_name: "bash", command: args.validationCommand },
        { role: "assistant", text: args.nextAction },
      ],
    },
    execution_evidence: {
      validation_passed: validationPassed,
      fresh_shell_probe_passed: validationPassed,
      failure_reason: validationFailureReason("live_command_probe_failed", args.probe),
      false_confidence_detected: !validationPassed,
      evidence_refs: [
        args.evidenceRef,
        `external_probe:fresh_shell:${args.validationCommand}`,
      ],
    },
    expectations: {
      target_files_include: args.targetFiles,
      acceptance_checks_match: [escapeRegex(args.validationCommand)],
      next_action_match: [
        escapeRegex(args.targetFiles[0] ?? ""),
        escapeRegex(args.validationCommand),
      ],
      success_invariants_include: args.successInvariants,
      dependency_requirements_match: args.dependencyRequirements ?? [],
      environment_assumptions_include: [],
      must_hold_after_exit_include: [],
      external_visibility_requirements_match: [],
      service_lifecycle_required: false,
      after_exit_required: false,
      authoritative_gate_allows: true,
      evidence_allows_authoritative: validationPassed,
      stable_promotion_allowed: validationPassed,
      evidence_reasons_include: validationPassed ? [] : ["fresh_shell_probe_failed"],
    },
  };
}

async function runLiveWorkspaceProbe(args: {
  tempPrefix: string;
  files: Record<string, string>;
  validationCommand: string;
}): Promise<CommandResult> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), args.tempPrefix));
  try {
    for (const [relativePath, content] of Object.entries(args.files)) {
      const filePath = path.join(tempDir, relativePath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content);
    }
    return await probeFreshShellCommand(`cd ${shellQuote(tempDir)} && ${args.validationCommand}`, 15000);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function runServiceAfterExitProbe(port?: number): Promise<RuntimeDogfoodExternalProbeScenarioRun> {
  const selectedPort = port ?? await findOpenPort();
  const endpoint = `http://127.0.0.1:${selectedPort}`;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-runtime-dogfood-service-"));
  let servicePid: number | null = null;
  let launcherExitCode: number | null = null;
  let probe: CommandResult = { code: 1, stdout: "", stderr: "probe_not_run" };

  try {
    const launched = await launchDetachedProcess({
      tempDir,
      command: process.execPath,
      commandArgs: [servicePath, "--port", String(selectedPort)],
    });
    servicePid = launched.pid;
    launcherExitCode = launched.launcherExitCode;
    probe = await waitForFreshShellCommand(`curl -fsS ${shellQuote(`${endpoint}/healthz`)}`);
  } finally {
    killService(servicePid);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const taskSpec = buildServiceTaskSpec({ endpoint, probe, servicePid, launcherExitCode });
  return {
    id: taskSpec.id,
    task_family_hint: "service_publish_validate",
    endpoint,
    service_pid: servicePid,
    launcher_exit_code: launcherExitCode,
    fresh_shell_probe_passed: probe.code === 0,
    fresh_shell_probe_output: probe.stdout.trim(),
    task_spec: taskSpec,
  };
}

async function runPublishInstallProbe(port?: number): Promise<RuntimeDogfoodExternalProbeScenarioRun> {
  const python = await resolvePython();
  const selectedPort = port ?? await findOpenPort();
  const endpoint = `http://127.0.0.1:${selectedPort}`;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-runtime-dogfood-publish-"));
  let servicePid: number | null = null;
  let launcherExitCode: number | null = null;
  let probe: CommandResult = { code: 1, stdout: "", stderr: "probe_not_run" };

  try {
    const distDir = await prepareVectoropsIndex({ tempDir, python });
    const launched = await launchDetachedProcess({
      tempDir,
      command: python,
      commandArgs: ["-m", "http.server", String(selectedPort), "--bind", "127.0.0.1", "--directory", distDir],
    });
    servicePid = launched.pid;
    launcherExitCode = launched.launcherExitCode;
    const indexCheck = `curl -fsS ${shellQuote(`${endpoint}/simple/vectorops/`)}`;
    const ready = await waitForFreshShellCommand(indexCheck, 15000);
    if (ready.code !== 0) {
      probe = ready;
    } else {
      const clientDir = path.join(tempDir, "clean-client");
      const clientPython = process.platform === "win32"
        ? path.join(clientDir, "Scripts", "python.exe")
        : path.join(clientDir, "bin", "python");
      const installCommand = [
        `${shellQuote(python)} -m venv ${shellQuote(clientDir)}`,
        `${shellQuote(clientPython)} -m pip install --no-cache-dir --index-url ${shellQuote(`${endpoint}/simple`)} --trusted-host 127.0.0.1 vectorops==0.1.0`,
        `${shellQuote(clientPython)} -c ${shellQuote("import vectorops; print(vectorops.__version__)")}`,
      ].join(" && ");
      probe = await probeFreshShellCommand(installCommand, 60000);
    }
  } finally {
    killService(servicePid);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const taskSpec = buildPublishInstallTaskSpec({ endpoint, probe, servicePid, launcherExitCode });
  return {
    id: taskSpec.id,
    task_family_hint: "package_publish_validate",
    endpoint,
    service_pid: servicePid,
    launcher_exit_code: launcherExitCode,
    fresh_shell_probe_passed: probe.code === 0,
    fresh_shell_probe_output: probe.stdout.trim(),
    task_spec: taskSpec,
  };
}

async function runDeployHookWebProbe(port?: number): Promise<RuntimeDogfoodExternalProbeScenarioRun> {
  const python = await resolvePython();
  const selectedPort = port ?? await findOpenPort();
  const endpoint = `http://127.0.0.1:${selectedPort}`;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-runtime-dogfood-deploy-"));
  const webRoot = path.join(tempDir, "www", "main");
  const expectedContent = "deployed revision visible through live dogfood";
  let servicePid: number | null = null;
  let launcherExitCode: number | null = null;
  let probe: CommandResult = { code: 1, stdout: "", stderr: "probe_not_run" };

  try {
    fs.mkdirSync(webRoot, { recursive: true });
    fs.writeFileSync(path.join(webRoot, "index.html"), `${expectedContent}\n`);
    const launched = await launchDetachedProcess({
      tempDir,
      command: python,
      commandArgs: ["-m", "http.server", String(selectedPort), "--bind", "127.0.0.1", "--directory", webRoot],
    });
    servicePid = launched.pid;
    launcherExitCode = launched.launcherExitCode;
    probe = await waitForFreshShellCommand(`curl -fsS ${shellQuote(`${endpoint}/index.html`)}`, 10000);
  } finally {
    killService(servicePid);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const contentMatched = probe.stdout.includes(expectedContent);
  const taskSpec = buildDeployHookWebTaskSpec({ endpoint, probe, contentMatched });
  return {
    id: taskSpec.id,
    task_family_hint: "git_deploy_webserver",
    endpoint,
    service_pid: servicePid,
    launcher_exit_code: launcherExitCode,
    fresh_shell_probe_passed: probe.code === 0 && contentMatched,
    fresh_shell_probe_output: probe.stdout.trim(),
    task_spec: taskSpec,
  };
}

async function runInterruptedResumeProbe(): Promise<RuntimeDogfoodExternalProbeScenarioRun> {
  const validationCommand = "npm test -- tests/exporter.test.mjs";
  const probe = await runLiveWorkspaceProbe({
    tempPrefix: "aionis-runtime-dogfood-interrupted-",
    validationCommand,
    files: {
      "package.json": JSON.stringify({ scripts: { test: "node --test" } }, null, 2),
      "src/exporter.mjs": [
        "export function exportRows(rows) {",
        "  return rows.map((row) => `${row.id}:${row.status}`).join('\\n');",
        "}",
        "",
      ].join("\n"),
      "tests/exporter.test.mjs": [
        "import test from 'node:test';",
        "import assert from 'node:assert/strict';",
        "import { exportRows } from '../src/exporter.mjs';",
        "",
        "test('exports the narrow resumed slice', () => {",
        "  assert.equal(exportRows([{ id: 'invoice-7', status: 'ready' }]), 'invoice-7:ready');",
        "});",
        "",
      ].join("\n"),
    },
  });
  const taskSpec = buildLiveCommandTaskSpec({
    id: "external_probe_interrupted_resume",
    title: "External probe interrupted resume validation",
    queryText: "Resume an interrupted export pipeline repair and validate only the narrow export path.",
    trajectoryTitle: "Export pipeline interrupted resume",
    targetFiles: ["src/exporter.mjs", "tests/exporter.test.mjs"],
    validationCommand,
    nextAction: `Continue in src/exporter.mjs, keep tests/exporter.test.mjs aligned, and rerun ${validationCommand} before declaring the resume complete.`,
    successInvariants: ["all_acceptance_checks_pass"],
    evidenceRef: "external_probe:interrupted_resume:targeted_export_test",
    probe,
  });
  return {
    id: taskSpec.id,
    task_family_hint: "task_resume_interrupted_export_pipeline",
    endpoint: "",
    service_pid: null,
    launcher_exit_code: null,
    fresh_shell_probe_passed: probe.code === 0,
    fresh_shell_probe_output: probe.stdout.trim(),
    task_spec: taskSpec,
  };
}

async function runHandoffNextDayProbe(): Promise<RuntimeDogfoodExternalProbeScenarioRun> {
  const validationCommand = "npm test -- tests/payments/webhook.test.mjs";
  const probe = await runLiveWorkspaceProbe({
    tempPrefix: "aionis-runtime-dogfood-handoff-",
    validationCommand,
    files: {
      "package.json": JSON.stringify({ scripts: { test: "node --test" } }, null, 2),
      "src/payments/webhook.mjs": [
        "export function verifyWebhook(event) {",
        "  if (event.signature !== 'valid') return 'reject';",
        "  return `accepted:${event.id}`;",
        "}",
        "",
      ].join("\n"),
      "tests/payments/webhook.test.mjs": [
        "import test from 'node:test';",
        "import assert from 'node:assert/strict';",
        "import { verifyWebhook } from '../../src/payments/webhook.mjs';",
        "",
        "test('continues the next-day webhook repair handoff', () => {",
        "  assert.equal(verifyWebhook({ id: 'evt_42', signature: 'valid' }), 'accepted:evt_42');",
        "});",
        "",
      ].join("\n"),
    },
  });
  const taskSpec = buildLiveCommandTaskSpec({
    id: "external_probe_handoff_next_day",
    title: "External probe next-day handoff resume validation",
    queryText: "Resume yesterday's payment webhook repair from the stored handoff and run the narrow verification.",
    trajectoryTitle: "Payment webhook next-day handoff",
    taskFamily: "handoff_resume",
    targetFiles: ["src/payments/webhook.mjs", "tests/payments/webhook.test.mjs"],
    validationCommand,
    nextAction: `Day 2 agent should continue in src/payments/webhook.mjs, preserve the stored handoff context, and rerun ${validationCommand} before closing.`,
    successInvariants: ["all_acceptance_checks_pass"],
    evidenceRef: "external_probe:handoff_next_day:targeted_payment_webhook_test",
    probe,
  });
  return {
    id: taskSpec.id,
    task_family_hint: "handoff_resume",
    endpoint: "",
    service_pid: null,
    launcher_exit_code: null,
    fresh_shell_probe_passed: probe.code === 0,
    fresh_shell_probe_output: probe.stdout.trim(),
    task_spec: taskSpec,
  };
}

async function runAgentTakeoverProbe(): Promise<RuntimeDogfoodExternalProbeScenarioRun> {
  const validationCommand = "npm test -- tests/search/indexer.test.mjs";
  const probe = await runLiveWorkspaceProbe({
    tempPrefix: "aionis-runtime-dogfood-agent-takeover-",
    validationCommand,
    files: {
      "package.json": JSON.stringify({ scripts: { test: "node --test" } }, null, 2),
      "src/search/indexer.mjs": [
        "export function indexDocuments(docs) {",
        "  return docs.map((doc) => doc.title.toLowerCase()).sort();",
        "}",
        "",
      ].join("\n"),
      "tests/search/indexer.test.mjs": [
        "import test from 'node:test';",
        "import assert from 'node:assert/strict';",
        "import { indexDocuments } from '../../src/search/indexer.mjs';",
        "",
        "test('agent B validates the inherited search indexer slice', () => {",
        "  assert.deepEqual(indexDocuments([{ title: 'Beta' }, { title: 'Alpha' }]), ['alpha', 'beta']);",
        "});",
        "",
      ].join("\n"),
    },
  });
  const taskSpec = buildLiveCommandTaskSpec({
    id: "external_probe_agent_takeover",
    title: "External probe second agent takeover validation",
    queryText: "Agent B takes over the search indexer repair from Agent A and must validate the same narrow slice.",
    trajectoryTitle: "Search indexer agent takeover",
    taskFamily: "agent_takeover",
    targetFiles: ["src/search/indexer.mjs", "tests/search/indexer.test.mjs"],
    validationCommand,
    nextAction: `Agent B should take over in src/search/indexer.mjs, keep tests/search/indexer.test.mjs aligned, and rerun ${validationCommand} before handing back.`,
    successInvariants: ["all_acceptance_checks_pass"],
    evidenceRef: "external_probe:agent_takeover:targeted_search_indexer_test",
    probe,
  });
  return {
    id: taskSpec.id,
    task_family_hint: "agent_takeover",
    endpoint: "",
    service_pid: null,
    launcher_exit_code: null,
    fresh_shell_probe_passed: probe.code === 0,
    fresh_shell_probe_output: probe.stdout.trim(),
    task_spec: taskSpec,
  };
}

async function runProbeSlice(slice: RuntimeDogfoodExternalProbeSlice, port?: number): Promise<RuntimeDogfoodExternalProbeScenarioRun> {
  if (slice === "service_after_exit") return await runServiceAfterExitProbe(port);
  if (slice === "publish_install") return await runPublishInstallProbe(port);
  if (slice === "deploy_hook_web") return await runDeployHookWebProbe(port);
  if (slice === "interrupted_resume") return await runInterruptedResumeProbe();
  if (slice === "handoff_next_day") return await runHandoffNextDayProbe();
  return await runAgentTakeoverProbe();
}

export async function runRuntimeDogfoodExternalProbe(options: ExternalProbeOptions = {}): Promise<RuntimeDogfoodExternalProbeRun> {
  const slices = options.slices?.length ? options.slices : defaultSlices;
  const networkSliceCount = slices.filter((slice) =>
    slice === "service_after_exit" || slice === "publish_install" || slice === "deploy_hook_web"
  ).length;
  const ports = options.port
    ? [options.port, ...await findOpenPorts(Math.max(0, networkSliceCount - 1))]
    : await findOpenPorts(networkSliceCount);
  const probes: RuntimeDogfoodExternalProbeScenarioRun[] = [];
  let portIndex = 0;
  for (const slice of slices) {
    const needsPort = slice === "service_after_exit" || slice === "publish_install" || slice === "deploy_hook_web";
    probes.push(await runProbeSlice(slice, needsPort ? ports[portIndex++] : undefined));
  }
  const taskSpecs = probes.map((probe) => probe.task_spec);
  const dogfoodResult = runRuntimeDogfoodSuite(runtimeDogfoodTasksFromSpecs(taskSpecs));
  const primary = probes[0] ?? null;
  return {
    run_version: "runtime_dogfood_external_probe_run_v1",
    endpoint: primary?.endpoint ?? "",
    service_pid: primary?.service_pid ?? null,
    launcher_exit_code: primary?.launcher_exit_code ?? null,
    fresh_shell_probe_passed: probes.every((probe) => probe.fresh_shell_probe_passed),
    fresh_shell_probe_output: probes.map((probe) => `${probe.id}: ${probe.fresh_shell_probe_output}`).join("\n"),
    probes,
    task_specs: taskSpecs,
    dogfood_result: dogfoodResult,
  };
}

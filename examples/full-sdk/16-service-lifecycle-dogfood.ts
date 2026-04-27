import { execFile, spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { promisify } from "node:util";
import {
  createExampleClient,
  DEFAULT_TENANT_ID,
  isMain,
  printHeading,
  printJson,
  printStep,
  runExample,
} from "./shared.js";

const execFileAsync = promisify(execFile);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function allocatePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("could not allocate local port")));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

async function waitForHealth(endpoint: string, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return;
      lastError = new Error(`health probe returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw lastError instanceof Error ? lastError : new Error("health probe timed out");
}

async function freshShellProbe(endpoint: string): Promise<string> {
  const script = [
    `fetch(${JSON.stringify(endpoint)})`,
    ".then(async (response) => {",
    "  const body = await response.text();",
    "  if (!response.ok) throw new Error(`HTTP ${response.status}: ${body}`);",
    "  process.stdout.write(body);",
    "})",
    ".catch((error) => {",
    "  console.error(error instanceof Error ? error.message : String(error));",
    "  process.exit(1);",
    "});",
  ].join("\n");
  const command = `${JSON.stringify(process.execPath)} -e ${JSON.stringify(script)}`;
  const result = await execFileAsync("sh", ["-lc", command], { timeout: 5000 });
  return result.stdout.trim();
}

function stopDetachedService(child: ChildProcess | null): void {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    try {
      child.kill("SIGTERM");
    } catch {
      // Best-effort cleanup for a detached local dogfood service.
    }
  }
}

function buildExecutionPacket(args: {
  endpoint: string;
  launchReference: string;
  filePath: string;
}) {
  const constraint = {
    version: 1,
    service_kind: "http",
    label: `service:${args.endpoint}`,
    launch_reference: args.launchReference,
    endpoint: args.endpoint,
    must_survive_agent_exit: true,
    revalidate_from_fresh_shell: true,
    detach_then_probe: true,
    health_checks: [`curl -fsS ${args.endpoint}`],
    teardown_notes: ["terminate the detached service process group after the dogfood run"],
  } as const;

  const state = {
    state_id: `state:service-lifecycle:${Date.now()}`,
    scope: "aionis://examples/service-lifecycle-dogfood",
    task_brief: "Validate detached service lifecycle with a fresh-shell probe",
    current_stage: "validate",
    active_role: "runtime-dogfood",
    owned_files: [args.filePath],
    modified_files: [],
    pending_validations: [`curl -fsS ${args.endpoint}`],
    completed_validations: [`fresh shell probe ${args.endpoint}`],
    last_accepted_hypothesis: "detached service remains externally visible after launcher exit",
    rejected_paths: [],
    unresolved_blockers: [],
    rollback_notes: [],
    service_lifecycle_constraints: [constraint],
    reviewer_contract: null,
    resume_anchor: null,
    updated_at: new Date().toISOString(),
    version: 1,
  };

  return {
    state,
    packet: {
      version: 1,
      state_id: state.state_id,
      current_stage: state.current_stage,
      active_role: state.active_role,
      task_brief: state.task_brief,
      target_files: [args.filePath],
      next_action: "Keep the service detached and revalidate from a fresh shell before reusing this workflow.",
      hard_constraints: ["service must survive launcher process exit"],
      accepted_facts: ["fresh shell probe reached the service endpoint"],
      rejected_paths: [],
      pending_validations: state.pending_validations,
      unresolved_blockers: [],
      rollback_notes: [],
      review_contract: null,
      resume_anchor: null,
      artifact_refs: [],
      evidence_refs: [`fresh-shell:${args.endpoint}`],
      service_lifecycle_constraints: [constraint],
    },
    constraint,
  };
}

async function main() {
  const aionis = createExampleClient();
  const port = await allocatePort();
  const endpoint = `http://127.0.0.1:${port}/healthz`;
  const filePath = "scripts/fixtures/runtime-dogfood/service-after-exit-server.mjs";
  const serverPath = path.resolve(process.cwd(), filePath);
  const launchReference = `${process.execPath} ${filePath} --port ${port}`;
  let child: ChildProcess | null = null;

  try {
    printHeading("Service Lifecycle Dogfood");

    printStep("1. Launch a detached local service.");
    child = spawn(process.execPath, [serverPath, "--port", String(port)], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    await waitForHealth(endpoint);

    printStep("2. Revalidate the service endpoint from a fresh shell process.");
    const freshShellOutput = await freshShellProbe(endpoint);
    printJson("Fresh shell probe", {
      endpoint,
      fresh_shell_probe_passed: true,
      validation_boundary: "external_verifier",
      output: JSON.parse(freshShellOutput),
    });

    const exampleTag = String(port);
    const scope = `service-lifecycle-dogfood-${exampleTag}`;
    const taskBrief = `Keep service endpoint alive after launcher exit [service-lifecycle-${exampleTag}]`;
    const execution = buildExecutionPacket({ endpoint, launchReference, filePath });

    printStep("3. Ask Aionis for a startup plan with service lifecycle context.");
    const plan = await aionis.memory.taskStartPlan({
      tenant_id: DEFAULT_TENANT_ID,
      scope,
      query_text: taskBrief,
      context: {
        goal: taskBrief,
        host: "service-lifecycle-dogfood",
      },
      candidates: ["bash", "edit", "test"],
      execution_state_v1: execution.state,
      execution_packet_v1: execution.packet,
      execution_result_summary: {
        status: "success",
        validation_passed: true,
        after_exit_revalidated: true,
        fresh_shell_probe_passed: true,
        validation_boundary: "external_verifier",
      },
      execution_evidence: [{
        ref: `fresh-shell:${endpoint}`,
        kind: "fresh_shell_probe",
        status: "success",
        endpoint,
        validation_boundary: "external_verifier",
      }],
      workflow_limit: 6,
    });
    printJson("Task start plan", {
      resolution_source: plan.resolution_source,
      first_action: plan.first_action,
      gate_action: plan.gate_action,
      planner_explanation: plan.planner_explanation,
    });

    printStep("4. Store the live after-exit/fresh-shell proof through storeExecutionOutcome.");
    const outcome = await aionis.memory.storeExecutionOutcome({
      tenant_id: DEFAULT_TENANT_ID,
      scope,
      actor: "service-lifecycle-dogfood",
      goal: taskBrief,
      status: "success",
      summary: "Detached service survived launcher exit and passed fresh-shell health probe.",
      success_criteria: {
        target_files: [filePath],
        acceptance_checks: [`curl -fsS ${endpoint}`],
        success_invariants: ["fresh_shell_revalidation_passes"],
        must_hold_after_exit: [`service_endpoint_still_serves_after_exit:${endpoint}`],
        external_visibility_requirements: [`endpoint_reachable_from_fresh_shell:${endpoint}`],
        service_lifecycle_constraints: [execution.constraint],
      },
      metrics: {
        success_ratio: 1,
        validation_passed: true,
        after_exit_revalidated: true,
        fresh_shell_probe_passed: true,
        validation_boundary: "external_verifier",
        evidence_refs: [`fresh-shell:${endpoint}`],
      },
      metadata: {
        endpoint,
        service_pid: child.pid,
        proof_boundary: "live_external_probe",
      },
      steps: [{
        tool_name: "bash",
        tool_input: { argv: ["sh", "-lc", `${process.execPath} -e 'fetch(${JSON.stringify(endpoint)}).then(r=>process.exit(r.ok?0:1))'`] },
        status: "success",
        output_signature: {
          summary: "fresh shell probe reached detached service",
          after_exit_revalidated: true,
          fresh_shell_probe_passed: true,
          validation_boundary: "external_verifier",
          endpoint,
        },
        artifact_refs: [`fresh-shell:${endpoint}`],
      }],
      compile_playbook: true,
      compile: {
        name: "Service lifecycle fresh-shell dogfood",
        matchers: {
          task_family: "service_lifecycle_after_exit",
          file_path: filePath,
        },
        success_criteria: {
          must_hold_after_exit: [`service_endpoint_still_serves_after_exit:${endpoint}`],
          external_visibility_requirements: [`endpoint_reachable_from_fresh_shell:${endpoint}`],
        },
        risk_profile: "low",
      },
      simulate_playbook: false,
    });
    printJson("Stored service lifecycle outcome", {
      run_id: outcome.run_id,
      status: outcome.status,
      step_count: outcome.steps.length,
      playbook_compile: outcome.playbook_compile,
    });

    printStep("5. Retrieve workflow authority/outcome state for host-side inspection.");
    const workflow = await aionis.memory.retrieveWorkflowContract({
      tenant_id: DEFAULT_TENANT_ID,
      scope,
      file_path: filePath,
      include_introspection: false,
      limit: 8,
    });
    printJson("Workflow authority state", {
      selected_source: workflow.selected_source,
      contract_trust: workflow.contract_trust,
      authority_summary: workflow.authority_summary,
      outcome_contract_gate: workflow.outcome_contract_gate,
    });
  } finally {
    stopDetachedService(child);
  }
}

if (isMain(import.meta.url)) {
  await runExample(main);
}

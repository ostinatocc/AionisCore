import { buildExecutionContractFromTrajectoryCompile, type ExecutionContractV1 } from "../../src/memory/execution-contract.ts";
import { buildOutcomeContractGate, type OutcomeContractGate } from "../../src/memory/contract-trust.ts";
import { buildTrajectoryCompileLite } from "../../src/memory/trajectory-compile.ts";
import { applyTrajectoryCompileExecutionKernel } from "../../src/memory/trajectory-compile-runtime.ts";
import type { TrajectoryCompileHintsInput, TrajectoryCompileResponse, TrajectoryCompileSourceInput } from "../../src/memory/schemas.ts";

type DogfoodExpectation = {
  target_files_include: string[];
  acceptance_checks_match: RegExp[];
  next_action_match: RegExp[];
  success_invariants_include: string[];
  dependency_requirements_match: RegExp[];
  environment_assumptions_include: string[];
  must_hold_after_exit_include: string[];
  external_visibility_requirements_match: RegExp[];
  service_lifecycle_required: boolean;
  after_exit_required: boolean;
  authoritative_gate_allows: boolean;
  gate_reasons_include?: string[];
};

export type RuntimeDogfoodTask = {
  id: string;
  title: string;
  query_text: string;
  trajectory: TrajectoryCompileSourceInput;
  hints?: TrajectoryCompileHintsInput;
  expectations: DogfoodExpectation;
};

export type RuntimeDogfoodAssertion = {
  name: string;
  status: "pass" | "fail";
  detail?: string;
};

export type RuntimeDogfoodScenarioResult = {
  id: string;
  title: string;
  status: "pass" | "fail";
  task_family: string | null;
  workflow_signature: string | null;
  assertions: RuntimeDogfoodAssertion[];
  metrics: {
    first_correct_action: boolean;
    wasted_step_count: number;
    retry_signal_count: number;
    false_confidence_risk: boolean;
    after_exit_correct: boolean | null;
    outcome_gate_allows_authoritative: boolean;
    expected_authoritative_gate_allows: boolean;
    gate_false_positive: boolean;
    gate_false_negative: boolean;
  };
  compiled: Pick<TrajectoryCompileResponse, "diagnostics"> & {
    target_files: string[];
    acceptance_checks: string[];
    next_action: string | null;
    outcome: ExecutionContractV1["outcome"];
    outcome_contract_gate: OutcomeContractGate;
    service_lifecycle_constraint_count: number;
  };
};

export type RuntimeDogfoodSuiteResult = {
  generated_at: string;
  suite_version: "runtime_dogfood_v1";
  overall_status: "pass" | "fail";
  summary: {
    passed_scenarios: number;
    total_scenarios: number;
    first_correct_action_rate: number;
    false_confidence_rate: number;
    after_exit_correct_rate: number | null;
    wasted_step_count: number;
    retry_signal_count: number;
    gate_false_positive_rate: number;
    gate_false_negative_rate: number;
  };
  scenarios: RuntimeDogfoodScenarioResult[];
};

function pass(name: string): RuntimeDogfoodAssertion {
  return { name, status: "pass" };
}

function fail(name: string, detail: string): RuntimeDogfoodAssertion {
  return { name, status: "fail", detail };
}

function includesAll(haystack: string[], needles: string[]): boolean {
  return needles.every((needle) => haystack.includes(needle));
}

function matchesAll(haystack: string[], patterns: RegExp[]): boolean {
  return patterns.every((pattern) => haystack.some((entry) => pattern.test(entry)));
}

function countRetrySignals(trajectory: TrajectoryCompileSourceInput): number {
  return trajectory.steps.filter((step) => {
    const text = [
      step.text,
      step.content,
      step.summary,
      step.command,
    ].filter((entry): entry is string => typeof entry === "string").join("\n");
    return /\bretry\b|\brerun\b|\bagain\b/i.test(text);
  }).length;
}

function countWastedSteps(compiled: TrajectoryCompileResponse): number {
  return compiled.contract.noise_markers.length
    + compiled.contract.workflow_steps.filter((step) =>
      /sandbox|source-level check|hand this over|can't fully execute|cannot fully execute/i.test(step)
    ).length;
}

function noisyTargetFiles(targetFiles: string[]): string[] {
  return targetFiles.filter((targetFile) =>
    /^\/(?:tmp|var\/tmp)\//.test(targetFile)
    || /\.(?:log|pid|sock|tmp)$/i.test(targetFile)
    || /^\d+(?:\.\d+){1,3}(?:[-+][\w.-]+)?$/.test(targetFile)
    || /^(?:dist|build|target)\/(?:simple|tmp|cache|logs?)(?:\/|$)/i.test(targetFile)
  );
}

export function runtimeDogfoodTasks(): RuntimeDogfoodTask[] {
  return [
    {
      id: "service_after_exit",
      title: "Service start plus after-exit revalidation",
      query_text: "Keep the dashboard status service alive after the agent exits and verify it from a fresh shell.",
      trajectory: {
        title: "Dashboard service recovery",
        task_family: "service_publish_validate",
        steps: [
          { role: "assistant", text: "The dashboard status service responds during the agent session but disappears after the worker exits." },
          { role: "tool", tool_name: "bash", command: "nohup node scripts/dev-server.mjs --port 4173 >/tmp/aionis-dashboard.log 2>&1 &" },
          { role: "tool", tool_name: "bash", command: "curl -fsS http://127.0.0.1:4173/healthz" },
          { role: "assistant", text: "Update scripts/dev-server.mjs, launch it detached, then rerun curl -fsS http://127.0.0.1:4173/healthz from a fresh shell after the agent exits." },
        ],
      },
      expectations: {
        target_files_include: ["scripts/dev-server.mjs"],
        acceptance_checks_match: [/curl -fsS http:\/\/127\.0\.0\.1:4173\/healthz/],
        next_action_match: [/scripts\/dev-server\.mjs/i, /fresh shell/i],
        success_invariants_include: ["fresh_shell_revalidation_passes"],
        dependency_requirements_match: [/service launch must not depend on the agent shell/i],
        environment_assumptions_include: [
          "detached_process_supported",
          "fresh_shell_available_for_revalidation",
          "validation_can_run_from_fresh_shell",
        ],
        must_hold_after_exit_include: [
          "task_result_remains_valid_after_agent_exit",
          "fresh_shell_revalidation_still_passes_after_agent_exit",
        ],
        external_visibility_requirements_match: [/endpoint_reachable:http:\/\/127\.0\.0\.1:4173\/healthz/],
        service_lifecycle_required: true,
        after_exit_required: true,
        authoritative_gate_allows: true,
      },
    },
    {
      id: "publish_install",
      title: "Publish/install clean-client path",
      query_text: "Recover the local package index so clean clients can install vectorops from a fresh shell after worker exit.",
      trajectory: {
        title: "Vectorops package publish recovery",
        task_family: "package_publish_validate",
        steps: [
          { role: "assistant", text: "The package index builds, but clean clients cannot install vectorops after the worker exits." },
          { role: "tool", tool_name: "bash", command: "python scripts/build_index.py && nohup python -m http.server 8080 --directory dist/simple >/tmp/index.log 2>&1 &" },
          { role: "tool", tool_name: "bash", command: "curl -fsS http://localhost:8080/simple/vectorops/" },
          { role: "tool", tool_name: "bash", command: "pip install --index-url http://localhost:8080/simple vectorops==0.1.0" },
          { role: "assistant", text: "Update scripts/build_index.py and src/vectorops/__init__.py, then relaunch the index in detached mode and rerun curl plus pip install from a fresh shell." },
        ],
      },
      hints: {
        repo_root: "/workspace/vectorops",
      },
      expectations: {
        target_files_include: ["scripts/build_index.py", "src/vectorops/__init__.py"],
        acceptance_checks_match: [/curl -fsS http:\/\/localhost:8080\/simple\/vectorops\//, /pip install --index-url http:\/\/localhost:8080\/simple vectorops==0\.1\.0/],
        next_action_match: [/scripts\/build_index\.py/i, /fresh shell/i],
        success_invariants_include: ["clean_client_install_succeeds", "fresh_shell_revalidation_passes"],
        dependency_requirements_match: [/package artifacts and index metadata/i, /intended package index/i],
        environment_assumptions_include: ["repo_root:/workspace/vectorops", "validation_can_run_from_fresh_shell"],
        must_hold_after_exit_include: ["task_result_remains_valid_after_agent_exit"],
        external_visibility_requirements_match: [/package_install_visible_to_clean_client/],
        service_lifecycle_required: true,
        after_exit_required: true,
        authoritative_gate_allows: true,
      },
    },
    {
      id: "deploy_hook_web",
      title: "Deploy/hook/web visible outcome",
      query_text: "Repair the git deploy webserver hook so a pushed revision is visible through the served web endpoint.",
      trajectory: {
        title: "Git webserver deploy recovery",
        steps: [
          { role: "assistant", text: "The deploy hook reports success, but the webserver still serves the old revision." },
          { role: "tool", tool_name: "bash", command: "git config --global receive.denyCurrentBranch updateInstead" },
          { role: "tool", tool_name: "bash", command: "curl -fsS http://localhost:8081/index.html" },
          { role: "assistant", text: "Update hooks/post-receive and /var/www/main/index.html, push a fixture commit, and rerun curl -fsS http://localhost:8081/index.html from a fresh shell." },
        ],
      },
      expectations: {
        target_files_include: ["hooks/post-receive", "/var/www/main/index.html"],
        acceptance_checks_match: [/curl -fsS http:\/\/localhost:8081\/index\.html/],
        next_action_match: [/hooks\/post-receive/i, /fresh shell/i],
        success_invariants_include: ["deployed_web_content_visible_from_served_endpoint", "fresh_shell_revalidation_passes"],
        dependency_requirements_match: [/git deploy or hook path/i, /webserver content must come from the deployed revision/i],
        environment_assumptions_include: ["validation_can_run_from_fresh_shell"],
        must_hold_after_exit_include: [],
        external_visibility_requirements_match: [/served_web_content_matches_deployed_revision/, /external_probe:curl -fsS http:\/\/localhost:8081\/index\.html/],
        service_lifecycle_required: false,
        after_exit_required: false,
        authoritative_gate_allows: true,
      },
    },
    {
      id: "interrupted_resume",
      title: "Interrupted resume without stale handoff drift",
      query_text: "Resume an interrupted export pipeline repair and validate only the narrow export path.",
      trajectory: {
        title: "Export pipeline interrupted resume",
        steps: [
          { role: "assistant", text: "Previous run changed src/exporter.ts and tests/exporter.test.ts but stopped before validation." },
          { role: "tool", tool_name: "bash", command: "npm test -- tests/exporter.test.ts" },
          { role: "assistant", text: "Continue in src/exporter.ts, keep tests/exporter.test.ts aligned, and rerun npm test -- tests/exporter.test.ts before declaring the resume complete." },
        ],
      },
      expectations: {
        target_files_include: ["src/exporter.ts", "tests/exporter.test.ts"],
        acceptance_checks_match: [/npm test -- tests\/exporter\.test\.ts/],
        next_action_match: [/src\/exporter\.ts/i, /npm test -- tests\/exporter\.test\.ts/i],
        success_invariants_include: ["all_acceptance_checks_pass"],
        dependency_requirements_match: [],
        environment_assumptions_include: [],
        must_hold_after_exit_include: [],
        external_visibility_requirements_match: [],
        service_lifecycle_required: false,
        after_exit_required: false,
        authoritative_gate_allows: true,
      },
    },
    {
      id: "cross_agent_db_handoff",
      title: "Cross-agent database recovery handoff",
      query_text: "Reviewer takes over database recovery after triage and must prove the database is consistent.",
      trajectory: {
        title: "Ledger database recovery handoff",
        task_family: "database_recovery",
        steps: [
          { role: "assistant", text: "Triage found a WAL mismatch around data/ledger.db and scripts/recover-ledger.ts." },
          { role: "tool", tool_name: "bash", command: "sqlite3 data/ledger.db 'PRAGMA integrity_check;'" },
          { role: "assistant", text: "Patch scripts/recover-ledger.ts, preserve the data/ledger.db backup path, rerun sqlite3 data/ledger.db 'PRAGMA integrity_check;', and hand back only after the integrity check passes." },
        ],
      },
      expectations: {
        target_files_include: ["data/ledger.db", "scripts/recover-ledger.ts"],
        acceptance_checks_match: [/sqlite3 data\/ledger\.db 'PRAGMA integrity_check;'/],
        next_action_match: [/scripts\/recover-ledger\.ts/i, /integrity_check/i],
        success_invariants_include: ["database_integrity_check_passes"],
        dependency_requirements_match: [/database files and journal state/i],
        environment_assumptions_include: [],
        must_hold_after_exit_include: [],
        external_visibility_requirements_match: [],
        service_lifecycle_required: false,
        after_exit_required: false,
        authoritative_gate_allows: true,
      },
    },
    {
      id: "thin_service_missing_detach",
      title: "Service after-exit claim without detach proof",
      query_text: "Keep the dashboard status service alive after the agent exits and prove it remains reachable.",
      trajectory: {
        title: "Dashboard service thin handoff",
        task_family: "service_publish_validate",
        steps: [
          { role: "assistant", text: "The dashboard service must remain available after the agent exits, but the current handoff only restarts it inline." },
          { role: "tool", tool_name: "bash", command: "node scripts/dev-server.mjs --port 4173" },
          { role: "tool", tool_name: "bash", command: "curl -fsS http://127.0.0.1:4173/healthz" },
          { role: "assistant", text: "Update scripts/dev-server.mjs and rerun curl -fsS http://127.0.0.1:4173/healthz before declaring success." },
        ],
      },
      expectations: {
        target_files_include: ["scripts/dev-server.mjs"],
        acceptance_checks_match: [/curl -fsS http:\/\/127\.0\.0\.1:4173\/healthz/],
        next_action_match: [/scripts\/dev-server\.mjs/i, /curl -fsS http:\/\/127\.0\.0\.1:4173\/healthz/i],
        success_invariants_include: ["fresh_shell_revalidation_passes"],
        dependency_requirements_match: [/service launch must not depend on the agent shell/i],
        environment_assumptions_include: [
          "validation_can_run_from_fresh_shell",
          "localhost_reachable_from_validation_environment",
        ],
        must_hold_after_exit_include: [
          "task_result_remains_valid_after_agent_exit",
          "fresh_shell_revalidation_still_passes_after_agent_exit",
        ],
        external_visibility_requirements_match: [/endpoint_reachable:http:\/\/127\.0\.0\.1:4173\/healthz/],
        service_lifecycle_required: true,
        after_exit_required: true,
        authoritative_gate_allows: false,
        gate_reasons_include: ["missing_service_detach_then_probe"],
      },
    },
  ];
}

function evaluateTask(task: RuntimeDogfoodTask): RuntimeDogfoodScenarioResult {
  const compiled = buildTrajectoryCompileLite({
    query_text: task.query_text,
    trajectory: task.trajectory,
    hints: task.hints,
  }, {
    defaultScope: "dogfood",
    defaultTenantId: "default",
  });
  const contract = buildExecutionContractFromTrajectoryCompile(compiled);
  const outcomeContractGate = buildOutcomeContractGate({
    executionContract: contract,
    requestedTrust: "authoritative",
  });
  const kernel = applyTrajectoryCompileExecutionKernel({
    compiled,
    queryText: task.query_text,
    repoRoot: task.hints?.repo_root ?? null,
  });
  const assertions: RuntimeDogfoodAssertion[] = [];
  const expectation = task.expectations;

  assertions.push(
    includesAll(contract.target_files, expectation.target_files_include)
      ? pass("target files capture the intended work surface")
      : fail("target files capture the intended work surface", `expected ${expectation.target_files_include.join(", ")} in ${contract.target_files.join(", ")}`),
  );
  const noisyTargets = noisyTargetFiles(contract.target_files);
  assertions.push(
    noisyTargets.length === 0
      ? pass("target files exclude runtime artifacts and version literals")
      : fail("target files exclude runtime artifacts and version literals", `noisy target files: ${noisyTargets.join(", ")}`),
  );
  assertions.push(
    matchesAll(contract.outcome.acceptance_checks, expectation.acceptance_checks_match)
      ? pass("acceptance checks capture external validation")
      : fail("acceptance checks capture external validation", `actual checks: ${contract.outcome.acceptance_checks.join(" | ")}`),
  );
  assertions.push(
    expectation.next_action_match.every((pattern) => pattern.test(contract.next_action ?? ""))
      ? pass("next action is specific enough to start correctly")
      : fail("next action is specific enough to start correctly", `actual next_action: ${contract.next_action ?? "null"}`),
  );
  assertions.push(
    includesAll(contract.outcome.success_invariants, expectation.success_invariants_include)
      ? pass("success invariants describe final correctness")
      : fail("success invariants describe final correctness", `actual success_invariants: ${contract.outcome.success_invariants.join(" | ")}`),
  );
  assertions.push(
    matchesAll(contract.outcome.dependency_requirements, expectation.dependency_requirements_match)
      ? pass("dependency requirements are explicit")
      : fail("dependency requirements are explicit", `actual dependency_requirements: ${contract.outcome.dependency_requirements.join(" | ")}`),
  );
  assertions.push(
    includesAll(contract.outcome.environment_assumptions, expectation.environment_assumptions_include)
      ? pass("environment assumptions are explicit")
      : fail("environment assumptions are explicit", `actual environment_assumptions: ${contract.outcome.environment_assumptions.join(" | ")}`),
  );
  assertions.push(
    includesAll(contract.outcome.must_hold_after_exit, expectation.must_hold_after_exit_include)
      ? pass("after-exit requirements are explicit when needed")
      : fail("after-exit requirements are explicit when needed", `actual must_hold_after_exit: ${contract.outcome.must_hold_after_exit.join(" | ")}`),
  );
  assertions.push(
    expectation.after_exit_required || contract.outcome.must_hold_after_exit.length === 0
      ? pass("after-exit requirements are not invented for non-lifecycle tasks")
      : fail("after-exit requirements are not invented for non-lifecycle tasks", `actual must_hold_after_exit: ${contract.outcome.must_hold_after_exit.join(" | ")}`),
  );
  assertions.push(
    matchesAll(contract.outcome.external_visibility_requirements, expectation.external_visibility_requirements_match)
      ? pass("external visibility requirements are explicit")
      : fail("external visibility requirements are explicit", `actual external_visibility_requirements: ${contract.outcome.external_visibility_requirements.join(" | ")}`),
  );
  assertions.push(
    expectation.service_lifecycle_required === (contract.service_lifecycle_constraints.length > 0)
      ? pass("service lifecycle constraints are present only when justified")
      : fail("service lifecycle constraints are present only when justified", `actual constraint count: ${contract.service_lifecycle_constraints.length}`),
  );
  assertions.push(
    kernel.execution_packet_v1.pending_validations.length > 0 || contract.outcome.acceptance_checks.length === 0
      ? pass("execution packet carries pending validation work")
      : fail("execution packet carries pending validation work", "compiled acceptance checks did not enter execution packet pending validations"),
  );
  assertions.push(
    outcomeContractGate.allows_authoritative === expectation.authoritative_gate_allows
      ? pass("outcome contract gate matches expected authority")
      : fail(
          "outcome contract gate matches expected authority",
          `expected ${expectation.authoritative_gate_allows} but got ${outcomeContractGate.allows_authoritative}; reasons: ${outcomeContractGate.reasons.join(" | ")}`,
        ),
  );
  assertions.push(
    includesAll(outcomeContractGate.reasons, expectation.gate_reasons_include ?? [])
      ? pass("outcome contract gate explains denied authority")
      : fail(
          "outcome contract gate explains denied authority",
          `expected reasons ${(expectation.gate_reasons_include ?? []).join(", ")} in ${outcomeContractGate.reasons.join(" | ")}`,
        ),
  );

  const firstCorrectAction = assertions.find((assertion) => assertion.name === "next action is specific enough to start correctly")?.status === "pass";
  const afterExitCorrect = expectation.after_exit_required
    ? contract.outcome.must_hold_after_exit.length > 0
      && contract.outcome.external_visibility_requirements.length > 0
      && (!expectation.service_lifecycle_required || contract.service_lifecycle_constraints.every((constraint) =>
        constraint.must_survive_agent_exit && constraint.revalidate_from_fresh_shell && constraint.detach_then_probe
      ))
    : null;
  const gateFalsePositive = outcomeContractGate.allows_authoritative && !expectation.authoritative_gate_allows;
  const gateFalseNegative = !outcomeContractGate.allows_authoritative && expectation.authoritative_gate_allows;
  const falseConfidenceRisk =
    gateFalsePositive
    || (expectation.authoritative_gate_allows && expectation.after_exit_required && afterExitCorrect !== true)
    || (expectation.success_invariants_include.length > 0 && contract.outcome.success_invariants.length === 0);

  return {
    id: task.id,
    title: task.title,
    status: assertions.every((assertion) => assertion.status === "pass") && !falseConfidenceRisk ? "pass" : "fail",
    task_family: contract.task_family,
    workflow_signature: contract.workflow_signature,
    assertions,
    metrics: {
      first_correct_action: firstCorrectAction,
      wasted_step_count: countWastedSteps(compiled),
      retry_signal_count: countRetrySignals(task.trajectory),
      false_confidence_risk: falseConfidenceRisk,
      after_exit_correct: afterExitCorrect,
      outcome_gate_allows_authoritative: outcomeContractGate.allows_authoritative,
      expected_authoritative_gate_allows: expectation.authoritative_gate_allows,
      gate_false_positive: gateFalsePositive,
      gate_false_negative: gateFalseNegative,
    },
    compiled: {
      diagnostics: compiled.diagnostics,
      target_files: contract.target_files,
      acceptance_checks: contract.outcome.acceptance_checks,
      next_action: contract.next_action,
      outcome: contract.outcome,
      outcome_contract_gate: outcomeContractGate,
      service_lifecycle_constraint_count: contract.service_lifecycle_constraints.length,
    },
  };
}

function rate(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 1000) / 1000;
}

export function runRuntimeDogfoodSuite(tasks: RuntimeDogfoodTask[] = runtimeDogfoodTasks()): RuntimeDogfoodSuiteResult {
  const scenarios = tasks.map(evaluateTask);
  const afterExitScenarios = scenarios.filter(
    (scenario) =>
      scenario.metrics.after_exit_correct !== null
      && scenario.metrics.expected_authoritative_gate_allows,
  );
  return {
    generated_at: new Date().toISOString(),
    suite_version: "runtime_dogfood_v1",
    overall_status: scenarios.every((scenario) => scenario.status === "pass") ? "pass" : "fail",
    summary: {
      passed_scenarios: scenarios.filter((scenario) => scenario.status === "pass").length,
      total_scenarios: scenarios.length,
      first_correct_action_rate: rate(
        scenarios.filter((scenario) => scenario.metrics.first_correct_action).length,
        scenarios.length,
      ),
      false_confidence_rate: rate(
        scenarios.filter((scenario) => scenario.metrics.false_confidence_risk).length,
        scenarios.length,
      ),
      after_exit_correct_rate: afterExitScenarios.length === 0
        ? null
        : rate(
            afterExitScenarios.filter((scenario) => scenario.metrics.after_exit_correct === true).length,
            afterExitScenarios.length,
          ),
      wasted_step_count: scenarios.reduce((sum, scenario) => sum + scenario.metrics.wasted_step_count, 0),
      retry_signal_count: scenarios.reduce((sum, scenario) => sum + scenario.metrics.retry_signal_count, 0),
      gate_false_positive_rate: rate(
        scenarios.filter((scenario) => scenario.metrics.gate_false_positive).length,
        scenarios.length,
      ),
      gate_false_negative_rate: rate(
        scenarios.filter((scenario) => scenario.metrics.gate_false_negative).length,
        scenarios.length,
      ),
    },
    scenarios,
  };
}

export function formatRuntimeDogfoodMarkdown(result: RuntimeDogfoodSuiteResult): string {
  const lines = [
    "# Runtime Dogfood Summary",
    "",
    `Generated at: ${result.generated_at}`,
    `Status: ${result.overall_status}`,
    "",
    "## Metrics",
    "",
    `- passed_scenarios: ${result.summary.passed_scenarios}/${result.summary.total_scenarios}`,
    `- first_correct_action_rate: ${result.summary.first_correct_action_rate}`,
    `- false_confidence_rate: ${result.summary.false_confidence_rate}`,
    `- after_exit_correct_rate: ${result.summary.after_exit_correct_rate ?? "n/a"}`,
    `- wasted_step_count: ${result.summary.wasted_step_count}`,
    `- retry_signal_count: ${result.summary.retry_signal_count}`,
    `- gate_false_positive_rate: ${result.summary.gate_false_positive_rate}`,
    `- gate_false_negative_rate: ${result.summary.gate_false_negative_rate}`,
    "",
  ];
  for (const scenario of result.scenarios) {
    lines.push(`## ${scenario.id}`, "");
    lines.push(`${scenario.title}`, "");
    lines.push(`- status: ${scenario.status}`);
    lines.push(`- task_family: ${scenario.task_family ?? "null"}`);
    lines.push(`- first_correct_action: ${scenario.metrics.first_correct_action}`);
    lines.push(`- false_confidence_risk: ${scenario.metrics.false_confidence_risk}`);
    lines.push(`- after_exit_correct: ${scenario.metrics.after_exit_correct ?? "n/a"}`);
    lines.push(`- outcome_gate_allows_authoritative: ${scenario.metrics.outcome_gate_allows_authoritative}`);
    lines.push(`- expected_authoritative_gate_allows: ${scenario.metrics.expected_authoritative_gate_allows}`);
    lines.push(`- gate_reasons: ${scenario.compiled.outcome_contract_gate.reasons.join(" | ") || "none"}`);
    lines.push(`- target_files: ${scenario.compiled.target_files.join(" | ")}`);
    lines.push(`- next_action: ${scenario.compiled.next_action ?? "null"}`);
    lines.push("");
    for (const assertion of scenario.assertions) {
      lines.push(`- ${assertion.status.toUpperCase()} ${assertion.name}${assertion.detail ? `: ${assertion.detail}` : ""}`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

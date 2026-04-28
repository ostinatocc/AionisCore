import { buildExecutionContractFromTrajectoryCompile, type ExecutionContractV1 } from "../../src/memory/execution-contract.ts";
import { buildOutcomeContractGate, type OutcomeContractGate } from "../../src/memory/contract-trust.ts";
import {
  assessExecutionEvidence,
  buildExecutionEvidenceFromValidation,
  ExecutionEvidenceV1Schema,
  type ExecutionEvidenceAssessmentV1,
  type ExecutionEvidenceV1,
} from "../../src/memory/execution-evidence.ts";
import { buildTrajectoryCompileLite } from "../../src/memory/trajectory-compile.ts";
import { applyTrajectoryCompileExecutionKernel } from "../../src/memory/trajectory-compile-runtime.ts";
import type { TrajectoryCompileHintsInput, TrajectoryCompileResponse, TrajectoryCompileSourceInput } from "../../src/memory/schemas.ts";
import {
  buildRuntimeAuthorityDecisionReport,
  buildRuntimeAuthorityDecisionReportFromGates,
  type RuntimeAuthorityDecisionReportV1,
  type RuntimeAuthorityDecisionSummaryV1,
  type RuntimeAuthorityDecisionV1,
} from "../../src/memory/authority-decision-report.ts";

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
  evidence_allows_authoritative: boolean;
  stable_promotion_allowed: boolean;
  evidence_reasons_include?: string[];
};

export type RuntimeDogfoodExpectationSpec = Omit<
  DogfoodExpectation,
  "acceptance_checks_match" | "dependency_requirements_match" | "external_visibility_requirements_match" | "next_action_match"
> & {
  acceptance_checks_match: string[];
  dependency_requirements_match: string[];
  external_visibility_requirements_match: string[];
  next_action_match: string[];
};

export type RuntimeDogfoodEvidenceSourceKind = "declared_fixture" | "external_probe" | "none";

export type RuntimeDogfoodProofClaimScope =
  | "contract_only"
  | "contract_with_declared_fixture_evidence"
  | "contract_with_external_probe_evidence";

export type RuntimeDogfoodScenarioProof = {
  evidence_source: RuntimeDogfoodEvidenceSourceKind;
  authority_claim_scope: RuntimeDogfoodProofClaimScope;
  execution_evidence_supplied: boolean;
  after_exit_evidence_supplied: boolean;
  fresh_shell_probe_evidence_supplied: boolean;
  live_external_validation: boolean;
};

export type RuntimeDogfoodProofBoundary = {
  boundary_version: "runtime_dogfood_proof_boundary_v1";
  suite_kind: "runtime_contract_dogfood";
  claim_scope: string[];
  live_execution_scenarios: number;
  fixture_evidence_scenarios: number;
  scenarios_without_execution_evidence: number;
};

export type RuntimeDogfoodCoverage = {
  coverage_version: "runtime_dogfood_coverage_v1";
  task_families: Record<string, number>;
  after_exit_required_scenarios: number;
  service_lifecycle_required_scenarios: number;
  external_visibility_required_scenarios: number;
  negative_control_scenarios: number;
};

export type RuntimeDogfoodTask = {
  id: string;
  title: string;
  query_text: string;
  trajectory: TrajectoryCompileSourceInput;
  hints?: TrajectoryCompileHintsInput;
  evidence_source?: RuntimeDogfoodEvidenceSourceKind;
  execution_evidence?: ExecutionEvidenceV1;
  expectations: DogfoodExpectation;
};

export type RuntimeDogfoodTaskSpec = Omit<RuntimeDogfoodTask, "execution_evidence" | "expectations"> & {
  execution_evidence?: unknown;
  expectations: RuntimeDogfoodExpectationSpec;
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
  proof: RuntimeDogfoodScenarioProof;
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
    execution_validation_passed: boolean | null;
    after_exit_revalidated: boolean | null;
    fresh_shell_probe_passed: boolean | null;
    execution_evidence_allows_authoritative: boolean;
    execution_evidence_allows_stable_promotion: boolean;
    stable_promotion_allowed: boolean;
    false_confidence_detected: boolean;
    false_confidence_blocked: boolean;
    unblocked_false_confidence: boolean;
  };
  compiled: Pick<TrajectoryCompileResponse, "diagnostics"> & {
    target_files: string[];
    acceptance_checks: string[];
    next_action: string | null;
    outcome: ExecutionContractV1["outcome"];
    outcome_contract_gate: OutcomeContractGate;
    execution_evidence: ExecutionEvidenceV1 | null;
    execution_evidence_assessment: ExecutionEvidenceAssessmentV1;
    service_lifecycle_constraint_count: number;
  };
  authority_decision_report: RuntimeAuthorityDecisionReportV1;
};

export type RuntimeDogfoodAuthorityGateResult =
  | "authoritative_allowed"
  | "blocked_by_outcome_contract"
  | "blocked_by_execution_evidence"
  | "blocked_by_outcome_and_execution_evidence";

export type RuntimeDogfoodScenarioReport = {
  report_version: "runtime_dogfood_scenario_report_v1";
  id: string;
  title: string;
  status: RuntimeDogfoodScenarioResult["status"];
  product_status:
    | "pass_authority_safe"
    | "pass_advisory_only"
    | "fail_contract_or_evidence"
    | "fail_unblocked_false_confidence";
  task_family: string | null;
  workflow_signature: string | null;
  evidence_source: RuntimeDogfoodEvidenceSourceKind;
  live_external_validation: boolean;
  authority_gate_result: RuntimeDogfoodAuthorityGateResult;
  authority_blockers: string[];
  authority_decision_summary: RuntimeAuthorityDecisionSummaryV1;
  authority_decisions: RuntimeAuthorityDecisionV1[];
  product_metrics: {
    first_correct_action: boolean;
    wasted_steps: number;
    retries: number;
    false_confidence_risk: boolean;
    false_confidence_detected: boolean;
    false_confidence_blocked: boolean;
    unblocked_false_confidence: boolean;
    after_exit_contract_correct: boolean | null;
    after_exit_evidence_passed: boolean | null;
    cross_shell_revalidation_passed: boolean | null;
    stable_promotion_allowed: boolean;
  };
  contract_excerpt: {
    target_files: string[];
    acceptance_checks: string[];
    next_action: string | null;
    success_invariants: string[];
    dependency_requirements: string[];
    environment_assumptions: string[];
    must_hold_after_exit: string[];
    external_visibility_requirements: string[];
  };
  failed_assertions: RuntimeDogfoodAssertion[];
  recommended_next_action: string;
};

export const runtimeDogfoodRequiredLiveTaskFamilies = [
  "agent_takeover",
  "git_deploy_webserver",
  "handoff_resume",
  "package_publish_validate",
  "service_publish_validate",
  "task_resume_interrupted_export_pipeline",
  "ai_code_ci_repair",
] as const;

export type RuntimeDogfoodReadinessRequirement = {
  id: string;
  scope: "regression" | "live_product";
  status: "pass" | "fail";
  actual: string | number | boolean | null;
  expected: string | number | boolean;
  message: string;
};

export type RuntimeDogfoodReadinessGateV1 = {
  gate_version: "runtime_dogfood_readiness_gate_v1";
  claim_level: "not_ready" | "regression" | "live_product";
  regression_status: "pass" | "fail";
  live_product_status: "pass" | "fail";
  required_live_task_families: readonly string[];
  requirements: RuntimeDogfoodReadinessRequirement[];
  failed_requirements: RuntimeDogfoodReadinessRequirement[];
  live_product_blockers: string[];
  operator_summary: string;
};

export type RuntimeDogfoodReportV1 = {
  report_version: "runtime_dogfood_report_v1";
  generated_at: string;
  suite_version: "runtime_dogfood_v1";
  overall_status: "pass" | "fail";
  product_status:
    | "pass_live_evidence"
    | "pass_fixture_evidence_only"
    | "fail_contract_or_evidence"
    | "fail_unblocked_false_confidence";
  proof_boundary: RuntimeDogfoodProofBoundary;
  coverage: RuntimeDogfoodCoverage;
  product_metrics: {
    passed_scenarios: number;
    total_scenarios: number;
    first_correct_action_rate: number;
    wasted_steps: number;
    retries: number;
    false_confidence_rate: number;
    false_confidence_detected_count: number;
    false_confidence_blocked_count: number;
    unblocked_false_confidence_rate: number;
    after_exit_contract_correctness_rate: number | null;
    after_exit_evidence_success_rate: number | null;
    cross_shell_revalidation_success_rate: number | null;
    authority_gate_false_positive_rate: number;
    authority_gate_false_negative_rate: number;
    stable_promotion_allowed_rate: number;
    live_execution_coverage_rate: number;
    live_execution_coverage_by_family: Record<string, {
      live_execution_scenarios: number;
      total_scenarios: number;
      rate: number;
    }>;
  };
  authority_decision_report: RuntimeAuthorityDecisionReportV1;
  readiness_gate: RuntimeDogfoodReadinessGateV1;
  blocking_risks: string[];
  next_actions: string[];
  scenarios: RuntimeDogfoodScenarioReport[];
};

export type RuntimeDogfoodSuiteWithoutReport = {
  generated_at: string;
  suite_version: "runtime_dogfood_v1";
  overall_status: "pass" | "fail";
  proof_boundary: RuntimeDogfoodProofBoundary;
  coverage: RuntimeDogfoodCoverage;
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
    stable_promotion_allowed_rate: number;
    false_confidence_detected_count: number;
    false_confidence_blocked_count: number;
    unblocked_false_confidence_rate: number;
  };
  scenarios: RuntimeDogfoodScenarioResult[];
};

export type RuntimeDogfoodSuiteResult = RuntimeDogfoodSuiteWithoutReport & {
  report: RuntimeDogfoodReportV1;
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

function evidenceSourceKind(task: RuntimeDogfoodTask): RuntimeDogfoodEvidenceSourceKind {
  if (task.evidence_source) return task.evidence_source;
  return task.execution_evidence ? "declared_fixture" : "none";
}

function buildScenarioProof(task: RuntimeDogfoodTask): RuntimeDogfoodScenarioProof {
  const evidenceSource = evidenceSourceKind(task);
  const evidence = task.execution_evidence ?? null;
  const liveExternalValidation = evidenceSource === "external_probe";
  const authorityClaimScope: RuntimeDogfoodProofClaimScope =
    evidenceSource === "external_probe"
      ? "contract_with_external_probe_evidence"
      : evidenceSource === "declared_fixture"
        ? "contract_with_declared_fixture_evidence"
        : "contract_only";
  return {
    evidence_source: evidenceSource,
    authority_claim_scope: authorityClaimScope,
    execution_evidence_supplied: !!evidence,
    after_exit_evidence_supplied: evidence?.after_exit_revalidated !== null && evidence?.after_exit_revalidated !== undefined,
    fresh_shell_probe_evidence_supplied: evidence?.fresh_shell_probe_passed !== null && evidence?.fresh_shell_probe_passed !== undefined,
    live_external_validation: liveExternalValidation,
  };
}

function compileRegexList(patterns: string[], fieldName: string): RegExp[] {
  return patterns.map((pattern, index) => {
    try {
      return new RegExp(pattern);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`invalid ${fieldName}[${index}] regex: ${message}`);
    }
  });
}

function normalizeExecutionEvidence(value: unknown): ExecutionEvidenceV1 | undefined {
  if (value === undefined || value === null) return undefined;
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return ExecutionEvidenceV1Schema.parse({
    schema_version: "execution_evidence_v1",
    ...record,
  });
}

export function runtimeDogfoodTaskFromSpec(spec: RuntimeDogfoodTaskSpec): RuntimeDogfoodTask {
  return {
    id: spec.id,
    title: spec.title,
    query_text: spec.query_text,
    trajectory: spec.trajectory,
    hints: spec.hints,
    evidence_source: spec.evidence_source,
    execution_evidence: normalizeExecutionEvidence(spec.execution_evidence),
    expectations: {
      ...spec.expectations,
      acceptance_checks_match: compileRegexList(spec.expectations.acceptance_checks_match, "acceptance_checks_match"),
      dependency_requirements_match: compileRegexList(spec.expectations.dependency_requirements_match, "dependency_requirements_match"),
      external_visibility_requirements_match: compileRegexList(
        spec.expectations.external_visibility_requirements_match,
        "external_visibility_requirements_match",
      ),
      next_action_match: compileRegexList(spec.expectations.next_action_match, "next_action_match"),
    },
  };
}

export function runtimeDogfoodTasksFromSpecs(specs: RuntimeDogfoodTaskSpec[]): RuntimeDogfoodTask[] {
  return specs.map(runtimeDogfoodTaskFromSpec);
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
        evidence_allows_authoritative: true,
        stable_promotion_allowed: true,
      },
      evidence_source: "declared_fixture",
      execution_evidence: buildExecutionEvidenceFromValidation({
        validationPassed: true,
        afterExitRevalidated: true,
        freshShellProbePassed: true,
        validationBoundary: "external_verifier",
        evidenceRefs: ["dogfood:service_after_exit:fresh_shell_probe"],
      }),
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
        evidence_allows_authoritative: true,
        stable_promotion_allowed: true,
      },
      evidence_source: "declared_fixture",
      execution_evidence: buildExecutionEvidenceFromValidation({
        validationPassed: true,
        afterExitRevalidated: true,
        freshShellProbePassed: true,
        validationBoundary: "external_verifier",
        evidenceRefs: ["dogfood:publish_install:pip_install_fresh_shell"],
      }),
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
        evidence_allows_authoritative: true,
        stable_promotion_allowed: true,
      },
      evidence_source: "declared_fixture",
      execution_evidence: buildExecutionEvidenceFromValidation({
        validationPassed: true,
        freshShellProbePassed: true,
        validationBoundary: "external_verifier",
        evidenceRefs: ["dogfood:deploy_hook_web:external_curl_probe"],
      }),
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
        evidence_allows_authoritative: true,
        stable_promotion_allowed: true,
      },
      evidence_source: "declared_fixture",
      execution_evidence: buildExecutionEvidenceFromValidation({
        validationPassed: true,
        validationBoundary: "external_verifier",
        evidenceRefs: ["dogfood:interrupted_resume:targeted_export_test"],
      }),
    },
    {
      id: "handoff_next_day",
      title: "Next-day handoff resume",
      query_text: "Resume yesterday's payment webhook repair from the stored handoff and run the narrow verification.",
      trajectory: {
        title: "Payment webhook next-day handoff",
        task_family: "handoff_resume",
        steps: [
          { role: "assistant", text: "Day 1 handoff says target files are src/payments/webhook.ts and tests/payments/webhook.test.ts." },
          { role: "tool", tool_name: "bash", command: "npm test -- tests/payments/webhook.test.ts" },
          { role: "assistant", text: "Day 2 agent should continue in src/payments/webhook.ts, preserve the stored handoff context, and rerun npm test -- tests/payments/webhook.test.ts before closing." },
        ],
      },
      expectations: {
        target_files_include: ["src/payments/webhook.ts", "tests/payments/webhook.test.ts"],
        acceptance_checks_match: [/npm test -- tests\/payments\/webhook\.test\.ts/],
        next_action_match: [/src\/payments\/webhook\.ts/i, /npm test -- tests\/payments\/webhook\.test\.ts/i],
        success_invariants_include: ["all_acceptance_checks_pass"],
        dependency_requirements_match: [],
        environment_assumptions_include: [],
        must_hold_after_exit_include: [],
        external_visibility_requirements_match: [],
        service_lifecycle_required: false,
        after_exit_required: false,
        authoritative_gate_allows: true,
        evidence_allows_authoritative: true,
        stable_promotion_allowed: true,
      },
      evidence_source: "declared_fixture",
      execution_evidence: buildExecutionEvidenceFromValidation({
        validationPassed: true,
        validationBoundary: "external_verifier",
        evidenceRefs: ["dogfood:handoff_next_day:targeted_payment_webhook_test"],
      }),
    },
    {
      id: "agent_takeover",
      title: "Second agent takeover with execution contract",
      query_text: "Agent B takes over the search indexer repair from Agent A and must validate the same narrow slice.",
      trajectory: {
        title: "Search indexer agent takeover",
        task_family: "agent_takeover",
        steps: [
          { role: "assistant", text: "Agent A left an execution contract for src/search/indexer.ts and tests/search/indexer.test.ts after triage." },
          { role: "tool", tool_name: "bash", command: "npm test -- tests/search/indexer.test.ts" },
          { role: "assistant", text: "Agent B should take over in src/search/indexer.ts, keep tests/search/indexer.test.ts aligned, and rerun npm test -- tests/search/indexer.test.ts before handing back." },
        ],
      },
      expectations: {
        target_files_include: ["src/search/indexer.ts", "tests/search/indexer.test.ts"],
        acceptance_checks_match: [/npm test -- tests\/search\/indexer\.test\.ts/],
        next_action_match: [/src\/search\/indexer\.ts/i, /npm test -- tests\/search\/indexer\.test\.ts/i],
        success_invariants_include: ["all_acceptance_checks_pass"],
        dependency_requirements_match: [],
        environment_assumptions_include: [],
        must_hold_after_exit_include: [],
        external_visibility_requirements_match: [],
        service_lifecycle_required: false,
        after_exit_required: false,
        authoritative_gate_allows: true,
        evidence_allows_authoritative: true,
        stable_promotion_allowed: true,
      },
      evidence_source: "declared_fixture",
      execution_evidence: buildExecutionEvidenceFromValidation({
        validationPassed: true,
        validationBoundary: "external_verifier",
        evidenceRefs: ["dogfood:agent_takeover:targeted_search_indexer_test"],
      }),
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
        evidence_allows_authoritative: true,
        stable_promotion_allowed: true,
      },
      evidence_source: "declared_fixture",
      execution_evidence: buildExecutionEvidenceFromValidation({
        validationPassed: true,
        validationBoundary: "external_verifier",
        evidenceRefs: ["dogfood:cross_agent_db_handoff:integrity_check"],
      }),
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
        evidence_allows_authoritative: true,
        stable_promotion_allowed: false,
      },
      evidence_source: "declared_fixture",
      execution_evidence: buildExecutionEvidenceFromValidation({
        validationPassed: true,
        afterExitRevalidated: true,
        freshShellProbePassed: true,
        validationBoundary: "external_verifier",
        evidenceRefs: ["dogfood:thin_service_missing_detach:probe"],
      }),
    },
    {
      id: "service_after_exit_evidence_failed",
      title: "Service after-exit execution evidence blocks false confidence",
      query_text: "Keep the dashboard status service alive after the agent exits and verify it from a fresh shell.",
      trajectory: {
        title: "Dashboard service recovery with failed fresh-shell proof",
        task_family: "service_publish_validate",
        steps: [
          { role: "assistant", text: "The dashboard status service responds during the agent session but must survive after the worker exits." },
          { role: "tool", tool_name: "bash", command: "nohup node scripts/dev-server.mjs --port 4173 >/tmp/aionis-dashboard.log 2>&1 &" },
          { role: "tool", tool_name: "bash", command: "curl -fsS http://127.0.0.1:4173/healthz" },
          { role: "assistant", text: "Update scripts/dev-server.mjs, launch it detached, then rerun curl -fsS http://127.0.0.1:4173/healthz from a fresh shell after the agent exits." },
        ],
      },
      execution_evidence: buildExecutionEvidenceFromValidation({
        validationPassed: true,
        afterExitRevalidated: false,
        freshShellProbePassed: false,
        validationBoundary: "external_verifier",
        failureReason: "fresh_shell_probe_connection_refused_after_agent_exit",
        falseConfidenceDetected: true,
        evidenceRefs: ["dogfood:service_after_exit_evidence_failed:fresh_shell_probe"],
      }),
      evidence_source: "declared_fixture",
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
        evidence_allows_authoritative: false,
        stable_promotion_allowed: false,
        evidence_reasons_include: [
          "after_exit_revalidation_failed",
          "fresh_shell_probe_failed",
          "false_confidence_detected",
        ],
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
  const executionEvidenceAssessment = assessExecutionEvidence({
    executionContract: contract,
    evidence: task.execution_evidence ?? null,
    requestedTrust: "authoritative",
  });
  const kernel = applyTrajectoryCompileExecutionKernel({
    compiled,
    queryText: task.query_text,
    repoRoot: task.hints?.repo_root ?? null,
  });
  const assertions: RuntimeDogfoodAssertion[] = [];
  const expectation = task.expectations;
  const proof = buildScenarioProof(task);

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
  assertions.push(
    executionEvidenceAssessment.allows_authoritative === expectation.evidence_allows_authoritative
      ? pass("execution evidence gate matches expected authority")
      : fail(
          "execution evidence gate matches expected authority",
          `expected ${expectation.evidence_allows_authoritative} but got ${executionEvidenceAssessment.allows_authoritative}; reasons: ${executionEvidenceAssessment.reasons.join(" | ")}`,
        ),
  );
  assertions.push(
    includesAll(executionEvidenceAssessment.reasons, expectation.evidence_reasons_include ?? [])
      ? pass("execution evidence gate explains denied authority")
      : fail(
          "execution evidence gate explains denied authority",
          `expected reasons ${(expectation.evidence_reasons_include ?? []).join(", ")} in ${executionEvidenceAssessment.reasons.join(" | ")}`,
        ),
  );
  assertions.push(
    (proof.evidence_source === "none") !== proof.execution_evidence_supplied
      ? pass("dogfood proof source matches supplied execution evidence")
      : fail(
          "dogfood proof source matches supplied execution evidence",
          `evidence_source=${proof.evidence_source}; execution_evidence_supplied=${proof.execution_evidence_supplied}`,
        ),
  );
  assertions.push(
    !expectation.stable_promotion_allowed || proof.execution_evidence_supplied
      ? pass("stable promotion scenarios declare execution evidence")
      : fail("stable promotion scenarios declare execution evidence", "stable promotion would be evaluated without execution evidence"),
  );
  assertions.push(
    !expectation.after_exit_required || proof.after_exit_evidence_supplied
      ? pass("after-exit scenarios declare after-exit evidence status")
      : fail("after-exit scenarios declare after-exit evidence status", "after_exit_revalidated was not supplied"),
  );
  assertions.push(
    !expectation.after_exit_required || proof.fresh_shell_probe_evidence_supplied
      ? pass("fresh-shell scenarios declare fresh-shell probe status")
      : fail("fresh-shell scenarios declare fresh-shell probe status", "fresh_shell_probe_passed was not supplied"),
  );
  assertions.push(
    proof.evidence_source !== "external_probe" || proof.execution_evidence_supplied
      ? pass("external probe scenarios include execution evidence")
      : fail("external probe scenarios include execution evidence", "external probe source declared without execution evidence"),
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
  const stablePromotionAllowed =
    outcomeContractGate.allows_authoritative && executionEvidenceAssessment.allows_stable_promotion;
  const falseConfidenceDetected = !!task.execution_evidence?.false_confidence_detected
    || task.execution_evidence?.validation_passed === false
    || task.execution_evidence?.after_exit_revalidated === false
    || task.execution_evidence?.fresh_shell_probe_passed === false;
  const falseConfidenceBlocked = falseConfidenceDetected && !stablePromotionAllowed;
  const unblockedFalseConfidence = falseConfidenceDetected && stablePromotionAllowed;
  const falseConfidenceRisk =
    gateFalsePositive
    || unblockedFalseConfidence
    || (expectation.authoritative_gate_allows && expectation.after_exit_required && afterExitCorrect !== true)
    || (expectation.success_invariants_include.length > 0 && contract.outcome.success_invariants.length === 0);
  const authorityDecisionReport = buildRuntimeAuthorityDecisionReportFromGates({
    subject: task.id,
    outcomeContractGate,
    executionEvidenceAssessment,
    stablePromotionAllowed,
    falseConfidenceDetected,
    candidateWorkflowVisible: !stablePromotionAllowed,
    trustedPatternOnlyVisible: false,
    policyDefaultAttempted: true,
  });
  assertions.push(
    stablePromotionAllowed === expectation.stable_promotion_allowed
      ? pass("learning promotion respects execution evidence")
      : fail(
          "learning promotion respects execution evidence",
          `expected ${expectation.stable_promotion_allowed} but got ${stablePromotionAllowed}`,
        ),
  );

  return {
    id: task.id,
    title: task.title,
    status: assertions.every((assertion) => assertion.status === "pass") && !falseConfidenceRisk ? "pass" : "fail",
    task_family: contract.task_family,
    workflow_signature: contract.workflow_signature,
    proof,
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
      execution_validation_passed: task.execution_evidence?.validation_passed ?? null,
      after_exit_revalidated: task.execution_evidence?.after_exit_revalidated ?? null,
      fresh_shell_probe_passed: task.execution_evidence?.fresh_shell_probe_passed ?? null,
      execution_evidence_allows_authoritative: executionEvidenceAssessment.allows_authoritative,
      execution_evidence_allows_stable_promotion: executionEvidenceAssessment.allows_stable_promotion,
      stable_promotion_allowed: stablePromotionAllowed,
      false_confidence_detected: falseConfidenceDetected,
      false_confidence_blocked: falseConfidenceBlocked,
      unblocked_false_confidence: unblockedFalseConfidence,
    },
    compiled: {
      diagnostics: compiled.diagnostics,
      target_files: contract.target_files,
      acceptance_checks: contract.outcome.acceptance_checks,
      next_action: contract.next_action,
      outcome: contract.outcome,
      outcome_contract_gate: outcomeContractGate,
      execution_evidence: task.execution_evidence ?? null,
      execution_evidence_assessment: executionEvidenceAssessment,
      service_lifecycle_constraint_count: contract.service_lifecycle_constraints.length,
    },
    authority_decision_report: authorityDecisionReport,
  };
}

function rate(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 1000) / 1000;
}

function nullableRate(values: (boolean | null)[]): number | null {
  const measured = values.filter((value): value is boolean => value !== null);
  if (measured.length === 0) return null;
  return rate(measured.filter(Boolean).length, measured.length);
}

function liveCoverageByFamily(scenarios: RuntimeDogfoodScenarioResult[]): RuntimeDogfoodReportV1["product_metrics"]["live_execution_coverage_by_family"] {
  const families = new Map<string, { live: number; total: number }>();
  for (const scenario of scenarios) {
    const family = scenario.task_family ?? "unknown";
    const current = families.get(family) ?? { live: 0, total: 0 };
    current.total += 1;
    if (scenario.proof.evidence_source === "external_probe") current.live += 1;
    families.set(family, current);
  }
  return Object.fromEntries(
    [...families.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([family, counts]) => [
        family,
        {
          live_execution_scenarios: counts.live,
          total_scenarios: counts.total,
          rate: rate(counts.live, counts.total),
        },
      ]),
  );
}

function authorityGateResult(scenario: RuntimeDogfoodScenarioResult): RuntimeDogfoodAuthorityGateResult {
  const outcomeAllows = scenario.metrics.outcome_gate_allows_authoritative;
  const evidenceAllows = scenario.metrics.execution_evidence_allows_authoritative;
  if (outcomeAllows && evidenceAllows) return "authoritative_allowed";
  if (!outcomeAllows && !evidenceAllows) return "blocked_by_outcome_and_execution_evidence";
  if (!outcomeAllows) return "blocked_by_outcome_contract";
  return "blocked_by_execution_evidence";
}

function scenarioAuthorityBlockers(scenario: RuntimeDogfoodScenarioResult): string[] {
  const blockers = new Set<string>();
  if (!scenario.metrics.outcome_gate_allows_authoritative) {
    for (const reason of scenario.compiled.outcome_contract_gate.reasons) {
      blockers.add(`outcome_contract:${reason}`);
    }
  }
  if (!scenario.metrics.execution_evidence_allows_authoritative) {
    for (const reason of scenario.compiled.execution_evidence_assessment.reasons) {
      blockers.add(`execution_evidence:${reason}`);
    }
  }
  if (scenario.metrics.false_confidence_risk) blockers.add("runtime:false_confidence_risk");
  if (scenario.metrics.unblocked_false_confidence) blockers.add("runtime:unblocked_false_confidence");
  for (const assertion of scenario.assertions) {
    if (assertion.status === "fail") blockers.add(`assertion:${assertion.name}`);
  }
  return [...blockers];
}

function scenarioProductStatus(scenario: RuntimeDogfoodScenarioResult): RuntimeDogfoodScenarioReport["product_status"] {
  if (scenario.metrics.unblocked_false_confidence) return "fail_unblocked_false_confidence";
  if (scenario.status === "fail") return "fail_contract_or_evidence";
  if (scenario.metrics.stable_promotion_allowed) return "pass_authority_safe";
  return "pass_advisory_only";
}

function scenarioRecommendedNextAction(scenario: RuntimeDogfoodScenarioResult): string {
  if (scenario.metrics.unblocked_false_confidence) {
    return "Block stable promotion when execution evidence reports false confidence or failed after-exit/fresh-shell proof.";
  }
  const failedAssertions = scenario.assertions.filter((assertion) => assertion.status === "fail");
  if (failedAssertions.length > 0) {
    return `Fix Contract Compiler output for failed assertions: ${failedAssertions.map((assertion) => assertion.name).join("; ")}.`;
  }
  if (!scenario.metrics.outcome_gate_allows_authoritative) {
    return "Keep the workflow advisory until the outcome contract includes durable success, visibility, and lifecycle requirements.";
  }
  if (!scenario.metrics.execution_evidence_allows_authoritative) {
    return "Keep the workflow advisory until host execution evidence proves validation, after-exit durability, and fresh-shell visibility.";
  }
  if (!scenario.proof.live_external_validation) {
    return "Replace fixture evidence with an external_probe run before making live product claims for this task family.";
  }
  return "No blocking action; keep this scenario in recurring dogfood coverage.";
}

function buildScenarioReport(scenario: RuntimeDogfoodScenarioResult): RuntimeDogfoodScenarioReport {
  return {
    report_version: "runtime_dogfood_scenario_report_v1",
    id: scenario.id,
    title: scenario.title,
    status: scenario.status,
    product_status: scenarioProductStatus(scenario),
    task_family: scenario.task_family,
    workflow_signature: scenario.workflow_signature,
    evidence_source: scenario.proof.evidence_source,
    live_external_validation: scenario.proof.live_external_validation,
    authority_gate_result: authorityGateResult(scenario),
    authority_blockers: scenarioAuthorityBlockers(scenario),
    authority_decision_summary: scenario.authority_decision_report.summary,
    authority_decisions: scenario.authority_decision_report.decisions,
    product_metrics: {
      first_correct_action: scenario.metrics.first_correct_action,
      wasted_steps: scenario.metrics.wasted_step_count,
      retries: scenario.metrics.retry_signal_count,
      false_confidence_risk: scenario.metrics.false_confidence_risk,
      false_confidence_detected: scenario.metrics.false_confidence_detected,
      false_confidence_blocked: scenario.metrics.false_confidence_blocked,
      unblocked_false_confidence: scenario.metrics.unblocked_false_confidence,
      after_exit_contract_correct: scenario.metrics.after_exit_correct,
      after_exit_evidence_passed: scenario.metrics.after_exit_revalidated,
      cross_shell_revalidation_passed: scenario.metrics.fresh_shell_probe_passed,
      stable_promotion_allowed: scenario.metrics.stable_promotion_allowed,
    },
    contract_excerpt: {
      target_files: scenario.compiled.target_files,
      acceptance_checks: scenario.compiled.acceptance_checks,
      next_action: scenario.compiled.next_action,
      success_invariants: scenario.compiled.outcome.success_invariants,
      dependency_requirements: scenario.compiled.outcome.dependency_requirements,
      environment_assumptions: scenario.compiled.outcome.environment_assumptions,
      must_hold_after_exit: scenario.compiled.outcome.must_hold_after_exit,
      external_visibility_requirements: scenario.compiled.outcome.external_visibility_requirements,
    },
    failed_assertions: scenario.assertions.filter((assertion) => assertion.status === "fail"),
    recommended_next_action: scenarioRecommendedNextAction(scenario),
  };
}

function buildRuntimeDogfoodProofBoundary(scenarios: RuntimeDogfoodScenarioResult[]): RuntimeDogfoodProofBoundary {
  return {
    boundary_version: "runtime_dogfood_proof_boundary_v1",
    suite_kind: "runtime_contract_dogfood",
    claim_scope: [
      "Validates trajectory compilation, outcome contract gating, execution evidence assessment, and learning promotion decisions.",
      "declared_fixture evidence is structured evidence supplied by the scenario, not a live external probe.",
      "Only external_probe scenarios can claim live external execution validation.",
    ],
    live_execution_scenarios: scenarios.filter((scenario) => scenario.proof.evidence_source === "external_probe").length,
    fixture_evidence_scenarios: scenarios.filter((scenario) => scenario.proof.evidence_source === "declared_fixture").length,
    scenarios_without_execution_evidence: scenarios.filter((scenario) => scenario.proof.evidence_source === "none").length,
  };
}

function buildRuntimeDogfoodCoverage(scenarios: RuntimeDogfoodScenarioResult[]): RuntimeDogfoodCoverage {
  const taskFamilies: Record<string, number> = {};
  for (const scenario of scenarios) {
    const family = scenario.task_family ?? "unknown";
    taskFamilies[family] = (taskFamilies[family] ?? 0) + 1;
  }
  return {
    coverage_version: "runtime_dogfood_coverage_v1",
    task_families: Object.fromEntries(Object.entries(taskFamilies).sort(([a], [b]) => a.localeCompare(b))),
    after_exit_required_scenarios: scenarios.filter((scenario) => scenario.metrics.after_exit_correct !== null).length,
    service_lifecycle_required_scenarios: scenarios.filter((scenario) => scenario.compiled.service_lifecycle_constraint_count > 0).length,
    external_visibility_required_scenarios: scenarios.filter((scenario) =>
      scenario.compiled.outcome.external_visibility_requirements.length > 0
    ).length,
    negative_control_scenarios: scenarios.filter((scenario) =>
      !scenario.metrics.expected_authoritative_gate_allows || scenario.metrics.false_confidence_detected
    ).length,
  };
}

function reportProductStatus(args: {
  overallStatus: "pass" | "fail";
  proofBoundary: RuntimeDogfoodProofBoundary;
  summary: RuntimeDogfoodSuiteWithoutReport["summary"];
}): RuntimeDogfoodReportV1["product_status"] {
  if (args.summary.unblocked_false_confidence_rate > 0) return "fail_unblocked_false_confidence";
  if (args.overallStatus === "fail") return "fail_contract_or_evidence";
  if (args.proofBoundary.live_execution_scenarios > 0) return "pass_live_evidence";
  return "pass_fixture_evidence_only";
}

function reportBlockingRisks(args: {
  proofBoundary: RuntimeDogfoodProofBoundary;
  summary: RuntimeDogfoodSuiteWithoutReport["summary"];
  scenarios: RuntimeDogfoodScenarioResult[];
}): string[] {
  const risks: string[] = [];
  if (args.summary.unblocked_false_confidence_rate > 0) {
    risks.push("unblocked false confidence reached stable promotion");
  }
  if (args.summary.passed_scenarios < args.summary.total_scenarios) {
    risks.push("one or more dogfood scenarios failed contract, evidence, or authority assertions");
  }
  if (args.summary.gate_false_positive_rate > 0) {
    risks.push("outcome contract gate allowed authority when the scenario expected denial");
  }
  if (args.summary.gate_false_negative_rate > 0) {
    risks.push("outcome contract gate denied authority when the scenario expected allowance");
  }
  if (args.proofBoundary.live_execution_scenarios === 0) {
    risks.push("suite is fixture-backed only; live external product proof still requires external_probe coverage");
  }
  if (args.scenarios.some((scenario) =>
    scenario.proof.evidence_source === "external_probe"
    && (
      scenario.metrics.execution_validation_passed === false
      || scenario.metrics.after_exit_revalidated === false
      || scenario.metrics.fresh_shell_probe_passed === false
    )
  )) {
    risks.push("one or more live external probes supplied failed execution evidence");
  }
  return risks;
}

function reportNextActions(args: {
  productStatus: RuntimeDogfoodReportV1["product_status"];
  proofBoundary: RuntimeDogfoodProofBoundary;
  scenarios: RuntimeDogfoodScenarioResult[];
}): string[] {
  const actions: string[] = [];
  if (args.productStatus === "fail_unblocked_false_confidence") {
    actions.push("Fix Trust Gate before adding more dogfood scenarios.");
  }
  if (args.productStatus === "fail_contract_or_evidence") {
    actions.push("Fix Contract Compiler or execution-evidence assessment for failing scenarios before promoting learned workflows.");
  }
  if (args.proofBoundary.live_execution_scenarios === 0) {
    actions.push("Run at least one external_probe dogfood slice before using this report as live product evidence.");
  }
  for (const scenario of args.scenarios) {
    const nextAction = scenarioRecommendedNextAction(scenario);
    if (!actions.includes(nextAction)) actions.push(nextAction);
  }
  return actions.slice(0, 8);
}

function readinessRequirement(args: {
  id: string;
  scope: RuntimeDogfoodReadinessRequirement["scope"];
  passed: boolean;
  actual: RuntimeDogfoodReadinessRequirement["actual"];
  expected: RuntimeDogfoodReadinessRequirement["expected"];
  message: string;
}): RuntimeDogfoodReadinessRequirement {
  return {
    id: args.id,
    scope: args.scope,
    status: args.passed ? "pass" : "fail",
    actual: args.actual,
    expected: args.expected,
    message: args.message,
  };
}

function metricEqualsOne(value: number | null): boolean {
  return value === 1;
}

function metricEqualsZero(value: number | null): boolean {
  return value === 0;
}

function buildRuntimeDogfoodReadinessGate(args: {
  overallStatus: RuntimeDogfoodReportV1["overall_status"];
  productStatus: RuntimeDogfoodReportV1["product_status"];
  productMetrics: RuntimeDogfoodReportV1["product_metrics"];
}): RuntimeDogfoodReadinessGateV1 {
  const metrics = args.productMetrics;
  const requirements: RuntimeDogfoodReadinessRequirement[] = [
    readinessRequirement({
      id: "overall_status_pass",
      scope: "regression",
      passed: args.overallStatus === "pass",
      actual: args.overallStatus,
      expected: "pass",
      message: "Dogfood scenarios must pass contract, evidence, and authority assertions.",
    }),
    readinessRequirement({
      id: "product_status_not_failure",
      scope: "regression",
      passed: !args.productStatus.startsWith("fail_"),
      actual: args.productStatus,
      expected: "non_failure",
      message: "Dogfood report must not expose a failing product status.",
    }),
    readinessRequirement({
      id: "all_scenarios_passed",
      scope: "regression",
      passed: metrics.passed_scenarios === metrics.total_scenarios,
      actual: `${metrics.passed_scenarios}/${metrics.total_scenarios}`,
      expected: "all",
      message: "Every scenario in the selected suite must pass.",
    }),
    readinessRequirement({
      id: "first_correct_action_rate_one",
      scope: "regression",
      passed: metricEqualsOne(metrics.first_correct_action_rate),
      actual: metrics.first_correct_action_rate,
      expected: 1,
      message: "Contract Compiler output must produce a correct first action for every scenario.",
    }),
    readinessRequirement({
      id: "wasted_steps_zero",
      scope: "regression",
      passed: metricEqualsZero(metrics.wasted_steps),
      actual: metrics.wasted_steps,
      expected: 0,
      message: "Compiled workflows must not include noisy or non-actionable steps.",
    }),
    readinessRequirement({
      id: "unblocked_false_confidence_zero",
      scope: "regression",
      passed: metricEqualsZero(metrics.unblocked_false_confidence_rate),
      actual: metrics.unblocked_false_confidence_rate,
      expected: 0,
      message: "False confidence must never reach stable promotion.",
    }),
    readinessRequirement({
      id: "all_false_confidence_blocked",
      scope: "regression",
      passed: metrics.false_confidence_detected_count === metrics.false_confidence_blocked_count,
      actual: `${metrics.false_confidence_blocked_count}/${metrics.false_confidence_detected_count}`,
      expected: "all_detected_blocked",
      message: "Every detected false-confidence case must be blocked by the Trust Gate.",
    }),
    readinessRequirement({
      id: "authority_gate_false_positive_zero",
      scope: "regression",
      passed: metricEqualsZero(metrics.authority_gate_false_positive_rate),
      actual: metrics.authority_gate_false_positive_rate,
      expected: 0,
      message: "Outcome Contract gate must not allow authority when the scenario expects denial.",
    }),
    readinessRequirement({
      id: "authority_gate_false_negative_zero",
      scope: "regression",
      passed: metricEqualsZero(metrics.authority_gate_false_negative_rate),
      actual: metrics.authority_gate_false_negative_rate,
      expected: 0,
      message: "Outcome Contract gate must not deny authority when the scenario expects allowance.",
    }),
    readinessRequirement({
      id: "after_exit_contract_correctness_one",
      scope: "regression",
      passed: metrics.after_exit_contract_correctness_rate === null || metricEqualsOne(metrics.after_exit_contract_correctness_rate),
      actual: metrics.after_exit_contract_correctness_rate,
      expected: 1,
      message: "Lifecycle-sensitive contracts must express after-exit correctness requirements.",
    }),
    readinessRequirement({
      id: "product_status_live_evidence",
      scope: "live_product",
      passed: args.productStatus === "pass_live_evidence",
      actual: args.productStatus,
      expected: "pass_live_evidence",
      message: "A live product readiness claim requires live external probe evidence.",
    }),
    readinessRequirement({
      id: "live_execution_coverage_rate_one",
      scope: "live_product",
      passed: metricEqualsOne(metrics.live_execution_coverage_rate),
      actual: metrics.live_execution_coverage_rate,
      expected: 1,
      message: "Every scenario in the readiness suite must be backed by live external execution evidence.",
    }),
    readinessRequirement({
      id: "after_exit_evidence_success_rate_one",
      scope: "live_product",
      passed: metricEqualsOne(metrics.after_exit_evidence_success_rate),
      actual: metrics.after_exit_evidence_success_rate,
      expected: 1,
      message: "Live lifecycle evidence must prove after-exit durability for all measured scenarios.",
    }),
    readinessRequirement({
      id: "cross_shell_revalidation_success_rate_one",
      scope: "live_product",
      passed: metricEqualsOne(metrics.cross_shell_revalidation_success_rate),
      actual: metrics.cross_shell_revalidation_success_rate,
      expected: 1,
      message: "Live external visibility must be revalidated from a fresh shell for all measured scenarios.",
    }),
  ];

  for (const family of runtimeDogfoodRequiredLiveTaskFamilies) {
    const coverage = metrics.live_execution_coverage_by_family[family];
    requirements.push(readinessRequirement({
      id: `live_family_coverage_${family}`,
      scope: "live_product",
      passed: !!coverage && coverage.total_scenarios > 0 && coverage.rate === 1,
      actual: coverage ? `${coverage.live_execution_scenarios}/${coverage.total_scenarios}` : "0/0",
      expected: "1/1",
      message: `Live readiness requires full external-probe coverage for ${family}.`,
    }));
  }

  const regressionFailures = requirements.filter((entry) => entry.scope === "regression" && entry.status === "fail");
  const liveProductFailures = requirements.filter((entry) => entry.scope === "live_product" && entry.status === "fail");
  const regressionStatus = regressionFailures.length === 0 ? "pass" : "fail";
  const liveProductStatus = regressionStatus === "pass" && liveProductFailures.length === 0 ? "pass" : "fail";
  const claimLevel: RuntimeDogfoodReadinessGateV1["claim_level"] =
    liveProductStatus === "pass"
      ? "live_product"
      : regressionStatus === "pass"
        ? "regression"
        : "not_ready";
  const operatorSummary =
    claimLevel === "live_product"
      ? "Live product readiness passed across required dogfood task families."
      : claimLevel === "regression"
        ? "Regression readiness passed, but live product readiness is blocked until required external-probe coverage passes."
        : "Dogfood readiness failed; fix regression blockers before making product claims.";

  return {
    gate_version: "runtime_dogfood_readiness_gate_v1",
    claim_level: claimLevel,
    regression_status: regressionStatus,
    live_product_status: liveProductStatus,
    required_live_task_families: runtimeDogfoodRequiredLiveTaskFamilies,
    requirements,
    failed_requirements: requirements.filter((entry) => entry.status === "fail"),
    live_product_blockers: liveProductFailures.map((entry) => entry.id),
    operator_summary: operatorSummary,
  };
}

function buildRuntimeDogfoodReport(base: RuntimeDogfoodSuiteWithoutReport): RuntimeDogfoodReportV1 {
  const afterExitEvidenceScenarios = base.scenarios.filter((scenario) => scenario.metrics.after_exit_revalidated !== null);
  const freshShellScenarios = base.scenarios.filter((scenario) => scenario.metrics.fresh_shell_probe_passed !== null);
  const authorityDecisionReport = buildRuntimeAuthorityDecisionReport(
    base.scenarios.flatMap((scenario) => scenario.authority_decision_report.decisions),
  );
  const productStatus = reportProductStatus({
    overallStatus: base.overall_status,
    proofBoundary: base.proof_boundary,
    summary: base.summary,
  });
  const productMetrics: RuntimeDogfoodReportV1["product_metrics"] = {
    passed_scenarios: base.summary.passed_scenarios,
    total_scenarios: base.summary.total_scenarios,
    first_correct_action_rate: base.summary.first_correct_action_rate,
    wasted_steps: base.summary.wasted_step_count,
    retries: base.summary.retry_signal_count,
    false_confidence_rate: base.summary.unblocked_false_confidence_rate,
    false_confidence_detected_count: base.summary.false_confidence_detected_count,
    false_confidence_blocked_count: base.summary.false_confidence_blocked_count,
    unblocked_false_confidence_rate: base.summary.unblocked_false_confidence_rate,
    after_exit_contract_correctness_rate: base.summary.after_exit_correct_rate,
    after_exit_evidence_success_rate: nullableRate(afterExitEvidenceScenarios.map((scenario) => scenario.metrics.after_exit_revalidated)),
    cross_shell_revalidation_success_rate: nullableRate(freshShellScenarios.map((scenario) => scenario.metrics.fresh_shell_probe_passed)),
    authority_gate_false_positive_rate: base.summary.gate_false_positive_rate,
    authority_gate_false_negative_rate: base.summary.gate_false_negative_rate,
    stable_promotion_allowed_rate: base.summary.stable_promotion_allowed_rate,
    live_execution_coverage_rate: rate(base.proof_boundary.live_execution_scenarios, base.summary.total_scenarios),
    live_execution_coverage_by_family: liveCoverageByFamily(base.scenarios),
  };
  return {
    report_version: "runtime_dogfood_report_v1",
    generated_at: base.generated_at,
    suite_version: base.suite_version,
    overall_status: base.overall_status,
    product_status: productStatus,
    proof_boundary: base.proof_boundary,
    coverage: base.coverage,
    product_metrics: productMetrics,
    authority_decision_report: authorityDecisionReport,
    readiness_gate: buildRuntimeDogfoodReadinessGate({
      overallStatus: base.overall_status,
      productStatus,
      productMetrics,
    }),
    blocking_risks: reportBlockingRisks({
      proofBoundary: base.proof_boundary,
      summary: base.summary,
      scenarios: base.scenarios,
    }),
    next_actions: reportNextActions({
      productStatus,
      proofBoundary: base.proof_boundary,
      scenarios: base.scenarios,
    }),
    scenarios: base.scenarios.map(buildScenarioReport),
  };
}

export function runRuntimeDogfoodSuite(tasks: RuntimeDogfoodTask[] = runtimeDogfoodTasks()): RuntimeDogfoodSuiteResult {
  const scenarios = tasks.map(evaluateTask);
  const afterExitScenarios = scenarios.filter(
    (scenario) =>
      scenario.metrics.after_exit_correct !== null
      && scenario.metrics.expected_authoritative_gate_allows,
  );
  const generatedAt = new Date().toISOString();
  const proofBoundary = buildRuntimeDogfoodProofBoundary(scenarios);
  const coverage = buildRuntimeDogfoodCoverage(scenarios);
  const overallStatus = scenarios.every((scenario) => scenario.status === "pass") ? "pass" : "fail";
  const base: RuntimeDogfoodSuiteWithoutReport = {
    generated_at: generatedAt,
    suite_version: "runtime_dogfood_v1",
    overall_status: overallStatus,
    proof_boundary: proofBoundary,
    coverage,
    summary: {
      passed_scenarios: scenarios.filter((scenario) => scenario.status === "pass").length,
      total_scenarios: scenarios.length,
      first_correct_action_rate: rate(
        scenarios.filter((scenario) => scenario.metrics.first_correct_action).length,
        scenarios.length,
      ),
      false_confidence_rate: rate(
        scenarios.filter((scenario) => scenario.metrics.unblocked_false_confidence).length,
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
      stable_promotion_allowed_rate: rate(
        scenarios.filter((scenario) => scenario.metrics.stable_promotion_allowed).length,
        scenarios.length,
      ),
      false_confidence_detected_count: scenarios.filter((scenario) => scenario.metrics.false_confidence_detected).length,
      false_confidence_blocked_count: scenarios.filter((scenario) => scenario.metrics.false_confidence_blocked).length,
      unblocked_false_confidence_rate: rate(
        scenarios.filter((scenario) => scenario.metrics.unblocked_false_confidence).length,
        scenarios.length,
      ),
    },
    scenarios,
  };
  return {
    ...base,
    report: buildRuntimeDogfoodReport(base),
  };
}

export function formatRuntimeDogfoodMarkdown(result: RuntimeDogfoodSuiteResult): string {
  const lines = [
    "# Runtime Dogfood Summary",
    "",
    `Generated at: ${result.generated_at}`,
    `Status: ${result.overall_status}`,
    `Product status: ${result.report.product_status}`,
    `Report version: ${result.report.report_version}`,
    `Readiness claim: ${result.report.readiness_gate.claim_level}`,
    `Regression gate: ${result.report.readiness_gate.regression_status}`,
    `Live product gate: ${result.report.readiness_gate.live_product_status}`,
    `Readiness summary: ${result.report.readiness_gate.operator_summary}`,
    "",
    "## Readiness Gate",
    "",
    `- gate_version: ${result.report.readiness_gate.gate_version}`,
    `- claim_level: ${result.report.readiness_gate.claim_level}`,
    `- regression_status: ${result.report.readiness_gate.regression_status}`,
    `- live_product_status: ${result.report.readiness_gate.live_product_status}`,
    `- required_live_task_families: ${result.report.readiness_gate.required_live_task_families.join(", ")}`,
    `- live_product_blockers: ${result.report.readiness_gate.live_product_blockers.join(", ") || "none"}`,
    "",
    ...(result.report.readiness_gate.failed_requirements.length > 0
      ? result.report.readiness_gate.failed_requirements.map((requirement) =>
          `- FAIL ${requirement.id}: actual=${requirement.actual ?? "null"} expected=${requirement.expected}; ${requirement.message}`
        )
      : ["- failed_requirements: none"]),
    "",
    "## Product Metrics",
    "",
    `- first_correct_action_rate: ${result.report.product_metrics.first_correct_action_rate}`,
    `- wasted_steps: ${result.report.product_metrics.wasted_steps}`,
    `- retries: ${result.report.product_metrics.retries}`,
    `- false_confidence_rate: ${result.report.product_metrics.false_confidence_rate}`,
    `- false_confidence_detected_count: ${result.report.product_metrics.false_confidence_detected_count}`,
    `- false_confidence_blocked_count: ${result.report.product_metrics.false_confidence_blocked_count}`,
    `- after_exit_contract_correctness_rate: ${result.report.product_metrics.after_exit_contract_correctness_rate ?? "n/a"}`,
    `- after_exit_evidence_success_rate: ${result.report.product_metrics.after_exit_evidence_success_rate ?? "n/a"}`,
    `- cross_shell_revalidation_success_rate: ${result.report.product_metrics.cross_shell_revalidation_success_rate ?? "n/a"}`,
    `- live_execution_coverage_rate: ${result.report.product_metrics.live_execution_coverage_rate}`,
    `- live_execution_coverage_by_family: ${Object.entries(result.report.product_metrics.live_execution_coverage_by_family).map(([family, coverage]) => `${family}=${coverage.live_execution_scenarios}/${coverage.total_scenarios}:${coverage.rate}`).join(", ")}`,
    `- authority_decisions: total=${result.report.authority_decision_report.summary.total_decisions}, blocked=${result.report.authority_decision_report.summary.blocked_count}, advisory_only=${result.report.authority_decision_report.summary.advisory_only_count}, inspect_or_rehydrate=${result.report.authority_decision_report.summary.inspect_or_rehydrate_count}`,
    `- authority_decision_blockers: ${Object.entries(result.report.authority_decision_report.summary.blocked_by_reason).map(([reason, count]) => `${reason}=${count}`).join(", ") || "none"}`,
    "",
    "## Blocking Risks",
    "",
    ...(result.report.blocking_risks.length > 0
      ? result.report.blocking_risks.map((risk) => `- ${risk}`)
      : ["- none"]),
    "",
    "## Next Actions",
    "",
    ...result.report.next_actions.map((action) => `- ${action}`),
    "",
    "## Proof Boundary",
    "",
    `- boundary_version: ${result.proof_boundary.boundary_version}`,
    `- suite_kind: ${result.proof_boundary.suite_kind}`,
    `- live_execution_scenarios: ${result.proof_boundary.live_execution_scenarios}`,
    `- fixture_evidence_scenarios: ${result.proof_boundary.fixture_evidence_scenarios}`,
    `- scenarios_without_execution_evidence: ${result.proof_boundary.scenarios_without_execution_evidence}`,
    "",
    ...result.proof_boundary.claim_scope.map((scope) => `- claim_scope: ${scope}`),
    "",
    "## Coverage",
    "",
    `- task_families: ${Object.entries(result.coverage.task_families).map(([family, count]) => `${family}=${count}`).join(", ")}`,
    `- after_exit_required_scenarios: ${result.coverage.after_exit_required_scenarios}`,
    `- service_lifecycle_required_scenarios: ${result.coverage.service_lifecycle_required_scenarios}`,
    `- external_visibility_required_scenarios: ${result.coverage.external_visibility_required_scenarios}`,
    `- negative_control_scenarios: ${result.coverage.negative_control_scenarios}`,
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
    `- stable_promotion_allowed_rate: ${result.summary.stable_promotion_allowed_rate}`,
    `- false_confidence_detected_count: ${result.summary.false_confidence_detected_count}`,
    `- false_confidence_blocked_count: ${result.summary.false_confidence_blocked_count}`,
    `- unblocked_false_confidence_rate: ${result.summary.unblocked_false_confidence_rate}`,
    "",
  ];
  for (const scenario of result.scenarios) {
    lines.push(`## ${scenario.id}`, "");
    lines.push(`${scenario.title}`, "");
    lines.push(`- status: ${scenario.status}`);
    lines.push(`- task_family: ${scenario.task_family ?? "null"}`);
    lines.push(`- evidence_source: ${scenario.proof.evidence_source}`);
    lines.push(`- authority_claim_scope: ${scenario.proof.authority_claim_scope}`);
    lines.push(`- live_external_validation: ${scenario.proof.live_external_validation}`);
    const scenarioReport = result.report.scenarios.find((entry) => entry.id === scenario.id);
    lines.push(`- product_status: ${scenarioReport?.product_status ?? "unknown"}`);
    lines.push(`- authority_gate_result: ${scenarioReport?.authority_gate_result ?? "unknown"}`);
    lines.push(`- authority_blockers: ${scenarioReport?.authority_blockers.join(" | ") || "none"}`);
    lines.push(`- authority_decisions: total=${scenarioReport?.authority_decision_summary.total_decisions ?? 0}, blocked=${scenarioReport?.authority_decision_summary.blocked_count ?? 0}, advisory_only=${scenarioReport?.authority_decision_summary.advisory_only_count ?? 0}, inspect_or_rehydrate=${scenarioReport?.authority_decision_summary.inspect_or_rehydrate_count ?? 0}`);
    lines.push(`- recommended_next_action: ${scenarioReport?.recommended_next_action ?? "unknown"}`);
    lines.push(`- execution_evidence_supplied: ${scenario.proof.execution_evidence_supplied}`);
    lines.push(`- after_exit_evidence_supplied: ${scenario.proof.after_exit_evidence_supplied}`);
    lines.push(`- fresh_shell_probe_evidence_supplied: ${scenario.proof.fresh_shell_probe_evidence_supplied}`);
    lines.push(`- first_correct_action: ${scenario.metrics.first_correct_action}`);
    lines.push(`- false_confidence_risk: ${scenario.metrics.false_confidence_risk}`);
    lines.push(`- after_exit_correct: ${scenario.metrics.after_exit_correct ?? "n/a"}`);
    lines.push(`- outcome_gate_allows_authoritative: ${scenario.metrics.outcome_gate_allows_authoritative}`);
    lines.push(`- expected_authoritative_gate_allows: ${scenario.metrics.expected_authoritative_gate_allows}`);
    lines.push(`- gate_reasons: ${scenario.compiled.outcome_contract_gate.reasons.join(" | ") || "none"}`);
    lines.push(`- execution_evidence_allows_authoritative: ${scenario.metrics.execution_evidence_allows_authoritative}`);
    lines.push(`- stable_promotion_allowed: ${scenario.metrics.stable_promotion_allowed}`);
    lines.push(`- execution_evidence_status: ${scenario.compiled.execution_evidence_assessment.status}`);
    lines.push(`- execution_evidence_reasons: ${scenario.compiled.execution_evidence_assessment.reasons.join(" | ") || "none"}`);
    lines.push(`- false_confidence_detected: ${scenario.metrics.false_confidence_detected}`);
    lines.push(`- false_confidence_blocked: ${scenario.metrics.false_confidence_blocked}`);
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

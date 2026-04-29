import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  aiCodeCiRepairVariants,
  prepareAiCodeCiRepairWorkspace,
  prepareDeployHookWebWorkspace,
  preparePublishInstallWorkspace,
  prepareServiceAfterExitWorkspace,
  publishInstallFixedBuildScript,
} from "../aionis-real-ab-prepare-workspace.ts";
import { runRuntimeDogfoodSuite, runtimeDogfoodTasksFromSpecs } from "../lib/lite-runtime-dogfood.ts";
import {
  runRuntimeDogfoodExternalProbe,
  runtimeDogfoodExternalProbeSlices,
} from "../lib/lite-runtime-dogfood-external-probe.ts";

test("runtime dogfood slice compiles real task families into outcome-backed contracts", () => {
  const result = runRuntimeDogfoodSuite();
  assert.equal(result.overall_status, "pass");
  assert.equal(result.summary.passed_scenarios, result.summary.total_scenarios);
  assert.equal(result.proof_boundary.boundary_version, "runtime_dogfood_proof_boundary_v1");
  assert.equal(result.proof_boundary.live_execution_scenarios, 0);
  assert.equal(result.proof_boundary.fixture_evidence_scenarios, result.summary.total_scenarios);
  assert.equal(result.proof_boundary.scenarios_without_execution_evidence, 0);
  assert.ok(result.proof_boundary.claim_scope.some((entry) => entry.includes("not a live external probe")));
  assert.equal(result.coverage.coverage_version, "runtime_dogfood_coverage_v1");
  assert.equal(result.coverage.after_exit_required_scenarios, 4);
  assert.equal(result.coverage.service_lifecycle_required_scenarios, 4);
  assert.equal(result.coverage.external_visibility_required_scenarios, 5);
  assert.equal(result.coverage.negative_control_scenarios, 2);
  assert.equal(result.coverage.task_families.service_publish_validate, 3);
  assert.equal(result.coverage.task_families.handoff_resume, 1);
  assert.equal(result.coverage.task_families.agent_takeover, 1);
  assert.equal(result.summary.first_correct_action_rate, 1);
  assert.equal(result.summary.false_confidence_rate, 0);
  assert.equal(result.summary.after_exit_correct_rate, 1);
  assert.equal(result.summary.wasted_step_count, 0);
  assert.equal(result.summary.gate_false_positive_rate, 0);
  assert.equal(result.summary.gate_false_negative_rate, 0);
  assert.equal(result.summary.false_confidence_detected_count, 1);
  assert.equal(result.summary.false_confidence_blocked_count, 1);
  assert.equal(result.summary.unblocked_false_confidence_rate, 0);
  assert.equal(result.report.report_version, "runtime_dogfood_report_v1");
  assert.equal(result.report.product_status, "pass_fixture_evidence_only");
  assert.equal(result.report.readiness_gate.gate_version, "runtime_dogfood_readiness_gate_v1");
  assert.equal(result.report.readiness_gate.claim_level, "regression");
  assert.equal(result.report.readiness_gate.regression_status, "pass");
  assert.equal(result.report.readiness_gate.live_product_status, "fail");
  assert.ok(result.report.readiness_gate.live_product_blockers.includes("product_status_live_evidence"));
  assert.ok(result.report.readiness_gate.live_product_blockers.includes("live_execution_coverage_rate_one"));
  assert.ok(result.report.readiness_gate.live_product_blockers.includes("after_exit_evidence_success_rate_one"));
  assert.equal(result.report.product_metrics.first_correct_action_rate, 1);
  assert.equal(result.report.product_metrics.false_confidence_rate, 0);
  assert.equal(result.report.product_metrics.after_exit_contract_correctness_rate, 1);
  assert.equal(result.report.product_metrics.after_exit_evidence_success_rate, 0.75);
  assert.equal(result.report.product_metrics.cross_shell_revalidation_success_rate, 0.8);
  assert.equal(result.report.product_metrics.live_execution_coverage_rate, 0);
  assert.equal(result.report.product_metrics.live_execution_coverage_by_family.service_publish_validate?.rate, 0);
  assert.equal(result.report.authority_decision_report.report_version, "runtime_authority_decision_report_v1");
  assert.equal(result.report.authority_decision_report.summary.summary_version, "runtime_authority_decision_summary_v1");
  assert.equal(result.report.authority_decision_report.summary.decisions_by_surface.candidate_workflow_reuse.inspect_or_rehydrate_only, 2);
  assert.equal(result.report.authority_decision_report.summary.decisions_by_surface.policy_default_materialization.blocked, 2);
  assert.equal(result.report.authority_decision_report.summary.unblocked_false_confidence_count, 0);
  assert.equal(result.report.authority_decision_report.summary.blocked_by_reason.false_confidence_detected, 3);
  assert.ok(result.report.authority_decision_report.read_side_rules.some((entry) =>
    entry.source_id === "action_retrieval_outcome_gate"
    && entry.authority_rules.includes("candidate_workflow_reuse_is_inspect_or_rehydrate_only")
  ));
  assert.ok(result.report.authority_decision_report.read_side_rules.some((entry) =>
    entry.source_id === "policy_materialization_surface"
    && entry.authority_rules.includes("trusted_pattern_only_guidance_is_advisory_candidate")
  ));
  assert.ok(result.report.blocking_risks.some((risk) => risk.includes("fixture-backed only")));
  assert.ok(result.report.next_actions.some((action) => action.includes("external_probe")));

  const serviceScenario = result.scenarios.find((scenario) => scenario.id === "service_after_exit");
  assert.ok(serviceScenario);
  assert.equal(serviceScenario.metrics.after_exit_correct, true);
  assert.equal(serviceScenario.proof.evidence_source, "declared_fixture");
  assert.equal(serviceScenario.proof.live_external_validation, false);
  assert.equal(serviceScenario.proof.after_exit_evidence_supplied, true);
  assert.equal(serviceScenario.proof.fresh_shell_probe_evidence_supplied, true);
  assert.ok(serviceScenario.compiled.outcome.must_hold_after_exit.length > 0);
  assert.ok(serviceScenario.compiled.outcome.external_visibility_requirements.length > 0);

  const deployScenario = result.scenarios.find((scenario) => scenario.id === "deploy_hook_web");
  assert.ok(deployScenario);
  assert.equal(deployScenario.task_family, "git_deploy_webserver");
  assert.ok(deployScenario.compiled.outcome.dependency_requirements.some((entry) => entry.includes("git deploy or hook path")));

  const nextDayHandoffScenario = result.scenarios.find((scenario) => scenario.id === "handoff_next_day");
  assert.ok(nextDayHandoffScenario);
  assert.equal(nextDayHandoffScenario.task_family, "handoff_resume");
  assert.equal(nextDayHandoffScenario.metrics.first_correct_action, true);
  assert.equal(nextDayHandoffScenario.metrics.stable_promotion_allowed, true);

  const agentTakeoverScenario = result.scenarios.find((scenario) => scenario.id === "agent_takeover");
  assert.ok(agentTakeoverScenario);
  assert.equal(agentTakeoverScenario.task_family, "agent_takeover");
  assert.equal(agentTakeoverScenario.metrics.first_correct_action, true);
  assert.equal(agentTakeoverScenario.metrics.stable_promotion_allowed, true);

  const thinServiceScenario = result.scenarios.find((scenario) => scenario.id === "thin_service_missing_detach");
  assert.ok(thinServiceScenario);
  assert.equal(thinServiceScenario.metrics.outcome_gate_allows_authoritative, false);
  assert.equal(thinServiceScenario.metrics.false_confidence_risk, false);
  assert.equal(thinServiceScenario.metrics.after_exit_correct, false);
  assert.ok(thinServiceScenario.compiled.outcome_contract_gate.reasons.includes("missing_service_detach_then_probe"));

  const failedEvidenceScenario = result.scenarios.find((scenario) => scenario.id === "service_after_exit_evidence_failed");
  assert.ok(failedEvidenceScenario);
  assert.equal(failedEvidenceScenario.metrics.outcome_gate_allows_authoritative, true);
  assert.equal(failedEvidenceScenario.proof.authority_claim_scope, "contract_with_declared_fixture_evidence");
  assert.equal(failedEvidenceScenario.metrics.execution_evidence_allows_authoritative, false);
  assert.equal(failedEvidenceScenario.metrics.stable_promotion_allowed, false);
  assert.equal(failedEvidenceScenario.metrics.false_confidence_detected, true);
  assert.equal(failedEvidenceScenario.metrics.false_confidence_blocked, true);
  assert.equal(failedEvidenceScenario.metrics.unblocked_false_confidence, false);
  assert.ok(failedEvidenceScenario.compiled.execution_evidence_assessment.reasons.includes("after_exit_revalidation_failed"));

  const failedEvidenceReport = result.report.scenarios.find((scenario) => scenario.id === "service_after_exit_evidence_failed");
  assert.ok(failedEvidenceReport);
  assert.equal(failedEvidenceReport.product_status, "pass_advisory_only");
  assert.equal(failedEvidenceReport.authority_gate_result, "blocked_by_execution_evidence");
  assert.ok(failedEvidenceReport.authority_blockers.some((blocker) => blocker.includes("after_exit_revalidation_failed")));
  assert.equal(failedEvidenceReport.authority_decision_summary.decisions_by_surface.execution_evidence_gate.blocked, 1);
  assert.equal(failedEvidenceReport.authority_decision_summary.decisions_by_surface.candidate_workflow_reuse.inspect_or_rehydrate_only, 1);
  assert.equal(failedEvidenceReport.authority_decision_summary.decisions_by_surface.policy_default_materialization.blocked, 1);
  assert.ok(failedEvidenceReport.authority_decisions.some((decision) =>
    decision.surface === "false_confidence_gate"
    && decision.disposition === "blocked"
    && decision.reasons.includes("false_confidence_detected")
  ));
  assert.ok(failedEvidenceReport.authority_decisions.some((decision) =>
    decision.surface === "candidate_workflow_reuse"
    && decision.disposition === "inspect_or_rehydrate_only"
    && decision.rule_refs.includes("candidate_workflow_must_not_emit_stable_workflow_tool_source")
  ));
  assert.ok(failedEvidenceReport.authority_decisions.some((decision) =>
    decision.surface === "policy_default_materialization"
    && decision.disposition === "blocked"
    && decision.rule_refs.includes("policy_default_requires_stable_workflow_or_live_authoritative_execution_contract")
  ));
  assert.equal(failedEvidenceReport.product_metrics.false_confidence_blocked, true);
});

test("runtime dogfood task specs can carry external probe evidence without code changes", () => {
  const tasks = runtimeDogfoodTasksFromSpecs([
    {
      id: "external_probe_service",
      title: "External probe service validation",
      query_text: "Keep the metrics service alive and prove the health endpoint from an external probe.",
      evidence_source: "external_probe",
      trajectory: {
        title: "Metrics service external validation",
        task_family: "service_publish_validate",
        steps: [
          { role: "assistant", text: "The metrics service must survive the agent exit and stay reachable." },
          { role: "tool", tool_name: "bash", command: "nohup node scripts/metrics-server.mjs --port 4199 >/tmp/metrics.log 2>&1 &" },
          { role: "tool", tool_name: "bash", command: "curl -fsS http://127.0.0.1:4199/healthz" },
          { role: "assistant", text: "Update scripts/metrics-server.mjs, launch it detached, and rerun curl -fsS http://127.0.0.1:4199/healthz from a fresh shell after the agent exits." },
        ],
      },
      execution_evidence: {
        validation_passed: true,
        after_exit_revalidated: true,
        fresh_shell_probe_passed: true,
        validation_boundary: "external_verifier",
        evidence_refs: ["external:probe:metrics-service-healthz"],
      },
      expectations: {
        target_files_include: ["scripts/metrics-server.mjs"],
        acceptance_checks_match: ["curl -fsS http://127\\.0\\.0\\.1:4199/healthz"],
        next_action_match: ["scripts/metrics-server\\.mjs", "fresh shell"],
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
        external_visibility_requirements_match: ["endpoint_reachable:http://127\\.0\\.0\\.1:4199/healthz"],
        service_lifecycle_required: true,
        after_exit_required: true,
        authoritative_gate_allows: true,
        evidence_allows_authoritative: true,
        stable_promotion_allowed: true,
      },
    },
  ]);

  const result = runRuntimeDogfoodSuite(tasks);
  assert.equal(result.overall_status, "pass");
  assert.equal(result.proof_boundary.live_execution_scenarios, 1);
  assert.equal(result.proof_boundary.fixture_evidence_scenarios, 0);
  assert.equal(result.proof_boundary.scenarios_without_execution_evidence, 0);
  assert.equal(result.coverage.task_families.service_publish_validate, 1);
  assert.equal(result.summary.first_correct_action_rate, 1);
  assert.equal(result.summary.after_exit_correct_rate, 1);
  assert.equal(result.report.product_status, "pass_live_evidence");
  assert.equal(result.report.readiness_gate.claim_level, "regression");
  assert.equal(result.report.readiness_gate.regression_status, "pass");
  assert.equal(result.report.readiness_gate.live_product_status, "fail");
  assert.ok(result.report.readiness_gate.live_product_blockers.includes("live_family_coverage_agent_takeover"));
  assert.equal(result.report.product_metrics.live_execution_coverage_rate, 1);
  assert.equal(result.report.product_metrics.live_execution_coverage_by_family.service_publish_validate?.rate, 1);
  assert.equal(result.report.product_metrics.after_exit_evidence_success_rate, 1);
  assert.equal(result.report.product_metrics.cross_shell_revalidation_success_rate, 1);

  const scenario = result.scenarios[0];
  assert.equal(scenario?.proof.evidence_source, "external_probe");
  assert.equal(scenario?.proof.live_external_validation, true);
  assert.equal(scenario?.proof.authority_claim_scope, "contract_with_external_probe_evidence");
  assert.equal(scenario?.metrics.stable_promotion_allowed, true);
});

test("runtime dogfood external probe runs live proof slices and produces live evidence", async () => {
  const run = await runRuntimeDogfoodExternalProbe();
  assert.equal(run.run_version, "runtime_dogfood_external_probe_run_v1");
  assert.equal(run.launcher_exit_code, 0);
  assert.ok(run.service_pid);
  assert.equal(run.probes.length, 7);
  assert.equal(run.diagnostics.length, runtimeDogfoodExternalProbeSlices.length);
  assert.equal(run.fresh_shell_probe_passed, true);
  assert.equal(run.dogfood_result.overall_status, "pass");
  assert.equal(run.dogfood_result.proof_boundary.live_execution_scenarios, 7);
  assert.equal(run.dogfood_result.proof_boundary.fixture_evidence_scenarios, 0);
  assert.equal(run.dogfood_result.summary.after_exit_correct_rate, 1);
  assert.equal(run.dogfood_result.report.product_status, "pass_live_evidence");
  assert.equal(run.dogfood_result.report.readiness_gate.claim_level, "live_product");
  assert.equal(run.dogfood_result.report.readiness_gate.regression_status, "pass");
  assert.equal(run.dogfood_result.report.readiness_gate.live_product_status, "pass");
  assert.deepEqual(run.dogfood_result.report.readiness_gate.live_product_blockers, []);
  assert.deepEqual(run.dogfood_result.report.readiness_gate.failed_requirements, []);
  assert.equal(run.dogfood_result.report.product_metrics.live_execution_coverage_rate, 1);
  assert.equal(run.dogfood_result.report.product_metrics.live_execution_coverage_by_family.service_publish_validate?.rate, 1);
  assert.equal(run.dogfood_result.report.product_metrics.live_execution_coverage_by_family.package_publish_validate?.rate, 1);
  assert.equal(run.dogfood_result.report.product_metrics.live_execution_coverage_by_family.git_deploy_webserver?.rate, 1);
  assert.equal(run.dogfood_result.report.product_metrics.live_execution_coverage_by_family.task_resume_interrupted_export_pipeline?.rate, 1);
  assert.equal(run.dogfood_result.report.product_metrics.live_execution_coverage_by_family.handoff_resume?.rate, 1);
  assert.equal(run.dogfood_result.report.product_metrics.live_execution_coverage_by_family.agent_takeover?.rate, 1);
  assert.equal(run.dogfood_result.report.product_metrics.live_execution_coverage_by_family.ai_code_ci_repair?.rate, 1);
  assert.equal(run.dogfood_result.coverage.task_families.service_publish_validate, 1);
  assert.equal(run.dogfood_result.coverage.task_families.package_publish_validate, 1);
  assert.equal(run.dogfood_result.coverage.task_families.git_deploy_webserver, 1);
  assert.equal(run.dogfood_result.coverage.task_families.task_resume_interrupted_export_pipeline, 1);
  assert.equal(run.dogfood_result.coverage.task_families.handoff_resume, 1);
  assert.equal(run.dogfood_result.coverage.task_families.agent_takeover, 1);
  assert.equal(run.dogfood_result.coverage.task_families.ai_code_ci_repair, 1);

  const scenarioIds = new Set(run.dogfood_result.scenarios.map((scenario) => scenario.id));
  const diagnosticSlices = new Set(run.diagnostics.map((diagnostic) => diagnostic.slice));
  assert.deepEqual(diagnosticSlices, new Set(runtimeDogfoodExternalProbeSlices));
  assert.ok(scenarioIds.has("external_probe_service_after_exit"));
  assert.ok(scenarioIds.has("external_probe_publish_install"));
  assert.ok(scenarioIds.has("external_probe_deploy_hook_web"));
  assert.ok(scenarioIds.has("external_probe_interrupted_resume"));
  assert.ok(scenarioIds.has("external_probe_handoff_next_day"));
  assert.ok(scenarioIds.has("external_probe_agent_takeover"));
  assert.ok(scenarioIds.has("external_probe_ai_code_ci_repair"));
  const liveCommandProbes = [
    ["external_probe_interrupted_resume", "npm test -- tests/exporter.test.mjs"],
    ["external_probe_handoff_next_day", "npm test -- tests/payments/webhook.test.mjs"],
    ["external_probe_agent_takeover", "npm test -- tests/search/indexer.test.mjs"],
    ["external_probe_ai_code_ci_repair", "npm test -- tests/pricing/discount.test.mjs"],
  ] as const;
  for (const [id, command] of liveCommandProbes) {
    const probe = run.probes.find((candidate) => candidate.id === id);
    assert.equal(probe?.fresh_shell_probe_passed, true);
    assert.equal(probe?.diagnostics.command, command);
    assert.equal(probe?.diagnostics.exit_code, 0);
    assert.equal(probe?.diagnostics.failure_class, "none");
    assert.equal(probe?.diagnostics.command_count, 1);
    assert.ok(probe?.task_spec.execution_evidence);
    const evidence = probe.task_spec.execution_evidence as { evidence_refs?: unknown };
    assert.ok(Array.isArray(evidence.evidence_refs));
    assert.ok(evidence.evidence_refs.includes(`external_probe:fresh_shell:${command}`));
  }
  for (const scenario of run.dogfood_result.scenarios) {
    assert.equal(scenario.proof.evidence_source, "external_probe");
    assert.equal(scenario.proof.live_external_validation, true);
    assert.equal(scenario.metrics.execution_evidence_allows_authoritative, true);
    assert.equal(scenario.metrics.stable_promotion_allowed, true);
  }
  assert.match(run.fresh_shell_probe_output, /"ok":true/);
  assert.match(run.fresh_shell_probe_output, /Successfully installed vectorops-0\.1\.0/);
  assert.match(run.fresh_shell_probe_output, /deployed revision visible through live dogfood/);
  assert.match(run.fresh_shell_probe_output, /applies percentage discounts in cents/);
});

test("runtime dogfood external probe can run one selected slice with diagnostics", async () => {
  const run = await runRuntimeDogfoodExternalProbe({ slices: ["interrupted_resume"] });
  assert.equal(run.probes.length, 1);
  assert.equal(run.diagnostics.length, 1);
  assert.equal(run.fresh_shell_probe_passed, true);
  assert.equal(run.dogfood_result.overall_status, "pass");
  assert.equal(run.dogfood_result.proof_boundary.live_execution_scenarios, 1);
  assert.equal(run.dogfood_result.report.readiness_gate.claim_level, "regression");
  assert.equal(run.dogfood_result.report.readiness_gate.regression_status, "pass");
  assert.equal(run.dogfood_result.report.readiness_gate.live_product_status, "fail");
  assert.ok(run.dogfood_result.report.readiness_gate.live_product_blockers.includes("live_family_coverage_service_publish_validate"));
  assert.equal(run.probes[0]?.id, "external_probe_interrupted_resume");
  assert.equal(run.diagnostics[0]?.slice, "interrupted_resume");
  assert.equal(run.diagnostics[0]?.scenario_id, "external_probe_interrupted_resume");
  assert.equal(run.diagnostics[0]?.command, "npm test -- tests/exporter.test.mjs");
  assert.match(run.diagnostics[0]?.cwd ?? "", /aionis-runtime-dogfood-interrupted-/);
  assert.equal(run.diagnostics[0]?.exit_code, 0);
  assert.equal(run.diagnostics[0]?.failure_class, "none");
  assert.equal(run.diagnostics[0]?.command_count, 1);
  assert.equal(run.diagnostics[0]?.commands.length, 1);
});

test("service after-exit external probe can validate the actual arm workspace causally", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-dogfood-service-workspace-"));
  const servicePath = path.join(workspace, "scripts", "fixtures", "runtime-dogfood", "service-after-exit-server.mjs");
  try {
    prepareServiceAfterExitWorkspace(workspace, { force: true });
    fs.writeFileSync(servicePath, "process.exit(13);\n");

    const failedRun = await runRuntimeDogfoodExternalProbe({
      slices: ["service_after_exit"],
      workspaceRoot: workspace,
    });
    assert.equal(failedRun.probes.length, 1);
    assert.equal(failedRun.fresh_shell_probe_passed, false);
    assert.equal(
      failedRun.dogfood_result.scenarios[0]?.metrics.execution_evidence_allows_authoritative,
      false,
    );

    prepareServiceAfterExitWorkspace(workspace, { force: true });
    const passedRun = await runRuntimeDogfoodExternalProbe({
      slices: ["service_after_exit"],
      workspaceRoot: workspace,
    });
    assert.equal(passedRun.fresh_shell_probe_passed, true);
    assert.match(passedRun.fresh_shell_probe_output, /"ok":true/);
    assert.deepEqual(
      passedRun.probes[0]?.task_spec.expectations.target_files_include,
      ["scripts/fixtures/runtime-dogfood/service-after-exit-server.mjs"],
    );
    assert.equal(
      passedRun.dogfood_result.scenarios[0]?.metrics.execution_evidence_allows_authoritative,
      true,
    );
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test("publish install external probe can validate the actual arm workspace causally", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-dogfood-publish-workspace-"));
  try {
    preparePublishInstallWorkspace(workspace, { force: true });

    const failedRun = await runRuntimeDogfoodExternalProbe({
      slices: ["publish_install"],
      workspaceRoot: workspace,
    });
    assert.equal(failedRun.probes.length, 1);
    assert.equal(failedRun.fresh_shell_probe_passed, false);
    assert.match(failedRun.probes[0]?.diagnostics.commands[0]?.command ?? "", /scripts\/build_index\.py/);
    assert.equal(failedRun.probes[0]?.diagnostics.commands[0]?.cwd, workspace);
    assert.equal(
      failedRun.dogfood_result.scenarios[0]?.metrics.execution_evidence_allows_authoritative,
      false,
    );

    fs.writeFileSync(
      path.join(workspace, "scripts", "build_index.py"),
      publishInstallFixedBuildScript(),
    );

    const passedRun = await runRuntimeDogfoodExternalProbe({
      slices: ["publish_install"],
      workspaceRoot: workspace,
    });
    assert.equal(passedRun.fresh_shell_probe_passed, true);
    assert.match(passedRun.fresh_shell_probe_output, /Successfully installed vectorops-0\.1\.0/);
    assert.equal(
      passedRun.dogfood_result.scenarios[0]?.metrics.execution_evidence_allows_authoritative,
      true,
    );
    assert.equal(
      passedRun.dogfood_result.scenarios[0]?.metrics.stable_promotion_allowed,
      true,
    );
    assert.equal(passedRun.probes[0]?.diagnostics.commands[0]?.cwd, workspace);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test("deploy hook external probe can validate the actual arm workspace causally", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-dogfood-deploy-workspace-"));
  try {
    prepareDeployHookWebWorkspace(workspace, { force: true });

    const failedRun = await runRuntimeDogfoodExternalProbe({
      slices: ["deploy_hook_web"],
      workspaceRoot: workspace,
    });
    assert.equal(failedRun.probes.length, 1);
    assert.equal(failedRun.fresh_shell_probe_passed, false);
    assert.equal(failedRun.probes[0]?.diagnostics.commands[0]?.command, "sh hooks/post-receive");
    assert.equal(failedRun.probes[0]?.diagnostics.commands[0]?.cwd, workspace);
    assert.equal(
      failedRun.dogfood_result.scenarios[0]?.metrics.execution_evidence_allows_authoritative,
      false,
    );

    fs.writeFileSync(
      path.join(workspace, "hooks", "post-receive"),
      [
        "#!/usr/bin/env sh",
        "set -eu",
        "mkdir -p www/main",
        "cp site/index.html www/main/index.html",
        "",
      ].join("\n"),
    );
    fs.chmodSync(path.join(workspace, "hooks", "post-receive"), 0o755);

    const passedRun = await runRuntimeDogfoodExternalProbe({
      slices: ["deploy_hook_web"],
      workspaceRoot: workspace,
    });
    assert.equal(passedRun.fresh_shell_probe_passed, true);
    assert.match(passedRun.fresh_shell_probe_output, /deployed revision visible through live dogfood/);
    assert.equal(
      passedRun.dogfood_result.scenarios[0]?.metrics.execution_evidence_allows_authoritative,
      true,
    );
    assert.equal(
      passedRun.dogfood_result.scenarios[0]?.metrics.stable_promotion_allowed,
      true,
    );
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test("AI code CI repair external probe can validate the actual arm workspace causally", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-dogfood-ai-code-workspace-"));
  try {
    prepareAiCodeCiRepairWorkspace(workspace, { force: true, variant: "hidden_edge_case" });

    const failedRun = await runRuntimeDogfoodExternalProbe({
      slices: ["ai_code_ci_repair"],
      workspaceRoot: workspace,
    });
    assert.equal(failedRun.probes.length, 1);
    assert.equal(failedRun.fresh_shell_probe_passed, false);
    assert.equal(failedRun.probes[0]?.diagnostics.command, "npm test -- tests/pricing/discount.test.mjs");
    assert.equal(failedRun.probes[0]?.diagnostics.cwd, workspace);
    assert.equal(
      failedRun.dogfood_result.scenarios[0]?.metrics.execution_evidence_allows_authoritative,
      false,
    );
    assert.equal(failedRun.probes[0]?.diagnostics.command_count, 2);

    fs.writeFileSync(
      path.join(workspace, "src", "pricing", "discount.mjs"),
      [
        "export function discountedTotalCents(order) {",
        "  const subtotalCents = Number(order.subtotalCents);",
        "  const discountPercent = Number(order.discountPercent ?? 0);",
        "  if (!Number.isFinite(subtotalCents) || !Number.isFinite(discountPercent)) {",
        "    throw new TypeError('invalid discount input');",
        "  }",
        "  const discountCents = Math.round(subtotalCents * discountPercent / 100);",
        "  return Math.max(0, subtotalCents - discountCents);",
        "}",
        "",
      ].join("\n"),
    );

    const passedRun = await runRuntimeDogfoodExternalProbe({
      slices: ["ai_code_ci_repair"],
      workspaceRoot: workspace,
    });
    assert.equal(passedRun.fresh_shell_probe_passed, true);
    assert.match(passedRun.fresh_shell_probe_output, /applies percentage discounts in cents/);
    assert.equal(
      passedRun.dogfood_result.scenarios[0]?.metrics.execution_evidence_allows_authoritative,
      true,
    );
    assert.equal(
      passedRun.dogfood_result.scenarios[0]?.metrics.stable_promotion_allowed,
      true,
    );
    assert.equal(passedRun.probes[0]?.diagnostics.command_count, 2);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test("AI code CI repair variants reject test-file success fakery", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-dogfood-ai-code-immutable-"));
  try {
    prepareAiCodeCiRepairWorkspace(workspace, { force: true, variant: "wrong_surface_trap" });
    fs.writeFileSync(
      path.join(workspace, "tests", "pricing", "discount.test.mjs"),
      [
        "import test from 'node:test';",
        "import assert from 'node:assert/strict';",
        "",
        "test('fake success by weakening acceptance evidence', () => {",
        "  assert.equal(1, 1);",
        "});",
        "",
      ].join("\n"),
    );

    const run = await runRuntimeDogfoodExternalProbe({
      slices: ["ai_code_ci_repair"],
      workspaceRoot: workspace,
    });

    assert.equal(run.fresh_shell_probe_passed, false);
    assert.match(run.probes[0]?.diagnostics.stderr_tail ?? "", /immutable fixture files changed/);
    assert.equal(
      run.dogfood_result.scenarios[0]?.metrics.execution_evidence_allows_authoritative,
      false,
    );
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test("AI code CI repair simple fixture variants share the same implementation-side repair", async () => {
  for (const variant of ["percentage_rounding", "misleading_ai_patch", "hidden_edge_case", "wrong_surface_trap"] as const) {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), `aionis-dogfood-ai-code-${variant}-`));
    try {
      prepareAiCodeCiRepairWorkspace(workspace, { force: true, variant });
      fs.writeFileSync(
        path.join(workspace, "src", "pricing", "discount.mjs"),
        [
          "export function discountedTotalCents(order) {",
          "  const subtotalCents = Number(order.subtotalCents);",
          "  const discountPercent = Number(order.discountPercent ?? 0);",
          "  if (!Number.isFinite(subtotalCents) || !Number.isFinite(discountPercent)) {",
          "    throw new TypeError('invalid discount input');",
          "  }",
          "  const discountCents = Math.round(subtotalCents * discountPercent / 100);",
          "  return Math.max(0, subtotalCents - discountCents);",
          "}",
          "",
        ].join("\n"),
      );

      const run = await runRuntimeDogfoodExternalProbe({
        slices: ["ai_code_ci_repair"],
        workspaceRoot: workspace,
      });

      assert.equal(run.fresh_shell_probe_passed, true, variant);
      assert.equal(
        run.dogfood_result.scenarios[0]?.metrics.execution_evidence_allows_authoritative,
        true,
        variant,
      );
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }
});

test("AI code CI repair dependency-surface variant exposes helper target and requires dependency repair", async () => {
  assert.ok((aiCodeCiRepairVariants as readonly string[]).includes("dependency_surface"));
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-dogfood-ai-code-dependency-"));
  try {
    prepareAiCodeCiRepairWorkspace(workspace, { force: true, variant: "dependency_surface" });

    const failedRun = await runRuntimeDogfoodExternalProbe({
      slices: ["ai_code_ci_repair"],
      workspaceRoot: workspace,
    });
    assert.equal(failedRun.fresh_shell_probe_passed, false);
    assert.ok(
      failedRun.probes[0]?.task_spec.expectations.target_files_include.includes("src/pricing/discount-policy.mjs"),
    );
    assert.match(failedRun.probes[0]?.task_spec.query_text ?? "", /dependency_surface/);
    assert.equal(
      failedRun.dogfood_result.scenarios[0]?.metrics.execution_evidence_allows_authoritative,
      false,
    );

    fs.writeFileSync(
      path.join(workspace, "src", "pricing", "discount-policy.mjs"),
      [
        "export function normalizeDiscountPercent(input) {",
        "  if (input == null) return 0;",
        "  const discountPercent = Number(input);",
        "  if (!Number.isFinite(discountPercent)) {",
        "    throw new TypeError('invalid discount input');",
        "  }",
        "  return discountPercent;",
        "}",
        "",
      ].join("\n"),
    );

    const passedRun = await runRuntimeDogfoodExternalProbe({
      slices: ["ai_code_ci_repair"],
      workspaceRoot: workspace,
    });

    assert.equal(passedRun.fresh_shell_probe_passed, true);
    assert.match(passedRun.fresh_shell_probe_output, /normalization helper preserves percent-point semantics/);
    assert.equal(
      passedRun.dogfood_result.scenarios[0]?.metrics.execution_evidence_allows_authoritative,
      true,
    );
    assert.equal(
      passedRun.dogfood_result.scenarios[0]?.metrics.stable_promotion_allowed,
      true,
    );
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

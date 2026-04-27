import test from "node:test";
import assert from "node:assert/strict";
import { buildExecutionPacketV1, ExecutionPacketV1Schema, ExecutionStateV1Schema } from "../../src/execution/index.ts";
import { buildOutcomeContractGate } from "../../src/memory/contract-trust.ts";
import {
  assessExecutionEvidence,
  buildExecutionEvidenceFromValidation,
  extractExecutionEvidenceFromSlots,
} from "../../src/memory/execution-evidence.ts";
import { buildExecutionContractFromProjection } from "../../src/memory/execution-contract.ts";
import { buildRuntimeAuthorityGate } from "../../src/memory/authority-gate.ts";
import {
  resolveNodeAcceptanceChecks,
  resolveNodeServiceLifecycleConstraints,
} from "../../src/memory/node-execution-surface.ts";

test("execution packet carries service lifecycle constraints from execution state", () => {
  const state = ExecutionStateV1Schema.parse({
    state_id: "state-1",
    scope: "aionis://tests/service-lifecycle",
    task_brief: "Keep the local validation service alive for a fresh-shell probe",
    current_stage: "patch",
    active_role: "patch",
    owned_files: ["scripts/build_index.py"],
    modified_files: ["scripts/build_index.py"],
    pending_validations: ["curl -fsS http://localhost:8080/healthz"],
    completed_validations: [],
    last_accepted_hypothesis: null,
    rejected_paths: [],
    unresolved_blockers: [],
    rollback_notes: [],
    service_lifecycle_constraints: [
      {
        version: 1,
        service_kind: "http",
        label: "service:http://localhost:8080/healthz",
        launch_reference: "nohup python -m http.server 8080 --directory dist/simple >/tmp/index.log 2>&1 &",
        endpoint: "http://localhost:8080/healthz",
        must_survive_agent_exit: true,
        revalidate_from_fresh_shell: true,
        detach_then_probe: true,
        health_checks: ["curl -fsS http://localhost:8080/healthz"],
        teardown_notes: [],
      },
    ],
    reviewer_contract: null,
    resume_anchor: null,
    updated_at: new Date().toISOString(),
    version: 1,
  });

  const packet = buildExecutionPacketV1({ state });
  const parsed = ExecutionPacketV1Schema.parse(packet);
  assert.equal(parsed.service_lifecycle_constraints.length, 1);
  assert.equal(parsed.service_lifecycle_constraints[0]?.must_survive_agent_exit, true);
  assert.equal(parsed.service_lifecycle_constraints[0]?.revalidate_from_fresh_shell, true);
  assert.equal(parsed.service_lifecycle_constraints[0]?.detach_then_probe, true);
  assert.equal(parsed.service_lifecycle_constraints[0]?.endpoint, "http://localhost:8080/healthz");
});

test("node execution surface exposes acceptance checks and lifecycle constraints through canonical contract", () => {
  const contract = buildExecutionContractFromProjection({
    contract_trust: "advisory",
    task_family: "service_publish_validate",
    target_files: ["scripts/dev-server.mjs"],
    next_action: "Validate detached service from a fresh shell.",
    service_lifecycle_constraints: [
      {
        version: 1,
        service_kind: "http",
        label: "service:http://localhost:4173/healthz",
        launch_reference: "nohup node scripts/dev-server.mjs --port 4173 >/tmp/dev.log 2>&1 &",
        endpoint: "http://localhost:4173/healthz",
        must_survive_agent_exit: true,
        revalidate_from_fresh_shell: true,
        detach_then_probe: true,
        health_checks: ["curl -fsS http://localhost:4173/healthz"],
        teardown_notes: [],
      },
    ],
    acceptance_checks: ["curl -fsS http://localhost:4173/healthz"],
    provenance: {
      source_kind: "trajectory_compile",
    },
  });
  const slots = {
    execution_contract_v1: contract,
    acceptance_checks: ["legacy check should not win"],
  };

  assert.deepEqual(resolveNodeAcceptanceChecks({ slots }), ["curl -fsS http://localhost:4173/healthz"]);
  assert.deepEqual(
    resolveNodeServiceLifecycleConstraints({ slots }).map((constraint) => ({
      label: constraint.label,
      must_survive_agent_exit: constraint.must_survive_agent_exit,
      revalidate_from_fresh_shell: constraint.revalidate_from_fresh_shell,
      detach_then_probe: constraint.detach_then_probe,
    })),
    [{
      label: "service:http://localhost:4173/healthz",
      must_survive_agent_exit: true,
      revalidate_from_fresh_shell: true,
      detach_then_probe: true,
    }],
  );
});

test("outcome gate blocks authoritative service contracts without durable lifecycle proof", () => {
  const thinContract = buildExecutionContractFromProjection({
    contract_trust: "authoritative",
    task_family: "service_publish_validate",
    target_files: ["scripts/dev-server.mjs"],
    next_action: "Restart scripts/dev-server.mjs and rerun the health probe.",
    service_lifecycle_constraints: [
      {
        version: 1,
        service_kind: "http",
        label: "service:http://localhost:4173/healthz",
        launch_reference: "node scripts/dev-server.mjs --port 4173",
        endpoint: "http://localhost:4173/healthz",
        must_survive_agent_exit: true,
        revalidate_from_fresh_shell: true,
        detach_then_probe: false,
        health_checks: ["curl -fsS http://localhost:4173/healthz"],
        teardown_notes: [],
      },
    ],
    acceptance_checks: ["curl -fsS http://localhost:4173/healthz"],
    success_invariants: ["service_endpoint_reachable:http://localhost:4173/healthz"],
    must_hold_after_exit: ["service_endpoint_still_serves_after_exit:http://localhost:4173/healthz"],
    external_visibility_requirements: ["endpoint_reachable:http://localhost:4173/healthz"],
    provenance: {
      source_kind: "manual_context",
    },
  });
  const thinGate = buildOutcomeContractGate({
    executionContract: thinContract,
    requestedTrust: "authoritative",
  });
  assert.equal(thinGate.allows_authoritative, false);
  assert.ok(thinGate.reasons.includes("missing_service_detach_then_probe"));
  assert.equal(thinGate.decisive_fields.durable_service_lifecycle_constraint_count, 1);
  assert.equal(thinGate.decisive_fields.service_detach_then_probe_count, 0);

  const durableContract = buildExecutionContractFromProjection({
    ...thinContract,
    service_lifecycle_constraints: [
      {
        version: 1,
        service_kind: "http",
        label: "service:http://localhost:4173/healthz",
        launch_reference: "nohup node scripts/dev-server.mjs --port 4173 >/tmp/dev.log 2>&1 &",
        endpoint: "http://localhost:4173/healthz",
        must_survive_agent_exit: true,
        revalidate_from_fresh_shell: true,
        detach_then_probe: true,
        health_checks: ["curl -fsS http://localhost:4173/healthz"],
        teardown_notes: [],
      },
    ],
    acceptance_checks: thinContract.outcome.acceptance_checks,
    success_invariants: thinContract.outcome.success_invariants,
    must_hold_after_exit: thinContract.outcome.must_hold_after_exit,
    external_visibility_requirements: thinContract.outcome.external_visibility_requirements,
    provenance: {
      source_kind: "manual_context",
    },
  });
  const durableGate = buildOutcomeContractGate({
    executionContract: durableContract,
    requestedTrust: "authoritative",
  });
  assert.equal(durableGate.allows_authoritative, true);
  assert.equal(durableGate.status, "sufficient");
});

test("execution evidence blocks authoritative learning after failed after-exit proof", () => {
  const contract = buildExecutionContractFromProjection({
    contract_trust: "authoritative",
    task_family: "service_publish_validate",
    target_files: ["scripts/dev-server.mjs"],
    next_action: "Launch detached service and validate from a fresh shell after exit.",
    service_lifecycle_constraints: [
      {
        version: 1,
        service_kind: "http",
        label: "service:http://localhost:4173/healthz",
        launch_reference: "nohup node scripts/dev-server.mjs --port 4173 >/tmp/dev.log 2>&1 &",
        endpoint: "http://localhost:4173/healthz",
        must_survive_agent_exit: true,
        revalidate_from_fresh_shell: true,
        detach_then_probe: true,
        health_checks: ["curl -fsS http://localhost:4173/healthz"],
        teardown_notes: [],
      },
    ],
    acceptance_checks: ["curl -fsS http://localhost:4173/healthz"],
    success_invariants: ["fresh_shell_revalidation_passes"],
    must_hold_after_exit: ["service_endpoint_still_serves_after_exit:http://localhost:4173/healthz"],
    external_visibility_requirements: ["endpoint_reachable:http://localhost:4173/healthz"],
    provenance: {
      source_kind: "manual_context",
    },
  });
  const outcomeGate = buildOutcomeContractGate({
    executionContract: contract,
    requestedTrust: "authoritative",
  });
  assert.equal(outcomeGate.allows_authoritative, true);

  const failedEvidence = buildExecutionEvidenceFromValidation({
    validationPassed: true,
    afterExitRevalidated: false,
    freshShellProbePassed: false,
    validationBoundary: "external_verifier",
    failureReason: "fresh_shell_probe_connection_refused_after_agent_exit",
    falseConfidenceDetected: true,
    evidenceRefs: ["test:fresh-shell-probe"],
  });
  const assessment = assessExecutionEvidence({
    executionContract: contract,
    evidence: failedEvidence,
    requestedTrust: "authoritative",
  });
  assert.equal(assessment.status, "failed");
  assert.equal(assessment.allows_authoritative, false);
  assert.equal(assessment.allows_stable_promotion, false);
  assert.equal(assessment.effective_trust, "advisory");
  assert.ok(assessment.reasons.includes("after_exit_revalidation_failed"));
  assert.ok(assessment.reasons.includes("fresh_shell_probe_failed"));
  assert.ok(assessment.reasons.includes("false_confidence_detected"));
});

test("runtime authority gate rejects validation-only evidence for after-exit service contracts", () => {
  const contract = buildExecutionContractFromProjection({
    contract_trust: "authoritative",
    task_family: "service_publish_validate",
    target_files: ["scripts/dev-server.mjs"],
    next_action: "Keep the detached service alive and validate from a fresh shell.",
    service_lifecycle_constraints: [
      {
        version: 1,
        service_kind: "http",
        label: "service:http://localhost:4173/healthz",
        launch_reference: "nohup node scripts/dev-server.mjs --port 4173 >/tmp/dev.log 2>&1 &",
        endpoint: "http://localhost:4173/healthz",
        must_survive_agent_exit: true,
        revalidate_from_fresh_shell: true,
        detach_then_probe: true,
        health_checks: ["curl -fsS http://localhost:4173/healthz"],
        teardown_notes: [],
      },
    ],
    acceptance_checks: ["curl -fsS http://localhost:4173/healthz"],
    success_invariants: ["fresh_shell_revalidation_passes"],
    must_hold_after_exit: ["service_endpoint_still_serves_after_exit:http://localhost:4173/healthz"],
    external_visibility_requirements: ["endpoint_reachable_from_fresh_shell:http://localhost:4173/healthz"],
    provenance: {
      source_kind: "manual_context",
    },
  });

  const authority = buildRuntimeAuthorityGate({
    executionContract: contract,
    requestedTrust: "authoritative",
    evidence: buildExecutionEvidenceFromValidation({
      validationPassed: true,
      validationBoundary: "agent_self",
      evidenceRefs: ["test:agent-side-validation-only"],
    }),
  });

  assert.equal(authority.outcomeContractGate.allows_authoritative, true);
  assert.equal(authority.executionEvidenceAssessment.status, "incomplete");
  assert.equal(authority.authorityGate.allows_authoritative, false);
  assert.equal(authority.authorityGate.allows_stable_promotion, false);
  assert.equal(authority.authorityGate.effective_trust, "advisory");
  assert.ok(authority.authorityGate.reasons.includes("execution_evidence:missing_after_exit_revalidation"));
  assert.ok(authority.authorityGate.reasons.includes("execution_evidence:missing_fresh_shell_probe"));
  assert.ok(authority.authorityGate.reasons.includes("execution_evidence:agent_self_validation_boundary"));
});

test("execution evidence rejects agent-self fresh-shell proof for after-exit authority", () => {
  const contract = buildExecutionContractFromProjection({
    contract_trust: "authoritative",
    task_family: "service_publish_validate",
    target_files: ["scripts/dev-server.mjs"],
    next_action: "Launch detached service and validate from a fresh shell after exit.",
    service_lifecycle_constraints: [
      {
        version: 1,
        service_kind: "http",
        label: "service:http://localhost:4173/healthz",
        launch_reference: "launchctl bootstrap gui/501 /tmp/com.aionis.test.plist",
        endpoint: "http://localhost:4173/healthz",
        must_survive_agent_exit: true,
        revalidate_from_fresh_shell: true,
        detach_then_probe: true,
        health_checks: ["curl -fsS http://localhost:4173/healthz"],
        teardown_notes: [],
      },
    ],
    acceptance_checks: ["curl -fsS http://localhost:4173/healthz"],
    success_invariants: ["fresh_shell_revalidation_passes"],
    must_hold_after_exit: ["service_endpoint_still_serves_after_exit:http://localhost:4173/healthz"],
    external_visibility_requirements: ["endpoint_reachable_from_fresh_shell:http://localhost:4173/healthz"],
    provenance: {
      source_kind: "manual_context",
    },
  });

  const selfVerifiedEvidence = buildExecutionEvidenceFromValidation({
    validationPassed: true,
    afterExitRevalidated: true,
    freshShellProbePassed: true,
    validationBoundary: "agent_self",
    evidenceRefs: ["test:agent-self-fresh-shell-probe"],
  });
  const assessment = assessExecutionEvidence({
    executionContract: contract,
    evidence: selfVerifiedEvidence,
    requestedTrust: "authoritative",
  });

  assert.equal(assessment.status, "incomplete");
  assert.equal(assessment.allows_authoritative, false);
  assert.equal(assessment.allows_stable_promotion, false);
  assert.equal(assessment.decisive_fields.validation_boundary, "agent_self");
  assert.equal(assessment.decisive_fields.requires_external_validation_boundary, true);
  assert.ok(assessment.reasons.includes("agent_self_validation_boundary"));
});

test("execution evidence compiler preserves service lifecycle proof from metrics", () => {
  const evidence = extractExecutionEvidenceFromSlots({
    metrics: {
      success_ratio: 1,
      after_exit_revalidated: true,
      fresh_shell_probe_passed: true,
      evidence_refs: ["metrics:fresh-shell-probe"],
    },
  });

  assert.ok(evidence);
  assert.equal(evidence.validation_passed, true);
  assert.equal(evidence.after_exit_revalidated, true);
  assert.equal(evidence.fresh_shell_probe_passed, true);
  assert.equal(evidence.failure_reason, null);
  assert.equal(evidence.false_confidence_detected, false);
  assert.deepEqual(evidence.evidence_refs, ["metrics:fresh-shell-probe"]);
});

test("execution evidence compiler normalizes route side outputs into execution_evidence_v1", () => {
  const evidence = extractExecutionEvidenceFromSlots({
    slots: {
      execution_result_summary: {
        status: "passed",
        summary: "Agent-side validation passed, but after-exit probe failed.",
        validation_passed: true,
        after_exit_revalidated: false,
        fresh_shell_probe_passed: false,
        validation_boundary: "external_verifier",
      },
      execution_evidence: [{
        ref: "evidence://service/fresh-shell-probe",
        failure_reason: "connection_refused_after_agent_exit",
      }],
      execution_packet_v1: {
        evidence_refs: ["packet:evidence:fresh-shell-probe"],
      },
    },
  });

  assert.ok(evidence);
  assert.equal(evidence.schema_version, "execution_evidence_v1");
  assert.equal(evidence.validation_passed, true);
  assert.equal(evidence.after_exit_revalidated, false);
  assert.equal(evidence.fresh_shell_probe_passed, false);
  assert.deepEqual(evidence.evidence_refs, [
    "evidence://service/fresh-shell-probe",
    "packet:evidence:fresh-shell-probe",
  ]);
});

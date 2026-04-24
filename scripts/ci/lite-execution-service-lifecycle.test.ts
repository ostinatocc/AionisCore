import test from "node:test";
import assert from "node:assert/strict";
import { buildExecutionPacketV1, ExecutionPacketV1Schema, ExecutionStateV1Schema } from "../../src/execution/index.ts";
import { buildOutcomeContractGate } from "../../src/memory/contract-trust.ts";
import { assessExecutionEvidence, buildExecutionEvidenceFromValidation } from "../../src/memory/execution-evidence.ts";
import { buildExecutionContractFromProjection } from "../../src/memory/execution-contract.ts";

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

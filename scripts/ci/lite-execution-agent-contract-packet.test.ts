import test from "node:test";
import assert from "node:assert/strict";
import {
  buildExecutionAgentContractPacketV1,
  renderExecutionAgentContractPacketMarkdown,
} from "../../src/memory/execution-agent-contract-packet.ts";
import { buildExecutionContractFromProjection } from "../../src/memory/execution-contract.ts";

function serviceConstraint(label: string) {
  return {
    version: 1 as const,
    service_kind: "generic" as const,
    label,
    launch_reference: null,
    endpoint: null,
    must_survive_agent_exit: label === "runtime-service",
    revalidate_from_fresh_shell: label === "runtime-service",
    detach_then_probe: label === "runtime-service",
    health_checks: [],
    teardown_notes: [],
  };
}

test("execution agent contract packet defaults to compact contract-only output", () => {
  const contract = buildExecutionContractFromProjection({
    contract_trust: "authoritative",
    task_family: "service_publish_validate",
    target_files: ["scripts/server.mjs"],
    next_action: "Launch the service detached and probe /healthz from a fresh shell.",
    workflow_steps: [
      "Inspect service entrypoint.",
      "Launch detached with redirected stdio.",
      "Probe from a fresh shell.",
    ],
    pattern_hints: ["prefer nohup over foreground child processes"],
    service_lifecycle_constraints: [serviceConstraint("runtime-service")],
    acceptance_checks: ["curl -fsS http://127.0.0.1:4199/healthz"],
    provenance: {
      source_kind: "trajectory_compile",
      source_summary_version: "trajectory_compile_v1",
      source_anchor: "anchor_service",
      evidence_refs: ["evidence:service"],
      notes: ["compiled from failed service trajectory"],
    },
  });

  const packet = buildExecutionAgentContractPacketV1({
    contract,
    task_prompt: "Keep the service alive after worker exit.",
  });
  const markdown = renderExecutionAgentContractPacketMarkdown(packet).join("\n");

  assert.equal(packet.packet_version, "execution_agent_contract_packet_v1");
  assert.equal(packet.mode, "contract_only");
  assert.equal(packet.expanded, null);
  assert.deepEqual(packet.contract.target_files, ["scripts/server.mjs"]);
  assert.equal(packet.contract.next_action, "Launch the service detached and probe /healthz from a fresh shell.");
  assert.deepEqual(packet.contract.acceptance_checks, ["curl -fsS http://127.0.0.1:4199/healthz"]);
  assert.ok(packet.contract.lifecycle_constraints.some((constraint) => constraint.includes("must_survive_agent_exit")));
  assert.ok(packet.contract.authority_boundary.includes("success_requires_declared_acceptance_checks"));
  assert.ok(packet.contract.authority_boundary.includes("after_exit_claim_requires_fresh_shell_revalidation"));
  assert.equal(packet.action_discipline.execution_mode, "contract_locked");
  assert.equal(packet.action_discipline.first_action, "inspect_declared_target_files_before_broad_discovery");
  assert.equal(packet.action_discipline.max_pre_edit_confirmation_steps, 2);
  assert.ok(packet.action_discipline.prohibited_actions.includes("do_not_run_broad_repository_file_enumeration_before_declared_targets"));
  assert.ok(packet.action_discipline.prohibited_actions.includes("do_not_read_general_skill_or_preference_files_before_declared_targets"));
  assert.ok(packet.action_discipline.stop_conditions.includes("stop_after_required_validation_passes_and_report_evidence"));
  assert.match(markdown, /Runtime contract:/);
  assert.match(markdown, /Action discipline:/);
  assert.match(markdown, /execution_mode: contract_locked/);
  assert.match(markdown, /target_files: scripts\/server\.mjs/);
  assert.doesNotMatch(markdown, /Inspect service entrypoint/);
  assert.doesNotMatch(markdown, /prefer nohup/);
});

test("execution agent contract packet expands only when compact contract is insufficient or failed", () => {
  const completeContract = buildExecutionContractFromProjection({
    task_family: "ai_code_ci_repair",
    target_files: ["src/pricing/discount.mjs", "tests/pricing/discount.test.mjs"],
    next_action: "Patch discount behavior and run the targeted pricing test.",
    workflow_steps: ["Read the failing test.", "Patch the implementation.", "Run the targeted test."],
    pattern_hints: ["avoid editing tests as success evidence"],
    acceptance_checks: ["npm test -- tests/pricing/discount.test.mjs"],
    provenance: {
      source_kind: "trajectory_compile",
      source_summary_version: "trajectory_compile_v1",
      source_anchor: null,
      evidence_refs: [],
      notes: [],
    },
  });
  const failedPacket = buildExecutionAgentContractPacketV1({
    contract: completeContract,
    verification_failed: true,
  });

  assert.equal(failedPacket.mode, "workflow_expanded");
  assert.equal(failedPacket.action_discipline.execution_mode, "exploratory_allowed");
  assert.ok(failedPacket.expanded);
  assert.deepEqual(failedPacket.expanded.workflow_steps, completeContract.workflow_steps);
  assert.ok(failedPacket.escalation.reasons.includes("verification_failed"));

  const incompleteContract = buildExecutionContractFromProjection({
    task_family: "ai_code_ci_repair",
    target_files: [],
    next_action: null,
    acceptance_checks: [],
    workflow_steps: ["Inspect the failing area before patching."],
    provenance: {
      source_kind: "manual_context",
      source_summary_version: null,
      source_anchor: null,
      evidence_refs: [],
      notes: [],
    },
  });
  const insufficientPacket = buildExecutionAgentContractPacketV1({ contract: incompleteContract });

  assert.equal(insufficientPacket.mode, "workflow_expanded");
  assert.equal(insufficientPacket.action_discipline.execution_mode, "exploratory_allowed");
  assert.equal(insufficientPacket.action_discipline.max_pre_edit_confirmation_steps, null);
  assert.ok(insufficientPacket.escalation.reasons.includes("compact_contract_missing_target_files"));
  assert.ok(insufficientPacket.escalation.reasons.includes("compact_contract_missing_next_action"));
  assert.ok(insufficientPacket.escalation.reasons.includes("compact_contract_missing_acceptance_checks"));
});

test("execution agent contract packet marks acceptance evidence read-only under locked contracts", () => {
  const contract = buildExecutionContractFromProjection({
    contract_trust: "authoritative",
    task_family: "ai_code_ci_repair",
    target_files: ["src/pricing/discount.mjs", "tests/pricing/discount.test.mjs"],
    next_action: "Patch discount behavior and run the targeted pricing test.",
    acceptance_checks: ["npm test -- tests/pricing/discount.test.mjs"],
    provenance: {
      source_kind: "trajectory_compile",
      source_summary_version: "trajectory_compile_v1",
      source_anchor: null,
      evidence_refs: [],
      notes: [],
    },
  });

  const packet = buildExecutionAgentContractPacketV1({ contract });

  assert.equal(packet.action_discipline.execution_mode, "contract_locked");
  assert.ok(packet.action_discipline.prohibited_actions.includes(
    "do_not_edit_acceptance_evidence:tests/pricing/discount.test.mjs",
  ));
  assert.ok(packet.action_discipline.allowed_work_surface.includes("src/pricing/discount.mjs"));
  assert.ok(packet.action_discipline.allowed_work_surface.includes("validation:npm test -- tests/pricing/discount.test.mjs"));
});

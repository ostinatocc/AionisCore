import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  authorityConsumptionStateFromValue,
  authorityVisibilityBlocksPromotionReadiness,
  authorityVisibilityFromValue,
  authorityVisibilityPrimaryBlocker,
  authorityVisibilityRequiresInspection,
  buildAuthorityInspectionNextAction,
  demoteContractTrustForAuthorityBlock,
  demoteExecutionContractForAuthorityVisibility,
} from "../../src/memory/authority-consumption.ts";
import { buildExecutionContractFromProjection } from "../../src/memory/execution-contract.ts";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

function read(repoPath: string): string {
  return fs.readFileSync(path.join(ROOT, repoPath), "utf8");
}

function assertContains(text: string, needle: string, message: string): void {
  assert.ok(text.includes(needle), message);
}

test("authority-producing Runtime surfaces use the unified authority gate", () => {
  const workflowWriteProjection = read("src/memory/workflow-write-projection.ts");
  assertContains(workflowWriteProjection, "buildRuntimeAuthorityGate", "workflow write projection must build runtime authority gates");
  assertContains(workflowWriteProjection, "authority_gate_v1", "workflow write projection must persist authority gate state");
  assertContains(workflowWriteProjection, "authorityGate.allows_stable_promotion", "stable workflow projection must depend on authority gate promotion");

  const replayLearningArtifacts = read("src/memory/replay-learning-artifacts.ts");
  assertContains(replayLearningArtifacts, "buildRuntimeAuthorityGate", "replay learning artifacts must build runtime authority gates");
  assertContains(replayLearningArtifacts, "authority_gate_v1", "replay learning artifacts must persist authority gate state");
  assertContains(replayLearningArtifacts, "authorityGate.allows_authoritative", "replay stable promotion must require authoritative authority gate");
  assertContains(replayLearningArtifacts, "authorityGate.allows_stable_promotion", "replay stable promotion must require stable-promotion authority gate");

  const replayStableAnchorHelpers = read("src/memory/replay-stable-anchor-helpers.ts");
  assertContains(replayStableAnchorHelpers, "buildRuntimeAuthorityGate", "replay stable anchors must build runtime authority gates");
  assertContains(replayStableAnchorHelpers, "authority_gate_v1", "replay stable anchors must persist authority gate state");
  assertContains(replayStableAnchorHelpers, "authority.authorityGate.allows_stable_promotion", "replay playbook anchors must degrade to candidate when authority is insufficient");

  const policyMemory = read("src/memory/policy-memory.ts");
  assertContains(policyMemory, "buildRuntimeAuthorityGate", "policy memory must build runtime authority gates");
  assertContains(policyMemory, "buildPolicyAuthoritySurfaces", "policy memory must centralize policy authority surfaces");
  assertContains(policyMemory, "authority_gate_v1", "policy memory must persist authority gate state");
});

test("authority-consuming Runtime boundaries use the shared authority consumption helper", () => {
  const actionRetrieval = read("src/memory/action-retrieval.ts");
  assertContains(actionRetrieval, "authority-consumption.js", "action retrieval must consume the shared authority helper");
  assertContains(actionRetrieval, "authorityConsumptionStateFromValue", "action retrieval must derive authority consumption state through the helper");
  assertContains(actionRetrieval, "demoteExecutionContractForAuthorityVisibility", "action retrieval must demote blocked execution contracts through the helper");
  assert.equal(actionRetrieval.includes("authorityVisibilityFromValue"), false, "action retrieval must not bypass authority consumption state");

  const contextOrchestrator = read("src/memory/context-orchestrator.ts");
  assertContains(contextOrchestrator, "authority-consumption.js", "context orchestration must consume the shared authority helper");
  assertContains(contextOrchestrator, "authority_requires_inspection", "planner packet text must expose inspect-first authority state");

  const planningSummaryAssembly = read("src/app/planning-summary-assembly.ts");
  assertContains(planningSummaryAssembly, "authorityConsumptionStateFromValue", "planning summary assembly must derive authority state through the helper");
  assert.equal(planningSummaryAssembly.includes("experiencePath?.authority_blocked"), false, "planning summary assembly must not trust legacy authority booleans directly");

  const reviewerPacks = read("src/memory/reviewer-packs.ts");
  assertContains(reviewerPacks, "authority-consumption.js", "reviewer packs must consume the shared authority helper");
  assertContains(reviewerPacks, "authorityConsumptionAllowsActionReuse", "reviewer packs must filter blocked action reuse through the helper");
});

test("pattern surfaces cannot masquerade as authoritative Runtime contracts", () => {
  const toolsPatternAnchor = read("src/memory/tools-pattern-anchor.ts");
  assert.equal(toolsPatternAnchor.includes("\"authoritative\""), false, "tools pattern anchors must not grant authoritative trust");
  assertContains(toolsPatternAnchor, "\"advisory\"", "stable trusted tool patterns may become advisory guidance");
  assertContains(toolsPatternAnchor, "\"observational\"", "non-stable tool patterns must remain observational guidance");

  const formPatternGovernance = read("src/memory/form-pattern-governance.ts");
  assert.equal(formPatternGovernance.includes("contract_trust"), false, "form pattern governance must not mutate contract trust");
  assert.equal(formPatternGovernance.includes("\"authoritative\""), false, "form pattern governance must not grant authoritative trust");
  assertContains(formPatternGovernance, "target_kind !== \"pattern\"", "form pattern governance must remain pattern-scoped");
  assertContains(formPatternGovernance, "target_level !== \"L3\"", "form pattern governance must remain L3-scoped");
});

test("authority surface documentation records the intended Runtime boundary", () => {
  const doc = read("docs/plans/2026-04-24-runtime-authority-surface-gates.md");
  assertContains(doc, "Contract Compiler", "authority surface doc must keep the four-core Runtime framing");
  assertContains(doc, "Trust Gate", "authority surface doc must identify this work as a trust gate hardening pass");
  assertContains(doc, "runtime_authority_gate_v1", "authority surface doc must name the persisted authority gate");
  assertContains(doc, "Workflow write projection", "authority surface doc must cover workflow write projection");
  assertContains(doc, "Replay learning auto-promotion", "authority surface doc must cover replay learning promotion");
  assertContains(doc, "Policy memory materialization", "authority surface doc must cover policy memory");
  assertContains(doc, "Tools pattern anchors", "authority surface doc must separate pattern guidance from authoritative policy");
});

test("authority consumption helper demotes blocked authority to inspect-first guidance", () => {
  const visibility = authorityVisibilityFromValue({
    authority_visibility: {
      surface_version: "runtime_authority_visibility_v1",
      node_id: "wf_blocked",
      node_kind: "workflow",
      title: "Blocked workflow",
      requested_trust: "authoritative",
      effective_trust: "advisory",
      status: "insufficient",
      allows_authoritative: false,
      allows_stable_promotion: false,
      authority_blocked: true,
      stable_promotion_blocked: true,
      primary_blocker: "execution_evidence:after_exit_revalidation_failed",
      authority_reasons: ["execution_evidence:after_exit_revalidation_failed"],
      outcome_contract_reasons: [],
      execution_evidence_reasons: ["after_exit_revalidation_failed"],
      execution_evidence_status: "failed",
      false_confidence_detected: true,
    },
  });

  assert.equal(authorityVisibilityRequiresInspection(visibility), true);
  assert.equal(authorityVisibilityPrimaryBlocker(visibility), "execution_evidence:after_exit_revalidation_failed");
  assert.equal(demoteContractTrustForAuthorityBlock("authoritative", true), "advisory");
  assert.equal(demoteContractTrustForAuthorityBlock("observational", true), "observational");
  assert.equal(
    buildAuthorityInspectionNextAction({
      selectedTool: "edit",
      filePath: "src/routes/export.ts",
      blocker: authorityVisibilityPrimaryBlocker(visibility),
    }),
    "Inspect src/routes/export.ts and revalidate current context before reusing edit; authority blocked by execution_evidence:after_exit_revalidation_failed.",
  );

  const contract = buildExecutionContractFromProjection({
    contract_trust: "authoritative",
    task_family: "task:repair_export",
    workflow_signature: "execution_workflow:repair-export",
    selected_tool: "edit",
    file_path: "src/routes/export.ts",
    target_files: ["src/routes/export.ts"],
    next_action: "Patch src/routes/export.ts and rerun export tests.",
    acceptance_checks: ["npm test -- export"],
    success_invariants: ["export route returns valid serialized payload"],
    provenance: {
      source_kind: "workflow_projection",
      source_summary_version: "lite-runtime-authority-gates-test",
      source_anchor: "wf_blocked",
      evidence_refs: ["wf_blocked"],
      notes: ["blocked workflow test"],
    },
  });
  const demoted = demoteExecutionContractForAuthorityVisibility({
    contract,
    visibility,
    selectedTool: "edit",
    filePath: "src/routes/export.ts",
    reuseTarget: "the learned workflow",
  });

  assert.equal(demoted.contract_trust, "advisory");
  assert.match(demoted.next_action ?? "", /Inspect src\/routes\/export\.ts/);
  assert.ok(demoted.provenance.notes.includes("authority_visibility_requires_inspection:execution_evidence:after_exit_revalidation_failed"));
});

test("authority consumption keeps candidate readiness separate from action reuse authority", () => {
  const incompletePromotionVisibility = authorityVisibilityFromValue({
    authority_visibility: {
      surface_version: "runtime_authority_visibility_v1",
      node_id: "wf_candidate",
      node_kind: "workflow",
      title: "Candidate workflow",
      requested_trust: "advisory",
      effective_trust: "advisory",
      status: "insufficient",
      allows_authoritative: false,
      allows_stable_promotion: false,
      authority_blocked: false,
      stable_promotion_blocked: true,
      primary_blocker: "execution_evidence:missing_validation",
      authority_reasons: ["execution_evidence:missing_validation"],
      outcome_contract_reasons: [],
      execution_evidence_reasons: ["missing_validation"],
      execution_evidence_status: "incomplete",
      false_confidence_detected: false,
    },
  });

  assert.equal(authorityVisibilityRequiresInspection(incompletePromotionVisibility), true);
  assert.equal(authorityVisibilityBlocksPromotionReadiness(incompletePromotionVisibility), false);
  const incompleteState = authorityConsumptionStateFromValue({ authority_visibility: incompletePromotionVisibility });
  assert.equal(incompleteState.requires_inspection, true);
  assert.equal(incompleteState.blocks_promotion_readiness, false);
  assert.equal(incompleteState.primary_blocker, "execution_evidence:missing_validation");

  const authorityBlockedVisibility = authorityVisibilityFromValue({
    authority_visibility: {
      surface_version: "runtime_authority_visibility_v1",
      node_id: "wf_authority_blocked",
      node_kind: "workflow",
      title: "Authority blocked workflow",
      requested_trust: "authoritative",
      effective_trust: "advisory",
      status: "insufficient",
      allows_authoritative: false,
      allows_stable_promotion: false,
      authority_blocked: true,
      stable_promotion_blocked: true,
      primary_blocker: "execution_evidence:missing_validation",
      authority_reasons: ["execution_evidence:missing_validation"],
      outcome_contract_reasons: [],
      execution_evidence_reasons: ["missing_validation"],
      execution_evidence_status: "incomplete",
      false_confidence_detected: false,
    },
  });

  assert.equal(authorityVisibilityRequiresInspection(authorityBlockedVisibility), true);
  assert.equal(authorityVisibilityBlocksPromotionReadiness(authorityBlockedVisibility), false);

  const failedVisibility = authorityVisibilityFromValue({
    authority_visibility: {
      surface_version: "runtime_authority_visibility_v1",
      node_id: "wf_failed",
      node_kind: "workflow",
      title: "Failed workflow",
      requested_trust: "advisory",
      effective_trust: "advisory",
      status: "insufficient",
      allows_authoritative: false,
      allows_stable_promotion: false,
      authority_blocked: false,
      stable_promotion_blocked: true,
      primary_blocker: "execution_evidence:after_exit_revalidation_failed",
      authority_reasons: ["execution_evidence:after_exit_revalidation_failed"],
      outcome_contract_reasons: [],
      execution_evidence_reasons: ["after_exit_revalidation_failed"],
      execution_evidence_status: "failed",
      false_confidence_detected: true,
    },
  });

  assert.equal(authorityVisibilityRequiresInspection(failedVisibility), true);
  assert.equal(authorityVisibilityBlocksPromotionReadiness(failedVisibility), true);
  const legacyFallbackState = authorityConsumptionStateFromValue({
    authority_blocked: true,
    authority_primary_blocker: "legacy:blocker",
  });
  assert.equal(legacyFallbackState.requires_inspection, true);
  assert.equal(legacyFallbackState.primary_blocker, "legacy:blocker");
});

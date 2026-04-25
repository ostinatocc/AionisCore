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
import {
  runtimeBoundaryInventoryAuthorityEntries,
  runtimeBoundaryInventoryAuthorityFilesByCapability,
  runtimeBoundaryInventoryAuthorityFilesBySourceId,
  runtimeBoundaryInventoryAuthorityProducerEntries,
} from "../../src/memory/runtime-boundary-inventory.ts";
import { buildExecutionContractFromProjection } from "../../src/memory/execution-contract.ts";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

function read(repoPath: string): string {
  return fs.readFileSync(path.join(ROOT, repoPath), "utf8");
}

function assertContains(text: string, needle: string, message: string): void {
  assert.ok(text.includes(needle), message);
}

function listSourceTsFiles(dir: string): string[] {
  const absoluteDir = path.join(ROOT, dir);
  const out: string[] = [];
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const absolute = path.join(absoluteDir, entry.name);
    const relative = path.relative(ROOT, absolute);
    if (entry.isDirectory()) {
      out.push(...listSourceTsFiles(relative));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".ts")) out.push(relative);
  }
  return out.sort();
}

test("authority boundary inventory declares unique Runtime boundary entries", () => {
  const authorityEntries = runtimeBoundaryInventoryAuthorityEntries();
  assert.ok(authorityEntries.length > 0, "authority boundary inventory must not be empty");
  const ids = authorityEntries.map((entry) => entry.source_id);
  assert.equal(new Set(ids).size, ids.length, "authority boundary inventory ids must be unique");

  for (const entry of authorityEntries) {
    assert.ok(entry.file.startsWith("src/"), `${entry.source_id} must point at a Runtime source file`);
    assert.ok(fs.existsSync(path.join(ROOT, entry.file)), `${entry.source_id} must point at an existing source file`);
    if (entry.role === "authority_producer") {
      assert.ok(entry.producer_kind, `${entry.source_id} must declare producer kind`);
      assert.equal(entry.capabilities.may_use_runtime_authority_gate, true, `${entry.source_id} must be gate-backed`);
      assert.ok(entry.required_source_markers.length > 0, `${entry.source_id} must declare source markers`);
    }
    if (entry.role === "advisory_pattern_producer") {
      assert.equal(entry.producer_kind, "advisory_pattern", `${entry.source_id} must stay advisory pattern scoped`);
      assert.equal(entry.capabilities.may_use_runtime_authority_gate, false, `${entry.source_id} must not mint Runtime authority`);
    }
  }
});

test("authority-producing Runtime surfaces use the unified authority gate", () => {
  const producers = runtimeBoundaryInventoryAuthorityProducerEntries()
    .filter((producer) => producer.capabilities.may_use_runtime_authority_gate);
  assert.ok(producers.length > 0, "authority boundary inventory must declare gate-backed producers");

  for (const producer of producers) {
    const text = read(producer.file);
    assertContains(text, "buildRuntimeAuthorityGate", `${producer.file} must build runtime authority gates`);
    assertContains(text, "authority_gate_v1", `${producer.file} must persist authority gate state`);
    for (const token of producer.required_source_markers) {
      assertContains(text, token, `${producer.file} must keep ${producer.source_id} backed by ${token}`);
    }
  }
});

test("stable and authoritative producer literals stay in declared producer classes", () => {
  const sourceFiles = [...listSourceTsFiles("src/app"), ...listSourceTsFiles("src/memory"), ...listSourceTsFiles("src/routes")];
  const stableWorkflowLiteralFiles = sourceFiles
    .filter((file) => read(file).includes("promotion_state: \"stable\""))
    .sort();
  assert.deepEqual(
    stableWorkflowLiteralFiles,
    runtimeBoundaryInventoryAuthorityFilesByCapability("may_use_stable_workflow_literal"),
    "Stable workflow promotion literals must stay limited to declared producers and read-side orchestration summaries.",
  );

  const stablePatternLiteralFiles = sourceFiles
    .filter((file) => read(file).includes("pattern_state: \"stable\""))
    .sort();
  assert.deepEqual(
    stablePatternLiteralFiles,
    runtimeBoundaryInventoryAuthorityFilesByCapability("may_use_stable_pattern_literal"),
    "Stable pattern literals must stay limited to pattern anchoring and read-side orchestration summaries.",
  );
});

test("workflow stable producers bind stable writes to runtime authority gates", () => {
  const workflowWriteProjection = read("src/memory/workflow-write-projection.ts");
  for (const token of [
    "governancePreview?.runtime_apply.promotion_state_override === \"stable\"",
    "contractTrust === \"authoritative\"",
    "authorityGate.allows_authoritative",
    "authorityGate.allows_stable_promotion",
    "authorityGate: stableAuthorityGate",
    "outcomeContractGate: stableOutcomeContractGate",
    "executionEvidenceAssessment: stableExecutionEvidenceAssessment",
    "authority_gate_v1: stableAuthorityGate",
  ]) {
    assertContains(workflowWriteProjection, token, `workflow-write-projection stable writes must stay gate-backed by ${token}`);
  }

  const replayLearningArtifacts = read("src/memory/replay-learning-artifacts.ts");
  for (const token of [
    "args.shouldPromoteStableWorkflow",
    "authorityGate.allows_authoritative",
    "authorityGate.allows_stable_promotion",
    "authorityGate: stableAuthorityGate",
    "outcomeContractGate: stableOutcomeContractGate",
    "executionEvidenceAssessment: stableExecutionEvidenceAssessment",
    "authority_gate_v1: stableAuthorityGate",
  ]) {
    assertContains(replayLearningArtifacts, token, `replay-learning stable writes must stay gate-backed by ${token}`);
  }

  const replayStableAnchorHelpers = read("src/memory/replay-stable-anchor-helpers.ts");
  for (const token of [
    "authorityGatedReplayWorkflowContract",
    "const promotionState = authority.authorityGate.allows_stable_promotion ? \"stable\" : \"candidate\"",
    "execution_evidence_assessment: executionEvidenceAssessment",
    "authority_gate_v1: authorityGate",
  ]) {
    assertContains(replayStableAnchorHelpers, token, `replay stable anchors must stay gate-backed by ${token}`);
  }
});

test("stable tool pattern producers remain advisory and governance-scoped", () => {
  const toolsPatternAnchor = read("src/memory/tools-pattern-anchor.ts");
  assert.equal(toolsPatternAnchor.includes("\"authoritative\""), false, "tools pattern anchors must never mint authoritative trust");
  assertContains(toolsPatternAnchor, "return \"advisory\";", "stable trusted tool patterns may only become advisory guidance");
  assertContains(toolsPatternAnchor, "return \"observational\";", "non-stable tool patterns must stay observational");
  assertContains(toolsPatternAnchor, "promotion_gate_satisfied: promotionGateSatisfied", "pattern stability must keep distinct-run promotion evidence");
  assertContains(toolsPatternAnchor, "revalidation_floor_satisfied: revalidationFloorSatisfied", "pattern stability must keep post-contest revalidation evidence");
  assertContains(toolsPatternAnchor, "args.governedPatternStateOverride !== \"stable\"", "form-pattern governance must be required for runtime-applied stable override");
  assertContains(toolsPatternAnchor, "semantic_review_override_reason: \"high_confidence_form_pattern_review\"", "governed stable override must preserve semantic review provenance");
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

test("authority raw field and visibility parser access stays behind declared boundaries", () => {
  const sourceFiles = [...listSourceTsFiles("src/app"), ...listSourceTsFiles("src/memory")];
  const visibilityParserSymbols = [
    "authorityVisibilityFromValue",
    "authorityVisibilityRequiresInspection",
    "authorityVisibilityPrimaryBlocker",
  ];
  const parserAllowlist = new Set(runtimeBoundaryInventoryAuthorityFilesBySourceId("authority_consumption"));
  for (const file of sourceFiles) {
    if (parserAllowlist.has(file)) continue;
    const text = read(file);
    const matched = visibilityParserSymbols.filter((symbol) => text.includes(symbol));
    assert.deepEqual(matched, [], `${file} must consume authority through authorityConsumptionStateFromValue`);
  }

  const rawAuthorityFieldTokens = [
    "authority_gate_v1",
    "execution_evidence_assessment",
    "stable_promotion_blocked",
  ];
  const rawFieldBoundaryAllowlist = new Set(
    runtimeBoundaryInventoryAuthorityFilesByCapability("may_read_raw_authority_surface"),
  );
  for (const file of sourceFiles) {
    if (rawFieldBoundaryAllowlist.has(file)) continue;
    const text = read(file);
    const matched = rawAuthorityFieldTokens.filter((token) => text.includes(token));
    assert.deepEqual(matched, [], `${file} must not read raw authority gate/evidence fields directly`);
  }

  for (const file of [
    "src/memory/action-retrieval.ts",
    "src/memory/context-orchestrator.ts",
    "src/memory/reviewer-packs.ts",
    "src/app/planning-summary-assembly.ts",
  ]) {
    assertContains(read(file), "authorityConsumptionStateFromValue", `${file} must consume normalized authority state`);
  }
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
  assertContains(doc, "Authority Consumption Boundary", "authority surface doc must cover the consumer boundary");
  assertContains(doc, "authorityConsumptionStateFromValue", "authority surface doc must name the shared consumption state helper");
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

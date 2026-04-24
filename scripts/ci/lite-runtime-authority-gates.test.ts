import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

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

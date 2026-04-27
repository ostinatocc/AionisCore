import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  runtimeBoundaryInventoryAuthorityFilesByCapability,
  runtimeBoundaryInventoryAuthorityProducerEntries,
} from "../../src/memory/runtime-boundary-inventory.ts";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SRC = path.join(ROOT, "src");

function toRepoRelative(filePath: string): string {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function listTypeScriptFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listTypeScriptFiles(filePath));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      out.push(filePath);
    }
  }
  return out;
}

function read(repoPath: string): string {
  return fs.readFileSync(path.join(ROOT, repoPath), "utf8");
}

function sourceFilesUnder(repoPath: string): Array<{ file: string; text: string }> {
  return listTypeScriptFiles(path.join(ROOT, repoPath)).map((filePath) => ({
    file: toRepoRelative(filePath),
    text: fs.readFileSync(filePath, "utf8"),
  }));
}

function assertContains(text: string, needle: string, message: string): void {
  assert.ok(text.includes(needle), message);
}

test("route layer does not import trust gate or governance internals directly", () => {
  const forbiddenImportFragments = [
    "../memory/authority-consumption.js",
    "../memory/authority-gate.js",
    "../memory/authority-visibility.js",
    "../memory/contract-trust.js",
    "../memory/execution-evidence.js",
    "../memory/form-pattern-governance",
    "../memory/governance-model",
    "../memory/governance-operation-runner.js",
    "../memory/governance-provider",
    "../memory/promote-memory-governance",
    "../memory/replay-run-gate-step-outcomes.js",
    "../memory/replay-run-gates.js",
    "../memory/workflow-promotion-governance.js",
  ];
  const offenders = sourceFilesUnder("src/routes")
    .flatMap(({ file, text }) => {
      const imports = text.split("\n").filter((line) => /^\s*import\b/.test(line));
      return imports
        .filter((line) => forbiddenImportFragments.some((fragment) => line.includes(fragment)))
        .map((line) => `${file}: ${line.trim()}`);
    })
    .sort();

  assert.deepEqual(
    offenders,
    [],
    "Routes must compose app/runtime services and stable memory APIs, not trust gate internals.",
  );
});

test("route layer does not construct authority or promotion policy surfaces", () => {
  const forbiddenRoutePolicyTokens = [
    "PolicyGovernanceContractSchema",
    "buildRuntimeAuthorityGate",
    "buildOutcomeContractGate",
    "assessExecutionEvidence",
    "authority_gate_v1",
    "execution_evidence_assessment",
    "allows_authoritative",
    "allows_stable_promotion",
    "promotion_state: \"stable\"",
    "pattern_state: \"stable\"",
    "credibility_state: \"trusted\"",
  ];
  const offenders = sourceFilesUnder("src/routes")
    .flatMap(({ file, text }) =>
      forbiddenRoutePolicyTokens
        .filter((token) => text.includes(token))
        .map((token) => `${file}: ${token}`),
    )
    .sort();

  assert.deepEqual(
    offenders,
    [],
    "Routes may pass request/response data through, but policy/trust construction belongs in app or memory boundaries.",
  );
});

test("runtime authority gate builders stay behind explicit trust-gate producer boundaries", () => {
  const allowedRuntimeAuthorityGateUsers = new Set(
    runtimeBoundaryInventoryAuthorityFilesByCapability("may_use_runtime_authority_gate"),
  );
  const offenders = sourceFilesUnder("src/memory")
    .filter(({ text }) => text.includes("buildRuntimeAuthorityGate"))
    .map(({ file }) => file)
    .filter((file) => !allowedRuntimeAuthorityGateUsers.has(file))
    .sort();

  assert.deepEqual(
    offenders,
    [],
    "New authority-producing paths must be declared as Trust Gate producers before using buildRuntimeAuthorityGate.",
  );
});

test("outcome and evidence gates stay behind declared trust evaluation boundaries", () => {
  const allowedOutcomeGateUsers = new Set(
    runtimeBoundaryInventoryAuthorityFilesByCapability("may_use_outcome_contract_gate"),
  );
  const outcomeGateOffenders = sourceFilesUnder("src/memory")
    .filter(({ text }) => text.includes("buildOutcomeContractGate"))
    .map(({ file }) => file)
    .filter((file) => !allowedOutcomeGateUsers.has(file))
    .sort();

  assert.deepEqual(
    outcomeGateOffenders,
    [],
    "Outcome-contract evaluation must stay in declared Trust Gate or authority-consuming boundaries.",
  );

  const allowedExecutionEvidenceUsers = new Set(
    runtimeBoundaryInventoryAuthorityFilesByCapability("may_assess_execution_evidence"),
  );
  const executionEvidenceOffenders = sourceFilesUnder("src/memory")
    .filter(({ text }) => text.includes("assessExecutionEvidence"))
    .map(({ file }) => file)
    .filter((file) => !allowedExecutionEvidenceUsers.has(file))
    .sort();

  assert.deepEqual(
    executionEvidenceOffenders,
    [],
    "Execution evidence assessment must flow through the unified Runtime authority gate.",
  );
});

test("registered authority producers require declared gate markers", () => {
  const producers = runtimeBoundaryInventoryAuthorityProducerEntries();
  assert.ok(producers.length > 0, "authority boundary inventory must declare producer boundaries");

  for (const producer of producers) {
    const text = read(producer.file);
    if (producer.capabilities.may_use_runtime_authority_gate) {
      assertContains(text, "buildRuntimeAuthorityGate", `${producer.file} must use the unified Runtime authority gate`);
    }
    for (const token of producer.required_source_markers) {
      assertContains(text, token, `${producer.file} must keep ${producer.source_id} backed by ${token}`);
    }
  }
});

test("orchestrator routes do not mutate persistence or write memory directly", () => {
  const orchestratorRouteFiles = [
    "src/routes/memory-context-runtime.ts",
    "src/routes/memory-recall.ts",
  ];
  const forbiddenTokens = [
    ".withTx(",
    ".withClient(",
    "applyMemoryWrite",
    "prepareMemoryWrite",
    "commitLitePreparedWrite",
    "writeAccessForClient",
    ".insert",
    ".update",
    ".delete",
  ];
  const offenders = orchestratorRouteFiles
    .flatMap((file) => {
      const text = read(file);
      return forbiddenTokens
        .filter((token) => text.includes(token))
        .map((token) => `${file}: ${token}`);
    })
    .sort();

  assert.deepEqual(
    offenders,
    [],
    "Recall/context routes must orchestrate read/context services, not mutate persistence or run write paths directly.",
  );
});

test("orchestrator modules avoid trust producer and learning-loop imports", () => {
  const orchestratorFiles = [
    "src/memory/context-orchestrator.ts",
    "src/memory/action-retrieval.ts",
    "src/memory/experience-intelligence.ts",
    "src/memory/recall-action-packet.ts",
    "src/app/planning-summary.ts",
    "src/app/planning-summary-assembly.ts",
    "src/app/planning-summary-execution.ts",
    "src/app/planning-summary-forgetting.ts",
    "src/app/planning-summary-planner.ts",
    "src/app/planning-summary-routing.ts",
    "src/app/planning-summary-surfaces.ts",
  ];
  const forbiddenImportFragments = [
    "./authority-gate.js",
    "./execution-evidence.js",
    "./form-pattern-governance",
    "./policy-memory.js",
    "./replay-learning",
    "./replay-write.js",
    "./tools-feedback.js",
    "./workflow-write-projection.js",
    "../memory/authority-gate.js",
    "../memory/execution-evidence.js",
    "../memory/form-pattern-governance",
    "../memory/policy-memory.js",
    "../memory/replay-learning",
    "../memory/replay-write.js",
    "../memory/tools-feedback.js",
    "../memory/workflow-write-projection.js",
  ];
  const offenders = orchestratorFiles
    .flatMap((file) => {
      const imports = read(file).split("\n").filter((line) => /^\s*import\b/.test(line));
      return imports
        .filter((line) => forbiddenImportFragments.some((fragment) => line.includes(fragment)))
        .map((line) => `${file}: ${line.trim()}`);
    })
    .sort();

  assert.deepEqual(
    offenders,
    [],
    "Orchestrator modules may consume canonical packets/contracts, but must not import trust producers or learning writers.",
  );
});

test("recall action packet reads lifecycle details through node execution surface", () => {
  const text = read("src/memory/recall-action-packet.ts");
  for (const token of [
    "node.slots?.semantic_forgetting_v1",
    "node.slots?.archive_relocation_v1",
    "node.slots?.lifecycle_state",
  ]) {
    assert.equal(text.includes(token), false, `recall-action-packet must not read ${token} directly`);
  }
  for (const token of [
    "resolveNodeSemanticForgettingSurface",
    "resolveNodeArchiveRelocationSurface",
    "resolveNodeLifecycleState",
  ]) {
    assertContains(text, token, `recall-action-packet must use ${token}`);
  }
});

test("experience intelligence delegates policy materialization to the shared policy surface", () => {
  const text = read("src/memory/experience-intelligence.ts");
  assert.equal(
    text.includes("./execution-evidence.js"),
    false,
    "experience-intelligence must not import execution evidence internals directly",
  );
  assertContains(
    text,
    "buildPolicyMaterializationSurface",
    "experience-intelligence must delegate policy contract materialization to the shared policy surface",
  );

  const policyMaterialization = read("src/memory/policy-materialization-surface.ts");
  assert.equal(
    policyMaterialization.includes("./execution-evidence.js"),
    false,
    "policy materialization must not import execution evidence internals directly",
  );
  assertContains(
    policyMaterialization,
    "resolveNodeExecutionEvidence",
    "policy materialization must consume execution evidence through the canonical node execution surface",
  );
});

test("learning loop modules do not import orchestrator response builders", () => {
  const learningLoopFiles = [
    "src/memory/replay-learning.ts",
    "src/memory/replay-learning-artifacts.ts",
    "src/memory/replay-stable-anchor-helpers.ts",
    "src/memory/tools-feedback.ts",
    "src/memory/tools-pattern-anchor.ts",
    "src/memory/policy-memory.ts",
    "src/memory/pattern-trust-shaping.ts",
    "src/memory/semantic-forgetting.ts",
    "src/memory/lifecycle-lite.ts",
    "src/memory/workflow-write-projection.ts",
  ];
  const forbiddenImportFragments = [
    "./experience-intelligence.js",
    "./context-orchestrator.js",
    "./recall-action-packet.js",
    "../app/planning-summary",
    "../memory/experience-intelligence.js",
    "../memory/context-orchestrator.js",
    "../memory/recall-action-packet.js",
  ];
  const offenders = learningLoopFiles
    .flatMap((file) => {
      const imports = read(file).split("\n").filter((line) => /^\s*import\b/.test(line));
      return imports
        .filter((line) => forbiddenImportFragments.some((fragment) => line.includes(fragment)))
        .map((line) => `${file}: ${line.trim()}`);
    })
    .sort();

  assert.deepEqual(
    offenders,
    [],
    "Learning Loop modules may learn from canonical contracts, gates, and write surfaces, but must not call Orchestrator response builders directly.",
  );

  const toolsFeedback = read("src/memory/tools-feedback.ts");
  assert.equal(
    toolsFeedback.includes("buildExperienceIntelligenceResponse"),
    false,
    "tools-feedback must materialize policy memory through a shared policy surface instead of calling experience-intelligence.",
  );
  assertContains(
    toolsFeedback,
    "buildPolicyMaterializationSurface",
    "tools-feedback must use the shared policy materialization surface for feedback-driven policy memory.",
  );
});

test("host route registration keeps Runtime route dependency slices explicit", () => {
  const text = read("src/host/http-host.ts");
  for (const token of [
    "type RuntimeStoreCapability =",
    "type RuntimeLiteWriteStore =",
    "type RuntimeLiteRecallAccess =",
    "type RuntimeSandboxExecutor =",
    "type RuntimeWriteRouteRegistrationArgs = Pick<",
    "type RuntimeRecallRouteRegistrationArgs = Pick<",
    "type RuntimeReplayAndAutomationRouteRegistrationArgs = Pick<",
    "type RuntimeSandboxRouteRegistrationArgs = Pick<",
    "function registerRuntimeWriteRoutes(args: RuntimeWriteRouteRegistrationArgs)",
    "function registerRuntimeRecallRoutes(args: RuntimeRecallRouteRegistrationArgs)",
    "function registerRuntimeReplayAndAutomationRoutes(args: RuntimeReplayAndAutomationRouteRegistrationArgs)",
    "function registerRuntimeSandboxRoutes(args: RuntimeSandboxRouteRegistrationArgs)",
  ]) {
    assertContains(text, token, `http-host must preserve segmented Runtime route boundary ${token}`);
  }

  for (const token of [
    "function registerMemoryRoutes(args: RegisterApplicationRoutesArgs)",
    "function registerRuntimeKernelRoutes(args: RegisterApplicationRoutesArgs)",
    "db: any;",
    "recallAccessForClient: (client: any) => any;",
  ]) {
    assert.equal(
      text.includes(token),
      false,
      `http-host must not widen Runtime route registration through ${token}`,
    );
  }

  const registerArgsMatch = /export type RegisterApplicationRoutesArgs = \{([\s\S]*?)\n\};/.exec(text);
  assert.ok(registerArgsMatch, "http-host must expose a single typed RegisterApplicationRoutesArgs contract");
  const registerArgsBody = registerArgsMatch[1] ?? "";
  assert.equal(
    /\bany\b/.test(registerArgsBody),
    false,
    "RegisterApplicationRoutesArgs must depend on typed route capabilities instead of widening to bare any.",
  );
});

test("automation replay bridge keeps replay options and results typed", () => {
  for (const file of [
    "src/routes/automations.ts",
    "src/memory/automation-lite.ts",
  ]) {
    assert.equal(
      /\bany\b/.test(read(file)),
      false,
      `${file} must use typed replay capabilities or unknown, not bare any, across automation execution boundaries.`,
    );
  }
});

test("runtime services expose typed access factories", () => {
  const text = read("src/app/runtime-services.ts");
  for (const token of [
    'import type pg from "pg";',
    "type RecallStoreAccess",
    "type WriteStoreAccess",
    'import type { ReplayStoreAccess } from "../store/replay-access.js";',
    "const recallAccessForClient = (_client: pg.PoolClient): RecallStoreAccess | null => liteRecallAccess;",
    "const writeAccessForClient = (_client: pg.PoolClient): WriteStoreAccess => liteWriteStore;",
    "const replayAccessForClient = (_client: pg.PoolClient): ReplayStoreAccess | null => liteReplayAccess;",
  ]) {
    assertContains(text, token, `runtime-services must preserve typed service access boundary ${token}`);
  }
  assert.equal(
    /\bany\b/.test(text),
    false,
    "runtime-services must not widen service access factories through bare any.",
  );
});

test("route write projection paths keep prepared writes typed", () => {
  for (const file of [
    "src/routes/handoff.ts",
    "src/routes/memory-write.ts",
    "src/routes/lite-projected-write.ts",
  ]) {
    assert.equal(
      /\bas\s+any\b/.test(read(file)),
      false,
      `${file} must keep Lite write projection boundaries typed without untyped casts.`,
    );
  }
});

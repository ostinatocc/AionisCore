import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

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
  const allowedRuntimeAuthorityGateUsers = new Set([
    "src/memory/authority-gate.ts",
    "src/memory/policy-memory.ts",
    "src/memory/replay-learning-artifacts.ts",
    "src/memory/replay-stable-anchor-helpers.ts",
    "src/memory/workflow-write-projection.ts",
  ]);
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
  const allowedOutcomeGateUsers = new Set([
    "src/memory/action-retrieval.ts",
    "src/memory/authority-gate.ts",
    "src/memory/contract-trust.ts",
    "src/memory/execution-introspection.ts",
    "src/memory/replay-learning-artifacts.ts",
    "src/memory/workflow-promotion-governance.ts",
    "src/memory/workflow-write-projection.ts",
  ]);
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

  const allowedExecutionEvidenceUsers = new Set([
    "src/memory/authority-gate.ts",
    "src/memory/execution-evidence.ts",
  ]);
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

test("stable workflow producers require runtime authority gate checks", () => {
  const requiredProducerGuards = new Map<string, string[]>([
    [
      "src/memory/workflow-write-projection.ts",
      [
        "buildRuntimeAuthorityGate",
        "authorityGate.allows_authoritative",
        "authorityGate.allows_stable_promotion",
      ],
    ],
    [
      "src/memory/replay-learning-artifacts.ts",
      [
        "buildRuntimeAuthorityGate",
        "authorityGate.allows_authoritative",
        "authorityGate.allows_stable_promotion",
      ],
    ],
    [
      "src/memory/replay-stable-anchor-helpers.ts",
      [
        "buildRuntimeAuthorityGate",
        "authority.authorityGate.allows_stable_promotion",
      ],
    ],
    [
      "src/memory/policy-memory.ts",
      [
        "buildRuntimeAuthorityGate",
        "authority.authorityGate.allows_authoritative",
      ],
    ],
  ]);

  for (const [file, tokens] of requiredProducerGuards) {
    const text = read(file);
    for (const token of tokens) {
      assertContains(text, token, `${file} must keep stable/authoritative producer behavior gate-backed by ${token}`);
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

test("experience intelligence consumes execution evidence through node execution surface", () => {
  const text = read("src/memory/experience-intelligence.ts");
  assert.equal(
    text.includes("./execution-evidence.js"),
    false,
    "experience-intelligence must not import execution evidence internals directly",
  );
  assertContains(
    text,
    "resolveNodeExecutionEvidence",
    "experience-intelligence must consume execution evidence through the canonical node execution surface",
  );
});

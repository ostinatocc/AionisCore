import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SRC = path.join(ROOT, "src");

const LEGACY_EXECUTION_SLOT_PATTERN =
  /\b(?:execution_native_v1|anchor_v1|parseNodeExecutionNative|parseNodeAnchor)\b/;

const LEGACY_SCHEMA_BOUNDARIES = [
  "src/memory/schemas.ts",
];

const LEGACY_CONTRACT_RESOLVER_BOUNDARIES = [
  "src/memory/execution-contract.ts",
  "src/memory/node-execution-surface.ts",
];

const LEGACY_WRITE_PROJECTION_BOUNDARIES = [
  "src/memory/policy-memory.ts",
  "src/memory/replay-learning-artifacts.ts",
  "src/memory/replay-stable-anchor-helpers.ts",
  "src/memory/tools-pattern-anchor.ts",
  "src/memory/workflow-write-projection.ts",
  "src/memory/write-distillation.ts",
  "src/memory/write-execution-native.ts",
];

const LEGACY_ARCHIVE_REHYDRATE_BOUNDARIES = [
  "src/memory/archive-relocation.ts",
  "src/memory/rehydrate-anchor.ts",
];

const LEGACY_STORE_ADAPTER_BOUNDARIES = [
  "src/store/embedded-memory-runtime.ts",
  "src/store/lite-recall-store.ts",
  "src/store/lite-write-store.ts",
  "src/store/recall-access.ts",
];

const ALLOWED_DIRECT_LEGACY_SLOT_BOUNDARIES = new Set([
  ...LEGACY_SCHEMA_BOUNDARIES,
  ...LEGACY_CONTRACT_RESOLVER_BOUNDARIES,
  ...LEGACY_WRITE_PROJECTION_BOUNDARIES,
  ...LEGACY_ARCHIVE_REHYDRATE_BOUNDARIES,
  ...LEGACY_STORE_ADAPTER_BOUNDARIES,
]);

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

test("legacy execution slots stay constrained to boundary modules", () => {
  const offenders = listTypeScriptFiles(SRC)
    .map((filePath) => ({
      file: toRepoRelative(filePath),
      text: fs.readFileSync(filePath, "utf8"),
    }))
    .filter((entry) => LEGACY_EXECUTION_SLOT_PATTERN.test(entry.text))
    .filter((entry) => !ALLOWED_DIRECT_LEGACY_SLOT_BOUNDARIES.has(entry.file))
    .map((entry) => entry.file)
    .sort();

  assert.deepEqual(
    offenders,
    [],
    [
      "Runtime consumers must not directly read anchor_v1/execution_native_v1.",
      "Use node-execution-surface or execution-contract resolvers instead.",
      `Allowed boundaries: ${[...ALLOWED_DIRECT_LEGACY_SLOT_BOUNDARIES].sort().join(", ")}`,
    ].join("\n"),
  );
});

test("legacy execution slot allowlist only contains files that still exist", () => {
  const missing = [...ALLOWED_DIRECT_LEGACY_SLOT_BOUNDARIES]
    .filter((file) => !fs.existsSync(path.join(ROOT, file)))
    .sort();

  assert.deepEqual(missing, []);
});

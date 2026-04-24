import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SRC = path.join(ROOT, "src");

const LEGACY_EXECUTION_SURFACE_PATTERN =
  /\b(?:execution_native_v1|anchor_v1|parseNodeExecutionNative|parseNodeAnchor)\b/;

const ALLOWED_LEGACY_BOUNDARIES = new Set([
  "src/memory/archive-relocation.ts",
  "src/memory/execution-contract.ts",
  "src/memory/node-execution-surface.ts",
  "src/memory/policy-memory.ts",
  "src/memory/rehydrate-anchor.ts",
  "src/memory/replay-learning.ts",
  "src/memory/replay-learning-artifacts.ts",
  "src/memory/replay-stable-anchor-helpers.ts",
  "src/memory/schemas.ts",
  "src/memory/tools-pattern-anchor.ts",
  "src/memory/workflow-write-projection.ts",
  "src/memory/write-distillation.ts",
  "src/memory/write-execution-native.ts",
  "src/store/embedded-memory-runtime.ts",
  "src/store/lite-recall-store.ts",
  "src/store/lite-write-store.ts",
  "src/store/recall-access.ts",
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
    .filter((entry) => LEGACY_EXECUTION_SURFACE_PATTERN.test(entry.text))
    .filter((entry) => !ALLOWED_LEGACY_BOUNDARIES.has(entry.file))
    .map((entry) => entry.file)
    .sort();

  assert.deepEqual(
    offenders,
    [],
    [
      "Runtime consumers must not directly read anchor_v1/execution_native_v1.",
      "Use node-execution-surface or execution-contract resolvers instead.",
      `Allowed boundaries: ${[...ALLOWED_LEGACY_BOUNDARIES].sort().join(", ")}`,
    ].join("\n"),
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { RUNTIME_LEGACY_EXECUTION_SLOT_NAMES } from "../../src/memory/legacy-access-registry.ts";
import {
  runtimeBoundaryInventoryLegacyAccessEntries,
  runtimeBoundaryInventoryLegacyFiles,
  runtimeBoundaryInventoryLegacyFilesByKind,
} from "../../src/memory/runtime-boundary-inventory.ts";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SRC = path.join(ROOT, "src");

const LEGACY_EXECUTION_SLOT_PATTERN =
  new RegExp(`\\b(?:${RUNTIME_LEGACY_EXECUTION_SLOT_NAMES.join("|")})\\b`);

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

test("legacy access inventory declares unique existing boundary files", () => {
  const legacyEntries = runtimeBoundaryInventoryLegacyAccessEntries();
  assert.ok(legacyEntries.length > 0, "legacy access inventory must not be empty");
  const ids = legacyEntries.map((entry) => entry.source_id);
  assert.equal(new Set(ids).size, ids.length, "legacy access inventory ids must be unique");

  const files = legacyEntries.map((entry) => entry.file);
  assert.equal(new Set(files).size, files.length, "legacy access inventory files must be unique");
  for (const entry of legacyEntries) {
    assert.ok(entry.file.startsWith("src/"), `${entry.source_id} must point at a Runtime source file`);
    assert.ok(fs.existsSync(path.join(ROOT, entry.file)), `${entry.source_id} must point at an existing source file`);
    assert.ok(entry.reason.trim().length > 0, `${entry.source_id} must explain why direct legacy access is allowed`);
  }

  for (const kind of ["manifest", "schema", "contract_resolver", "write_projection", "archive_rehydrate", "store_adapter"] as const) {
    assert.ok(runtimeBoundaryInventoryLegacyFilesByKind(kind).length > 0, `legacy access inventory must declare ${kind} boundaries`);
  }
});

test("legacy execution slots stay constrained to boundary modules", () => {
  const allowedDirectLegacySlotBoundaries = new Set(runtimeBoundaryInventoryLegacyFiles());
  const offenders = listTypeScriptFiles(SRC)
    .map((filePath) => ({
      file: toRepoRelative(filePath),
      text: fs.readFileSync(filePath, "utf8"),
    }))
    .filter((entry) => LEGACY_EXECUTION_SLOT_PATTERN.test(entry.text))
    .filter((entry) => !allowedDirectLegacySlotBoundaries.has(entry.file))
    .map((entry) => entry.file)
    .sort();

  assert.deepEqual(
    offenders,
    [],
    [
      "Runtime consumers must not directly read anchor_v1/execution_native_v1.",
      "Use node-execution-surface or execution-contract resolvers instead.",
      `Allowed boundaries: ${[...allowedDirectLegacySlotBoundaries].sort().join(", ")}`,
    ].join("\n"),
  );
});

test("legacy execution slot allowlist only contains files that still exist", () => {
  const missing = runtimeBoundaryInventoryLegacyFiles()
    .filter((file) => !fs.existsSync(path.join(ROOT, file)))
    .sort();

  assert.deepEqual(missing, []);
});

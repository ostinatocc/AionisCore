import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { RUNTIME_AUTHORITY_BOUNDARY_REGISTRY } from "../../src/memory/authority-producer-registry.ts";
import { RUNTIME_LEGACY_ACCESS_BOUNDARY_REGISTRY } from "../../src/memory/legacy-access-registry.ts";
import {
  RUNTIME_BOUNDARY_INVENTORY,
  RuntimeBoundaryInventoryResponseSchema,
  buildRuntimeBoundaryInventoryResponse,
  runtimeBoundaryInventoryAuthorityFilesByCapability,
  runtimeBoundaryInventoryAuthorityProducerEntries,
  runtimeBoundaryInventoryEntriesByFile,
  runtimeBoundaryInventoryEntriesBySource,
  runtimeBoundaryInventoryFiles,
  runtimeBoundaryInventoryLegacyFiles,
  runtimeBoundaryInventoryLegacyFilesByKind,
  runtimeBoundaryInventorySummary,
} from "../../src/memory/runtime-boundary-inventory.ts";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

function sourceIds(source: "authority" | "legacy_access"): string[] {
  return runtimeBoundaryInventoryEntriesBySource(source)
    .map((entry) => entry.source_id)
    .sort();
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

test("runtime boundary inventory aggregates the declared boundary registries without drift", () => {
  assert.equal(
    RUNTIME_BOUNDARY_INVENTORY.length,
    RUNTIME_AUTHORITY_BOUNDARY_REGISTRY.length + RUNTIME_LEGACY_ACCESS_BOUNDARY_REGISTRY.length,
    "inventory must contain every authority and legacy boundary declaration",
  );

  assert.deepEqual(
    sourceIds("authority"),
    RUNTIME_AUTHORITY_BOUNDARY_REGISTRY.map((entry) => entry.id).sort(),
    "inventory authority source ids must match authority registry ids",
  );
  assert.deepEqual(
    sourceIds("legacy_access"),
    RUNTIME_LEGACY_ACCESS_BOUNDARY_REGISTRY.map((entry) => entry.id).sort(),
    "inventory legacy source ids must match legacy registry ids",
  );
});

test("runtime boundary inventory entries are unique and point at existing source files", () => {
  const inventoryIds = RUNTIME_BOUNDARY_INVENTORY.map((entry) => entry.inventory_id);
  assert.equal(new Set(inventoryIds).size, inventoryIds.length, "inventory ids must be unique");

  for (const entry of RUNTIME_BOUNDARY_INVENTORY) {
    assert.ok(entry.file.startsWith("src/"), `${entry.inventory_id} must point at a Runtime source file`);
    assert.ok(fs.existsSync(path.join(ROOT, entry.file)), `${entry.inventory_id} must point at an existing file`);
    assert.ok(
      runtimeBoundaryInventoryEntriesByFile(entry.file).length > 0,
      `${entry.file} must be discoverable through file lookup`,
    );
  }
});

test("runtime boundary inventory exposes cross-cutting boundary files and summary counts", () => {
  const summary = runtimeBoundaryInventorySummary();
  assert.equal(summary.total_entries, RUNTIME_BOUNDARY_INVENTORY.length);
  assert.equal(summary.authority_entries, RUNTIME_AUTHORITY_BOUNDARY_REGISTRY.length);
  assert.equal(summary.legacy_access_entries, RUNTIME_LEGACY_ACCESS_BOUNDARY_REGISTRY.length);
  assert.equal(summary.total_files, runtimeBoundaryInventoryFiles().length);
  assert.ok(summary.authority_producer_entries > 0, "inventory must expose authority producer count");
  assert.ok(summary.legacy_direct_access_files > 0, "inventory must expose legacy direct-access file count");

  const files = runtimeBoundaryInventoryFiles();
  for (const file of [
    "src/memory/authority-producer-registry.ts",
    "src/memory/legacy-access-registry.ts",
    "src/memory/workflow-write-projection.ts",
    "src/store/lite-write-store.ts",
  ]) {
    assert.ok(files.includes(file), `inventory must include ${file}`);
  }
});

test("runtime boundary inventory keeps authority capabilities and legacy reasons visible", () => {
  const workflowProducer = RUNTIME_BOUNDARY_INVENTORY.find(
    (entry) => entry.source === "authority" && entry.source_id === "workflow_write_projection",
  );
  assert.equal(workflowProducer?.source, "authority");
  if (workflowProducer?.source === "authority") {
    assert.equal(workflowProducer.role, "authority_producer");
    assert.equal(workflowProducer.capabilities.may_use_runtime_authority_gate, true);
    assert.equal(workflowProducer.capabilities.may_use_stable_workflow_literal, true);
    assert.ok(workflowProducer.required_source_markers.includes("authorityGate.allows_stable_promotion"));
  }

  const actionRetrieval = RUNTIME_BOUNDARY_INVENTORY.find(
    (entry) => entry.source === "authority" && entry.source_id === "action_retrieval_outcome_gate",
  );
  assert.equal(actionRetrieval?.source, "authority");
  if (actionRetrieval?.source === "authority") {
    assert.equal(actionRetrieval.role, "authority_consumer");
    assert.ok(
      actionRetrieval.authority_rules.includes("candidate_workflow_reuse_is_inspect_or_rehydrate_only"),
      "action retrieval must publish the candidate workflow reuse boundary",
    );
    assert.ok(
      actionRetrieval.authority_rules.includes("candidate_workflow_must_not_emit_stable_workflow_tool_source"),
      "action retrieval must publish the stable tool-source boundary",
    );
  }

  const policyMaterialization = RUNTIME_BOUNDARY_INVENTORY.find(
    (entry) => entry.source === "authority" && entry.source_id === "policy_materialization_surface",
  );
  assert.equal(policyMaterialization?.source, "authority");
  if (policyMaterialization?.source === "authority") {
    assert.equal(policyMaterialization.role, "authority_consumer");
    assert.ok(
      policyMaterialization.authority_rules.includes("trusted_pattern_only_guidance_is_advisory_candidate"),
      "policy materialization must expose the trusted-pattern-only advisory boundary",
    );
    assert.ok(
      policyMaterialization.authority_rules.includes("policy_default_requires_stable_workflow_or_live_authoritative_execution_contract"),
      "policy materialization must expose the default-policy authority boundary",
    );
  }

  const authorityDecisionReporting = RUNTIME_BOUNDARY_INVENTORY.find(
    (entry) => entry.source === "authority" && entry.source_id === "authority_decision_reporting",
  );
  assert.equal(authorityDecisionReporting?.source, "authority");
  if (authorityDecisionReporting?.source === "authority") {
    assert.equal(authorityDecisionReporting.role, "read_side_summary");
    assert.ok(
      authorityDecisionReporting.authority_rules.includes("authority_decision_reporting_must_not_grant_runtime_authority"),
      "authority decision reporting must publish its read-only authority boundary",
    );
    assert.ok(
      authorityDecisionReporting.required_source_markers.includes("runtime_authority_decision_report_v1"),
      "authority decision reporting must publish its report contract marker",
    );
  }

  const legacyResolver = RUNTIME_BOUNDARY_INVENTORY.find(
    (entry) => entry.source === "legacy_access" && entry.source_id === "node_execution_surface",
  );
  assert.equal(legacyResolver?.source, "legacy_access");
  if (legacyResolver?.source === "legacy_access") {
    assert.equal(legacyResolver.legacy_access_kind, "contract_resolver");
    assert.ok(legacyResolver.reason.includes("resolver"));
  }
});

test("runtime boundary inventory exposes selector helpers for CI boundary consumers", () => {
  const authorityEntries = runtimeBoundaryInventoryEntriesBySource("authority");
  const legacyEntries = runtimeBoundaryInventoryEntriesBySource("legacy_access");

  assert.deepEqual(
    runtimeBoundaryInventoryAuthorityProducerEntries().map((entry) => entry.source_id).sort(),
    authorityEntries
      .filter((entry) => entry.role === "authority_producer" || entry.role === "advisory_pattern_producer")
      .map((entry) => entry.source_id)
      .sort(),
    "authority producer helper must derive from inventory entries",
  );
  assert.deepEqual(
    runtimeBoundaryInventoryAuthorityFilesByCapability("may_use_runtime_authority_gate"),
    uniqueSorted(
      authorityEntries
        .filter((entry) => entry.capabilities.may_use_runtime_authority_gate)
        .map((entry) => entry.file),
    ),
    "authority capability helper must derive file allowlists from inventory entries",
  );
  assert.deepEqual(
    runtimeBoundaryInventoryLegacyFiles(),
    uniqueSorted(legacyEntries.map((entry) => entry.file)),
    "legacy boundary file helper must derive from inventory entries",
  );
  assert.deepEqual(
    runtimeBoundaryInventoryLegacyFilesByKind("contract_resolver"),
    uniqueSorted(
      legacyEntries
        .filter((entry) => entry.legacy_access_kind === "contract_resolver")
        .map((entry) => entry.file),
    ),
    "legacy kind helper must derive file allowlists from inventory entries",
  );
});

test("runtime boundary inventory response contract rejects passthrough fields", () => {
  const response = RuntimeBoundaryInventoryResponseSchema.parse(buildRuntimeBoundaryInventoryResponse());
  const firstEntry = response.entries[0];
  assert.ok(firstEntry, "inventory response must contain at least one entry");

  assert.throws(
    () =>
      RuntimeBoundaryInventoryResponseSchema.parse({
        ...response,
        debug_blob: true,
      }),
    /Unrecognized key/,
  );
  assert.throws(
    () =>
      RuntimeBoundaryInventoryResponseSchema.parse({
        ...response,
        surface_semantics: {
          ...response.surface_semantics,
          debug_mode: "loose",
        },
      }),
    /Unrecognized key/,
  );
  assert.throws(
    () =>
      RuntimeBoundaryInventoryResponseSchema.parse({
        ...response,
        entries: [
          {
            ...firstEntry,
            unexpected_field: "not-public-contract",
          },
        ],
      }),
    /Unrecognized key/,
  );
});

import {
  RUNTIME_AUTHORITY_BOUNDARY_REGISTRY,
  type RuntimeAuthorityBoundaryDeclaration,
} from "./authority-producer-registry.js";
import {
  RUNTIME_LEGACY_ACCESS_BOUNDARY_REGISTRY,
  type RuntimeLegacyAccessBoundaryDeclaration,
} from "./legacy-access-registry.js";

export type RuntimeBoundaryInventorySource = "authority" | "legacy_access";

export type RuntimeBoundaryInventoryEntry =
  | {
      source: "authority";
      inventory_id: string;
      source_id: string;
      file: string;
      layer: RuntimeAuthorityBoundaryDeclaration["layer"];
      role: RuntimeAuthorityBoundaryDeclaration["role"];
      producer_kind: RuntimeAuthorityBoundaryDeclaration["producerKind"] | null;
      capabilities: {
        may_use_runtime_authority_gate: boolean;
        may_use_outcome_contract_gate: boolean;
        may_assess_execution_evidence: boolean;
        may_read_raw_authority_surface: boolean;
        may_use_stable_workflow_literal: boolean;
        may_use_stable_pattern_literal: boolean;
      };
      required_source_markers: readonly string[];
    }
  | {
      source: "legacy_access";
      inventory_id: string;
      source_id: string;
      file: string;
      legacy_access_kind: RuntimeLegacyAccessBoundaryDeclaration["kind"];
      reason: string;
    };

export type RuntimeBoundaryInventoryResponse = {
  surface_version: "runtime_boundary_inventory_response_v1";
  inventory_source: "source_boundary_manifests";
  surface_semantics: {
    read_only: true;
    persistence_effect: "none";
    authority_effect: "none";
    runtime_decision_effect: "none";
    intended_use: "operator_debug_boundary_audit";
  };
  summary: ReturnType<typeof runtimeBoundaryInventorySummary>;
  files: string[];
  entries: RuntimeBoundaryInventoryEntry[];
  sources: {
    authority: RuntimeBoundaryInventoryEntry[];
    legacy_access: RuntimeBoundaryInventoryEntry[];
  };
};

function authorityInventoryEntry(entry: RuntimeAuthorityBoundaryDeclaration): RuntimeBoundaryInventoryEntry {
  return {
    source: "authority",
    inventory_id: `authority:${entry.id}`,
    source_id: entry.id,
    file: entry.file,
    layer: entry.layer,
    role: entry.role,
    producer_kind: entry.producerKind ?? null,
    capabilities: {
      may_use_runtime_authority_gate: entry.mayUseRuntimeAuthorityGate === true,
      may_use_outcome_contract_gate: entry.mayUseOutcomeContractGate === true,
      may_assess_execution_evidence: entry.mayAssessExecutionEvidence === true,
      may_read_raw_authority_surface: entry.mayReadRawAuthoritySurface === true,
      may_use_stable_workflow_literal: entry.mayUseStableWorkflowLiteral === true,
      may_use_stable_pattern_literal: entry.mayUseStablePatternLiteral === true,
    },
    required_source_markers: entry.requiredSourceMarkers ?? [],
  };
}

function legacyAccessInventoryEntry(entry: RuntimeLegacyAccessBoundaryDeclaration): RuntimeBoundaryInventoryEntry {
  return {
    source: "legacy_access",
    inventory_id: `legacy_access:${entry.id}`,
    source_id: entry.id,
    file: entry.file,
    legacy_access_kind: entry.kind,
    reason: entry.reason,
  };
}

function cloneInventoryEntry(entry: RuntimeBoundaryInventoryEntry): RuntimeBoundaryInventoryEntry {
  if (entry.source === "authority") {
    return {
      ...entry,
      capabilities: { ...entry.capabilities },
      required_source_markers: [...entry.required_source_markers],
    };
  }
  return { ...entry };
}

export const RUNTIME_BOUNDARY_INVENTORY: readonly RuntimeBoundaryInventoryEntry[] = [
  ...RUNTIME_AUTHORITY_BOUNDARY_REGISTRY.map(authorityInventoryEntry),
  ...RUNTIME_LEGACY_ACCESS_BOUNDARY_REGISTRY.map(legacyAccessInventoryEntry),
];

export function runtimeBoundaryInventoryEntries(): RuntimeBoundaryInventoryEntry[] {
  return RUNTIME_BOUNDARY_INVENTORY.map(cloneInventoryEntry);
}

export function runtimeBoundaryInventoryEntriesBySource(
  source: RuntimeBoundaryInventorySource,
): RuntimeBoundaryInventoryEntry[] {
  return RUNTIME_BOUNDARY_INVENTORY
    .filter((entry) => entry.source === source)
    .map(cloneInventoryEntry);
}

export function runtimeBoundaryInventoryFiles(): string[] {
  return Array.from(new Set(RUNTIME_BOUNDARY_INVENTORY.map((entry) => entry.file))).sort();
}

export function runtimeBoundaryInventoryEntriesByFile(file: string): RuntimeBoundaryInventoryEntry[] {
  return RUNTIME_BOUNDARY_INVENTORY
    .filter((entry) => entry.file === file)
    .map(cloneInventoryEntry);
}

export function runtimeBoundaryInventorySummary(): {
  total_entries: number;
  total_files: number;
  authority_entries: number;
  legacy_access_entries: number;
  authority_producer_entries: number;
  legacy_direct_access_files: number;
} {
  const authorityEntries = runtimeBoundaryInventoryEntriesBySource("authority");
  const legacyAccessEntries = runtimeBoundaryInventoryEntriesBySource("legacy_access");
  return {
    total_entries: RUNTIME_BOUNDARY_INVENTORY.length,
    total_files: runtimeBoundaryInventoryFiles().length,
    authority_entries: authorityEntries.length,
    legacy_access_entries: legacyAccessEntries.length,
    authority_producer_entries: authorityEntries.filter((entry) =>
      entry.source === "authority"
      && (entry.role === "authority_producer" || entry.role === "advisory_pattern_producer")
    ).length,
    legacy_direct_access_files: new Set(legacyAccessEntries.map((entry) => entry.file)).size,
  };
}

export function buildRuntimeBoundaryInventoryResponse(): RuntimeBoundaryInventoryResponse {
  const authorityEntries = runtimeBoundaryInventoryEntriesBySource("authority");
  const legacyAccessEntries = runtimeBoundaryInventoryEntriesBySource("legacy_access");
  return {
    surface_version: "runtime_boundary_inventory_response_v1",
    inventory_source: "source_boundary_manifests",
    surface_semantics: {
      read_only: true,
      persistence_effect: "none",
      authority_effect: "none",
      runtime_decision_effect: "none",
      intended_use: "operator_debug_boundary_audit",
    },
    summary: runtimeBoundaryInventorySummary(),
    files: runtimeBoundaryInventoryFiles(),
    entries: [...authorityEntries, ...legacyAccessEntries],
    sources: {
      authority: authorityEntries,
      legacy_access: legacyAccessEntries,
    },
  };
}

export const RUNTIME_LEGACY_EXECUTION_SLOT_NAMES = [
  "execution_native_v1",
  "anchor_v1",
  "parseNodeExecutionNative",
  "parseNodeAnchor",
] as const;

export type RuntimeLegacyAccessBoundaryKind =
  | "manifest"
  | "schema"
  | "contract_resolver"
  | "write_projection"
  | "archive_rehydrate"
  | "store_adapter";

export type RuntimeLegacyAccessBoundaryDeclaration = {
  id: string;
  file: string;
  kind: RuntimeLegacyAccessBoundaryKind;
  reason: string;
};

export const RUNTIME_LEGACY_ACCESS_BOUNDARY_REGISTRY = [
  {
    id: "legacy_access_manifest",
    file: "src/memory/legacy-access-registry.ts",
    kind: "manifest",
    reason: "declares legacy execution slot boundary metadata for CI and documentation",
  },
  {
    id: "memory_schemas",
    file: "src/memory/schemas.ts",
    kind: "schema",
    reason: "defines legacy-compatible persisted slot schemas",
  },
  {
    id: "execution_contract_compiler",
    file: "src/memory/execution-contract.ts",
    kind: "contract_resolver",
    reason: "compiles legacy persisted slots into canonical execution contracts",
  },
  {
    id: "node_execution_surface",
    file: "src/memory/node-execution-surface.ts",
    kind: "contract_resolver",
    reason: "central resolver surface for legacy execution slots",
  },
  {
    id: "policy_memory_writer",
    file: "src/memory/policy-memory.ts",
    kind: "write_projection",
    reason: "writes policy memory with compatibility execution-native payloads",
  },
  {
    id: "replay_learning_artifacts_writer",
    file: "src/memory/replay-learning-artifacts.ts",
    kind: "write_projection",
    reason: "writes replay-learned workflow anchors and execution-native payloads",
  },
  {
    id: "replay_stable_anchor_writer",
    file: "src/memory/replay-stable-anchor-helpers.ts",
    kind: "write_projection",
    reason: "normalizes replay playbooks into workflow anchors",
  },
  {
    id: "tools_pattern_anchor_writer",
    file: "src/memory/tools-pattern-anchor.ts",
    kind: "write_projection",
    reason: "writes trusted pattern anchors and compatibility execution-native payloads",
  },
  {
    id: "workflow_write_projection_writer",
    file: "src/memory/workflow-write-projection.ts",
    kind: "write_projection",
    reason: "projects execution continuity into workflow candidates and anchors",
  },
  {
    id: "write_distillation_writer",
    file: "src/memory/write-distillation.ts",
    kind: "write_projection",
    reason: "writes distilled execution-native summaries",
  },
  {
    id: "write_execution_native_writer",
    file: "src/memory/write-execution-native.ts",
    kind: "write_projection",
    reason: "normalizes writes into execution-native compatibility slots",
  },
  {
    id: "archive_relocation",
    file: "src/memory/archive-relocation.ts",
    kind: "archive_rehydrate",
    reason: "reads legacy anchor payloads for archive relocation plans",
  },
  {
    id: "rehydrate_anchor",
    file: "src/memory/rehydrate-anchor.ts",
    kind: "archive_rehydrate",
    reason: "rehydrates persisted anchor payloads through the explicit anchor boundary",
  },
  {
    id: "embedded_memory_runtime_store",
    file: "src/store/embedded-memory-runtime.ts",
    kind: "store_adapter",
    reason: "translates persisted legacy rows into store query surfaces",
  },
  {
    id: "lite_recall_store",
    file: "src/store/lite-recall-store.ts",
    kind: "store_adapter",
    reason: "indexes persisted legacy execution slots for recall queries",
  },
  {
    id: "lite_write_store",
    file: "src/store/lite-write-store.ts",
    kind: "store_adapter",
    reason: "stores and filters persisted legacy execution slot payloads",
  },
  {
    id: "recall_access_store",
    file: "src/store/recall-access.ts",
    kind: "store_adapter",
    reason: "translates persisted rows into recall access records",
  },
] as const satisfies readonly RuntimeLegacyAccessBoundaryDeclaration[];

export function runtimeLegacyAccessBoundaryDeclarations(): RuntimeLegacyAccessBoundaryDeclaration[] {
  return RUNTIME_LEGACY_ACCESS_BOUNDARY_REGISTRY.map((entry) => ({ ...entry }));
}

export function runtimeDirectLegacySlotBoundaryFiles(): string[] {
  return RUNTIME_LEGACY_ACCESS_BOUNDARY_REGISTRY
    .map((entry) => entry.file)
    .sort();
}

export function runtimeLegacyAccessBoundaryFilesByKind(kind: RuntimeLegacyAccessBoundaryKind): string[] {
  return RUNTIME_LEGACY_ACCESS_BOUNDARY_REGISTRY
    .filter((entry) => entry.kind === kind)
    .map((entry) => entry.file)
    .sort();
}

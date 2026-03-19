export type RuntimeCoreSurfaceKind = "shared_core" | "lite_product" | "server_only";

export type RuntimeCoreBoundaryEntry = {
  id: string;
  kind: RuntimeCoreSurfaceKind;
  rationale: string;
};

export const RUNTIME_CORE_BOUNDARY: readonly RuntimeCoreBoundaryEntry[] = [
  {
    id: "memory-kernel",
    kind: "shared_core",
    rationale: "Memory write, recall, context assembly, replay, handoff, and pack compatibility must remain shared.",
  },
  {
    id: "runtime-bootstrap",
    kind: "shared_core",
    rationale: "Environment loading and runtime bootstrap should converge behind one reusable entry contract.",
  },
  {
    id: "lite-wrapper",
    kind: "lite_product",
    rationale: "Lite-specific startup, docs, and release packaging should live with the standalone Lite product.",
  },
  {
    id: "admin-control",
    kind: "server_only",
    rationale: "Governance-heavy admin/control routes stay with the full repository.",
  },
  {
    id: "automations",
    kind: "server_only",
    rationale: "Automation orchestration remains outside the standalone Lite baseline.",
  },
] as const;

export const RUNTIME_CORE_SHARED_SURFACES = RUNTIME_CORE_BOUNDARY
  .filter((entry) => entry.kind === "shared_core")
  .map((entry) => entry.id);

export const RUNTIME_CORE_SERVER_ONLY_SURFACES = RUNTIME_CORE_BOUNDARY
  .filter((entry) => entry.kind === "server_only")
  .map((entry) => entry.id);

export const RUNTIME_CORE_LITE_PRODUCT_SURFACES = RUNTIME_CORE_BOUNDARY
  .filter((entry) => entry.kind === "lite_product")
  .map((entry) => entry.id);

export function runtimeCoreBoundarySummary() {
  return {
    shared_core: [...RUNTIME_CORE_SHARED_SURFACES],
    lite_product: [...RUNTIME_CORE_LITE_PRODUCT_SURFACES],
    server_only: [...RUNTIME_CORE_SERVER_ONLY_SURFACES],
  };
}


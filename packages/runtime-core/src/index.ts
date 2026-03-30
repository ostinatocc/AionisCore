export type RuntimeCoreSurfaceKind = "shared_core" | "local_runtime_shell" | "server_only";

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
    id: "automation-kernel-local",
    kind: "shared_core",
    rationale: "The local playbook-driven automation kernel should stay aligned across Lite and full runtime semantics.",
  },
  {
    id: "local-runtime-shell",
    kind: "local_runtime_shell",
    rationale: "Local runtime startup, shell docs, and local release packaging should stay with the Aionis Core local runtime shell.",
  },
  {
    id: "admin-control",
    kind: "server_only",
    rationale: "Governance-heavy admin/control routes stay with the full repository.",
  },
  {
    id: "automation-orchestration",
    kind: "server_only",
    rationale: "Reviewer workflows, shadow validation, telemetry, and compensation orchestration stay outside the local runtime shell baseline.",
  },
] as const;

export const RUNTIME_CORE_SHARED_SURFACES = RUNTIME_CORE_BOUNDARY
  .filter((entry) => entry.kind === "shared_core")
  .map((entry) => entry.id);

export const RUNTIME_CORE_SERVER_ONLY_SURFACES = RUNTIME_CORE_BOUNDARY
  .filter((entry) => entry.kind === "server_only")
  .map((entry) => entry.id);

export const RUNTIME_CORE_LOCAL_RUNTIME_SHELL_SURFACES = RUNTIME_CORE_BOUNDARY
  .filter((entry) => entry.kind === "local_runtime_shell")
  .map((entry) => entry.id);

export function runtimeCoreBoundarySummary() {
  return {
    shared_core: [...RUNTIME_CORE_SHARED_SURFACES],
    local_runtime_shell: [...RUNTIME_CORE_LOCAL_RUNTIME_SHELL_SURFACES],
    server_only: [...RUNTIME_CORE_SERVER_ONLY_SURFACES],
  };
}

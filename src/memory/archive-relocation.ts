import type { SemanticForgettingDecision } from "./semantic-forgetting.js";

export type ArchiveRelocationState = "none" | "candidate" | "cold_archive";
export type ArchiveRelocationTarget = "none" | "local_cold_store" | "external_object_store";

export type ArchiveRelocationPlan = {
  relocation_state: ArchiveRelocationState;
  relocation_target: ArchiveRelocationTarget;
  payload_scope: "none" | "anchor_payload" | "node";
  should_relocate: boolean;
  rationale: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function hasAnchorPayloadRefs(slots: Record<string, unknown> | null): boolean {
  const anchor = asRecord(slots?.anchor_v1);
  const refs = asRecord(anchor?.payload_refs);
  if (!refs) return false;
  return ["node_ids", "decision_ids", "run_ids", "step_ids", "commit_ids"].some((key) => Array.isArray(refs[key]) && (refs[key] as unknown[]).length > 0);
}

export function resolveArchiveRelocationPlan(args: {
  forgetting: SemanticForgettingDecision;
  slots?: Record<string, unknown> | null;
  raw_ref?: string | null;
  evidence_ref?: string | null;
}): ArchiveRelocationPlan {
  const hasPayload = hasAnchorPayloadRefs(args.slots ?? null) || !!args.raw_ref || !!args.evidence_ref;
  if (args.forgetting.action !== "archive") {
    return {
      relocation_state: args.forgetting.action === "demote" ? "candidate" : "none",
      relocation_target: "none",
      payload_scope: hasPayload ? "anchor_payload" : "none",
      should_relocate: false,
      rationale: args.forgetting.action === "demote" ? ["watch_for_archive_transition"] : ["retained_in_current_store"],
    };
  }

  return {
    relocation_state: "cold_archive",
    relocation_target: hasPayload ? "local_cold_store" : "none",
    payload_scope: hasPayload ? "anchor_payload" : "node",
    should_relocate: hasPayload,
    rationale: [
      "archive_transition_requested",
      ...(hasPayload ? ["payload_externalization_candidate"] : ["summary_only_node"]),
    ],
  };
}

export const MEMORY_TIER_ORDER = ["archive", "cold", "warm", "hot"] as const;

export type MemoryTierName = (typeof MEMORY_TIER_ORDER)[number];

export type MemoryEvolutionAction =
  | "retain"
  | "demote"
  | "archive"
  | "rehydrate"
  | "review";

export const MEMORY_TIER_RANK: Record<MemoryTierName, number> = {
  archive: 0,
  cold: 1,
  warm: 2,
  hot: 3,
};

export function isMemoryTierName(value: unknown): value is MemoryTierName {
  return typeof value === "string" && (MEMORY_TIER_ORDER as readonly string[]).includes(value);
}

export function normalizeMemoryTier(value: unknown, fallback: MemoryTierName = "archive"): MemoryTierName {
  return isMemoryTierName(value) ? value : fallback;
}

export function compareMemoryTierRank(left: unknown, right: unknown): number {
  return MEMORY_TIER_RANK[normalizeMemoryTier(left)] - MEMORY_TIER_RANK[normalizeMemoryTier(right)];
}

export function nextWarmerTier(value: unknown): MemoryTierName {
  const tier = normalizeMemoryTier(value);
  return MEMORY_TIER_ORDER[Math.min(MEMORY_TIER_ORDER.length - 1, MEMORY_TIER_RANK[tier] + 1)]!;
}

export function nextColderTier(value: unknown): MemoryTierName {
  const tier = normalizeMemoryTier(value);
  return MEMORY_TIER_ORDER[Math.max(0, MEMORY_TIER_RANK[tier] - 1)]!;
}

export function resolveTierTransitionTarget(args: {
  current_tier: unknown;
  action: MemoryEvolutionAction;
  requested_target_tier?: unknown;
}): MemoryTierName {
  const currentTier = normalizeMemoryTier(args.current_tier);
  if (args.action === "archive") return "archive";
  if (args.action === "rehydrate") {
    const requested = normalizeMemoryTier(args.requested_target_tier, currentTier);
    return compareMemoryTierRank(requested, currentTier) >= 0 ? requested : currentTier;
  }
  if (args.action === "demote") return nextColderTier(currentTier);
  return currentTier;
}

export type WorkflowPromotionState = "candidate" | "stable";

export type WorkflowPromotionOrigin =
  | "execution_write_projection"
  | "execution_write_auto_promotion"
  | "replay_learning_episode"
  | "replay_learning_auto_promotion"
  | "replay_promote"
  | "replay_stable_normalization";

export type WorkflowPromotionTransition =
  | "candidate_observed"
  | "promoted_to_stable"
  | "normalized_latest_stable";

export type WorkflowMaintenanceMetadata = {
  model: "lazy_online_v1";
  maintenance_state: "observe" | "retain";
  offline_priority: "promote_candidate" | "retain_workflow";
  lazy_update_fields: Array<"usage_count" | "last_used_at">;
  last_maintenance_at: string;
};

export type WorkflowPromotionMetadata = {
  promotion_state: WorkflowPromotionState;
  promotion_origin: WorkflowPromotionOrigin;
  last_transition: WorkflowPromotionTransition;
  last_transition_at: string;
  source_status: string | null;
  required_observations?: number;
  observed_count?: number;
};

export function buildWorkflowMaintenanceMetadata(args: {
  promotion_state: WorkflowPromotionState;
  at: string;
}): WorkflowMaintenanceMetadata {
  return {
    model: "lazy_online_v1",
    maintenance_state: args.promotion_state === "stable" ? "retain" : "observe",
    offline_priority: args.promotion_state === "stable" ? "retain_workflow" : "promote_candidate",
    lazy_update_fields: ["usage_count", "last_used_at"],
    last_maintenance_at: args.at,
  };
}

export function buildWorkflowPromotionMetadata(args: {
  promotion_state: WorkflowPromotionState;
  promotion_origin: WorkflowPromotionOrigin;
  at: string;
  required_observations?: number | null;
  observed_count?: number | null;
  source_status?: string | null;
  last_transition?: WorkflowPromotionTransition | null;
}): WorkflowPromotionMetadata {
  const out: WorkflowPromotionMetadata = {
    promotion_state: args.promotion_state,
    promotion_origin: args.promotion_origin,
    last_transition:
      args.last_transition
      ?? (args.promotion_state === "candidate"
        ? "candidate_observed"
        : args.promotion_origin === "replay_stable_normalization"
          ? "normalized_latest_stable"
          : "promoted_to_stable"),
    last_transition_at: args.at,
    source_status: args.source_status ?? null,
  };
  if (args.required_observations != null) {
    out.required_observations = Math.max(1, Math.trunc(args.required_observations));
  }
  if (args.observed_count != null) {
    out.observed_count = Math.max(0, Math.trunc(args.observed_count));
  }
  return out;
}

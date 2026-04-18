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

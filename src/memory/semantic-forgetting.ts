import { resolveNodePriorityProfile } from "./importance-dynamics.js";
import { nextColderTier, normalizeMemoryTier, type MemoryTierName } from "./evolution-operators.js";
import {
  resolveNodeCredibilityState,
  resolveNodeExecutionContractTrust,
  resolveNodePolicyMemoryState,
  resolveNodeSummaryKind,
} from "./node-execution-surface.js";

export type SemanticForgettingAction = "retain" | "demote" | "archive" | "review";
export type SemanticForgettingLifecycleState = "active" | "contested" | "retired" | "archived";

export type SemanticForgettingDecision = {
  action: SemanticForgettingAction;
  current_tier: MemoryTierName;
  target_tier: MemoryTierName;
  lifecycle_state: SemanticForgettingLifecycleState;
  retention_score: number;
  salience: number;
  importance: number;
  confidence: number;
  should_compact: boolean;
  should_relocate: boolean;
  rationale: string[];
};

type ResolveSemanticForgettingDecisionArgs = {
  type: string;
  tier?: string | null;
  title?: string | null;
  text_summary?: string | null;
  slots?: Record<string, unknown> | null;
  salience?: number | null;
  importance?: number | null;
  confidence?: number | null;
  reference_time?: string | number | Date | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function numeric(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function deriveLifecycleState(slots: Record<string, unknown> | null, tier: MemoryTierName): SemanticForgettingLifecycleState {
  if (tier === "archive") return "archived";
  const policyState = resolveNodePolicyMemoryState(slots);
  if (policyState === "retired") return "retired";
  if (policyState === "contested") return "contested";
  const credibilityState = resolveNodeCredibilityState(slots);
  if (credibilityState === "contested") return "contested";
  const summaryKind = resolveNodeSummaryKind(slots);
  const contractTrust = resolveNodeExecutionContractTrust({ slots });
  if (summaryKind === "policy_memory" && contractTrust && contractTrust !== "authoritative") {
    return "contested";
  }
  const explicit = firstString(slots?.lifecycle_state);
  if (explicit === "archived") return "archived";
  return "active";
}

function deriveFeedbackQuality(slots: Record<string, unknown> | null): number {
  const direct = numeric(slots?.feedback_quality);
  if (direct != null) return Math.max(-1, Math.min(1, direct));
  return 0;
}

export function resolveSemanticForgettingDecision(
  args: ResolveSemanticForgettingDecisionArgs,
): SemanticForgettingDecision {
  const currentTier = normalizeMemoryTier(args.tier);
  const profile = resolveNodePriorityProfile({
    type: args.type,
    tier: currentTier,
    title: args.title ?? null,
    text_summary: args.text_summary ?? null,
    slots: args.slots ?? null,
    salience: args.salience ?? null,
    importance: args.importance ?? null,
    confidence: args.confidence ?? null,
    reference_time: args.reference_time ?? null,
  });
  const slots = args.slots ?? null;
  const lifecycleState = deriveLifecycleState(slots, currentTier);
  const feedbackQuality = deriveFeedbackQuality(slots);
  const rationale: string[] = [];

  let action: SemanticForgettingAction = "retain";
  let targetTier: MemoryTierName = currentTier;

  if (lifecycleState === "retired") {
    action = currentTier === "archive" ? "retain" : "archive";
    targetTier = action === "archive" ? "archive" : currentTier;
    rationale.push("retired_policy_memory");
  } else if (profile.retention_score <= 0.3 || feedbackQuality <= -0.7) {
    action = currentTier === "archive" ? "retain" : "archive";
    targetTier = action === "archive" ? "archive" : currentTier;
    rationale.push("retention_below_archive_floor");
  } else if (lifecycleState === "contested" || profile.retention_score <= 0.45) {
    action = currentTier === "archive" ? "review" : "demote";
    targetTier = action === "demote" ? nextColderTier(currentTier) : currentTier;
    rationale.push(lifecycleState === "contested" ? "contested_lifecycle_state" : "retention_below_demote_floor");
  } else if (profile.retention_score <= 0.58 && currentTier === "hot") {
    action = "demote";
    targetTier = "warm";
    rationale.push("hot_tier_not_justified");
  } else {
    rationale.push("retention_supports_visibility");
  }

  if (currentTier === "archive" && action === "demote") {
    action = "review";
    targetTier = currentTier;
    rationale.push("archive_requires_explicit_rehydrate");
  }

  return {
    action,
    current_tier: currentTier,
    target_tier: targetTier,
    lifecycle_state: lifecycleState,
    retention_score: profile.retention_score,
    salience: profile.salience,
    importance: profile.importance,
    confidence: profile.confidence,
    should_compact: action === "demote" || action === "archive",
    should_relocate: action === "archive",
    rationale,
  };
}

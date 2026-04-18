/**
 * Vocabulary alias layer.
 *
 * Public UI copy uses outcome-oriented labels. Internal canonical names stay
 * available as the secondary label so developers can still grep for them.
 *
 * The source of truth is JSON so that a docs-side vocabulary tiering audit can
 * consume the same mapping without running the UI. The map is intentionally
 * flat and small; if it grows past ~30 entries, split it per surface.
 *
 * Resolved against open question #1 in the plan: code-driven JSON, not copy
 * sprinkled through the UI. Editors can review one file.
 */

export interface AliasEntry {
  display: string;
  internal: string;
  tone?: "trusted" | "candidate" | "contested" | "governed" | "shadow" | "neutral";
}

const ALIASES: Record<string, AliasEntry> = {
  planner_packet: { display: "Plan", internal: "planner_packet" },
  anchor_rehydration: { display: "Reactivate memory", internal: "anchor rehydration" },
  node_activation: { display: "Record reuse outcome", internal: "node activation" },
  execution_kernel: { display: "Runtime state", internal: "execution_kernel" },
  contested: { display: "Pattern challenged", internal: "contested", tone: "contested" },
  governed: { display: "Reviewed by governance", internal: "governed", tone: "governed" },
  shadow: { display: "Shadowed", internal: "shadow", tone: "shadow" },
  trusted: { display: "Trusted", internal: "trusted", tone: "trusted" },
  candidate: { display: "Candidate", internal: "candidate", tone: "candidate" },
  revalidated: { display: "Revalidated", internal: "revalidated", tone: "trusted" },
  observing: { display: "Observing", internal: "observing", tone: "candidate" },
  promotion_ready: { display: "Ready to promote", internal: "promotion_ready", tone: "candidate" },
  stable: { display: "Stable", internal: "stable", tone: "trusted" },
  candidate_observed: { display: "Observed", internal: "candidate_observed" },
  promoted_to_trusted: { display: "Promoted to trusted", internal: "promoted_to_trusted", tone: "trusted" },
  counter_evidence_opened: { display: "Counter-evidence", internal: "counter_evidence_opened", tone: "contested" },
  revalidated_to_trusted: { display: "Revalidated to trusted", internal: "revalidated_to_trusted", tone: "trusted" },
  first_action: { display: "First action", internal: "first_action" },
  source_kind: { display: "Why this action", internal: "source_kind" },
  kickoff_recommendation: { display: "Kickoff recommendation", internal: "kickoff_recommendation" },
  replay_run: { display: "Replay run", internal: "replay_run" },
  // kickoff_recommendation.source_kind values, surfaced in plain English on
  // the Playground. The internal tags remain discoverable as tooltips.
  experience_intelligence: {
    display: "Matched past execution",
    internal: "experience_intelligence",
    tone: "trusted",
  },
  tool_selection: {
    display: "Tool-selection heuristic",
    internal: "tool_selection",
    tone: "neutral",
  },
  workflow_summary: {
    display: "Workflow summary",
    internal: "workflow_summary",
    tone: "candidate",
  },
  recall_summary: {
    display: "Recalled context",
    internal: "recall_summary",
    tone: "neutral",
  },
};

export function alias(key: string | null | undefined): AliasEntry {
  if (!key) {
    return { display: "-", internal: "" };
  }
  const normalized = key.toLowerCase();
  const found = ALIASES[normalized];
  if (found) return found;
  return { display: humanize(key), internal: key };
}

export function displayOf(key: string | null | undefined): string {
  return alias(key).display;
}

export function toneOf(key: string | null | undefined): AliasEntry["tone"] {
  return alias(key).tone ?? "neutral";
}

function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

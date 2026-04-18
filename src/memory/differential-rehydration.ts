type DifferentialCandidate = {
  id: string;
  title?: string | null;
  summary?: string | null;
  selected_tool?: string | null;
  run_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

type DifferentialPlanArgs = {
  nodes: DifferentialCandidate[];
  decisions: DifferentialCandidate[];
  reason?: string | null;
  adjudication?: Record<string, unknown> | null;
};

export type DifferentialRehydrationPlan = {
  node_ids: string[];
  decision_ids: string[];
  rationale: string[];
};

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function stringList(value: unknown, limit = 16): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const next = typeof item === "string" ? item.trim() : "";
    if (!next || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
    if (out.length >= limit) break;
  }
  return out;
}

function tokenize(input: string | null | undefined): string[] {
  return String(input ?? "")
    .toLowerCase()
    .split(/[^a-z0-9_:/.-]+/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
}

function collectSignalTokens(args: DifferentialPlanArgs): string[] {
  const adjudication = args.adjudication ?? {};
  return Array.from(new Set([
    ...tokenize(args.reason),
    ...stringList(adjudication.keep_details, 24).flatMap((value) => tokenize(value)),
    ...tokenize(firstString(adjudication.expected_task_signature)),
    ...tokenize(firstString(adjudication.expected_error_signature)),
  ]));
}

function scoreCandidate(
  candidate: DifferentialCandidate,
  tokens: string[],
  preferredIds: Set<string>,
  deniedTokens: Set<string>,
): number {
  let score = preferredIds.has(candidate.id) ? 100 : 0;
  const haystack = [
    candidate.title,
    candidate.summary,
    candidate.selected_tool,
    candidate.run_id,
    ...Object.values(candidate.metadata ?? {}).map((value) => String(value)),
  ]
    .join(" ")
    .toLowerCase();
  for (const token of tokens) {
    if (haystack.includes(token)) score += 12;
  }
  for (const token of deniedTokens) {
    if (haystack.includes(token)) score -= 16;
  }
  return score;
}

function pickIds(
  candidates: DifferentialCandidate[],
  tokens: string[],
  preferredIds: Set<string>,
  deniedTokens: Set<string>,
  fallbackLimit: number,
): string[] {
  const ranked = candidates
    .map((candidate) => ({
      id: candidate.id,
      score: scoreCandidate(candidate, tokens, preferredIds, deniedTokens),
    }))
    .sort((left, right) => right.score - left.score);
  const selected = ranked.filter((entry) => entry.score > 0).map((entry) => entry.id);
  if (selected.length > 0) return selected.slice(0, fallbackLimit);
  return ranked.slice(0, fallbackLimit).map((entry) => entry.id);
}

export function buildDifferentialRehydrationPlan(args: DifferentialPlanArgs): DifferentialRehydrationPlan {
  const adjudication = args.adjudication ?? {};
  const preferredNodeIds = new Set(stringList(adjudication.related_memory_ids, 32));
  const preferredDecisionIds = new Set(stringList(adjudication.related_decision_ids, 32));
  const deniedTokens = new Set(stringList(adjudication.drop_details, 24).flatMap((value) => tokenize(value)));
  const tokens = collectSignalTokens(args);
  const nodeIds = pickIds(args.nodes, tokens, preferredNodeIds, deniedTokens, 2);
  const decisionIds = pickIds(args.decisions, tokens, preferredDecisionIds, deniedTokens, 1);
  const rationale = [
    preferredNodeIds.size > 0 || preferredDecisionIds.size > 0 ? "explicit_related_ids" : null,
    tokens.length > 0 ? "reason_and_keep_details_match" : null,
    deniedTokens.size > 0 ? "drop_details_penalty" : null,
    nodeIds.length === 0 && decisionIds.length === 0 ? "fallback_to_first_payload" : null,
  ].filter((value): value is string => !!value);

  return {
    node_ids: nodeIds,
    decision_ids: decisionIds,
    rationale: rationale.length > 0 ? rationale : ["fallback_to_ranked_payload"],
  };
}

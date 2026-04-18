/**
 * Shared demo-scope constants.
 *
 * The Playground tells a "Run 1 vs Run 2" story: the same task asked against
 * two scopes, one that has never been executed before (so Aionis has nothing
 * to replay), and one where the workflow has already been recorded (so Aionis
 * can replay the real first action).
 *
 * Both scopes are static. The "before" scope is deliberately never seeded
 * server-side; any query against it falls back to the tool-selection
 * heuristic, which is exactly the story Run 1 should tell. The "after" scope
 * is the pre-seeded pack mirrored from `apps/playground/public/seed-pack.json`.
 *
 * No per-visitor write path exists. This keeps the public adapter strictly
 * read-only. Follow-up (per-visitor memory and write UI) is tracked in
 * `docs/plans/2026-04-17-aionis-inspector-and-playground-plan.md`.
 */

export const DEMO_TENANT_ID = "default";

export const SCOPE_BEFORE = "playground:before";
export const SCOPE_AFTER = "playground:demo";

/** Back-compat alias; Footer and other surfaces still show the primary scope. */
export const DEMO_SCOPE = SCOPE_AFTER;

export interface ScopeRun {
  /** Internal scope id sent to the API. */
  id: string;
  /** Short label shown as a column header. */
  label: string;
  /** One-line tagline under the label. */
  tagline: string;
  /** Semantic role used by the component to tone-class the column. */
  role: "before" | "after";
}

export const RUN_BEFORE: ScopeRun = {
  id: SCOPE_BEFORE,
  label: "Run 1 — first time",
  tagline: "No prior memory. Aionis falls back to a heuristic.",
  role: "before",
};

export const RUN_AFTER: ScopeRun = {
  id: SCOPE_AFTER,
  label: "Run 2 — after memory",
  tagline: "One execution has been committed. Aionis replays the real first action.",
  role: "after",
};

export const DEMO_RUNS: readonly ScopeRun[] = [RUN_BEFORE, RUN_AFTER] as const;

export interface DemoIdentity {
  tenantId: string;
  scope: string;
}

/** Kept for any caller that still wants a single demo scope (Footer etc). */
export const demoIdentity: DemoIdentity = {
  tenantId: DEMO_TENANT_ID,
  scope: SCOPE_AFTER,
};

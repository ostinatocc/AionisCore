import { useMemo, useState } from "preact/hooks";
import {
  playgroundClient,
  type KickoffRecommendationResponse,
} from "../lib/playground-client";
import { alias, toneOf } from "../shared/lib/alias";
import { parseRationale, type ParsedRationale } from "../shared/lib/parse-rationale";
import { truncate } from "../shared/lib/format";
import { JsonView } from "../shared/components/json-view";
import type { ScopeRun } from "../lib/visitor-scope";

/**
 * The kickoff card is the axis of the Playground. It speaks Aionis Visual
 * Identity §3 and §6: paper surface, signal accent, runtime state colors
 * reserved for runtime meaning (trusted / candidate / contested) and never
 * repurposed as decorative success / error chrome.
 *
 * A non-obvious constraint worth preserving: state colors are semantic. If we
 * ever need a "generic success" or "generic error", reach for ink+line, not
 * trusted or contested — see VI §3 "Color don'ts".
 */

interface KickoffCardProps {
  tenantId: string;
  runs: readonly ScopeRun[];
}

const DEFAULT_QUERY = "Execute Aionis Doc workflow";
const DEFAULT_CANDIDATES = ["read", "edit", "run_tests", "git_commit", "search"];

const EXAMPLE_QUERIES: Array<{ label: string; text: string; hint: string }> = [
  {
    label: "Aionis Doc workflow",
    text: "Execute Aionis Doc workflow",
    hint: "Matches the seeded pack — expect an experience intelligence hit on Run 2.",
  },
  {
    label: "Docs for replay",
    text: "Write docs for the replay feature",
    hint: "Partial overlap; see whether token matching is enough.",
  },
  {
    label: "Flaky checkout retry",
    text: "Investigate flaky payment retry on checkout",
    hint: "Unrelated — both runs should fall back to the tool-selection heuristic.",
  },
];

type Submission = {
  query: string;
  candidates: string[];
};

type RunState =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "success";
      response: KickoffRecommendationResponse;
      submitted: Submission;
    }
  | { kind: "error"; message: string };

type RunStates = Record<string, RunState>;

function initialStates(runs: readonly ScopeRun[]): RunStates {
  const out: RunStates = {};
  for (const r of runs) out[r.id] = { kind: "idle" };
  return out;
}

export function KickoffCard({ tenantId, runs }: KickoffCardProps) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [candidatesText, setCandidatesText] = useState(
    DEFAULT_CANDIDATES.join(", "),
  );
  const [states, setStates] = useState<RunStates>(() => initialStates(runs));

  const candidates = useMemo(
    () =>
      candidatesText
        .split(/[,\n]/g)
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    [candidatesText],
  );

  const disabled = candidates.length === 0 || query.trim().length === 0;
  const anyLoading = runs.some((r) => states[r.id]?.kind === "loading");

  const run = async (ev: Event) => {
    ev.preventDefault();
    if (disabled) return;
    const submission: Submission = {
      query: query.trim(),
      candidates: [...candidates],
    };

    const loading: RunStates = {};
    for (const r of runs) loading[r.id] = { kind: "loading" };
    setStates(loading);

    for (const r of runs) {
      playgroundClient
        .kickoffRecommendation({
          tenant_id: tenantId,
          scope: r.id,
          query_text: submission.query,
          candidates: submission.candidates,
        })
        .then((response) => {
          setStates((prev) => ({
            ...prev,
            [r.id]: { kind: "success", response, submitted: submission },
          }));
        })
        .catch((err) => {
          setStates((prev) => ({
            ...prev,
            [r.id]: {
              kind: "error",
              message: err instanceof Error ? err.message : String(err),
            },
          }));
        });
    }
  };

  return (
    <section
      id="kickoff"
      class="mx-auto w-full max-w-5xl scroll-mt-8 px-6 pb-12"
    >
      <div class="card flex flex-col gap-6">
        <header class="flex flex-col gap-2">
          <span class="kicker">runtime demo</span>
          <h2
            class="text-[1.55rem] leading-[1.25] text-ink"
            style={{
              fontVariationSettings: "\"opsz\" 48, \"wght\" 500",
              letterSpacing: "-0.02em",
            }}
          >
            The same task. Twice. Watch memory work.
          </h2>
          <p class="text-[1rem] leading-[1.7] text-text-2">
            Your task description is sent to two identical Aionis Lite scopes
            in parallel. The left scope has never executed this work before.
            The right one has. Every field below is a real API response, not
            a script.
          </p>
        </header>

        <form class="flex flex-col gap-5" onSubmit={run}>
          <label class="flex flex-col">
            <span class="field-label">Task description</span>
            <textarea
              class="field-input h-20 resize-none"
              value={query}
              onInput={(e) =>
                setQuery((e.target as HTMLTextAreaElement).value)
              }
              placeholder="Execute Aionis Doc workflow"
              spellcheck={false}
            />
            <div class="mt-3 flex flex-wrap gap-1.5">
              {EXAMPLE_QUERIES.map((q) => {
                const active = query.trim() === q.text;
                const cls = active
                  ? "border-signal/50 bg-signal-wash text-signal-strong"
                  : "";
                return (
                  <button
                    key={q.text}
                    type="button"
                    title={q.hint}
                    class={`pill pill-interactive ${cls}`}
                    onClick={() => setQuery(q.text)}
                  >
                    {q.label}
                  </button>
                );
              })}
            </div>
          </label>

          <label class="flex flex-col">
            <span class="field-label">Candidate tools (comma separated)</span>
            <input
              class="field-input"
              value={candidatesText}
              onInput={(e) =>
                setCandidatesText((e.target as HTMLInputElement).value)
              }
              placeholder="read, edit, run_tests"
              spellcheck={false}
            />
            <span class="mt-2 text-[12px] leading-[1.5] text-text-3">
              Aionis picks one of these. On Run 2 it biases toward whatever
              has worked before in the scope.
            </span>
          </label>

          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="text-[12px] text-text-3">
              Read-only. Your submissions never write to the demo scopes.
            </div>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={disabled || anyLoading}
            >
              {anyLoading ? "Running both scopes…" : "Run on both scopes"}
            </button>
          </div>
        </form>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {runs.map((r) => (
            <RunColumn
              key={r.id}
              run={r}
              state={states[r.id] ?? { kind: "idle" }}
            />
          ))}
        </div>

        <DiffCallout
          before={stateAsSuccess(states[runs[0]?.id ?? ""])}
          after={stateAsSuccess(states[runs[runs.length - 1]?.id ?? ""])}
        />

        <RawResponses states={states} runs={runs} />
      </div>
    </section>
  );
}

function stateAsSuccess(
  state: RunState | undefined,
):
  | { response: KickoffRecommendationResponse; submitted: Submission }
  | null {
  if (!state || state.kind !== "success") return null;
  return { response: state.response, submitted: state.submitted };
}

function RunColumn({ run, state }: { run: ScopeRun; state: RunState }) {
  // The "after" column is where the memory win lives, so it carries a 1px
  // signal line on its leading edge — the single place on the card that
  // speaks louder than the baseline line color. Nothing else changes.
  const isAfter = run.role === "after";
  const shellClass = isAfter
    ? "flex min-h-[280px] flex-col gap-3 rounded-card border border-line bg-paper-soft p-5 relative"
    : "flex min-h-[280px] flex-col gap-3 rounded-card border border-line bg-paper p-5";

  return (
    <div class={shellClass}>
      {isAfter ? (
        <span
          aria-hidden="true"
          class="pointer-events-none absolute left-0 top-4 bottom-4 w-[2px] rounded-r bg-signal/40"
        />
      ) : null}
      <header class="flex flex-col gap-1">
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-[14px] text-ink"
            style={{ fontVariationSettings: "\"opsz\" 20, \"wght\" 500" }}
          >
            {run.label}
          </span>
          <span class="pill">
            <code class="font-mono text-[11px] text-text-2">{run.id}</code>
          </span>
        </div>
        <p class="text-[12px] leading-[1.55] text-text-2">{run.tagline}</p>
      </header>
      <RunBody state={state} />
    </div>
  );
}

function RunBody({ state }: { state: RunState }) {
  if (state.kind === "idle") {
    return (
      <div class="flex flex-1 items-center justify-center rounded-card border border-dashed border-line-strong bg-paper/60 px-3 py-8 text-center text-[12px] text-text-3">
        Run a query above to populate this column.
      </div>
    );
  }
  if (state.kind === "loading") {
    return (
      <div class="flex flex-1 items-center justify-center rounded-card border border-line bg-paper/60 px-3 py-8 text-center text-sm text-text-2">
        <span class="animate-pulse">Consulting Aionis memory…</span>
      </div>
    );
  }
  if (state.kind === "error") {
    // VI §3 forbids using `contested` for generic errors. Render the error in
    // neutral ink+line, with the failure word carrying its weight alone.
    return (
      <div class="rounded-card border border-line-strong bg-paper px-4 py-3 text-sm text-ink">
        <div
          style={{ fontVariationSettings: "\"opsz\" 18, \"wght\" 500" }}
        >
          Kickoff failed
        </div>
        <div class="mt-1 font-mono text-[11px] text-text-2">
          {state.message}
        </div>
      </div>
    );
  }
  const kickoff = state.response.kickoff_recommendation ?? null;
  const parsed = parseRationale(state.response.rationale);
  return (
    <div class="flex flex-col gap-3">
      <KickoffFacts kickoff={kickoff} />
      <RationaleBlock parsed={parsed} />
    </div>
  );
}

function KickoffFacts({
  kickoff,
}: {
  kickoff: KickoffRecommendationResponse["kickoff_recommendation"];
}) {
  if (!kickoff) {
    return (
      <div class="rounded-card border border-line bg-paper px-4 py-3 text-[12px] text-text-2">
        No kickoff recommendation. Aionis had no matching memory and no
        tool-selection fallback produced a candidate.
      </div>
    );
  }
  const sourceKind =
    typeof kickoff.source_kind === "string" ? kickoff.source_kind : null;
  const sourceAlias = sourceKind ? alias(sourceKind) : null;
  const rawTone = sourceKind ? toneOf(sourceKind) : "neutral";
  const tone = normalizeTone(rawTone);
  const historyApplied =
    typeof kickoff.history_applied === "boolean"
      ? kickoff.history_applied
      : null;
  const selectedTool =
    typeof kickoff.selected_tool === "string" ? kickoff.selected_tool : null;
  const filePath =
    typeof kickoff.file_path === "string" ? kickoff.file_path : null;
  const nextAction =
    typeof kickoff.next_action === "string" ? kickoff.next_action : null;

  return (
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-1.5">
        {sourceKind ? (
          <StateBadge
            tone={tone}
            label={sourceAlias?.display ?? sourceKind}
            title={sourceAlias?.internal ?? sourceKind}
          />
        ) : null}
        {historyApplied === true ? (
          <StateBadge tone="trusted" label="history applied" />
        ) : historyApplied === false ? (
          <span class="pill">no history applied</span>
        ) : null}
      </div>
      <dl class="grid grid-cols-1 gap-2">
        <FactRow label="Selected tool" value={selectedTool} mono highlight />
        <FactRow label="File path" value={filePath} mono />
        <FactRow label="Next action" value={nextAction} />
      </dl>
    </div>
  );
}

type BadgeTone = "trusted" | "candidate" | "contested" | "governed" | "neutral";

/**
 * Flatten the alias vocabulary's full tone space down to the five tones that
 * actually have a VI §3 paint definition. `shadow` (lifecycle-past) is
 * visually indistinguishable from `neutral` on a paper surface, so we fold
 * it in rather than inventing a sixth swatch.
 */
function normalizeTone(
  tone: "trusted" | "candidate" | "contested" | "governed" | "shadow" | "neutral" | undefined,
): BadgeTone {
  if (!tone || tone === "shadow") return "neutral";
  return tone;
}

/**
 * State badge — VI §3: 6px dot, `rgba(state, 0.14)` fill, `rgba(state, 0.30)`
 * border, ink text. Tailwind utility classes alone don't model those alpha
 * tokens cleanly, so we lean on the named wash/line tokens from the theme.
 */
function StateBadge({
  tone,
  label,
  title,
}: {
  tone: BadgeTone;
  label: string;
  title?: string;
}) {
  const map: Record<
    BadgeTone,
    { dot: string; bg: string; border: string; text: string }
  > = {
    trusted: {
      dot: "bg-trusted",
      bg: "bg-trusted-wash",
      border: "border-trusted-line",
      text: "text-ink",
    },
    candidate: {
      dot: "bg-candidate",
      bg: "bg-candidate-wash",
      border: "border-candidate-line",
      text: "text-ink",
    },
    contested: {
      dot: "bg-contested",
      bg: "bg-contested-wash",
      border: "border-contested-line",
      text: "text-ink",
    },
    governed: {
      dot: "bg-signal",
      bg: "bg-signal-wash",
      border: "border-signal/30",
      text: "text-ink",
    },
    neutral: {
      dot: "bg-shadow",
      bg: "bg-paper-sink",
      border: "border-line",
      text: "text-text-2",
    },
  };
  const c = map[tone];
  return (
    <span class={`pill ${c.bg} ${c.border} ${c.text}`} title={title}>
      <span class={`h-1.5 w-1.5 rounded-full ${c.dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function FactRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div class="flex flex-col gap-1 rounded-card border border-line bg-paper px-3 py-2">
      <span class="kicker">{label}</span>
      <span
        class={`break-words text-[13px] leading-[1.45] ${
          mono ? "font-mono" : ""
        } ${highlight ? "text-signal-strong" : "text-ink"} ${
          value ? "" : "italic text-text-3"
        }`}
        title={value ?? undefined}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

function RationaleBlock({ parsed }: { parsed: ParsedRationale | null }) {
  if (!parsed) {
    return (
      <div class="rounded-card border border-line bg-paper px-4 py-3 text-[12px] text-text-2">
        <div class="kicker">Why this pick</div>
        <div class="mt-1.5 text-ink">
          Aionis returned no rationale for this response.
        </div>
      </div>
    );
  }
  return (
    <div class="rounded-card border border-line bg-paper px-4 py-3">
      <div class="kicker">Why this pick</div>
      {parsed.narrative.length > 0 ? (
        <ul class="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-[1.55] text-ink">
          {parsed.narrative.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : null}
      {parsed.signals.length > 0 ? (
        <div class="mt-2.5 flex flex-wrap gap-1">
          {parsed.signals.map((sig, i) => (
            <SignalPill
              key={`${sig.key}-${i}`}
              keyText={sig.key}
              value={sig.value}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Signal pill — rationale signals are diagnostic, not state-semantic. We keep
 * them in a neutral paper-sink chip and let the value color carry only when
 * the value is a boolean: `true` reads as confirmation (signal-soft on wash),
 * `false` stays neutral.
 */
function SignalPill({ keyText, value }: { keyText: string; value: string }) {
  const kind = classifySignalValue(value);
  const valueClass =
    kind === "true"
      ? "text-signal-strong"
      : kind === "false"
      ? "text-text-2"
      : kind === "number"
      ? "text-signal"
      : "text-ink";
  return (
    <span class="pill">
      <span class="font-mono text-[11px] text-text-2">{keyText}</span>
      <span aria-hidden="true" class="text-text-3">
        ·
      </span>
      <span class={`font-mono text-[11px] ${valueClass}`}>
        {truncate(value, 60)}
      </span>
    </span>
  );
}

function classifySignalValue(
  value: string,
): "true" | "false" | "number" | "other" {
  if (value === "true") return "true";
  if (value === "false") return "false";
  if (/^-?\d+(\.\d+)?$/.test(value)) return "number";
  return "other";
}

interface SuccessPair {
  response: KickoffRecommendationResponse;
  submitted: Submission;
}

function DiffCallout({
  before,
  after,
}: {
  before: SuccessPair | null;
  after: SuccessPair | null;
}) {
  if (!before || !after) return null;

  const b = before.response.kickoff_recommendation ?? null;
  const a = after.response.kickoff_recommendation ?? null;

  const beforeSource = typeof b?.source_kind === "string" ? b.source_kind : null;
  const afterSource = typeof a?.source_kind === "string" ? a.source_kind : null;
  const beforeFile = typeof b?.file_path === "string" ? b.file_path : null;
  const afterFile = typeof a?.file_path === "string" ? a.file_path : null;
  const beforeNext = typeof b?.next_action === "string" ? b.next_action : null;
  const afterNext = typeof a?.next_action === "string" ? a.next_action : null;
  const beforeHistory = b?.history_applied === true;
  const afterHistory = a?.history_applied === true;

  const diffs: Array<{ label: string; before: string; after: string }> = [];
  if (beforeSource !== afterSource) {
    diffs.push({
      label: "Source of recommendation",
      before: alias(beforeSource).display,
      after: alias(afterSource).display,
    });
  }
  if (beforeHistory !== afterHistory) {
    diffs.push({
      label: "History replay",
      before: beforeHistory ? "applied" : "none",
      after: afterHistory ? "applied" : "none",
    });
  }
  if (beforeFile !== afterFile) {
    diffs.push({
      label: "File path",
      before: beforeFile ?? "—",
      after: afterFile ?? "—",
    });
  }
  if (beforeNext !== afterNext) {
    diffs.push({
      label: "Next action",
      before: beforeNext ?? "—",
      after: afterNext ?? "—",
    });
  }

  if (diffs.length === 0) {
    return (
      <div class="rounded-card border border-line bg-paper-soft px-5 py-4">
        <div class="kicker">What memory changed</div>
        <div class="mt-1.5 text-[14px] leading-[1.6] text-text-2">
          Both scopes returned the same recommendation for this query. Try
          one of the example chips above — the canonical{" "}
          <code class="code-inline">Execute Aionis Doc workflow</code> query
          is built to hit the seeded pack.
        </div>
      </div>
    );
  }

  return (
    <div class="rounded-card border border-line bg-paper-soft px-5 py-4">
      <div class="flex items-center gap-2">
        <span
          class="h-1.5 w-1.5 rounded-full bg-trusted"
          aria-hidden="true"
        />
        <span class="kicker">What memory changed</span>
      </div>
      <p class="mt-2 text-[14px] leading-[1.6] text-ink">
        One committed execution was enough for Aionis to stop guessing and
        start replaying.
      </p>
      <ul class="mt-3 flex flex-col gap-2 text-[13px] text-ink">
        {diffs.map((d) => (
          <li
            key={d.label}
            class="flex flex-col gap-1.5 rounded-card border border-line bg-paper p-3 sm:flex-row sm:items-center sm:gap-3"
          >
            <span class="w-40 shrink-0 kicker">{d.label}</span>
            <span class="flex min-w-0 flex-1 items-center gap-2">
              <span class="flex-1 truncate rounded-inline border border-line bg-paper-sink px-2 py-1 font-mono text-[12px] text-text-2 line-through decoration-text-3">
                {d.before}
              </span>
              <span aria-hidden="true" class="text-text-3">
                →
              </span>
              <span class="flex-1 truncate rounded-inline border border-trusted-line bg-trusted-wash px-2 py-1 font-mono text-[12px] text-ink">
                {d.after}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RawResponses({
  states,
  runs,
}: {
  states: RunStates;
  runs: readonly ScopeRun[];
}) {
  const successes = runs
    .map((r) => ({ run: r, state: states[r.id] }))
    .filter((x) => x.state?.kind === "success");
  if (successes.length === 0) return null;
  return (
    <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {successes.map(({ run, state }) => {
        if (!state || state.kind !== "success") return null;
        return (
          <div key={run.id} class="flex flex-col gap-1.5">
            <span class="kicker">Raw response · {run.label}</span>
            <JsonView value={state.response} collapsed />
          </div>
        );
      })}
    </div>
  );
}

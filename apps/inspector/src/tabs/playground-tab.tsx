import { useMemo, useState } from "preact/hooks";
import type {
  AionisClient,
  KickoffRecommendationResponse,
} from "../lib/aionis-client";
import type { RuntimeConfig } from "../lib/runtime-config";
import { EmptyState } from "../components/empty-state";
import { Section } from "../components/section";
import { JsonView } from "../components/json-view";
import { alias, displayOf } from "../lib/alias";
import { parseRationale, type ParsedRationale } from "../lib/parse-rationale";

interface PlaygroundTabProps {
  client: AionisClient;
  config: RuntimeConfig;
}

type Status = "idle" | "loading" | "success" | "error";

export function PlaygroundTab({ client, config }: PlaygroundTabProps) {
  const [query, setQuery] = useState("Investigate flaky payment retry on checkout");
  const [candidateTools, setCandidateTools] = useState("read, write, run");
  const [status, setStatus] = useState<Status>("idle");
  const [response, setResponse] = useState<KickoffRecommendationResponse | null>(
    null,
  );
  // The candidate set that was actually submitted to produce `response`.
  // We remember it separately so the "Candidates considered" strip stays
  // honest when the user edits the form after a successful call.
  const [submittedCandidates, setSubmittedCandidates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!query.trim()) return;
    const tools = candidateTools
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (tools.length === 0) {
      setStatus("error");
      setError("At least one candidate tool is required.");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const result = await client.kickoffRecommendation({
        tenant_id: config.tenantId,
        scope: config.scope,
        query_text: query.trim(),
        candidates: tools,
        context: {},
      });
      setResponse(result);
      setSubmittedCandidates(tools);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const kickoff = response?.kickoff_recommendation ?? null;
  const parsedRationale = useMemo(
    () => (response ? parseRationale(response.rationale) : null),
    [response],
  );

  return (
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <Section
        title="Task kickoff"
        description="Calls /v1/memory/kickoff/recommendation and renders the first action Aionis recommends."
      >
        <form class="card flex flex-col gap-3" onSubmit={submit}>
          <label>
            <span class="field-label">Query</span>
            <textarea
              class="field-input min-h-[96px]"
              value={query}
              onInput={(e) => setQuery((e.target as HTMLTextAreaElement).value)}
              placeholder="Describe the task a coding agent is about to start"
            />
          </label>
          <label>
            <span class="field-label">Candidate tools (required)</span>
            <input
              class="field-input"
              value={candidateTools}
              onInput={(e) =>
                setCandidateTools((e.target as HTMLInputElement).value)
              }
              placeholder="comma-separated tool names"
            />
            <span class="mt-1 block text-[10px] text-ink0">
              Lite requires at least one candidate tool. Aionis picks from this
              list.
            </span>
          </label>
          <div class="flex items-center justify-between gap-3">
            <span class="text-[11px] text-ink0">
              tenant <span class="font-mono text-ink/80">{config.tenantId}</span>{" "}
              · scope{" "}
              <span class="font-mono text-ink/80">{config.scope}</span>
            </span>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={status === "loading"}
            >
              {status === "loading" ? "Calling…" : "Request kickoff"}
            </button>
          </div>
        </form>
      </Section>

      <Section
        title="Kickoff result"
        description="Structured view of the first action Aionis recommends, why it picked it, and which signals were in play."
      >
        {status === "idle" ? (
          <EmptyState
            title="No response yet"
            description="Submit the form to see the recommended first action."
          />
        ) : status === "error" ? (
          <EmptyState
            title="Kickoff request failed"
            description={error ?? "unknown error"}
          />
        ) : !response ? (
          <EmptyState title="Waiting for response…" />
        ) : (
          <div class="flex flex-col gap-4">
            <HeroCard kickoff={kickoff} />
            <RationaleCard parsed={parsedRationale} kickoff={kickoff} />
            {submittedCandidates.length > 0 ? (
              <CandidatesStrip
                candidates={submittedCandidates}
                chosen={
                  typeof kickoff?.selected_tool === "string"
                    ? kickoff.selected_tool
                    : null
                }
              />
            ) : null}
            {response.tool_selection ? (
              <JsonSubSection
                title="Tool-selection detail"
                description="Raw tool_selection payload for when the heuristic is what picked the step."
                value={response.tool_selection}
              />
            ) : null}
            {response.workflow_summary ? (
              <JsonSubSection
                title="Workflow summary"
                description="The workflow anchor Aionis leaned on, if any."
                value={response.workflow_summary}
              />
            ) : null}
            {response.recall_summary ? (
              <JsonSubSection
                title="Recalled context"
                description="Nodes/edges pulled into the prompt context for this kickoff."
                value={response.recall_summary}
              />
            ) : null}
            <div class="card">
              <h3 class="mb-2 text-sm font-semibold text-ink">
                Raw response
              </h3>
              <JsonView value={response} collapsed />
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

/**
 * The "what Aionis recommends" card. Emphasizes the selected tool + next
 * action so the user sees the decision before drowning in evidence.
 */
function HeroCard({
  kickoff,
}: {
  kickoff: KickoffRecommendationResponse["kickoff_recommendation"];
}) {
  if (!kickoff) {
    return (
      <EmptyState
        title="No kickoff recommendation"
        description="The runtime did not return a recommendation. Either the scope has no memory yet or none of the candidate tools qualified."
      />
    );
  }
  const sourceKind =
    typeof kickoff.source_kind === "string" ? kickoff.source_kind : null;
  const sourceAlias = sourceKind ? alias(sourceKind) : null;
  const historyApplied =
    typeof kickoff.history_applied === "boolean"
      ? kickoff.history_applied
      : null;
  const tool =
    typeof kickoff.selected_tool === "string" && kickoff.selected_tool.length > 0
      ? kickoff.selected_tool
      : null;
  const filePath =
    typeof kickoff.file_path === "string" && kickoff.file_path.length > 0
      ? kickoff.file_path
      : null;
  const nextAction =
    typeof kickoff.next_action === "string" && kickoff.next_action.length > 0
      ? kickoff.next_action
      : null;

  return (
    <div class="card flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-2">
        {sourceKind ? (
          <span
            class="pill border-signal/60 bg-signal/10 text-signal-strong"
            title={sourceAlias?.internal ?? sourceKind}
          >
            {sourceAlias?.display ?? sourceKind}
          </span>
        ) : null}
        {historyApplied === true ? (
          <span class="pill border-trusted-line bg-trusted-wash text-trusted">
            history applied
          </span>
        ) : historyApplied === false ? (
          <span class="pill border-line-strong/70 bg-paper-sink/70 text-ink/80">
            no history applied
          </span>
        ) : null}
      </div>

      <div class="flex flex-col gap-1.5">
        <span class="text-[10px] uppercase tracking-wide text-ink0">
          Selected tool
        </span>
        <div class="flex items-baseline gap-3">
          <span class="font-mono text-lg font-semibold text-ink">
            {tool ?? "—"}
          </span>
          {filePath ? (
            <span
              class="truncate font-mono text-xs text-text-2"
              title={filePath}
            >
              {filePath}
            </span>
          ) : null}
        </div>
      </div>

      {nextAction ? (
        <div class="rounded-md border border-line bg-paper-soft px-3 py-2">
          <div class="text-[10px] uppercase tracking-wide text-ink0">
            Next action
          </div>
          <div class="mt-0.5 text-sm text-ink">{nextAction}</div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * "Why this pick" — turns the pipe-delimited rationale string into a small
 * set of narrative bullets + labelled signal pills.
 */
function RationaleCard({
  parsed,
  kickoff,
}: {
  parsed: ParsedRationale | null;
  kickoff: KickoffRecommendationResponse["kickoff_recommendation"];
}) {
  if (!parsed && !kickoff) return null;
  // If the runtime skipped rationale entirely, still show the header so
  // users understand the decision was "bare" rather than that the UI hid
  // something.
  if (!parsed) {
    return (
      <div class="card">
        <h3 class="text-sm font-semibold text-ink">Why this pick</h3>
        <p class="mt-1 text-xs text-text-2">
          The runtime returned no rationale for this kickoff.
        </p>
      </div>
    );
  }
  return (
    <div class="card flex flex-col gap-3">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-ink">Why this pick</h3>
        <span class="text-[10px] text-ink0">
          parsed from <code>rationale.summary</code>
        </span>
      </div>

      {parsed.narrative.length > 0 ? (
        <ul class="flex flex-col gap-1.5 text-xs text-ink/80">
          {parsed.narrative.map((line, i) => (
            <li key={`n-${i}`} class="flex items-start gap-2">
              <span class="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-signal" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {parsed.signals.length > 0 ? (
        <div class="flex flex-col gap-2">
          <div class="text-[10px] uppercase tracking-wide text-ink0">
            Signals
          </div>
          <dl class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {parsed.signals.map((sig, i) => (
              <SignalRow key={`s-${i}`} signal={sig} />
            ))}
          </dl>
        </div>
      ) : null}

      {parsed.narrative.length === 0 && parsed.signals.length === 0 ? (
        <p class="text-xs text-text-2">
          Rationale present but no parseable pieces:{" "}
          <code class="font-mono text-ink/80">{parsed.raw}</code>
        </p>
      ) : null}
    </div>
  );
}

function SignalRow({ signal }: { signal: { key: string; value: string } }) {
  const key = displayOf(signal.key);
  const isBool =
    signal.value === "true" || signal.value === "false";
  const isNumber = /^-?\d+(\.\d+)?$/.test(signal.value);
  const valueClass = isBool
    ? signal.value === "true"
      ? "text-trusted"
      : "text-text-2"
    : isNumber
      ? "text-signal"
      : "text-ink";
  return (
    <div
      class="flex items-start justify-between gap-3 rounded-md border border-line/70 bg-paper/40 px-2.5 py-1.5"
      title={signal.key}
    >
      <dt class="text-[10px] uppercase tracking-wide text-ink0">{key}</dt>
      <dd
        class={`truncate text-right font-mono text-[11px] ${valueClass}`}
        title={signal.value}
      >
        {signal.value}
      </dd>
    </div>
  );
}

function CandidatesStrip({
  candidates,
  chosen,
}: {
  candidates: string[];
  chosen: string | null;
}) {
  return (
    <div class="card flex flex-wrap items-center gap-2 text-[11px]">
      <span class="text-ink0">Candidates considered</span>
      {candidates.map((tool) => {
        const isChosen = chosen !== null && tool === chosen;
        return (
          <span
            key={tool}
            class={`pill font-mono ${
              isChosen
                ? "border-signal/60 bg-signal/15 text-signal-strong"
                : "border-line-strong bg-paper-soft text-ink/80"
            }`}
          >
            {tool}
            {isChosen ? " · chosen" : ""}
          </span>
        );
      })}
    </div>
  );
}

function JsonSubSection({
  title,
  description,
  value,
}: {
  title: string;
  description: string;
  value: unknown;
}) {
  return (
    <div class="card flex flex-col gap-2">
      <div>
        <h3 class="text-sm font-semibold text-ink">{title}</h3>
        <p class="text-[11px] text-ink0">{description}</p>
      </div>
      <JsonView value={value} collapsed />
    </div>
  );
}

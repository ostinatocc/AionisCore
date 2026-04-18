import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type {
  AionisClient,
  MemoryFindNode,
  MemoryFindResponse,
} from "../lib/aionis-client";
import type { RuntimeConfig } from "../lib/runtime-config";
import type { MemoryFocus } from "../app";
import { useAsync } from "../lib/use-async";
import { formatRelativeTime, shortId, truncate } from "../lib/format";
import { EmptyState } from "../components/empty-state";
import { Section } from "../components/section";
import { JsonView } from "../components/json-view";

interface MemoryTabProps {
  client: AionisClient;
  config: RuntimeConfig;
  focus: MemoryFocus | null;
  onClearFocus: () => void;
}

const DEFAULT_LIMIT = 100;

export function MemoryTab({ client, config, focus, onClearFocus }: MemoryTabProps) {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<MemoryFindNode | null>(null);
  const [focusedNode, setFocusedNode] = useState<MemoryFindNode | null>(null);
  const [focusError, setFocusError] = useState<string | null>(null);
  const lastHandledFocusId = useRef<string | null>(null);

  const find = useAsync(
    () =>
      client.memoryFind({
        tenant_id: config.tenantId,
        scope: config.scope,
        limit: DEFAULT_LIMIT,
        include_meta: true,
        include_slots_preview: true,
      }),
    [config.tenantId, config.scope],
    { intervalMs: 15_000 },
  );

  const response = (find.data ?? null) as MemoryFindResponse | null;
  const nodes = useMemo(() => (response?.nodes ?? []) as MemoryFindNode[], [response]);
  const summary = response?.find_summary ?? null;

  // When a focus arrives from the Patterns tab we:
  //  1) set the filter to the anchor id so the list narrows to one row,
  //  2) auto-select that row (loading it via memory/find if it's outside
  //     the current DEFAULT_LIMIT page).
  // The ref prevents the effect from re-running while the same focus is
  // still active.
  useEffect(() => {
    if (!focus) {
      lastHandledFocusId.current = null;
      setFocusedNode(null);
      setFocusError(null);
      return;
    }
    if (lastHandledFocusId.current === focus.anchorId) return;
    lastHandledFocusId.current = focus.anchorId;
    setFilter(focus.anchorId);
    setFocusError(null);
    const match = nodes.find((n) => n.id === focus.anchorId);
    if (match) {
      setFocusedNode(match);
      setSelected(match);
      return;
    }
    // Not in the current page – fetch by id as a one-shot lookup so
    // patterns sitting deep in a large scope still resolve.
    let cancelled = false;
    (async () => {
      try {
        const res = (await client.memoryFind({
          tenant_id: config.tenantId,
          scope: config.scope,
          id: focus.anchorId,
          include_meta: true,
          include_slots_preview: true,
          limit: 1,
        })) as MemoryFindResponse;
        if (cancelled) return;
        const hit = (res?.nodes ?? [])[0] ?? null;
        if (hit) {
          setFocusedNode(hit);
          setSelected(hit);
        } else {
          setFocusedNode(null);
          setFocusError(
            "Node not returned by memory/find – it may be in a different scope or tier.",
          );
        }
      } catch (err) {
        if (cancelled) return;
        setFocusError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [focus, nodes, client, config.tenantId, config.scope]);

  const filtered = useMemo(() => {
    if (!filter) return nodes;
    const needle = filter.toLowerCase();
    return nodes.filter((n) => {
      const clientId = String(n.client_id ?? n.id ?? "").toLowerCase();
      const title = String(n.title ?? "").toLowerCase();
      const textSummary = String(n.text_summary ?? "").toLowerCase();
      const type = String(n.type ?? "").toLowerCase();
      return (
        clientId.includes(needle) ||
        title.includes(needle) ||
        textSummary.includes(needle) ||
        type.includes(needle)
      );
    });
  }, [nodes, filter]);

  // If the focused node was fetched out-of-band (not in the current page),
  // prepend it to the filtered list so the user can still see it.
  const displayList = useMemo(() => {
    if (!focus || !focusedNode) return filtered;
    const alreadyVisible = filtered.some((n) => n.id === focusedNode.id);
    if (alreadyVisible) return filtered;
    return [focusedNode, ...filtered];
  }, [filtered, focus, focusedNode]);

  const clearFocus = () => {
    onClearFocus();
    setFilter("");
    setFocusedNode(null);
    setFocusError(null);
  };

  return (
    <div class="flex flex-col gap-6">
      {focus ? (
        <FocusBanner
          focus={focus}
          resolved={focusedNode}
          error={focusError}
          onClear={clearFocus}
        />
      ) : null}
      {summary ? <SummaryStrip summary={summary} total={nodes.length} /> : null}
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Section
          title="Memory nodes"
          description={`Scope ${config.scope} · showing ${displayList.length} of ${nodes.length}${
            response?.page?.has_more ? " (more available)" : ""
          }`}
          actions={
            <>
              <input
                class="field-input w-56"
                placeholder="Filter by id / title / type"
                value={filter}
                onInput={(e) => setFilter((e.target as HTMLInputElement).value)}
              />
              <button type="button" class="btn" onClick={find.reload}>
                Refresh
              </button>
            </>
          }
        >
          {nodes.length === 0 && find.status === "success" ? (
            <EmptyState
              title="No memory nodes yet"
              description="This scope has not recorded any execution memory."
              hint={`npm run example:sdk:core-path\n# then set scope=${config.scope} in the payload`}
            />
          ) : find.status === "error" && nodes.length === 0 ? (
            <EmptyState title="Memory find failed" description={find.error.message} />
          ) : (
            <div class="card p-0">
              <ul class="scroll-area max-h-[70vh] divide-y divide-line">
                {displayList.map((node) => {
                  const isSelected =
                    selected?.id === node.id && node.id !== undefined;
                  const isFocused =
                    focus !== null &&
                    node.id !== undefined &&
                    node.id === focus.anchorId;
                  const label = node.title ?? node.client_id ?? node.id ?? "—";
                  const rowClass = isFocused
                    ? "border-l-2 border-l-sky-500 bg-signal/10 hover:bg-signal/15"
                    : isSelected
                      ? "bg-paper-sink"
                      : "";
                  return (
                    <li key={String(node.id ?? label)}>
                      <button
                        type="button"
                        class={`w-full px-4 py-3 text-left transition hover:bg-paper-sink ${rowClass}`}
                        onClick={() => setSelected(node)}
                      >
                        <div class="flex items-center justify-between gap-2">
                          <span
                            class="truncate text-sm font-semibold text-ink"
                            title={String(label)}
                          >
                            {truncate(String(label), 80)}
                          </span>
                          <div class="flex shrink-0 items-center gap-2">
                            {isFocused ? (
                              <span class="pill border-signal/60 bg-signal/15 text-signal-strong">
                                focused
                              </span>
                            ) : null}
                            {node.tier ? (
                              <span class="pill border-line-strong bg-paper-soft text-ink/80">
                                tier {String(node.tier)}
                              </span>
                            ) : null}
                            {node.memory_lane ? (
                              <span class="pill border-line-strong bg-paper-soft text-text-2">
                                {String(node.memory_lane)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div class="mt-1 flex items-center gap-3 text-[11px] text-ink0">
                          <span>type {String(node.type ?? "—")}</span>
                          <span>·</span>
                          <span>id {shortId(node.id)}</span>
                          <span>·</span>
                          <span>last {formatRelativeTime(node.last_activated ?? node.updated_at ?? null)}</span>
                        </div>
                        {node.text_summary ? (
                          <p class="mt-1 text-xs text-text-2">
                            {truncate(String(node.text_summary), 160)}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Section>

        <Section title="Node detail" description="Read-only payload and metadata.">
          {selected ? (
            <div class="card flex flex-col gap-3">
              <div>
                <div class="text-xs uppercase tracking-wide text-text-2">Title</div>
                <div class="break-all text-sm text-ink">
                  {String(selected.title ?? "—")}
                </div>
              </div>
              {selected.text_summary ? (
                <div>
                  <div class="text-xs uppercase tracking-wide text-text-2">Summary</div>
                  <div class="text-sm text-ink">{String(selected.text_summary)}</div>
                </div>
              ) : null}
              <div class="grid grid-cols-2 gap-2">
                <MetaBlock label="Type" value={String(selected.type ?? "—")} />
                <MetaBlock label="Tier" value={String(selected.tier ?? "—")} />
                <MetaBlock label="Memory lane" value={String(selected.memory_lane ?? "—")} />
                <MetaBlock label="Node id" value={shortId(selected.id)} />
                <MetaBlock
                  label="Client id"
                  value={String(selected.client_id ?? "—")}
                />
                <MetaBlock label="Scope" value={String(config.scope)} />
                <MetaBlock
                  label="Last activated"
                  value={formatRelativeTime(selected.last_activated ?? null)}
                />
                <MetaBlock
                  label="Updated"
                  value={formatRelativeTime(selected.updated_at ?? null)}
                />
                <MetaBlock
                  label="Salience"
                  value={formatScore(selected.salience)}
                />
                <MetaBlock
                  label="Importance"
                  value={formatScore(selected.importance)}
                />
                <MetaBlock
                  label="Confidence"
                  value={formatScore(selected.confidence)}
                />
                <MetaBlock
                  label="Producer"
                  value={String(selected.producer_agent_id ?? "—")}
                />
              </div>
              <JsonView value={selected} collapsed />
            </div>
          ) : (
            <EmptyState
              title="Select a node"
              description="Pick a row on the left to see its payload and metadata."
            />
          )}
        </Section>
      </div>
    </div>
  );
}

function FocusBanner({
  focus,
  resolved,
  error,
  onClear,
}: {
  focus: MemoryFocus;
  resolved: MemoryFindNode | null;
  error: string | null;
  onClear: () => void;
}) {
  const originLabel = focus.origin === "pattern" ? "pattern" : "workflow";
  const title =
    (resolved?.title as string | undefined) ?? focus.label ?? "(no title)";
  return (
    <div class="card flex items-start justify-between gap-4 border-signal/40 bg-signal/5">
      <div class="min-w-0 text-xs text-ink/80">
        <div class="flex flex-wrap items-center gap-2">
          <span class="pill border-signal/60 bg-signal/15 text-signal-strong">
            from {originLabel}
          </span>
          <span class="truncate text-sm font-semibold text-ink" title={title}>
            {truncate(title, 90)}
          </span>
        </div>
        <div class="mt-1 font-mono text-[11px] text-text-2">
          anchor {focus.anchorId}
        </div>
        {error ? (
          <div class="mt-1 text-[11px] text-contested">{error}</div>
        ) : !resolved ? (
          <div class="mt-1 text-[11px] text-text-2">Looking up node…</div>
        ) : null}
      </div>
      <button type="button" class="btn shrink-0" onClick={onClear}>
        Clear focus
      </button>
    </div>
  );
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div class="rounded-md border border-line bg-paper/40 px-3 py-2">
      <div class="text-[10px] uppercase tracking-wide text-ink0">{label}</div>
      <div class="mt-0.5 truncate font-mono text-xs text-ink" title={value}>
        {value}
      </div>
    </div>
  );
}

function formatScore(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toFixed(3);
}

function SummaryStrip({
  summary,
  total,
}: {
  summary: NonNullable<MemoryFindResponse["find_summary"]>;
  total: number;
}) {
  const tierEntries = Object.entries(summary.tier_counts ?? {});
  const typeEntries = Object.entries(summary.type_counts ?? {});
  const laneEntries = Object.entries(summary.memory_lane_counts ?? {});
  return (
    <div class="card flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-text-2">
      <span class="font-mono text-ink">total {total}</span>
      {typeEntries.length > 0 ? (
        <span class="flex flex-wrap items-center gap-1.5">
          <span class="text-ink0">by type</span>
          {typeEntries.map(([k, v]) => (
            <span
              key={`type-${k}`}
              class="rounded-md border border-line bg-paper-soft/70 px-1.5 py-0.5 font-mono text-[10px] text-ink/80"
            >
              {k} · {v}
            </span>
          ))}
        </span>
      ) : null}
      {tierEntries.length > 0 ? (
        <span class="flex flex-wrap items-center gap-1.5">
          <span class="text-ink0">by tier</span>
          {tierEntries.map(([k, v]) => (
            <span
              key={`tier-${k}`}
              class="rounded-md border border-line bg-paper-soft/70 px-1.5 py-0.5 font-mono text-[10px] text-ink/80"
            >
              {k} · {v}
            </span>
          ))}
        </span>
      ) : null}
      {laneEntries.length > 0 ? (
        <span class="flex flex-wrap items-center gap-1.5">
          <span class="text-ink0">by lane</span>
          {laneEntries.map(([k, v]) => (
            <span
              key={`lane-${k}`}
              class="rounded-md border border-line bg-paper-soft/70 px-1.5 py-0.5 font-mono text-[10px] text-ink/80"
            >
              {k} · {v}
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}

import { useMemo } from "preact/hooks";
import type {
  AionisClient,
  ExecutionIntrospectResponse,
  ExecutionPacketItem,
  LifecycleSummary,
} from "../lib/aionis-client";
import type { RuntimeConfig } from "../lib/runtime-config";
import type { MemoryFocus } from "../app";
import { useAsync } from "../lib/use-async";
import { displayOf } from "../lib/alias";
import { formatRelativeTime, shortId, truncate } from "../lib/format";
import { EmptyState } from "../components/empty-state";
import { Section } from "../components/section";
import { StateBadge } from "../components/state-badge";
import { JsonView } from "../components/json-view";

interface PatternsTabProps {
  client: AionisClient;
  config: RuntimeConfig;
  onFocusMemoryNode: (focus: MemoryFocus) => void;
}

/** Named pattern state buckets exposed by execution/introspect. */
const PATTERN_BUCKETS: Array<{
  key: keyof Pick<
    ExecutionIntrospectResponse,
    "trusted_patterns" | "candidate_patterns" | "contested_patterns"
  >;
  state: string;
}> = [
  { key: "trusted_patterns", state: "trusted" },
  { key: "candidate_patterns", state: "candidate" },
  { key: "contested_patterns", state: "contested" },
];

/**
 * Workflow buckets. `recommended_workflows` is a stable-grade recommendation;
 * `candidate_workflows` are observing candidates; `rehydration_candidates` are
 * workflows ready to be re-activated from cold storage.
 */
const WORKFLOW_BUCKETS: Array<{
  key: keyof Pick<
    ExecutionIntrospectResponse,
    "recommended_workflows" | "candidate_workflows" | "rehydration_candidates"
  >;
  state: string;
  title: string;
}> = [
  { key: "recommended_workflows", state: "stable", title: "Recommended (stable)" },
  {
    key: "candidate_workflows",
    state: "observing",
    title: "Candidate (observing)",
  },
  {
    key: "rehydration_candidates",
    state: "promotion_ready",
    title: "Rehydration candidates",
  },
];

export function PatternsTab({ client, config, onFocusMemoryNode }: PatternsTabProps) {
  const introspect = useAsync(
    () =>
      client.executionIntrospect({
        tenant_id: config.tenantId,
        scope: config.scope,
        limit: 50,
      }),
    [config.tenantId, config.scope],
    { intervalMs: 15_000 },
  );

  const response = (introspect.data ?? null) as ExecutionIntrospectResponse | null;
  const patternLifecycle = response?.pattern_lifecycle_summary ?? null;
  const workflowLifecycle = response?.workflow_lifecycle_summary ?? null;

  const patternBuckets = useMemo(() => collectPatternBuckets(response), [response]);
  const workflowBuckets = useMemo(() => collectWorkflowBuckets(response), [response]);
  const patternCount = patternBuckets.reduce((sum, b) => sum + b.items.length, 0);
  const workflowCount = workflowBuckets.reduce((sum, b) => sum + b.items.length, 0);

  return (
    <div class="flex flex-col gap-8">
      <Section
        title="Patterns"
        description="What Aionis has learned about tool choice, grouped by trust state."
        actions={
          <button type="button" class="btn" onClick={introspect.reload}>
            Refresh
          </button>
        }
      >
        <LifecycleStrip summary={patternLifecycle} kind="pattern" />
        {patternCount === 0 ? (
          introspect.status === "error" ? (
            <EmptyState
              title="Introspect failed"
              description={introspect.error.message}
            />
          ) : (
            <EmptyState
              title="No patterns yet"
              description="Record a few replay runs in this scope to see candidate → trusted transitions appear here."
              hint="aionis.memory.replay.run.start(...)"
            />
          )
        ) : (
          patternBuckets.map((bucket) =>
            bucket.items.length === 0 ? null : (
              <BucketBlock
                key={bucket.state}
                title={`${displayOf(bucket.state)} (${bucket.items.length})`}
                items={bucket.items}
                state={bucket.state}
                kind="pattern"
                onFocusMemoryNode={onFocusMemoryNode}
              />
            ),
          )
        )}
      </Section>

      <Section
        title="Workflows"
        description="Promotion lifecycle for multi-step workflow guidance."
      >
        <LifecycleStrip summary={workflowLifecycle} kind="workflow" />
        {workflowCount === 0 ? (
          <EmptyState
            title="No workflows yet"
            description="Workflows appear once the runtime has seen enough repeated replay runs to promote them."
          />
        ) : (
          workflowBuckets.map((bucket) =>
            bucket.items.length === 0 ? null : (
              <BucketBlock
                key={bucket.state}
                title={`${bucket.title} (${bucket.items.length})`}
                items={bucket.items}
                state={bucket.state}
                kind="workflow"
                onFocusMemoryNode={onFocusMemoryNode}
              />
            ),
          )
        )}
      </Section>
    </div>
  );
}

function BucketBlock({
  title,
  items,
  state,
  kind,
  onFocusMemoryNode,
}: {
  title: string;
  items: ExecutionPacketItem[];
  state: string;
  kind: "pattern" | "workflow";
  onFocusMemoryNode: (focus: MemoryFocus) => void;
}) {
  return (
    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold text-ink">{title}</h3>
        <StateBadge value={state} />
      </div>
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <PacketCard
            key={String(item.anchor_id ?? item.workflow_signature ?? item.uri)}
            item={item}
            kind={kind}
            onFocusMemoryNode={onFocusMemoryNode}
          />
        ))}
      </div>
    </div>
  );
}

function PacketCard({
  item,
  kind,
  onFocusMemoryNode,
}: {
  item: ExecutionPacketItem;
  kind: "pattern" | "workflow";
  onFocusMemoryNode: (focus: MemoryFocus) => void;
}) {
  const label = item.title ?? item.summary ?? item.anchor_id ?? "—";
  const state =
    typeof item.promotion_state === "string" ? item.promotion_state : null;
  const observed = Number(item.observed_count ?? 0);
  const required = Number(item.required_observations ?? 0);
  const progress =
    required > 0 ? Math.min(100, Math.round((observed / required) * 100)) : null;
  const anchorId =
    typeof item.anchor_id === "string" && item.anchor_id.length > 0
      ? item.anchor_id
      : null;

  const openInMemory = anchorId
    ? () =>
        onFocusMemoryNode({
          anchorId,
          origin: kind,
          label: typeof item.title === "string" ? item.title : undefined,
        })
    : null;

  return (
    <article class="card flex flex-col gap-3 transition hover:border-line-strong">
      <header class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div
            class="truncate text-sm font-semibold text-ink"
            title={String(label)}
          >
            {truncate(String(label), 80)}
          </div>
          <div class="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-ink0">
            <span>id {shortId(item.anchor_id)}</span>
            {openInMemory ? (
              <button
                type="button"
                class="rounded border border-line-strong/60 px-1.5 py-0.5 text-[10px] font-sans font-medium text-signal transition hover:border-signal/60 hover:text-signal-strong"
                onClick={openInMemory}
                title="Open the originating memory node in the Memory tab"
              >
                Open in Memory →
              </button>
            ) : null}
          </div>
        </div>
        {state ? <StateBadge value={state} /> : null}
      </header>

      {item.summary && item.summary !== item.title ? (
        <p class="text-xs text-text-2">{truncate(String(item.summary), 160)}</p>
      ) : null}

      <dl class="grid grid-cols-2 gap-2 text-[11px]">
        {kind === "workflow" ? (
          <>
            {item.file_path ? <Cell k="file" v={String(item.file_path)} /> : null}
            {item.next_action ? (
              <Cell k="next" v={truncate(String(item.next_action), 60)} />
            ) : null}
            {Array.isArray(item.target_files) && item.target_files.length > 0 ? (
              <Cell k="targets" v={`${item.target_files.length} file(s)`} />
            ) : null}
          </>
        ) : (
          <>
            {Array.isArray(item.tool_set) && item.tool_set.length > 0 ? (
              <Cell
                k="tools"
                v={item.tool_set.join(" → ")}
                mono
              />
            ) : null}
            {item.task_family ? <Cell k="task" v={String(item.task_family)} /> : null}
          </>
        )}
        {item.source_kind ? <Cell k="origin" v={String(item.source_kind)} /> : null}
        {item.maintenance_state ? (
          <Cell k="maintenance" v={String(item.maintenance_state)} />
        ) : null}
        {item.offline_priority ? (
          <Cell k="priority" v={String(item.offline_priority)} />
        ) : null}
        {typeof item.confidence === "number" ? (
          <Cell k="confidence" v={item.confidence.toFixed(3)} />
        ) : null}
      </dl>

      <footer class="flex items-center justify-between text-[11px] text-ink0">
        <span>
          observed {observed}
          {required > 0 ? ` / ${required}` : ""}
          {progress !== null ? ` (${progress}%)` : ""}
        </span>
        <span>
          {item.last_transition
            ? `${displayOf(item.last_transition)} · ${formatRelativeTime(
                item.last_transition_at ?? null,
              )}`
            : "—"}
        </span>
      </footer>

      <JsonView value={item} collapsed />
    </article>
  );
}

function Cell({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <div class="flex flex-col gap-0.5 rounded-md border border-line/70 bg-paper/40 px-2 py-1">
      <span class="text-[10px] uppercase tracking-wide text-ink0">{k}</span>
      <span
        class={`truncate text-[11px] ${mono ? "font-mono text-ink" : "text-ink/80"}`}
        title={v}
      >
        {v}
      </span>
    </div>
  );
}

function LifecycleStrip({
  summary,
  kind,
}: {
  summary: LifecycleSummary | null;
  kind: "pattern" | "workflow";
}) {
  if (!summary) return null;
  const entries: Array<{ label: string; value: number | undefined }> =
    kind === "pattern"
      ? [
          { label: "candidate", value: summary.candidate_count },
          { label: "trusted", value: summary.trusted_count },
          { label: "contested", value: summary.contested_count },
          { label: "near_promotion", value: summary.near_promotion_count },
          { label: "counter_evidence", value: summary.counter_evidence_open_count },
        ]
      : [
          { label: "candidate", value: summary.candidate_count },
          { label: "stable", value: summary.stable_count },
          { label: "promotion_ready", value: summary.promotion_ready_count },
          { label: "replay_source", value: summary.replay_source_count },
          { label: "rehydration_ready", value: summary.rehydration_ready_count },
        ];
  const visible = entries.filter((e) => typeof e.value === "number");
  if (visible.length === 0) return null;
  return (
    <div class="card flex flex-wrap items-center gap-3 text-[11px] text-text-2">
      {visible.map((e) => (
        <span key={e.label} class="flex items-center gap-1.5">
          <span class="text-ink0">{displayOf(e.label)}</span>
          <span class="rounded-md border border-line bg-paper-soft/70 px-1.5 py-0.5 font-mono text-[10px] text-ink">
            {e.value}
          </span>
        </span>
      ))}
    </div>
  );
}

function collectPatternBuckets(
  response: ExecutionIntrospectResponse | null,
): Array<{ state: string; items: ExecutionPacketItem[] }> {
  if (!response) return [];
  return PATTERN_BUCKETS.map((bucket) => ({
    state: bucket.state,
    items: normalizeItems(response[bucket.key] as unknown),
  }));
}

function collectWorkflowBuckets(
  response: ExecutionIntrospectResponse | null,
): Array<{ state: string; title: string; items: ExecutionPacketItem[] }> {
  if (!response) return [];
  return WORKFLOW_BUCKETS.map((bucket) => ({
    state: bucket.state,
    title: bucket.title,
    items: normalizeItems(response[bucket.key] as unknown),
  }));
}

function normalizeItems(value: unknown): ExecutionPacketItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ExecutionPacketItem =>
      item !== null && typeof item === "object",
  );
}

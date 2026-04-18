import { useEffect, useState } from "preact/hooks";
import type { AionisClient, HealthResponse, RequestLogEntry } from "../lib/aionis-client";
import { requestLog } from "../lib/aionis-client";
import type { RuntimeConfig } from "../lib/runtime-config";
import { useAsync } from "../lib/use-async";
import { formatDurationMs, formatRelativeTime } from "../lib/format";
import { EmptyState } from "../components/empty-state";
import { Section } from "../components/section";
import { JsonView } from "../components/json-view";
import { SeedPackButton } from "../components/seed-pack-button";

interface LiveTabProps {
  client: AionisClient;
  config: RuntimeConfig;
  health: HealthResponse | null;
  onConfigChange: (next: RuntimeConfig) => void;
}

export function LiveTab({ client, config, health, onConfigChange }: LiveTabProps) {
  const planning = useAsync(
    () =>
      client
        .planningContext({
          tenant_id: config.tenantId,
          scope: config.scope,
          query_text: "inspector:live-probe",
          context: { inspector: true },
        })
        .catch(() => null),
    [config.tenantId, config.scope],
    { intervalMs: 10_000 },
  );

  const [log, setLog] = useState<readonly RequestLogEntry[]>(requestLog.snapshot());

  useEffect(() => requestLog.subscribe(setLog), []);

  const runtimeSummary = summarizeHealth(health);

  return (
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Section title="Runtime identity" description="From /health on the connected Lite runtime.">
        <div class="card">
          {runtimeSummary.length > 0 ? (
            <dl>
              {runtimeSummary.map((row) => (
                <div class="kv-row" key={row.key}>
                  <dt class="kv-key">{row.key}</dt>
                  <dd class="kv-value" title={String(row.value)}>
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <EmptyState
              title="No runtime response yet"
              description="Inspector is waiting for the Lite runtime /health route. If Lite is not running locally, start it and re-apply the connection."
              hint="npm run lite:start"
            />
          )}
        </div>
      </Section>

      <Section
        title="Seed pack"
        description="One-click load of a sample pack so new installs have something to look at."
      >
        <div class="card">
          <SeedPackButton client={client} config={config} onConfigChange={onConfigChange} />
          <p class="mt-3 text-xs text-slate-500">
            The pack ships with the Inspector bundle (<code>seed-pack.json</code>). Imports land in an
            isolated scope so existing data is never overwritten. Regenerate from real recorded data
            with <code>npm --prefix apps/inspector run seed:generate</code>.
          </p>
        </div>
      </Section>

      <Section
        title="Planning context"
        description="Latest planning context response for the current tenant/scope."
        actions={
          <button type="button" class="btn" onClick={planning.reload}>
            Refresh
          </button>
        }
      >
        <div class="card">
          {planning.status === "success" && planning.data ? (
            <JsonView value={planning.data} />
          ) : planning.status === "error" ? (
            <EmptyState
              title="Planning context failed"
              description={planning.error.message}
              hint="This is expected if the scope has no recorded context yet."
            />
          ) : (
            <EmptyState
              title="Fetching planning context…"
              description="Polling /v1/memory/planning/context every 10s."
            />
          )}
        </div>
      </Section>

      <Section
        title="Recent SDK calls"
        description="In-browser log of requests this Inspector session has made. No server-side log is added."
      >
        <div class="card p-0">
          {log.length === 0 ? (
            <div class="p-4">
              <EmptyState
                title="No calls yet"
                description="Navigate to the other tabs to populate the request log."
              />
            </div>
          ) : (
            <table class="w-full border-collapse text-left text-xs">
              <thead class="text-slate-400">
                <tr class="border-b border-slate-800/80">
                  <th class="px-4 py-2 font-medium">When</th>
                  <th class="px-4 py-2 font-medium">Method</th>
                  <th class="px-4 py-2 font-medium">Route</th>
                  <th class="px-4 py-2 font-medium">Status</th>
                  <th class="px-4 py-2 font-medium">Duration</th>
                  <th class="px-4 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody class="font-mono">
                {log.map((entry) => (
                  <tr class="border-b border-slate-900 last:border-b-0" key={entry.id}>
                    <td class="px-4 py-2 text-slate-400">{formatRelativeTime(entry.startedAt)}</td>
                    <td class="px-4 py-2 text-slate-300">{entry.method}</td>
                    <td class="px-4 py-2 text-slate-100">{entry.route}</td>
                    <td class="px-4 py-2">
                      <span
                        class={
                          entry.status === null
                            ? "text-rose-300"
                            : entry.status >= 400
                              ? "text-orange-300"
                              : "text-emerald-300"
                        }
                      >
                        {entry.status ?? "ERR"}
                      </span>
                    </td>
                    <td class="px-4 py-2 text-slate-400">{formatDurationMs(entry.durationMs)}</td>
                    <td class="px-4 py-2 text-slate-400">
                      {entry.errorMessage ?? entry.summary ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Section>
    </div>
  );
}

interface SummaryRow {
  key: string;
  value: string;
}

function summarizeHealth(health: HealthResponse | null): SummaryRow[] {
  if (!health) return [];
  const rows: SummaryRow[] = [];

  const edition = (health.edition ?? health.runtime?.edition) as string | undefined;
  const mode = (health.mode ?? health.runtime?.mode) as string | undefined;
  const status = health.status ?? (health.ok === true ? "ok" : undefined);

  if (status) rows.push({ key: "Status", value: String(status) });
  if (edition) rows.push({ key: "Edition", value: String(edition) });
  if (mode) rows.push({ key: "Mode", value: String(mode) });

  if (health.storage?.path) rows.push({ key: "Storage", value: String(health.storage.path) });
  if (health.sandbox?.profile) rows.push({ key: "Sandbox profile", value: String(health.sandbox.profile) });
  if (health.sandbox?.state) rows.push({ key: "Sandbox state", value: String(health.sandbox.state) });

  if (typeof health.uptime_ms === "number") {
    rows.push({ key: "Uptime", value: formatDurationMs(health.uptime_ms) });
  }

  return rows;
}

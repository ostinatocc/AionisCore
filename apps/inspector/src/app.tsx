import { useCallback, useMemo, useState } from "preact/hooks";
import { createClient } from "./lib/aionis-client";
import type { HealthResponse } from "./lib/aionis-client";
import {
  loadRuntimeConfig,
  saveRuntimeConfig,
  type RuntimeConfig,
} from "./lib/runtime-config";
import { useAsync } from "./lib/use-async";
import { formatDurationMs } from "./lib/format";
import { ConnectionBar } from "./components/connection-bar";
import { LiveTab } from "./tabs/live-tab";
import { MemoryTab } from "./tabs/memory-tab";
import { PatternsTab } from "./tabs/patterns-tab";
import { PlaygroundTab } from "./tabs/playground-tab";

declare const __INSPECTOR_VERSION__: string;

type TabId = "live" | "memory" | "patterns" | "playground";

/**
 * A provenance jump from Patterns/Workflows into the Memory tab. The Patterns
 * tab knows the anchor_id of the node that produced a pattern/workflow; the
 * Memory tab uses it to filter + auto-select without forcing the user to copy
 * the UUID by hand.
 */
export interface MemoryFocus {
  anchorId: string;
  origin: "pattern" | "workflow";
  label?: string;
}

interface TabDef {
  id: TabId;
  label: string;
  description: string;
}

const TABS: TabDef[] = [
  { id: "live", label: "Live", description: "Runtime identity and recent calls" },
  { id: "memory", label: "Memory", description: "Nodes in the current scope" },
  {
    id: "patterns",
    label: "Patterns · Workflows",
    description: "What Aionis has learned",
  },
  { id: "playground", label: "Playground", description: "Call kickoff against this runtime" },
];

export function App() {
  const [config, setConfig] = useState<RuntimeConfig>(() => loadRuntimeConfig());
  const [tab, setTab] = useState<TabId>("live");
  const [memoryFocus, setMemoryFocus] = useState<MemoryFocus | null>(null);

  const client = useMemo(() => createClient(config), [config]);

  const health = useAsync(() => client.health().catch(() => null), [config.baseUrl], {
    intervalMs: 5_000,
  });

  const healthData = (health.data as HealthResponse | null) ?? null;
  const connected = healthData !== null;

  const handleConfigChange = useCallback((next: RuntimeConfig) => {
    saveRuntimeConfig(next);
    setConfig(next);
    // Switching scope/tenant makes any previous focus stale.
    setMemoryFocus(null);
  }, []);

  const handleFocusMemoryNode = useCallback((focus: MemoryFocus) => {
    setMemoryFocus(focus);
    setTab("memory");
  }, []);

  const handleClearMemoryFocus = useCallback(() => {
    setMemoryFocus(null);
  }, []);

  const runtimeLabel = formatRuntimeLabel(healthData, config);
  const uptimeLabel = healthData?.uptime_ms
    ? `up ${formatDurationMs(healthData.uptime_ms)}`
    : connected
      ? "up"
      : "unreachable";

  return (
    <div class="flex min-h-screen flex-col">
      <header class="border-b border-slate-800/80 bg-slate-950">
        <div class="flex items-center justify-between px-6 py-3">
          <div class="flex items-center gap-3">
            <LogoMark />
            <div class="leading-tight">
              <div class="text-sm font-semibold tracking-tight text-slate-100">
                Aionis Inspector
              </div>
              <div class="text-[11px] text-slate-500">
                local, read-only · v{__INSPECTOR_VERSION__}
              </div>
            </div>
          </div>
          <nav aria-label="tabs" class="flex flex-wrap items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                class={tabButtonClass(t.id === tab)}
                onClick={() => setTab(t.id)}
                title={t.description}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <ConnectionBar
          config={config}
          onChange={handleConfigChange}
          connected={connected}
          runtimeLabel={runtimeLabel}
          uptimeLabel={uptimeLabel}
        />
      </header>

      <main class="flex-1 px-6 py-6">
        {tab === "live" ? (
          <LiveTab
            client={client}
            config={config}
            health={healthData}
            onConfigChange={handleConfigChange}
          />
        ) : tab === "memory" ? (
          <MemoryTab
            client={client}
            config={config}
            focus={memoryFocus}
            onClearFocus={handleClearMemoryFocus}
          />
        ) : tab === "patterns" ? (
          <PatternsTab
            client={client}
            config={config}
            onFocusMemoryNode={handleFocusMemoryNode}
          />
        ) : (
          <PlaygroundTab client={client} config={config} />
        )}
      </main>

      <footer class="border-t border-slate-800/80 bg-slate-950 px-6 py-2 text-[11px] text-slate-500">
        Inspector is read-only. It calls the same public SDK surfaces external integrators use. No
        write, archive, or delete operations are exposed from this UI.
      </footer>
    </div>
  );
}

function tabButtonClass(active: boolean): string {
  const base =
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-sky-500/40";
  if (active) return `${base} bg-slate-800 text-slate-50`;
  return `${base} text-slate-400 hover:bg-slate-900 hover:text-slate-100`;
}

function formatRuntimeLabel(health: HealthResponse | null, config: RuntimeConfig): string {
  const origin = config.baseUrl.length > 0 ? config.baseUrl : "same-origin";
  if (!health) return origin;
  const edition = health.edition ?? health.runtime?.edition;
  const mode = health.mode ?? health.runtime?.mode;
  const tail = [edition, mode].filter(Boolean).join("·");
  return tail ? `${origin} · ${tail}` : origin;
}

function LogoMark() {
  return (
    <span
      aria-hidden="true"
      class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 ring-1 ring-inset ring-slate-700"
    >
      <svg viewBox="0 0 24 24" class="h-4 w-4 text-sky-400" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 19 L12 5 L19 19 M7.5 14 L16.5 14" />
      </svg>
    </span>
  );
}

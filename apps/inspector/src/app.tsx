import { useCallback, useMemo, useState } from "preact/hooks";
import { LogoMark } from "@aionis/ui-kit/components";
import { formatDurationMs } from "@aionis/ui-kit/lib";
import { createClient } from "./lib/aionis-client";
import type { HealthResponse } from "./lib/aionis-client";
import {
  loadRuntimeConfig,
  saveRuntimeConfig,
  type RuntimeConfig,
} from "./lib/runtime-config";
import { useAsync } from "./lib/use-async";
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
    <div class="flex min-h-screen flex-col bg-paper text-ink">
      <header class="border-b border-line bg-paper">
        <div class="flex items-center justify-between px-6 py-3">
          <div class="flex items-center gap-3">
            <span class="flex h-9 w-9 items-center justify-center rounded-card border border-line bg-paper-soft text-signal">
              <LogoMark size={18} stroke="currentColor" />
            </span>
            <div class="leading-tight">
              <div class="text-[15px] font-medium tracking-tight text-ink no-transform">
                Aionis Inspector
              </div>
              <div class="font-mono text-[11px] text-text-3 no-transform">
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
                <span class="no-transform">{t.label}</span>
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

      <footer class="border-t border-line bg-paper px-6 py-2 font-mono text-[11px] text-text-3 no-transform">
        Inspector is read-only. It calls the same public SDK surfaces external integrators use. No
        write, archive, or delete operations are exposed from this UI.
      </footer>
    </div>
  );
}

function tabButtonClass(active: boolean): string {
  return active ? "tab-button tab-button-active" : "tab-button";
}

function formatRuntimeLabel(health: HealthResponse | null, config: RuntimeConfig): string {
  const origin = config.baseUrl.length > 0 ? config.baseUrl : "same-origin";
  if (!health) return origin;
  const edition = health.edition ?? health.runtime?.edition;
  const mode = health.mode ?? health.runtime?.mode;
  const tail = [edition, mode].filter(Boolean).join("·");
  return tail ? `${origin} · ${tail}` : origin;
}

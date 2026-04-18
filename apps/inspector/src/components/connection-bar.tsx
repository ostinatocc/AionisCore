import { useEffect, useState } from "preact/hooks";
import type { RuntimeConfig } from "../lib/runtime-config";

interface ConnectionBarProps {
  config: RuntimeConfig;
  onChange: (next: RuntimeConfig) => void;
  connected: boolean;
  runtimeLabel: string;
  uptimeLabel: string;
}

export function ConnectionBar({
  config,
  onChange,
  connected,
  runtimeLabel,
  uptimeLabel,
}: ConnectionBarProps) {
  const [draft, setDraft] = useState(config);

  // Keep the draft in sync when `config` is mutated outside this form (for
  // example when the seed-pack button switches scopes). Without this effect
  // the inputs would keep showing the old scope even though the rest of the
  // app has already moved on.
  useEffect(() => {
    setDraft(config);
  }, [config.baseUrl, config.tenantId, config.scope]);

  const dirty =
    draft.baseUrl !== config.baseUrl ||
    draft.tenantId !== config.tenantId ||
    draft.scope !== config.scope;

  return (
    <form
      class="flex flex-wrap items-end gap-3 border-b border-slate-800/80 bg-slate-950/70 px-6 py-3 backdrop-blur"
      onSubmit={(e) => {
        e.preventDefault();
        onChange(draft);
      }}
    >
      <div class="flex items-center gap-2">
        <span
          aria-hidden="true"
          class={`h-2.5 w-2.5 rounded-full ${
            connected ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" : "bg-rose-500"
          }`}
        />
        <div class="flex flex-col leading-tight">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-300">
            {connected ? "Connected" : "Disconnected"}
          </span>
          <span class="font-mono text-[11px] text-slate-500">
            {runtimeLabel} · {uptimeLabel}
          </span>
        </div>
      </div>

      <label class="flex-1 min-w-[180px]">
        <span class="field-label">Runtime origin</span>
        <input
          class="field-input"
          placeholder="(same origin)"
          value={draft.baseUrl}
          onInput={(e) => setDraft({ ...draft, baseUrl: (e.target as HTMLInputElement).value })}
        />
      </label>

      <label class="w-36">
        <span class="field-label">Tenant</span>
        <input
          class="field-input"
          value={draft.tenantId}
          onInput={(e) => setDraft({ ...draft, tenantId: (e.target as HTMLInputElement).value })}
        />
      </label>

      <label class="w-60">
        <span class="field-label">Scope</span>
        <input
          class="field-input"
          value={draft.scope}
          onInput={(e) => setDraft({ ...draft, scope: (e.target as HTMLInputElement).value })}
        />
      </label>

      <button type="submit" class={`btn ${dirty ? "btn-primary" : ""}`} disabled={!dirty}>
        Apply
      </button>
    </form>
  );
}

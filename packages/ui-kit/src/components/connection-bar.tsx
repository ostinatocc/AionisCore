import { useEffect, useState } from "preact/hooks";

export interface ConnectionConfig {
  baseUrl: string;
  tenantId: string;
  scope: string;
}

export interface ConnectionBarProps {
  config: ConnectionConfig;
  onChange: (next: ConnectionConfig) => void;
  connected: boolean;
  runtimeLabel?: string;
  uptimeLabel?: string;
  className?: string;
  /** Hide the base-url input (Workbench daemon always lives at 127.0.0.1). */
  lockBaseUrl?: boolean;
}

/**
 * Connection strip used at the top of Inspector / Workbench UI. VI-compliant:
 * paper surface, subtle line border, serif copy for status, mono for values.
 */
export function ConnectionBar({
  config,
  onChange,
  connected,
  runtimeLabel,
  uptimeLabel,
  className = "",
  lockBaseUrl = false,
}: ConnectionBarProps) {
  const [draft, setDraft] = useState(config);

  useEffect(() => {
    setDraft(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.baseUrl, config.tenantId, config.scope]);

  const dirty =
    draft.baseUrl !== config.baseUrl ||
    draft.tenantId !== config.tenantId ||
    draft.scope !== config.scope;

  return (
    <form
      class={`flex flex-wrap items-end gap-3 border-b border-line bg-paper px-6 py-3 ${className}`.trim()}
      onSubmit={(e) => {
        e.preventDefault();
        onChange(draft);
      }}
    >
      <div class="flex items-center gap-2">
        <span
          aria-hidden="true"
          class={`h-2 w-2 rounded-full ${connected ? "bg-trusted" : "bg-contested"}`}
        />
        <div class="flex flex-col leading-tight">
          <span class="text-sm font-medium text-ink no-transform">
            {connected ? "Connected" : "Disconnected"}
          </span>
          <span class="font-mono text-[11px] text-text-3 no-transform">
            {(runtimeLabel ?? "-") + (uptimeLabel ? ` · ${uptimeLabel}` : "")}
          </span>
        </div>
      </div>

      {!lockBaseUrl ? (
        <label class="min-w-[180px] flex-1">
          <span class="field-label no-transform">runtime origin</span>
          <input
            class="field-input"
            placeholder="(same origin)"
            value={draft.baseUrl}
            onInput={(e) => setDraft({ ...draft, baseUrl: (e.target as HTMLInputElement).value })}
          />
        </label>
      ) : null}

      <label class="w-40">
        <span class="field-label no-transform">tenant</span>
        <input
          class="field-input"
          value={draft.tenantId}
          onInput={(e) => setDraft({ ...draft, tenantId: (e.target as HTMLInputElement).value })}
        />
      </label>

      <label class="w-60">
        <span class="field-label no-transform">scope</span>
        <input
          class="field-input"
          value={draft.scope}
          onInput={(e) => setDraft({ ...draft, scope: (e.target as HTMLInputElement).value })}
        />
      </label>

      <button type="submit" class={`btn ${dirty ? "btn-primary" : "btn-alt"}`} disabled={!dirty}>
        <span class="no-transform">apply</span>
      </button>
    </form>
  );
}

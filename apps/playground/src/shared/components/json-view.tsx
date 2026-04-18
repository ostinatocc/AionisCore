/**
 * Vendored from `apps/inspector/src/components/json-view.tsx`, then restyled
 * for the Playground against Aionis Visual Identity v1 (paper surface, ink
 * text, JB Mono, no all-caps, no shadow).
 */

import { useState } from "preact/hooks";

interface JsonViewProps {
  value: unknown;
  collapsed?: boolean;
  maxHeight?: number;
}

export function JsonView({
  value,
  collapsed = true,
  maxHeight = 320,
}: JsonViewProps) {
  const [open, setOpen] = useState(!collapsed);
  const text = safeStringify(value);
  const preview = text.length > 120 ? `${text.slice(0, 119)}…` : text;

  return (
    <div class="rounded-card border border-line bg-paper-sink">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left font-mono text-[11px] text-text-2 transition-colors duration-link hover:text-ink"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? "▼ raw JSON" : "▶ raw JSON"}</span>
        {!open ? (
          <span class="truncate text-text-3">{preview}</span>
        ) : null}
      </button>
      {open ? (
        <pre
          class="w-full overflow-x-auto px-3 pb-3 font-mono text-[11px] leading-[1.65] text-ink"
          style={{ maxHeight: `${maxHeight}px` }}
        >
{text}
        </pre>
      ) : null}
    </div>
  );
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

import { useState } from "preact/hooks";
import { safeStringify } from "../lib/format.js";

export interface JsonViewProps {
  value: unknown;
  collapsed?: boolean;
  maxHeight?: number;
  label?: string;
  className?: string;
}

export function JsonView({
  value,
  collapsed = true,
  maxHeight = 320,
  label = "raw JSON",
  className = "",
}: JsonViewProps) {
  const [open, setOpen] = useState(!collapsed);
  const text = safeStringify(value);
  const preview = text.length > 120 ? `${text.slice(0, 119)}…` : text;

  return (
    <div class={`rounded-card border border-line bg-paper-soft ${className}`.trim()}>
      <button
        type="button"
        class="flex w-full items-center justify-between gap-4 rounded-card px-3 py-1.5 text-left text-xs text-text-2 transition-colors duration-hover hover:text-ink"
        onClick={() => setOpen((v) => !v)}
      >
        <span class="font-mono text-[11px] no-transform">
          {open ? "▼" : "▶"} {label}
        </span>
        {!open ? (
          <span class="truncate font-mono text-[11px] text-text-3">{preview}</span>
        ) : null}
      </button>
      {open ? (
        <pre
          class="scroll-area w-full overflow-x-auto px-3 pb-3 font-mono text-[11px] leading-relaxed text-ink"
          style={{ maxHeight: `${maxHeight}px` }}
        >
{text}
        </pre>
      ) : null}
    </div>
  );
}

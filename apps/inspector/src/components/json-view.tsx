import { useState } from "preact/hooks";

interface JsonViewProps {
  value: unknown;
  collapsed?: boolean;
  maxHeight?: number;
}

export function JsonView({ value, collapsed = true, maxHeight = 320 }: JsonViewProps) {
  const [open, setOpen] = useState(!collapsed);
  const text = safeStringify(value);
  const preview = text.length > 120 ? `${text.slice(0, 119)}…` : text;

  return (
    <div class="rounded-md border border-slate-800 bg-slate-950/50">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-xs text-slate-400 hover:text-slate-200"
        onClick={() => setOpen((v) => !v)}
      >
        <span class="font-mono text-[11px]">{open ? "▼ raw JSON" : "▶ raw JSON"}</span>
        {!open ? <span class="truncate font-mono text-[11px] text-slate-500">{preview}</span> : null}
      </button>
      {open ? (
        <pre
          class="scroll-area w-full overflow-x-auto px-3 pb-3 font-mono text-[11px] leading-relaxed text-slate-300"
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

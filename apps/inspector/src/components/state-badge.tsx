import { alias, type AliasEntry } from "../lib/alias";

interface StateBadgeProps {
  value: string | null | undefined;
  showInternal?: boolean;
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<AliasEntry["tone"]> | "neutral", string> = {
  trusted: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
  candidate: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  contested: "border-orange-400/40 bg-orange-500/10 text-orange-200",
  governed: "border-purple-400/40 bg-purple-500/10 text-purple-200",
  shadow: "border-slate-400/40 bg-slate-500/10 text-slate-300",
  neutral: "border-slate-600/60 bg-slate-800 text-slate-300",
};

export function StateBadge({ value, showInternal = false, className = "" }: StateBadgeProps) {
  const entry = alias(value);
  const tone = entry.tone ?? "neutral";
  return (
    <span
      class={`pill ${TONE_CLASSES[tone]} ${className}`.trim()}
      title={entry.internal || entry.display}
    >
      <span aria-hidden="true" class="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      <span>{entry.display}</span>
      {showInternal && entry.internal && entry.internal !== entry.display ? (
        <span class="ml-1 font-mono text-[10px] text-current/70">({entry.internal})</span>
      ) : null}
    </span>
  );
}

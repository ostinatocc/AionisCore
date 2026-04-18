import { alias, type AliasEntry, type BadgeTone, normalizeBadgeTone } from "../lib/alias.js";

export interface StateBadgeProps {
  value: string | null | undefined;
  showInternal?: boolean;
  className?: string;
  /** Optional explicit tone override. Defaults to tone derived from `value`. */
  tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  trusted: "border-trusted-line bg-trusted-wash text-trusted",
  candidate: "border-candidate-line bg-candidate-wash text-candidate",
  contested: "border-contested-line bg-contested-wash text-contested",
  governed: "border-governed-line bg-governed-wash text-governed",
  neutral: "border-line bg-paper-sink text-text-2",
};

export function StateBadge({ value, showInternal = false, className = "", tone }: StateBadgeProps) {
  const entry: AliasEntry = alias(value);
  const resolvedTone = tone ?? normalizeBadgeTone(entry.tone);
  const toneClasses = TONE_CLASSES[resolvedTone];
  return (
    <span
      class={`pill ${toneClasses} ${className}`.trim()}
      title={entry.internal || entry.display}
    >
      <span aria-hidden="true" class="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      <span class="no-transform">{entry.display}</span>
      {showInternal && entry.internal && entry.internal !== entry.display ? (
        <span class="ml-1 font-mono text-[10px] opacity-70">({entry.internal})</span>
      ) : null}
    </span>
  );
}

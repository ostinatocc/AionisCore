import type { ComponentChildren } from "preact";

export type DiffTone = "signal" | "trusted" | "contested" | "candidate" | "neutral";

export interface DiffCalloutProps {
  kicker?: string;
  title: string;
  children?: ComponentChildren;
  tone?: DiffTone;
  className?: string;
}

const TONE_BG: Record<DiffTone, string> = {
  signal: "bg-signal-wash border-signal/30",
  trusted: "bg-trusted-wash border-trusted-line",
  contested: "bg-contested-wash border-contested-line",
  candidate: "bg-candidate-wash border-candidate-line",
  neutral: "bg-paper-soft border-line",
};

/**
 * Small highlight card used to call out the delta between two runs / states.
 * E.g. "Run 2 reused trusted memory → saved 4 tool calls".
 */
export function DiffCallout({ kicker, title, children, tone = "signal", className = "" }: DiffCalloutProps) {
  return (
    <div class={`rounded-card border px-4 py-3 ${TONE_BG[tone]} ${className}`.trim()}>
      {kicker ? (
        <div class="kicker no-transform text-ink/70">{kicker}</div>
      ) : null}
      <div class="mt-1 text-[15px] font-medium text-ink no-transform">{title}</div>
      {children ? <div class="mt-2 text-sm text-text-2 no-transform">{children}</div> : null}
    </div>
  );
}

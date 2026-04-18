import type { ComponentChildren } from "preact";

export interface PillProps {
  children: ComponentChildren;
  interactive?: boolean;
  className?: string;
  title?: string;
}

/**
 * Neutral container pill. For runtime-state pills use `StateBadge` instead
 * so tone normalization is applied.
 */
export function Pill({ children, interactive = false, className = "", title }: PillProps) {
  const classes = interactive ? "pill pill-interactive" : "pill";
  return (
    <span class={`${classes} ${className}`.trim()} title={title}>
      <span class="no-transform">{children}</span>
    </span>
  );
}

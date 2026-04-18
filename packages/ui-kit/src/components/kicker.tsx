import type { ComponentChildren } from "preact";

export interface KickerProps {
  children: ComponentChildren;
  className?: string;
}

/**
 * Monospace kicker label. Lowercase per VI §4.3 — never apply `uppercase`
 * here. Use as eyebrow copy above section headings, above a metric, etc.
 */
export function Kicker({ children, className = "" }: KickerProps) {
  return <span class={`kicker no-transform ${className}`.trim()}>{children}</span>;
}

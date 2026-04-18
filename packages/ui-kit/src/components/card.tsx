import type { ComponentChildren } from "preact";

export type CardTone = "default" | "soft" | "interactive";

export interface CardProps {
  tone?: CardTone;
  as?: "div" | "section" | "article" | "aside";
  children: ComponentChildren;
  className?: string;
}

const TONE_CLASS: Record<CardTone, string> = {
  default: "card",
  soft: "card-soft",
  interactive: "card card-interactive",
};

/**
 * VI §6: 10px radius, 1px line border, paper fill, no shadow. The
 * `interactive` tone adds a subtle signal-wash on hover plus a 1px lift.
 */
export function Card({ tone = "default", as = "div", children, className = "" }: CardProps) {
  const Tag = as as unknown as string;
  const baseClass = `${TONE_CLASS[tone]} ${className}`.trim();
  // preact expects a component or string tag name; the cast above is safe
  // because we only accept the four block-level tags declared in the union.
  return (
    // @ts-expect-error preact does allow string tags at runtime
    <Tag class={baseClass}>{children}</Tag>
  );
}

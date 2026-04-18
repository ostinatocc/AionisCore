import type { ComponentChildren } from "preact";

export interface SectionProps {
  title: string;
  description?: string;
  kicker?: string;
  actions?: ComponentChildren;
  children: ComponentChildren;
  className?: string;
}

/**
 * Standard section heading block. Kicker renders as JB Mono 11px, section
 * title is Newsreader serif. No uppercase anywhere (VI §4.3).
 */
export function Section({ title, description, kicker, actions, children, className = "" }: SectionProps) {
  return (
    <section class={`flex flex-col gap-4 ${className}`.trim()}>
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="flex flex-col gap-1">
          {kicker ? <span class="kicker no-transform">{kicker}</span> : null}
          <h2 class="text-[22px] font-medium tracking-tight text-ink no-transform">{title}</h2>
          {description ? (
            <p class="mt-1 max-w-[60ch] text-[15px] text-text-2 no-transform">{description}</p>
          ) : null}
        </div>
        {actions ? <div class="flex items-center gap-2">{actions}</div> : null}
      </header>
      <div>{children}</div>
    </section>
  );
}

import type { ComponentChildren } from "preact";

interface SectionProps {
  title: string;
  description?: string;
  actions?: ComponentChildren;
  children: ComponentChildren;
}

export function Section({ title, description, actions, children }: SectionProps) {
  return (
    <section class="flex flex-col gap-3">
      <header class="flex items-end justify-between gap-4">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">{title}</h2>
          {description ? <p class="mt-1 text-xs text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div class="flex items-center gap-2">{actions}</div> : null}
      </header>
      <div>{children}</div>
    </section>
  );
}

import type { ComponentChildren } from "preact";

export interface EmptyStateProps {
  title: string;
  description?: string;
  hint?: string;
  action?: ComponentChildren;
  className?: string;
}

export function EmptyState({ title, description, hint, action, className = "" }: EmptyStateProps) {
  return (
    <div class={`card flex flex-col items-start gap-3 border-dashed ${className}`.trim()}>
      <div class="flex items-center gap-2 text-ink">
        <span aria-hidden="true" class="text-lg text-signal">◎</span>
        <span class="text-[15px] font-medium no-transform">{title}</span>
      </div>
      {description ? (
        <p class="text-sm text-text-2 no-transform">{description}</p>
      ) : null}
      {hint ? (
        <pre class="w-full overflow-x-auto rounded-card border border-line bg-paper-soft px-3 py-2 font-mono text-xs text-ink">
{hint}
        </pre>
      ) : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}

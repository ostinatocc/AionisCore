import type { ComponentChildren } from "preact";

interface EmptyStateProps {
  title: string;
  description?: string;
  hint?: string;
  action?: ComponentChildren;
}

export function EmptyState({ title, description, hint, action }: EmptyStateProps) {
  return (
    <div class="card flex flex-col items-start gap-3 border-dashed">
      <div class="flex items-center gap-2 text-slate-200">
        <span aria-hidden="true" class="text-lg">◎</span>
        <span class="text-sm font-semibold tracking-tight">{title}</span>
      </div>
      {description ? <p class="text-sm text-slate-400">{description}</p> : null}
      {hint ? (
        <pre class="w-full overflow-x-auto rounded-md bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-300">
{hint}
        </pre>
      ) : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}

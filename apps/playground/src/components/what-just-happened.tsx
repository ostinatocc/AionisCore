/**
 * "What just happened" — narrated trace of the comparison above.
 *
 * VI §4.3 bans uppercase in UI, so the section kicker lives as lowercase JB
 * Mono 11px (see `.kicker` in styles.css). Inline scope ids render in the
 * `.code-inline` treatment (paper-sink fill, no background pop).
 */
export function WhatJustHappened() {
  return (
    <section class="mx-auto w-full max-w-5xl px-6 pb-10">
      <div class="card flex flex-col gap-4">
        <span class="kicker">What just happened</span>
        <ol class="list-decimal space-y-2.5 pl-5 text-[14px] leading-[1.7] text-ink marker:text-text-3 marker:font-mono">
          <li>
            Your browser sent the same task description to two Aionis Lite
            scopes in parallel:{" "}
            <code class="code-inline">playground:before</code> (never
            executed) and{" "}
            <code class="code-inline">playground:demo</code> (seeded with one
            real execution from a workflow pack).
          </li>
          <li>
            On the <strong class="text-ink">empty scope</strong>, Aionis has
            nothing to replay and falls back to a pure tool-selection
            heuristic. You see{" "}
            <code class="code-inline">history_applied: false</code> and a
            generic next action.
          </li>
          <li>
            On the <strong class="text-ink">seeded scope</strong>, Aionis
            matches your query against workflows it has observed, using plain
            token overlap — no model, no embeddings. It replays the real{" "}
            <code class="code-inline">file_path</code> and expected outcome
            from the last successful run.
          </li>
          <li>
            That is the entire trick:{" "}
            <strong class="text-ink">one committed execution</strong> turns
            every subsequent kickoff from a guess into a replay. When you
            plug Aionis into an agent host, the second time the agent sees a
            task like this, it starts from the right action instead of
            exploring from zero.
          </li>
        </ol>
        <p class="text-[12px] leading-[1.6] text-text-3">
          Everything you see above is a real response from{" "}
          <code class="code-inline">cloud.aionisos.com</code>, a public
          Aionis Lite instance. The adapter strictly exposes{" "}
          <code class="code-inline">/health</code> and{" "}
          <code class="code-inline">/v1/memory/kickoff/recommendation</code>{" "}
          — every other route returns 404. No visitor data is written.
        </p>
      </div>
    </section>
  );
}

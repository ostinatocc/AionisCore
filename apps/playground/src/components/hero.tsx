interface HeroProps {
  onPrimaryClick: () => void;
}

/**
 * Top-of-page hero.
 *
 * Voice: Aionis Visual Identity §1 — precise, quiet, continuous. No emoji, no
 * marketing superlatives, no uppercase. The hero brand name is the one place
 * italic display is allowed (§4.2), so the accent line borrows that affordance
 * to land as a quiet assertion rather than a slogan.
 */
export function Hero({ onPrimaryClick }: HeroProps) {
  return (
    <section class="mx-auto w-full max-w-5xl px-6 pt-20 pb-10 sm:pt-28">
      <div class="flex flex-col gap-6">
        <div class="inline-flex items-center gap-2 self-start rounded-full border border-signal/25 bg-signal-wash px-3 py-[5px] font-mono text-[11px] text-signal-strong">
          <span
            class="h-1.5 w-1.5 rounded-full bg-signal"
            aria-hidden="true"
          />
          <span class="tracking-[0.02em]">
            Aionis Runtime · public preview
          </span>
        </div>
        <h1
          class="text-balance-hero text-[clamp(2.4rem,4.2vw,3.2rem)] leading-[1.08] text-ink"
          style={{
            fontVariationSettings: "\"opsz\" 72, \"wght\" 450",
            letterSpacing: "-0.03em",
          }}
        >
          Same task, asked twice.
          <br class="hidden sm:block" />
          <span
            class="text-signal"
            style={{
              fontStyle: "italic",
              fontVariationSettings: "\"opsz\" 72, \"wght\" 400",
              letterSpacing: "-0.02em",
            }}
          >
            The second answer is never a guess.
          </span>
        </h1>
        <p
          class="measure text-[1.06rem] leading-[1.7] text-text-2"
          style={{ fontVariationSettings: "\"opsz\" 18, \"wght\" 400" }}
        >
          Aionis turns every agent execution into durable memory. The next
          time a similar task arrives, it replays the real first action — the
          file, the outcome, the workflow — instead of starting from a
          heuristic. No model call. No prompt. No vector search.
        </p>
        <p class="measure text-[1rem] leading-[1.7] text-text-3">
          Below, your task description is sent to two identical Aionis scopes:
          one that has never run the work, and one that has. Watch the
          difference appear in real time.
        </p>
        <div class="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            class="btn btn-primary"
            onClick={onPrimaryClick}
          >
            Try it now
          </button>
          <a
            class="btn btn-alt"
            href="https://github.com/ostinatocc/AionisCore"
            target="_blank"
            rel="noreferrer noopener"
          >
            Read the repo
          </a>
        </div>
      </div>
    </section>
  );
}

interface FooterProps {
  scope: string;
  apiUrl: string;
}

/**
 * Footer — quiet trust strip at the bottom of the page.
 *
 * Per VI §6 "Trust strip": JB Mono 12px, text-3, 1px × 12px vertical dividers
 * between items. We avoid a page-wide rule or heavy fill so the footer reads
 * as continuation of the paper surface rather than a separate chrome bar.
 */
export function Footer({ scope, apiUrl }: FooterProps) {
  return (
    <footer class="mt-auto border-t border-line bg-paper-soft px-6 py-10">
      <div class="mx-auto flex w-full max-w-4xl flex-col gap-3">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span
            class="text-[14px] text-ink"
            style={{ fontVariationSettings: "\"opsz\" 18, \"wght\" 500" }}
          >
            Aionis Playground
          </span>
          <span class="h-3 w-px bg-line-strong" aria-hidden="true" />
          <a
            class="text-link text-[14px]"
            href="https://github.com/ostinatocc/AionisCore"
            target="_blank"
            rel="noreferrer noopener"
          >
            GitHub
          </a>
          <a
            class="text-link text-[14px]"
            href="https://github.com/ostinatocc/AionisCore/tree/main/docs"
            target="_blank"
            rel="noreferrer noopener"
          >
            Docs
          </a>
        </div>
        <div class="font-mono text-[12px] leading-[1.6] text-text-3">
          Public read-only demo · scope{" "}
          <code class="text-text-2">{scope}</code> · backend{" "}
          <code class="text-text-2">{apiUrl}</code>
        </div>
      </div>
    </footer>
  );
}

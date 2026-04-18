import { useState } from "preact/hooks";

const INSTALL_COMMAND = "npm install @ostinato/aionis";

/**
 * Install block — the handoff from "watch it work" to "run it yourself".
 *
 * VI §6 "Install line" reads as a line of prose (`$` prefix in text-3, command
 * in ink, no box). We preserve that inside a card so the block has structure
 * on the page, but the install line itself stays typographically quiet.
 */
export function InstallBlock() {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section class="mx-auto w-full max-w-4xl px-6 pb-14">
      <div class="card flex flex-col gap-5">
        <div class="flex flex-col gap-1.5">
          <span class="kicker">Run this locally</span>
          <h2
            class="text-[1.18rem] leading-[1.3] text-ink"
            style={{
              fontVariationSettings: "\"opsz\" 32, \"wght\" 500",
              letterSpacing: "-0.012em",
            }}
          >
            Install Aionis in your own agent
          </h2>
          <p class="text-[14px] leading-[1.65] text-text-2">
            The same runtime behind this page ships as an npm package. The
            Inspector is the local read-only UI that pairs with it.
          </p>
        </div>
        <div class="flex items-stretch gap-2">
          <pre class="flex-1 overflow-x-auto rounded-card border border-line bg-paper-sink px-4 py-3 font-mono text-[13px] text-ink">
            <span class="text-text-3">$</span> {INSTALL_COMMAND}
          </pre>
          <button
            type="button"
            class="btn btn-alt"
            onClick={onCopy}
            title="Copy to clipboard"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div class="flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
          <a
            class="text-link"
            href="https://github.com/ostinatocc/AionisCore/tree/main/apps/inspector"
            target="_blank"
            rel="noreferrer noopener"
          >
            Run the Inspector locally
          </a>
          <a
            class="text-link"
            href="https://github.com/ostinatocc/AionisCore#quick-start"
            target="_blank"
            rel="noreferrer noopener"
          >
            SDK quickstart
          </a>
        </div>
      </div>
    </section>
  );
}

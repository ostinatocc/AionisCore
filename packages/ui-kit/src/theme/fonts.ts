/**
 * Brand font stacks exported as constants so host HTML files can preload the
 * correct faces without duplicating the VI list.
 *
 * Aionis surfaces are local-first or privacy-sensitive. The default path is
 * therefore to rely on the fallback stacks declared below — these are all
 * widely available system serif / monospace faces that land inside VI-safe
 * x-height and proportion bands.
 *
 * If you need brand-grade Newsreader or JetBrains Mono in a hosted context:
 *
 *   1. Download the woff2 files once (Newsreader is OFL, JetBrains Mono is
 *      OFL — both redistributable). Drop them into your app's static assets,
 *      e.g. `apps/<surface>/public/fonts/`.
 *   2. Emit `@font-face` rules from a bundled stylesheet so the browser
 *      never reaches out to a third-party CDN.
 *
 * Never link `https://fonts.googleapis.com/...` directly in a hosted
 * `index.html`: it blocks first paint in regions where the CDN is slow or
 * blocked (notably mainland China) and it leaks user traffic to a
 * third-party.
 */

export const NEWSREADER_FAMILY = [
  "Newsreader",
  "Iowan Old Style",
  "Palatino Linotype",
  "Georgia",
  "serif",
] as const;

export const JETBRAINS_MONO_FAMILY = [
  "JetBrains Mono",
  "SFMono-Regular",
  "ui-monospace",
  "Menlo",
  "monospace",
] as const;

/**
 * Minimum Newsreader variable axes the UI relies on. If your loader is not
 * variable, ship these static weights: 400, 500.
 */
export const NEWSREADER_AXES = {
  opsz: { min: 6, max: 72 },
  wght: { min: 400, max: 500 },
} as const;

/**
 * Reference CSS you can use *if* you are self-hosting the woff2 files. This
 * is not applied anywhere by default — it exists so host apps have one
 * canonical @font-face snippet instead of each surface inventing its own.
 *
 * Expected layout after self-hosting:
 *   <public-root>/fonts/newsreader-variable.woff2
 *   <public-root>/fonts/jetbrains-mono-variable.woff2
 */
export const AIONIS_SELF_HOSTED_FONT_FACE_CSS = `
@font-face {
  font-family: "Newsreader";
  src: url("/fonts/newsreader-variable.woff2") format("woff2-variations"),
       url("/fonts/newsreader-variable.woff2") format("woff2");
  font-weight: 400 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "JetBrains Mono";
  src: url("/fonts/jetbrains-mono-variable.woff2") format("woff2-variations"),
       url("/fonts/jetbrains-mono-variable.woff2") format("woff2");
  font-weight: 400 600;
  font-style: normal;
  font-display: swap;
}
`.trim();

/**
 * @aionis/ui-kit — Tailwind preset.
 *
 * Mirrors docs/AIONIS_BRAND_VISUAL_IDENTITY_V1.md §3 Color, §4 Typography,
 * §5 Corner scale, §10 Code tokens. When the VI document changes, this file
 * is the first follower. Consumers do:
 *
 *   import aionis from "@aionis/ui-kit/theme/tailwind-preset";
 *   export default { presets: [aionis], content: [...] };
 *
 * Rules we enforce by construction:
 *  - Body font defaults to Newsreader serif (Tailwind `font-sans` slot maps
 *    onto the brand face), so any stock utility lands on-brand.
 *  - The single accent color is `signal` (Morandi dusty violet). State colors
 *    (trusted / candidate / contested / governed / shadow) carry runtime
 *    meaning only — never generic success/warning/error chrome.
 *  - `line` / `line-strong` are pre-alpha'd against ink so borders sit on any
 *    paper variant without re-tinting.
 */

/** @type {import('tailwindcss').Config} */
const preset = {
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#f6f3ea",
          soft: "#ede8db",
          sink: "#e2dccd",
        },
        ink: {
          DEFAULT: "#2a2620",
          soft: "#4a4338",
        },
        "text-2": "#6b6358",
        "text-3": "#9a948a",
        signal: {
          DEFAULT: "#7a6fa4",
          strong: "#5e5484",
          soft: "#aba2c8",
          deep: "#352e4d",
          wash: "rgba(122, 111, 164, 0.10)",
        },
        trusted: {
          DEFAULT: "#8ba392",
          wash: "rgba(139, 163, 146, 0.14)",
          line: "rgba(139, 163, 146, 0.40)",
        },
        candidate: {
          DEFAULT: "#b39a74",
          wash: "rgba(179, 154, 116, 0.14)",
          line: "rgba(179, 154, 116, 0.40)",
        },
        contested: {
          DEFAULT: "#a88580",
          wash: "rgba(168, 133, 128, 0.14)",
          line: "rgba(168, 133, 128, 0.40)",
        },
        governed: {
          DEFAULT: "#7a6fa4",
          wash: "rgba(122, 111, 164, 0.14)",
          line: "rgba(122, 111, 164, 0.40)",
        },
        shadow: "#9a948a",
        line: {
          DEFAULT: "rgba(42, 38, 32, 0.08)",
          strong: "rgba(42, 38, 32, 0.14)",
        },
      },
      fontFamily: {
        sans: [
          "Newsreader",
          "Iowan Old Style",
          "Palatino Linotype",
          "Georgia",
          "serif",
        ],
        serif: [
          "Newsreader",
          "Iowan Old Style",
          "Palatino Linotype",
          "Georgia",
          "serif",
        ],
        mono: [
          "JetBrains Mono",
          "SFMono-Regular",
          "ui-monospace",
          "Menlo",
          "monospace",
        ],
      },
      borderRadius: {
        card: "10px",
        inline: "4px",
      },
      transitionDuration: {
        hover: "220ms",
        link: "150ms",
      },
    },
  },
  plugins: [],
};

export default preset;

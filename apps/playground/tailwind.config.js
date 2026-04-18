/**
 * Tailwind theme for the Aionis Playground.
 *
 * This mirrors the Aionis Visual Identity v1 tokens (see
 * `docs/AIONIS_BRAND_VISUAL_IDENTITY_V1.md`, §3 Color and §10 Code tokens).
 * When the VI document changes, this file is the first follower.
 *
 * Rules we enforce by construction:
 *  - Serif body (`Newsreader`) is the default sans, so stock Tailwind
 *    utilities (`font-sans`, Preflight body font) resolve to the brand face.
 *  - The single accent color is `signal` (Morandi dusty violet). State colors
 *    (trusted / candidate / contested / shadow) carry runtime meaning only and
 *    must never be used as generic success / warning / error chrome.
 *  - `line` / `line-strong` are pre-alpha'd against ink so borders sit on any
 *    paper variant without re-tinting.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
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
        // Secondary and tertiary ink per VI §3.
        "text-2": "#6b6358",
        "text-3": "#9a948a",
        signal: {
          DEFAULT: "#7a6fa4",
          strong: "#5e5484",
          soft: "#aba2c8",
          deep: "#352e4d",
          // Wash is intentionally a rgba token — use as `bg-signal-wash`.
          wash: "rgba(122, 111, 164, 0.10)",
        },
        // Runtime semantic palette. Only used where a state is actually being
        // encoded (trusted memory, history applied, governed, etc).
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
        shadow: "#9a948a",
        line: {
          DEFAULT: "rgba(42, 38, 32, 0.08)",
          strong: "rgba(42, 38, 32, 0.14)",
        },
      },
      fontFamily: {
        // Per VI §4: "Body is always Newsreader." We make it the default sans
        // so stock Tailwind utilities land on the brand face.
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
        // VI §5 corner scale. Cards are 10px; pills are 999px.
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

/**
 * Tailwind config for the Aionis Playground.
 *
 * Delegates all colour, type, radius, and motion tokens to the shared
 * `@aionis/ui-kit` preset, which mirrors
 * `docs/AIONIS_BRAND_VISUAL_IDENTITY_V1.md`. Local extends stay empty so
 * every Aionis-surface UI (Inspector, Playground, Workbench UI) converges
 * on a single theme.
 */

import aionisPreset from "@aionis/ui-kit/theme/tailwind-preset";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [aionisPreset],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
};

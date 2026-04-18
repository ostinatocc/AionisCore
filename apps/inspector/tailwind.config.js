/**
 * Tailwind config for the Aionis Inspector.
 *
 * Delegates theme tokens to `@aionis/ui-kit`. Inspector v0.1 used a dark
 * slate theme; from Aionis Workbench UI Phase 1 forward Inspector runs on
 * the VI light theme (paper / ink / signal). Tab-local colour tweaks should
 * go through the state palette (`trusted`, `candidate`, `contested`), not
 * hard-coded hex.
 */

import aionisPreset from "@aionis/ui-kit/theme/tailwind-preset";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [aionisPreset],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
};

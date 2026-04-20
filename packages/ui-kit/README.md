# @aionis/ui-kit

Shared UI primitives, brand theme, and hooks used by the three Aionis-surface UIs:

- `apps/inspector` — local read-only observation UI for Lite
- `apps/playground` — public hosted demo
- Aionis Workbench UI — browser for the Workbench task/session controller

This package is the single source of truth for the shipped Aionis UI theme
tokens and primitives. Consumers get: a Tailwind preset, a CSS token layer, a
small set of Preact components, a few logic-only hooks, and a typed Aionis
HTTP client.

## Install

```bash
npm install @aionis/ui-kit preact
```

`preact` is a peer dependency (any `>= 10.20`).

## Usage

Tailwind preset (`tailwind.config.js`):

```js
import aionis from "@aionis/ui-kit/theme/tailwind-preset";

export default {
  presets: [aionis],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
};
```

CSS tokens + base + component layer. **The import must come before the
`@tailwind` directives** — standard PostCSS rule (`@import` must precede
other at-rules), and the `@layer base / components / utilities` blocks in
`tokens.css` rely on Tailwind's directives resolving afterwards so `@apply`
inside them picks up Tailwind utilities:

```css
/* apps/<surface>/src/styles.css */
@import "@aionis/ui-kit/theme/tokens.css";

@tailwind base;
@tailwind components;
@tailwind utilities;

/* surface-local extensions go here, never re-declare theme tokens */
@layer components {
  .my-surface-specific-class {
    @apply rounded-card border border-line bg-paper-soft;
  }
}
```

Do **not** import `tokens.css` after `@tailwind`; PostCSS may hoist it to
the top silently and your own `@layer base` extensions will end up
mis-ordered. Both shipped consumers
(`apps/inspector/src/styles.css`, `apps/playground/src/styles.css`) follow
the import-first pattern.

Components:

```tsx
import { Card, Pill, Kicker, StateBadge, Section, Button } from "@aionis/ui-kit/components";
```

Hooks:

```ts
import { useAsync, useWebSocket } from "@aionis/ui-kit/hooks";
```

Lib:

```ts
import { alias, toneOf, formatDurationMs, parseRationale, createAionisHttpClient } from "@aionis/ui-kit/lib";
```

## Brand rules enforced by construction

- Paper-first surface (`bg-paper`), ink text, single `signal` accent (dusty violet)
- Body is `Newsreader` (serif) via the default `font-sans` slot; code is `JetBrains Mono`
- No uppercase anywhere in UI or body (VI §4.3)
- Cards are 10px radius, 1px border, no shadow
- State colors (`trusted`, `candidate`, `contested`, `governed`, `shadow`) carry
  runtime meaning only — never generic success/warning/error chrome

The canonical tokens and rules live in this package through
`theme/tokens.css` and `theme/tailwind-preset`.

## Versioning

- Semver. Stays on `0.x` through Aionis Workbench UI Phase 4.
- Breaking changes to component props or exported types bump minor in `0.x`.
- Published on tag `ui-kit-v*` through `.github/workflows/ui-kit-publish.yml`.

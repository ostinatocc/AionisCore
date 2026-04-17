# Aionis Visual Identity · v1.0

Last reviewed: 2026-04-17

Document status: living internal brand system

A complete visual identity manual for Aionis Runtime and the public Aionis product surface.

This document is canonical. When the docs site, marketing material, or product UI disagrees with it, either the artifact gets fixed or this document gets updated — not both silently. All brand-visible work ships against a version tag of this document.

---

## Table of contents

1. Brand voice
2. Logo
3. Color system
4. Typography
5. Spacing and grid
6. Components
7. Motion
8. Imagery and diagrams
9. Social and marketing surfaces
10. Code tokens
11. File manifest
12. Governance
13. Decisions that were not made lightly

---

## 1. Brand voice

### The one line

> Aionis Runtime is the **local continuity runtime for coding agents**.

This is the only sentence that appears unchanged across docs, README, npm, and the Open Graph card. Do not shorten, rephrase, or decorate it.

### Product character

Aionis reads like a quiet, literate engineering magazine:

- **Precise** — concrete nouns, verified evidence, named tradeoffs
- **Quiet** — one accent color, generous whitespace, no visual shouting
- **Humane** — serif type with a reader's warmth, not cold system sans
- **Inspectable** — runtime surfaces are explicit, not hidden behind prompts
- **Continuous** — every visual choice points at "what persists across runs"

### We are

- A local continuity runtime for coding agents
- A typed SDK and a stable route surface
- A runtime that runs locally today (Lite), inspectable through SQLite stores and HTTP routes
- Evidence-backed: 15 / 15 benchmark scenarios, smoke validation, contract tests

### We are not

- A chat memory plugin
- A hosted orchestration platform
- A magic "AI memory" abstraction
- An AI-flavored general-purpose agent framework
- A replacement for the model, agent UI, or workflow host you already use

### Voice rules

**Do:**

- use concrete nouns: `task start`, `handoff`, `replay`, `sandbox`, `playbook`, `route`
- prefer short declarative sentences
- name the tradeoff when there is one
- distinguish `Aionis Core` (kernel), `Aionis Runtime` (public shape), `Lite` (local distribution)
- use "execution memory" and "continuity" as the product-level nouns

**Don't:**

- say "AI-powered", "intelligent", "smart", "autonomous", "agentic" (as an adjective modifier)
- use emoji in any official surface
- use all-caps or exclamation points for emphasis
- use marketing superlatives: "best", "leading", "revolutionary", "next-gen"
- use passive voice when an active verb works
- bury the concrete feature under generic language ("memory solutions", "continuity platform")

### Punctuation and conventions

- Em-dash with spaces: `—`, not `--` or `-`
- Quotation marks: curly for body prose (`"like this"`), straight for code (`"like this"`)
- Never use an Oxford comma unless ambiguity demands it
- `ostinato/aionis` and `@ostinato/aionis` — lowercase always
- Version numbers are not decorated: `v0.1.0`, not `V0.1.0` or `0.1.0-beta`

---

## 2. Logo

### The mark

The Aionis mark is a **Λ** (lambda) rising from a baseline, bisected by a horizontal, with a single dot at the apex.

- The Λ points up — execution converges on a peak
- The horizontal cuts the ascent — a discrete, stable surface
- The dot marks origin — a task starts here

Everything else is negative space.

### Construction specification

Canvas and geometry are frozen — do not adjust.


| Parameter               | Value                                                        |
| ----------------------- | ------------------------------------------------------------ |
| Canvas                  | 80 × 80                                                      |
| Backplate corner radius | 18 (ratio 0.225)                                             |
| Backplate fill          | `--aionis-signal-deep` (`#352e4d`)                           |
| Inner outline           | 17.5 corner radius, `#7a6fa4` at opacity 0.32                |
| Λ path                  | `M22 58 L40 20 L58 58`, stroke-width 6.5, round caps + joins |
| Λ stroke                | `#ede8db` (paper-light)                                      |
| Horizontal path         | `M31 42 H49`, stroke-width 6.5, round caps                   |
| Horizontal stroke       | `#aba2c8` (signal-soft)                                      |
| Apex dot                | `cx=40 cy=20 r=2.4`, fill `#ede8db`                          |


### Variants


| Variant          | File                               | Status  | Use                                                    |
| ---------------- | ---------------------------------- | ------- | ------------------------------------------------------ |
| Primary mark     | `apps/docs/public/logo-mark.svg`   | shipped | Everywhere with space for a 24 × 24 px block or larger |
| Favicon          | `apps/docs/public/favicon.svg`     | shipped | Browser tab, touch icon, small UI                      |
| Social card      | `apps/docs/public/social-card.svg` | shipped | og:image, Twitter card, link previews                  |
| Wordmark         | `logo-wordmark.svg`                | roadmap | Horizontal layouts when mark alone is too small        |
| Reversed mono    | `logo-mark-mono.svg`               | roadmap | Print or single-color constraints                      |
| Apple touch icon | `apple-touch-icon.png`             | roadmap | Rasterized 180 × 180 for iOS                           |


### Clear space

Reserve at least the height of the apex dot (approximately 0.06 × mark width) on all four sides. No text, line, icon, or image may enter this margin.

### Minimum size


| Context                         | Minimum    |
| ------------------------------- | ---------- |
| Favicon                         | 16 × 16 px |
| Interactive UI chrome (nav bar) | 22 × 22 px |
| Inline brand reference          | 20 × 20 px |
| Hero placement                  | 80 × 80 px |
| Print                           | 8 mm       |


### Don'ts

- Don't add a drop shadow — the mark is flat
- Don't tilt, rotate, or skew
- Don't place on a busy photograph — always on paper, paper-soft, paper-sink, or signal-deep
- Don't recolor arbitrarily — if you need a single-color version, render only the Λ + horizontal in ink on paper
- Don't stretch or compress horizontally
- Don't add text to the mark — use the wordmark lockup when text is needed
- Don't combine the mark with another product's logo without a clear `×` or `·` separator

---

## 3. Color system

Aionis uses a **Morandi-inspired palette**: low saturation, medium value, earthy warmth. Every color plays one of four roles.


| Role       | What it is                                                         |
| ---------- | ------------------------------------------------------------------ |
| **Paper**  | The canvas. Warm off-white.                                        |
| **Ink**    | The word. Warm dark brown, never pure black.                       |
| **Signal** | The single accent. Dusty violet.                                   |
| **State**  | Runtime meaning — trusted, candidate, contested, governed, shadow. |


### Paper (surface)


| Token                 | Value     | Role                                       |
| --------------------- | --------- | ------------------------------------------ |
| `--aionis-paper`      | `#f6f3ea` | Primary page background                    |
| `--aionis-paper-soft` | `#ede8db` | Sunk cards, proof tiles, mermaid node fill |
| `--aionis-paper-sink` | `#e2dccd` | Deeper paper, chip/inline-code background  |


### Ink (type)


| Token               | Value     | Role                                       |
| ------------------- | --------- | ------------------------------------------ |
| `--aionis-ink`      | `#2a2620` | Primary body text, headings                |
| `--aionis-ink-soft` | `#4a4338` | Reserved                                   |
| `--vp-c-text-2`     | `#6b6358` | Secondary copy, tagline, card descriptions |
| `--vp-c-text-3`     | `#9a948a` | Kickers, labels, tertiary metadata         |


### Signal (accent)

The only saturated color in the system.


| Token                    | Value                       | HSL            | Role                                                              |
| ------------------------ | --------------------------- | -------------- | ----------------------------------------------------------------- |
| `--aionis-signal`        | `#7a6fa4`                   | 251°, 22%, 54% | Links, CTA buttons, hero name, active sidebar item, feature index |
| `--aionis-signal-strong` | `#5e5484`                   | 250°, 22%, 42% | Hover, pressed, text on signal                                    |
| `--aionis-signal-soft`   | `#aba2c8`                   | 251°, 25%, 71% | Logo horizontal stroke, light decoration                          |
| `--aionis-signal-wash`   | `rgba(122, 111, 164, 0.10)` | —              | Hover background mix, subtle tints                                |
| `--aionis-signal-deep`   | `#352e4d`                   | 253°, 25%, 24% | Logo backplate, dark display surfaces                             |


### State colors (runtime language)

These colors **encode runtime meaning, not decoration**. Never use them outside of the state they represent.


| State       | Color                | Semantic                                     |
| ----------- | -------------------- | -------------------------------------------- |
| `trusted`   | `#8ba392`            | Verified, stable, promoted memory / playbook |
| `candidate` | `#b39a74`            | Under observation, not yet promoted          |
| `contested` | `#a88580`            | Conflicting evidence, quarantined            |
| `governed`  | `#7a6fa4` (= signal) | Human-reviewed, policy-scoped                |
| `shadow`    | `#9a948a`            | Archived, muted, lifecycle-past              |


**Application:**

- Render as a 6px dot before the label, on a pill background
- Tint formula: `rgba(color, 0.14)` background, `rgba(color, 0.30)` border
- Text color: inherit `--aionis-ink`, never tint
- Never use these colors for generic UI chrome, error messages, success toasts, or decoration

### Line (border)

Derived from ink at low opacity, so borders adapt to paper variants.


| Token                  | Value                    | Use                                      |
| ---------------------- | ------------------------ | ---------------------------------------- |
| `--aionis-line`        | `rgba(42, 38, 32, 0.08)` | Default borders, dividers, card outlines |
| `--aionis-line-strong` | `rgba(42, 38, 32, 0.14)` | Button-alt borders, table headers        |


### Color proportion: 60 / 30 / 7 / 3

On any given screen the pixel distribution should land roughly at:

- **60%** paper (surface)
- **30%** ink (text and near-ink grays)
- **7%** paper-soft / paper-sink / line / ash
- **3%** signal + state colors combined

If the page feels "mostly purple," signal is over-used.

### Contrast ratios


| Pair                        | Ratio    | WCAG                                                |
| --------------------------- | -------- | --------------------------------------------------- |
| `ink` on `paper`            | 12.8 : 1 | AAA (body, large)                                   |
| `text-2 #6b6358` on `paper` | 5.0 : 1  | AA (body)                                           |
| `text-3 #9a948a` on `paper` | 3.1 : 1  | AA (large only — 18px+ or 14px bold)                |
| `signal` on `paper`         | 4.3 : 1  | AA (body)                                           |
| `paper` on `signal-strong`  | 5.4 : 1  | AA (body) — use for button labels                   |
| `paper` on `signal`         | 4.3 : 1  | AA (body, large) — acceptable for pill labels 14px+ |


Never place `signal-soft` text on `paper`, or `ash` text on `paper-soft`, for body copy.

### Dark mode palette


| Token            | Light                    | Dark                        |
| ---------------- | ------------------------ | --------------------------- |
| bg               | `#f6f3ea`                | `#1f1c16`                   |
| bg-alt           | `#ede8db`                | `#26221b`                   |
| bg-soft          | `#ece7d9`                | `#2a2620`                   |
| text-1           | `#2a2620`                | `#efe9d8`                   |
| text-2           | `#6b6358`                | `#c6bfae`                   |
| text-3           | `#9a948a`                | `#8c8578`                   |
| line             | `rgba(42, 38, 32, 0.08)` | `rgba(240, 234, 221, 0.08)` |
| signal (on text) | `#7a6fa4`                | `#aba2c8`                   |


### Color don'ts

- Don't add a second accent color. There is only signal.
- Don't raise signal saturation above `H251 S22 L54`. If the purple starts reading "bright," anchor back.
- Don't use pure black (`#000000`) or pure white (`#ffffff`). Both break the paper metaphor.
- Don't use `trusted` for generic success, `contested` for generic error, `candidate` for generic warning. They are runtime semantics.
- Don't introduce gradients in color fills (linear, radial, or conic). Aionis surfaces are matte.

---

## 4. Typography

Two families. No more.

### Primary · Newsreader

Variable serif designed by Production Type for long-form on-screen reading. Available on Google Fonts.

- Axes: `opsz 6..72`, `wght 300..700`, italic + roman
- Role: all readable text — body, headings, navigation, buttons, captions
- License: OFL

### Secondary · JetBrains Mono

- Axes: `wght 400, 500`
- Role: code blocks, CLI snippets, feature index numerals, small kicker labels
- License: OFL

### Type scale

Tokens below map to variable-font settings. `opsz` should scale with size — do not set a 60px heading at `opsz 16`.


| Level          | Family            | Size                         | opsz | wght | letter-spacing | line-height | Where                        |
| -------------- | ----------------- | ---------------------------- | ---- | ---- | -------------- | ----------- | ---------------------------- |
| Display        | Newsreader        | clamp(2.4rem, 4.2vw, 3.2rem) | 72   | 450  | -0.030em       | 1.08        | Hero text                    |
| Display italic | Newsreader italic | same                         | 72   | 400  | -0.020em       | 1.08        | Hero name only               |
| H1             | Newsreader        | 2.4rem                       | 60   | 500  | -0.025em       | 1.15        | Page title                   |
| H2             | Newsreader        | 1.55rem                      | 48   | 500  | -0.020em       | 1.25        | Section                      |
| H3             | Newsreader        | 1.18rem                      | 32   | 500  | -0.012em       | 1.30        | Sub-section                  |
| Tagline        | Newsreader        | 1.06rem                      | 18   | 400  | -0.005em       | 1.70        | Hero subhead                 |
| Body           | Newsreader        | 1.04rem                      | 18   | 400  | 0              | 1.75        | Paragraphs, lists            |
| Body strong    | Newsreader        | 1.04rem                      | 18   | 600  | 0              | 1.75        | Inline emphasis              |
| Blockquote     | Newsreader italic | 1.10rem                      | 28   | 400  | 0              | 1.65        | Pull quotes                  |
| Card title     | Newsreader        | 1.20rem                      | 32   | 500  | -0.015em       | 1.30        | Feature, path, reference     |
| Proof value    | Newsreader        | 1.04rem                      | 20   | 500  | -0.010em       | 1.30        | Proof card anchor            |
| Nav brand      | Newsreader        | 17px                         | 36   | 500  | -0.015em       | —           | Top nav title                |
| Nav link       | Newsreader        | 14px                         | 14   | 450  | -0.005em       | —           | Top nav items                |
| Button         | Newsreader        | 14px                         | 14   | 500  | -0.005em       | 40px        | All buttons                  |
| Outline        | Newsreader        | 13px                         | 14   | 400  | 0              | —           | Right-side TOC               |
| Footer         | Newsreader        | 13px                         | 14   | 400  | 0              | —           | Site footer                  |
| Kicker         | JB Mono           | 11px                         | —    | 400  | 0.02em         | —           | Section kickers              |
| Label          | JB Mono           | 11px                         | —    | 500  | 0.02em         | —           | Proof labels, sidebar groups |
| Feature index  | JB Mono           | 11px                         | —    | 500  | 0              | —           | 01 – 06 numerals             |
| Install        | JB Mono           | 13px                         | —    | 400  | 0              | —           | `$ npm install ...`          |
| Inline code    | JB Mono           | 0.84em                       | —    | 400  | 0              | —           | Inline code                  |
| Code block     | JB Mono           | 0.88rem                      | —    | 400  | 0              | 1.65        | Fenced code                  |


### Typography rules

1. **Body is always Newsreader.** Not system-ui, not Inter, not Helvetica.
2. **Italic is a rarity.** The only location that may use italic display type is the hero brand name (`Aionis Runtime`). Blockquotes may use body-level italic. Nowhere else.
3. **No all-caps in UI or body.** `text-transform: uppercase` is not permitted.
4. **Kickers are lowercase mono at 11px with tracking 0.02em.** Not 0.12em. Not uppercase.
5. **Letter-spacing scales negative with size.** Display needs `-0.030em`, body stays at `0`. This prevents large headings from feeling airy.
6. **opsz scales with size.** Use the table. Do not ship a 60px heading at `opsz 16` — it will render thin and brittle.

### Paragraph rules

- Max body measure: `70ch`. Past this, line length breaks reading rhythm.
- Default paragraph margin: `1.2rem` top and bottom.
- Lists: `0.4rem` between items, `18px` left padding.
- Blockquote: 2px left rule in `signal`, no background fill, italic body.
- Left-align only. No justify, no auto-hyphenation.
- `text-wrap: balance` on display / H1 / H2.

### Loading (HTML)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..700&family=JetBrains+Mono:wght@400;500&display=swap">
```

---

## 5. Spacing and grid

### Base unit

**4px**. Every margin, padding, gap is a multiple of 4.

### Spacing scale


| Token | Value | Use                                       |
| ----- | ----- | ----------------------------------------- |
| 2xs   | 4px   | Dot-to-label gap                          |
| xs    | 8px   | Chip vertical padding, tight gap          |
| sm    | 12px  | Trust-strip divider padding, label margin |
| md    | 16px  | Card internal vertical gap                |
| lg    | 22px  | Card padding                              |
| xl    | 28px  | Feature card padding, section separation  |
| 2xl   | 44px  | Major block separation                    |
| 3xl   | 72px  | Hero bottom padding                       |
| 4xl   | 112px | Hero top padding                          |


### Corner radius


| Role                                                   | Value             |
| ------------------------------------------------------ | ----------------- |
| Cards (proof, path, feature, section-frame, reference) | 10px              |
| Code blocks, mermaid containers                        | 10px              |
| Buttons                                                | 999px (pill)      |
| Badges, chips, state pills                             | 999px (pill)      |
| Inline code                                            | 4px               |
| Logo backplate                                         | 18px at 80 canvas |


### Layout containers

- Hero and features container: `max-width: 1080px`
- Body page content: VitePress default (≈688px centered)
- Paragraph measure: `70ch` max
- Grid patterns:
  - 3-up: path cards, stack grid, reference grid, doc grid
  - 4-up: proof grid
  - 2-up: comparison grid
  - 6-up (auto-wrap): features

### Vertical rhythm

- Between H2 and following paragraph: `1.6rem` (H2 has `padding-top: 1.6rem`, `margin-top: 2.6rem`)
- Between paragraphs: `1.2rem`
- Between card grids and prose: `44px` bottom
- Between feature grid and next section: `64px`

---

## 6. Components

Each component has one canonical shape. Don't invent variants.

### Button

- Shape: pill (`border-radius: 999px`)
- Size: 40px height, padding `0 22px`
- Family: Newsreader, 14px, wght 500, letter-spacing `-0.005em`
- No shadow, no inner highlight, no gradient
- Two variants only:


| Variant | Default                                           | Hover                |
| ------- | ------------------------------------------------- | -------------------- |
| Brand   | bg `signal`, color `#fff`, border `signal`        | bg `signal-strong`   |
| Alt     | bg transparent, color `ink`, border `line-strong` | bg `rgba(ink, 0.04)` |


### Card

Canonical card:

- Shape: 10px rounded rectangle
- Border: `1px solid line`
- Background: `paper`
- Padding: 22px
- Shadow: none
- Interactive hover: `background: mix(paper 94%, signal-wash)`, `border: mix(signal 30%, line)`, `transform: translateY(-1px)`, transition 220ms

Proof card (variant, for project status tiles):

- Background: `paper-soft`
- Border: transparent
- Used for project proof / runtime state surfaces, not for generic content cards

### Feature card

A special case of Card. Header contains a monospaced index number in signal.

- Padding: `30px 26px 26px`
- Index `::after`: `counter(feature-index, decimal-leading-zero)`, JB Mono 11px, positioned 18px from top-left
- Title: Newsreader 1.2rem wght 500, `margin-top: 18px`
- Detail: Newsreader 0.98rem text-2, line-height 1.7

### Chip

- Shape: pill
- Padding: 7px 12px
- Family: JB Mono, 11px, wght 400
- No uppercase, no extra tracking
- Background: `paper-sink`, border: `line`, color: `text-2`

### State badge

A Chip with runtime meaning. See §3 State colors.

- 6px round dot prefix in state color
- Background: `rgba(state-color, 0.14)`
- Border: `rgba(state-color, 0.30)`
- Text: `ink`, no tint

### Link

- Color: `signal`
- Underline: 1px `signal at 45% opacity`, offset 3px
- Hover: color `signal-strong`, underline opacity 100%
- Transition: 150ms

### Code block

- Border: `1px solid line`
- Border radius: 10px
- Background: `paper-sink` (light) / `#2a2620` (dark)
- Font size: 0.88rem
- No shadow
- Copy button: ghost, border `line`, appears on hover

### Inline code

- Background: `paper-sink`
- Border: none
- Border radius: 4px
- Padding: `0.14rem 0.4rem`
- Font size: 0.84em of surrounding text

### Trust strip (hero)

A quiet footnote-style signal row.

- Family: JB Mono, 12px, color `text-3`
- Items separated by 1px × 12px vertical line in `line` color
- Item padding: `0 14px` (first item `padding-left: 0`)
- Use for: install proofs, version, license, benchmark count

### Install line (hero)

- Family: JB Mono, 13px
- Prefix: `$` in `text-3`, no bullet or box
- Command text: `text-1`
- No border, no background — it reads as a line of prose

### Navigation

- Backdrop: `mix(bg, 90% + transparent)`, `backdrop-filter: blur(10px) saturate(1.05)`
- Border-bottom: `1px solid line`
- Logo: 22 × 22 px, 5px border radius
- Brand name: Newsreader 17px wght 500 italic-tendency via opsz 36
- Menu link: Newsreader 14px wght 450

### Sidebar

- Level-0 group title: JB Mono 11px wght 500, color `text-3`, no uppercase, tracking 0.02em
- Active item: color `signal`
- Hover item: color `ink`

### Inputs (forward-looking)

- Border-radius: 10px
- Border: `1px solid line`
- Focus ring: 2px `signal-wash`
- Label: body text, not uppercase
- Placeholder: `text-3`

---

## 7. Motion

Aionis animations are short, single-property, calm.


| Role           | Duration      | Easing | Properties                                |
| -------------- | ------------- | ------ | ----------------------------------------- |
| Hover state    | 180–220ms     | ease   | border-color, background-color, transform |
| Card lift      | 220ms         | ease   | `transform: translateY(-1px)`             |
| Nav backdrop   | native        | —      | backdrop-filter                           |
| Link underline | 150ms         | ease   | text-decoration-color, color              |
| Page scroll    | native smooth | —      | `scroll-behavior: smooth`                 |


**Never:**

- Pulse, bounce, elastic, or spring easings
- Rotate on hover
- Scale above 1.02
- Transition shadows (we don't use shadows)
- Use `cubic-bezier` curves beyond simple `ease`

---

## 8. Imagery and diagrams

Aionis is text-first. Imagery is rare.

When imagery appears:

- Prefer editorial illustrations, hand-drawn or thin-line, in ink + signal-soft
- Photographs must be desaturated to near-monochrome, warm-toned (sepia bias)
- Never use stock AI-generated product renders with glowing screens, particle fields, or futuristic holograms
- Never place gradients in imagery where a flat fill would work

### Diagrams (Mermaid)

Mermaid is the default "visual" for Aionis — it carries data, not decoration. Theme variables live in `apps/docs/.vitepress/config.mts` and mirror this document:

```ts
themeVariables: {
  background: "#f6f3ea",
  primaryColor: "#ede8db",          // node fill
  primaryTextColor: "#2a2620",
  primaryBorderColor: "#7a6fa4",    // node border = signal
  lineColor: "rgba(42, 38, 32, 0.38)",
  textColor: "#2a2620",
  edgeLabelBackground: "#f6f3ea",
  // … see config.mts for full list
}
```

Rules:

- Node labels use Newsreader (14px)
- Never use `fill:#f00` style overrides in the source — derive from theme
- One flow per diagram; if you need two, they are two diagrams
- Avoid gratuitous icons in nodes (FontAwesome flags, emoji)

---

## 9. Social and marketing surfaces

### Open Graph card

File: `apps/docs/public/social-card.svg`, 1200 × 630.

Composition:

- Paper background, full bleed
- 20px inset rule in `rgba(ink, 0.08)`
- Logo block left: 128 × 128, signal-deep backplate
- Right: Newsreader title (72px, wght 500) + subtitle (26px text-2)
- Horizontal rule: 72px × 1px in `rgba(ink, 0.20)`
- Supporting lines: JB Mono 18px in text-2
- Bottom: four state-dotted pills (`Lite ships today`, `v0.1.0`, `MIT`, `15 / 15 benchmarks`)

Don't add gradients, glows, decorative type, or promotional badges.

### README

- First 100 characters must repeat the one line: "Local continuity runtime for coding agents"
- No badge wall at the top. At most: npm version + MIT license, both in flat-square, color `7a6fa4`
- Use `##` for top-level README sections, not `#`
- Use fenced code blocks with `bash` or `ts`, never plain fences
- Link to docs site early (within first 300 words)

### Badge style (shields.io)

```
https://img.shields.io/badge/Aionis-Lite_ships_today-7a6fa4?style=flat-square
https://img.shields.io/npm/v/@ostinato/aionis?color=7a6fa4&style=flat-square
https://img.shields.io/badge/License-MIT-9a948a?style=flat-square
```

Avoid:

- Green success / red failure badges in the header block
- More than three badges in total
- Badge groupings that push the first line of prose below the fold

### Email signature

```
—
[Name], [Role]
Aionis Runtime · Local continuity runtime for coding agents
github.com/ostinatocc/AionisCore
```

One em-dash prefix, no quote, no image signature, no social icons, no emoji.

### Slides / presentations

- Paper background, never white
- One accent (signal), one ink, one text-2 for subheads
- Newsreader for all text
- No bullet markers — use em-dash or an opening figure
- Diagrams as Mermaid exports in brand theme, rasterized at 2x

### Merchandise (future)

If physical items ship:

- T-shirts, stickers: mark only, on paper-colored substrate
- No wordmark on merchandise unless lockup is approved
- Ink printing, not screenprint metallic finishes

---

## 10. Code tokens

### CSS custom properties

Drop into `:root` for any Aionis-branded surface.

```css
:root {
  /* Paper */
  --aionis-paper: #f6f3ea;
  --aionis-paper-soft: #ede8db;
  --aionis-paper-sink: #e2dccd;

  /* Ink */
  --aionis-ink: #2a2620;
  --aionis-ink-soft: #4a4338;
  --aionis-text-2: #6b6358;
  --aionis-text-3: #9a948a;

  /* Signal */
  --aionis-signal: #7a6fa4;
  --aionis-signal-strong: #5e5484;
  --aionis-signal-soft: #aba2c8;
  --aionis-signal-wash: rgba(122, 111, 164, 0.10);
  --aionis-signal-deep: #352e4d;

  /* State */
  --aionis-trusted: #8ba392;
  --aionis-candidate: #b39a74;
  --aionis-contested: #a88580;
  --aionis-governed: var(--aionis-signal);
  --aionis-shadow: #9a948a;

  /* Lines */
  --aionis-line: rgba(42, 38, 32, 0.08);
  --aionis-line-strong: rgba(42, 38, 32, 0.14);

  /* Type */
  --aionis-font-serif: "Newsreader", "Iowan Old Style", "Palatino Linotype", Georgia, serif;
  --aionis-font-mono: "JetBrains Mono", "SFMono-Regular", ui-monospace, monospace;

  /* Radius */
  --aionis-radius-card: 10px;
  --aionis-radius-pill: 999px;
  --aionis-radius-inline: 4px;

  /* Motion */
  --aionis-ease: cubic-bezier(0.4, 0, 0.2, 1);
  --aionis-duration-hover: 220ms;
  --aionis-duration-link: 150ms;
}
```

### Tailwind theme extension

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: "#f6f3ea", soft: "#ede8db", sink: "#e2dccd" },
        ink: { DEFAULT: "#2a2620", soft: "#4a4338" },
        signal: {
          DEFAULT: "#7a6fa4",
          strong: "#5e5484",
          soft: "#aba2c8",
          deep: "#352e4d",
        },
        trusted: "#8ba392",
        candidate: "#b39a74",
        contested: "#a88580",
        shadow: "#9a948a",
      },
      fontFamily: {
        serif: ["Newsreader", "Iowan Old Style", "Palatino Linotype", "Georgia", "serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        card: "10px",
        pill: "9999px",
      },
    },
  },
};
```

### Figma / Sketch color styles

Import as paint styles named:

- `Aionis / Paper / Default`, `Soft`, `Sink`
- `Aionis / Ink / Default`, `Soft`, `Text 2`, `Text 3`
- `Aionis / Signal / Default`, `Strong`, `Soft`, `Wash`, `Deep`
- `Aionis / State / Trusted`, `Candidate`, `Contested`, `Governed`, `Shadow`
- `Aionis / Line / Default`, `Strong`

Text styles should mirror the §4 scale.

---

## 11. File manifest

### Shipped assets


| File                                   | Purpose                                               | Canvas     |
| -------------------------------------- | ----------------------------------------------------- | ---------- |
| `apps/docs/public/logo-mark.svg`       | Primary mark                                          | 80 × 80    |
| `apps/docs/public/favicon.svg`         | Browser tab / touch icon                              | 80 × 80    |
| `apps/docs/public/social-card.svg`     | Open Graph / Twitter                                  | 1200 × 630 |
| `apps/docs/.vitepress/theme/style.css` | Reference implementation of all tokens and components | —          |
| `apps/docs/.vitepress/config.mts`      | Mermaid theme + nav config                            | —          |


### Roadmap assets

- `logo-wordmark.svg` — mark + "Aionis Runtime" lockup
- `logo-mark-mono.svg` — ink-on-paper single-color
- `logo-mark-reversed.svg` — on `signal-deep` backplate (full size)
- `apple-touch-icon.png` — 180 × 180 rasterized
- `og-cards/*.svg` — per-page Open Graph cards (Lite, SDK, Replay)
- `figma/aionis-vi.fig` — design library export
- `brand-kit.zip` — public download for partners

---

## 12. Governance

### Ownership

The Aionis kernel and runtime maintainers own this document. Proposed changes must go through a PR that includes:

1. A rationale paragraph at the top of the PR description
2. Before / after comparison where visual
3. Token diff, if any, for CSS variables and Tailwind theme

### Versioning

This document uses semantic-ish versioning:

- **Major (v1 → v2)**: palette, typography family, or logo construction changes
- **Minor (v1.0 → v1.1)**: new tokens, new component canonical forms, new surfaces
- **Patch (v1.0 → v1.0.1)**: copy corrections, clarifications, spacing scale refinement

Every shipped product surface must reference the VI version it was built against in its commit message or PR body:

```
feat(docs): adopt Morandi palette (VI v1.0)
```

### When to deviate

You don't. If the existing system does not solve a new use case:

1. Write the use case as a one-paragraph problem statement
2. Propose the smallest extension that keeps the system whole
3. Update this document in the same PR as the implementation
4. Never ship a one-off color, a new font, or an un-specified component and "update the VI later"

### Disagreements

If two surfaces disagree, the source of truth is:

1. This document
2. The reference implementation in `apps/docs/.vitepress/theme/style.css`
3. The shipped SVG assets

In that order. If the document says one thing and the CSS says another, either the CSS is wrong and must be corrected, or the document is wrong and must be updated — in the same PR.

---

## 13. Decisions that were not made lightly

Design choices with clear alternatives, preserved here so future maintainers understand the tradeoffs.

### Why Newsreader and not Fraunces

Fraunces has a `SOFT` axis and a `wonky` axis that read as "designer personality." Aionis's voice is closer to an engineering essay than to a design studio, so we chose the quieter of the two families. Newsreader also has a narrower opsz range (6 – 72 vs 9 – 144), which naturally prevents the hero from becoming theatrical.

### Why Morandi violet and not brand-bright purple

The original `#6b5fe8` and `#554ac6` signaled "I am a tech product." We need the design to signal "I am infrastructure you can trust." Trust reads quieter, with a lower saturation on the accent. Morandi violet (`#7a6fa4`, S22) keeps enough chroma to be recognizable as violet while refusing to compete with body copy for attention.

### Why a single accent color

Multi-accent systems (signal + coral, signal + trusted-green) create competing focal points. Aionis's core claim is **continuity** — a single accent reinforces "there is one story here." The state colors (§3) are kept narrow and semantic specifically so they never become "decorative accents number two."

### Why dusty violet as the accent

Violet historically marks scholarship, contemplation, and memory. Morandi-violet keeps those associations while lowering the volume. It is also adjacent to the traditional "retrospective" color in typesetting (hot-metal purple proof prints) — a quiet nod to the idea that Aionis is about what persists after execution.

### Why pill buttons

Square and rounded-rectangle buttons carry "toolbar" weight. Pill buttons, combined with Newsreader type, read as invitations rather than commands. Aionis does not command — it offers continuity. The shape is aligned with voice.

### Why no shadows

Shadows imply a digital material hierarchy — things above things. Aionis is a single-plane metaphor (paper). Shadows would contradict it. Separation is achieved through line, paper-soft/sink shifts, and hover-state tint.

### Why paper-off-white, not pure white

Pure white (`#ffffff`) is an absence of color — sterile, clinical, software-like. Warm off-white (`#f6f3ea`) is a chosen color — a material, a choice, a mood. The paper metaphor requires warmth; white would break it on the first page.

### Why the Λ mark

Lambda is the letter used for rate constants in physics and for anonymous functions in programming. Both associations apply: Aionis is about what changes between runs (rate), and about evaluations that produce reusable behavior (lambda). The mark is not a literal glyph — it's a visual rhyme.

### Why keeping italic only for the hero name

Italic in a system otherwise entirely upright becomes a rare punctuation — it lands. If italic appeared in H2s, blockquotes, and callouts, it would lose all punctuation value. Reserving it for the one place where the brand asserts itself (the hero name) preserves the effect.

### Why no marketing illustrations in the docs

Docs readers are evaluating infrastructure. Stock illustrations of smiling agents, glowing brains, or friendly robots signal "marketing site," not "infrastructure I can trust." The absence of those images is itself a trust signal. Diagrams (Mermaid) provide the visual layer when one is needed.

---

*Aionis Visual Identity v1.0 — 2026-04-17. Initial extraction from the docs site redesign.*

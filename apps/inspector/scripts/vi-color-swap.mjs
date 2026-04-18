#!/usr/bin/env node
/**
 * One-shot Tailwind color-class rewriter that maps Inspector's legacy dark
 * slate palette onto the Aionis VI tokens shipped via @aionis/ui-kit.
 *
 * Run from apps/inspector:
 *   node scripts/vi-color-swap.mjs src/tabs
 *
 * Order matters: longer / more-specific patterns go first so shorter ones
 * do not eat them. This script is idempotent — running it a second time
 * yields no further changes.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const REPLACEMENTS = [
  // drop shadows — VI has none
  [/\s*shadow-\[0_0_8px_rgba\(52,211,153,0\.7\)\]/g, ""],
  [/\s*shadow-\[0_1px_0_0_rgba\(148,163,184,0\.06\)_inset\]/g, ""],

  // sky / signal accent
  ["bg-sky-500", "bg-signal"],
  ["bg-sky-400", "bg-signal"],
  ["hover:bg-sky-400", "hover:bg-signal-strong"],
  ["border-sky-500", "border-signal"],
  ["border-sky-400", "border-signal"],
  ["hover:border-sky-400", "hover:border-signal-strong"],
  ["text-sky-500", "text-signal"],
  ["text-sky-400", "text-signal"],
  ["text-sky-300", "text-signal"],
  ["ring-sky-500/40", "ring-signal-wash"],
  ["focus:ring-sky-500/40", "focus:ring-signal-wash"],
  ["focus:border-sky-500", "focus:border-signal"],

  // emerald → trusted
  ["border-emerald-400/40", "border-trusted-line"],
  ["bg-emerald-500/10", "bg-trusted-wash"],
  ["bg-emerald-400", "bg-trusted"],
  ["text-emerald-400", "text-trusted"],
  ["text-emerald-300", "text-trusted"],
  ["text-emerald-200", "text-trusted"],

  // amber → candidate
  ["border-amber-400/40", "border-candidate-line"],
  ["bg-amber-500/10", "bg-candidate-wash"],
  ["bg-amber-400", "bg-candidate"],
  ["text-amber-400", "text-candidate"],
  ["text-amber-300", "text-candidate"],
  ["text-amber-200", "text-candidate"],

  // orange → contested
  ["border-orange-400/40", "border-contested-line"],
  ["bg-orange-500/10", "bg-contested-wash"],
  ["bg-orange-400", "bg-contested"],
  ["text-orange-400", "text-contested"],
  ["text-orange-300", "text-contested"],
  ["text-orange-200", "text-contested"],

  // purple → governed
  ["border-purple-400/40", "border-governed-line"],
  ["bg-purple-500/10", "bg-governed-wash"],
  ["bg-purple-400", "bg-governed"],
  ["text-purple-400", "text-governed"],
  ["text-purple-300", "text-governed"],
  ["text-purple-200", "text-governed"],

  // rose → contested (error-ish)
  ["bg-rose-500/10", "bg-contested-wash"],
  ["bg-rose-500", "bg-contested"],
  ["text-rose-400", "text-contested"],
  ["text-rose-300", "text-contested"],
  ["text-rose-200", "text-contested"],

  // slate surfaces (order: with alpha first, then bare)
  ["bg-slate-950/70", "bg-paper-soft"],
  ["bg-slate-950/60", "bg-paper-soft"],
  ["bg-slate-950/50", "bg-paper-soft"],
  ["bg-slate-950", "bg-paper"],
  ["bg-slate-900/80", "bg-paper-soft"],
  ["bg-slate-900/60", "bg-paper-soft"],
  ["bg-slate-900/50", "bg-paper-soft"],
  ["bg-slate-900/40", "bg-paper-soft"],
  ["bg-slate-900", "bg-paper-soft"],
  ["bg-slate-800/80", "bg-paper-sink"],
  ["bg-slate-800/60", "bg-paper-sink"],
  ["bg-slate-800/40", "bg-paper-sink"],
  ["bg-slate-800", "bg-paper-sink"],
  ["bg-slate-700", "bg-paper-sink"],
  ["bg-slate-500/10", "bg-paper-sink"],

  // slate borders
  ["border-slate-800/80", "border-line"],
  ["border-slate-800/60", "border-line"],
  ["border-slate-800/40", "border-line"],
  ["border-slate-800", "border-line"],
  ["border-slate-700", "border-line-strong"],
  ["border-slate-600/60", "border-line-strong"],
  ["border-slate-600", "border-line-strong"],
  ["border-slate-500", "border-line-strong"],
  ["border-slate-400/40", "border-line-strong"],

  // slate rings
  ["ring-slate-800", "ring-line"],
  ["ring-slate-700", "ring-line-strong"],

  // slate text
  ["placeholder:text-slate-600", "placeholder:text-text-3"],
  ["placeholder:text-slate-500", "placeholder:text-text-3"],
  ["text-slate-50", "text-ink"],
  ["text-slate-100", "text-ink"],
  ["text-slate-200", "text-ink"],
  ["text-slate-300", "text-ink/80"],
  ["text-slate-400", "text-text-2"],
  ["text-slate-500", "text-text-3"],
  ["text-slate-600", "text-text-3"],

  // hover slate
  ["hover:border-slate-600", "hover:border-signal/30"],
  ["hover:border-slate-500", "hover:border-signal/30"],
  ["hover:bg-slate-700", "hover:bg-paper-sink"],
  ["hover:bg-slate-900", "hover:bg-paper-soft"],
  ["hover:text-slate-50", "hover:text-ink"],
  ["hover:text-slate-100", "hover:text-ink"],
  ["hover:text-slate-200", "hover:text-ink"],
];

const EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js", ".html", ".css"]);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else {
      const dot = name.lastIndexOf(".");
      if (dot >= 0 && EXTENSIONS.has(name.slice(dot))) out.push(full);
    }
  }
  return out;
}

function rewrite(content) {
  let next = content;
  for (const [pattern, replacement] of REPLACEMENTS) {
    if (pattern instanceof RegExp) {
      next = next.replace(pattern, replacement);
    } else {
      next = next.split(pattern).join(replacement);
    }
  }
  return next;
}

function main() {
  const targets = process.argv.slice(2);
  if (targets.length === 0) {
    process.stderr.write("usage: vi-color-swap.mjs <path>...\n");
    process.exit(2);
  }
  let filesChanged = 0;
  for (const t of targets) {
    const abs = resolve(t);
    const paths = statSync(abs).isDirectory() ? walk(abs) : [abs];
    for (const path of paths) {
      const original = readFileSync(path, "utf8");
      const next = rewrite(original);
      if (next !== original) {
        writeFileSync(path, next);
        filesChanged += 1;
      }
    }
  }
  process.stdout.write(`vi-color-swap: rewrote ${filesChanged} file(s)\n`);
}

main();

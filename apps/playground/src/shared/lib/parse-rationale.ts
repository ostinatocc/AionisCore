/**
 * Vendored from `apps/inspector/src/lib/parse-rationale.ts`.
 */

export interface RationaleSignal {
  key: string;
  value: string;
}

export interface ParsedRationale {
  raw: string;
  fragments: string[];
  narrative: string[];
  signals: RationaleSignal[];
}

const SIGNAL_START_RE = /^([a-z][a-z0-9_]*)=(.*)$/i;

export function parseRationale(rationale: unknown): ParsedRationale | null {
  const text = extractRationaleText(rationale);
  if (text === null) return null;
  const fragments = text
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const narrative: string[] = [];
  const signals: RationaleSignal[] = [];
  for (const frag of fragments) {
    const asSignal = matchSignal(frag);
    if (asSignal) {
      signals.push(asSignal);
      continue;
    }
    const subs = frag
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const sub of subs) {
      const subSignal = matchSignal(sub);
      if (subSignal) {
        signals.push(subSignal);
      } else {
        narrative.push(sub);
      }
    }
  }
  return { raw: text, fragments, narrative, signals };
}

function matchSignal(piece: string): RationaleSignal | null {
  const m = piece.match(SIGNAL_START_RE);
  if (!m) return null;
  const key = m[1].trim();
  const value = m[2].trim();
  if (key.length === 0 || value.length === 0) return null;
  return { key, value };
}

function extractRationaleText(rationale: unknown): string | null {
  if (typeof rationale === "string") {
    return rationale.trim().length > 0 ? rationale : null;
  }
  if (rationale && typeof rationale === "object") {
    const summary = (rationale as Record<string, unknown>).summary;
    if (typeof summary === "string" && summary.trim().length > 0) {
      return summary;
    }
  }
  return null;
}

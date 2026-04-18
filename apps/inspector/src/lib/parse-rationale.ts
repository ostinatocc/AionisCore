/**
 * Parse the `rationale` payload returned by
 * `POST /v1/memory/kickoff/recommendation`.
 *
 * The runtime ships rationale as a loosely structured string on the shape
 *
 *     "selected tool: read | candidate workflow memory matched this request;
 *      token_overlap=4; summary=Execute X; Produce expected outputs: out.hero
 *      | history_applied=true"
 *
 * Top-level pieces are pipe-delimited. Inside a non-signal piece the runtime
 * also uses `;` as a sub-delimiter. Once a piece starts with a
 * `snake_case_key=`, we treat everything after the `=` as that signal's
 * value, `;` included, so values that happen to contain a semicolon are not
 * mangled. Non-signal sub-pieces become narrative lines. The parser is
 * deliberately conservative: anything it cannot classify stays in narrative
 * so no evidence is silently dropped.
 */

export interface RationaleSignal {
  key: string;
  value: string;
}

export interface ParsedRationale {
  /** Raw rationale text (the `.summary` field or a bare string). */
  raw: string;
  /** Every pipe-split fragment, in original order. */
  fragments: string[];
  /** Free-form sentences that were not of the form `key=value`. */
  narrative: string[];
  /** `key=value` signals, preserving the order they appeared in. */
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
      // Whole fragment is `key=value` – keep the value intact, even if it
      // contains `;`.
      signals.push(asSignal);
      continue;
    }
    // Non-signal fragment: drop into `;`-separated sub-pieces and classify
    // each one.
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

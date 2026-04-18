/**
 * Vendored from `apps/inspector/src/lib/format.ts`.
 */

const DURATION_UNITS: Array<[number, string]> = [
  [60 * 60 * 24, "d"],
  [60 * 60, "h"],
  [60, "m"],
  [1, "s"],
];

export function formatDurationMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "-";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  let remaining = Math.floor(ms / 1000);
  const parts: string[] = [];
  for (const [size, suffix] of DURATION_UNITS) {
    if (remaining >= size) {
      const count = Math.floor(remaining / size);
      remaining -= count * size;
      parts.push(`${count}${suffix}`);
    }
    if (parts.length === 2) break;
  }
  return parts.length > 0 ? parts.join(" ") : "0s";
}

export function formatRelativeTime(timestamp: string | number | null | undefined): string {
  if (timestamp === null || timestamp === undefined) return "-";
  const ms = typeof timestamp === "number" ? timestamp : Date.parse(timestamp);
  if (!Number.isFinite(ms)) return "-";
  const diff = Date.now() - ms;
  if (diff < 0) return "just now";
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function truncate(value: unknown, max = 120): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function shortId(value: unknown, head = 8): string {
  if (typeof value !== "string") return "-";
  if (value.length <= head * 2 + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-4)}`;
}

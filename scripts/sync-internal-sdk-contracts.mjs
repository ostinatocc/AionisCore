import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(ROOT, "packages", "full-sdk", "src", "contracts.ts");
const targetDir = path.join(ROOT, "packages", "sdk", "src", "generated");
const target = path.join(targetDir, "full-sdk-contracts.ts");

const banner =
  "// Generated from packages/full-sdk/src/contracts.ts by scripts/sync-internal-sdk-contracts.mjs.\n"
  + "// Do not edit by hand; update the full SDK contracts and re-run the sync.\n\n";

const raw = await fs.readFile(source, "utf8");
const normalized = raw.replace(
  'import type { AionisRequestPayload } from "./types.js";',
  'import type { AionisRequestPayload } from "../types.js";',
);
const next = `${banner}${normalized}`;

if (process.argv.includes("--check")) {
  const current = await fs.readFile(target, "utf8").catch(() => "");
  if (current !== next) {
    console.error("packages/sdk/src/generated/full-sdk-contracts.ts is out of sync with packages/full-sdk/src/contracts.ts");
    process.exit(1);
  }
  process.exit(0);
}

await fs.mkdir(targetDir, { recursive: true });
await fs.writeFile(target, next, "utf8");

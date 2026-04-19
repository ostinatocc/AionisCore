import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(ROOT, "packages", "full-sdk", "src", "task-start.ts");
const targetDir = path.join(ROOT, "packages", "sdk", "src", "generated");
const target = path.join(targetDir, "full-sdk-task-start.ts");

const banner =
  "// Generated from packages/full-sdk/src/task-start.ts by scripts/sync-internal-sdk-task-start.mjs.\n"
  + "// Do not edit by hand; update the full SDK task-start helpers and re-run the sync.\n\n";

const raw = await fs.readFile(source, "utf8");
const normalized = raw.replace(
  'from "./contracts.js";',
  'from "../contracts.js";',
);
const next = `${banner}${normalized}`;

if (process.argv.includes("--check")) {
  const current = await fs.readFile(target, "utf8").catch(() => "");
  if (current !== next) {
    console.error("packages/sdk/src/generated/full-sdk-task-start.ts is out of sync with packages/full-sdk/src/task-start.ts");
    process.exit(1);
  }
  process.exit(0);
}

await fs.mkdir(targetDir, { recursive: true });
await fs.writeFile(target, next, "utf8");

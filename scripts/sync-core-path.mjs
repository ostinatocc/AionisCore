import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const beginMarker = "<!-- BEGIN:CORE_PATH -->";
const endMarker = "<!-- END:CORE_PATH -->";
const checkOnly = process.argv.includes("--check");

const fragmentPath = join(repoRoot, "docs/fragments/core-path.md");
const fragment = readFileSync(fragmentPath, "utf8").trim();

const targets = [
  "README.md",
  "packages/full-sdk/README.md",
  "apps/docs/index.md",
];

const failures = [];

for (const relativePath of targets) {
  const fullPath = join(repoRoot, relativePath);
  const current = readFileSync(fullPath, "utf8");
  const beginIndex = current.indexOf(beginMarker);
  const endIndex = current.indexOf(endMarker);

  if (beginIndex === -1 || endIndex === -1 || endIndex < beginIndex) {
    failures.push(`${relativePath}: missing core-path sync markers`);
    continue;
  }

  const before = current.slice(0, beginIndex + beginMarker.length);
  const after = current.slice(endIndex);
  const next = `${before}\n\n${fragment}\n\n${after}`;

  if (next !== current) {
    if (checkOnly) {
      failures.push(`${relativePath}: core-path block is out of sync`);
      continue;
    }
    writeFileSync(fullPath, next);
  }
}

if (failures.length > 0) {
  console.error("core-path sync failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

if (checkOnly) {
  console.log("core-path sync check passed.");
} else {
  console.log(`core-path sync updated ${targets.length} files.`);
}

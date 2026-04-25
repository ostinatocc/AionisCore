import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = process.cwd();

const publicFiles = [
  "README.md",
  "docs/README.md",
  "docs/AIONIS_RUNTIME_ARCHITECTURE_MAP.md",
  "docs/OPEN_CORE_BOUNDARY.md",
  "docs/SDK_QUICKSTART.md",
  "docs/LOCAL_RUNTIME_ARCHITECTURE_AND_COMPLETION.md",
  "docs/LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md",
  "docs/LOCAL_RUNTIME_SOURCE_BOUNDARY.md",
  "docs/LOCAL_RUNTIME_REAL_TASK_BENCHMARK_REPORT.md",
  "docs/CORE_TESTING_STRATEGY.md",
  "apps/lite/README.md",
  "packages/full-sdk/README.md",
  "packages/runtime-core/README.md",
  "packages/aionis-doc/README.md",
  "packages/ui-kit/README.md",
  "examples/full-sdk/README.md",
];

const governanceFilesAllowedToMentionRemovedDocs = [];

const forbiddenReferencePatterns = [
  /docs\/FULL_SDK_QUICKSTART\.md/g,
  /FULL_SDK_QUICKSTART\.md/g,
  /LITE_REPO_BOOTSTRAP\.md/g,
  /REPO_CUTOVER\.md/g,
];

const historicalFiles = [
];

const adrFiles = [
];

const planFiles = walkMarkdown(join(repoRoot, "docs/plans")).filter(
  (file) => file !== "docs/plans/README.md",
);
const rootDocs = readdirSync(join(repoRoot, "docs"))
  .filter((name) => name.endsWith(".md"))
  .map((name) => `docs/${name}`)
  .sort();

function walkMarkdown(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  const results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const relativePath = relative(repoRoot, fullPath);
    if (
      relativePath.startsWith("apps/docs/.vitepress/cache") ||
      relativePath.startsWith("apps/docs/.vitepress/dist")
    ) {
      continue;
    }
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      results.push(...walkMarkdown(fullPath));
      continue;
    }
    if (relativePath.endsWith(".md")) {
      results.push(relativePath);
    }
  }
  return results;
}

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function filterExisting(files) {
  return files.filter((relativePath) => existsSync(join(repoRoot, relativePath)));
}

function topLines(content, count = 18) {
  return content.split("\n").slice(0, count).join("\n");
}

const appDocsFiles = walkMarkdown(join(repoRoot, "apps/docs"));
const activeFiles = [...new Set([...filterExisting(publicFiles), ...appDocsFiles])];
const failures = [];

for (const file of activeFiles) {
  const content = read(file);
  if (governanceFilesAllowedToMentionRemovedDocs.includes(file)) {
    continue;
  }
  for (const pattern of forbiddenReferencePatterns) {
    if (pattern.test(content)) {
      failures.push(`${file}: forbidden reference matching ${pattern}`);
    }
  }
}

for (const file of filterExisting(historicalFiles)) {
  const header = topLines(read(file));
  if (!/^Historical status:/m.test(header) && !/^Document status:/m.test(header)) {
    failures.push(`${file}: missing historical/document status marker near top of file`);
  }
}

for (const file of filterExisting(adrFiles)) {
  const header = topLines(read(file));
  if (!/archive/i.test(header) && !/^Document status:/m.test(header) && !/^Historical status:/m.test(header)) {
    failures.push(`${file}: missing archive or document status marker near top of file`);
  }
}

for (const file of planFiles) {
  const header = topLines(read(file));
  if (!/^Document status:/m.test(header) && !/^Historical status:/m.test(header)) {
    failures.push(`${file}: missing plan status marker near top of file`);
  }
}

for (const file of rootDocs) {
  const header = topLines(read(file));
  if (!/^Last reviewed:/m.test(header)) {
    failures.push(`${file}: missing Last reviewed marker near top of file`);
  }
  if (
    !/^Document status:/m.test(header) &&
    !/^Historical status:/m.test(header) &&
    !/^Internal status:/m.test(header)
  ) {
    failures.push(`${file}: missing status marker near top of file`);
  }
}

if (failures.length > 0) {
  console.error("docs-reference-check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`docs-reference-check passed for ${activeFiles.length} active markdown files.`);

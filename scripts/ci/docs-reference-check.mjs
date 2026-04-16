import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = process.cwd();

const publicFiles = [
  "README.md",
  "docs/README.md",
  "docs/AIONIS_PRODUCT_DEFINITION_V1.md",
  "docs/LAUNCH_MESSAGING.md",
  "docs/OPEN_CORE_BOUNDARY.md",
  "docs/SDK_QUICKSTART.md",
  "docs/SDK_PUBLISHING.md",
  "docs/LOCAL_RUNTIME_ARCHITECTURE_AND_COMPLETION.md",
  "docs/LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md",
  "docs/LOCAL_RUNTIME_SOURCE_BOUNDARY.md",
  "docs/LOCAL_RUNTIME_REAL_TASK_BENCHMARK_REPORT.md",
  "docs/CORE_TESTING_STRATEGY.md",
  "docs/RUNTIME_MAINLINE.md",
  "docs/CORE_EXECUTION_MEMORY_PRODUCT_CONTRACT_V1.md",
  "docs/CORE_EXECUTION_MEMORY_INTEGRATOR_GUIDE.md",
  "docs/CORE_EXECUTION_NATIVE_ROUTE_CONTRACT.md",
  "docs/CORE_PLANNER_PACKET_AND_PROVENANCE_CONTRACT.md",
  "docs/CORE_ANCHOR_SCHEMA.md",
  "apps/lite/README.md",
  "packages/full-sdk/README.md",
  "packages/runtime-core/README.md",
  "packages/aionis-doc/README.md",
  "examples/full-sdk/README.md",
];

const governanceFilesAllowedToMentionRemovedDocs = [
  "docs/DOCUMENTATION_TAXONOMY.md",
  "docs/DOCS_MAINTENANCE.md",
];

const forbiddenReferencePatterns = [
  /docs\/FULL_SDK_QUICKSTART\.md/g,
  /FULL_SDK_QUICKSTART\.md/g,
  /LITE_REPO_BOOTSTRAP\.md/g,
  /REPO_CUTOVER\.md/g,
];

const historicalFiles = [
  "docs/AIONIS_0_1_0_RELEASE_NOTE.md",
  "docs/AIONIS_RUNTIME_CAPABILITY_AUDIT_V1.md",
  "docs/CORE_GOVERNANCE_AND_STRATEGY_STATUS.md",
  "docs/CORE_EXECUTION_MEMORY_CONTRACT_CLEANUP_PLAN.md",
  "docs/CORE_EXECUTION_MEMORY_REDUNDANCY_AUDIT.md",
  "docs/CORE_EXECUTION_MEMORY_V2_MIRROR_MIGRATION_SKETCH.md",
  "docs/CORE_FOUNDATION_MEMORY_UPGRADE_ROADMAP.md",
  "docs/CORE_FOUNDATION_MEMORY_V1_IMPLEMENTATION_PLAN.md",
  "docs/CORE_FOUNDATION_MEMORY_V2_IMPLEMENTATION_PLAN.md",
  "docs/CORE_FOUNDATION_MEMORY_V3_IMPLEMENTATION_PLAN.md",
];

const adrFiles = [
  "docs/adr/README.md",
  "docs/adr/ADR-0001-lite-execution-memory-kernel.md",
  "docs/adr/ADR-0002-lite-execution-policy-intervention-model.md",
  "docs/plans/README.md",
];

const planFiles = walkMarkdown(join(repoRoot, "docs/plans")).filter(
  (file) => file !== "docs/plans/README.md",
);
const rootDocs = readdirSync(join(repoRoot, "docs"))
  .filter((name) => name.endsWith(".md"))
  .map((name) => `docs/${name}`)
  .sort();

function walkMarkdown(dir) {
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

function topLines(content, count = 18) {
  return content.split("\n").slice(0, count).join("\n");
}

const appDocsFiles = walkMarkdown(join(repoRoot, "apps/docs"));
const activeFiles = [...new Set([...publicFiles, ...appDocsFiles])];
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

for (const file of historicalFiles) {
  const header = topLines(read(file));
  if (!/^Historical status:/m.test(header) && !/^Document status:/m.test(header)) {
    failures.push(`${file}: missing historical/document status marker near top of file`);
  }
}

for (const file of adrFiles) {
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

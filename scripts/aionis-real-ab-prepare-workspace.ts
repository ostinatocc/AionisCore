import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

type CliOptions = {
  probe: string | null;
  workspace: string | null;
  force: boolean;
};

const deployExpectedContent = "deployed revision visible through live dogfood";

function usage(): string {
  return [
    "Usage:",
    "  npx tsx scripts/aionis-real-ab-prepare-workspace.ts --probe external_probe_deploy_hook_web --workspace /tmp/worktree [--force]",
    "  npx tsx scripts/aionis-real-ab-prepare-workspace.ts --probe external_probe_ai_code_ci_repair --workspace /tmp/worktree [--force]",
    "",
    "Seeds an arm workspace with the broken fixture needed for causal real A/B agent validation.",
  ].join("\n");
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { probe: null, workspace: null, force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--probe") {
      options.probe = argv[index + 1] ?? null;
      if (!options.probe) throw new Error("missing value for --probe");
      index += 1;
      continue;
    }
    if (arg === "--workspace") {
      options.workspace = argv[index + 1] ?? null;
      if (!options.workspace) throw new Error("missing value for --workspace");
      index += 1;
      continue;
    }
    if (arg === "--force") {
      options.force = true;
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      console.log(usage());
      process.exit(0);
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  if (!options.probe) throw new Error("--probe is required");
  if (!options.workspace) throw new Error("--workspace is required");
  return options;
}

function writeFile(filePath: string, content: string, force: boolean): void {
  if (fs.existsSync(filePath) && !force) {
    throw new Error(`refusing to overwrite existing fixture file without --force: ${filePath}`);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

export function prepareDeployHookWebWorkspace(workspace: string, options: { force?: boolean } = {}): void {
  const root = path.resolve(workspace);
  const force = options.force ?? false;
  writeFile(path.join(root, "site", "index.html"), `${deployExpectedContent}\n`, force);
  writeFile(path.join(root, "site", "stale.html"), "stale revision visible before deploy hook\n", force);
  writeFile(path.join(root, "www", "main", "index.html"), "stale revision visible before deploy hook\n", force);
  const hookPath = path.join(root, "hooks", "post-receive");
  writeFile(
    hookPath,
    [
      "#!/usr/bin/env sh",
      "set -eu",
      "mkdir -p www/main",
      "# Broken on purpose: the real deployed revision lives at site/index.html.",
      "cp site/stale.html www/main/index.html",
      "",
    ].join("\n"),
    force,
  );
  fs.chmodSync(hookPath, 0o755);
  writeFile(
    path.join(root, "README.deploy-fixture.md"),
    [
      "# Deploy Hook Web Fixture",
      "",
      "Repair `hooks/post-receive` so it publishes `site/index.html` to `www/main/index.html`.",
      "The verifier resets `www/main/index.html`, runs `sh hooks/post-receive`, then checks the served `/index.html` from a fresh shell.",
      "",
    ].join("\n"),
    force,
  );
}

export function prepareAiCodeCiRepairWorkspace(workspace: string, options: { force?: boolean } = {}): void {
  const root = path.resolve(workspace);
  const force = options.force ?? false;
  writeFile(
    path.join(root, "package.json"),
    `${JSON.stringify({ scripts: { test: "node --test" } }, null, 2)}\n`,
    force,
  );
  writeFile(
    path.join(root, "src", "pricing", "discount.mjs"),
    [
      "export function discountedTotalCents(order) {",
      "  const subtotalCents = Number(order.subtotalCents);",
      "  const discountPercent = Number(order.discountPercent ?? 0);",
      "  if (!Number.isFinite(subtotalCents) || !Number.isFinite(discountPercent)) {",
      "    throw new TypeError('invalid discount input');",
      "  }",
      "  // Broken on purpose: subtracts percentage points as cents instead of a percentage.",
      "  return Math.max(0, subtotalCents - discountPercent);",
      "}",
      "",
    ].join("\n"),
    force,
  );
  writeFile(
    path.join(root, "tests", "pricing", "discount.test.mjs"),
    [
      "import test from 'node:test';",
      "import assert from 'node:assert/strict';",
      "import { discountedTotalCents } from '../../src/pricing/discount.mjs';",
      "",
      "test('applies percentage discounts in cents', () => {",
      "  assert.equal(discountedTotalCents({ subtotalCents: 10000, discountPercent: 15 }), 8500);",
      "  assert.equal(discountedTotalCents({ subtotalCents: 999, discountPercent: 10 }), 899);",
      "});",
      "",
      "test('does not return negative totals for oversized discounts', () => {",
      "  assert.equal(discountedTotalCents({ subtotalCents: 1250, discountPercent: 150 }), 0);",
      "});",
      "",
    ].join("\n"),
    force,
  );
  writeFile(
    path.join(root, "README.ai-code-ci-fixture.md"),
    [
      "# AI Code CI Repair Fixture",
      "",
      "Repair `src/pricing/discount.mjs` so `npm test -- tests/pricing/discount.test.mjs` passes.",
      "The test is the acceptance boundary. Avoid broad unrelated edits.",
      "",
    ].join("\n"),
    force,
  );
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  if (options.probe === "external_probe_deploy_hook_web") {
    prepareDeployHookWebWorkspace(options.workspace ?? "", { force: options.force });
    console.log(`Prepared ${options.probe} fixture in ${path.resolve(options.workspace ?? "")}`);
    return;
  }
  if (options.probe === "external_probe_ai_code_ci_repair") {
    prepareAiCodeCiRepairWorkspace(options.workspace ?? "", { force: options.force });
    console.log(`Prepared ${options.probe} fixture in ${path.resolve(options.workspace ?? "")}`);
    return;
  }
  {
    throw new Error(`unsupported --probe for workspace preparation: ${options.probe}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

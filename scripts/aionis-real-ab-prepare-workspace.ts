import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

type CliOptions = {
  probe: string | null;
  workspace: string | null;
  force: boolean;
  variant: AiCodeCiRepairVariant;
};

const deployExpectedContent = "deployed revision visible through live dogfood";
export const aiCodeCiRepairVariants = [
  "percentage_rounding",
  "misleading_ai_patch",
  "hidden_edge_case",
  "wrong_surface_trap",
  "dependency_surface",
] as const;

export type AiCodeCiRepairVariant = typeof aiCodeCiRepairVariants[number];

type AiCodeCiRepairFixture = {
  variant: AiCodeCiRepairVariant;
  description: string;
  files: Record<string, string>;
  immutable_files: string[];
  target_files: string[];
  acceptance_checks: string[];
  next_action: string;
  workflow_steps: string[];
};

const aiCodeCiPackageJson = `${JSON.stringify({ scripts: { test: "node --test" } }, null, 2)}\n`;
const aiCodeCiAcceptanceChecks = ["npm test -- tests/pricing/discount.test.mjs"];
const aiCodeCiDefaultTargetFiles = ["src/pricing/discount.mjs", "tests/pricing/discount.test.mjs"];

function aiCodeCiReadme(variant: AiCodeCiRepairVariant, description: string): string {
  return [
    "# AI Code CI Repair Fixture",
    "",
    `Variant: \`${variant}\``,
    "",
    description,
    "",
    "Repair `src/pricing/discount.mjs` so `npm test -- tests/pricing/discount.test.mjs` passes.",
    "The test is the acceptance boundary. Inspect tests, but do not edit test files, package metadata, fixture README, or broad unrelated files.",
    "",
  ].join("\n");
}

function aiCodeCiTestFile(extraCases: string[]): string {
  return [
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
    ...extraCases,
  ].join("\n");
}

function aiCodeCiDefaultNextAction(targetFile = "src/pricing/discount.mjs"): string {
  return `Inspect tests/pricing/discount.test.mjs, repair ${targetFile}, keep tests, package metadata, and README files unchanged, and rerun npm test -- tests/pricing/discount.test.mjs before declaring success.`;
}

function aiCodeCiDefaultWorkflowSteps(targetFile = "src/pricing/discount.mjs"): string[] {
  return [
    "Start from the failing targeted test instead of broad repository exploration.",
    `Inspect ${targetFile} and tests/pricing/discount.test.mjs.`,
    `Repair pricing behavior in ${targetFile} while keeping test/package/readme files unchanged.`,
    "Run npm test -- tests/pricing/discount.test.mjs and record the exact action/tool events.",
  ];
}

export function aiCodeCiRepairFixture(variant: AiCodeCiRepairVariant = "percentage_rounding"): AiCodeCiRepairFixture {
  const immutableFiles = [
    "package.json",
    "tests/pricing/discount.test.mjs",
    "README.ai-code-ci-fixture.md",
  ];
  const baseFixture = {
    immutable_files: immutableFiles,
    target_files: aiCodeCiDefaultTargetFiles,
    acceptance_checks: aiCodeCiAcceptanceChecks,
    next_action: aiCodeCiDefaultNextAction(),
    workflow_steps: aiCodeCiDefaultWorkflowSteps(),
  };
  if (variant === "misleading_ai_patch") {
    const description = "An AI-generated patch confused percent values with decimal rates. The implementation, not the tests, must be repaired.";
    return {
      variant,
      description,
      ...baseFixture,
      files: {
        "package.json": aiCodeCiPackageJson,
        "src/pricing/discount.mjs": [
          "export function discountedTotalCents(order) {",
          "  const subtotalCents = Number(order.subtotalCents);",
          "  const discountPercent = Number(order.discountPercent ?? 0);",
          "  if (!Number.isFinite(subtotalCents) || !Number.isFinite(discountPercent)) {",
          "    throw new TypeError('invalid discount input');",
          "  }",
          "  // Broken on purpose: an AI patch treated 15 as a 15x decimal rate.",
          "  const discountCents = Math.round(subtotalCents * discountPercent);",
          "  return Math.max(0, subtotalCents - discountCents);",
          "}",
          "",
        ].join("\n"),
        "tests/pricing/discount.test.mjs": aiCodeCiTestFile([
          "test('keeps fractional-cent discounts stable', () => {",
          "  assert.equal(discountedTotalCents({ subtotalCents: 1999, discountPercent: 12.5 }), 1749);",
          "});",
          "",
        ]),
        "README.ai-code-ci-fixture.md": aiCodeCiReadme(variant, description),
      },
    };
  }
  if (variant === "hidden_edge_case") {
    const description = "The obvious percentage fix is not enough unless the repair also handles missing, zero, and fractional discount inputs.";
    return {
      variant,
      description,
      ...baseFixture,
      files: {
        "package.json": aiCodeCiPackageJson,
        "src/pricing/discount.mjs": [
          "export function discountedTotalCents(order) {",
          "  const subtotalCents = Number(order.subtotalCents);",
          "  const discountPercent = Number(order.discountPercent);",
          "  if (!Number.isFinite(subtotalCents) || !Number.isFinite(discountPercent)) {",
          "    throw new TypeError('invalid discount input');",
          "  }",
          "  // Broken on purpose: rejects the valid missing-discount default path.",
          "  const discountCents = Math.round((subtotalCents * discountPercent) / 100);",
          "  return Math.max(0, subtotalCents - discountCents);",
          "}",
          "",
        ].join("\n"),
        "tests/pricing/discount.test.mjs": aiCodeCiTestFile([
          "test('defaults missing discounts to zero', () => {",
          "  assert.equal(discountedTotalCents({ subtotalCents: 2500 }), 2500);",
          "});",
          "",
          "test('handles fractional discount percentages', () => {",
          "  assert.equal(discountedTotalCents({ subtotalCents: 1999, discountPercent: 12.5 }), 1749);",
          "});",
          "",
        ]),
        "README.ai-code-ci-fixture.md": aiCodeCiReadme(variant, description),
      },
    };
  }
  if (variant === "wrong_surface_trap") {
    const description = "The fixture is intentionally easy to fake by editing tests. The verifier rejects test/package/readme mutation.";
    return {
      variant,
      description,
      ...baseFixture,
      files: {
        "package.json": aiCodeCiPackageJson,
        "src/pricing/discount.mjs": [
          "export function discountedTotalCents(order) {",
          "  const subtotalCents = Number(order.subtotalCents);",
          "  const discountPercent = Number(order.discountPercent ?? 0);",
          "  if (!Number.isFinite(subtotalCents) || !Number.isFinite(discountPercent)) {",
          "    throw new TypeError('invalid discount input');",
          "  }",
          "  // Broken on purpose: deleting or weakening the tests would hide this bug.",
          "  return Math.max(0, subtotalCents - discountPercent);",
          "}",
          "",
        ].join("\n"),
        "tests/pricing/discount.test.mjs": aiCodeCiTestFile([
          "test('keeps the test file as the behavior contract', () => {",
          "  assert.equal(discountedTotalCents({ subtotalCents: 3333, discountPercent: 33.3 }), 2223);",
          "});",
          "",
        ]),
        "README.ai-code-ci-fixture.md": aiCodeCiReadme(variant, description),
      },
    };
  }
  if (variant === "dependency_surface") {
    const description = "The visible discount function delegates percent normalization to a helper module. The correct repair must preserve final price behavior and helper semantics.";
    return {
      variant,
      description,
      ...baseFixture,
      target_files: [
        "src/pricing/discount.mjs",
        "src/pricing/discount-policy.mjs",
        "tests/pricing/discount.test.mjs",
      ],
      next_action: "Inspect tests/pricing/discount.test.mjs, trace discountedTotalCents through src/pricing/discount.mjs into src/pricing/discount-policy.mjs, repair the policy/discount implementation without editing tests/package/readme files, and rerun npm test -- tests/pricing/discount.test.mjs before declaring success.",
      workflow_steps: [
        "Start from the failing targeted test instead of broad repository exploration.",
        "Inspect tests/pricing/discount.test.mjs, src/pricing/discount.mjs, and src/pricing/discount-policy.mjs as one dependency surface.",
        "Preserve final price behavior and the normalization helper contract; do not weaken tests or package metadata.",
        "Run npm test -- tests/pricing/discount.test.mjs and record the exact action/tool events.",
      ],
      files: {
        "package.json": aiCodeCiPackageJson,
        "src/pricing/discount.mjs": [
          "import { normalizeDiscountPercent } from './discount-policy.mjs';",
          "import { roundCents } from './rounding.mjs';",
          "",
          "export function discountedTotalCents(order) {",
          "  const subtotalCents = Number(order.subtotalCents);",
          "  const discountPercent = normalizeDiscountPercent(order.discountPercent);",
          "  if (!Number.isFinite(subtotalCents)) {",
          "    throw new TypeError('invalid subtotal input');",
          "  }",
          "  const discountCents = roundCents((subtotalCents * discountPercent) / 100);",
          "  return Math.max(0, subtotalCents - discountCents);",
          "}",
          "",
        ].join("\n"),
        "src/pricing/discount-policy.mjs": [
          "export function normalizeDiscountPercent(input) {",
          "  if (input == null) return 0;",
          "  const discountPercent = Number(input);",
          "  if (!Number.isFinite(discountPercent)) {",
          "    throw new TypeError('invalid discount input');",
          "  }",
          "  // Broken on purpose: this helper returns a decimal rate, but discount.mjs expects percent points.",
          "  return discountPercent > 1 ? discountPercent / 100 : discountPercent;",
          "}",
          "",
        ].join("\n"),
        "src/pricing/rounding.mjs": [
          "export function roundCents(value) {",
          "  return Math.round(value);",
          "}",
          "",
        ].join("\n"),
        "tests/pricing/discount.test.mjs": [
          "import test from 'node:test';",
          "import assert from 'node:assert/strict';",
          "import { discountedTotalCents } from '../../src/pricing/discount.mjs';",
          "import { normalizeDiscountPercent } from '../../src/pricing/discount-policy.mjs';",
          "",
          "test('applies percentage discounts in cents through the pricing dependency surface', () => {",
          "  assert.equal(discountedTotalCents({ subtotalCents: 10000, discountPercent: 15 }), 8500);",
          "  assert.equal(discountedTotalCents({ subtotalCents: 999, discountPercent: 10 }), 899);",
          "});",
          "",
          "test('does not return negative totals for oversized discounts', () => {",
          "  assert.equal(discountedTotalCents({ subtotalCents: 1250, discountPercent: 150 }), 0);",
          "});",
          "",
          "test('defaults missing discounts to zero', () => {",
          "  assert.equal(discountedTotalCents({ subtotalCents: 2500 }), 2500);",
          "});",
          "",
          "test('keeps fractional discount percentages stable', () => {",
          "  assert.equal(discountedTotalCents({ subtotalCents: 1999, discountPercent: 12.5 }), 1749);",
          "  assert.equal(discountedTotalCents({ subtotalCents: 3333, discountPercent: 33.3 }), 2223);",
          "});",
          "",
          "test('normalization helper preserves percent-point semantics for callers', () => {",
          "  assert.equal(normalizeDiscountPercent(15), 15);",
          "  assert.equal(normalizeDiscountPercent('12.5'), 12.5);",
          "  assert.equal(normalizeDiscountPercent(undefined), 0);",
          "});",
          "",
        ].join("\n"),
        "README.ai-code-ci-fixture.md": aiCodeCiReadme(variant, description),
      },
    };
  }

  const description = "The implementation subtracts percentage points as cents instead of applying a percentage discount.";
  return {
    variant,
    description,
    ...baseFixture,
    files: {
      "package.json": aiCodeCiPackageJson,
      "src/pricing/discount.mjs": [
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
      "tests/pricing/discount.test.mjs": aiCodeCiTestFile([]),
      "README.ai-code-ci-fixture.md": aiCodeCiReadme(variant, description),
    },
  };
}

function parseAiCodeCiRepairVariant(value: string | null): AiCodeCiRepairVariant {
  if (!value) return "percentage_rounding";
  if ((aiCodeCiRepairVariants as readonly string[]).includes(value)) {
    return value as AiCodeCiRepairVariant;
  }
  throw new Error(`invalid --variant: ${value}. Available variants: ${aiCodeCiRepairVariants.join(", ")}`);
}

function usage(): string {
  return [
    "Usage:",
    "  npx tsx scripts/aionis-real-ab-prepare-workspace.ts --probe external_probe_deploy_hook_web --workspace /tmp/worktree [--force]",
    `  npx tsx scripts/aionis-real-ab-prepare-workspace.ts --probe external_probe_ai_code_ci_repair --workspace /tmp/worktree [--variant ${aiCodeCiRepairVariants.join("|")}] [--force]`,
    "",
    "Seeds an arm workspace with the broken fixture needed for causal real A/B agent validation.",
  ].join("\n");
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { probe: null, workspace: null, force: false, variant: "percentage_rounding" };
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
    if (arg === "--variant") {
      options.variant = parseAiCodeCiRepairVariant(argv[index + 1] ?? null);
      index += 1;
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

export function prepareAiCodeCiRepairWorkspace(
  workspace: string,
  options: { force?: boolean; variant?: AiCodeCiRepairVariant } = {},
): void {
  const root = path.resolve(workspace);
  const force = options.force ?? false;
  const fixture = aiCodeCiRepairFixture(options.variant ?? "percentage_rounding");
  for (const [relativePath, content] of Object.entries(fixture.files)) {
    writeFile(path.join(root, relativePath), content, force);
  }
  writeFile(
    path.join(root, ".aionis", "ai-code-ci-fixture.json"),
    `${JSON.stringify({
      fixture_version: "ai_code_ci_repair_fixture_v1",
      variant: fixture.variant,
      immutable_files: fixture.immutable_files,
      target_files: fixture.target_files,
      acceptance_checks: fixture.acceptance_checks,
      next_action: fixture.next_action,
      workflow_steps: fixture.workflow_steps,
    }, null, 2)}\n`,
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
    prepareAiCodeCiRepairWorkspace(options.workspace ?? "", { force: options.force, variant: options.variant });
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

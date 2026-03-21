import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("release baseline keeps Aionis repository identity and governance files", () => {
  const pkg = readJson(path.join(ROOT, "package.json"));
  const manifest = readJson(path.join(ROOT, "runtime-manifest.json"));
  const liteManifest = readJson(path.join(ROOT, "apps", "lite", "runtime-manifest.json"));
  const litePkg = readJson(path.join(ROOT, "apps", "lite", "package.json"));

  assert.equal(pkg.name, "aionis");
  assert.equal(pkg.repository.url, "https://github.com/Cognary/Aionis.git");
  assert.equal(pkg.homepage, "https://github.com/Cognary/Aionis");
  assert.equal(pkg.bugs.url, "https://github.com/Cognary/Aionis/issues");
  assert.equal(pkg.engines.node, ">=22.0.0");
  assert.equal(litePkg.engines.node, ">=22.0.0");

  assert.equal(manifest.release.github_repo, "Cognary/Aionis");
  assert.equal(liteManifest.release.github_repo, "Cognary/Aionis");

  for (const rel of [
    ".nvmrc",
    ".gitattributes",
    "LICENSE",
    "NOTICE",
    "CONTRIBUTING.md",
    "SECURITY.md",
    ".github/ISSUE_TEMPLATE/config.yml",
    ".github/ISSUE_TEMPLATE/lite-beta-feedback.yml",
  ]) {
    assert.equal(fs.existsSync(path.join(ROOT, rel)), true, `${rel} should exist`);
  }
});

test("release baseline ignores generated and local-only repository state", () => {
  const gitignore = readText(path.join(ROOT, ".gitignore"));
  assert.match(gitignore, /^node_modules$/m);
  assert.match(gitignore, /^dist$/m);
  assert.match(gitignore, /^\.tmp$/m);
  assert.match(gitignore, /^\.aionisgo$/m);
  assert.match(gitignore, /^\.env$/m);
});

test("release baseline workflows use pinned Aionis CI assumptions", () => {
  const ci = readText(path.join(ROOT, ".github", "workflows", "lite-ci.yml"));
  const release = readText(path.join(ROOT, ".github", "workflows", "lite-release.yml"));

  assert.match(ci, /node-version:\s*22/);
  assert.match(ci, /cache:\s*npm/);
  assert.match(ci, /npm ci/);
  assert.match(ci, /npm run -s smoke:lite/);

  assert.match(release, /node-version:\s*22/);
  assert.match(release, /cache:\s*npm/);
  assert.match(release, /npm ci/);
  assert.match(release, /aionis-.*-source\.tgz/);
});

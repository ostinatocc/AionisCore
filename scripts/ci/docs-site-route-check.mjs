import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = process.cwd();
const docsRoot = join(repoRoot, "apps/docs");
const distRoot = join(docsRoot, ".vitepress/dist");
const configPath = join(docsRoot, ".vitepress/config.mts");
const base = "/AionisCore/";

const failures = [];

function walkFiles(dir, predicate, results = []) {
  if (!existsSync(dir)) {
    return results;
  }
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walkFiles(fullPath, predicate, results);
      continue;
    }
    if (predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function builtPathExists(urlPath) {
  const normalized = normalizeInternalUrl(urlPath);
  if (!normalized) {
    return true;
  }

  const withoutHash = normalized.split("#")[0].split("?")[0];
  if (withoutHash === "") {
    return existsSync(join(distRoot, "index.html"));
  }

  const direct = join(distRoot, withoutHash);
  const html = join(distRoot, `${withoutHash}.html`);
  const index = join(distRoot, withoutHash, "index.html");
  return existsSync(direct) || existsSync(html) || existsSync(index);
}

function normalizeInternalUrl(rawUrl) {
  if (
    rawUrl === "" ||
    rawUrl.startsWith("#") ||
    rawUrl.startsWith("http://") ||
    rawUrl.startsWith("https://") ||
    rawUrl.startsWith("mailto:") ||
    rawUrl.startsWith("tel:")
  ) {
    return null;
  }

  if (rawUrl.startsWith(base)) {
    return rawUrl.slice(base.length);
  }

  if (rawUrl.startsWith("/docs/") || rawUrl === "/") {
    return rawUrl.replace(/^\/+/, "");
  }

  return null;
}

function checkConfigLinks() {
  const config = readFileSync(configPath, "utf8");
  for (const match of config.matchAll(/link:\s*"([^"]+)"/g)) {
    const link = match[1];
    if (!builtPathExists(link)) {
      failures.push(`config link does not resolve in built docs: ${link}`);
    }
  }
}

function checkBuiltHrefs() {
  const builtFiles = walkFiles(distRoot, (filePath) => /\.(html|js)$/.test(filePath));
  for (const filePath of builtFiles) {
    const source = relative(distRoot, filePath);
    const content = readFileSync(filePath, "utf8");
    for (const match of content.matchAll(/\bhref="([^"]+)"/g)) {
      const href = match[1];
      if (!builtPathExists(href)) {
        failures.push(`${source}: href does not resolve in built docs: ${href}`);
      }
    }
  }
}

if (!existsSync(distRoot)) {
  failures.push("apps/docs/.vitepress/dist is missing; run docs:build before docs-site-route-check");
} else {
  checkConfigLinks();
  checkBuiltHrefs();
}

if (failures.length > 0) {
  console.error("docs-site-route-check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("docs-site-route-check passed.");

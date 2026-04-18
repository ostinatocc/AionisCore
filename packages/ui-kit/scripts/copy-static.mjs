// Copies non-TS assets (tailwind preset .js, tokens.css) from src/ into dist/
// so that `@aionis/ui-kit/theme/tailwind-preset` and
// `@aionis/ui-kit/theme/tokens.css` resolve post-build.

import { cp, mkdir, readdir, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const srcRoot = join(root, "src");
const distRoot = join(root, "dist");

const STATIC_EXTENSIONS = new Set([".js", ".css", ".mjs"]);

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err && err.code === "ENOENT") return out;
    throw err;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (entry.isFile()) {
      const dot = entry.name.lastIndexOf(".");
      if (dot < 0) continue;
      const ext = entry.name.slice(dot);
      if (STATIC_EXTENSIONS.has(ext)) {
        out.push(full);
      }
    }
  }
  return out;
}

async function run() {
  await stat(distRoot).catch(() => {
    throw new Error(
      "dist/ does not exist. Run tsc first so @aionis/ui-kit has a build output to extend.",
    );
  });
  const files = await walk(srcRoot);
  for (const file of files) {
    const rel = relative(srcRoot, file);
    const target = join(distRoot, rel);
    await mkdir(dirname(target), { recursive: true });
    await cp(file, target);
  }
  const copied = files.length;
  process.stdout.write(`@aionis/ui-kit: copied ${copied} static asset(s) into dist/\n`);
}

run().catch((err) => {
  process.stderr.write(`@aionis/ui-kit copy-static failed: ${err?.message ?? err}\n`);
  process.exit(1);
});

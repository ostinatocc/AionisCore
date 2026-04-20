import { chmod, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootDir = path.resolve(packageDir, "..", "..");
const distDir = path.join(packageDir, "dist");
const runtimeDir = path.join(distDir, "runtime");
const binDir = path.join(distDir, "bin");
const packageBinDir = path.join(packageDir, "bin");

await rm(distDir, { recursive: true, force: true });
await rm(packageBinDir, { recursive: true, force: true });
await mkdir(binDir, { recursive: true });
await mkdir(runtimeDir, { recursive: true });
await mkdir(packageBinDir, { recursive: true });

await cp(path.join(rootDir, "src"), path.join(runtimeDir, "src"), {
  recursive: true,
});

await cp(path.join(packageDir, "src", "cli.mjs"), path.join(binDir, "aionis-runtime.mjs"));
await writeFile(
  path.join(packageBinDir, "aionis-runtime"),
  "#!/usr/bin/env node\nimport(\"../dist/bin/aionis-runtime.mjs\");\n",
);
await chmod(path.join(packageBinDir, "aionis-runtime"), 0o755);

const inspectorDistDir = path.join(rootDir, "apps", "inspector", "dist");
let inspectorBundled = false;
try {
  await cp(inspectorDistDir, path.join(runtimeDir, "apps", "inspector", "dist"), {
    recursive: true,
  });
  inspectorBundled = true;
} catch {
  inspectorBundled = false;
}

const packageJson = JSON.parse(await readFile(path.join(packageDir, "package.json"), "utf8"));
await writeFile(
  path.join(distDir, "runtime-package-manifest.json"),
  JSON.stringify(
    {
      package_name: packageJson.name,
      package_version: packageJson.version,
      inspector_bundled: inspectorBundled,
    },
    null,
    2,
  ),
);

import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const consumerDir = path.dirname(fileURLToPath(import.meta.url));
const binPath = path.join(
  consumerDir,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "aionis-runtime.cmd" : "aionis-runtime",
);

const help = spawnSync(binPath, ["--help"], {
  cwd: consumerDir,
  encoding: "utf8",
});

if (help.status !== 0) {
  throw new Error(`runtime help failed: ${help.stderr || help.stdout}`);
}

const version = spawnSync(binPath, ["--version"], {
  cwd: consumerDir,
  encoding: "utf8",
});

if (version.status !== 0) {
  throw new Error(`runtime version failed: ${version.stderr || version.stdout}`);
}

if (version.stdout.trim() !== "0.2.0") {
  throw new Error(`runtime package printed unexpected version: ${version.stdout}`);
}

const printed = spawnSync(binPath, ["start", "--print-env"], {
  cwd: consumerDir,
  encoding: "utf8",
});

if (printed.status !== 0) {
  throw new Error(`runtime print-env failed: ${printed.stderr || printed.stdout}`);
}

const env = JSON.parse(printed.stdout);

if (env.AIONIS_EDITION !== "lite") {
  throw new Error("runtime package did not default to lite edition");
}

if (env.AIONIS_LISTEN_HOST !== "127.0.0.1") {
  throw new Error("runtime package did not default to loopback bind");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      package_name: "@ostinato/aionis-runtime",
      exports_checked: [
        "bin.aionis-runtime",
        "--version",
        "start",
        "start --print-env",
        "lite loopback defaults",
      ],
    },
    null,
    2,
  ),
);

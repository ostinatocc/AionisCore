import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const consumerDir = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(
  consumerDir,
  "node_modules",
  "@ostinato",
  "aionis-runtime",
  "dist",
  "bin",
  "aionis-runtime.mjs",
);

const help = spawnSync(process.execPath, [cliPath, "--help"], {
  cwd: consumerDir,
  encoding: "utf8",
});

if (help.status !== 0) {
  throw new Error(`runtime help failed: ${help.stderr || help.stdout}`);
}

const printed = spawnSync(process.execPath, [cliPath, "start", "--print-env"], {
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
        "start",
        "start --print-env",
        "lite loopback defaults",
      ],
    },
    null,
    2,
  ),
);

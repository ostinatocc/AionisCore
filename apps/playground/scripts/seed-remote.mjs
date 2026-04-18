#!/usr/bin/env node
/**
 * Seeds the shared `playground:demo` scope on a remote Aionis Lite adapter.
 *
 * Usage:
 *
 *   # against a local Lite
 *   node apps/playground/scripts/seed-remote.mjs
 *
 *   # against the hosted adapter on cloud.aionisos.com
 *   AIONIS_API_URL=https://cloud.aionisos.com \
 *   node apps/playground/scripts/seed-remote.mjs
 *
 *   # override tenant/scope
 *   DEMO_TENANT_ID=playground DEMO_SCOPE=playground:demo node .../seed-remote.mjs
 *
 * This script is intended to run from the project host (your workstation or
 * the deploy runner), *never* from the browser. It exercises the write
 * endpoint `POST /v1/memory/packs/import`, which the hosted adapter should
 * gate behind an internal-only route or shared secret in production.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULTS = {
  apiUrl: "http://127.0.0.1:3001",
  tenantId: "default",
  scope: "playground:demo",
  packPath: resolve(__dirname, "..", "public", "seed-pack.json"),
};

const apiUrl = (process.env.AIONIS_API_URL ?? DEFAULTS.apiUrl).replace(/\/$/, "");
const tenantId = process.env.DEMO_TENANT_ID ?? DEFAULTS.tenantId;
const scope = process.env.DEMO_SCOPE ?? DEFAULTS.scope;
const packPath = process.env.SEED_PACK_PATH ?? DEFAULTS.packPath;

async function main() {
  console.log(`[seed-remote] reading seed pack from ${packPath}`);
  const raw = await readFile(packPath, "utf8");
  const seed = JSON.parse(raw);
  if (!seed.pack || seed.pack.version !== "aionis_pack_v1") {
    throw new Error("seed-pack.json is missing a valid aionis_pack_v1 payload.");
  }
  const retagged = { ...seed.pack, tenant_id: tenantId, scope };
  console.log(
    `[seed-remote] importing ${retagged.nodes.length} nodes, ${retagged.edges.length} edges ` +
      `into tenant=${tenantId}, scope=${scope} at ${apiUrl}`,
  );
  const res = await fetch(`${apiUrl}/v1/memory/packs/import`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pack: retagged }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[seed-remote] HTTP ${res.status}: ${text}`);
    process.exit(2);
  }
  console.log(`[seed-remote] ${text}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Aionis Inspector seed pack generator.
 *
 * Why this exists:
 *   The Inspector UI needs a "Load seed pack" button so a new developer can
 *   see real patterns, workflows, and handoffs on first launch, without having
 *   to run the full `npm run example:sdk:core-path` pipeline. This script
 *   produces the JSON that the button imports.
 *
 * What it does:
 *   1. Calls /v1/memory/packs/export on a running Lite against SOURCE_SCOPE.
 *   2. Rewrites pack.scope to SEED_SCOPE so the import lands in an isolated
 *      scope and does not collide with the developer's working data.
 *   3. Drops the manifest_sha256 (recomputed on import) and writes the pack
 *      payload to apps/inspector/public/seed-pack.json.
 *
 * Assumptions:
 *   - Lite is running locally on BASE_URL.
 *   - SOURCE_SCOPE already contains a reasonable amount of recorded data
 *     (e.g. after running `npm run example:sdk:core-path`).
 *
 * The generated JSON is intentionally committed to the repo so that Inspector
 * works offline, without a generation step at install time.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3001";
const SOURCE_TENANT = process.env.SOURCE_TENANT ?? "default";
const SOURCE_SCOPE = process.env.SOURCE_SCOPE ?? "default";
const SEED_TENANT = process.env.SEED_TENANT ?? "default";
const SEED_SCOPE = process.env.SEED_SCOPE ?? "inspector:seed";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "..", "public", "seed-pack.json");

async function main() {
  const exportRes = await fetch(`${BASE_URL}/v1/memory/packs/export`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tenant_id: SOURCE_TENANT,
      scope: SOURCE_SCOPE,
      include_nodes: true,
      include_edges: true,
      include_commits: true,
      include_decisions: false,
      // include_meta: true ensures fields like memory_lane and tier ship in the
      // pack; without it imported nodes default to memory_lane=private and
      // become invisible to anonymous callers.
      include_meta: true,
      max_rows: 2000,
    }),
  });

  if (!exportRes.ok) {
    const text = await exportRes.text();
    throw new Error(
      `packs/export failed: HTTP ${exportRes.status}\n${text.slice(0, 800)}`,
    );
  }

  const exported = await exportRes.json();
  const pack = exported.pack;
  if (!pack || pack.version !== "aionis_pack_v1") {
    throw new Error(
      `unexpected export response: missing pack or wrong version (got ${pack?.version})`,
    );
  }

  // Retag to seed scope so the button lands data in an isolated location.
  const retagged = {
    ...pack,
    tenant_id: SEED_TENANT,
    scope: SEED_SCOPE,
  };

  // exported.manifest.sha256 is for the ORIGINAL pack; our retagged pack has a
  // different payload, so we strip sha-carrying fields and let the importer
  // verify only the payload. The import request uses { pack }.
  const seedPack = {
    $schema_version: "aionis_inspector_seed_v1",
    generated_at: new Date().toISOString(),
    source: {
      base_url: BASE_URL,
      tenant_id: SOURCE_TENANT,
      scope: SOURCE_SCOPE,
      counts: exported.manifest?.counts ?? null,
    },
    seed_scope: {
      tenant_id: SEED_TENANT,
      scope: SEED_SCOPE,
    },
    pack: retagged,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(seedPack, null, 2) + "\n");

  const nodeCount = Array.isArray(retagged.nodes) ? retagged.nodes.length : 0;
  const edgeCount = Array.isArray(retagged.edges) ? retagged.edges.length : 0;
  const commitCount = Array.isArray(retagged.commits) ? retagged.commits.length : 0;
  console.log(
    `wrote ${OUT_PATH}\n  ${nodeCount} nodes · ${edgeCount} edges · ${commitCount} commits\n  tagged as ${SEED_TENANT}/${SEED_SCOPE}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});

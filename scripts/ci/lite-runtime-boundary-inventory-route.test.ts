import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { registerHostErrorHandler } from "../../src/host/http-host.ts";
import { buildLiteRouteMatrix } from "../../src/host/lite-edition.ts";
import {
  runtimeBoundaryInventoryFiles,
  runtimeBoundaryInventorySummary,
} from "../../src/memory/runtime-boundary-inventory.ts";
import { registerRuntimeBoundaryInventoryRoutes } from "../../src/routes/runtime-boundary-inventory.ts";

function buildEnv() {
  return {
    AIONIS_EDITION: "lite",
  } as any;
}

test("runtime boundary inventory route exposes a read-only source-owned surface", async () => {
  const app = Fastify();
  registerHostErrorHandler(app);
  registerRuntimeBoundaryInventoryRoutes({
    app,
    env: buildEnv(),
  });

  try {
    const response = await app.inject({
      method: "GET",
      url: "/v1/runtime/boundary-inventory",
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    const summary = runtimeBoundaryInventorySummary();

    assert.equal(body.surface_version, "runtime_boundary_inventory_response_v1");
    assert.equal(body.inventory_source, "source_boundary_manifests");
    assert.deepEqual(body.surface_semantics, {
      read_only: true,
      persistence_effect: "none",
      authority_effect: "none",
      runtime_decision_effect: "none",
      intended_use: "operator_debug_boundary_audit",
    });
    assert.deepEqual(body.summary, summary);
    assert.deepEqual(body.files, runtimeBoundaryInventoryFiles());
    assert.equal(body.entries.length, summary.total_entries);
    assert.equal(body.sources.authority.length, summary.authority_entries);
    assert.equal(body.sources.legacy_access.length, summary.legacy_access_entries);
    assert.ok(body.files.includes("src/memory/authority-producer-registry.ts"));
    assert.ok(body.files.includes("src/memory/legacy-access-registry.ts"));
  } finally {
    await app.close();
  }
});

test("runtime boundary inventory is advertised as a Lite optional route", () => {
  assert.ok(
    buildLiteRouteMatrix().optional_routes.includes("runtime-boundary-inventory"),
    "route matrix must make the operator/debug inventory surface visible",
  );
});

test("runtime boundary inventory route rejects non-Lite registration", () => {
  const app = Fastify();
  assert.throws(
    () =>
      registerRuntimeBoundaryInventoryRoutes({
        app,
        env: {
          AIONIS_EDITION: "server",
        } as any,
      }),
    /only support AIONIS_EDITION=lite/,
  );
});

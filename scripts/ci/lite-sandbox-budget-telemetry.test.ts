import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSandboxBudgetService } from "../../src/app/sandbox-budget.ts";
import { createNoopDb } from "../../src/db.ts";
import { SandboxExecutor, createSandboxSession, enqueueSandboxRun } from "../../src/memory/sandbox.ts";
import { createLiteHostStore } from "../../src/store/lite-host-store.ts";
import { createSqliteDatabase } from "../../src/store/sqlite-compat.ts";

function tmpDbPath(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aionis-lite-sandbox-"));
  return path.join(dir, `${name}.sqlite`);
}

function sandboxDefaults() {
  return {
    defaultScope: "scope-a",
    defaultTenantId: "tenant-a",
    defaultTimeoutMs: 1_000,
  };
}

function sandboxExecutorConfig(workdir: string) {
  return {
    enabled: true,
    mode: "mock" as const,
    maxConcurrency: 1,
    defaultTimeoutMs: 1_000,
    stdioMaxBytes: 8_192,
    workdir,
    allowedCommands: new Set<string>(),
    remote: {
      url: null,
      authHeader: "",
      authToken: "",
      timeoutMs: 1_000,
      allowedHosts: new Set<string>(),
      allowedEgressCidrs: new Set<string>(),
      denyPrivateIps: true,
      mtlsCertPem: "",
      mtlsKeyPem: "",
      mtlsCaPem: "",
      mtlsServerName: "",
    },
    artifactObjectStoreBaseUri: null,
    heartbeatIntervalMs: 0,
    staleAfterMs: 30_000,
    recoveryPollIntervalMs: 0,
    recoveryBatchSize: 10,
  };
}

test("lite sandbox tenant budget reads SQLite sandbox run usage", async () => {
  const dbPath = tmpDbPath("budget");
  const store = createLiteHostStore(dbPath);
  try {
    const session = await store.withTx((client) =>
      createSandboxSession(client, { tenant_id: "tenant-a", scope: "scope-a" }, sandboxDefaults()),
    );
    await store.withTx((client) =>
      enqueueSandboxRun(
        client,
        {
          tenant_id: "tenant-a",
          scope: "scope-a",
          session_id: session.session.session_id,
          mode: "async",
          action: { kind: "command", argv: ["node", "-e", "process.exit(0)"] },
        },
        sandboxDefaults(),
      ),
    );

    const service = createSandboxBudgetService({
      env: {
        MEMORY_TENANT_ID: "tenant-a",
        MEMORY_SCOPE: "scope-a",
        SANDBOX_TENANT_BUDGET_WINDOW_HOURS: 24,
      } as any,
      db: createNoopDb(),
      sandboxTenantBudgetPolicy: new Map([["tenant-a", { daily_run_cap: 1 }]]),
      usageStore: store,
    });

    const reply = {
      headers: new Map<string, string>(),
      header(name: string, value: string) {
        this.headers.set(name.toLowerCase(), value);
        return this;
      },
    };

    await assert.rejects(
      () => service.enforceSandboxTenantBudget(reply, "tenant-a", "scope-a", null),
      (err: any) => {
        assert.equal(err.statusCode, 429);
        assert.equal(err.code, "sandbox_tenant_budget_run_cap_exceeded");
        assert.equal(err.details.used, 1);
        assert.equal(err.details.cap, 1);
        assert.equal(reply.headers.get("retry-after"), "60");
        return true;
      },
    );
  } finally {
    await store.close();
  }
});

test("lite sandbox telemetry preserves tenant scope and terminal status columns", async () => {
  const dbPath = tmpDbPath("telemetry");
  const store = createLiteHostStore(dbPath);
  const executor = new SandboxExecutor(store, sandboxExecutorConfig(path.dirname(dbPath)));
  try {
    const session = await store.withTx((client) =>
      createSandboxSession(client, { tenant_id: "tenant-a", scope: "scope-a" }, sandboxDefaults()),
    );
    const queued = await store.withTx((client) =>
      enqueueSandboxRun(
        client,
        {
          tenant_id: "tenant-a",
          scope: "scope-a",
          session_id: session.session.session_id,
          mode: "async",
          action: { kind: "command", argv: ["node", "-e", "process.exit(0)"] },
        },
        sandboxDefaults(),
      ),
    );

    await executor.executeSync(queued.run.run_id);
  } finally {
    executor.shutdown();
    await store.close();
  }

  const db = createSqliteDatabase(dbPath);
  try {
    const row = db.prepare<{
      run_id: string;
      session_id: string;
      tenant_id: string;
      scope: string;
      mode: string;
      status: string;
      executor: string;
    }>(
      `
      SELECT run_id, session_id, tenant_id, scope, mode, status, executor
      FROM memory_sandbox_run_telemetry
      LIMIT 1
      `,
    ).get();

    assert.ok(row);
    assert.equal(row.tenant_id, "tenant-a");
    assert.equal(row.scope, "scope-a");
    assert.equal(row.mode, "async");
    assert.equal(row.status, "succeeded");
    assert.equal(row.executor, "mock");
  } finally {
    db.close();
  }
});

test("lite host store rejects unsupported SQL and rolls back transactions", async () => {
  const dbPath = tmpDbPath("unsupported-sql");
  const store = createLiteHostStore(dbPath);
  try {
    await assert.rejects(
      () =>
        store.withTx(async (client: any) => {
          await createSandboxSession(client, { tenant_id: "tenant-a", scope: "scope-a" }, sandboxDefaults());
          await client.query("SELECT unsupported_shape FROM memory_sandbox_sessions");
        }),
      (err: any) => {
        assert.equal(err.code, "lite_host_store_unsupported_sql");
        assert.match(err.message, /unsupported lite host store SQL/);
        return true;
      },
    );
  } finally {
    await store.close();
  }

  const db = createSqliteDatabase(dbPath);
  try {
    const row = db.prepare<{ count: number }>(
      "SELECT COUNT(*) AS count FROM memory_sandbox_sessions",
    ).get();
    assert.equal(row.count, 0);
  } finally {
    db.close();
  }
});

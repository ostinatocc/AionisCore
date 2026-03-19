import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { AutomationGraphInput } from "../memory/schemas.js";
import { createSqliteDatabase, type SqliteDatabase } from "./sqlite-compat.js";

export type LiteAutomationStatus = "draft" | "shadow" | "active" | "disabled";

export type LiteAutomationVersionRecord = {
  tenant_id: string;
  scope: string;
  automation_id: string;
  version: number;
  status: LiteAutomationStatus;
  graph: AutomationGraphInput;
  compile_summary: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type LiteAutomationDefinitionRecord = {
  tenant_id: string;
  scope: string;
  automation_id: string;
  name: string;
  status: LiteAutomationStatus;
  latest_version: number;
  input_contract: Record<string, unknown>;
  output_contract: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type LiteAutomationDefinitionView = LiteAutomationDefinitionRecord & {
  version: LiteAutomationVersionRecord;
};

export type LiteAutomationStore = {
  createDefinition(args: {
    tenantId: string;
    scope: string;
    automationId: string;
    name: string;
    status: LiteAutomationStatus;
    graph: AutomationGraphInput;
    inputContract: Record<string, unknown>;
    outputContract: Record<string, unknown>;
    metadata: Record<string, unknown>;
    compileSummary: Record<string, unknown>;
  }): LiteAutomationDefinitionView;
  getDefinition(args: {
    tenantId: string;
    scope: string;
    automationId: string;
    version?: number | null;
  }): LiteAutomationDefinitionView | null;
  listDefinitions(args: {
    tenantId: string;
    scope: string;
    status?: LiteAutomationStatus | null;
    limit: number;
  }): LiteAutomationDefinitionView[];
  close(): Promise<void>;
  healthSnapshot(): { path: string; mode: "sqlite_automation_v1" };
};

type DefinitionRow = {
  tenant_id: string;
  scope: string;
  automation_id: string;
  name: string;
  status: LiteAutomationStatus;
  latest_version: number;
  input_contract_json: string;
  output_contract_json: string;
  metadata_json: string;
  created_at: string;
  updated_at: string;
};

type VersionRow = {
  tenant_id: string;
  scope: string;
  automation_id: string;
  version: number;
  status: LiteAutomationStatus;
  graph_json: string;
  compile_summary_json: string;
  metadata_json: string;
  created_at: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function parseJsonObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function parseGraph(raw: string | null | undefined): AutomationGraphInput {
  if (!raw) return { nodes: [], edges: [] };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { nodes: [], edges: [] };
    const obj = parsed as { nodes?: unknown; edges?: unknown };
    return {
      nodes: Array.isArray(obj.nodes) ? obj.nodes as AutomationGraphInput["nodes"] : [],
      edges: Array.isArray(obj.edges) ? obj.edges as AutomationGraphInput["edges"] : [],
    };
  } catch {
    return { nodes: [], edges: [] };
  }
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value);
}

function mapDefinitionRow(row: DefinitionRow): LiteAutomationDefinitionRecord {
  return {
    tenant_id: row.tenant_id,
    scope: row.scope,
    automation_id: row.automation_id,
    name: row.name,
    status: row.status,
    latest_version: Number(row.latest_version),
    input_contract: parseJsonObject(row.input_contract_json),
    output_contract: parseJsonObject(row.output_contract_json),
    metadata: parseJsonObject(row.metadata_json),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapVersionRow(row: VersionRow): LiteAutomationVersionRecord {
  return {
    tenant_id: row.tenant_id,
    scope: row.scope,
    automation_id: row.automation_id,
    version: Number(row.version),
    status: row.status,
    graph: parseGraph(row.graph_json),
    compile_summary: parseJsonObject(row.compile_summary_json),
    metadata: parseJsonObject(row.metadata_json),
    created_at: row.created_at,
  };
}

function loadVersionRow(
  db: SqliteDatabase,
  args: { tenantId: string; scope: string; automationId: string; version: number },
): VersionRow | null {
  return (
    db.prepare(
      `SELECT tenant_id, scope, automation_id, version, status, graph_json, compile_summary_json, metadata_json, created_at
       FROM lite_automation_versions
       WHERE tenant_id = ? AND scope = ? AND automation_id = ? AND version = ?
       LIMIT 1`,
    ).get(args.tenantId, args.scope, args.automationId, args.version) as VersionRow | undefined
  ) ?? null;
}

export function createLiteAutomationStore(path: string): LiteAutomationStore {
  mkdirSync(dirname(path), { recursive: true });
  const db = createSqliteDatabase(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS lite_automation_defs (
      tenant_id TEXT NOT NULL,
      scope TEXT NOT NULL,
      automation_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('draft','shadow','active','disabled')),
      latest_version INTEGER NOT NULL,
      input_contract_json TEXT NOT NULL,
      output_contract_json TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, scope, automation_id)
    );

    CREATE TABLE IF NOT EXISTS lite_automation_versions (
      tenant_id TEXT NOT NULL,
      scope TEXT NOT NULL,
      automation_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('draft','shadow','active','disabled')),
      graph_json TEXT NOT NULL,
      compile_summary_json TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, scope, automation_id, version)
    );

    CREATE INDEX IF NOT EXISTS idx_lite_automation_defs_scope_status_updated
      ON lite_automation_defs(tenant_id, scope, status, updated_at DESC);
  `);

  return {
    createDefinition(args) {
      const now = nowIso();
      const existing = (
        db.prepare(
          `SELECT latest_version
           FROM lite_automation_defs
           WHERE tenant_id = ? AND scope = ? AND automation_id = ?
           LIMIT 1`,
        ).get(args.tenantId, args.scope, args.automationId) as { latest_version: number } | undefined
      ) ?? null;
      const version = Number(existing?.latest_version ?? 0) + 1;

      db.prepare(
        `INSERT INTO lite_automation_versions (
           tenant_id, scope, automation_id, version, status, graph_json, compile_summary_json, metadata_json, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        args.tenantId,
        args.scope,
        args.automationId,
        version,
        args.status,
        stringifyJson(args.graph),
        stringifyJson(args.compileSummary),
        stringifyJson(args.metadata),
        now,
      );

      db.prepare(
        `INSERT INTO lite_automation_defs (
           tenant_id, scope, automation_id, name, status, latest_version, input_contract_json, output_contract_json, metadata_json, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (tenant_id, scope, automation_id) DO UPDATE SET
           name = excluded.name,
           status = excluded.status,
           latest_version = excluded.latest_version,
           input_contract_json = excluded.input_contract_json,
           output_contract_json = excluded.output_contract_json,
           metadata_json = excluded.metadata_json,
           updated_at = excluded.updated_at`,
      ).run(
        args.tenantId,
        args.scope,
        args.automationId,
        args.name,
        args.status,
        version,
        stringifyJson(args.inputContract),
        stringifyJson(args.outputContract),
        stringifyJson(args.metadata),
        now,
        now,
      );

      const out = this.getDefinition({
        tenantId: args.tenantId,
        scope: args.scope,
        automationId: args.automationId,
        version,
      });
      if (!out) {
        throw new Error("failed to reload lite automation definition after create");
      }
      return out;
    },

    getDefinition(args) {
      const defRow = (
        db.prepare(
          `SELECT tenant_id, scope, automation_id, name, status, latest_version, input_contract_json, output_contract_json, metadata_json, created_at, updated_at
           FROM lite_automation_defs
           WHERE tenant_id = ? AND scope = ? AND automation_id = ?
           LIMIT 1`,
        ).get(args.tenantId, args.scope, args.automationId) as DefinitionRow | undefined
      ) ?? null;
      if (!defRow) return null;
      const definition = mapDefinitionRow(defRow);
      const versionRow = loadVersionRow(db, {
        tenantId: args.tenantId,
        scope: args.scope,
        automationId: args.automationId,
        version: args.version ?? definition.latest_version,
      });
      if (!versionRow) return null;
      return {
        ...definition,
        version: mapVersionRow(versionRow),
      };
    },

    listDefinitions(args) {
      const rows = db.prepare(
        `SELECT tenant_id, scope, automation_id, name, status, latest_version, input_contract_json, output_contract_json, metadata_json, created_at, updated_at
         FROM lite_automation_defs
         WHERE tenant_id = ?
           AND scope = ?
           AND (? IS NULL OR status = ?)
         ORDER BY updated_at DESC, automation_id ASC
         LIMIT ?`,
      ).all(args.tenantId, args.scope, args.status ?? null, args.status ?? null, args.limit) as DefinitionRow[];

      return rows.flatMap((row) => {
        const definition = mapDefinitionRow(row);
        const versionRow = loadVersionRow(db, {
          tenantId: row.tenant_id,
          scope: row.scope,
          automationId: row.automation_id,
          version: definition.latest_version,
        });
        if (!versionRow) return [];
        return [{
          ...definition,
          version: mapVersionRow(versionRow),
        }];
      });
    },

    async close() {
      db.close();
    },

    healthSnapshot() {
      return { path, mode: "sqlite_automation_v1" as const };
    },
  };
}

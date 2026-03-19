import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { AutomationGraphInput, AutomationGraphNodeInput } from "../memory/schemas.js";
import { createSqliteDatabase, type SqliteDatabase } from "./sqlite-compat.js";

export type LiteAutomationRunLifecycleState = "queued" | "running" | "paused" | "terminal";
export type LiteAutomationRunPauseReason = "approval_required" | "repair_required" | "dependency_wait" | "operator_pause";
export type LiteAutomationRunTerminalOutcome = "succeeded" | "failed" | "cancelled";
export type LiteAutomationExecutionMode = "default" | "shadow";
export type LiteAutomationNodeLifecycleState = "pending" | "ready" | "running" | "paused" | "terminal";
export type LiteAutomationNodePauseReason = "approval_required" | "repair_required";
export type LiteAutomationNodeTerminalOutcome = "succeeded" | "failed" | "rejected" | "skipped";

export type LiteAutomationRunRecord = {
  run_id: string;
  tenant_id: string;
  scope: string;
  automation_id: string;
  automation_version: number;
  requested_by: string | null;
  execution_mode: LiteAutomationExecutionMode;
  lifecycle_state: LiteAutomationRunLifecycleState;
  pause_reason: LiteAutomationRunPauseReason | null;
  terminal_outcome: LiteAutomationRunTerminalOutcome | null;
  status_summary: string;
  root_cause_code: string | null;
  root_cause_node_id: string | null;
  root_cause_message: string | null;
  params_json: Record<string, unknown>;
  summary_json: Record<string, unknown>;
  started_at: string | null;
  paused_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LiteAutomationRunNodeRecord = {
  run_id: string;
  node_id: string;
  node_kind: AutomationGraphNodeInput["kind"];
  lifecycle_state: LiteAutomationNodeLifecycleState;
  pause_reason: LiteAutomationNodePauseReason | null;
  terminal_outcome: LiteAutomationNodeTerminalOutcome | null;
  status_summary: string;
  depends_on: string[];
  error_code: string | null;
  error_message: string | null;
  playbook_id: string | null;
  playbook_version: number | null;
  playbook_run_id: string | null;
  approval_key: string | null;
  input_snapshot_json: Record<string, unknown>;
  output_snapshot_json: Record<string, unknown>;
  started_at: string | null;
  paused_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LiteAutomationRunView = LiteAutomationRunRecord & {
  nodes: LiteAutomationRunNodeRecord[];
};

export type LiteAutomationRunStore = {
  createRun(args: {
    runId: string;
    tenantId: string;
    scope: string;
    automationId: string;
    automationVersion: number;
    requestedBy: string | null;
    executionMode: LiteAutomationExecutionMode;
    paramsJson: Record<string, unknown>;
    graph: AutomationGraphInput;
  }): LiteAutomationRunView;
  getRun(args: {
    tenantId: string;
    scope: string;
    runId: string;
    includeNodes?: boolean;
  }): LiteAutomationRunView | null;
  listRuns(args: {
    tenantId: string;
    scope: string;
    automationId?: string | null;
    limit: number;
  }): LiteAutomationRunRecord[];
  listRunNodes(runId: string): LiteAutomationRunNodeRecord[];
  updateRun(args: {
    runId: string;
    patch: Partial<LiteAutomationRunRecord>;
  }): LiteAutomationRunRecord;
  updateRunNode(args: {
    runId: string;
    nodeId: string;
    patch: Partial<LiteAutomationRunNodeRecord>;
  }): LiteAutomationRunNodeRecord;
  close(): Promise<void>;
  healthSnapshot(): { path: string; mode: "sqlite_automation_run_v1" };
};

type RunRow = {
  run_id: string;
  tenant_id: string;
  scope: string;
  automation_id: string;
  automation_version: number;
  requested_by: string | null;
  execution_mode: LiteAutomationExecutionMode;
  lifecycle_state: LiteAutomationRunLifecycleState;
  pause_reason: LiteAutomationRunPauseReason | null;
  terminal_outcome: LiteAutomationRunTerminalOutcome | null;
  status_summary: string;
  root_cause_code: string | null;
  root_cause_node_id: string | null;
  root_cause_message: string | null;
  params_json: string;
  summary_json: string;
  started_at: string | null;
  paused_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

type RunNodeRow = {
  run_id: string;
  node_id: string;
  node_kind: AutomationGraphNodeInput["kind"];
  lifecycle_state: LiteAutomationNodeLifecycleState;
  pause_reason: LiteAutomationNodePauseReason | null;
  terminal_outcome: LiteAutomationNodeTerminalOutcome | null;
  status_summary: string;
  depends_on_json: string;
  error_code: string | null;
  error_message: string | null;
  playbook_id: string | null;
  playbook_version: number | null;
  playbook_run_id: string | null;
  approval_key: string | null;
  input_snapshot_json: string;
  output_snapshot_json: string;
  started_at: string | null;
  paused_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
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

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value);
}

function deriveInitialNodeState(nodeId: string, graph: AutomationGraphInput): {
  dependsOn: string[];
  lifecycleState: LiteAutomationNodeLifecycleState;
  statusSummary: string;
} {
  const dependsOn = graph.edges
    .filter((edge) => edge.to === nodeId && edge.type !== "on_failure")
    .map((edge) => edge.from);
  return {
    dependsOn,
    lifecycleState: dependsOn.length === 0 ? "ready" : "pending",
    statusSummary: dependsOn.length === 0 ? "ready" : "pending",
  };
}

function mapRunRow(row: RunRow): LiteAutomationRunRecord {
  return {
    run_id: row.run_id,
    tenant_id: row.tenant_id,
    scope: row.scope,
    automation_id: row.automation_id,
    automation_version: Number(row.automation_version),
    requested_by: row.requested_by,
    execution_mode: row.execution_mode,
    lifecycle_state: row.lifecycle_state,
    pause_reason: row.pause_reason,
    terminal_outcome: row.terminal_outcome,
    status_summary: row.status_summary,
    root_cause_code: row.root_cause_code,
    root_cause_node_id: row.root_cause_node_id,
    root_cause_message: row.root_cause_message,
    params_json: parseJsonObject(row.params_json),
    summary_json: parseJsonObject(row.summary_json),
    started_at: row.started_at,
    paused_at: row.paused_at,
    ended_at: row.ended_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapRunNodeRow(row: RunNodeRow): LiteAutomationRunNodeRecord {
  return {
    run_id: row.run_id,
    node_id: row.node_id,
    node_kind: row.node_kind,
    lifecycle_state: row.lifecycle_state,
    pause_reason: row.pause_reason,
    terminal_outcome: row.terminal_outcome,
    status_summary: row.status_summary,
    depends_on: parseJsonArray(row.depends_on_json),
    error_code: row.error_code,
    error_message: row.error_message,
    playbook_id: row.playbook_id,
    playbook_version: row.playbook_version != null ? Number(row.playbook_version) : null,
    playbook_run_id: row.playbook_run_id,
    approval_key: row.approval_key,
    input_snapshot_json: parseJsonObject(row.input_snapshot_json),
    output_snapshot_json: parseJsonObject(row.output_snapshot_json),
    started_at: row.started_at,
    paused_at: row.paused_at,
    ended_at: row.ended_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function withTx<T>(db: SqliteDatabase, fn: () => T): T {
  db.exec("BEGIN");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

function loadRunRow(db: SqliteDatabase, runId: string): RunRow | null {
  return (
    db.prepare(
      `SELECT run_id, tenant_id, scope, automation_id, automation_version, requested_by, execution_mode,
              lifecycle_state, pause_reason, terminal_outcome, status_summary, root_cause_code, root_cause_node_id,
              root_cause_message, params_json, summary_json, started_at, paused_at, ended_at, created_at, updated_at
       FROM lite_automation_runs
       WHERE run_id = ?
       LIMIT 1`,
    ).get(runId) as RunRow | undefined
  ) ?? null;
}

function loadRunNodeRows(db: SqliteDatabase, runId: string): RunNodeRow[] {
  return db.prepare(
    `SELECT run_id, node_id, node_kind, lifecycle_state, pause_reason, terminal_outcome, status_summary,
            depends_on_json, error_code, error_message, playbook_id, playbook_version, playbook_run_id, approval_key,
            input_snapshot_json, output_snapshot_json, started_at, paused_at, ended_at, created_at, updated_at
     FROM lite_automation_run_nodes
     WHERE run_id = ?
     ORDER BY created_at ASC, node_id ASC`,
  ).all(runId) as RunNodeRow[];
}

export function createLiteAutomationRunStore(path: string): LiteAutomationRunStore {
  mkdirSync(dirname(path), { recursive: true });
  const db = createSqliteDatabase(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS lite_automation_runs (
      run_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      scope TEXT NOT NULL,
      automation_id TEXT NOT NULL,
      automation_version INTEGER NOT NULL,
      requested_by TEXT NULL,
      execution_mode TEXT NOT NULL CHECK (execution_mode IN ('default','shadow')),
      lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('queued','running','paused','terminal')),
      pause_reason TEXT NULL CHECK (pause_reason IS NULL OR pause_reason IN ('approval_required','repair_required','dependency_wait','operator_pause')),
      terminal_outcome TEXT NULL CHECK (terminal_outcome IS NULL OR terminal_outcome IN ('succeeded','failed','cancelled')),
      status_summary TEXT NOT NULL,
      root_cause_code TEXT NULL,
      root_cause_node_id TEXT NULL,
      root_cause_message TEXT NULL,
      params_json TEXT NOT NULL,
      summary_json TEXT NOT NULL,
      started_at TEXT NULL,
      paused_at TEXT NULL,
      ended_at TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lite_automation_run_nodes (
      run_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      node_kind TEXT NOT NULL CHECK (node_kind IN ('playbook','approval','condition','artifact_gate')),
      lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('pending','ready','running','paused','terminal')),
      pause_reason TEXT NULL CHECK (pause_reason IS NULL OR pause_reason IN ('approval_required','repair_required')),
      terminal_outcome TEXT NULL CHECK (terminal_outcome IS NULL OR terminal_outcome IN ('succeeded','failed','rejected','skipped')),
      status_summary TEXT NOT NULL,
      depends_on_json TEXT NOT NULL,
      error_code TEXT NULL,
      error_message TEXT NULL,
      playbook_id TEXT NULL,
      playbook_version INTEGER NULL,
      playbook_run_id TEXT NULL,
      approval_key TEXT NULL,
      input_snapshot_json TEXT NOT NULL,
      output_snapshot_json TEXT NOT NULL,
      started_at TEXT NULL,
      paused_at TEXT NULL,
      ended_at TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (run_id, node_id)
    );

    CREATE INDEX IF NOT EXISTS idx_lite_automation_runs_scope_created
      ON lite_automation_runs(tenant_id, scope, created_at DESC);
  `);

  return {
    createRun(args) {
      return withTx(db, () => {
        const now = nowIso();
        db.prepare(
          `INSERT INTO lite_automation_runs (
             run_id, tenant_id, scope, automation_id, automation_version, requested_by, execution_mode,
             lifecycle_state, pause_reason, terminal_outcome, status_summary, root_cause_code, root_cause_node_id,
             root_cause_message, params_json, summary_json, started_at, paused_at, ended_at, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          args.runId,
          args.tenantId,
          args.scope,
          args.automationId,
          args.automationVersion,
          args.requestedBy,
          args.executionMode,
          "queued",
          null,
          null,
          "queued",
          null,
          null,
          null,
          stringifyJson(args.paramsJson),
          stringifyJson({}),
          null,
          null,
          null,
          now,
          now,
        );

        for (const node of args.graph.nodes) {
          const initial = deriveInitialNodeState(node.node_id, args.graph);
          db.prepare(
            `INSERT INTO lite_automation_run_nodes (
               run_id, node_id, node_kind, lifecycle_state, pause_reason, terminal_outcome, status_summary, depends_on_json,
               error_code, error_message, playbook_id, playbook_version, playbook_run_id, approval_key,
               input_snapshot_json, output_snapshot_json, started_at, paused_at, ended_at, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ).run(
            args.runId,
            node.node_id,
            node.kind,
            initial.lifecycleState,
            null,
            null,
            initial.statusSummary,
            stringifyJson(initial.dependsOn),
            null,
            null,
            node.kind === "playbook" ? node.playbook_id : null,
            node.kind === "playbook" ? (node.version ?? null) : null,
            null,
            node.kind === "approval" ? (node.approval_key ?? null) : null,
            stringifyJson({}),
            stringifyJson({}),
            null,
            null,
            null,
            now,
            now,
          );
        }

        const out = this.getRun({
          tenantId: args.tenantId,
          scope: args.scope,
          runId: args.runId,
          includeNodes: true,
        });
        if (!out) throw new Error("failed to load lite automation run after create");
        return out;
      });
    },

    getRun(args) {
      const row = loadRunRow(db, args.runId);
      if (!row) return null;
      if (row.tenant_id !== args.tenantId || row.scope !== args.scope) return null;
      const run = mapRunRow(row);
      return {
        ...run,
        nodes: args.includeNodes === false ? [] : loadRunNodeRows(db, args.runId).map(mapRunNodeRow),
      };
    },

    listRuns(args) {
      const rows = db.prepare(
        `SELECT run_id, tenant_id, scope, automation_id, automation_version, requested_by, execution_mode,
                lifecycle_state, pause_reason, terminal_outcome, status_summary, root_cause_code, root_cause_node_id,
                root_cause_message, params_json, summary_json, started_at, paused_at, ended_at, created_at, updated_at
         FROM lite_automation_runs
         WHERE tenant_id = ?
           AND scope = ?
           AND (? IS NULL OR automation_id = ?)
         ORDER BY created_at DESC, run_id DESC
         LIMIT ?`,
      ).all(args.tenantId, args.scope, args.automationId ?? null, args.automationId ?? null, args.limit) as RunRow[];
      return rows.map(mapRunRow);
    },

    listRunNodes(runId) {
      return loadRunNodeRows(db, runId).map(mapRunNodeRow);
    },

    updateRun(args) {
      const existingRow = loadRunRow(db, args.runId);
      if (!existingRow) throw new Error(`automation run ${args.runId} not found`);
      const existing = mapRunRow(existingRow);
      const next: LiteAutomationRunRecord = {
        ...existing,
        ...args.patch,
        run_id: existing.run_id,
        tenant_id: existing.tenant_id,
        scope: existing.scope,
        automation_id: existing.automation_id,
        automation_version: existing.automation_version,
        params_json: args.patch.params_json ?? existing.params_json,
        summary_json: args.patch.summary_json ?? existing.summary_json,
        updated_at: nowIso(),
      };
      db.prepare(
        `UPDATE lite_automation_runs
         SET requested_by = ?, execution_mode = ?, lifecycle_state = ?, pause_reason = ?, terminal_outcome = ?,
             status_summary = ?, root_cause_code = ?, root_cause_node_id = ?, root_cause_message = ?,
             params_json = ?, summary_json = ?, started_at = ?, paused_at = ?, ended_at = ?, updated_at = ?
         WHERE run_id = ?`,
      ).run(
        next.requested_by,
        next.execution_mode,
        next.lifecycle_state,
        next.pause_reason,
        next.terminal_outcome,
        next.status_summary,
        next.root_cause_code,
        next.root_cause_node_id,
        next.root_cause_message,
        stringifyJson(next.params_json),
        stringifyJson(next.summary_json),
        next.started_at,
        next.paused_at,
        next.ended_at,
        next.updated_at,
        next.run_id,
      );
      return next;
    },

    updateRunNode(args) {
      const existingRow = (
        db.prepare(
          `SELECT run_id, node_id, node_kind, lifecycle_state, pause_reason, terminal_outcome, status_summary, depends_on_json,
                  error_code, error_message, playbook_id, playbook_version, playbook_run_id, approval_key,
                  input_snapshot_json, output_snapshot_json, started_at, paused_at, ended_at, created_at, updated_at
           FROM lite_automation_run_nodes
           WHERE run_id = ? AND node_id = ?
           LIMIT 1`,
        ).get(args.runId, args.nodeId) as RunNodeRow | undefined
      ) ?? null;
      if (!existingRow) throw new Error(`automation run node ${args.runId}/${args.nodeId} not found`);
      const existing = mapRunNodeRow(existingRow);
      const next: LiteAutomationRunNodeRecord = {
        ...existing,
        ...args.patch,
        run_id: existing.run_id,
        node_id: existing.node_id,
        node_kind: existing.node_kind,
        depends_on: args.patch.depends_on ?? existing.depends_on,
        input_snapshot_json: args.patch.input_snapshot_json ?? existing.input_snapshot_json,
        output_snapshot_json: args.patch.output_snapshot_json ?? existing.output_snapshot_json,
        updated_at: nowIso(),
      };
      db.prepare(
        `UPDATE lite_automation_run_nodes
         SET lifecycle_state = ?, pause_reason = ?, terminal_outcome = ?, status_summary = ?, depends_on_json = ?,
             error_code = ?, error_message = ?, playbook_id = ?, playbook_version = ?, playbook_run_id = ?, approval_key = ?,
             input_snapshot_json = ?, output_snapshot_json = ?, started_at = ?, paused_at = ?, ended_at = ?, updated_at = ?
         WHERE run_id = ? AND node_id = ?`,
      ).run(
        next.lifecycle_state,
        next.pause_reason,
        next.terminal_outcome,
        next.status_summary,
        stringifyJson(next.depends_on),
        next.error_code,
        next.error_message,
        next.playbook_id,
        next.playbook_version,
        next.playbook_run_id,
        next.approval_key,
        stringifyJson(next.input_snapshot_json),
        stringifyJson(next.output_snapshot_json),
        next.started_at,
        next.paused_at,
        next.ended_at,
        next.updated_at,
        next.run_id,
        next.node_id,
      );
      return next;
    },

    async close() {
      db.close();
    },

    healthSnapshot() {
      return { path, mode: "sqlite_automation_run_v1" as const };
    },
  };
}

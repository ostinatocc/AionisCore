import { randomUUID } from "node:crypto";
import {
  AutomationCreateRequest,
  AutomationGetRequest,
  AutomationListRequest,
  AutomationRunCancelRequest,
  AutomationRunGetRequest,
  AutomationRunListRequest,
  AutomationRunRequest,
  AutomationRunResumeRequest,
  AutomationValidateRequest,
  type AutomationGraphInput,
  type AutomationGraphNodeInput,
} from "./schemas.js";
import type { LiteAutomationStore } from "../store/lite-automation-store.js";
import type {
  LiteAutomationRunNodeRecord,
  LiteAutomationRunStore,
  LiteAutomationRunView,
} from "../store/lite-automation-run-store.js";
import { resolveTenantScope } from "./tenant.js";
import { buildLiteUnsupportedDetails, HttpError } from "../util/http.js";

export type AutomationValidationIssue = {
  code: string;
  message: string;
  node_id?: string;
  edge?: {
    from: string;
    to: string;
    type?: string;
  };
};

export type AutomationValidationResult = {
  node_ids: string[];
  start_node_ids: string[];
  topological_order: string[];
  issues: AutomationValidationIssue[];
};

type LiteAutomationRuntimeSummary = {
  edition: "lite";
  automation_kernel: "local_playbook_v1";
  supported_node_kinds?: string[];
  supported_routes?: string[];
};

type AutomationDefaults = {
  defaultScope: string;
  defaultTenantId: string;
  defaultActorId?: string | null;
};

type LiteAutomationReplayResult = {
  mode?: unknown;
  playbook?: unknown;
  run?: unknown;
  summary?: unknown;
};

type LiteAutomationReplayRunner = (body: unknown, options: unknown) => Promise<LiteAutomationReplayResult>;

type LiteAutomationExecutionDeps = {
  buildReplayRunOptions: (source: string) => unknown;
  replayRunner: LiteAutomationReplayRunner;
};

function localReplayIdentity(actor: string | null): {
  consumer_agent_id?: string;
  producer_agent_id?: string;
  owner_agent_id?: string;
  memory_lane: "private";
} {
  const normalized = typeof actor === "string" && actor.trim().length > 0 ? actor.trim() : null;
  return {
    consumer_agent_id: normalized ?? undefined,
    producer_agent_id: normalized ?? undefined,
    owner_agent_id: normalized ?? undefined,
    memory_lane: "private",
  };
}

function resolveLiteActor(actor: string | null | undefined, defaults: AutomationDefaults): string | null {
  if (typeof actor === "string" && actor.trim().length > 0) return actor.trim();
  if (typeof defaults.defaultActorId === "string" && defaults.defaultActorId.trim().length > 0) return defaults.defaultActorId.trim();
  return null;
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function toStringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function toPositiveIntOrNull(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) return null;
  return v;
}

function collectBindingRefs(value: unknown, refs: Set<string>) {
  if (typeof value === "string") {
    if (value.startsWith("$nodes.")) {
      const rest = value.slice("$nodes.".length);
      const nodeId = rest.split(".")[0]?.trim();
      if (nodeId) refs.add(nodeId);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectBindingRefs(item, refs);
    return;
  }
  const obj = asObject(value);
  if (!obj) return;
  for (const next of Object.values(obj)) collectBindingRefs(next, refs);
}

function hasGraphPath(from: string, to: string, outgoing: Map<string, string[]>): boolean {
  if (from === to) return true;
  const seen = new Set<string>([from]);
  const queue = [...(outgoing.get(from) ?? [])];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (nodeId === to) return true;
    if (seen.has(nodeId)) continue;
    seen.add(nodeId);
    for (const next of outgoing.get(nodeId) ?? []) {
      if (!seen.has(next)) queue.push(next);
    }
  }
  return false;
}

function getPathValue(source: unknown, path: string[]): unknown {
  let cur: unknown = source;
  for (const part of path) {
    if (!part) continue;
    if (Array.isArray(cur)) {
      const idx = Number(part);
      if (!Number.isInteger(idx) || idx < 0 || idx >= cur.length) return null;
      cur = cur[idx];
      continue;
    }
    const obj = asObject(cur);
    if (!obj || !(part in obj)) return null;
    cur = obj[part];
  }
  return cur;
}

function resolveBindingValue(
  value: unknown,
  ctx: {
    params: Record<string, unknown>;
    nodeOutputs: Map<string, unknown>;
  },
): unknown {
  if (typeof value === "string") {
    if (value.startsWith("$params.")) {
      return getPathValue(ctx.params, value.slice("$params.".length).split("."));
    }
    if (value.startsWith("$nodes.")) {
      const rest = value.slice("$nodes.".length);
      const parts = rest.split(".");
      const nodeId = parts.shift()?.trim();
      if (!nodeId) return null;
      const base = ctx.nodeOutputs.get(nodeId);
      return getPathValue(base, parts);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => resolveBindingValue(item, ctx));
  const obj = asObject(value);
  if (!obj) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = resolveBindingValue(v, ctx);
  return out;
}

function evaluateConditionExpression(expr: unknown, ctx: { params: Record<string, unknown>; nodeOutputs: Map<string, unknown> }): boolean {
  if (typeof expr === "boolean") return expr;
  const obj = asObject(resolveBindingValue(expr, ctx));
  if (!obj) return Boolean(expr);
  if ("equals" in obj) return (obj.left ?? null) === (obj.equals ?? null);
  if ("not_equals" in obj) return (obj.left ?? null) !== (obj.not_equals ?? null);
  if ("exists" in obj) return resolveBindingValue(obj.exists, ctx) != null;
  return Boolean(obj.value ?? obj.result ?? false);
}

function deriveAutomationRunStatusSummary(input: {
  lifecycle_state: string;
  pause_reason?: string | null;
  terminal_outcome?: string | null;
}): string {
  if (input.lifecycle_state === "paused" && input.pause_reason) {
    return input.pause_reason === "approval_required" ? "paused_for_approval" : "paused_for_repair";
  }
  if (input.lifecycle_state === "terminal" && input.terminal_outcome) return input.terminal_outcome;
  return input.lifecycle_state;
}

function deriveAutomationNodeStatusSummary(input: {
  lifecycle_state: string;
  pause_reason?: string | null;
  terminal_outcome?: string | null;
}): string {
  if (input.lifecycle_state === "paused" && input.pause_reason) {
    return input.pause_reason === "approval_required" ? "paused_for_approval" : "paused_for_repair";
  }
  if (input.lifecycle_state === "terminal" && input.terminal_outcome) return input.terminal_outcome;
  return input.lifecycle_state;
}

function summarizeGraph(graph: AutomationGraphInput, validation: AutomationValidationResult): Record<string, unknown> {
  const counts: Record<string, number> = {};
  for (const node of graph.nodes) {
    counts[node.kind] = (counts[node.kind] ?? 0) + 1;
  }
  return {
    node_count: graph.nodes.length,
    edge_count: graph.edges.length,
    start_node_count: validation.start_node_ids.length,
    node_kind_counts: counts,
  };
}

function summarizeRunNodes(nodes: LiteAutomationRunNodeRecord[]): Record<string, unknown> {
  const byLifecycle: Record<string, number> = {};
  const byOutcome: Record<string, number> = {};
  for (const node of nodes) {
    byLifecycle[node.lifecycle_state] = (byLifecycle[node.lifecycle_state] ?? 0) + 1;
    if (node.terminal_outcome) {
      byOutcome[node.terminal_outcome] = (byOutcome[node.terminal_outcome] ?? 0) + 1;
    }
  }
  return {
    total_nodes: nodes.length,
    lifecycle_counts: byLifecycle,
    terminal_outcome_counts: byOutcome,
  };
}

const LITE_AUTOMATION_SUPPORTED_NODE_KINDS = ["playbook", "approval", "condition", "artifact_gate"] as const;

const LITE_AUTOMATION_SUPPORTED_ROUTES = [
  "/v1/automations/create",
  "/v1/automations/get",
  "/v1/automations/list",
  "/v1/automations/validate",
  "/v1/automations/graph/validate",
  "/v1/automations/run",
  "/v1/automations/runs/get",
  "/v1/automations/runs/list",
  "/v1/automations/runs/cancel",
  "/v1/automations/runs/resume",
] as const;

function buildLiteAutomationUnsupportedDetails(args: {
  route: string;
  unsupported: string[];
  reason: string;
}): Record<string, unknown> {
  return buildLiteUnsupportedDetails({
    route: args.route,
    surface: "automation_governance",
    reason: args.reason,
    unsupported: args.unsupported,
  });
}

function buildLiteAutomationRuntimeSummary(extra: {
  supportedNodeKinds?: readonly string[];
  supportedRoutes?: readonly string[];
} = {}): LiteAutomationRuntimeSummary {
  const out: LiteAutomationRuntimeSummary = {
    edition: "lite",
    automation_kernel: "local_playbook_v1",
  };
  if (extra.supportedNodeKinds) out.supported_node_kinds = [...extra.supportedNodeKinds];
  if (extra.supportedRoutes) out.supported_routes = [...extra.supportedRoutes];
  return out;
}

export function validateAutomationGraph(graph: AutomationGraphInput): AutomationValidationResult {
  const issues: AutomationValidationIssue[] = [];
  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (nodeIds.has(node.node_id)) {
      issues.push({
        code: "duplicate_node_id",
        message: "node_id must be unique",
        node_id: node.node_id,
      });
      continue;
    }
    nodeIds.add(node.node_id);
  }

  const indegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const nodeId of nodeIds) {
    indegree.set(nodeId, 0);
    outgoing.set(nodeId, []);
    incoming.set(nodeId, []);
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from)) {
      issues.push({ code: "edge_from_missing", message: "edge source node does not exist", edge });
      continue;
    }
    if (!nodeIds.has(edge.to)) {
      issues.push({ code: "edge_to_missing", message: "edge target node does not exist", edge });
      continue;
    }
    if (edge.from === edge.to) {
      issues.push({ code: "self_cycle", message: "self-referential edges are not allowed", edge });
      continue;
    }
    if (edge.type === "on_failure") {
      issues.push({
        code: "unsupported_edge_type",
        message: "on_failure edges are not supported in lite automation kernel",
        edge,
      });
      continue;
    }
    outgoing.get(edge.from)!.push(edge.to);
    incoming.get(edge.to)!.push(edge.from);
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  }

  for (const node of graph.nodes) {
    const refs = new Set<string>();
    collectBindingRefs(node.inputs, refs);
    if (node.kind === "condition") collectBindingRefs(node.expression, refs);
    if (node.kind === "artifact_gate") collectBindingRefs(node.required_artifacts, refs);
    for (const ref of refs) {
      if (!nodeIds.has(ref)) {
        issues.push({
          code: "binding_node_missing",
          message: "input binding references a node that does not exist",
          node_id: node.node_id,
        });
        continue;
      }
      if (ref === node.node_id) {
        issues.push({
          code: "binding_self_reference",
          message: "node bindings may not reference the same node",
          node_id: node.node_id,
        });
        continue;
      }
      if (!hasGraphPath(ref, node.node_id, outgoing)) {
        issues.push({
          code: "binding_dependency_missing",
          message: "node bindings require an explicit dependency path from referenced node to consumer",
          node_id: node.node_id,
          edge: { from: ref, to: node.node_id, type: "binding" },
        });
      }
    }
  }

  const startNodeIds = Array.from(nodeIds).filter((nodeId) => (incoming.get(nodeId) ?? []).length === 0);
  if (startNodeIds.length === 0) {
    issues.push({ code: "missing_start_node", message: "automation graph must have at least one start node" });
  }

  const queue = Array.from(startNodeIds).sort();
  const indegreeWork = new Map(indegree);
  const topologicalOrder: string[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    topologicalOrder.push(nodeId);
    const nextList = (outgoing.get(nodeId) ?? []).slice().sort();
    for (const next of nextList) {
      const remaining = (indegreeWork.get(next) ?? 0) - 1;
      indegreeWork.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
  }

  if (topologicalOrder.length !== nodeIds.size) {
    issues.push({ code: "cycle_detected", message: "automation graph must be acyclic" });
  }

  if (issues.length > 0) {
    throw new HttpError(400, "automation_graph_invalid", "automation graph validation failed", { issues });
  }

  return {
    node_ids: Array.from(nodeIds),
    start_node_ids: startNodeIds.sort(),
    topological_order: topologicalOrder,
    issues,
  };
}

function loadDefinitionForExecution(
  store: LiteAutomationStore,
  args: {
    tenantId: string;
    scope: string;
    automationId: string;
    version?: number | null;
  },
) {
  const out = store.getDefinition({
    tenantId: args.tenantId,
    scope: args.scope,
    automationId: args.automationId,
    version: args.version ?? null,
  });
  if (!out) {
    throw new HttpError(404, "automation_not_found", "automation was not found in this Lite scope", {
      automation_id: args.automationId,
      version: args.version ?? null,
      scope: args.scope,
      tenant_id: args.tenantId,
    });
  }
  if (args.version == null && out.status === "disabled") {
    throw new HttpError(409, "automation_disabled", "automation is disabled in this Lite scope", {
      automation_id: args.automationId,
      scope: args.scope,
      tenant_id: args.tenantId,
    });
  }
  return out;
}

function requireRunInScope(
  runStore: LiteAutomationRunStore,
  args: { tenantId: string; scope: string; runId: string },
): LiteAutomationRunView {
  const run = runStore.getRun({
    tenantId: args.tenantId,
    scope: args.scope,
    runId: args.runId,
    includeNodes: true,
  });
  if (!run) {
    throw new HttpError(404, "automation_run_not_found", "automation run was not found in this Lite scope", {
      run_id: args.runId,
      scope: args.scope,
      tenant_id: args.tenantId,
    });
  }
  return run;
}

function mapNodeById(graph: AutomationGraphInput): Map<string, AutomationGraphNodeInput> {
  return new Map(graph.nodes.map((node) => [node.node_id, node]));
}

function buildNodeOutputs(nodes: LiteAutomationRunNodeRecord[]): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const node of nodes) {
    if (node.terminal_outcome === "succeeded") {
      out.set(node.node_id, node.output_snapshot_json);
    }
  }
  return out;
}

async function continueAutomationRun(args: {
  definitionStore: LiteAutomationStore;
  runStore: LiteAutomationRunStore;
  run: LiteAutomationRunView;
  graph: AutomationGraphInput;
  actor: string | null;
  params: Record<string, unknown>;
  defaults: AutomationDefaults;
  deps: LiteAutomationExecutionDeps;
  resumeReason?: string | null;
}): Promise<LiteAutomationRunView> {
  const validation = validateAutomationGraph(args.graph);
  const nodeMap = mapNodeById(args.graph);
  const nodeOutputs = buildNodeOutputs(args.run.nodes);
  const now = new Date().toISOString();

  args.runStore.updateRun({
    runId: args.run.run_id,
    patch: {
      lifecycle_state: "running",
      pause_reason: null,
      terminal_outcome: null,
      status_summary: "running",
      root_cause_code: null,
      root_cause_node_id: null,
      root_cause_message: null,
      started_at: args.run.started_at ?? now,
      paused_at: null,
      ended_at: null,
    },
  });

  for (const nodeId of validation.topological_order) {
    const run = requireRunInScope(args.runStore, {
      tenantId: args.run.tenant_id,
      scope: args.run.scope,
      runId: args.run.run_id,
    });
    const current = run.nodes.find((node) => node.node_id === nodeId);
    if (!current) continue;
    if (current.lifecycle_state === "terminal") {
      if (current.terminal_outcome === "succeeded") {
        nodeOutputs.set(current.node_id, current.output_snapshot_json);
      }
      continue;
    }
    const node = nodeMap.get(nodeId);
    if (!node) continue;
    const ctx = { params: args.params, nodeOutputs };
    const resolvedInputs = asObject(resolveBindingValue(node.inputs ?? {}, ctx)) ?? {};

    if (current.lifecycle_state === "paused" && current.pause_reason === "approval_required" && args.resumeReason != null) {
      const output = {
        approved_at: new Date().toISOString(),
        approval_reason: args.resumeReason,
        approved_by: args.actor ?? null,
      };
      args.runStore.updateRunNode({
        runId: current.run_id,
        nodeId,
        patch: {
          lifecycle_state: "terminal",
          pause_reason: null,
          terminal_outcome: "succeeded",
          status_summary: "succeeded",
          output_snapshot_json: output,
          ended_at: new Date().toISOString(),
        },
      });
      nodeOutputs.set(nodeId, output);
      continue;
    }

    args.runStore.updateRunNode({
      runId: current.run_id,
      nodeId,
      patch: {
        lifecycle_state: "running",
        pause_reason: null,
        status_summary: "running",
        input_snapshot_json: resolvedInputs,
        started_at: current.started_at ?? new Date().toISOString(),
      },
    });

    if (node.kind === "approval") {
      if (args.run.execution_mode === "shadow") {
        const output = {
          shadow_auto_approved: true,
          approval_reason: "shadow_execution_skips_human_gate",
          approved_at: new Date().toISOString(),
        };
        args.runStore.updateRunNode({
          runId: current.run_id,
          nodeId,
          patch: {
            lifecycle_state: "terminal",
            terminal_outcome: "succeeded",
            status_summary: "succeeded",
            output_snapshot_json: output,
            ended_at: new Date().toISOString(),
          },
        });
        nodeOutputs.set(nodeId, output);
        continue;
      }
      args.runStore.updateRunNode({
        runId: current.run_id,
        nodeId,
        patch: {
          lifecycle_state: "paused",
          pause_reason: "approval_required",
          status_summary: deriveAutomationNodeStatusSummary({ lifecycle_state: "paused", pause_reason: "approval_required" }),
          paused_at: new Date().toISOString(),
        },
      });
      const pausedNodes = args.runStore.listRunNodes(args.run.run_id);
      args.runStore.updateRun({
        runId: args.run.run_id,
        patch: {
          lifecycle_state: "paused",
          pause_reason: "approval_required",
          status_summary: deriveAutomationRunStatusSummary({ lifecycle_state: "paused", pause_reason: "approval_required" }),
          root_cause_code: "approval_required",
          root_cause_node_id: nodeId,
          root_cause_message: "automation paused on approval node",
          summary_json: summarizeRunNodes(pausedNodes),
          paused_at: new Date().toISOString(),
        },
      });
      return requireRunInScope(args.runStore, {
        tenantId: args.run.tenant_id,
        scope: args.run.scope,
        runId: args.run.run_id,
      });
    }

    if (node.kind === "condition") {
      const passed = evaluateConditionExpression(node.expression, ctx);
      if (!passed) {
        args.runStore.updateRunNode({
          runId: current.run_id,
          nodeId,
          patch: {
            lifecycle_state: "terminal",
            terminal_outcome: "failed",
            status_summary: "failed",
            error_code: "condition_failed",
            error_message: "condition node evaluated to false",
            output_snapshot_json: { result: false },
            ended_at: new Date().toISOString(),
          },
        });
        const failedNodes = args.runStore.listRunNodes(args.run.run_id);
        args.runStore.updateRun({
          runId: args.run.run_id,
          patch: {
            lifecycle_state: "terminal",
            terminal_outcome: "failed",
            status_summary: "failed",
            root_cause_code: "condition_failed",
            root_cause_node_id: nodeId,
            root_cause_message: "condition node evaluated to false",
            summary_json: summarizeRunNodes(failedNodes),
            ended_at: new Date().toISOString(),
          },
        });
        return requireRunInScope(args.runStore, {
          tenantId: args.run.tenant_id,
          scope: args.run.scope,
          runId: args.run.run_id,
        });
      }
      const output = { result: true };
      args.runStore.updateRunNode({
        runId: current.run_id,
        nodeId,
        patch: {
          lifecycle_state: "terminal",
          terminal_outcome: "succeeded",
          status_summary: "succeeded",
          output_snapshot_json: output,
          ended_at: new Date().toISOString(),
        },
      });
      nodeOutputs.set(nodeId, output);
      continue;
    }

    if (node.kind === "artifact_gate") {
      const refs = Array.isArray(node.required_artifacts) ? node.required_artifacts : [];
      const resolved = refs.map((ref) => resolveBindingValue(ref, ctx));
      const missing = refs.filter((_, index) => resolved[index] == null || resolved[index] === "");
      if (missing.length > 0) {
        args.runStore.updateRunNode({
          runId: current.run_id,
          nodeId,
          patch: {
            lifecycle_state: "terminal",
            terminal_outcome: "failed",
            status_summary: "failed",
            error_code: "artifact_gate_missing",
            error_message: "required artifacts were not available",
            output_snapshot_json: { missing_artifacts: missing },
            ended_at: new Date().toISOString(),
          },
        });
        const failedNodes = args.runStore.listRunNodes(args.run.run_id);
        args.runStore.updateRun({
          runId: args.run.run_id,
          patch: {
            lifecycle_state: "terminal",
            terminal_outcome: "failed",
            status_summary: "failed",
            root_cause_code: "artifact_gate_missing",
            root_cause_node_id: nodeId,
            root_cause_message: "artifact gate requirements not satisfied",
            summary_json: summarizeRunNodes(failedNodes),
            ended_at: new Date().toISOString(),
          },
        });
        return requireRunInScope(args.runStore, {
          tenantId: args.run.tenant_id,
          scope: args.run.scope,
          runId: args.run.run_id,
        });
      }
      const output = { artifacts: resolved };
      args.runStore.updateRunNode({
        runId: current.run_id,
        nodeId,
        patch: {
          lifecycle_state: "terminal",
          terminal_outcome: "succeeded",
          status_summary: "succeeded",
          output_snapshot_json: output,
          ended_at: new Date().toISOString(),
        },
      });
      nodeOutputs.set(nodeId, output);
      continue;
    }

    const replayOut = await args.deps.replayRunner(
      {
        tenant_id: args.run.tenant_id,
        scope: args.run.scope,
        actor: args.actor ?? undefined,
        ...localReplayIdentity(args.actor),
        playbook_id: node.playbook_id,
        version: node.version,
        mode: args.run.execution_mode === "shadow" ? "simulate" : (node.mode ?? "simulate"),
        params: {
          ...(args.params ?? {}),
          ...resolvedInputs,
          record_run: true,
          stop_on_failure: true,
        },
      },
      args.deps.buildReplayRunOptions("lite_automation_run"),
    );
    const replayReadiness = toStringOrNull(asObject(replayOut?.summary)?.replay_readiness);
    const replayStatusRaw =
      replayOut?.mode === "simulate"
        ? (replayReadiness === "ready" || replayReadiness === "success" ? "success" : "failed")
        : String(replayOut?.run?.status ?? "failed");
    const replayStatus = replayStatusRaw.toLowerCase();
    const replayRunId = toStringOrNull(asObject(replayOut?.run)?.run_id);
    const replayPlaybookVersion = toPositiveIntOrNull(asObject(replayOut?.playbook)?.version) ?? node.version ?? null;
    const output = {
      playbook: replayOut?.playbook ?? null,
      mode: replayOut?.mode ?? null,
      run: replayOut?.run ?? null,
      summary: replayOut?.summary ?? null,
      execution: replayOut?.execution ?? null,
      steps: Array.isArray(replayOut?.steps) ? replayOut.steps.slice(0, 20) : [],
    };

    if (replayStatus === "success" || replayStatus === "succeeded") {
      args.runStore.updateRunNode({
        runId: current.run_id,
        nodeId,
        patch: {
          lifecycle_state: "terminal",
          terminal_outcome: "succeeded",
          status_summary: "succeeded",
          output_snapshot_json: output,
          playbook_version: replayPlaybookVersion,
          playbook_run_id: replayRunId,
          ended_at: new Date().toISOString(),
        },
      });
      nodeOutputs.set(nodeId, output);
      continue;
    }

    if (replayStatus === "partial") {
      args.runStore.updateRunNode({
        runId: current.run_id,
        nodeId,
        patch: {
          lifecycle_state: "paused",
          pause_reason: "repair_required",
          status_summary: "paused_for_repair",
          output_snapshot_json: output,
          playbook_version: replayPlaybookVersion,
          playbook_run_id: replayRunId,
          paused_at: new Date().toISOString(),
        },
      });
      const pausedNodes = args.runStore.listRunNodes(args.run.run_id);
      args.runStore.updateRun({
        runId: args.run.run_id,
        patch: {
          lifecycle_state: "paused",
          pause_reason: "repair_required",
          status_summary: "paused_for_repair",
          root_cause_code: "guided_repair_pending",
          root_cause_node_id: nodeId,
          root_cause_message: "playbook replay entered guided repair state",
          summary_json: summarizeRunNodes(pausedNodes),
          paused_at: new Date().toISOString(),
        },
      });
      return requireRunInScope(args.runStore, {
        tenantId: args.run.tenant_id,
        scope: args.run.scope,
        runId: args.run.run_id,
      });
    }

    args.runStore.updateRunNode({
      runId: current.run_id,
      nodeId,
      patch: {
        lifecycle_state: "terminal",
        terminal_outcome: "failed",
        status_summary: "failed",
        error_code: "playbook_run_failed",
        error_message: "playbook replay failed",
        output_snapshot_json: output,
        playbook_version: replayPlaybookVersion,
        playbook_run_id: replayRunId,
        ended_at: new Date().toISOString(),
      },
    });
    const failedNodes = args.runStore.listRunNodes(args.run.run_id);
    args.runStore.updateRun({
      runId: args.run.run_id,
      patch: {
        lifecycle_state: "terminal",
        terminal_outcome: "failed",
        status_summary: "failed",
        root_cause_code: "playbook_run_failed",
        root_cause_node_id: nodeId,
        root_cause_message: "playbook replay failed",
        summary_json: summarizeRunNodes(failedNodes),
        ended_at: new Date().toISOString(),
      },
    });
    return requireRunInScope(args.runStore, {
      tenantId: args.run.tenant_id,
      scope: args.run.scope,
      runId: args.run.run_id,
    });
  }

  const completedNodes = args.runStore.listRunNodes(args.run.run_id);
  args.runStore.updateRun({
    runId: args.run.run_id,
    patch: {
      lifecycle_state: "terminal",
      terminal_outcome: "succeeded",
      status_summary: "succeeded",
      summary_json: summarizeRunNodes(completedNodes),
      ended_at: new Date().toISOString(),
    },
  });
  return requireRunInScope(args.runStore, {
    tenantId: args.run.tenant_id,
    scope: args.run.scope,
    runId: args.run.run_id,
  });
}

export function automationValidateLite(body: unknown, defaults: AutomationDefaults) {
  const parsed = AutomationValidateRequest.parse(body);
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    defaults,
  );
  const validation = validateAutomationGraph(parsed.graph);
  return {
    tenant_id: tenancy.tenant_id,
    scope: tenancy.scope,
    graph: summarizeGraph(parsed.graph, validation),
    validation,
    runtime: buildLiteAutomationRuntimeSummary({
      supportedNodeKinds: LITE_AUTOMATION_SUPPORTED_NODE_KINDS,
      supportedRoutes: LITE_AUTOMATION_SUPPORTED_ROUTES,
    }),
  };
}

export function automationCreateLite(store: LiteAutomationStore, body: unknown, defaults: AutomationDefaults) {
  const parsed = AutomationCreateRequest.parse(body);
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    defaults,
  );
  const validation = validateAutomationGraph(parsed.graph);
  const out = store.createDefinition({
    tenantId: tenancy.tenant_id,
    scope: tenancy.scope,
    automationId: parsed.automation_id,
    name: parsed.name,
    status: parsed.status,
    graph: parsed.graph,
    inputContract: parsed.input_contract ?? {},
    outputContract: parsed.output_contract ?? {},
    metadata: parsed.metadata ?? {},
    compileSummary: summarizeGraph(parsed.graph, validation),
  });
  return {
    automation: out,
    validation,
    runtime: buildLiteAutomationRuntimeSummary(),
  };
}

export function automationGetLite(store: LiteAutomationStore, body: unknown, defaults: AutomationDefaults) {
  const parsed = AutomationGetRequest.parse(body);
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    defaults,
  );
  const out = loadDefinitionForExecution(store, {
    tenantId: tenancy.tenant_id,
    scope: tenancy.scope,
    automationId: parsed.automation_id,
    version: parsed.version ?? null,
  });
  return {
    automation: out,
    runtime: buildLiteAutomationRuntimeSummary(),
  };
}

export function automationListLite(store: LiteAutomationStore, body: unknown, defaults: AutomationDefaults) {
  const parsed = AutomationListRequest.parse(body);
  if (parsed.promotion_only) {
    throw new HttpError(
      501,
      "automation_feature_not_supported_in_lite",
      "promotion-only listing is not supported in lite automation kernel",
      buildLiteAutomationUnsupportedDetails({
        route: "/v1/automations/list",
        unsupported: ["promotion_only"],
        reason: "promotion-only listing is not supported in lite automation kernel",
      }),
    );
  }
  if (parsed.reviewer) {
    throw new HttpError(
      501,
      "automation_feature_not_supported_in_lite",
      "reviewer-scoped listing is not supported in lite automation kernel",
      buildLiteAutomationUnsupportedDetails({
        route: "/v1/automations/list",
        unsupported: ["reviewer"],
        reason: "reviewer-scoped listing is not supported in lite automation kernel",
      }),
    );
  }
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    defaults,
  );
  const automations = store.listDefinitions({
    tenantId: tenancy.tenant_id,
    scope: tenancy.scope,
    status: parsed.status ?? null,
    limit: parsed.limit,
  });
  return {
    tenant_id: tenancy.tenant_id,
    scope: tenancy.scope,
    automations,
    runtime: buildLiteAutomationRuntimeSummary(),
  };
}

export async function automationRunLite(args: {
  definitionStore: LiteAutomationStore;
  runStore: LiteAutomationRunStore;
  body: unknown;
  defaults: AutomationDefaults;
  deps: LiteAutomationExecutionDeps;
}) {
  const parsed = AutomationRunRequest.parse(args.body);
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    args.defaults,
  );
  const actor = resolveLiteActor(parsed.actor ?? null, args.defaults);
  const definition = loadDefinitionForExecution(args.definitionStore, {
    tenantId: tenancy.tenant_id,
    scope: tenancy.scope,
    automationId: parsed.automation_id,
    version: parsed.version ?? null,
  });
  const run = args.runStore.createRun({
    runId: randomUUID(),
    tenantId: tenancy.tenant_id,
    scope: tenancy.scope,
    automationId: parsed.automation_id,
    automationVersion: definition.version.version,
    requestedBy: actor,
    executionMode: parsed.options.execution_mode,
    paramsJson: parsed.params ?? {},
    graph: definition.version.graph,
  });
  return await continueAutomationRun({
    definitionStore: args.definitionStore,
    runStore: args.runStore,
    run,
    graph: definition.version.graph,
    actor,
    params: parsed.params ?? {},
    defaults: args.defaults,
    deps: args.deps,
  });
}

export function automationRunGetLite(runStore: LiteAutomationRunStore, body: unknown, defaults: AutomationDefaults) {
  const parsed = AutomationRunGetRequest.parse(body);
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    defaults,
  );
  const run = requireRunInScope(runStore, {
    tenantId: tenancy.tenant_id,
    scope: tenancy.scope,
    runId: parsed.run_id,
  });
  return {
    run: parsed.include_nodes === false ? { ...run, nodes: [] } : run,
    runtime: buildLiteAutomationRuntimeSummary(),
  };
}

export function automationRunListLite(runStore: LiteAutomationRunStore, body: unknown, defaults: AutomationDefaults) {
  const parsed = AutomationRunListRequest.parse(body);
  if (parsed.actionable_only || parsed.compensation_only || parsed.reviewer || parsed.compensation_owner || parsed.escalation_owner || parsed.workflow_bucket || parsed.sla_status) {
    const unsupported = [
      parsed.actionable_only ? "actionable_only" : null,
      parsed.compensation_only ? "compensation_only" : null,
      parsed.reviewer ? "reviewer" : null,
      parsed.compensation_owner ? "compensation_owner" : null,
      parsed.escalation_owner ? "escalation_owner" : null,
      parsed.workflow_bucket ? "workflow_bucket" : null,
      parsed.sla_status ? "sla_status" : null,
    ].filter((value): value is string => !!value);
    throw new HttpError(
      501,
      "automation_feature_not_supported_in_lite",
      "advanced run inbox filters are not supported in lite automation kernel",
      buildLiteAutomationUnsupportedDetails({
        route: "/v1/automations/runs/list",
        unsupported,
        reason: "advanced run inbox filters are not supported in lite automation kernel",
      }),
    );
  }
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    defaults,
  );
  return {
    tenant_id: tenancy.tenant_id,
    scope: tenancy.scope,
    runs: runStore.listRuns({
      tenantId: tenancy.tenant_id,
      scope: tenancy.scope,
      automationId: parsed.automation_id ?? null,
      limit: parsed.limit,
    }),
    runtime: buildLiteAutomationRuntimeSummary(),
  };
}

export function automationRunCancelLite(runStore: LiteAutomationRunStore, body: unknown, defaults: AutomationDefaults) {
  const parsed = AutomationRunCancelRequest.parse(body);
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    defaults,
  );
  const run = requireRunInScope(runStore, {
    tenantId: tenancy.tenant_id,
    scope: tenancy.scope,
    runId: parsed.run_id,
  });
  if (run.lifecycle_state === "terminal") {
    throw new HttpError(409, "automation_run_not_cancellable", "automation run is already terminal", {
      run_id: parsed.run_id,
      lifecycle_state: run.lifecycle_state,
      terminal_outcome: run.terminal_outcome,
    });
  }
  for (const node of run.nodes) {
    if (node.lifecycle_state !== "terminal") {
      runStore.updateRunNode({
        runId: run.run_id,
        nodeId: node.node_id,
        patch: {
          lifecycle_state: "terminal",
          terminal_outcome: "rejected",
          status_summary: "cancelled",
          error_code: "automation_run_cancelled",
          error_message: parsed.reason ?? "automation run cancelled by operator",
          ended_at: new Date().toISOString(),
        },
      });
    }
  }
  const nodes = runStore.listRunNodes(run.run_id);
  runStore.updateRun({
    runId: run.run_id,
    patch: {
      lifecycle_state: "terminal",
      terminal_outcome: "cancelled",
      status_summary: "cancelled",
      root_cause_code: "automation_run_cancelled",
      root_cause_node_id: run.root_cause_node_id,
      root_cause_message: parsed.reason ?? "automation run cancelled by operator",
      summary_json: summarizeRunNodes(nodes),
      ended_at: new Date().toISOString(),
      pause_reason: null,
    },
  });
  return {
    run: requireRunInScope(runStore, {
      tenantId: tenancy.tenant_id,
      scope: tenancy.scope,
      runId: run.run_id,
    }),
    runtime: buildLiteAutomationRuntimeSummary(),
  };
}

export async function automationRunResumeLite(args: {
  definitionStore: LiteAutomationStore;
  runStore: LiteAutomationRunStore;
  body: unknown;
  defaults: AutomationDefaults;
  deps: LiteAutomationExecutionDeps;
}) {
  const parsed = AutomationRunResumeRequest.parse(args.body);
  const tenancy = resolveTenantScope(
    { tenant_id: parsed.tenant_id, scope: parsed.scope },
    args.defaults,
  );
  const actor = resolveLiteActor(parsed.actor ?? null, args.defaults);
  const run = requireRunInScope(args.runStore, {
    tenantId: tenancy.tenant_id,
    scope: tenancy.scope,
    runId: parsed.run_id,
  });
  if (run.lifecycle_state !== "paused") {
    throw new HttpError(409, "automation_run_not_resumable", "automation run is not paused", {
      run_id: parsed.run_id,
      lifecycle_state: run.lifecycle_state,
    });
  }
  if (run.pause_reason !== "approval_required") {
    throw new HttpError(409, "automation_run_not_resumable", "lite automation kernel currently resumes approval pauses only", {
      run_id: parsed.run_id,
      pause_reason: run.pause_reason,
    });
  }
  const definition = loadDefinitionForExecution(args.definitionStore, {
    tenantId: run.tenant_id,
    scope: run.scope,
    automationId: run.automation_id,
    version: run.automation_version,
  });
  return await continueAutomationRun({
    definitionStore: args.definitionStore,
    runStore: args.runStore,
    run,
    graph: definition.version.graph,
    actor,
    params: run.params_json,
    defaults: args.defaults,
    deps: args.deps,
    resumeReason: parsed.reason ?? "operator_resume",
  });
}

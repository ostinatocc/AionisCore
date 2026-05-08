#!/usr/bin/env node
import {
  commonRuntimeFields,
  defaultToolCandidates,
  ensureRuntime,
  resolveConfig,
  runtimeGet,
  runtimePost,
  truncateText,
  uuidFromText,
} from "../lib/aionis-codex-runtime.mjs";

const SERVER_INFO = {
  name: "aionis-runtime",
  version: "0.1.0",
};

function objectSchema(properties, required = []) {
  return {
    type: "object",
    properties: {
      cwd: { type: "string", description: "Optional Codex workspace cwd used for Aionis project scope resolution." },
      working_directory: { type: "string", description: "Optional Codex workspace cwd used for Aionis project scope resolution." },
      ...properties,
    },
    required,
    additionalProperties: false,
  };
}

function looseObjectSchema(properties = {}, required = []) {
  return {
    ...objectSchema(properties, required),
    additionalProperties: true,
  };
}

const objectProperty = {
  type: "object",
  additionalProperties: true,
};

const stringProperty = {
  type: "string",
};

const ROUTE_TOOLS = {
  aionis_health: {
    description: "Check local Aionis Runtime health and route availability.",
    method: "GET",
    path: "/health",
    inputSchema: objectSchema({}),
  },
  aionis_runtime_boundary_inventory: {
    description: "Read Aionis Runtime boundary inventory for operator/debug inspection.",
    method: "GET",
    path: "/v1/runtime/boundary-inventory",
    inputSchema: objectSchema({}),
  },
  aionis_context_assemble: {
    description: "Assemble full Aionis task context: recall, rules, tool selection, planner packet, layered context, cost signals, and execution summary.",
    method: "POST",
    path: "/v1/memory/context/assemble",
    identity: true,
    inputSchema: objectSchema({
      query_text: stringProperty,
      context: objectProperty,
      candidates: { type: "array", items: { type: "string" } },
      tool_candidates: { type: "array", items: { type: "string" } },
      run_id: stringProperty,
      return_layered_context: { type: "boolean" },
      include_shadow: { type: "boolean" },
      limit: { type: "number" },
      max_nodes: { type: "number" },
      max_edges: { type: "number" },
      context_char_budget: { type: "number" },
    }, ["query_text"]),
  },
  aionis_planning_context: {
    description: "Build Aionis planning context for the current task using recall, rules, tool selection, and planning summary.",
    method: "POST",
    path: "/v1/memory/planning/context",
    identity: true,
    inputSchema: objectSchema({
      query_text: stringProperty,
      context: objectProperty,
      candidates: { type: "array", items: { type: "string" } },
      tool_candidates: { type: "array", items: { type: "string" } },
      run_id: stringProperty,
      return_layered_context: { type: "boolean" },
      include_shadow: { type: "boolean" },
    }, ["query_text"]),
  },
  aionis_recall_text: {
    description: "Recall Aionis memory by text query.",
    method: "POST",
    path: "/v1/memory/recall_text",
    identity: true,
    inputSchema: objectSchema({
      query_text: stringProperty,
      limit: { type: "number" },
      max_nodes: { type: "number" },
      max_edges: { type: "number" },
      context_char_budget: { type: "number" },
      include_meta: { type: "boolean" },
      include_slots_preview: { type: "boolean" },
    }, ["query_text"]),
  },
  aionis_memory_write: {
    description: "Write nodes and edges into Aionis memory.",
    method: "POST",
    path: "/v1/memory/write",
    identity: true,
    inputSchema: objectSchema({
      input_text: stringProperty,
      nodes: { type: "array", items: objectProperty },
      edges: { type: "array", items: objectProperty },
      auto_embed: { type: "boolean" },
      memory_lane: { type: "string", enum: ["private", "shared"] },
    }),
  },
  aionis_handoff_store: {
    description: "Store a structured handoff into Aionis continuity memory.",
    method: "POST",
    path: "/v1/handoff/store",
    identity: true,
    inputSchema: objectSchema({
      handoff_kind: stringProperty,
      anchor: stringProperty,
      summary: stringProperty,
      handoff_text: stringProperty,
      repo_root: stringProperty,
      file_path: stringProperty,
      target_files: { type: "array", items: { type: "string" } },
      acceptance_checks: { type: "array", items: { type: "string" } },
      next_action: stringProperty,
      tags: { type: "array", items: { type: "string" } },
    }, ["handoff_kind", "anchor", "summary", "handoff_text"]),
  },
  aionis_handoff_recover: {
    description: "Recover a structured Aionis handoff by anchor, id, URI, repository root, or file path.",
    method: "POST",
    path: "/v1/handoff/recover",
    identity: true,
    inputSchema: objectSchema({
      handoff_id: stringProperty,
      handoff_uri: stringProperty,
      anchor: stringProperty,
      handoff_kind: { type: "string", enum: ["patch_handoff", "review_handoff", "task_handoff"] },
      memory_lane: { type: "string", enum: ["private", "shared"] },
      repo_root: stringProperty,
      file_path: stringProperty,
      symbol: stringProperty,
      include_payload: { type: "boolean" },
    }),
  },
  aionis_agent_inspect: {
    description: "Inspect Aionis agent memory, continuity, policies, governance, trusted patterns, and handoff state.",
    method: "POST",
    path: "/v1/memory/agent/inspect",
    identity: true,
    inputSchema: objectSchema({
      query_text: stringProperty,
      repo_root: stringProperty,
      anchor: stringProperty,
      include_payload: { type: "boolean" },
      include_meta: { type: "boolean" },
      limit: { type: "number" },
    }, ["query_text"]),
  },
  aionis_agent_review_pack: {
    description: "Return Aionis review/governance pack for a task.",
    method: "POST",
    path: "/v1/memory/agent/review-pack",
    identity: true,
    inputSchema: objectSchema({
      query_text: stringProperty,
      context: objectProperty,
      candidates: { type: "array", items: { type: "string" } },
      repo_root: stringProperty,
      include_payload: { type: "boolean" },
    }, ["query_text"]),
  },
  aionis_agent_resume_pack: {
    description: "Return Aionis resume/continuity pack for a task or repository.",
    method: "POST",
    path: "/v1/memory/agent/resume-pack",
    identity: true,
    inputSchema: objectSchema({
      query_text: stringProperty,
      context: objectProperty,
      candidates: { type: "array", items: { type: "string" } },
      repo_root: stringProperty,
      include_payload: { type: "boolean" },
    }, ["query_text"]),
  },
  aionis_agent_handoff_pack: {
    description: "Return Aionis handoff pack for a task or anchor.",
    method: "POST",
    path: "/v1/memory/agent/handoff-pack",
    identity: true,
    inputSchema: objectSchema({
      query_text: stringProperty,
      context: objectProperty,
      candidates: { type: "array", items: { type: "string" } },
      repo_root: stringProperty,
      anchor: stringProperty,
      include_payload: { type: "boolean" },
    }, ["query_text"]),
  },
  aionis_execution_introspect: {
    description: "Inspect execution memory: workflows, patterns, rehydration candidates, action packets, and continuity summary.",
    method: "POST",
    path: "/v1/memory/execution/introspect",
    identity: true,
    inputSchema: objectSchema({ run_id: stringProperty, session_id: stringProperty, limit: { type: "number" } }),
  },
  aionis_workflow_contract: {
    description: "Retrieve selected workflow contract and authority summary by anchor, workflow signature, task family, or file path.",
    method: "POST",
    path: "/v1/memory/execution/workflow-contract",
    identity: true,
    inputSchema: objectSchema({
      anchor_id: stringProperty,
      workflow_signature: stringProperty,
      task_family: stringProperty,
      file_path: stringProperty,
      include_introspection: { type: "boolean" },
    }),
  },
  aionis_action_retrieval: {
    description: "Retrieve Aionis task-start action recommendations, uncertainty gates, workflows, and policy contracts.",
    method: "POST",
    path: "/v1/memory/action/retrieval",
    identity: true,
    inputSchema: objectSchema({ query_text: stringProperty, context: objectProperty, candidates: { type: "array", items: { type: "string" } } }, ["query_text"]),
  },
  aionis_kickoff_recommendation: {
    description: "Get the fast Aionis kickoff recommendation for the next action.",
    method: "POST",
    path: "/v1/memory/kickoff/recommendation",
    identity: true,
    inputSchema: objectSchema({ query_text: stringProperty, context: objectProperty, candidates: { type: "array", items: { type: "string" } } }, ["query_text"]),
  },
  aionis_tools_select: {
    description: "Select tools using Aionis learned tool policy and rule memory.",
    method: "POST",
    path: "/v1/memory/tools/select",
    identity: true,
    inputSchema: objectSchema({ context: objectProperty, candidates: { type: "array", items: { type: "string" } }, run_id: stringProperty }, ["context", "candidates"]),
  },
  aionis_tools_feedback: {
    description: "Record tool selection feedback into Aionis learning/governance memory.",
    method: "POST",
    path: "/v1/memory/tools/feedback",
    identity: true,
    inputSchema: objectSchema({
      outcome: { type: "string", enum: ["positive", "negative", "neutral"] },
      context: objectProperty,
      candidates: { type: "array", items: { type: "string" } },
      selected_tool: stringProperty,
      run_id: stringProperty,
      note: stringProperty,
    }, ["outcome", "context", "candidates", "selected_tool"]),
  },
  aionis_policy_governance_apply: {
    description: "Apply Aionis policy governance action: refresh, retire, or reactivate a policy memory.",
    method: "POST",
    path: "/v1/memory/policies/governance/apply",
    identity: true,
    inputSchema: objectSchema({
      query_text: stringProperty,
      policy_memory_id: stringProperty,
      action: { type: "string", enum: ["refresh", "retire", "reactivate"] },
      reason: stringProperty,
    }, ["query_text", "policy_memory_id", "action"]),
  },
  aionis_replay_run_start: {
    description: "Start an Aionis replay run for execution trace capture.",
    method: "POST",
    path: "/v1/memory/replay/run/start",
    identity: true,
    inputSchema: objectSchema({ run_id: stringProperty, goal: stringProperty, metadata: objectProperty }, ["goal"]),
  },
  aionis_replay_step_before: {
    description: "Record a pre-tool replay step.",
    method: "POST",
    path: "/v1/memory/replay/step/before",
    identity: true,
    inputSchema: objectSchema({ run_id: stringProperty, step_id: stringProperty, step_index: { type: "number" }, tool_name: stringProperty, tool_input: {}, metadata: objectProperty }, ["run_id", "step_index", "tool_name", "tool_input"]),
  },
  aionis_replay_step_after: {
    description: "Record a post-tool replay step outcome.",
    method: "POST",
    path: "/v1/memory/replay/step/after",
    identity: true,
    inputSchema: objectSchema({ run_id: stringProperty, step_id: stringProperty, step_index: { type: "number" }, status: { type: "string", enum: ["success", "failed", "skipped", "partial"] }, output_signature: {}, error: stringProperty, metadata: objectProperty }, ["run_id", "status"]),
  },
  aionis_replay_run_end: {
    description: "End an Aionis replay run.",
    method: "POST",
    path: "/v1/memory/replay/run/end",
    identity: true,
    inputSchema: objectSchema({ run_id: stringProperty, status: { type: "string", enum: ["success", "failed", "partial"] }, summary: stringProperty, metrics: objectProperty, metadata: objectProperty }, ["run_id", "status"]),
  },
  aionis_replay_run_get: {
    description: "Get an Aionis replay run and its recorded steps.",
    method: "POST",
    path: "/v1/memory/replay/runs/get",
    identity: true,
    inputSchema: objectSchema({ run_id: stringProperty }, ["run_id"]),
  },
  aionis_replay_playbook_compile_from_run: {
    description: "Compile an Aionis replay run into a reusable playbook candidate.",
    method: "POST",
    path: "/v1/memory/replay/playbooks/compile_from_run",
    identity: true,
    inputSchema: looseObjectSchema({ run_id: stringProperty, playbook_id: stringProperty, name: stringProperty, allow_partial: { type: "boolean" }, matchers: objectProperty, risk_profile: stringProperty, metadata: objectProperty }, ["run_id"]),
  },
  aionis_replay_playbook_get: {
    description: "Get an Aionis replay playbook.",
    method: "POST",
    path: "/v1/memory/replay/playbooks/get",
    identity: true,
    inputSchema: looseObjectSchema({ playbook_id: stringProperty }, ["playbook_id"]),
  },
  aionis_replay_playbook_candidate: {
    description: "Inspect a candidate Aionis replay playbook for a task or workflow.",
    method: "POST",
    path: "/v1/memory/replay/playbooks/candidate",
    identity: true,
    inputSchema: looseObjectSchema({ query_text: stringProperty, context: objectProperty, metadata: objectProperty }),
  },
  aionis_replay_playbook_promote: {
    description: "Promote or demote an Aionis replay playbook status.",
    method: "POST",
    path: "/v1/memory/replay/playbooks/promote",
    identity: true,
    inputSchema: looseObjectSchema({ playbook_id: stringProperty, target_status: stringProperty, note: stringProperty }, ["playbook_id", "target_status"]),
  },
  aionis_replay_playbook_repair: {
    description: "Repair an Aionis replay playbook.",
    method: "POST",
    path: "/v1/memory/replay/playbooks/repair",
    identity: true,
    inputSchema: looseObjectSchema({ playbook_id: stringProperty, note: stringProperty, metadata: objectProperty }, ["playbook_id"]),
  },
  aionis_replay_playbook_repair_review: {
    description: "Run governed repair review for an Aionis replay playbook.",
    method: "POST",
    path: "/v1/memory/replay/playbooks/repair/review",
    identity: true,
    inputSchema: looseObjectSchema({ playbook_id: stringProperty, metadata: objectProperty }, ["playbook_id"]),
  },
  aionis_replay_playbook_run: {
    description: "Run an Aionis replay playbook.",
    method: "POST",
    path: "/v1/memory/replay/playbooks/run",
    identity: true,
    inputSchema: looseObjectSchema({ playbook_id: stringProperty, inputs: objectProperty, metadata: objectProperty }, ["playbook_id"]),
  },
  aionis_replay_playbook_dispatch: {
    description: "Dispatch an Aionis replay playbook through governed runtime execution.",
    method: "POST",
    path: "/v1/memory/replay/playbooks/dispatch",
    identity: true,
    inputSchema: looseObjectSchema({ playbook_id: stringProperty, inputs: objectProperty, metadata: objectProperty }, ["playbook_id"]),
  },
  aionis_memory_feedback: {
    description: "Record generic Aionis memory feedback.",
    method: "POST",
    path: "/v1/memory/feedback",
    identity: true,
    inputSchema: looseObjectSchema({ outcome: stringProperty, note: stringProperty, metadata: objectProperty }),
  },
  aionis_rules_state: {
    description: "Read or update Aionis rule state.",
    method: "POST",
    path: "/v1/memory/rules/state",
    identity: true,
    inputSchema: looseObjectSchema({ rule_node_id: stringProperty, metadata: objectProperty }),
  },
  aionis_rules_evaluate: {
    description: "Evaluate Aionis rules against a context.",
    method: "POST",
    path: "/v1/memory/rules/evaluate",
    identity: true,
    inputSchema: looseObjectSchema({ context: objectProperty, candidates: { type: "array", items: { type: "string" } } }),
  },
  aionis_tools_decision: {
    description: "Record or inspect an Aionis tool decision.",
    method: "POST",
    path: "/v1/memory/tools/decision",
    identity: true,
    inputSchema: looseObjectSchema({ context: objectProperty, candidates: { type: "array", items: { type: "string" } }, selected_tool: stringProperty, run_id: stringProperty }),
  },
  aionis_tools_run: {
    description: "Record an Aionis tools run.",
    method: "POST",
    path: "/v1/memory/tools/run",
    identity: true,
    inputSchema: looseObjectSchema({ run_id: stringProperty, context: objectProperty, metadata: objectProperty }),
  },
  aionis_tools_runs_list: {
    description: "List Aionis tools runs.",
    method: "POST",
    path: "/v1/memory/tools/runs/list",
    identity: true,
    inputSchema: looseObjectSchema({ run_id: stringProperty, limit: { type: "number" }, offset: { type: "number" } }),
  },
  aionis_patterns_suppress: {
    description: "Suppress an Aionis pattern.",
    method: "POST",
    path: "/v1/memory/patterns/suppress",
    identity: true,
    inputSchema: looseObjectSchema({ pattern_anchor_id: stringProperty, reason: stringProperty }, ["pattern_anchor_id"]),
  },
  aionis_patterns_unsuppress: {
    description: "Unsuppress an Aionis pattern.",
    method: "POST",
    path: "/v1/memory/patterns/unsuppress",
    identity: true,
    inputSchema: looseObjectSchema({ pattern_anchor_id: stringProperty, reason: stringProperty }, ["pattern_anchor_id"]),
  },
  aionis_tools_rehydrate_payload: {
    description: "Rehydrate an Aionis tools payload.",
    method: "POST",
    path: "/v1/memory/tools/rehydrate_payload",
    identity: true,
    inputSchema: looseObjectSchema({ anchor_id: stringProperty, payload_ref: stringProperty }),
  },
  aionis_sandbox_execute: {
    description: "Execute an allowed Aionis sandbox command through the runtime sandbox surface.",
    method: "POST",
    path: "/v1/memory/sandbox/execute",
    identity: true,
    inputSchema: objectSchema({ session_id: stringProperty, command: stringProperty, args: { type: "array", items: { type: "string" } }, cwd: stringProperty, timeout_ms: { type: "number" }, metadata: objectProperty }, ["command"]),
  },
  aionis_sandbox_runs_cancel: {
    description: "Cancel an Aionis sandbox run.",
    method: "POST",
    path: "/v1/memory/sandbox/runs/cancel",
    identity: true,
    inputSchema: looseObjectSchema({ run_id: stringProperty }, ["run_id"]),
  },
  aionis_automation_create: {
    description: "Create an Aionis automation definition.",
    method: "POST",
    path: "/v1/automations/create",
    identity: true,
    inputSchema: looseObjectSchema({ automation_id: stringProperty, name: stringProperty, graph: objectProperty, metadata: objectProperty }, ["automation_id", "name"]),
  },
  aionis_automation_get: {
    description: "Get an Aionis automation definition.",
    method: "POST",
    path: "/v1/automations/get",
    identity: true,
    inputSchema: looseObjectSchema({ automation_id: stringProperty }, ["automation_id"]),
  },
  aionis_automation_list: {
    description: "List Aionis automation definitions.",
    method: "POST",
    path: "/v1/automations/list",
    identity: true,
    inputSchema: looseObjectSchema({ limit: { type: "number" }, offset: { type: "number" } }),
  },
  aionis_automation_validate: {
    description: "Validate an Aionis automation definition.",
    method: "POST",
    path: "/v1/automations/validate",
    identity: true,
    inputSchema: looseObjectSchema({ automation: objectProperty, graph: objectProperty }),
  },
  aionis_automation_graph_validate: {
    description: "Validate an Aionis automation graph.",
    method: "POST",
    path: "/v1/automations/graph/validate",
    identity: true,
    inputSchema: looseObjectSchema({ graph: objectProperty }, ["graph"]),
  },
  aionis_automation_run: {
    description: "Run an Aionis automation definition.",
    method: "POST",
    path: "/v1/automations/run",
    identity: true,
    inputSchema: objectSchema({ automation_id: stringProperty, input: objectProperty, metadata: objectProperty }, ["automation_id"]),
  },
  aionis_automation_runs_get: {
    description: "Get an Aionis automation run.",
    method: "POST",
    path: "/v1/automations/runs/get",
    identity: true,
    inputSchema: looseObjectSchema({ run_id: stringProperty }, ["run_id"]),
  },
  aionis_automation_runs_list: {
    description: "List Aionis automation runs.",
    method: "POST",
    path: "/v1/automations/runs/list",
    identity: true,
    inputSchema: looseObjectSchema({ automation_id: stringProperty, limit: { type: "number" }, offset: { type: "number" } }),
  },
  aionis_automation_runs_cancel: {
    description: "Cancel an Aionis automation run.",
    method: "POST",
    path: "/v1/automations/runs/cancel",
    identity: true,
    inputSchema: looseObjectSchema({ run_id: stringProperty }, ["run_id"]),
  },
  aionis_automation_runs_resume: {
    description: "Resume an Aionis automation run.",
    method: "POST",
    path: "/v1/automations/runs/resume",
    identity: true,
    inputSchema: looseObjectSchema({ run_id: stringProperty, metadata: objectProperty }, ["run_id"]),
  },
  aionis_memory_archive_rehydrate: {
    description: "Rehydrate archived Aionis memory.",
    method: "POST",
    path: "/v1/memory/archive/rehydrate",
    identity: true,
    inputSchema: looseObjectSchema({ memory_id: stringProperty, anchor_id: stringProperty, reason: stringProperty }),
  },
  aionis_memory_nodes_activate: {
    description: "Activate Aionis memory nodes.",
    method: "POST",
    path: "/v1/memory/nodes/activate",
    identity: true,
    inputSchema: looseObjectSchema({ node_ids: { type: "array", items: { type: "string" } }, reason: stringProperty }),
  },
  aionis_memory_recall: {
    description: "Call the legacy structured Aionis memory recall route.",
    method: "POST",
    path: "/v1/memory/recall",
    identity: true,
    inputSchema: looseObjectSchema({ query_text: stringProperty, limit: { type: "number" } }, ["query_text"]),
  },
  aionis_memory_packs_export: {
    description: "Export an Aionis memory pack.",
    method: "POST",
    path: "/v1/memory/packs/export",
    identity: true,
    inputSchema: looseObjectSchema({ include_nodes: { type: "boolean" }, include_edges: { type: "boolean" }, max_rows: { type: "number" } }),
  },
  aionis_memory_packs_import: {
    description: "Import an Aionis memory pack.",
    method: "POST",
    path: "/v1/memory/packs/import",
    identity: true,
    inputSchema: looseObjectSchema({ pack: objectProperty }, ["pack"]),
  },
  aionis_memory_trajectory_compile: {
    description: "Compile Aionis trajectory memory from execution evidence.",
    method: "POST",
    path: "/v1/memory/trajectory/compile",
    identity: true,
    inputSchema: looseObjectSchema({ query_text: stringProperty, trajectory: objectProperty, metadata: objectProperty }, ["query_text"]),
  },
  aionis_memory_delegation_records: {
    description: "Write Aionis delegation records.",
    method: "POST",
    path: "/v1/memory/delegation/records",
    identity: true,
    inputSchema: looseObjectSchema({ records: { type: "array", items: objectProperty }, metadata: objectProperty }),
  },
  aionis_memory_delegation_records_find: {
    description: "Find Aionis delegation records.",
    method: "POST",
    path: "/v1/memory/delegation/records/find",
    identity: true,
    inputSchema: looseObjectSchema({ query_text: stringProperty, limit: { type: "number" } }),
  },
  aionis_memory_delegation_records_aggregate: {
    description: "Aggregate Aionis delegation records.",
    method: "POST",
    path: "/v1/memory/delegation/records/aggregate",
    identity: true,
    inputSchema: looseObjectSchema({ query_text: stringProperty, limit: { type: "number" } }),
  },
  aionis_memory_find: {
    description: "Find Aionis memory nodes and continuity records.",
    method: "POST",
    path: "/v1/memory/find",
    identity: true,
    inputSchema: looseObjectSchema({ query_text: stringProperty, limit: { type: "number" } }, ["query_text"]),
  },
  aionis_continuity_review_pack: {
    description: "Recover an Aionis continuity review pack.",
    method: "POST",
    path: "/v1/memory/continuity/review-pack",
    identity: true,
    inputSchema: looseObjectSchema({ anchor: stringProperty, handoff_id: stringProperty, handoff_uri: stringProperty, repo_root: stringProperty, handoff_kind: stringProperty }),
  },
  aionis_evolution_review_pack: {
    description: "Build an Aionis evolution review pack.",
    method: "POST",
    path: "/v1/memory/evolution/review-pack",
    identity: true,
    inputSchema: looseObjectSchema({ query_text: stringProperty, context: objectProperty, candidates: { type: "array", items: { type: "string" } } }, ["query_text"]),
  },
  aionis_experience_intelligence: {
    description: "Run Aionis experience intelligence over task context.",
    method: "POST",
    path: "/v1/memory/experience/intelligence",
    identity: true,
    inputSchema: looseObjectSchema({ query_text: stringProperty, context: objectProperty, candidates: { type: "array", items: { type: "string" } } }, ["query_text"]),
  },
  aionis_memory_resolve: {
    description: "Resolve Aionis memory references.",
    method: "POST",
    path: "/v1/memory/resolve",
    identity: true,
    inputSchema: looseObjectSchema({ uri: stringProperty, id: stringProperty, include_payload: { type: "boolean" } }),
  },
  aionis_memory_anchors_rehydrate_payload: {
    description: "Rehydrate an Aionis memory anchor payload.",
    method: "POST",
    path: "/v1/memory/anchors/rehydrate_payload",
    identity: true,
    inputSchema: looseObjectSchema({ anchor_id: stringProperty, payload_ref: stringProperty }),
  },
};

const EXTRA_TOOLS = {
  aionis_store_execution_outcome: {
    name: "aionis_store_execution_outcome",
    description: "Store a full execution outcome: start run, write step before/after pairs, end run, and optionally compile/simulate a playbook.",
    inputSchema: objectSchema({
      run_id: stringProperty,
      goal: stringProperty,
      status: { type: "string", enum: ["success", "failed", "partial"] },
      summary: stringProperty,
      steps: {
        type: "array",
        items: objectSchema({
          step_id: stringProperty,
          step_index: { type: "number" },
          tool_name: stringProperty,
          tool_input: {},
          status: { type: "string", enum: ["success", "failed", "skipped", "partial"] },
          output_signature: {},
          error: stringProperty,
          metadata: objectProperty,
        }, ["tool_name", "tool_input", "status"]),
      },
      compile_playbook: { type: "boolean" },
      metadata: objectProperty,
    }, ["goal", "status"]),
  },
  aionis_runtime_call: {
    name: "aionis_runtime_call",
    description: "Call any Aionis Runtime HTTP route. This exposes the complete runtime surface for advanced operators.",
    inputSchema: objectSchema({
      method: { type: "string", enum: ["GET", "POST"] },
      path: stringProperty,
      payload: objectProperty,
      query: objectProperty,
      with_identity: { type: "boolean" },
    }, ["method", "path"]),
  },
};

function listTools() {
  const routeTools = Object.entries(ROUTE_TOOLS).map(([name, config]) => ({
    name,
    description: config.description,
    inputSchema: config.inputSchema,
  }));
  return [...routeTools, ...Object.values(EXTRA_TOOLS)];
}

function textResult(value, isError = false) {
  return {
    isError,
    content: [
      {
        type: "text",
        text: truncateText(typeof value === "string" ? value : JSON.stringify(value, null, 2), 20000),
      },
    ],
  };
}

function applyIdentity(config, payload, routeConfig) {
  if (!routeConfig.identity) return payload || {};
  return {
    ...commonRuntimeFields(config),
    ...(payload || {}),
  };
}

async function ensure(config) {
  const status = await ensureRuntime(config);
  if (!status.ok) {
    const reason = status.error ? String(status.error.message || status.error) : "unknown error";
    const error = new Error(`Aionis Runtime is unavailable at ${config.baseUrl}: ${reason}`);
    error.cause = status.error;
    throw error;
  }
}

async function callRouteTool(config, toolName, args) {
  const route = ROUTE_TOOLS[toolName];
  if (!route) throw new Error(`unknown Aionis route tool: ${toolName}`);
  await ensure(config);
  const payload = applyIdentity(config, defaultRoutePayload(config, toolName, args || {}), route);
  return route.method === "GET"
    ? runtimeGet(config, route.path, payload)
    : runtimePost(config, route.path, payload);
}

function defaultRoutePayload(config, toolName, args) {
  if (toolName === "aionis_context_assemble" || toolName === "aionis_planning_context") {
    return {
      context: { host: "codex", cwd: config.cwd },
      candidates: defaultToolCandidates(),
      tool_candidates: defaultToolCandidates(),
      include_shadow: true,
      return_layered_context: true,
      recall_class_aware: true,
      context_optimization_profile: "balanced",
      context_compaction_profile: "balanced",
      limit: 16,
      max_nodes: 64,
      max_edges: 120,
      context_char_budget: 14000,
      ...args,
    };
  }
  if (toolName.startsWith("aionis_agent_")) {
    return {
      context: { host: "codex", cwd: config.cwd },
      candidates: defaultToolCandidates(),
      include_shadow: true,
      rules_limit: 20,
      repo_root: config.cwd,
      anchor: config.cwd,
      include_payload: true,
      include_meta: true,
      limit: 12,
      ...args,
    };
  }
  if (toolName === "aionis_action_retrieval" || toolName === "aionis_kickoff_recommendation") {
    return {
      context: { host: "codex", cwd: config.cwd },
      candidates: defaultToolCandidates(),
      include_shadow: true,
      ...args,
    };
  }
  return args;
}

async function storeExecutionOutcome(config, args) {
  await ensure(config);
  const identity = commonRuntimeFields(config);
  const requestedRunId = args.run_id;
  const normalizedRunId = requestedRunId ? uuidFromText(`mcp-run:${requestedRunId}`) : undefined;
  const metadata = {
    ...(args.metadata || {}),
    ...(requestedRunId && requestedRunId !== normalizedRunId ? { requested_run_id: requestedRunId } : {}),
  };
  const start = await runtimePost(config, "/v1/memory/replay/run/start", {
    ...identity,
    run_id: normalizedRunId,
    goal: args.goal,
    metadata,
  });
  const runId = start?.run_id || args.run_id;
  const steps = [];
  for (const [index, step] of (args.steps || []).entries()) {
    const stepIndex = step.step_index ?? index + 1;
    const before = await runtimePost(config, "/v1/memory/replay/step/before", {
      ...identity,
      run_id: runId,
      step_id: step.step_id,
      step_index: stepIndex,
      tool_name: step.tool_name,
      tool_input: step.tool_input,
      metadata: step.metadata,
    });
    const stepId = before?.step_id || step.step_id;
    const after = await runtimePost(config, "/v1/memory/replay/step/after", {
      ...identity,
      run_id: runId,
      step_id: stepId,
      step_index: stepIndex,
      status: step.status,
      output_signature: step.output_signature,
      error: step.error,
      metadata: step.metadata,
    });
    steps.push({ step_index: stepIndex, step_id: stepId, before, after });
  }
  const ended = await runtimePost(config, "/v1/memory/replay/run/end", {
    ...identity,
    run_id: runId,
    status: args.status,
    summary: args.summary,
    metadata,
  });
  let playbookCompile = null;
  if (args.compile_playbook === true) {
    playbookCompile = await runtimePost(config, "/v1/memory/replay/playbooks/compile_from_run", {
      ...identity,
      run_id: runId,
      name: args.goal,
      allow_partial: true,
      metadata,
    });
  }
  return {
    summary_version: "aionis_mcp_store_execution_outcome_v1",
    run_id: runId,
    start,
    steps,
    ended,
    playbook_compile: playbookCompile,
  };
}

async function runtimeCall(config, args) {
  await ensure(config);
  const method = args.method || "POST";
  const routePath = args.path;
  if (!routePath || typeof routePath !== "string" || !routePath.startsWith("/")) {
    throw new Error("path must be an absolute Aionis Runtime route, e.g. /v1/memory/context/assemble");
  }
  const withIdentity = args.with_identity !== false;
  const payload = withIdentity && method === "POST"
    ? { ...commonRuntimeFields(config), ...(args.payload || {}) }
    : (args.payload || args.query || {});
  return method === "GET"
    ? runtimeGet(config, routePath, args.query || {})
    : runtimePost(config, routePath, payload);
}

async function recoverHandoffWithFallback(config, args) {
  try {
    return await callRouteTool(config, "aionis_handoff_recover", args);
  } catch (error) {
    if (error.status !== 404 || error.payload?.error !== "handoff_not_found") throw error;
  }

  const identity = commonRuntimeFields(config);
  const kinds = args.handoff_kind
    ? [args.handoff_kind]
    : ["task_handoff", "patch_handoff", "review_handoff"];
  for (const handoffKind of kinds) {
    const findPayload = {
      ...identity,
      type: "event",
      id: args.handoff_id,
      memory_lane: args.memory_lane || identity.memory_lane || "private",
      include_meta: true,
      include_slots: args.include_payload === true,
      include_slots_preview: args.include_payload !== true,
      slots_preview_keys: 50,
      limit: args.limit || 5,
      ...(args.handoff_id
        ? {}
        : {
            slots_contains: {
              summary_kind: "handoff",
              handoff_kind: handoffKind,
              ...(args.anchor ? { anchor: args.anchor } : {}),
              ...(args.repo_root ? { repo_root: args.repo_root } : {}),
              ...(args.file_path ? { file_path: args.file_path } : {}),
              ...(args.symbol ? { symbol: args.symbol } : {}),
            },
          }),
    };
    const found = await runtimePost(config, "/v1/memory/find", findPayload);
    const nodes = Array.isArray(found?.nodes) ? found.nodes : [];
    if (nodes.length > 0) {
      const handoff = nodes[0];
      return {
        summary_version: "aionis_handoff_recover_fallback_v1",
        recovered_via: "memory_find",
        tenant_id: found.tenant_id || config.tenantId,
        scope: found.scope || config.scope,
        handoff,
        find_summary: found.find_summary,
      };
    }
  }

  const error = new Error("Aionis handoff was not found by recover route or memory/find fallback");
  error.status = 404;
  throw error;
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function workflowContract(workflow) {
  return asRecord(workflow?.execution_contract_v1)
    || asRecord(workflow?.slots)?.execution_contract_v1
    || asRecord(asRecord(workflow?.slots)?.execution_contract)
    || null;
}

function workflowMatches(workflow, args) {
  const contract = workflowContract(workflow) || {};
  const targetFiles = new Set(Array.isArray(contract.target_files) ? contract.target_files.filter((v) => typeof v === "string") : []);
  const anchorId = stringValue(workflow.anchor_id) || stringValue(workflow.node_id) || stringValue(workflow.id);
  const workflowSignature = stringValue(workflow.workflow_signature) || stringValue(contract.workflow_signature);
  const taskFamily = stringValue(workflow.task_family) || stringValue(contract.task_family);
  const filePath = stringValue(workflow.file_path) || stringValue(contract.file_path);
  return (
    (!args.anchor_id || anchorId === args.anchor_id)
    && (!args.workflow_signature || workflowSignature === args.workflow_signature)
    && (!args.task_family || taskFamily === args.task_family)
    && (!args.file_path || filePath === args.file_path || targetFiles.has(args.file_path))
  );
}

function authoritySummary(workflow, contract) {
  const authority = asRecord(workflow?.authority_visibility) || asRecord(contract?.authority_visibility) || {};
  return {
    summary_version: "workflow_contract_authority_summary_v1",
    contract_trust: stringValue(workflow?.contract_trust) || stringValue(contract?.contract_trust),
    status: authority.status || "unknown",
    allows_authoritative: typeof authority.allows_authoritative === "boolean" ? authority.allows_authoritative : null,
    allows_stable_promotion: typeof authority.allows_stable_promotion === "boolean" ? authority.allows_stable_promotion : null,
    authority_blocked: typeof authority.authority_blocked === "boolean" ? authority.authority_blocked : null,
    stable_promotion_blocked: typeof authority.stable_promotion_blocked === "boolean" ? authority.stable_promotion_blocked : null,
    primary_blocker: stringValue(authority.primary_blocker),
    outcome_contract_status: asRecord(workflow?.outcome_contract_gate)?.status || "unknown",
    outcome_contract_allows_authoritative: typeof asRecord(workflow?.outcome_contract_gate)?.allows_authoritative === "boolean"
      ? asRecord(workflow?.outcome_contract_gate).allows_authoritative
      : null,
    outcome_contract_reasons: Array.isArray(asRecord(workflow?.outcome_contract_gate)?.reasons)
      ? asRecord(workflow?.outcome_contract_gate).reasons
      : [],
    execution_evidence_status: stringValue(authority.execution_evidence_status),
    execution_evidence_reasons: Array.isArray(authority.execution_evidence_reasons) ? authority.execution_evidence_reasons : [],
    false_confidence_detected: typeof authority.false_confidence_detected === "boolean" ? authority.false_confidence_detected : null,
  };
}

async function retrieveWorkflowContract(config, args) {
  await ensure(config);
  const introspection = await runtimePost(config, "/v1/memory/execution/introspect", {
    ...commonRuntimeFields(config),
    run_id: args.run_id,
    session_id: args.session_id,
    limit: args.limit,
  });
  const recommended = Array.isArray(introspection?.recommended_workflows)
    ? introspection.recommended_workflows.map(asRecord).filter(Boolean)
    : [];
  const candidate = Array.isArray(introspection?.candidate_workflows)
    ? introspection.candidate_workflows.map(asRecord).filter(Boolean)
    : [];
  const selectedRecommended = recommended.find((workflow) => workflowMatches(workflow, args)) || null;
  const selectedCandidate = selectedRecommended ? null : candidate.find((workflow) => workflowMatches(workflow, args)) || null;
  const selectedWorkflow = selectedRecommended || selectedCandidate;
  const contract = workflowContract(selectedWorkflow);
  return {
    summary_version: "retrieve_workflow_contract_v1",
    tenant_id: introspection?.tenant_id || config.tenantId,
    scope: introspection?.scope || config.scope,
    selected_source: selectedRecommended ? "recommended_workflows" : selectedCandidate ? "candidate_workflows" : "none",
    selected_workflow: selectedWorkflow,
    execution_contract_v1: contract,
    contract_trust: stringValue(selectedWorkflow?.contract_trust) || stringValue(contract?.contract_trust),
    outcome_contract_gate: asRecord(selectedWorkflow?.outcome_contract_gate),
    authority_visibility: asRecord(selectedWorkflow?.authority_visibility) || asRecord(contract?.authority_visibility),
    authority_summary: authoritySummary(selectedWorkflow, contract),
    introspection: args.include_introspection === true ? introspection : null,
  };
}

async function callTool(name, args) {
  const config = resolveConfig(args || {});
  if (name === "aionis_workflow_contract") return textResult(await retrieveWorkflowContract(config, args || {}));
  if (name === "aionis_handoff_recover") return textResult(await recoverHandoffWithFallback(config, args || {}));
  if (ROUTE_TOOLS[name]) return textResult(await callRouteTool(config, name, args || {}));
  if (name === "aionis_store_execution_outcome") return textResult(await storeExecutionOutcome(config, args || {}));
  if (name === "aionis_runtime_call") return textResult(await runtimeCall(config, args || {}));
  return textResult(`Unknown tool: ${name}`, true);
}

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id, code, message, data) {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

async function handleMessage(message) {
  if (!message || typeof message !== "object") return null;
  const { id, method, params } = message;
  if (!id && method?.startsWith("notifications/")) return null;

  try {
    if (method === "initialize") {
      return rpcResult(id, {
        protocolVersion: params?.protocolVersion || "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    }
    if (method === "tools/list") {
      return rpcResult(id, { tools: listTools() });
    }
    if (method === "tools/call") {
      const name = params?.name;
      const args = params?.arguments || {};
      return rpcResult(id, await callTool(name, args));
    }
    if (method === "ping") {
      return rpcResult(id, {});
    }
    return rpcError(id, -32601, `Method not found: ${method}`);
  } catch (error) {
    return rpcResult(id, textResult({
      error: String(error.message || error),
      status: error.status,
      payload: error.payload,
    }, true));
  }
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      process.stdout.write(`${JSON.stringify(rpcError(null, -32700, "Parse error", String(error.message || error)))}\n`);
      continue;
    }
    handleMessage(message).then((response) => {
      if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
    });
  }
});

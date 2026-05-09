import { compactJson, truncateText } from "./aionis-codex-runtime.mjs";

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function stringList(value, limit = 8) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => typeof entry === "string" && entry.trim()).slice(0, limit);
}

function readPath(object, path) {
  let cursor = object;
  for (const segment of path) {
    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

function isActionablePatternContext(text) {
  return /\b(task_family|task_signature|workflow_signature|file_path|target_files|acceptance_checks|next_action|policy_memory_id)\b/i.test(text);
}

function isGenericToolOnlyPatternText(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  const text = value.trim();
  const lower = text.toLowerCase();
  const patternLike = lower.includes("candidate pattern") || lower.includes("pattern: prefer ");
  const genericToolSignal =
    lower.includes(" after one successful tool selection")
    || lower.includes(" completed with success")
    || /prefer\s+[a-z0-9_.:-]+/.test(lower);
  return patternLike && genericToolSignal && !isActionablePatternContext(text);
}

function recordHasActionablePatternContext(record) {
  if (!record || typeof record !== "object") return false;
  if (
    record.task_family
    || record.task_signature
    || record.workflow_signature
    || record.file_path
    || record.next_action
    || record.policy_memory_id
  ) {
    return true;
  }
  if (stringList(record.target_files).length > 0 || stringList(record.acceptance_checks).length > 0) return true;
  const contract = asRecord(record.execution_contract_v1) || asRecord(record.execution_contract);
  if (contract) return recordHasActionablePatternContext(contract);
  const anchor = asRecord(record.anchor);
  if (anchor) return recordHasActionablePatternContext(anchor);
  return false;
}

function shouldDropDisplayValue(value) {
  if (isGenericToolOnlyPatternText(value)) return true;
  const record = asRecord(value);
  if (!record) return false;
  const anchor = asRecord(record.anchor);
  const text = [
    record.title,
    record.summary,
    record.text_summary,
    anchor?.title,
    anchor?.summary,
    anchor?.text_summary,
  ].filter((entry) => typeof entry === "string").join(" ");
  const isPatternObject =
    record.anchor_kind === "pattern"
    || record.target_kind === "pattern"
    || anchor?.anchor_kind === "pattern"
    || anchor?.target_kind === "pattern"
    || isGenericToolOnlyPatternText(text);
  return isPatternObject && isGenericToolOnlyPatternText(text) && !recordHasActionablePatternContext(record);
}

function scrubDisplayPayload(value, stats = { suppressedGenericToolPatterns: 0 }) {
  if (shouldDropDisplayValue(value)) {
    stats.suppressedGenericToolPatterns += 1;
    return undefined;
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const entry of value) {
      const scrubbed = scrubDisplayPayload(entry, stats);
      if (scrubbed !== undefined) out.push(scrubbed);
    }
    return out;
  }
  const record = asRecord(value);
  if (!record) return value;
  const out = {};
  for (const [key, entry] of Object.entries(record)) {
    const scrubbed = scrubDisplayPayload(entry, stats);
    if (scrubbed !== undefined) out[key] = scrubbed;
  }
  return out;
}

function addJsonSection(lines, title, value, limit) {
  if (value === undefined || value === null) return;
  const text = compactJson(value, limit);
  if (!text.trim()) return;
  lines.push(`## ${title}`);
  lines.push("```json");
  lines.push(text);
  lines.push("```");
}

function addBullets(lines, title, entries) {
  const present = entries.filter((entry) => typeof entry === "string" && entry.trim());
  if (present.length === 0) return;
  lines.push(`## ${title}`);
  for (const entry of present) lines.push(`- ${entry}`);
}

function summarizePack(pack, kind) {
  const record = asRecord(pack) || {};
  const summary = asRecord(record[`agent_memory_${kind}_pack`]) || asRecord(record.agent_memory_review_pack) || {};
  const out = [];
  const selectedTool = summary.resume_selected_tool || summary.selected_tool;
  const filePath = summary.resume_file_path || summary.recommended_file_path || summary.handoff_file_path;
  const nextAction = summary.resume_next_action || summary.recommended_next_action || summary.handoff_next_action;
  const latestHandoff = summary.latest_handoff_anchor;
  if (latestHandoff) out.push(`latest_handoff_anchor=${latestHandoff}`);
  if (selectedTool) out.push(`selected_tool=${selectedTool}`);
  if (filePath) out.push(`file_path=${filePath}`);
  if (nextAction) out.push(`next_action=${nextAction}`);
  const targetFiles = stringList(summary.resume_target_files || summary.handoff_target_files || summary.handoff_target_files);
  if (targetFiles.length > 0) out.push(`target_files=${targetFiles.join(", ")}`);
  const checks = stringList(summary.acceptance_checks);
  if (checks.length > 0) out.push(`acceptance_checks=${checks.join(" | ")}`);
  const stableAnchor = summary.stable_workflow_anchor_id;
  if (stableAnchor) out.push(`stable_workflow_anchor_id=${stableAnchor}`);
  const trusted = stringList(summary.trusted_pattern_anchor_ids);
  if (trusted.length > 0) out.push(`trusted_pattern_anchor_ids=${trusted.join(", ")}`);
  const suppressed = stringList(summary.suppressed_pattern_anchor_ids);
  if (suppressed.length > 0) out.push(`suppressed_pattern_anchor_ids=${suppressed.join(", ")}`);
  if (summary.policy_governance_apply_payload) out.push("policy_governance_apply_payload=available");
  return out;
}

function summarizeContextAssemble(context) {
  const record = asRecord(context) || {};
  const summary = asRecord(record.assembly_summary) || asRecord(record.planning_summary) || {};
  const planning = asRecord(record.planning_summary) || {};
  const execution = asRecord(record.execution_summary) || {};
  const collaboration = asRecord(execution.collaboration_summary) || {};
  const strategy = asRecord(execution.strategy_summary) || {};
  const tools = asRecord(record.tools) || {};
  const selection = asRecord(tools.selection) || {};
  const kickoff = asRecord(record.kickoff_recommendation) || asRecord(planning.first_step_recommendation) || {};
  const first = [];
  if (kickoff.selected_tool) first.push(`selected_tool=${kickoff.selected_tool}`);
  if (kickoff.file_path) first.push(`file_path=${kickoff.file_path}`);
  if (kickoff.next_action) first.push(`next_action=${kickoff.next_action}`);
  if (summary.planner_explanation) first.push(`planner=${summary.planner_explanation}`);
  if (selection.selected) first.push(`tools_selected=${selection.selected}`);
  if (strategy.task_family) first.push(`task_family=${strategy.task_family}`);
  if (strategy.validation_style) first.push(`validation_style=${strategy.validation_style}`);
  if (collaboration.next_action) first.push(`collaboration_next_action=${collaboration.next_action}`);
  return {
    first,
    plannerPacket: record.planner_packet,
    operatorProjection: record.operator_projection,
    runtimeToolHints: record.runtime_tool_hints,
    layeredContext: record.layered_context,
    costSignals: record.cost_signals,
    recallObservability: readPath(record, ["recall", "observability"]),
  };
}

export function renderAionisHookContext(args) {
  const {
    config,
    sessionId,
    turnId,
    runId,
    prompt,
    runtimeStatus,
    contextAssemble,
    projectAgentResume,
    projectAgentReview,
    globalAgentResume,
    globalRecall,
    errors = [],
  } = args;
  const lines = [];
  lines.push("# Aionis Runtime Context");
  lines.push("Use this context as execution memory and runtime guidance for the current Codex turn.");
  lines.push("It is advisory unless a section explicitly says it is an authoritative contract. Current user instructions still take precedence.");
  lines.push("");
  addBullets(lines, "Runtime Binding", [
    `base_url=${config.baseUrl}`,
    `tenant_id=${config.tenantId}`,
    `project_scope=${config.scope}`,
    `global_scope=${config.globalScope}`,
    `session_id=${sessionId}`,
    `turn_id=${turnId}`,
    `run_id=${runId}`,
    `cwd=${config.cwd}`,
    runtimeStatus?.started ? "runtime_started_by_plugin=true" : "runtime_started_by_plugin=false",
  ]);

  const contextSummary = summarizeContextAssemble(contextAssemble);
  const displayStats = { suppressedGenericToolPatterns: 0 };
  const displayPlannerPacket = scrubDisplayPayload(contextSummary.plannerPacket, displayStats);
  const displayOperatorProjection = scrubDisplayPayload(contextSummary.operatorProjection, displayStats);
  const displayRuntimeToolHints = scrubDisplayPayload(contextSummary.runtimeToolHints, displayStats);
  const displayLayeredContext = scrubDisplayPayload(contextSummary.layeredContext, displayStats);
  addBullets(lines, "Task Start Guidance", contextSummary.first);

  const projectResume = summarizePack(projectAgentResume, "resume");
  addBullets(lines, "Project Continuity Pack", projectResume);

  const projectReview = summarizePack(projectAgentReview, "review");
  addBullets(lines, "Project Governance And Review Pack", projectReview);

  const globalResume = summarizePack(globalAgentResume, "resume");
  addBullets(lines, "Global User Memory Pack", globalResume);

  if (errors.length > 0) {
    addBullets(lines, "Aionis Non-Fatal Errors", errors.map((error) => String(error.message || error)));
  }
  if (displayStats.suppressedGenericToolPatterns > 0) {
    addBullets(lines, "Display Filtering", [
      `suppressed_generic_tool_patterns=${displayStats.suppressedGenericToolPatterns}`,
    ]);
  }

  addJsonSection(lines, "Planner Packet", displayPlannerPacket, 2600);
  addJsonSection(lines, "Operator Projection", displayOperatorProjection, 2400);
  addJsonSection(lines, "Runtime Tool Hints", displayRuntimeToolHints, 1800);
  addJsonSection(lines, "Layered Context", displayLayeredContext, 4600);
  addJsonSection(lines, "Cost Signals", contextSummary.costSignals, 1400);
  addJsonSection(lines, "Recall Observability", contextSummary.recallObservability, 1600);

  if (globalRecall) {
    addJsonSection(lines, "Global Recall", {
      seeds: globalRecall.seeds,
      context: globalRecall.context,
      runtime_tool_hints: globalRecall.runtime_tool_hints,
    }, 2600);
  }

  lines.push("## Operating Instructions");
  lines.push("- Prefer Aionis recommended target files, validation boundaries, replay/handoff continuity, and tool policy hints when they match the user request.");
  lines.push("- If Aionis context conflicts with the visible repository or the newest user message, inspect the code and follow the newest verified evidence.");
  lines.push("- Preserve the run id in reasoning-sensitive summaries when you need to refer to this turn later.");
  lines.push("- Do not say Aionis proved success. Validate success through actual tests, commands, or user-visible behavior.");
  if (prompt) {
    lines.push("");
    lines.push("## Current User Prompt");
    lines.push(truncateText(prompt, 1200));
  }

  return truncateText(lines.join("\n"), config.contextCharLimit);
}

export function renderToolFailureContext(args) {
  const { config, runId, toolName, status, response } = args;
  if (status === "success" && !config.postToolContext) return "";
  const lines = [
    "# Aionis Tool Outcome",
    `run_id=${runId}`,
    `tool=${toolName}`,
    `status=${status}`,
  ];
  if (status !== "success") {
    lines.push("Treat this tool result as execution evidence. Repair from the actual output instead of assuming the previous plan is still correct.");
    lines.push("```json");
    lines.push(compactJson(response, 2200));
    lines.push("```");
  } else {
    lines.push("Aionis recorded this successful tool outcome for replay and future task-start learning.");
  }
  return truncateText(lines.join("\n"), 3200);
}

export function renderSessionStartContext(args) {
  const { config, sessionId, runtimeStatus, resumePack, errors = [] } = args;
  const lines = [
    "# Aionis Runtime Session",
    "Aionis is attached to this Codex session as the execution-memory runtime.",
    `base_url=${config.baseUrl}`,
    `tenant_id=${config.tenantId}`,
    `project_scope=${config.scope}`,
    `session_id=${sessionId}`,
    runtimeStatus?.started ? "runtime_started_by_plugin=true" : "runtime_started_by_plugin=false",
  ];
  const resume = summarizePack(resumePack, "resume");
  if (resume.length > 0) {
    lines.push("## Resume Pack");
    for (const item of resume) lines.push(`- ${item}`);
  }
  if (errors.length > 0) {
    lines.push("## Aionis Non-Fatal Errors");
    for (const error of errors) lines.push(`- ${String(error.message || error)}`);
  }
  return truncateText(lines.join("\n"), Math.min(config.contextCharLimit, 7000));
}

export function hookAdditionalContext(text, hookEventName = "UserPromptSubmit") {
  if (!text || !text.trim()) return { continue: true };
  return {
    hookSpecificOutput: {
      hookEventName,
      additionalContext: text,
    },
  };
}

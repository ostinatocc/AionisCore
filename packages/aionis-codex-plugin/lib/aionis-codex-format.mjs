import { compactJson, truncateText } from "./aionis-codex-runtime.mjs";

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function stringList(value, limit = 8) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => typeof entry === "string" && entry.trim()).slice(0, limit);
}

function compactEntryList(entries, limit = 8, charLimit = 420) {
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    if (typeof entry !== "string") continue;
    const text = truncateText(entry.trim(), charLimit);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function extractDogfoodProgressEntriesFromText(value) {
  if (typeof value !== "string" || !value.includes("Aionis Codex recall dogfood loop")) return [];
  const normalized = value.replace(/\s+/g, " ").trim();
  const entries = [];
  const pattern = /Aionis Codex recall dogfood loop:\s*(\d+)\s+of\s+(\d+)\s+real tasks completed/gi;
  for (const match of normalized.matchAll(pattern)) {
    const completed = Number(match[1]);
    const total = Number(match[2]);
    if (!Number.isFinite(completed) || !Number.isFinite(total)) continue;
    const slice = normalized.slice(match.index ?? 0);
    let end = slice.length;
    for (const marker of ["; anchor=", "; source=", "; selected tool:", "; trusted patterns", "; candidate patterns", "; rehydration", "; supporting knowledge", "```"]) {
      const index = slice.indexOf(marker);
      if (index > 0) end = Math.min(end, index);
    }
    entries.push({
      completed,
      total,
      text: truncateText(slice.slice(0, end).trim(), 420),
    });
  }
  return entries;
}

function dogfoodProgressEntriesFromValue(value, budget = { strings: 0 }) {
  if (budget.strings > 240) return [];
  if (typeof value === "string") {
    budget.strings += 1;
    return extractDogfoodProgressEntriesFromText(value);
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => dogfoodProgressEntriesFromValue(entry, budget));
  }
  const record = asRecord(value);
  if (!record) return [];
  const preferredKeys = [
    "planner_packet",
    "sections",
    "recommended_workflows",
    "candidate_workflows",
    "supporting_knowledge",
    "execution_kernel",
    "execution_summary",
    "planning_summary",
    "assembly_summary",
    "workflow_signal_summary",
    "workflow_signals",
    "stable_workflow_titles",
    "promotion_ready_workflow_titles",
    "observing_workflow_titles",
    "summary",
    "title",
    "workflow_title",
    "name",
    "text_summary",
    "handoff_text",
    "next_action",
  ];
  const out = [];
  for (const key of preferredKeys) {
    if (key in record) out.push(...dogfoodProgressEntriesFromValue(record[key], budget));
  }
  return out;
}

function latestDogfoodProgress(...values) {
  const entries = values.flatMap((value) => dogfoodProgressEntriesFromValue(value));
  if (entries.length === 0) return null;
  return entries
    .slice()
    .sort((a, b) => (b.completed - a.completed) || (b.total - a.total) || b.text.length - a.text.length)[0] ?? null;
}

function staleDogfoodProgressEntriesFromDisplayValue(value, latestDogfoodCompleted) {
  if (!Number.isFinite(latestDogfoodCompleted)) return [];
  const record = asRecord(value);
  const anchor = asRecord(record?.anchor);
  const textEntries = typeof value === "string"
    ? [value]
    : [record?.title, record?.summary, record?.text_summary, anchor?.title, anchor?.summary, anchor?.text_summary];
  return textEntries
    .filter((entry) => typeof entry === "string")
    .flatMap((entry) => extractDogfoodProgressEntriesFromText(entry))
    .filter((entry) => entry.completed < latestDogfoodCompleted);
}

function extractHighSignalText(normalized, limit = 260) {
  const highSignal = [
    /Aionis Codex recall dogfood loop:[^`]+?(?=(?:; anchor=|; source=|; selected tool:|; trusted patterns|; candidate patterns|$))/i,
    /Goal: run 10 real Codex tasks[^;.]*/i,
  ];
  for (const pattern of highSignal) {
    const match = normalized.match(pattern);
    if (match?.[0]) return truncateText(match[0].trim(), limit);
  }
  return "";
}

function compactWorkflowText(value, limit = 260) {
  if (typeof value !== "string") return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const highSignal = extractHighSignalText(normalized, limit);
  if (highSignal) return highSignal;
  const cleaned = normalized.replace(/^(candidate|recommended)\s+workflow:\s*/i, "");
  if (cleaned.length > limit || /```|^\*\*/.test(cleaned)) return "";
  return truncateText(cleaned, limit);
}

function compactPlannerText(value, limit = 420) {
  if (typeof value !== "string") return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const highSignal = extractHighSignalText(normalized, Math.min(limit, 300));
  if (highSignal) {
    const prefix = /^candidate workflows visible/i.test(normalized)
      ? "candidate workflows visible"
      : "planner";
    return `${prefix}: ${highSignal}`;
  }
  if (/^candidate workflows visible/i.test(normalized)) return "candidate workflows visible";
  return truncateText(normalized, limit);
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
  return shouldDropDisplayValueWithOptions(value, {});
}

function shouldDropDisplayValueWithOptions(value, options) {
  const latestDogfoodCompleted = Number.isFinite(options.latestDogfoodCompleted)
    ? options.latestDogfoodCompleted
    : null;
  if (latestDogfoodCompleted !== null && staleDogfoodProgressEntriesFromDisplayValue(value, latestDogfoodCompleted).length > 0) {
    return "stale_dogfood_workflow";
  }
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

function scrubDisplayPayload(value, stats = { suppressedGenericToolPatterns: 0, suppressedStaleDogfoodWorkflows: 0 }, options = {}) {
  const dropReason = shouldDropDisplayValueWithOptions(value, options);
  if (dropReason) {
    if (dropReason === "stale_dogfood_workflow") {
      stats.suppressedStaleDogfoodWorkflows = (stats.suppressedStaleDogfoodWorkflows ?? 0) + 1;
      return undefined;
    }
    stats.suppressedGenericToolPatterns = (stats.suppressedGenericToolPatterns ?? 0) + 1;
    return undefined;
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const entry of value) {
      const scrubbed = scrubDisplayPayload(entry, stats, options);
      if (scrubbed !== undefined) out.push(scrubbed);
    }
    return out;
  }
  const record = asRecord(value);
  if (!record) return value;
  const out = {};
  for (const [key, entry] of Object.entries(record)) {
    const scrubbed = scrubDisplayPayload(entry, stats, options);
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

function formatNonFatalError(error) {
  const detail = error?.aionis_non_fatal || error?.aionis_runtime_error;
  if (!detail || typeof detail !== "object") return String(error?.message || error);
  const label = detail.label || "runtime_call";
  const message = detail.message || String(error?.message || error);
  const parts = [];
  if (detail.category) parts.push(`category=${detail.category}`);
  if (detail.code) parts.push(`code=${detail.code}`);
  if (detail.status) parts.push(`status=${detail.status}`);
  if (detail.method) parts.push(`method=${detail.method}`);
  if (detail.route_path) parts.push(`route=${detail.route_path}`);
  if (typeof detail.duration_ms === "number") parts.push(`duration_ms=${detail.duration_ms}`);
  if (typeof detail.timeout_ms === "number") parts.push(`timeout_ms=${detail.timeout_ms}`);
  return parts.length > 0 ? `${label}: ${message} (${parts.join("; ")})` : `${label}: ${message}`;
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
  if (summary.planner_explanation) first.push(`planner=${compactPlannerText(summary.planner_explanation)}`);
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

function workflowTitleEntriesFromSummary(summary, sourceLabel) {
  const record = asRecord(summary);
  if (!record) return [];
  const out = [];
  const titleSets = [
    ["stable_workflow", record.stable_workflow_titles],
    ["promotion_ready_workflow", record.promotion_ready_workflow_titles],
    ["observing_workflow", record.observing_workflow_titles],
  ];
  for (const [label, titles] of titleSets) {
    for (const title of stringList(titles, 4)) {
      const compactTitle = compactWorkflowText(title);
      if (compactTitle) out.push(`${label}=${sourceLabel ? `${sourceLabel}: ` : ""}${compactTitle}`);
    }
  }
  return out;
}

function workflowEntryFromCandidate(candidate, label) {
  if (typeof candidate === "string" && candidate.trim()) {
    const compactTitle = compactWorkflowText(candidate);
    return compactTitle ? `${label}=${compactTitle}` : "";
  }
  const record = asRecord(candidate);
  if (!record) return "";
  const title = record.title || record.workflow_title || record.name || record.summary || record.text_summary;
  if (!title || typeof title !== "string") return "";
  const compactTitle = compactWorkflowText(title);
  if (!compactTitle) return "";
  const nextAction = typeof record.next_action === "string" && record.next_action.trim()
    ? `; next_action=${record.next_action.trim()}`
    : "";
  return `${label}=${compactTitle}${nextAction}`;
}

function summarizeWorkflowFacts(context) {
  const record = asRecord(context) || {};
  const entries = [];
  const summaries = [
    [readPath(record, ["execution_kernel", "workflow_signal_summary"]), "execution_kernel"],
    [readPath(record, ["execution_summary", "workflow_signal_summary"]), "execution_summary"],
    [readPath(record, ["planning_summary", "workflow_signal_summary"]), "planning_summary"],
    [readPath(record, ["assembly_summary", "workflow_signal_summary"]), "assembly_summary"],
    [record.workflow_signal_summary, "top_level"],
  ];
  for (const [summary, label] of summaries) entries.push(...workflowTitleEntriesFromSummary(summary, label));

  const plannerSections = asRecord(readPath(record, ["planner_packet", "sections"])) || {};
  const candidateSources = [
    ["recommended_workflow", plannerSections.recommended_workflows],
    ["candidate_workflow", plannerSections.candidate_workflows],
    ["workflow_signal", record.workflow_signals],
  ];
  for (const [label, values] of candidateSources) {
    if (!Array.isArray(values)) continue;
    for (const value of values.slice(0, 4)) entries.push(workflowEntryFromCandidate(value, label));
  }
  return compactEntryList(entries, 6, 520);
}

export function renderAionisHookContext(args) {
  const {
    config,
    sessionId,
    turnId,
    runId,
    prompt,
    runtimeStatus,
    planningContext,
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

  const fastContextSummary = summarizeContextAssemble(planningContext);
  const contextSummary = summarizeContextAssemble(contextAssemble);
  const latestDogfood = latestDogfoodProgress(
    planningContext,
    contextAssemble,
    projectAgentResume,
    projectAgentReview,
    globalAgentResume,
    globalRecall,
  );
  const displayStats = { suppressedGenericToolPatterns: 0, suppressedStaleDogfoodWorkflows: 0 };
  const displayOptions = { latestDogfoodCompleted: latestDogfood?.completed };
  const displayFastPlannerPacket = contextSummary.plannerPacket
    ? undefined
    : scrubDisplayPayload(fastContextSummary.plannerPacket, displayStats, displayOptions);
  const displayPlannerPacket = scrubDisplayPayload(contextSummary.plannerPacket, displayStats, displayOptions);
  const displayOperatorProjection = scrubDisplayPayload(contextSummary.operatorProjection, displayStats, displayOptions);
  const displayRuntimeToolHints = scrubDisplayPayload(contextSummary.runtimeToolHints, displayStats, displayOptions);
  const displayLayeredContext = scrubDisplayPayload(contextSummary.layeredContext, displayStats, displayOptions);
  const fastFacts = [
    latestDogfood ? `dogfood_progress=${latestDogfood.text}` : "",
    ...fastContextSummary.first,
    ...summarizeWorkflowFacts(planningContext),
  ].filter((entry) => {
    if (staleDogfoodProgressEntriesFromDisplayValue(entry, displayOptions.latestDogfoodCompleted).length === 0) return true;
    displayStats.suppressedStaleDogfoodWorkflows += 1;
    return false;
  });
  addBullets(lines, "Fast Task Facts", compactEntryList(fastFacts, 10, 560));
  addBullets(lines, "Task Start Guidance", contextSummary.first);

  const projectResume = summarizePack(projectAgentResume, "resume");
  addBullets(lines, "Project Continuity Pack", projectResume);

  const projectReview = summarizePack(projectAgentReview, "review");
  addBullets(lines, "Project Governance And Review Pack", projectReview);

  const globalResume = summarizePack(globalAgentResume, "resume");
  addBullets(lines, "Global User Memory Pack", globalResume);

  if (errors.length > 0) {
    addBullets(lines, "Aionis Non-Fatal Errors", errors.map(formatNonFatalError));
  }
  addBullets(lines, "Display Filtering", [
    displayStats.suppressedGenericToolPatterns > 0
      ? `suppressed_generic_tool_patterns=${displayStats.suppressedGenericToolPatterns}`
      : "",
    displayStats.suppressedStaleDogfoodWorkflows > 0
      ? `suppressed_stale_dogfood_workflows=${displayStats.suppressedStaleDogfoodWorkflows}`
      : "",
  ]);

  addJsonSection(lines, "Fast Planner Packet", displayFastPlannerPacket, 1800);
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
    for (const error of errors) lines.push(`- ${formatNonFatalError(error)}`);
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

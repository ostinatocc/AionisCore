import { compactJson, truncateText } from "./aionis-codex-runtime.mjs";

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function stringList(value, limit = 8) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => typeof entry === "string" && entry.trim()).slice(0, limit);
}

function truncateInlineText(value, limit = 4000) {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : String(value ?? "");
  if (!text) return "";
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 32)).trim()} ... [truncated ${text.length - limit} chars]`;
}

function compactEntryList(entries, limit = 8, charLimit = 420) {
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    if (typeof entry !== "string") continue;
    const text = truncateInlineText(entry.trim(), charLimit);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function isWorkflowDisplayPath(path) {
  const key = path.at(-1);
  return [
    "recommended_workflows",
    "candidate_workflows",
    "workflow_signals",
    "stable_workflow_titles",
    "promotion_ready_workflow_titles",
    "observing_workflow_titles",
  ].includes(key);
}

function isSupportingKnowledgePath(path) {
  return path.at(-1) === "supporting_knowledge" || path.includes("supporting_knowledge");
}

function isLayerItemPath(path) {
  return path.at(-1) === "items" && path.includes("layers");
}

function isLowSignalDisplayPath(path) {
  const key = path.at(-1);
  return key === "merged_text" || key === "context_pack_preview" || path.includes("citations");
}

function normalizeDisplayText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function stripDisplayPrefix(value) {
  return normalizeDisplayText(value)
    .replace(/^supporting knowledge:\s*/i, "")
    .replace(/^candidate workflow:\s*/i, "")
    .replace(/^recommended workflow:\s*/i, "");
}

function isLowSignalDisplayText(value) {
  const text = stripDisplayPrefix(value);
  if (!text) return true;
  if (/^ok\b/i.test(text) || /^ok[，,\s]/i.test(text)) return true;
  if (/^(开始|继续)?继续推进吧[。.!！]*$/i.test(text)) return true;
  if (/^Codex session [A-Za-z0-9:-]+ in AionisRuntime(?:\s*\(.+\))?$/i.test(text)) return true;
  if (/^manual-verify-[\w-]+ in AionisRuntime(?:\s*\(.+\))?$/i.test(text)) return true;
  if (/^dogfood-live-task\d+ in AionisRuntime(?:\s*\(.+\))?$/i.test(text)) return true;
  if (/^selected tool:\s*[\w.:-]+$/i.test(text)) return true;
  if (/^decision selected_tool:\s*[\w.:-]+$/i.test(text)) return true;
  if (/^tool ranking:\s*/i.test(text)) return true;
  if (/^decision_id:\s*/i.test(text)) return true;
  return false;
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
      text: truncateInlineText(slice.slice(0, end).trim(), 420),
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
    "handoff",
    "execution_ready_handoff",
    "nodes",
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
    if (match?.[0]) return truncateInlineText(match[0].trim(), limit);
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
  const actionable = isActionablePatternContext(cleaned);
  const plainShortTitle =
    cleaned.length <= 140
    && !/[。；;]|```|\*\*/.test(cleaned)
    && cleaned.split(/\s+/).length <= 14;
  if (!actionable && !plainShortTitle) return "";
  if (cleaned.length > limit || /```|^\*\*/.test(cleaned)) return "";
  return truncateInlineText(cleaned, limit);
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
  const lowSignalPlanner =
    /^selected tool:\s*[\w.:-]+/i.test(normalized)
    && !/\b(file_path|target_files|acceptance_checks|next_action|Goal:|Aionis Codex recall dogfood loop)\b/i.test(normalized);
  if (lowSignalPlanner) return "";
  return truncateInlineText(normalized, limit);
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

function shouldDropDisplayValueWithOptions(value, options, path = []) {
  const latestDogfoodCompleted = Number.isFinite(options.latestDogfoodCompleted)
    ? options.latestDogfoodCompleted
    : null;
  if (isLowSignalDisplayPath(path)) return "low_signal_context";
  if (latestDogfoodCompleted !== null && staleDogfoodProgressEntriesFromDisplayValue(value, latestDogfoodCompleted).length > 0) {
    return "stale_dogfood_workflow";
  }
  if (typeof value === "string" && (isSupportingKnowledgePath(path) || isLayerItemPath(path)) && isLowSignalDisplayText(value)) {
    return "low_signal_context";
  }
  if (isGenericToolOnlyPatternText(value)) return true;
  const record = asRecord(value);
  if (!record) return false;
  if (isWorkflowDisplayPath(path) && !recordHasActionablePatternContext(record)) {
    const summary = workflowEntryFromCandidate(record, path.at(-1) || "workflow");
    if (!summary) return "low_signal_context";
  }
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

function scrubDisplayString(value, path, stats) {
  if (isWorkflowDisplayPath(path)) {
    const compact = compactWorkflowText(value);
    if (!compact) {
      stats.suppressedLowSignalContext = (stats.suppressedLowSignalContext ?? 0) + 1;
      return undefined;
    }
    stats.compactedDisplayEntries = (stats.compactedDisplayEntries ?? 0) + (compact === normalizeDisplayText(value) ? 0 : 1);
    return compact;
  }
  if (isSupportingKnowledgePath(path) || isLayerItemPath(path)) {
    const stripped = stripDisplayPrefix(value);
    const compact = truncateInlineText(stripped, 260);
    stats.compactedDisplayEntries = (stats.compactedDisplayEntries ?? 0) + (compact === normalizeDisplayText(value) ? 0 : 1);
    return compact;
  }
  return value;
}

function scrubDisplayArray(value, stats, options, path) {
  const out = [];
  const seen = new Set();
  for (const entry of value) {
    const scrubbed = scrubDisplayPayload(entry, stats, options, path);
    if (scrubbed === undefined) continue;
    const key = typeof scrubbed === "string" ? scrubbed : JSON.stringify(scrubbed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(scrubbed);
  }
  return out;
}

function scrubDisplayPayload(value, stats = {
  suppressedGenericToolPatterns: 0,
  suppressedStaleDogfoodWorkflows: 0,
  suppressedLowSignalContext: 0,
  compactedDisplayEntries: 0,
}, options = {}, path = []) {
  const dropReason = shouldDropDisplayValueWithOptions(value, options, path);
  if (dropReason) {
    if (dropReason === "stale_dogfood_workflow") {
      stats.suppressedStaleDogfoodWorkflows = (stats.suppressedStaleDogfoodWorkflows ?? 0) + 1;
      return undefined;
    }
    if (dropReason === "low_signal_context") {
      stats.suppressedLowSignalContext = (stats.suppressedLowSignalContext ?? 0) + 1;
      return undefined;
    }
    stats.suppressedGenericToolPatterns = (stats.suppressedGenericToolPatterns ?? 0) + 1;
    return undefined;
  }
  if (Array.isArray(value)) {
    return scrubDisplayArray(value, stats, options, path);
  }
  const record = asRecord(value);
  if (typeof value === "string") return scrubDisplayString(value, path, stats);
  if (!record) return value;
  if (isWorkflowDisplayPath(path)) {
    const summary = workflowEntryFromCandidate(record, path.at(-1) || "workflow");
    if (summary) {
      stats.compactedDisplayEntries = (stats.compactedDisplayEntries ?? 0) + 1;
      return summary;
    }
  }
  const out = {};
  for (const [key, entry] of Object.entries(record)) {
    const scrubbed = scrubDisplayPayload(entry, stats, options, [...path, key]);
    if (scrubbed !== undefined) out[key] = scrubbed;
  }
  if (path.at(-2) === "layers") {
    const items = Array.isArray(out.items) ? out.items : [];
    const signals = Array.isArray(out.workflow_signals) ? out.workflow_signals : [];
    if (items.length === 0 && signals.length === 0) return undefined;
  }
  return out;
}

function filterDisplayEntries(entries, stats, options) {
  const out = [];
  for (const entry of entries) {
    const scrubbed = scrubDisplayPayload(entry, stats, options);
    if (typeof scrubbed === "string" && scrubbed.trim()) out.push(scrubbed);
  }
  return compactEntryList(out, entries.length, 560);
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

function plannerPacketHasDisplayContent(packet) {
  const record = asRecord(packet);
  const sections = asRecord(record?.sections);
  if (!sections) return false;
  return Object.values(sections).some((value) => Array.isArray(value) ? value.length > 0 : !!value);
}

function layeredContextHasDisplayContent(layeredContext) {
  const layers = asRecord(asRecord(layeredContext)?.layers);
  if (!layers) return false;
  return Object.values(layers).some((layer) => {
    const record = asRecord(layer);
    if (!record) return false;
    const items = Array.isArray(record.items) ? record.items : [];
    const signals = Array.isArray(record.workflow_signals) ? record.workflow_signals : [];
    return items.length > 0 || signals.length > 0;
  });
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
  if (selectedTool && out.length > 0) out.push(`selected_tool=${selectedTool}`);
  return out;
}

function directHandoffRecords(result) {
  const record = asRecord(result) || {};
  const nodes = Array.isArray(record.nodes) ? record.nodes.map(asRecord).filter(Boolean) : [];
  const direct = asRecord(record.handoff) || asRecord(record.execution_ready_handoff);
  return direct ? [direct, ...nodes] : nodes;
}

function handoffSummary(record) {
  return typeof record.summary === "string"
    ? record.summary
    : typeof record.text_summary === "string"
      ? record.text_summary
      : "";
}

function executionResultSummaryFromRecord(record) {
  const direct = asRecord(record?.execution_result_summary) || asRecord(record?.executionResultSummary);
  if (direct) return direct;
  const slots = asRecord(record?.slots);
  return asRecord(slots?.execution_result_summary) || asRecord(slots?.executionResultSummary);
}

function sanitizeInlineMarkdown(value) {
  return normalizeDisplayText(value)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(?:^|\s)[-*]\s+/g, "; ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values, limit = 4) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    if (typeof value !== "string" || !value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}

function extractRuntimeReleaseVersion(text) {
  const patterns = [
    /@ostinato\/aionis-runtime@(\d+\.\d+\.\d+(?:[-+][a-z0-9_.-]+)?)/i,
    /\bnpm\s+view\s+@ostinato\/aionis-runtime\s+version[^\d]*(\d+\.\d+\.\d+(?:[-+][a-z0-9_.-]+)?)/i,
    /\bnpm\s+latest[^\d]*(\d+\.\d+\.\d+(?:[-+][a-z0-9_.-]+)?)/i,
    /\blatest[^\d]*(\d+\.\d+\.\d+(?:[-+][a-z0-9_.-]+)?)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}

function releaseEvidenceFromHandoff(text) {
  const version = extractRuntimeReleaseVersion(text);
  if (!version) return [];
  const evidence = [];
  const hasNpmLatestSignal =
    /\bnpm\s+(?:view|latest|publish)\b/i.test(text)
    || /\bdist-tags?\b/i.test(text)
    || /\bpublished|released\b/i.test(text)
    || /\u53d1\u5e03|\u53d1\u5305|\u53d1\u5b8c/i.test(text);
  if (hasNpmLatestSignal) evidence.push(`npm_latest=${version}`);
  const hasCleanNpxSignal =
    /\bnpx\b/i.test(text)
    && (
      /\bclean\b|\b--yes\b|\bnew user\b/i.test(text)
      || /\u9694\u79bb|\u65b0\u7528\u6237|\u5e72\u51c0/i.test(text)
    );
  if (hasCleanNpxSignal) evidence.push(`clean_npx=${version}`);
  const hasCleanInstallSignal =
    /\bclean\s+(?:npm\s+)?install\b/i.test(text)
    || /\bcodex\s+status\s+--json\b/i.test(text)
    || /\u9694\u79bb\s*HOME|\u65b0\u7528\u6237\u5b89\u88c5|\u5b89\u88c5\u9a8c\u8bc1/i.test(text);
  if (hasCleanInstallSignal && /\bok\s*[:=]\s*true\b|\bPASS\b|\u8fd4\u56de\s*ok\s*[:=]\s*true|\u901a\u8fc7|\u6b63\u5e38/i.test(text)) {
    evidence.push("clean_install=pass");
  }
  return evidence;
}

function isUnpublishedReleaseStatusText(text) {
  return [
    /\bnpm\s+latest\b[^\n。.;]*(?:still|remains|is still)\b/i,
    /\bnpm\s+latest\b[^\n。.;]*(?:\u4ecd\u662f|\u8fd8\u662f|\u4ecd\u7136\u662f)/i,
    /\bnot\s+(?:yet\s+)?(?:published|released)\b/i,
    /\b(?:unpublished|not-published|candidate)\b/i,
    /\u6ca1\u6709\u8bef\u53d1\u5305|\u672a\u53d1(?:\u5305|\u5e03)|\u8fd8\u6ca1\u53d1|\u5c1a\u672a\u53d1|\u5019\u9009/i,
  ].some((pattern) => pattern.test(text));
}

function hasReleaseCompletionSignal(text) {
  return [
    /\u53d1\u5e03\u95ed\u73af.*(\u5b8c\u6210|\u6210\u7acb|\u901a\u8fc7)/,
    /(?:^|[\s\u3002.!！,，:：])(?:\u5df2)?\u786e\u8ba4[^\n\u3002.!！]{0,16}(\u53d1\u5e03|\u53d1\u5305)[^\n\u3002.!！]{0,10}(\u5b8c\u6210|\u6210\u529f)/,
    /(?:^|[\s\u3002.!！])(\u53d1\u5e03|\u53d1\u5305)(\u5df2\u7ecf)?(\u5b8c\u6210|\u6210\u529f)(?:[\s\u3002.!！]|$)/,
    /\u5df2\u7ecf\u6210\u529f\u53d1\u5230\s*npm/i,
    /\u53d1\u5b8c\u4e86|\u5df2\u7ecf\u662f\s*\d+\.\d+\.\d+/,
    /\b(?:publish|release)\s+(?:completed|succeeded|verified|closed)\b/i,
    /\bpublished\s+(?:to\s+)?npm\b/i,
  ].some((pattern) => pattern.test(text));
}

function hasConcreteTaskOutcomeSignal(text) {
  return [
    /\b(implemented|fixed|updated|changed|added|removed|verified|tested|passed|committed|installed|validated|created|refactored)\b/i,
    /(?:\u5df2|\u5df2\u7ecf)[^\n\u3002\uff1b;]{0,40}(\u5b9e\u73b0|\u4fee\u590d|\u66f4\u65b0|\u63d0\u4ea4|\u9a8c\u8bc1|\u5b89\u88c5|\u5b8c\u6210|\u8dd1\u8fc7|\u901a\u8fc7)/,
    /\b[0-9a-f]{7,12}\b/,
    /\b\d+\s+pass\b/i,
    /\bpack(?::|-|\s+)dry-run\b/i,
  ].some((pattern) => pattern.test(text));
}

function isStatusOrDiscussionLead(text) {
  return [
    /^\u6574\u4f53\u73b0\u5728/,
    /^\u73b0\u5728\u6574\u4f53/,
    /^\u73b0\u5728\u72b6\u6001/,
    /^\u53d1\u5e03\u88ab\s*npm\s*\u62e6\u4f4f/,
    /^\u4f60\u8fd9\u4e2a\u8d28\u7591/,
    /^\u6211\u4e0d\u662f\u628a/,
    /^\u8fd9\u91cc\u8981\u5206\u6e05/,
    /^\u672c\u8d28\u4e0a/,
    /^\u6211\u7684\u771f\u5b9e\u7ed3\u8bba/,
    /Aionis\s+\u4e0d\u662f.*\u800c\u662f/i,
    /^Current status\b/i,
    /^Overall\b/i,
    /^The key point\b/i,
    /^\u4f1a\u3002\u4e00\u5b9a\u4f1a/,
    /^\s*(?:npm\s+)?(?:error\s+code\s+)?EOTP\b/i,
    /^\s*(?:one-time password|\u4e00\u6b21\u6027\u9a8c\u8bc1\u7801)/i,
  ].some((pattern) => pattern.test(text));
}

function isPlanningAdviceLead(text) {
  return [
    /^\u63a5\u4e0b\u6765/,
    /^\u4e0b\u4e00\u6b65/,
    /^\u6211\u7684\u5efa\u8bae/,
    /\u4e0d\u8981\u518d\u5f00\u65b0\u5751/,
    /\u4e0d\u8981\u518d\u76f2\u76ee\u52a0\u529f\u80fd/,
    /\u6700\u8be5\u505a/,
    /\u6700\u5e94\u8be5\u63a8\u8fdb/,
    /\u6211\u5efa\u8bae.*\u987a\u5e8f/,
    /^\s*(next steps|recommendation|i recommend)\b/i,
  ].some((pattern) => pattern.test(text));
}

function isLowSignalTaskHandoffText(text) {
  if (!text) return true;
  if (hasReleaseCompletionSignal(text)) return false;
  if (isStatusOrDiscussionLead(text)) return true;
  if (isPlanningAdviceLead(text) && !hasConcreteTaskOutcomeSignal(text)) return true;
  if (hasConcreteTaskOutcomeSignal(text)) return false;
  return false;
}

function versionRank(value) {
  const match = String(value || "").match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return 0;
  return Number(match[1]) * 1000000 + Number(match[2]) * 1000 + Number(match[3]);
}

function releaseOutcomeVersionFromRecord(record) {
  const result = executionResultSummaryFromRecord(record);
  const resultVersion = typeof result?.version === "string" ? result.version : "";
  if (resultVersion) return resultVersion;
  const summary = handoffSummary(record);
  return extractRuntimeReleaseVersion(sanitizeInlineMarkdown(summary));
}

function isReleaseOutcomeRecord(record) {
  const summary = handoffSummary(record);
  const text = sanitizeInlineMarkdown(summary);
  if (isUnpublishedReleaseStatusText(text)) return false;
  const tags = Array.isArray(record?.tags) ? record.tags : [];
  const result = executionResultSummaryFromRecord(record);
  const quality = asRecord(result?.handoff_quality);
  if (quality?.category && quality.category !== "release_outcome") return false;
  const structuredReleaseOutcome = tags.includes("release_outcome") || result?.release_outcome === true || quality?.category === "release_outcome";
  if (structuredReleaseOutcome) {
    if (hasReleaseCompletionSignal(text)) return true;
    return !!releaseOutcomeVersionFromRecord(record) && !isStatusOrDiscussionLead(text);
  }
  if (!hasReleaseCompletionSignal(text)) return false;
  return releaseEvidenceFromHandoff(text).length > 0 && /\bnpm\s+(?:publish|view|latest)\b|\bnpx\b|\bclean\s+(?:npm\s+)?install\b|\u53d1\u5e03|\u53d1\u5305/i.test(text);
}

function latestReleaseOutcomeRecord(records) {
  return records
    .filter((record) => isReleaseOutcomeRecord(record))
    .sort((a, b) => {
      const versionDelta = versionRank(releaseOutcomeVersionFromRecord(b)) - versionRank(releaseOutcomeVersionFromRecord(a));
      if (versionDelta !== 0) return versionDelta;
      return directHandoffScore(b, 0) - directHandoffScore(a, 0);
    })[0] ?? null;
}

function compactHandoffIntro(text) {
  const intro = text.split(
    /(?:\u6539\u52a8|\u9a8c\u8bc1\u7ed3\u679c|\u9a8c\u8bc1\u8fc7|\u6d4b\u8bd5\u8865\u5728|\u5f53\u524d\u672a\u63d0\u4ea4|\u5f53\u524d\u72b6\u6001|Changed files|Verification|Validated|Tests?:)/i
  )[0]?.trim() || text;
  const withoutCommitBullets = intro
    .replace(/[：:]\s*;?\s*\b[0-9a-f]{7,40}\b.*$/i, "")
    .replace(/[：:]\s*;?\s*$/, "")
    .trim();
  return truncateInlineText(withoutCommitBullets || intro, 180);
}

function compactHandoffSummary(value, limit = 360) {
  const text = sanitizeInlineMarkdown(value);
  if (!text) return "";
  const intro = compactHandoffIntro(text);
  const evidence = [];
  evidence.push(...releaseEvidenceFromHandoff(text));
  const commitRefs = uniqueStrings([...text.matchAll(/\b[0-9a-f]{7,12}\b/g)].map((match) => match[0]), 3);
  if (commitRefs.length > 0) evidence.push(`commits=${commitRefs.join(",")}`);
  const passCounts = [...text.matchAll(/\b\d+\s+pass\b/gi)].map((match) => match[0].replace(/\s+/g, " "));
  if (passCounts.length > 0) evidence.push(`tests=${[...new Set(passCounts)].slice(0, 2).join(", ")}`);
  if (/\bpack(?::|-|\s+)dry-run\b/i.test(text)) evidence.push("pack_dry_run=pass");
  if (/\b(codex install|codex status|watchdog|runtime health)\b/i.test(text) && /\bPASS\b|\u901a\u8fc7|\u6b63\u5e38/i.test(text)) {
    evidence.push("codex_status=pass");
  }
  const compact = [
    intro || text,
    evidence.length > 0 ? `evidence: ${evidence.join("; ")}` : "",
  ].filter(Boolean).join("; ");
  return truncateInlineText(compact, limit);
}

function directHandoffScore(record, index) {
  const summary = handoffSummary(record);
  const progress = extractDogfoodProgressEntriesFromText(summary)
    .sort((a, b) => (b.completed - a.completed) || (b.total - a.total))[0];
  const title = typeof record.title === "string" ? record.title : "";
  const explicitTitle = title && !title.startsWith("Handoff ");
  const dogfoodFollowup = /Aionis Codex|dogfood|@ostinato\/aionis-runtime|Codex plugin/i.test(`${title} ${summary}`);
  const summarySignal = summary.length >= 80 ? 50 : 0;
  const progressSignal = progress ? Math.min(progress.completed, progress.total) * 5 : 0;
  return (1000 - index * 100)
    + (explicitTitle ? 200 : 0)
    + (dogfoodFollowup ? 80 : 0)
    + summarySignal
    + progressSignal;
}

function summarizeDirectHandoff(result, releaseResult = null) {
  const records = directHandoffRecords(result);
  const taskRecords = records.filter((record) => {
    if (isReleaseOutcomeRecord(record)) return false;
    return !isLowSignalTaskHandoffText(sanitizeInlineMarkdown(handoffSummary(record)));
  });
  const ranked = taskRecords
    .map((record, index) => ({ record, score: directHandoffScore(record, index) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.record);
  const handoff = ranked[0] ?? null;
  const out = [];
  const summary = handoff ? handoffSummary(handoff) : "";
  const nextAction = handoff && typeof handoff.next_action === "string"
    ? handoff.next_action
    : handoff && typeof handoff.nextAction === "string"
      ? handoff.nextAction
      : "";
  const targetFiles = handoff ? stringList(handoff.target_files || handoff.targetFiles, 5) : [];
  const checks = handoff ? stringList(handoff.acceptance_checks || handoff.acceptanceChecks, 4) : [];
  if (summary) out.push(`latest_task_handoff=${compactHandoffSummary(summary)}`);
  const releaseRecord = latestReleaseOutcomeRecord([...records, ...directHandoffRecords(releaseResult)]);
  const releaseSummary = releaseRecord ? handoffSummary(releaseRecord) : "";
  if (releaseSummary) out.push(`latest_release_outcome=${compactHandoffSummary(releaseSummary)}`);
  if (nextAction) out.push(`next_action=${truncateInlineText(nextAction, 360)}`);
  if (targetFiles.length > 0) out.push(`target_files=${targetFiles.join(", ")}`);
  if (checks.length > 0) out.push(`acceptance_checks=${checks.join(" | ")}`);
  if (handoff && typeof handoff.uri === "string") out.push(`handoff_uri=${handoff.uri}`);
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
  if (kickoff.file_path) first.push(`file_path=${kickoff.file_path}`);
  if (kickoff.next_action) first.push(`next_action=${kickoff.next_action}`);
  if (kickoff.selected_tool && (kickoff.file_path || kickoff.next_action)) first.push(`selected_tool=${kickoff.selected_tool}`);
  if (summary.planner_explanation) {
    const plannerText = compactPlannerText(summary.planner_explanation);
    if (plannerText) first.push(`planner=${plannerText}`);
  }
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
    ? `; next_action=${truncateInlineText(record.next_action, 220)}`
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
    projectHandoffFast,
    projectReleaseOutcomeFast,
    localContextSnapshot,
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
    projectHandoffFast,
    projectAgentResume,
    projectAgentReview,
    globalAgentResume,
    globalRecall,
  );
  const displayStats = { suppressedGenericToolPatterns: 0, suppressedStaleDogfoodWorkflows: 0 };
  const displayOptions = { latestDogfoodCompleted: latestDogfood?.completed };
  const scrubbedFastPlannerPacket = contextSummary.plannerPacket
    ? undefined
    : scrubDisplayPayload(fastContextSummary.plannerPacket, displayStats, displayOptions);
  const scrubbedPlannerPacket = scrubDisplayPayload(contextSummary.plannerPacket, displayStats, displayOptions);
  const displayOperatorProjection = scrubDisplayPayload(contextSummary.operatorProjection, displayStats, displayOptions);
  const displayRuntimeToolHints = scrubDisplayPayload(contextSummary.runtimeToolHints, displayStats, displayOptions);
  const scrubbedLayeredContext = scrubDisplayPayload(contextSummary.layeredContext, displayStats, displayOptions);
  const displayFastPlannerPacket = plannerPacketHasDisplayContent(scrubbedFastPlannerPacket) ? scrubbedFastPlannerPacket : undefined;
  const displayPlannerPacket = plannerPacketHasDisplayContent(scrubbedPlannerPacket) ? scrubbedPlannerPacket : undefined;
  const displayLayeredContext = layeredContextHasDisplayContent(scrubbedLayeredContext) ? scrubbedLayeredContext : undefined;
  const projectHandoffSummary = summarizeDirectHandoff(projectHandoffFast, projectReleaseOutcomeFast);
  addBullets(lines, "Local Context Snapshot", [
    localContextSnapshot?.used_task_handoff
      ? `used_task_handoff_snapshot=true updated_at=${localContextSnapshot.updated_at || "unknown"}`
      : "",
    localContextSnapshot?.used_release_outcome
      ? `used_release_outcome_snapshot=true updated_at=${localContextSnapshot.updated_at || "unknown"}`
      : "",
  ]);
  const fastFacts = [
    latestDogfood ? `dogfood_progress=${latestDogfood.text}` : "",
    ...projectHandoffSummary.filter((entry) => entry.startsWith("latest_task_handoff=")).slice(0, 1),
    ...projectHandoffSummary.filter((entry) => entry.startsWith("latest_release_outcome=")).slice(0, 1),
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
  addBullets(lines, "Project Direct Handoff", projectHandoffSummary.filter((entry) =>
    !entry.startsWith("latest_task_handoff=") && !entry.startsWith("latest_release_outcome=")
  ));
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
    displayStats.suppressedLowSignalContext > 0
      ? `suppressed_low_signal_context=${displayStats.suppressedLowSignalContext}`
      : "",
    displayStats.compactedDisplayEntries > 0
      ? `compacted_display_entries=${displayStats.compactedDisplayEntries}`
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

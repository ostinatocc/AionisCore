#!/usr/bin/env node
import {
  buildTurnRunId,
  commonRuntimeFields,
  compactJson,
  defaultToolCandidates,
  ensureRuntime,
  extractHookEventName,
  extractPrompt,
  extractToolInput,
  extractToolName,
  extractToolResponse,
  getSessionId,
  getTurnId,
  inferToolStatus,
  loadProjectContextSnapshot,
  loadState,
  nowIso,
  readHookInput,
  recordActiveProject,
  resolveConfig,
  runtimePost,
  runtimeUnavailableContext,
  saveProjectContextSnapshot,
  saveState,
  uuidFromText,
} from "../lib/aionis-codex-runtime.mjs";
import {
  hookAdditionalContext,
  renderAionisHookContext,
  renderSessionStartContext,
  renderToolFailureContext,
} from "../lib/aionis-codex-format.mjs";

function stdoutJson(value) {
  process.stdout.write(`${JSON.stringify(value || {})}\n`);
}

function stderrDebug(config, message, data) {
  if (!config.verbose) return;
  const suffix = data === undefined ? "" : ` ${compactJson(data, 1200)}`;
  process.stderr.write(`[aionis-codex] ${message}${suffix}\n`);
}

function inferHookEvent(input) {
  const explicit = extractHookEventName(input);
  if (explicit) return explicit;
  if (extractPrompt(input)) return "UserPromptSubmit";
  if (input.tool_response !== undefined || input.toolResponse !== undefined || input.response !== undefined || input.result !== undefined) {
    return "PostToolUse";
  }
  if (input.tool_name !== undefined || input.toolName !== undefined || input.tool !== undefined) return "PreToolUse";
  if (input.stop_hook_active || input.stopHookActive || input.transcript_path || input.last_assistant_message) return "Stop";
  return "SessionStart";
}

function classifyRuntimeCallFailure(label, error, durationMs) {
  const detail = error?.aionis_runtime_error || {};
  return {
    label,
    code: detail.code || error?.code || "runtime_call_failed",
    category: detail.category || error?.category || "runtime_call",
    method: detail.method || error?.method || null,
    route_path: detail.route_path || error?.routePath || null,
    status: detail.status || error?.status || null,
    duration_ms: typeof detail.duration_ms === "number" ? detail.duration_ms : Math.max(0, Math.round(durationMs)),
    timeout_ms: typeof detail.timeout_ms === "number" ? detail.timeout_ms : null,
    message: detail.message || String(error?.message || error),
  };
}

async function safeRuntimeCall(config, label, fn, errors) {
  const startedAt = performance.now();
  try {
    return await fn();
  } catch (error) {
    if (isExpectedEmptyRuntimeError(error)) {
      stderrDebug(config, `${label} returned empty state`, error.payload || error.message || error);
      return null;
    }
    const detail = classifyRuntimeCallFailure(label, error, performance.now() - startedAt);
    const nonFatal = new Error(`${label}: ${detail.message}`);
    nonFatal.aionis_non_fatal = detail;
    errors.push(nonFatal);
    stderrDebug(config, `${label} failed`, error.payload || error.message || error);
    return null;
  }
}

function isExpectedEmptyRuntimeError(error) {
  const payload = error?.payload;
  return error?.status === 404 && payload && typeof payload === "object" && payload.error === "handoff_not_found";
}

function baseContext(config, sessionId, input) {
  return {
    host: "codex",
    cwd: config.cwd,
    project_name: config.projectName,
    project_hash: config.projectHash,
    session_id: sessionId,
    model: input.model || input.model_name || process.env.OPENAI_MODEL || null,
    hook_event_name: inferHookEvent(input),
    transcript_path: input.transcript_path || input.transcriptPath || null,
  };
}

async function createRuntimeSession(config, sessionId, input, title) {
  return runtimePost(config, "/v1/memory/sessions", {
    ...commonRuntimeFields(config),
    session_id: sessionId,
    title,
    text_summary: title,
    input_text: title,
    metadata: baseContext(config, sessionId, input),
    auto_embed: true,
  });
}

async function writeSessionEvent(config, sessionId, input, args) {
  return runtimePost(config, "/v1/memory/events", {
    ...commonRuntimeFields(config),
    session_id: sessionId,
    title: args.title,
    event_text: args.eventText,
    text_summary: args.summary || args.eventText,
    input_text: args.eventText,
    metadata: {
      ...baseContext(config, sessionId, input),
      ...(args.metadata || {}),
    },
    execution_result_summary: args.executionResultSummary,
    execution_evidence: args.executionEvidence,
    auto_embed: true,
  });
}

async function agentPack(config, route, queryText, input, sessionId, extra = {}) {
  return runtimePost(config, route, {
    ...commonRuntimeFields(config),
    query_text: queryText || `Resume Codex work in ${config.cwd}`,
    repo_root: config.cwd,
    include_payload: true,
    include_meta: true,
    session_id: sessionId,
    limit: 12,
    candidates: defaultToolCandidates(),
    include_shadow: true,
    rules_limit: 20,
    context: {
      ...baseContext(config, sessionId, input),
      ...(extra.context || {}),
    },
    ...extra,
  });
}

function taskStartContextRequest(config, prompt, context, runId, overrides = {}) {
  return {
    ...commonRuntimeFields(config),
    query_text: prompt || `Codex turn in ${config.projectName}`,
    context,
    candidates: defaultToolCandidates(),
    tool_candidates: defaultToolCandidates(),
    include_shadow: true,
    rules_limit: 20,
    run_id: runId,
    recall_strategy: "balanced",
    recall_class_aware: true,
    ...overrides,
  };
}

async function findProjectTaskHandoffs(config) {
  return runtimePost(config, "/v1/memory/find", {
    ...commonRuntimeFields(config),
    type: "event",
    memory_lane: "private",
    include_meta: false,
    include_slots: true,
    include_slots_preview: false,
    limit: 8,
    slots_contains: {
      summary_kind: "handoff",
      handoff_kind: "task_handoff",
      repo_root: config.cwd,
    },
  });
}

async function findProjectReleaseOutcomeHandoffs(config) {
  return runtimePost(config, "/v1/memory/find", {
    ...commonRuntimeFields(config),
    type: "event",
    memory_lane: "private",
    include_meta: false,
    include_slots: true,
    include_slots_preview: false,
    limit: 8,
    slots_contains: {
      summary_kind: "handoff",
      handoff_kind: "task_handoff",
      repo_root: config.cwd,
      execution_result_summary: {
        release_outcome: true,
      },
    },
  });
}

function projectTaskHandoffRecords(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return [];
  const records = [];
  for (const key of ["handoff", "execution_ready_handoff"]) {
    const value = result[key];
    if (value && typeof value === "object" && !Array.isArray(value)) records.push(value);
  }
  if (Array.isArray(result.nodes)) {
    for (const node of result.nodes) {
      if (node && typeof node === "object" && !Array.isArray(node)) records.push(node);
    }
  }
  return records;
}

function normalizeSnapshotText(value, limit = 1400) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function snapshotRecordFromRuntimeRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const summary = normalizeSnapshotText(record.summary || record.text_summary || record.handoff_text);
  if (!summary) return null;
  return {
    uri: typeof record.uri === "string" ? record.uri : null,
    title: normalizeSnapshotText(record.title, 240),
    summary,
    text_summary: summary,
    handoff_text: normalizeSnapshotText(record.handoff_text || summary, 2200),
    next_action: normalizeSnapshotText(record.next_action || record.nextAction, 500),
    target_files: Array.isArray(record.target_files) ? record.target_files.slice(0, 8) : Array.isArray(record.targetFiles) ? record.targetFiles.slice(0, 8) : [],
    acceptance_checks: Array.isArray(record.acceptance_checks) ? record.acceptance_checks.slice(0, 8) : Array.isArray(record.acceptanceChecks) ? record.acceptanceChecks.slice(0, 8) : [],
    tags: Array.isArray(record.tags) ? record.tags.slice(0, 12) : [],
    execution_result_summary: record.execution_result_summary || record.executionResultSummary || record.slots?.execution_result_summary || null,
    slots: record.slots || null,
  };
}

function snapshotResultFromRuntimeResult(result, source) {
  const nodes = projectTaskHandoffRecords(result)
    .map(snapshotRecordFromRuntimeRecord)
    .filter(Boolean)
    .slice(0, 6);
  return nodes.length > 0
    ? { nodes, snapshot_source: source, snapshot_captured_at: nowIso() }
    : null;
}

function snapshotResultFromStopHandoffPayload(config, payload, source) {
  if (!payload || typeof payload !== "object") return null;
  const summary = normalizeSnapshotText(payload.summary || payload.handoff_text);
  if (!summary) return null;
  const record = {
    uri: `aionis://local-codex/${encodeURIComponent(config.scope)}/snapshot/${uuidFromText(payload.anchor || summary)}`,
    title: "Latest Codex Stop handoff",
    summary,
    text_summary: summary,
    handoff_text: normalizeSnapshotText(payload.handoff_text || summary, 2200),
    next_action: normalizeSnapshotText(payload.next_action, 500),
    target_files: Array.isArray(payload.target_files) ? payload.target_files.slice(0, 8) : [],
    acceptance_checks: Array.isArray(payload.acceptance_checks) ? payload.acceptance_checks.slice(0, 8) : [],
    tags: Array.isArray(payload.tags) ? payload.tags.slice(0, 12) : [],
    execution_result_summary: payload.execution_result_summary || null,
    slots: {
      summary_kind: "handoff",
      handoff_kind: payload.handoff_kind || "task_handoff",
      repo_root: payload.repo_root || config.cwd,
      execution_result_summary: payload.execution_result_summary || null,
    },
  };
  return { nodes: [record], snapshot_source: source, snapshot_captured_at: nowIso() };
}

function snapshotHasRecords(result) {
  return projectTaskHandoffRecords(result).length > 0;
}

function updateProjectContextSnapshot(config, patch) {
  const cleaned = Object.fromEntries(Object.entries(patch).filter(([, value]) => value));
  if (Object.keys(cleaned).length === 0) return null;
  return saveProjectContextSnapshot(config, cleaned);
}

function hasUsableProjectTaskHandoff(result) {
  return projectTaskHandoffRecords(result).some((record) => {
    const summary = String(record.summary || record.text_summary || record.handoff_text || "").replace(/\s+/g, " ").trim();
    const nextAction = String(record.next_action || record.nextAction || "").trim();
    return summary.length >= 80 || nextAction.length >= 24;
  });
}

function hasTimeoutError(errors, label) {
  return errors.some((error) => {
    const detail = error?.aionis_non_fatal || error?.aionis_runtime_error;
    if (!detail || detail.category !== "timeout") return false;
    return !label || detail.label === label;
  });
}

function fastRuntimeConfig(config) {
  const timeoutMs = Math.min(config.timeoutMs, config.fastTimeoutMs || config.timeoutMs);
  return { ...config, timeoutMs };
}

function normalizeStopText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanStopSummaryLine(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^\s*[-*]\s+/, "")
    .trim();
}

function stopSummaryLineHasSignal(value) {
  const text = cleanStopSummaryLine(value);
  if (!text) return false;
  return [
    /\b(implemented|fixed|updated|changed|added|removed|verified|tested|passed|committed|pushed|published|released|installed|validated|created|refactored)\b/i,
    /\b(PASS|npm|npx|codex|runtime|watchdog|pack(?:\s|-|:)dry-run|git|commit|push)\b/i,
    /(?:\u5df2|\u5df2\u7ecf)[^\n\u3002\uff1b;]{0,48}(\u5b9e\u73b0|\u4fee\u590d|\u66f4\u65b0|\u63d0\u4ea4|\u63a8\u9001|\u53d1\u5e03|\u53d1\u5305|\u9a8c\u8bc1|\u5b89\u88c5|\u5b8c\u6210|\u8dd1\u8fc7|\u901a\u8fc7)/,
    /(\u9a8c\u8bc1|\u6d4b\u8bd5|\u53d1\u5e03|\u53d1\u5305|\u63d0\u4ea4|\u63a8\u9001|\u4fee\u590d|\u5b9e\u73b0|\u66f4\u65b0)/,
    /packages\/|\.mjs\b|\.ts\b|\.json\b|README\b/,
  ].some((pattern) => pattern.test(text));
}

function compactStopSummary(value, limit = 900) {
  const raw = String(value || "").replace(/\r\n?/g, "\n").trim();
  const normalized = normalizeStopText(raw);
  if (!normalized || normalized.length <= limit) return normalized;

  const lines = raw.split(/\n+/).map(cleanStopSummaryLine).filter(Boolean);
  const selected = [];
  const seen = new Set();
  const pushLine = (line) => {
    const cleaned = cleanStopSummaryLine(line);
    if (!cleaned || seen.has(cleaned)) return;
    seen.add(cleaned);
    selected.push(cleaned);
  };

  pushLine(lines[0]);
  for (const line of lines.slice(1)) {
    if (selected.length >= 8) break;
    if (stopSummaryLineHasSignal(line)) pushLine(line);
  }
  if (selected.length < 3) {
    for (const line of lines.slice(1)) {
      if (selected.length >= 4) break;
      pushLine(line);
    }
  }

  const compact = normalizeStopText(selected.join(" "));
  const fallback = compact || normalized;
  if (fallback.length <= limit) return fallback;
  const marker = ` ... [full_text_chars=${normalized.length}]`;
  return `${fallback.slice(0, Math.max(0, limit - marker.length)).trim()}${marker}`;
}

function isStatusOrCommandPrompt(value) {
  const text = normalizeStopText(value);
  if (!text) return false;
  return [
    /\u73b0\u5728.*(\u6574\u4f53|\u72b6\u6001|\u600e\u4e48\u6837)/i,
    /(\u6574\u4f53|\u72b6\u6001).*(\u600e\u4e48\u6837|\u548b\u6837)/i,
    /\u7ed9\u6211\u547d\u4ee4|\u6211\u81ea\u5df1\u53d1|\u53d1\u5b8c\u4e86/i,
    /^\s*(\u63d0\u4ea4\u5427|\u5148\u63d0\u4ea4\u5427)\s*$/i,
    /^\s*(status|overall)\b/i,
    /\b(give me.*command|publish command)\b/i,
    /^\s*(published|released|done)\s*$/i,
  ].some((pattern) => pattern.test(text));
}

function isCommandInstructionOnly(value) {
  const text = normalizeStopText(value);
  if (!text) return false;
  if (/^\u7528\u8fd9\u7ec4\u547d\u4ee4/.test(text)) return true;
  return text.includes("```bash")
    && /\b(npm publish|git push|npm --prefix|npm view|npx --yes)\b/.test(text)
    && !/\b(verified|implemented|fixed|passed|PASS|committed|released)\b/i.test(text);
}

function isStatusOnlyAssistantText(value) {
  const text = normalizeStopText(value);
  if (!text) return false;
  return [
    /^\u6574\u4f53\u73b0\u5728/,
    /^\u73b0\u5728\u6574\u4f53/,
    /^\u73b0\u5728\u72b6\u6001/,
    /^\u786e\u8ba4\u5b8c\u4e86/,
    /^Current status\b/i,
    /^Overall\b/i,
  ].some((pattern) => pattern.test(text));
}

function isOverallStatusSummary(value) {
  const text = normalizeStopText(value);
  if (!text) return false;
  return [
    /^\u6574\u4f53\u73b0\u5728/,
    /^\u73b0\u5728\u6574\u4f53/,
    /^\u73b0\u5728\u72b6\u6001/,
    /^Current status\b/i,
    /^Overall\b/i,
  ].some((pattern) => pattern.test(text));
}

function isNextStepPlanningPrompt(value) {
  const text = normalizeStopText(value);
  if (!text) return false;
  return [
    /\u63a5\u4e0b\u6765.*(\u600e\u4e48|\u5982\u4f55|\u5e94\u8be5|\u7ee7\u7eed|\u63a8\u8fdb)/i,
    /(\u4e0b\u4e00\u6b65|\u63a5\u4e0b\u6765).*(\u63a8\u8fdb|\u505a|\u7ee7\u7eed)/i,
    /\b(what next|next steps|how should.*continue|how.*continue)\b/i,
  ].some((pattern) => pattern.test(text));
}

function hasTaskHandoffEvidence(value) {
  const text = normalizeStopText(value);
  if (!text) return false;
  return [
    /\b(implemented|fixed|updated|changed|added|removed|verified|tested|passed|committed|released|published|installed|validated|created|refactored)\b/i,
    /(?:\u5df2|\u5df2\u7ecf)[^\n\u3002\uff1b;]{0,40}(\u5b9e\u73b0|\u4fee\u590d|\u66f4\u65b0|\u63d0\u4ea4|\u53d1\u5e03|\u9a8c\u8bc1|\u5b89\u88c5|\u5b8c\u6210|\u8dd1\u8fc7|\u901a\u8fc7)/,
    /\bPASS\b/,
  ].some((pattern) => pattern.test(text));
}

function isPlanningAdviceOnly(value) {
  const text = normalizeStopText(value);
  if (!text || hasTaskHandoffEvidence(text)) return false;
  return [
    /^\u63a5\u4e0b\u6765/,
    /^\u4e0b\u4e00\u6b65/,
    /^\u6211\u7684\u5efa\u8bae/,
    /\u5efa\u8bae\u987a\u5e8f/,
    /\u4e0d\u8981\u518d\u5f00\u65b0\u5751/,
    /\u4e0d\u8981\u518d\u76f2\u76ee\u52a0\u529f\u80fd/,
    /\u6700\u8be5\u505a/,
    /\u6700\u5e94\u8be5\u63a8\u8fdb/,
    /\u6211\u5efa\u8bae.*\u987a\u5e8f/,
    /^\s*(next steps|recommendation|i recommend)\b/i,
  ].some((pattern) => pattern.test(text));
}

function isConceptualDiscussionPrompt(value) {
  const text = normalizeStopText(value);
  if (!text) return false;
  return [
    /\u4e3a\u4ec0\u4e48/,
    /\u662f.*\u4e0d\u662f/,
    /\u4e0d\u884c\u5417/,
    /\u6709\u6ca1\u6709\u4ef7\u503c|\u4ec0\u4e48\u4ef7\u503c/,
    /\u4f60\u89c9\u5f97/,
    /\u5230\u5e95.*(\u662f\u4ec0\u4e48|\u600e\u4e48\u56de\u4e8b|\u5565\u60c5\u51b5)/,
    /\b(why|what is|is .* good|does .* work|is .* worth)\b/i,
  ].some((pattern) => pattern.test(text));
}

function isConceptualDiscussionOnly(value) {
  const text = normalizeStopText(value);
  if (!text || hasTaskHandoffEvidence(text)) return false;
  return [
    /^\u4f60\u8fd9\u4e2a\u8d28\u7591/,
    /^\u8fd9\u91cc\u8981\u5206\u6e05/,
    /^\u672c\u8d28\u4e0a/,
    /^\u6211\u7684\u771f\u5b9e\u7ed3\u8bba/,
    /Aionis\s+\u4e0d\u662f.*\u800c\u662f/i,
    /^The key point\b/i,
  ].some((pattern) => pattern.test(text));
}

function releaseOutcomeVersion(value) {
  const text = normalizeStopText(value);
  const scopedPackageVersion = text.match(/@[a-z0-9_.-]+\/[a-z0-9_.-]+@(\d+\.\d+\.\d+(?:[-+][a-z0-9_.-]+)?)/i);
  if (scopedPackageVersion) return scopedPackageVersion[1];
  const runtimeVersion = text.match(/@ostinato\/aionis-runtime[^\d]*(\d+\.\d+\.\d+(?:[-+][a-z0-9_.-]+)?)/i);
  if (runtimeVersion) return runtimeVersion[1];
  const latestVersion = text.match(/\b(?:latest|version|dist-tag|dist-tags|npm view)[^\d]*(\d+\.\d+\.\d+(?:[-+][a-z0-9_.-]+)?)/i);
  if (latestVersion) return latestVersion[1];
  return null;
}

function isUnpublishedReleaseStatusSummary(value) {
  const text = normalizeStopText(value);
  if (!text) return false;
  return [
    /\bnpm\s+latest\b[^\n。.;]*(?:still|remains|is still)\b/i,
    /\bnpm\s+latest\b[^\n。.;]*(?:\u4ecd\u662f|\u8fd8\u662f|\u4ecd\u7136\u662f)/i,
    /\bnot\s+(?:yet\s+)?(?:published|released)\b/i,
    /\b(?:unpublished|not-published|candidate)\b/i,
    /\u6ca1\u6709\u8bef\u53d1\u5305|\u672a\u53d1(?:\u5305|\u5e03)|\u8fd8\u6ca1\u53d1|\u5c1a\u672a\u53d1|\u5019\u9009/i,
  ].some((pattern) => pattern.test(text));
}

function hasReleaseCompletionSignal(value) {
  const text = normalizeStopText(value);
  if (!text) return false;
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

function isReleaseOutcomeSummary(value, prompt = "") {
  const text = normalizeStopText(value);
  if (!text || !releaseOutcomeVersion(text)) return false;
  if (isOverallStatusSummary(text)) return false;
  if (isUnpublishedReleaseStatusSummary(text)) return false;
  if (!hasReleaseCompletionSignal(`${text} ${normalizeStopText(prompt)}`)) return false;
  const hasExternalSurface = [
    /\bnpm\s+(?:publish|view)\b/i,
    /\bdist-tags?\b/i,
    /\bnpx\s+--yes\b/i,
    /\bgit\s+push\b/i,
    /\bcodex\s+status\b/i,
    /\bclean npm install\b/i,
    /\bregistry\b/i,
    /\u53d1\u5e03|\u53d1\u5305|\u63a8\u9001|\u5df2\u7ecf\u6210\u529f\u53d1\u5230\s*npm/i,
  ].some((pattern) => pattern.test(text));
  const hasSuccessSignal = [
    /\b(published|released|pushed|verified|validated|installed|PASS|ok=true|latest)\b/i,
    /\b->\s*main\b/i,
    /\u5b8c\u6210|\u6210\u529f|\u5df2\u7ecf|\u5df2|\u901a\u8fc7|\u5168\s*PASS/i,
  ].some((pattern) => pattern.test(text));
  return hasExternalSurface && hasSuccessSignal;
}

function handoffQualityDecision(args) {
  const summary = normalizeStopText(args.summary);
  const prompt = normalizeStopText(args.prompt);
  const reasons = [];
  if (!summary) {
    return { store_handoff: false, category: "empty", confidence: 1, reasons: ["empty_summary"] };
  }
  if (isReleaseOutcomeSummary(summary, prompt)) {
    return {
      store_handoff: true,
      category: "release_outcome",
      confidence: 0.95,
      reasons: ["release_version", "release_completion_signal", "external_release_surface"],
    };
  }
  if (isStatusOrCommandPrompt(prompt)) reasons.push("status_or_command_prompt");
  if (isCommandInstructionOnly(summary)) reasons.push("command_instruction_only");
  if (isStatusOnlyAssistantText(summary)) reasons.push("status_only_assistant_text");
  if (isNextStepPlanningPrompt(prompt) && isPlanningAdviceOnly(summary)) reasons.push("next_step_planning_advice");
  else if (isPlanningAdviceOnly(summary)) reasons.push("planning_advice_only");
  if (isConceptualDiscussionPrompt(prompt) && isConceptualDiscussionOnly(summary)) reasons.push("conceptual_discussion_only");
  if (reasons.length > 0) {
    return {
      store_handoff: false,
      category: reasons.includes("conceptual_discussion_only")
        ? "conceptual_answer"
        : reasons.includes("next_step_planning_advice") || reasons.includes("planning_advice_only")
          ? "planning_advice"
          : reasons.includes("command_instruction_only")
            ? "command_instruction"
            : "status_report",
      confidence: 0.9,
      reasons,
    };
  }
  if (hasTaskHandoffEvidence(summary)) {
    return {
      store_handoff: true,
      category: "execution_outcome",
      confidence: 0.82,
      reasons: ["task_handoff_evidence"],
    };
  }
  return {
    store_handoff: true,
    category: "execution_outcome",
    confidence: 0.62,
    reasons: ["default_task_handoff_candidate"],
  };
}

function shouldStoreStopHandoff(args) {
  return handoffQualityDecision(args).store_handoff;
}

function buildStopHandoffPayload(config, sessionId, turnId, runId, turn, summary, eventName, qualityDecision = null) {
  const releaseVersion = releaseOutcomeVersion(summary);
  const decision = qualityDecision || handoffQualityDecision({ prompt: turn.prompt, summary, eventName });
  const isReleaseOutcome = decision.category === "release_outcome";
  const compactSummary = compactStopSummary(summary, isReleaseOutcome ? 720 : 900);
  return {
    ...commonRuntimeFields(config),
    handoff_kind: "task_handoff",
    anchor: isReleaseOutcome && releaseVersion
      ? `${config.cwd}#release:${releaseVersion}`
      : `${config.cwd}#${sessionId}:${turnId}`,
    summary: compactSummary,
    handoff_text: summary,
    repo_root: config.cwd,
    next_action: isReleaseOutcome
      ? "Resume from the latest verified release, publish, push, and install state; re-check registry and git state before publishing again."
      : "Resume from the latest Codex/Aionis runtime context and verify against the current repository state.",
    tags: [
      "codex",
      "aionis-runtime",
      eventName,
      ...(isReleaseOutcome ? ["release", "release_outcome", ...(releaseVersion ? [releaseVersion] : [])] : []),
    ],
    execution_result_summary: {
      host: "codex",
      event: eventName,
      run_id: runId,
      turn_id: turnId,
      prompt: turn.prompt || null,
      handoff_quality: decision,
      ...(isReleaseOutcome ? { release_outcome: true, version: releaseVersion } : {}),
    },
  };
}

async function handleSessionStart(input) {
  const config = resolveConfig(input);
  recordActiveProject(config, "SessionStart");
  const sessionId = getSessionId(input);
  const errors = [];
  const runtimeStatus = await ensureRuntime(config);
  if (!runtimeStatus.ok) {
    stdoutJson(hookAdditionalContext(runtimeUnavailableContext(runtimeStatus.error, config), "SessionStart"));
    return;
  }

  await safeRuntimeCall(config, "session_create", () =>
    createRuntimeSession(config, sessionId, input, `Codex session ${sessionId} in ${config.projectName}`), errors);

  const resumePack = await safeRuntimeCall(config, "agent_resume_pack", () =>
    agentPack(config, "/v1/memory/agent/resume-pack", `Resume Codex workspace ${config.projectName}`, input, sessionId), errors);

  const context = renderSessionStartContext({ config, sessionId, runtimeStatus, resumePack, errors });
  stdoutJson(hookAdditionalContext(context, "SessionStart"));
}

async function handleUserPrompt(input) {
  const config = resolveConfig(input);
  recordActiveProject(config, "UserPromptSubmit");
  const sessionId = getSessionId(input);
  const turnId = getTurnId(input);
  const prompt = extractPrompt(input);
  const errors = [];
  const runtimeStatus = await ensureRuntime(config);
  if (!runtimeStatus.ok) {
    stdoutJson(hookAdditionalContext(runtimeUnavailableContext(runtimeStatus.error, config), "UserPromptSubmit"));
    return;
  }

  const state = loadState(config, sessionId);
  const runId = buildTurnRunId(sessionId, turnId);
  state.active_turn_id = turnId;
  state.active_run_id = runId;
  state.next_step_index = 1;
  state.turns[turnId] = {
    ...(state.turns[turnId] || {}),
    turn_id: turnId,
    run_id: runId,
    prompt,
    started_at: nowIso(),
    status: "active",
  };

  const context = {
    ...baseContext(config, sessionId, input),
    turn_id: turnId,
    run_id: runId,
    prompt,
    workspace: {
      cwd: config.cwd,
      project_name: config.projectName,
      project_hash: config.projectHash,
    },
  };
  const projectContextSnapshot = loadProjectContextSnapshot(config);

  await safeRuntimeCall(config, "session_create", () =>
    createRuntimeSession(config, sessionId, input, `Codex session ${sessionId} in ${config.projectName}`), errors);
  await safeRuntimeCall(config, "session_prompt_event", () =>
    writeSessionEvent(config, sessionId, input, {
      title: "Codex user prompt",
      eventText: prompt || "Codex user prompt",
      metadata: { turn_id: turnId, run_id: runId, phase: "user_prompt" },
    }), errors);
  await safeRuntimeCall(config, "replay_run_start", () =>
    runtimePost(config, "/v1/memory/replay/run/start", {
      ...commonRuntimeFields(config),
      run_id: runId,
      goal: prompt || `Codex turn ${turnId}`,
      context_snapshot_ref: `codex:${sessionId}:${turnId}`,
      metadata: context,
    }), errors);

  const fastConfig = fastRuntimeConfig(config);
  const projectHandoffSnapshot = projectContextSnapshot?.project_handoff_fast || null;
  const projectReleaseOutcomeSnapshot = projectContextSnapshot?.project_release_outcome_fast || null;
  const useProjectHandoffSnapshot = snapshotHasRecords(projectHandoffSnapshot);
  const useProjectReleaseOutcomeSnapshot = snapshotHasRecords(projectReleaseOutcomeSnapshot);
  const [projectHandoffFast, projectReleaseOutcomeFast] = await Promise.all([
    useProjectHandoffSnapshot
      ? projectHandoffSnapshot
      : safeRuntimeCall(fastConfig, "project_handoff_fast", () => findProjectTaskHandoffs(fastConfig), errors),
    useProjectReleaseOutcomeSnapshot
      ? projectReleaseOutcomeSnapshot
      : safeRuntimeCall(fastConfig, "project_release_outcome_fast", () => findProjectReleaseOutcomeHandoffs(fastConfig), errors),
  ]);

  updateProjectContextSnapshot(config, {
    project_handoff_fast: !useProjectHandoffSnapshot && hasUsableProjectTaskHandoff(projectHandoffFast)
      ? snapshotResultFromRuntimeResult(projectHandoffFast, "runtime_find")
      : null,
    project_release_outcome_fast: !useProjectReleaseOutcomeSnapshot && snapshotHasRecords(projectReleaseOutcomeFast)
      ? snapshotResultFromRuntimeResult(projectReleaseOutcomeFast, "runtime_find")
      : null,
  });

  const snapshotUsage = {
    updated_at: projectContextSnapshot?.updated_at || null,
    used_task_handoff: useProjectHandoffSnapshot,
    used_release_outcome: useProjectReleaseOutcomeSnapshot,
  };

  const hasFastProjectHandoff = hasUsableProjectTaskHandoff(projectHandoffFast);
  const taskHandoffTimedOut = hasTimeoutError(errors, "project_handoff_fast");
  const planningContext = hasFastProjectHandoff || taskHandoffTimedOut
    ? null
    : await safeRuntimeCall(fastConfig, "planning_context_fast", () =>
        runtimePost(fastConfig, "/v1/memory/planning/context", taskStartContextRequest(config, prompt, context, runId, {
          limit: 4,
          neighborhood_hops: 1,
          max_nodes: 12,
          max_edges: 16,
          ranked_limit: 20,
          context_char_budget: Math.min(config.contextCharLimit, 3200),
          context_compaction_profile: "aggressive",
          context_optimization_profile: "aggressive",
          return_layered_context: false,
          include_meta: false,
          include_slots_preview: false,
        })), errors);

  let contextAssemble = null;
  let projectAgentResume = null;
  let projectAgentReview = null;
  let globalAgentResume = null;
  let globalRecall = null;
  if (planningContext && !hasTimeoutError(errors, "planning_context_fast")) {
    contextAssemble = await safeRuntimeCall(config, "context_assemble", () =>
      runtimePost(config, "/v1/memory/context/assemble", taskStartContextRequest(config, prompt, context, runId, {
        limit: 16,
        neighborhood_hops: 2,
        max_nodes: 64,
        max_edges: 100,
        ranked_limit: 120,
        context_char_budget: config.contextCharLimit,
        context_compaction_profile: "balanced",
        context_optimization_profile: "balanced",
        return_layered_context: true,
        include_meta: true,
        include_slots_preview: true,
        slots_preview_keys: 12,
      })), errors);

    projectAgentResume = await safeRuntimeCall(config, "project_agent_resume_pack", () =>
      agentPack(config, "/v1/memory/agent/resume-pack", prompt, input, sessionId, { run_id: runId }), errors);
    projectAgentReview = await safeRuntimeCall(config, "project_agent_review_pack", () =>
      agentPack(config, "/v1/memory/agent/review-pack", prompt, input, sessionId, { run_id: runId }), errors);

    if (config.globalScope && config.globalScope !== config.scope) {
      const globalFields = { ...commonRuntimeFields(config), scope: config.globalScope };
      globalAgentResume = await safeRuntimeCall(config, "global_agent_resume_pack", () =>
        runtimePost(config, "/v1/memory/agent/resume-pack", {
          ...globalFields,
          query_text: prompt || "Codex user preference and global memory",
          repo_root: config.cwd,
          include_payload: true,
          include_meta: true,
          session_id: sessionId,
          limit: 8,
          candidates: defaultToolCandidates(),
          include_shadow: true,
          rules_limit: 20,
          context,
        }), errors);
      globalRecall = await safeRuntimeCall(config, "global_recall_text", () =>
        runtimePost(config, "/v1/memory/recall_text", {
          ...globalFields,
          query_text: prompt || "Codex user preference and global memory",
          recall_strategy: "balanced",
          recall_class_aware: true,
          limit: 8,
          max_nodes: 24,
          max_edges: 40,
          context_char_budget: 3000,
          include_meta: true,
          include_slots_preview: true,
        }), errors);
    }
  }

  state.turns[turnId].context_assembled_at = nowIso();
  saveState(config, sessionId, state);

  const additionalContext = renderAionisHookContext({
    config,
    sessionId,
    turnId,
    runId,
    prompt,
    runtimeStatus,
    projectHandoffFast,
    projectReleaseOutcomeFast,
    localContextSnapshot: snapshotUsage,
    planningContext,
    contextAssemble,
    projectAgentResume,
    projectAgentReview,
    globalAgentResume,
    globalRecall,
    errors,
  });
  stdoutJson(hookAdditionalContext(additionalContext, "UserPromptSubmit"));
}

async function handlePreToolUse(input) {
  const config = resolveConfig(input);
  recordActiveProject(config, "PreToolUse");
  const sessionId = getSessionId(input);
  const state = loadState(config, sessionId);
  const turnId = state.active_turn_id || getTurnId(input);
  const runId = state.active_run_id || buildTurnRunId(sessionId, turnId);
  const toolName = extractToolName(input);
  const toolInput = extractToolInput(input);
  const stepIndex = state.next_step_index || 1;
  const stepId = uuidFromText(`codex-step:${runId}:${toolName}:${stepIndex}`);
  state.active_turn_id = turnId;
  state.active_run_id = runId;
  state.next_step_index = stepIndex + 1;
  state.steps[stepId] = {
    step_id: stepId,
    turn_id: turnId,
    run_id: runId,
    step_index: stepIndex,
    tool_name: toolName,
    started_at: nowIso(),
  };

  const runtimeStatus = await ensureRuntime(config);
  if (runtimeStatus.ok) {
    await safeRuntimeCall(config, "replay_step_before", () =>
      runtimePost(config, "/v1/memory/replay/step/before", {
        ...commonRuntimeFields(config),
        run_id: runId,
        step_id: stepId,
        step_index: stepIndex,
        tool_name: toolName,
        tool_input: toolInput,
        safety_level: "auto_ok",
        metadata: {
          ...baseContext(config, sessionId, input),
          turn_id: turnId,
          phase: "pre_tool_use",
        },
      }), []);
  }
  saveState(config, sessionId, state);
  stdoutJson({});
}

async function handlePostToolUse(input) {
  const config = resolveConfig(input);
  recordActiveProject(config, "PostToolUse");
  const sessionId = getSessionId(input);
  const state = loadState(config, sessionId);
  const toolName = extractToolName(input);
  const toolResponse = extractToolResponse(input);
  const status = inferToolStatus(toolResponse);
  const runId = state.active_run_id || buildTurnRunId(sessionId, state.active_turn_id || getTurnId(input));
  const stepCandidates = Object.values(state.steps || {})
    .filter((step) => step && step.run_id === runId && step.tool_name === toolName && !step.completed_at)
    .sort((a, b) => (b.step_index || 0) - (a.step_index || 0));
  const step = stepCandidates[0] || null;

  const runtimeStatus = await ensureRuntime(config);
  if (runtimeStatus.ok) {
    await safeRuntimeCall(config, "replay_step_after", () =>
      runtimePost(config, "/v1/memory/replay/step/after", {
        ...commonRuntimeFields(config),
        run_id: runId,
        step_id: step?.step_id,
        step_index: step?.step_index,
        status,
        output_signature: {
          tool_name: toolName,
          response: toolResponse,
        },
        error: status === "failed" ? compactJson(toolResponse, 1200) : undefined,
        metadata: {
          ...baseContext(config, sessionId, input),
          phase: "post_tool_use",
        },
      }), []);
    await safeRuntimeCall(config, "tools_feedback", () =>
      runtimePost(config, "/v1/memory/tools/feedback", {
        ...commonRuntimeFields(config),
        run_id: runId,
        outcome: status === "success" ? "positive" : status === "failed" ? "negative" : "neutral",
        context: {
          ...baseContext(config, sessionId, input),
          tool_name: toolName,
          tool_input: extractToolInput(input),
          tool_response: toolResponse,
        },
        candidates: defaultToolCandidates(),
        selected_tool: toolName,
        target: "tool",
        note: `Codex ${toolName} completed with ${status}`,
        input_text: compactJson(extractToolInput(input), 1200),
      }), []);
  }

  if (step) {
    step.completed_at = nowIso();
    step.status = status;
  }
  saveState(config, sessionId, state);

  const context = renderToolFailureContext({ config, runId, toolName, status, response: toolResponse });
  stdoutJson(context ? hookAdditionalContext(context, "PostToolUse") : {});
}

async function handleStop(input, eventName = "Stop") {
  const config = resolveConfig(input);
  recordActiveProject(config, eventName);
  const sessionId = getSessionId(input);
  const state = loadState(config, sessionId);
  const turnId = state.active_turn_id || getTurnId(input);
  const runId = state.active_run_id || buildTurnRunId(sessionId, turnId);
  const turn = {
    ...(state.turns?.[turnId] || {}),
    prompt: state.turns?.[turnId]?.prompt || extractPrompt(input) || null,
  };
  const assistantText = String(
    input.last_assistant_message
    || input.lastAssistantMessage
    || input.response
    || input.output
    || input.summary
    || ""
  ).trim();
  const summary = assistantText || `Codex turn ${turnId} ended`;
  const compactSummary = compactStopSummary(summary);
  const handoffQuality = handoffQualityDecision({ prompt: turn.prompt, summary, eventName });
  const stopHandoffPayload = handoffQuality.store_handoff
    ? buildStopHandoffPayload(config, sessionId, turnId, runId, turn, summary, eventName, handoffQuality)
    : null;
  if (stopHandoffPayload) {
    const snapshotResult = snapshotResultFromStopHandoffPayload(config, stopHandoffPayload, "stop_hook");
    updateProjectContextSnapshot(config, {
      project_handoff_fast: handoffQuality.category === "release_outcome" ? null : snapshotResult,
      project_release_outcome_fast: handoffQuality.category === "release_outcome" ? snapshotResult : null,
    });
  }

  const runtimeStatus = await ensureRuntime(config);
  if (runtimeStatus.ok) {
    await safeRuntimeCall(config, "session_stop_event", () =>
      writeSessionEvent(config, sessionId, input, {
        title: eventName === "SessionEnd" ? "Codex session ended" : "Codex turn ended",
        eventText: summary,
        summary: compactSummary,
        metadata: { turn_id: turnId, run_id: runId, phase: eventName, handoff_quality: handoffQuality },
    }), []);
    if (handoffQuality.store_handoff) {
      await safeRuntimeCall(config, "handoff_store", () =>
        runtimePost(config, "/v1/handoff/store", stopHandoffPayload), []);
    }
    await safeRuntimeCall(config, "replay_run_end", () =>
      runtimePost(config, "/v1/memory/replay/run/end", {
        ...commonRuntimeFields(config),
        run_id: runId,
        status: "partial",
        summary: compactSummary,
        metadata: {
          ...baseContext(config, sessionId, input),
          turn_id: turnId,
          phase: eventName,
        },
      }), []);
    if (config.compilePlaybooks && Object.values(state.steps || {}).some((step) => step.run_id === runId)) {
      await safeRuntimeCall(config, "replay_playbook_compile_from_run", () =>
        runtimePost(config, "/v1/memory/replay/playbooks/compile_from_run", {
          ...commonRuntimeFields(config),
          run_id: runId,
          name: `Codex turn ${turnId}`,
          version: "1",
          allow_partial: true,
          metadata: {
            host: "codex",
            session_id: sessionId,
            turn_id: turnId,
            cwd: config.cwd,
          },
        }), []);
    }
  }

  if (state.turns?.[turnId]) {
    state.turns[turnId].ended_at = nowIso();
    state.turns[turnId].status = "closed";
  }
  saveState(config, sessionId, state);
  stdoutJson({});
}

async function handlePermissionRequest(input) {
  const config = resolveConfig(input);
  recordActiveProject(config, "PermissionRequest");
  const sessionId = getSessionId(input);
  const runtimeStatus = await ensureRuntime(config);
  if (runtimeStatus.ok) {
    await safeRuntimeCall(config, "permission_event", () =>
      writeSessionEvent(config, sessionId, input, {
        title: "Codex permission request",
        eventText: compactJson(input, 1800),
        metadata: {
          phase: "permission_request",
          hook_event_name: "PermissionRequest",
        },
      }), []);
  }
  stdoutJson({});
}

async function main() {
  const input = await readHookInput();
  const event = inferHookEvent(input);
  if (event === "SessionStart") return handleSessionStart(input);
  if (event === "UserPromptSubmit") return handleUserPrompt(input);
  if (event === "PreToolUse") return handlePreToolUse(input);
  if (event === "PostToolUse") return handlePostToolUse(input);
  if (event === "PermissionRequest") return handlePermissionRequest(input);
  if (event === "Stop" || event === "SessionEnd") return handleStop(input, event);
  return handleUserPrompt(input);
}

main().catch((error) => {
  const config = resolveConfig({});
  stdoutJson(hookAdditionalContext(runtimeUnavailableContext(error, config), "UserPromptSubmit"));
});

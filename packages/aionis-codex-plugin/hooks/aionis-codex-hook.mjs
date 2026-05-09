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
  loadState,
  nowIso,
  readHookInput,
  recordActiveProject,
  resolveConfig,
  runtimePost,
  runtimeUnavailableContext,
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
    include_slots: false,
    include_slots_preview: false,
    limit: 8,
    slots_contains: {
      summary_kind: "handoff",
      handoff_kind: "task_handoff",
      repo_root: config.cwd,
    },
  });
}

function hasTimeoutError(errors, label) {
  return errors.some((error) => {
    const detail = error?.aionis_non_fatal || error?.aionis_runtime_error;
    if (!detail || detail.category !== "timeout") return false;
    return !label || detail.label === label;
  });
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

  const projectHandoffFast = await safeRuntimeCall(config, "project_handoff_fast", () =>
    findProjectTaskHandoffs(config), errors);

  const planningContext = await safeRuntimeCall(config, "planning_context_fast", () =>
    runtimePost(config, "/v1/memory/planning/context", taskStartContextRequest(config, prompt, context, runId, {
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
  if (!hasTimeoutError(errors, "planning_context_fast")) {
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
  const turn = state.turns?.[turnId] || {};
  const assistantText = String(
    input.last_assistant_message
    || input.lastAssistantMessage
    || input.response
    || input.output
    || input.summary
    || ""
  ).trim();
  const summary = assistantText || `Codex turn ${turnId} ended`;

  const runtimeStatus = await ensureRuntime(config);
  if (runtimeStatus.ok) {
    await safeRuntimeCall(config, "session_stop_event", () =>
      writeSessionEvent(config, sessionId, input, {
        title: eventName === "SessionEnd" ? "Codex session ended" : "Codex turn ended",
        eventText: summary,
        summary,
        metadata: { turn_id: turnId, run_id: runId, phase: eventName },
      }), []);
    await safeRuntimeCall(config, "handoff_store", () =>
      runtimePost(config, "/v1/handoff/store", {
        ...commonRuntimeFields(config),
        handoff_kind: "task_handoff",
        anchor: `${config.cwd}#${sessionId}:${turnId}`,
        summary: summary.slice(0, 1800),
        handoff_text: summary,
        repo_root: config.cwd,
        next_action: "Resume from the latest Codex/Aionis runtime context and verify against the current repository state.",
        tags: ["codex", "aionis-runtime", eventName],
        execution_result_summary: {
          host: "codex",
          event: eventName,
          run_id: runId,
          turn_id: turnId,
          prompt: turn.prompt || null,
        },
      }), []);
    await safeRuntimeCall(config, "replay_run_end", () =>
      runtimePost(config, "/v1/memory/replay/run/end", {
        ...commonRuntimeFields(config),
        run_id: runId,
        status: "partial",
        summary: summary.slice(0, 1800),
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

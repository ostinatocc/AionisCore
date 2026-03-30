import { randomUUID } from "node:crypto";

import type {
  AionisHandoffRecoverRequest,
  AionisHandoffStoreRequest,
  AionisKickoffRecommendationRequest,
  AionisReplayPlaybookCompileFromRunRequest,
  AionisReplayPlaybookRunRequest,
  AionisReplayRunEndRequest,
  AionisReplayRunStartRequest,
  AionisReplayStepAfterRequest,
  AionisReplayStepBeforeRequest,
  AionisTaskStartResponse,
} from "./contracts.js";
import { createAionisRuntimeClient, type AionisRuntimeClient } from "./client.js";
import type { AionisClientOptions } from "./types.js";

const DEFAULT_TOOL_CANDIDATES = ["read", "glob", "grep", "bash", "edit", "write", "ls"];
const DEFAULT_EXECUTION_STAGE = "resume";
const DEFAULT_EXECUTION_ROLE = "resume";

export type AionisHostBridgeTask = {
  task_id: string;
  text: string;
  tenant_id?: string;
  scope?: string;
  actor?: string;
  context?: Record<string, unknown>;
  candidates?: string[];
};

export type AionisHostBridgeFirstAction = NonNullable<AionisTaskStartResponse["first_action"]>;

export type AionisHostBridgeTaskStartResponse = {
  summary_version: "host_bridge_task_start_v1";
  task_id: string;
  first_action: AionisHostBridgeFirstAction | null;
  task_start: AionisTaskStartResponse;
};

export type AionisHostBridgePauseRequest = AionisHostBridgeTask & {
  summary: string;
  handoff_text: string;
  handoff_kind?: string;
  memory_lane?: "private" | "shared";
  file_path?: string;
  repo_root?: string;
  symbol?: string;
  risk?: string;
  acceptance_checks?: string[];
  tags?: string[];
  target_files?: string[];
  next_action?: string;
  must_change?: string[];
  must_remove?: string[];
  must_keep?: string[];
  execution_result_summary?: Record<string, unknown>;
  execution_artifacts?: Array<Record<string, unknown>>;
  execution_evidence?: Array<Record<string, unknown>>;
  execution_state_v1?: Record<string, unknown>;
  execution_packet_v1?: Record<string, unknown>;
  control_profile_v1?: Record<string, unknown>;
  execution_transitions_v1?: Array<Record<string, unknown>>;
};

export type AionisHostBridgePauseResponse = {
  summary_version: "host_bridge_task_pause_v1";
  task_id: string;
  handoff: Awaited<ReturnType<AionisRuntimeClient["handoff"]["store"]>>;
};

export type AionisHostBridgeResumeRequest = {
  task_id: string;
  tenant_id?: string;
  scope?: string;
  actor?: string;
  handoff_id?: string;
  handoff_uri?: string;
  handoff_kind?: string;
  repo_root?: string;
  file_path?: string;
  symbol?: string;
  include_payload?: boolean;
};

export type AionisHostBridgeResumeResponse = {
  summary_version: "host_bridge_task_resume_v1";
  task_id: string;
  handoff: Awaited<ReturnType<AionisRuntimeClient["handoff"]["recover"]>>;
};

export type AionisHostBridgeReplayStep = {
  step_id?: string;
  decision_id?: string;
  tool_name: string;
  tool_input: unknown;
  expected_output_signature?: unknown;
  preconditions?: Array<Record<string, unknown>>;
  retry_policy?: Record<string, unknown>;
  safety_level?: "auto_ok" | "needs_confirm" | "manual_only";
  status: "success" | "failed" | "skipped" | "partial";
  output_signature?: unknown;
  postconditions?: Array<Record<string, unknown>>;
  artifact_refs?: string[];
  repair_applied?: boolean;
  repair_note?: string;
  error?: string;
  metadata?: Record<string, unknown>;
};

export type AionisHostBridgeCompleteRequest = AionisHostBridgeTask & {
  run_id?: string;
  memory_lane?: "private" | "shared";
  goal?: string;
  summary?: string;
  success_criteria?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  steps: AionisHostBridgeReplayStep[];
  compile_playbook?: boolean;
  compile?: Pick<AionisReplayPlaybookCompileFromRunRequest, "playbook_id" | "name" | "version" | "matchers" | "success_criteria" | "risk_profile" | "allow_partial" | "metadata">;
  simulate_playbook?: boolean;
  simulate?: Pick<AionisReplayPlaybookRunRequest, "version" | "deterministic_gate" | "params" | "max_steps">;
};

export type AionisHostBridgeCompleteResponse = {
  summary_version: "host_bridge_task_complete_v1";
  task_id: string;
  replay_run_id: string;
  run_start: Awaited<ReturnType<AionisRuntimeClient["memory"]["replay"]["run"]["start"]>>;
  run_end: Awaited<ReturnType<AionisRuntimeClient["memory"]["replay"]["run"]["end"]>>;
  playbook_compile: Awaited<ReturnType<AionisRuntimeClient["memory"]["replay"]["playbooks"]["compileFromRun"]>> | null;
  playbook_simulation: Awaited<ReturnType<AionisRuntimeClient["memory"]["replay"]["playbooks"]["run"]>> | null;
};

export type AionisHostBridge = {
  startTask(input: AionisHostBridgeTask): Promise<AionisHostBridgeTaskStartResponse>;
  pauseTask(input: AionisHostBridgePauseRequest): Promise<AionisHostBridgePauseResponse>;
  resumeTask(input: AionisHostBridgeResumeRequest): Promise<AionisHostBridgeResumeResponse>;
  completeTask(input: AionisHostBridgeCompleteRequest): Promise<AionisHostBridgeCompleteResponse>;
};

function withDefaults<T extends { tenant_id?: string; scope?: string; actor?: string }>(
  base: Pick<AionisHostBridgeTask, "tenant_id" | "scope" | "actor">,
  value: T,
): T {
  return {
    ...value,
    tenant_id: value.tenant_id ?? base.tenant_id,
    scope: value.scope ?? base.scope,
    actor: value.actor ?? base.actor,
  };
}

function buildHostBridgeExecutionIdentity(taskId: string) {
  const normalizedTaskId = String(taskId ?? "").trim();
  return {
    state_id: `handoff-anchor:${normalizedTaskId}`,
    scope: `aionis://handoff/${normalizedTaskId}`,
  };
}

function buildDefaultExecutionState(input: AionisHostBridgePauseRequest) {
  const existing = input.execution_state_v1 ?? {};
  const identity = buildHostBridgeExecutionIdentity(input.task_id);
  const targetFiles = input.target_files ?? (input.file_path ? [input.file_path] : []);
  const acceptanceChecks = input.acceptance_checks ?? [];
  const updatedAt = typeof existing.updated_at === "string" && existing.updated_at.trim().length > 0
    ? existing.updated_at
    : new Date().toISOString();

  return {
    ...existing,
    state_id: typeof existing.state_id === "string" && existing.state_id.trim().length > 0 ? existing.state_id : identity.state_id,
    scope: typeof existing.scope === "string" && existing.scope.trim().length > 0 ? existing.scope : identity.scope,
    task_brief: typeof existing.task_brief === "string" && existing.task_brief.trim().length > 0 ? existing.task_brief : input.summary,
    current_stage:
      typeof existing.current_stage === "string" && existing.current_stage.trim().length > 0
        ? existing.current_stage
        : DEFAULT_EXECUTION_STAGE,
    active_role:
      typeof existing.active_role === "string" && existing.active_role.trim().length > 0
        ? existing.active_role
        : DEFAULT_EXECUTION_ROLE,
    owned_files: Array.isArray(existing.owned_files) ? existing.owned_files : targetFiles,
    modified_files: Array.isArray(existing.modified_files) ? existing.modified_files : [],
    pending_validations: Array.isArray(existing.pending_validations) ? existing.pending_validations : acceptanceChecks,
    completed_validations: Array.isArray(existing.completed_validations) ? existing.completed_validations : [],
    last_accepted_hypothesis: existing.last_accepted_hypothesis ?? null,
    rejected_paths: Array.isArray(existing.rejected_paths) ? existing.rejected_paths : [],
    unresolved_blockers: Array.isArray(existing.unresolved_blockers) ? existing.unresolved_blockers : [],
    rollback_notes: Array.isArray(existing.rollback_notes) ? existing.rollback_notes : [],
    reviewer_contract: existing.reviewer_contract ?? null,
    resume_anchor: existing.resume_anchor ?? {
      anchor: input.task_id,
      file_path: input.file_path ?? null,
      symbol: input.symbol ?? null,
      repo_root: input.repo_root ?? null,
    },
    updated_at: updatedAt,
    version: 1,
  };
}

function buildDefaultExecutionPacket(input: AionisHostBridgePauseRequest, state: Record<string, unknown>) {
  const existing = input.execution_packet_v1 ?? {};
  const targetFiles = input.target_files ?? (input.file_path ? [input.file_path] : []);
  const acceptanceChecks = input.acceptance_checks ?? [];

  return {
    ...existing,
    version: 1,
    state_id: typeof existing.state_id === "string" && existing.state_id.trim().length > 0
      ? existing.state_id
      : state.state_id,
    current_stage:
      typeof existing.current_stage === "string" && existing.current_stage.trim().length > 0
        ? existing.current_stage
        : state.current_stage,
    active_role:
      typeof existing.active_role === "string" && existing.active_role.trim().length > 0
        ? existing.active_role
        : state.active_role,
    task_brief: typeof existing.task_brief === "string" && existing.task_brief.trim().length > 0 ? existing.task_brief : input.summary,
    target_files: Array.isArray(existing.target_files) ? existing.target_files : targetFiles,
    next_action:
      typeof existing.next_action === "string" && existing.next_action.trim().length > 0
        ? existing.next_action
        : (input.next_action ?? null),
    hard_constraints: Array.isArray(existing.hard_constraints) ? existing.hard_constraints : [],
    accepted_facts: Array.isArray(existing.accepted_facts) ? existing.accepted_facts : [],
    rejected_paths: Array.isArray(existing.rejected_paths) ? existing.rejected_paths : [],
    pending_validations: Array.isArray(existing.pending_validations) ? existing.pending_validations : acceptanceChecks,
    unresolved_blockers: Array.isArray(existing.unresolved_blockers) ? existing.unresolved_blockers : [],
    rollback_notes: Array.isArray(existing.rollback_notes) ? existing.rollback_notes : [],
    review_contract: existing.review_contract ?? null,
    resume_anchor: existing.resume_anchor ?? state.resume_anchor ?? {
      anchor: input.task_id,
      file_path: input.file_path ?? null,
      symbol: input.symbol ?? null,
      repo_root: input.repo_root ?? null,
    },
    artifact_refs: Array.isArray(existing.artifact_refs) ? existing.artifact_refs : [],
    evidence_refs: Array.isArray(existing.evidence_refs) ? existing.evidence_refs : [],
  };
}

export function createAionisHostBridge(
  options: AionisClientOptions,
  defaults: Pick<AionisHostBridgeTask, "tenant_id" | "scope" | "actor"> = {},
): AionisHostBridge {
  const client = createAionisRuntimeClient(options);

  return {
    async startTask(input) {
      const payload: AionisKickoffRecommendationRequest = withDefaults(defaults, {
        tenant_id: input.tenant_id,
        scope: input.scope,
        actor: input.actor,
        query_text: input.text,
        context: {
          goal: input.text,
          ...(input.context ?? {}),
        },
        candidates: input.candidates ?? DEFAULT_TOOL_CANDIDATES,
      });

      const taskStart = await client.memory.taskStart(payload);
      return {
        summary_version: "host_bridge_task_start_v1",
        task_id: input.task_id,
        first_action: taskStart.first_action,
        task_start: taskStart,
      };
    },

    async pauseTask(input) {
      const executionState = buildDefaultExecutionState(input);
      const executionPacket = buildDefaultExecutionPacket(input, executionState);
      const payload: AionisHandoffStoreRequest = withDefaults(defaults, {
        tenant_id: input.tenant_id,
        scope: input.scope,
        actor: input.actor,
        handoff_kind: input.handoff_kind ?? "task_handoff",
        anchor: input.task_id,
        summary: input.summary,
        handoff_text: input.handoff_text,
        memory_lane: input.memory_lane ?? "shared",
        file_path: input.file_path,
        repo_root: input.repo_root,
        symbol: input.symbol,
        risk: input.risk,
        acceptance_checks: input.acceptance_checks,
        tags: input.tags,
        target_files: input.target_files,
        next_action: input.next_action,
        must_change: input.must_change,
        must_remove: input.must_remove,
        must_keep: input.must_keep,
        execution_result_summary: input.execution_result_summary,
        execution_artifacts: input.execution_artifacts,
        execution_evidence: input.execution_evidence,
        execution_state_v1: executionState,
        execution_packet_v1: executionPacket,
        control_profile_v1: input.control_profile_v1,
        execution_transitions_v1: input.execution_transitions_v1,
      });
      const handoff = await client.handoff.store(payload);
      return {
        summary_version: "host_bridge_task_pause_v1",
        task_id: input.task_id,
        handoff,
      };
    },

    async resumeTask(input) {
      const payload: AionisHandoffRecoverRequest = withDefaults(defaults, {
        tenant_id: input.tenant_id,
        scope: input.scope,
        actor: input.actor,
        handoff_id: input.handoff_id,
        handoff_uri: input.handoff_uri,
        anchor: input.task_id,
        handoff_kind: input.handoff_kind ?? "task_handoff",
        repo_root: input.repo_root,
        file_path: input.file_path,
        symbol: input.symbol,
        include_payload: input.include_payload,
      });
      const handoff = await client.handoff.recover(payload);
      return {
        summary_version: "host_bridge_task_resume_v1",
        task_id: input.task_id,
        handoff,
      };
    },

    async completeTask(input) {
      const run_id = input.run_id ?? randomUUID();
      const runStartPayload: AionisReplayRunStartRequest = withDefaults(defaults, {
        tenant_id: input.tenant_id,
        scope: input.scope,
        actor: input.actor,
        run_id,
        memory_lane: input.memory_lane ?? "shared",
        goal: input.goal ?? input.text,
        metadata: input.metadata,
      });
      const run_start = await client.memory.replay.run.start(runStartPayload);

      for (let index = 0; index < input.steps.length; index += 1) {
        const step = input.steps[index];
        const beforePayload: AionisReplayStepBeforeRequest = withDefaults(defaults, {
          tenant_id: input.tenant_id,
          scope: input.scope,
          actor: input.actor,
          run_id,
          step_id: step.step_id,
          decision_id: step.decision_id,
          step_index: index + 1,
          tool_name: step.tool_name,
          tool_input: step.tool_input,
          expected_output_signature: step.expected_output_signature,
          preconditions: step.preconditions,
          retry_policy: step.retry_policy,
          safety_level: step.safety_level,
          metadata: step.metadata,
          memory_lane: input.memory_lane ?? "private",
        });
        const before = await client.memory.replay.step.before(beforePayload) as { step_id?: string };

        const afterPayload: AionisReplayStepAfterRequest = withDefaults(defaults, {
          tenant_id: input.tenant_id,
          scope: input.scope,
          actor: input.actor,
          run_id,
          step_id: before.step_id ?? step.step_id,
          step_index: index + 1,
          status: step.status,
          output_signature: step.output_signature,
          postconditions: step.postconditions,
          artifact_refs: step.artifact_refs,
          repair_applied: step.repair_applied,
          repair_note: step.repair_note,
          error: step.error,
          metadata: step.metadata,
          memory_lane: input.memory_lane ?? "private",
        });
        await client.memory.replay.step.after(afterPayload);
      }

      const runEndPayload: AionisReplayRunEndRequest = withDefaults(defaults, {
        tenant_id: input.tenant_id,
        scope: input.scope,
        actor: input.actor,
        run_id,
        status: "success",
        summary: input.summary,
        success_criteria: input.success_criteria,
        metrics: input.metrics,
        metadata: input.metadata,
        memory_lane: input.memory_lane ?? "private",
      });
      const run_end = await client.memory.replay.run.end(runEndPayload);

      let playbook_compile: AionisHostBridgeCompleteResponse["playbook_compile"] = null;
      let playbook_simulation: AionisHostBridgeCompleteResponse["playbook_simulation"] = null;
      const shouldCompile = input.compile_playbook ?? true;

      if (shouldCompile) {
        playbook_compile = await client.memory.replay.playbooks.compileFromRun(withDefaults(defaults, {
          tenant_id: input.tenant_id,
          scope: input.scope,
          actor: input.actor,
          run_id,
          memory_lane: input.memory_lane ?? "private",
          ...(input.compile ?? {}),
        }));

        const playbook_id = (playbook_compile as { playbook_id?: string | null }).playbook_id;
        const shouldSimulate = input.simulate_playbook ?? true;
        if (playbook_id && shouldSimulate) {
          playbook_simulation = await client.memory.replay.playbooks.run(withDefaults(defaults, {
            tenant_id: input.tenant_id,
            scope: input.scope,
            actor: input.actor,
            playbook_id,
            mode: "simulate",
            memory_lane: input.memory_lane ?? "private",
            ...(input.simulate ?? {}),
          }));
        }
      }

      return {
        summary_version: "host_bridge_task_complete_v1",
        task_id: input.task_id,
        replay_run_id: run_id,
        run_start,
        run_end,
        playbook_compile,
        playbook_simulation,
      };
    },
  };
}

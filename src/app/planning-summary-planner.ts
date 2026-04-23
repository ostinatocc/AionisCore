import type {
  ActionRetrievalGateAction,
  ActionRetrievalGateSummary,
  ActionRetrievalUncertaintySummary,
  ActionPacketSummary,
  FirstStepRecommendation,
  KickoffRecommendation,
  PlannerPacketSummarySurface,
  WorkflowLifecycleSummary,
} from "./planning-summary.js";
import { isPromotionReadyWorkflowSignal, summarizePacketEntryLabels } from "./planning-summary-surfaces.js";
import { safeRecordArray, safeStringArray, uniqueStrings } from "./planning-summary-utils.js";

type PatternSignalSummaryLike = {
  candidate_pattern_count: number;
  candidate_pattern_tools: string[];
  trusted_pattern_count: number;
  contested_pattern_count: number;
  trusted_pattern_tools: string[];
  contested_pattern_tools: string[];
};

type ExperienceRecommendationProjectionLike = {
  history_applied: boolean;
  selected_tool: string | null;
  task_family: string | null;
  workflow_signature: string | null;
  policy_memory_id: string | null;
  path_source_kind: "recommended_workflow" | "candidate_workflow" | "none";
  file_path: string | null;
  combined_next_action: string | null;
  action_retrieval_uncertainty: ActionRetrievalUncertaintySummary | null;
};

type RehydrationCandidateLike = {
  anchor_id: string | null;
  anchor_kind: string | null;
  anchor_level: string | null;
  title: string | null;
  summary: string | null;
  mode: "summary_only" | "partial" | "full" | "differential" | null;
  example_call: string | null;
  payload_cost_hint: "low" | "medium" | "high" | null;
};

function resolveActionRetrievalGateAction(
  uncertainty: ActionRetrievalUncertaintySummary | null | undefined,
): ActionRetrievalGateAction | null {
  if (!uncertainty) return null;
  if (uncertainty.recommended_actions.includes("request_operator_review")) return "request_operator_review";
  if (uncertainty.recommended_actions.includes("rehydrate_payload")) return "rehydrate_payload";
  if (uncertainty.recommended_actions.includes("widen_recall")) return "widen_recall";
  if (uncertainty.recommended_actions.includes("inspect_context")) return "inspect_context";
  if (uncertainty.level === "high") return "inspect_context";
  return null;
}

function pickPreferredRehydrationCandidate(
  plannerSurface: PlannerPacketSummarySurface,
): RehydrationCandidateLike | null {
  const candidates = safeRecordArray(plannerSurface.rehydration_candidates);
  for (const candidate of candidates) {
    const mode = candidate.mode;
    const payloadCostHint = candidate.payload_cost_hint;
    return {
      anchor_id: typeof candidate.anchor_id === "string" ? candidate.anchor_id : null,
      anchor_kind: typeof candidate.anchor_kind === "string" ? candidate.anchor_kind : null,
      anchor_level: typeof candidate.anchor_level === "string" ? candidate.anchor_level : null,
      title: typeof candidate.title === "string" ? candidate.title : null,
      summary: typeof candidate.summary === "string" ? candidate.summary : null,
      mode:
        mode === "summary_only" || mode === "partial" || mode === "full" || mode === "differential"
          ? mode
          : null,
      example_call: typeof candidate.example_call === "string" ? candidate.example_call : null,
      payload_cost_hint:
        payloadCostHint === "low" || payloadCostHint === "medium" || payloadCostHint === "high"
          ? payloadCostHint
          : null,
    };
  }
  return null;
}

function buildFallbackGateInstruction(args: {
  gateAction: ActionRetrievalGateAction;
  firstStepRecommendation: FirstStepRecommendation | null;
  preferredRehydration: RehydrationCandidateLike | null;
}): string | null {
  const selectedTool = args.firstStepRecommendation?.selected_tool ?? null;
  const filePath = args.firstStepRecommendation?.file_path ?? null;
  const rehydrationLabel =
    args.preferredRehydration?.title
    ?? args.preferredRehydration?.summary
    ?? args.preferredRehydration?.anchor_id
    ?? "the colder payload";

  if (args.gateAction === "request_operator_review") {
    return selectedTool
      ? `Request operator review before committing to ${selectedTool}.`
      : "Request operator review before committing to the next step.";
  }
  if (args.gateAction === "rehydrate_payload") {
    return filePath
      ? `Rehydrate colder payload for ${rehydrationLabel} before reusing ${selectedTool ?? "the learned path"} on ${filePath}.`
      : `Rehydrate colder payload for ${rehydrationLabel} before committing to the next step.`;
  }
  if (args.gateAction === "widen_recall") {
    return selectedTool
      ? `Widen recall before committing to ${selectedTool}${filePath ? ` on ${filePath}` : ""}.`
      : "Widen recall before committing to the next step.";
  }
  if (selectedTool && filePath) {
    return `Inspect ${filePath} and the current context before using ${selectedTool}.`;
  }
  if (selectedTool) {
    return `Inspect the current context before starting with ${selectedTool}.`;
  }
  return "Inspect the current context before taking the next step.";
}

function shouldEscalateTaskStartFromGate(args: {
  gateAction: ActionRetrievalGateAction;
  firstStepRecommendation: FirstStepRecommendation | null;
}): boolean {
  if (!args.firstStepRecommendation?.selected_tool) return true;
  if (args.gateAction !== "inspect_context") return true;
  return (
    args.firstStepRecommendation.source_kind === "experience_intelligence"
    && !args.firstStepRecommendation.file_path
  );
}

function buildUncertaintyAwareNextAction(args: {
  sourceKind: "experience_intelligence" | "tool_selection";
  selectedTool: string | null;
  filePath: string | null;
  nextAction: string | null;
  uncertainty: ActionRetrievalUncertaintySummary | null;
}): string | null {
  const uncertainty = args.uncertainty;
  if (!uncertainty || uncertainty.level === "low") {
    return (
      args.nextAction
      ?? (args.selectedTool && args.filePath
        ? `Use ${args.selectedTool} on ${args.filePath} as the next step.`
        : args.selectedTool
          ? `Start with ${args.selectedTool} as the next step.`
          : null)
    );
  }

  const recommendedActions = new Set(uncertainty.recommended_actions);
  if (recommendedActions.has("request_operator_review")) {
    return args.selectedTool
      ? `Request operator review before committing to ${args.selectedTool}.`
      : "Request operator review before committing to the next step.";
  }
  if (
    recommendedActions.has("widen_recall")
    && args.sourceKind === "experience_intelligence"
    && !!args.filePath
    && !!args.nextAction
    && !recommendedActions.has("rehydrate_payload")
  ) {
    return args.nextAction;
  }
  if (recommendedActions.has("inspect_context") && (!args.selectedTool || !args.filePath)) {
    if (args.selectedTool) {
      return `Inspect the current context before starting with ${args.selectedTool}.`;
    }
    return args.sourceKind === "experience_intelligence"
      ? "Inspect the current context before reusing the learned path."
      : "Inspect the current context before taking the next step.";
  }
  if (recommendedActions.has("widen_recall") && (!args.filePath || args.sourceKind === "tool_selection")) {
    return args.selectedTool
      ? `Widen recall before committing to ${args.selectedTool}${args.filePath ? ` on ${args.filePath}` : ""}.`
      : "Widen recall before committing to the next step.";
  }
  if (recommendedActions.has("rehydrate_payload")) {
    return args.filePath
      ? `Rehydrate colder payload before reusing ${args.selectedTool ?? "the learned path"} on ${args.filePath}.`
      : "Rehydrate colder payload before committing to the next step.";
  }
  if (recommendedActions.has("widen_recall")) {
    return args.selectedTool
      ? `Widen recall before committing to ${args.selectedTool}${args.filePath ? ` on ${args.filePath}` : ""}.`
      : "Widen recall before committing to the next step.";
  }
  if (recommendedActions.has("inspect_context")) {
    if (args.selectedTool && args.filePath) {
      return `Inspect ${args.filePath} and the current context before using ${args.selectedTool}.`;
    }
    if (args.selectedTool) {
      return `Inspect the current context before starting with ${args.selectedTool}.`;
    }
    return args.sourceKind === "experience_intelligence"
      ? "Inspect the current context before reusing the learned path."
      : "Inspect the current context before taking the next step.";
  }

  return (
    args.nextAction
    ?? (args.selectedTool && args.filePath
      ? `Use ${args.selectedTool} on ${args.filePath} as the next step.`
      : args.selectedTool
        ? `Start with ${args.selectedTool} as the next step.`
        : null)
  );
}

export function buildPlannerExplanation(args: {
  selectedTool: string | null;
  decision: Record<string, unknown>;
  patternSignalSummary: PatternSignalSummaryLike;
  plannerSurface: PlannerPacketSummarySurface;
  actionPacketSummary: ActionPacketSummary;
  workflowLifecycleSummary: WorkflowLifecycleSummary;
  actionRetrievalUncertainty?: ActionRetrievalUncertaintySummary | null;
}): string | null {
  const patternSummary =
    args.decision.pattern_summary && typeof args.decision.pattern_summary === "object"
      ? (args.decision.pattern_summary as Record<string, unknown>)
      : {};
  const actionPacket =
    args.plannerSurface.action_recall_packet && typeof args.plannerSurface.action_recall_packet === "object"
      ? (args.plannerSurface.action_recall_packet as Record<string, unknown>)
      : {};
  const workflowLabels = summarizePacketEntryLabels(safeRecordArray(actionPacket.recommended_workflows), "title");
  const candidateWorkflowEntries = safeRecordArray(actionPacket.candidate_workflows);
  const candidateWorkflowLabels = summarizePacketEntryLabels(candidateWorkflowEntries, "title");
  const readyCandidateWorkflowLabels = summarizePacketEntryLabels(
    candidateWorkflowEntries.filter((entry) => isPromotionReadyWorkflowSignal(entry)),
    "title",
  );
  const rehydrationLabels = summarizePacketEntryLabels(safeRecordArray(actionPacket.rehydration_candidates), "title");
  const usedTrustedPatternTools = uniqueStrings(safeStringArray(patternSummary.used_trusted_pattern_tools));
  const skippedContestedPatternTools = uniqueStrings(safeStringArray(patternSummary.skipped_contested_pattern_tools));
  const selectedTool = args.selectedTool;
  if (
    !selectedTool
    && usedTrustedPatternTools.length === 0
    && skippedContestedPatternTools.length === 0
    && args.actionPacketSummary.recommended_workflow_count === 0
    && args.actionPacketSummary.candidate_workflow_count === 0
    && args.actionPacketSummary.rehydration_candidate_count === 0
    && args.actionPacketSummary.supporting_knowledge_count === 0
  ) {
    return null;
  }
  const parts: string[] = [];
  if (args.actionPacketSummary.recommended_workflow_count > 0) {
    const workflowLead =
      workflowLabels.length > 0
        ? `workflow guidance: ${workflowLabels.join(", ")}`
        : `workflow guidance: ${args.actionPacketSummary.recommended_workflow_count} recommended`;
    parts.push(workflowLead);
  }
  if (args.actionPacketSummary.candidate_workflow_count > 0) {
    if (args.workflowLifecycleSummary.promotion_ready_count > 0) {
      const readyWorkflowLead =
        readyCandidateWorkflowLabels.length > 0
          ? `promotion-ready workflow candidates: ${readyCandidateWorkflowLabels.join(", ")}`
          : `promotion-ready workflow candidates: ${args.workflowLifecycleSummary.promotion_ready_count}`;
      parts.push(readyWorkflowLead);
    }
    const remainingCandidateCount = Math.max(
      0,
      args.actionPacketSummary.candidate_workflow_count - args.workflowLifecycleSummary.promotion_ready_count,
    );
    if (remainingCandidateCount > 0) {
      const nonReadyCandidateLabels = summarizePacketEntryLabels(
        candidateWorkflowEntries.filter((entry) => !isPromotionReadyWorkflowSignal(entry)),
        "title",
      );
      const candidateWorkflowLead =
        nonReadyCandidateLabels.length > 0
          ? `candidate workflows visible but not yet promoted: ${nonReadyCandidateLabels.join(", ")}`
          : candidateWorkflowLabels.length > 0
            ? `candidate workflows visible but not yet promoted: ${candidateWorkflowLabels.join(", ")}`
            : `candidate workflows visible but not yet promoted: ${remainingCandidateCount}`;
      parts.push(candidateWorkflowLead);
    }
  }
  if (selectedTool) {
    parts.push(`selected tool: ${selectedTool}`);
  }
  if (usedTrustedPatternTools.length > 0) {
    parts.push(`trusted pattern support: ${usedTrustedPatternTools.join(", ")}`);
  } else if (args.patternSignalSummary.trusted_pattern_count > 0) {
    parts.push(`trusted patterns available but not used: ${args.patternSignalSummary.trusted_pattern_tools.join(", ")}`);
  }
  if (args.patternSignalSummary.candidate_pattern_count > 0) {
    parts.push(`candidate patterns visible but not yet trusted: ${args.patternSignalSummary.candidate_pattern_tools.join(", ")}`);
  }
  if (skippedContestedPatternTools.length > 0) {
    parts.push(`contested patterns visible but not trusted: ${skippedContestedPatternTools.join(", ")}`);
  } else if (args.patternSignalSummary.contested_pattern_count > 0) {
    parts.push(`contested patterns visible but not trusted: ${args.patternSignalSummary.contested_pattern_tools.join(", ")}`);
  }
  if (args.actionPacketSummary.rehydration_candidate_count > 0) {
    const rehydrationLead =
      rehydrationLabels.length > 0
        ? `rehydration available: ${rehydrationLabels.join(", ")}`
        : `rehydration available: ${args.actionPacketSummary.rehydration_candidate_count} candidate`;
    parts.push(rehydrationLead);
  }
  if (args.actionPacketSummary.supporting_knowledge_count > 0) {
    parts.push(`supporting knowledge appended: ${args.actionPacketSummary.supporting_knowledge_count}`);
  }
  if (args.actionRetrievalUncertainty && args.actionRetrievalUncertainty.level !== "low") {
    const uncertaintyLead = [
      `action retrieval uncertainty: ${args.actionRetrievalUncertainty.level}`,
      args.actionRetrievalUncertainty.reasons[0] ?? null,
      args.actionRetrievalUncertainty.recommended_actions.length > 0
        ? `recommended follow-up: ${args.actionRetrievalUncertainty.recommended_actions.join(", ")}`
        : null,
    ].filter((value): value is string => !!value).join("; ");
    if (uncertaintyLead) parts.push(uncertaintyLead);
  }
  if (parts.length === 0) return null;
  return parts.join("; ");
}

export function buildActionRetrievalGate(args: {
  firstStepRecommendation: FirstStepRecommendation | null;
  plannerSurface: PlannerPacketSummarySurface;
  uncertainty: ActionRetrievalUncertaintySummary | null;
}): ActionRetrievalGateSummary | null {
  const gateAction = resolveActionRetrievalGateAction(args.uncertainty);
  if (!gateAction || !args.uncertainty) return null;
  const preferredRehydration = gateAction === "rehydrate_payload"
    ? pickPreferredRehydrationCandidate(args.plannerSurface)
    : null;
  const recommendedActions = args.uncertainty.recommended_actions.filter(
    (entry): entry is ActionRetrievalGateAction => entry !== "proceed",
  );
  if (!recommendedActions.includes(gateAction)) {
    recommendedActions.unshift(gateAction);
  }
  return {
    summary_version: "action_retrieval_gate_v1",
    gate_action: gateAction,
    escalates_task_start: shouldEscalateTaskStartFromGate({
      gateAction,
      firstStepRecommendation: args.firstStepRecommendation,
    }),
    confidence: args.uncertainty.confidence,
    primary_reason: args.uncertainty.reasons[0] ?? null,
    recommended_actions: recommendedActions,
    instruction:
      args.firstStepRecommendation?.next_action
      ?? buildFallbackGateInstruction({
        gateAction,
        firstStepRecommendation: args.firstStepRecommendation,
        preferredRehydration,
      }),
    rehydration_candidate_count: safeRecordArray(args.plannerSurface.rehydration_candidates).length,
    preferred_rehydration: preferredRehydration,
  };
}

export function buildFirstStepRecommendation(args: {
  selectedTool: string | null;
  experienceSummary: ExperienceRecommendationProjectionLike | null;
}): FirstStepRecommendation | null {
  const experience = args.experienceSummary;
  if (
    experience
    && (
      experience.history_applied
      || experience.path_source_kind !== "none"
      || !!experience.file_path
      || !!experience.combined_next_action
      || !!experience.action_retrieval_uncertainty
    )
  ) {
    const selectedTool = experience.selected_tool ?? args.selectedTool ?? null;
    return {
      source_kind: "experience_intelligence",
      history_applied: experience.history_applied,
      selected_tool: selectedTool,
      task_family: experience.task_family,
      workflow_signature: experience.workflow_signature,
      policy_memory_id: experience.policy_memory_id,
      file_path: experience.file_path,
      next_action: buildUncertaintyAwareNextAction({
        sourceKind: "experience_intelligence",
        selectedTool,
        filePath: experience.file_path,
        nextAction: experience.combined_next_action,
        uncertainty: experience.action_retrieval_uncertainty,
      }),
    };
  }
  if (!args.selectedTool) return null;
  return {
    source_kind: "tool_selection",
    history_applied: false,
    selected_tool: args.selectedTool,
    task_family: null,
    workflow_signature: null,
    policy_memory_id: null,
    file_path: null,
    next_action: buildUncertaintyAwareNextAction({
      sourceKind: "tool_selection",
      selectedTool: args.selectedTool,
      filePath: null,
      nextAction: null,
      uncertainty: experience?.action_retrieval_uncertainty ?? null,
    }),
  };
}

export function buildKickoffRecommendation(
  firstStepRecommendation: FirstStepRecommendation | null | undefined,
): KickoffRecommendation | null {
  if (!firstStepRecommendation) return null;
  return {
    source_kind: firstStepRecommendation.source_kind,
    history_applied: firstStepRecommendation.history_applied,
    selected_tool: firstStepRecommendation.selected_tool,
    task_family: firstStepRecommendation.task_family,
    workflow_signature: firstStepRecommendation.workflow_signature,
    policy_memory_id: firstStepRecommendation.policy_memory_id,
    file_path: firstStepRecommendation.file_path,
    next_action: firstStepRecommendation.next_action,
  };
}

export function buildKickoffRecommendationFromExperience(args: {
  historyApplied: boolean;
  selectedTool: string | null;
  taskFamily: string | null;
  workflowSignature: string | null;
  policyMemoryId: string | null;
  filePath: string | null;
  nextAction: string | null;
  uncertainty?: ActionRetrievalUncertaintySummary | null;
}): KickoffRecommendation | null {
  if (!args.selectedTool && !args.filePath && !args.nextAction && !args.uncertainty) return null;
  return {
    source_kind: args.historyApplied ? "experience_intelligence" : "tool_selection",
    history_applied: args.historyApplied,
    selected_tool: args.selectedTool,
    task_family: args.taskFamily,
    workflow_signature: args.workflowSignature,
    policy_memory_id: args.policyMemoryId,
    file_path: args.filePath,
    next_action: buildUncertaintyAwareNextAction({
      sourceKind: args.historyApplied ? "experience_intelligence" : "tool_selection",
      selectedTool: args.selectedTool,
      filePath: args.filePath,
      nextAction: args.nextAction,
      uncertainty: args.uncertainty ?? null,
    }),
  };
}

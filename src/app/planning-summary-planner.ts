import type {
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
  path_source_kind: "recommended_workflow" | "candidate_workflow" | "none";
  file_path: string | null;
  combined_next_action: string | null;
};

export function buildPlannerExplanation(args: {
  selectedTool: string | null;
  decision: Record<string, unknown>;
  patternSignalSummary: PatternSignalSummaryLike;
  plannerSurface: PlannerPacketSummarySurface;
  actionPacketSummary: ActionPacketSummary;
  workflowLifecycleSummary: WorkflowLifecycleSummary;
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
  if (parts.length === 0) return null;
  return parts.join("; ");
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
    )
  ) {
    const selectedTool = experience.selected_tool ?? args.selectedTool ?? null;
    return {
      source_kind: "experience_intelligence",
      history_applied: experience.history_applied,
      selected_tool: selectedTool,
      file_path: experience.file_path,
      next_action:
        experience.combined_next_action
        ?? (selectedTool && experience.file_path
          ? `Use ${selectedTool} on ${experience.file_path} as the next step.`
          : selectedTool
            ? `Start with ${selectedTool} as the next step.`
            : null),
    };
  }
  if (!args.selectedTool) return null;
  return {
    source_kind: "tool_selection",
    history_applied: false,
    selected_tool: args.selectedTool,
    file_path: null,
    next_action: `Start with ${args.selectedTool} as the next step.`,
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
    file_path: firstStepRecommendation.file_path,
    next_action: firstStepRecommendation.next_action,
  };
}

export function buildKickoffRecommendationFromExperience(args: {
  historyApplied: boolean;
  selectedTool: string | null;
  filePath: string | null;
  nextAction: string | null;
}): KickoffRecommendation | null {
  if (!args.selectedTool && !args.filePath && !args.nextAction) return null;
  return {
    source_kind: args.historyApplied ? "experience_intelligence" : "tool_selection",
    history_applied: args.historyApplied,
    selected_tool: args.selectedTool,
    file_path: args.filePath,
    next_action:
      args.nextAction
      ?? (args.selectedTool && args.filePath
        ? `Use ${args.selectedTool} on ${args.filePath} as the next step.`
        : args.selectedTool
          ? `Start with ${args.selectedTool} as the next step.`
          : null),
  };
}

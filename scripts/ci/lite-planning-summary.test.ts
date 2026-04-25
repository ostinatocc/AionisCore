import test from "node:test";
import assert from "node:assert/strict";
import {
  buildExecutionMemorySummaryBundle,
  buildAssemblySummary,
  buildExecutionSummarySurface,
  buildPlanningSummary,
  summarizeActionRecallPacket,
  summarizeDistillationSignalSurface,
  summarizePolicyLifecycleSurface,
  summarizePolicyMaintenanceSurface,
  summarizeWorkflowSignalSurface,
  summarizeWorkflowLifecycleSurface,
  summarizeWorkflowMaintenanceSurface,
  summarizeAuthorityVisibilitySurface,
  summarizePatternSignals,
} from "../../src/app/planning-summary.ts";
import { resolveContractTrustForSteering } from "../../src/memory/contract-trust.ts";
import { buildExecutionContractFromProjection } from "../../src/memory/execution-contract.ts";
import {
  ExecutionCollaborationRoutingSummarySchema,
  ExecutionCollaborationSummarySchema,
  ExecutionContinuitySnapshotSummarySchema,
  ExecutionDelegationRecordsSummarySchema,
  ExecutionForgettingSummarySchema,
  ExecutionInstrumentationSummarySchema,
  ExecutionMaintenanceSummarySchema,
  ExecutionPacketAssemblySummarySchema,
  ExecutionRoutingSignalSummarySchema,
  ExecutionStrategySummarySchema,
  ExecutionSummaryV1Schema,
} from "../../src/memory/schemas.ts";

const layeredContextFixture = {
  action_recall_packet: {
    packet_version: "action_recall_v1",
    recommended_workflows: [
      {
        anchor_id: "wf_123",
        uri: "aionis://default/default/procedure/wf_123",
        type: "procedure",
        title: "Fix export failure",
        summary: "Inspect failing test and patch export",
        anchor_level: "L2",
        source_kind: "playbook",
        promotion_origin: "replay_promote",
        required_observations: 2,
        observed_count: 2,
        last_transition: "promoted_to_stable",
        last_transition_at: "2026-03-20T00:00:00Z",
        rehydration_default_mode: "partial",
        tool_set: ["edit", "test"],
        maintenance_state: "retain",
        offline_priority: "retain_workflow",
        last_maintenance_at: "2026-03-20T00:00:00Z",
        confidence: 0.72,
      },
    ],
    candidate_workflows: [
      {
        anchor_id: "wf_candidate_1",
        uri: "aionis://default/default/event/wf_candidate_1",
        type: "event",
        title: "Replay Episode: Fix export failure",
        summary: "Replay repair learning episode for export failure",
        anchor_level: "L1",
        promotion_state: "candidate",
        source_kind: "playbook",
        promotion_origin: "replay_learning_episode",
        required_observations: 2,
        observed_count: 1,
        last_transition: "candidate_observed",
        last_transition_at: "2026-03-20T00:00:00Z",
        rehydration_default_mode: null,
        tool_set: ["edit", "test"],
        maintenance_state: "observe",
        offline_priority: "promote_candidate",
        last_maintenance_at: "2026-03-20T00:00:00Z",
        confidence: 0.61,
      },
    ],
    candidate_patterns: [],
    trusted_patterns: [
      {
        anchor_id: "p_stable",
        uri: "aionis://default/default/concept/p_stable",
        type: "concept",
        title: "Prefer edit for export repair",
        summary: "Stable edit pattern",
        anchor_level: "L3",
        selected_tool: "edit",
        pattern_state: "stable",
        credibility_state: "trusted",
        last_transition: "promoted_to_trusted",
        distinct_run_count: 2,
        required_distinct_runs: 2,
        trusted: true,
        confidence: 0.81,
      },
    ],
    contested_patterns: [
      {
        anchor_id: "p_contested",
        uri: "aionis://default/default/concept/p_contested",
        type: "concept",
        title: "Prefer bash for export repair",
        summary: "Contested bash pattern",
        anchor_level: "L3",
        selected_tool: "bash",
        pattern_state: "provisional",
        credibility_state: "contested",
        distinct_run_count: 2,
        required_distinct_runs: 2,
        trusted: false,
        counter_evidence_open: true,
        last_transition: "counter_evidence_opened",
        confidence: 0.54,
      },
    ],
    rehydration_candidates: [
      {
        anchor_id: "wf_123",
        anchor_uri: "aionis://default/default/procedure/wf_123",
        anchor_kind: "workflow",
        anchor_level: "L2",
        title: "Fix export failure",
        summary: "Inspect failing test and patch export",
        mode: "partial",
        payload_cost_hint: "medium",
        recommended_when: ["missing_log_detail"],
        trusted: false,
        selected_tool: null,
        example_call: "rehydrate_payload(anchor_id='wf_123', mode='partial')",
      },
    ],
    supporting_knowledge: [
      {
        node_id: "k_123",
        uri: "aionis://default/default/concept/k_123",
        kind: "concept",
        title: "Exports often break on stale default export wiring",
        summary: "Generic export debugging note",
        lifecycle_state: "retired",
        semantic_forgetting_action: "archive",
        archive_relocation_state: "cold_archive",
        archive_relocation_target: "local_cold_store",
        archive_payload_scope: "anchor_payload",
        rehydration_default_mode: "differential",
        confidence: 0.42,
      },
    ],
  },
  pattern_signals: [
    {
      anchor_id: "p_stable",
      anchor_level: "L3",
      selected_tool: "edit",
      pattern_state: "stable",
      credibility_state: "trusted",
      trusted: true,
      distinct_run_count: 2,
      required_distinct_runs: 2,
      counter_evidence_count: 0,
      counter_evidence_open: false,
      summary: "Stable edit pattern",
    },
    {
      anchor_id: "p_contested",
      anchor_level: "L3",
      selected_tool: "bash",
      pattern_state: "provisional",
      credibility_state: "contested",
      trusted: false,
      distinct_run_count: 2,
      required_distinct_runs: 2,
      counter_evidence_count: 1,
      counter_evidence_open: true,
      summary: "Contested bash pattern",
    },
  ],
  workflow_signals: [
    {
      anchor_id: "wf_123",
      anchor_level: "L2",
      title: "Fix export failure",
      summary: "Inspect failing test and patch export",
      promotion_state: "stable",
      promotion_ready: false,
      observed_count: 2,
      required_observations: 2,
      source_kind: "playbook",
      promotion_origin: "replay_promote",
      last_transition: "promoted_to_stable",
      maintenance_state: "retain",
      offline_priority: "retain_workflow",
      last_maintenance_at: "2026-03-20T00:00:00Z",
    },
    {
      anchor_id: "wf_candidate_1",
      anchor_level: "L1",
      title: "Replay Episode: Fix export failure",
      summary: "Replay repair learning episode for export failure",
      promotion_state: "candidate",
      promotion_ready: false,
      observed_count: 1,
      required_observations: 2,
      source_kind: "playbook",
      promotion_origin: "replay_learning_episode",
      last_transition: "candidate_observed",
      maintenance_state: "observe",
      offline_priority: "promote_candidate",
      last_maintenance_at: "2026-03-20T00:00:00Z",
    },
  ],
  stats: {
    forgotten_items: 1,
  },
  static_injection: {
    selected_blocks: 2,
  },
};

test("contract trust steering requires explicit authoritative trust and outcome signal", () => {
  const targetOnlyContract = buildExecutionContractFromProjection({
    contract_trust: "authoritative",
    target_files: ["src/routes/export.ts"],
    provenance: {
      source_kind: "manual_context",
    },
  });
  const outcomeContract = buildExecutionContractFromProjection({
    contract_trust: "authoritative",
    target_files: ["src/routes/export.ts"],
    acceptance_checks: ["npm run -s test:lite -- export"],
    provenance: {
      source_kind: "manual_context",
    },
  });
  const incompleteServiceContract = buildExecutionContractFromProjection({
    contract_trust: "authoritative",
    service_lifecycle_constraints: [
      {
        version: 1,
        service_kind: "process",
        label: "background package index",
        launch_reference: "python -m pypi_server -p 8080 ./packages",
        endpoint: null,
        must_survive_agent_exit: false,
        revalidate_from_fresh_shell: true,
        detach_then_probe: true,
        health_checks: [],
        teardown_notes: [],
      },
    ],
    success_invariants: ["service_process_started"],
    provenance: {
      source_kind: "manual_context",
    },
  });
  const serviceOutcomeContract = buildExecutionContractFromProjection({
    contract_trust: "authoritative",
    service_lifecycle_constraints: [
      {
        version: 1,
        service_kind: "http",
        label: "local package index",
        launch_reference: "python -m pypi_server -p 8080 ./packages",
        endpoint: "http://localhost:8080/simple/",
        must_survive_agent_exit: true,
        revalidate_from_fresh_shell: true,
        detach_then_probe: true,
        health_checks: ["curl -fsS http://localhost:8080/simple/"],
        teardown_notes: [],
      },
    ],
    success_invariants: ["clean_client_install_succeeds"],
    must_hold_after_exit: ["service_survives_agent_exit:local package index"],
    external_visibility_requirements: ["endpoint_reachable:http://localhost:8080/simple/"],
    provenance: {
      source_kind: "manual_context",
    },
  });
  const thinContract = buildExecutionContractFromProjection({
    contract_trust: "authoritative",
    workflow_signature: "execution_workflow:thin",
    provenance: {
      source_kind: "manual_context",
    },
  });

  assert.equal(
    resolveContractTrustForSteering({
      computedTrust: "authoritative",
      explicitTrust: null,
      executionContract: outcomeContract,
    }),
    "advisory",
  );
  assert.equal(
    resolveContractTrustForSteering({
      computedTrust: "authoritative",
      explicitTrust: "authoritative",
      executionContract: thinContract,
    }),
    "advisory",
  );
  assert.equal(
    resolveContractTrustForSteering({
      computedTrust: "authoritative",
      explicitTrust: "authoritative",
      executionContract: targetOnlyContract,
    }),
    "advisory",
  );
  assert.equal(
    resolveContractTrustForSteering({
      computedTrust: "authoritative",
      explicitTrust: "authoritative",
      executionContract: outcomeContract,
    }),
    "authoritative",
  );
  assert.equal(
    resolveContractTrustForSteering({
      computedTrust: "authoritative",
      explicitTrust: "authoritative",
      executionContract: incompleteServiceContract,
    }),
    "advisory",
  );
  assert.equal(
    resolveContractTrustForSteering({
      computedTrust: "authoritative",
      explicitTrust: "authoritative",
      executionContract: serviceOutcomeContract,
    }),
    "authoritative",
  );
  assert.equal(
    resolveContractTrustForSteering({
      computedTrust: "authoritative",
      explicitTrust: "observational",
      executionContract: outcomeContract,
    }),
    "observational",
  );
});

test("summarizePatternSignals splits trusted and contested pattern signals", () => {
  const summary = summarizePatternSignals(layeredContextFixture);
  assert.equal(summary.candidate_pattern_count, 0);
  assert.equal(summary.trusted_pattern_count, 1);
  assert.equal(summary.contested_pattern_count, 1);
  assert.deepEqual(summary.candidate_pattern_tools, []);
  assert.deepEqual(summary.trusted_pattern_tools, ["edit"]);
  assert.deepEqual(summary.contested_pattern_tools, ["bash"]);
});

test("summarizeActionRecallPacket reports execution-memory-first packet sections", () => {
  const summary = summarizeActionRecallPacket(layeredContextFixture);
  assert.equal(summary.recommended_workflow_count, 1);
  assert.equal(summary.candidate_workflow_count, 1);
  assert.equal(summary.candidate_pattern_count, 0);
  assert.equal(summary.trusted_pattern_count, 1);
  assert.equal(summary.contested_pattern_count, 1);
  assert.equal(summary.rehydration_candidate_count, 1);
  assert.equal(summary.supporting_knowledge_count, 1);
  assert.deepEqual(summary.workflow_anchor_ids, ["wf_123"]);
  assert.deepEqual(summary.candidate_workflow_anchor_ids, ["wf_candidate_1"]);
  assert.deepEqual(summary.candidate_pattern_anchor_ids, []);
  assert.deepEqual(summary.trusted_pattern_anchor_ids, ["p_stable"]);
  assert.deepEqual(summary.contested_pattern_anchor_ids, ["p_contested"]);
  assert.deepEqual(summary.rehydration_anchor_ids, ["wf_123"]);
});

test("buildExecutionMemorySummaryBundle aligns all execution-memory summaries from one surface", () => {
  const bundle = buildExecutionMemorySummaryBundle({
    action_recall_packet: layeredContextFixture.action_recall_packet,
    pattern_signals: layeredContextFixture.pattern_signals,
    workflow_signals: layeredContextFixture.workflow_signals,
    recommended_workflows: layeredContextFixture.action_recall_packet.recommended_workflows,
    candidate_workflows: layeredContextFixture.action_recall_packet.candidate_workflows,
    candidate_patterns: layeredContextFixture.action_recall_packet.candidate_patterns,
    trusted_patterns: layeredContextFixture.action_recall_packet.trusted_patterns,
    contested_patterns: layeredContextFixture.action_recall_packet.contested_patterns,
    rehydration_candidates: layeredContextFixture.action_recall_packet.rehydration_candidates,
    supporting_knowledge: layeredContextFixture.action_recall_packet.supporting_knowledge,
  });
  assert.deepEqual(bundle.pattern_signal_summary, summarizePatternSignals(layeredContextFixture));
  assert.deepEqual(bundle.workflow_signal_summary, summarizeWorkflowSignalSurface({
    action_recall_packet: layeredContextFixture.action_recall_packet,
    workflow_signals: layeredContextFixture.workflow_signals,
    recommended_workflows: layeredContextFixture.action_recall_packet.recommended_workflows,
    candidate_workflows: layeredContextFixture.action_recall_packet.candidate_workflows,
  }));
  assert.deepEqual(bundle.workflow_lifecycle_summary, summarizeWorkflowLifecycleSurface({
    action_recall_packet: layeredContextFixture.action_recall_packet,
    recommended_workflows: layeredContextFixture.action_recall_packet.recommended_workflows,
    candidate_workflows: layeredContextFixture.action_recall_packet.candidate_workflows,
  }));
  assert.deepEqual(bundle.workflow_maintenance_summary, summarizeWorkflowMaintenanceSurface({
    action_recall_packet: layeredContextFixture.action_recall_packet,
    recommended_workflows: layeredContextFixture.action_recall_packet.recommended_workflows,
    candidate_workflows: layeredContextFixture.action_recall_packet.candidate_workflows,
  }));
  assert.deepEqual(bundle.action_packet_summary, summarizeActionRecallPacket(layeredContextFixture));
});

test("workflow lifecycle and maintenance summaries reflect stable replay workflow guidance", () => {
  const lifecycle = summarizeWorkflowLifecycleSurface(layeredContextFixture);
  const maintenance = summarizeWorkflowMaintenanceSurface(layeredContextFixture);
  assert.deepEqual(lifecycle, {
    candidate_count: 1,
    stable_count: 1,
    replay_source_count: 2,
    rehydration_ready_count: 1,
    promotion_ready_count: 0,
    transition_counts: {
      candidate_observed: 1,
      promoted_to_stable: 1,
      normalized_latest_stable: 0,
    },
  });
  assert.deepEqual(maintenance, {
    model: "lazy_online_v1",
    observe_count: 1,
    retain_count: 1,
    promote_candidate_count: 1,
    retain_workflow_count: 1,
  });
});

test("workflow signal summary separates stable, promotion-ready, and observing workflows", () => {
  const summary = summarizeWorkflowSignalSurface(layeredContextFixture);
  assert.deepEqual(summary, {
    stable_workflow_count: 1,
    promotion_ready_workflow_count: 0,
    observing_workflow_count: 1,
    stable_workflow_titles: ["Fix export failure"],
    promotion_ready_workflow_titles: [],
    observing_workflow_titles: ["Replay Episode: Fix export failure"],
  });
});

test("authority visibility summary exposes blocked authoritative workflow evidence", () => {
  const authorityFixture = structuredClone(layeredContextFixture);
  const candidateWorkflow = (authorityFixture.action_recall_packet.candidate_workflows as any[])[0];
  candidateWorkflow.authority_visibility = {
    surface_version: "runtime_authority_visibility_v1",
    node_id: "wf_candidate_1",
    node_kind: "workflow",
    title: "Replay Episode: Fix export failure",
    requested_trust: "authoritative",
    effective_trust: "advisory",
    status: "insufficient",
    allows_authoritative: false,
    allows_stable_promotion: false,
    authority_blocked: true,
    stable_promotion_blocked: true,
    primary_blocker: "execution_evidence:after_exit_revalidation_failed",
    authority_reasons: ["execution_evidence:after_exit_revalidation_failed"],
    outcome_contract_reasons: [],
    execution_evidence_reasons: ["after_exit_revalidation_failed"],
    execution_evidence_status: "failed",
    false_confidence_detected: true,
  };

  const directSummary = summarizeAuthorityVisibilitySurface({
    candidate_workflows: authorityFixture.action_recall_packet.candidate_workflows,
  });
  assert.equal(directSummary.surface_count, 1);
  assert.equal(directSummary.authoritative_blocked_count, 1);
  assert.equal(directSummary.stable_promotion_blocked_count, 1);
  assert.equal(directSummary.execution_evidence_failed_count, 1);
  assert.equal(directSummary.false_confidence_count, 1);
  assert.deepEqual(directSummary.top_blockers, ["execution_evidence:after_exit_revalidation_failed"]);

  const planning = buildPlanningSummary({
    tools: {
      selection: { selected: "edit" },
      decision: {
        decision_id: "d_authority_visibility",
        pattern_summary: {
          used_trusted_pattern_tools: ["edit"],
          skipped_contested_pattern_tools: ["bash"],
        },
      },
    },
    layered_context: authorityFixture,
    cost_signals: null,
    context_est_tokens: 320,
    context_compaction_profile: "balanced",
    optimization_profile: "balanced",
    recall_mode: "balanced",
  });
  assert.equal(planning.authority_visibility_summary.authoritative_blocked_count, 1);
  assert.equal(planning.authority_visibility_summary.execution_evidence_failed_count, 1);
  assert.match(planning.planner_explanation ?? "", /authority blocked: 1; blocker=execution_evidence:after_exit_revalidation_failed/);
  assert.match(planning.planner_explanation ?? "", /execution evidence failed: 1/);
});

test("policy lifecycle and maintenance summaries reflect persisted policy memory state", () => {
  const policyFixture = structuredClone(layeredContextFixture);
  (policyFixture.action_recall_packet.supporting_knowledge as any[]).push(
    {
      kind: "policy_memory",
      summary_kind: "policy_memory",
      node_id: "pm_active_default",
      selected_tool: "edit",
      policy_state: "stable",
      policy_memory_state: "active",
      activation_mode: "default",
      materialization_state: "persisted",
      maintenance_state: "retain",
      offline_priority: "retain_active_policy",
      last_transition: "materialized",
    },
    {
      kind: "policy_memory",
      summary_kind: "policy_memory",
      node_id: "pm_contested_hint",
      selected_tool: "bash",
      policy_state: "candidate",
      policy_memory_state: "contested",
      activation_mode: "hint",
      materialization_state: "persisted",
      maintenance_state: "review",
      offline_priority: "review_contested_policy",
      last_transition: "contested_by_feedback",
    },
  );

  assert.deepEqual(summarizePolicyLifecycleSurface(policyFixture), {
    persisted_count: 2,
    active_count: 1,
    contested_count: 1,
    retired_count: 0,
    default_mode_count: 1,
    hint_mode_count: 1,
    stable_policy_count: 1,
    transition_counts: {
      materialized: 1,
      refreshed: 0,
      contested_by_feedback: 1,
      retired_by_feedback: 0,
      retired_by_governance: 0,
      reactivated_by_governance: 0,
    },
  });
  assert.deepEqual(summarizePolicyMaintenanceSurface(policyFixture), {
    model: "lazy_online_v1",
    observe_count: 0,
    retain_count: 1,
    review_count: 1,
    promote_to_default_count: 0,
    retain_active_policy_count: 1,
    review_contested_policy_count: 1,
    retire_policy_count: 0,
    reactivate_policy_count: 0,
  });
});

test("distillation summary counts workflow and policy promotion targets", () => {
  const distillationFixture = structuredClone(layeredContextFixture);
  (distillationFixture.action_recall_packet.supporting_knowledge as any[]).push(
    {
      kind: "distilled_fact",
      summary_kind: "write_distillation_fact",
      distillation_origin: "write_distillation_input_text",
      preferred_promotion_target: "policy",
    },
  );
  const summary = summarizeDistillationSignalSurface(distillationFixture);
  assert.equal(summary.distilled_fact_count, 1);
  assert.equal(summary.promotion_target_counts.policy, 1);
});

test("buildPlanningSummary includes pattern trust totals and tool lists", () => {
  const summary = buildPlanningSummary({
    rules: { considered: 5, matched: 2 },
    tools: {
      selection: { selected: "edit" },
      decision: {
        decision_id: "d_123",
        pattern_summary: {
          used_trusted_pattern_tools: ["edit"],
          skipped_contested_pattern_tools: ["bash"],
        },
      },
    },
    layered_context: layeredContextFixture,
    cost_signals: {
      selected_memory_layers: ["L2", "L3"],
      primary_savings_levers: ["anchor_first_recall"],
    },
    context_est_tokens: 512,
    context_compaction_profile: "balanced",
    optimization_profile: "balanced",
    recall_mode: "tool_first",
  });
  assert.equal(summary.trusted_pattern_count, 1);
  assert.equal(summary.contested_pattern_count, 1);
  assert.deepEqual(summary.trusted_pattern_tools, ["edit"]);
  assert.deepEqual(summary.contested_pattern_tools, ["bash"]);
  assert.deepEqual(summary.workflow_lifecycle_summary, {
    candidate_count: 1,
    stable_count: 1,
    replay_source_count: 2,
    rehydration_ready_count: 1,
    promotion_ready_count: 0,
    transition_counts: {
      candidate_observed: 1,
      promoted_to_stable: 1,
      normalized_latest_stable: 0,
    },
  });
  assert.deepEqual(summary.workflow_maintenance_summary, {
    model: "lazy_online_v1",
    observe_count: 1,
    retain_count: 1,
    promote_candidate_count: 1,
    retain_workflow_count: 1,
  });
  assert.deepEqual(summary.workflow_signal_summary, {
    stable_workflow_count: 1,
    promotion_ready_workflow_count: 0,
    observing_workflow_count: 1,
    stable_workflow_titles: ["Fix export failure"],
    promotion_ready_workflow_titles: [],
    observing_workflow_titles: ["Replay Episode: Fix export failure"],
  });
  assert.equal(summary.pattern_lifecycle_summary.candidate_count, 0);
  assert.equal(summary.pattern_lifecycle_summary.trusted_count, 1);
  assert.equal(summary.pattern_lifecycle_summary.contested_count, 1);
  assert.equal(summary.pattern_lifecycle_summary.near_promotion_count, 0);
  assert.equal(summary.pattern_lifecycle_summary.counter_evidence_open_count, 1);
  assert.deepEqual(summary.pattern_lifecycle_summary.transition_counts, {
    candidate_observed: 0,
    promoted_to_trusted: 1,
    counter_evidence_opened: 1,
    revalidated_to_trusted: 0,
  });
  assert.deepEqual(summary.pattern_maintenance_summary, {
    model: "lazy_online_v1",
    observe_count: 0,
    retain_count: 1,
    review_count: 1,
    promote_candidate_count: 0,
    review_counter_evidence_count: 1,
    retain_trusted_count: 1,
  });
  assert.equal(summary.action_packet_summary.recommended_workflow_count, 1);
  assert.equal(summary.action_packet_summary.candidate_workflow_count, 1);
  assert.equal(summary.action_packet_summary.rehydration_candidate_count, 1);
  assert.deepEqual(summary.action_packet_summary.workflow_anchor_ids, ["wf_123"]);
  assert.deepEqual(summary.action_packet_summary.candidate_workflow_anchor_ids, ["wf_candidate_1"]);
  assert.deepEqual(summary.action_packet_summary.trusted_pattern_anchor_ids, ["p_stable"]);
  assert.deepEqual(summary.selected_memory_layers, ["L2", "L3"]);
  assert.deepEqual(summary.primary_savings_levers, ["anchor_first_recall"]);
  assert.deepEqual(summary.continuity_carrier_summary, {
    total_count: 0,
    handoff_count: 0,
    session_event_count: 0,
    session_count: 0,
  });
  assert.equal(summary.action_retrieval_uncertainty, null);
  assert.equal(summary.action_retrieval_gate, null);
  assert.equal(summary.forgotten_items, 1);
  assert.equal(summary.static_blocks_selected, 2);
  assert.equal(summary.recall_mode, "tool_first");
  assert.deepEqual(summary.forgetting_summary.semantic_action_counts, {
    retain: 0,
    demote: 0,
    archive: 1,
    review: 0,
  });
  assert.deepEqual(summary.forgetting_summary.rehydration_mode_counts, {
    summary_only: 0,
    partial: 2,
    full: 0,
    differential: 1,
  });
  assert.equal(
    summary.planner_explanation,
    "workflow guidance: Fix export failure; candidate workflows visible but not yet promoted: Replay Episode: Fix export failure; selected tool: edit; trusted pattern support: edit; contested patterns visible but not trusted: bash; rehydration available: Fix export failure; supporting knowledge appended: 1",
  );
});

test("buildPlanningSummary makes first-step and planner explanation uncertainty-aware", () => {
  const summary = buildPlanningSummary({
    rules: { considered: 4, matched: 1 },
    tools: {
      selection: { selected: "edit" },
      decision: {
        decision_id: "d_uncertain",
        pattern_summary: {
          used_trusted_pattern_tools: ["edit"],
          skipped_contested_pattern_tools: ["bash"],
        },
      },
    },
    layered_context: layeredContextFixture,
    cost_signals: null,
    context_est_tokens: 384,
    context_compaction_profile: "balanced",
    optimization_profile: "balanced",
    recall_mode: "balanced",
    experience_intelligence: {
      recommendation: {
        history_applied: true,
        tool: {
          selected_tool: "edit",
        },
        path: {
          source_kind: "candidate_workflow",
          file_path: "src/routes/export.ts",
        },
        combined_next_action: "Patch src/routes/export.ts and rerun export tests.",
      },
      action_retrieval: {
        uncertainty: {
          summary_version: "action_retrieval_uncertainty_v1",
          level: "moderate",
          confidence: 0.58,
          evidence_gap_count: 2,
          reasons: [
            "workflow guidance is still candidate-grade and has not stabilized yet",
          ],
          recommended_actions: ["inspect_context"],
        },
      },
    },
  });

  assert.deepEqual(summary.action_retrieval_uncertainty, {
    summary_version: "action_retrieval_uncertainty_v1",
    level: "moderate",
    confidence: 0.58,
    evidence_gap_count: 2,
    reasons: [
      "workflow guidance is still candidate-grade and has not stabilized yet",
    ],
    recommended_actions: ["inspect_context"],
  });
  assert.deepEqual(summary.action_retrieval_gate, {
    summary_version: "action_retrieval_gate_v1",
    gate_action: "inspect_context",
    escalates_task_start: false,
    confidence: 0.58,
    primary_reason: "workflow guidance is still candidate-grade and has not stabilized yet",
    recommended_actions: ["inspect_context"],
    instruction: "Inspect src/routes/export.ts and the current context before using edit.",
    rehydration_candidate_count: 1,
    preferred_rehydration: null,
  });
  assert.deepEqual(summary.first_step_recommendation, {
    source_kind: "experience_intelligence",
    history_applied: true,
    contract_trust: "advisory",
    execution_contract_v1: null,
    selected_tool: "edit",
    task_family: null,
    workflow_signature: null,
    policy_memory_id: null,
    file_path: "src/routes/export.ts",
    next_action: "Inspect src/routes/export.ts and the current context before using edit.",
  });
  assert.equal(
    summary.planner_explanation,
    "workflow guidance: Fix export failure; candidate workflows visible but not yet promoted: Replay Episode: Fix export failure; selected tool: edit; trusted pattern support: edit; contested patterns visible but not trusted: bash; rehydration available: Fix export failure; supporting knowledge appended: 1; action retrieval uncertainty: moderate; workflow guidance is still candidate-grade and has not stabilized yet; recommended follow-up: inspect_context",
  );
});

test("buildPlanningSummary downgrades high-uncertainty identity-poor guidance to observational trust", () => {
  const summary = buildPlanningSummary({
    rules: { considered: 3, matched: 1 },
    tools: {
      selection: { selected: "edit" },
      decision: {
        decision_id: "d_high_uncertainty",
      },
    },
    layered_context: layeredContextFixture,
    cost_signals: null,
    context_est_tokens: 320,
    context_compaction_profile: "balanced",
    optimization_profile: "balanced",
    recall_mode: "balanced",
    experience_intelligence: {
      recommendation: {
        history_applied: true,
        tool: {
          selected_tool: "edit",
        },
        path: {
          source_kind: "candidate_workflow",
          file_path: "src/routes/export.ts",
        },
        combined_next_action: "Patch src/routes/export.ts and rerun export tests.",
      },
      action_retrieval: {
        uncertainty: {
          summary_version: "action_retrieval_uncertainty_v1",
          level: "high",
          confidence: 0.34,
          evidence_gap_count: 4,
          reasons: [
            "workflow guidance is weak and the prior path lacks a stable identity",
          ],
          recommended_actions: ["inspect_context", "widen_recall"],
        },
      },
    },
  });

  assert.deepEqual(summary.first_step_recommendation, {
    source_kind: "experience_intelligence",
    history_applied: true,
    contract_trust: "observational",
    execution_contract_v1: null,
    selected_tool: "edit",
    task_family: null,
    workflow_signature: null,
    policy_memory_id: null,
    file_path: null,
    next_action: "Inspect the current context before starting with edit.",
  });
});

test("buildPlanningSummary respects explicit advisory trust from persisted policy memory", () => {
  const summary = buildPlanningSummary({
    rules: { considered: 2, matched: 1 },
    tools: {
      selection: { selected: "edit" },
      decision: {
        decision_id: "d_advisory_policy",
      },
    },
    layered_context: layeredContextFixture,
    cost_signals: null,
    context_est_tokens: 320,
    context_compaction_profile: "balanced",
    optimization_profile: "balanced",
    recall_mode: "balanced",
    experience_intelligence: {
      recommendation: {
        history_applied: true,
        tool: {
          selected_tool: "edit",
        },
        path: {
          source_kind: "recommended_workflow",
          workflow_signature: "fix-export-failure-workflow",
          file_path: "src/routes/export.ts",
          contract_trust: "advisory",
        },
        combined_next_action: "Patch src/routes/export.ts and rerun export tests.",
      },
      policy_contract: {
        summary_version: "policy_contract_v1",
        policy_kind: "tool_preference",
        source_kind: "stable_workflow",
        policy_state: "candidate",
        contract_trust: "advisory",
        activation_mode: "hint",
        materialization_state: "persisted",
        history_applied: true,
        selected_tool: "edit",
        avoid_tools: [],
        task_family: "task:repair_export",
        workflow_signature: "fix-export-failure-workflow",
        file_path: "src/routes/export.ts",
        target_files: ["src/routes/export.ts"],
        next_action: "Patch src/routes/export.ts and rerun export tests.",
        confidence: 0.72,
        source_anchor_ids: ["wf_123"],
        reason: "Advisory persisted policy memory suggests edit but should not strongly steer kickoff.",
      },
      action_retrieval: {
        uncertainty: {
          summary_version: "action_retrieval_uncertainty_v1",
          level: "low",
          confidence: 0.84,
          evidence_gap_count: 0,
          reasons: [],
          recommended_actions: ["proceed"],
        },
      },
    },
  });

  assert.deepEqual(summary.first_step_recommendation, {
    source_kind: "experience_intelligence",
    history_applied: true,
    contract_trust: "advisory",
    execution_contract_v1: null,
    selected_tool: "edit",
    task_family: "task:repair_export",
    workflow_signature: "fix-export-failure-workflow",
    policy_memory_id: null,
    file_path: "src/routes/export.ts",
    next_action: "Patch src/routes/export.ts and rerun export tests.",
  });
});

test("buildPlanningSummary demotes blocked authoritative workflow to inspect-first first step", () => {
  const executionContract = buildExecutionContractFromProjection({
    contract_trust: "authoritative",
    task_family: "task:repair_export",
    workflow_signature: "fix-export-failure-workflow",
    selected_tool: "edit",
    file_path: "src/routes/export.ts",
    target_files: ["src/routes/export.ts"],
    next_action: "Patch src/routes/export.ts and rerun export tests.",
    acceptance_checks: ["npm test -- export"],
    success_invariants: ["export route returns valid serialized payload"],
    provenance: {
      source_kind: "workflow_projection",
      source_summary_version: "planning-summary-test",
      source_anchor: "wf_authority_blocked",
      evidence_refs: ["wf_authority_blocked"],
      notes: ["test authoritative workflow projection"],
    },
  });
  const summary = buildPlanningSummary({
    rules: { considered: 2, matched: 1 },
    tools: {
      selection: { selected: "edit" },
      decision: {
        decision_id: "d_blocked_authority",
      },
    },
    layered_context: layeredContextFixture,
    cost_signals: null,
    context_est_tokens: 320,
    context_compaction_profile: "balanced",
    optimization_profile: "balanced",
    recall_mode: "balanced",
    experience_intelligence: {
      execution_contract_v1: executionContract,
      recommendation: {
        history_applied: true,
        tool: {
          selected_tool: "edit",
        },
        path: {
          source_kind: "recommended_workflow",
          workflow_signature: "fix-export-failure-workflow",
          file_path: "src/routes/export.ts",
          contract_trust: "authoritative",
          authority_blocked: true,
          authority_primary_blocker: "execution_evidence:after_exit_revalidation_failed",
        },
        combined_next_action: "Patch src/routes/export.ts and rerun export tests.",
      },
      action_retrieval: {
        uncertainty: {
          summary_version: "action_retrieval_uncertainty_v1",
          level: "moderate",
          confidence: 0.42,
          evidence_gap_count: 1,
          reasons: [
            "selected workflow authority is blocked: execution_evidence:after_exit_revalidation_failed",
          ],
          recommended_actions: ["inspect_context"],
        },
      },
    },
  });

  assert.equal(summary.first_step_recommendation?.contract_trust, "advisory");
  assert.equal(summary.first_step_recommendation?.execution_contract_v1?.contract_trust, "advisory");
  assert.equal(summary.first_step_recommendation?.file_path, "src/routes/export.ts");
  assert.equal(
    summary.first_step_recommendation?.next_action,
    "Inspect src/routes/export.ts and revalidate current context before reusing edit; authority blocked by execution_evidence:after_exit_revalidation_failed.",
  );
  assert.equal(
    summary.first_step_recommendation?.execution_contract_v1?.next_action,
    summary.first_step_recommendation?.next_action,
  );
});

test("buildAssemblySummary surfaces semantic forgetting, relocation, and rehydration counts", () => {
  const summary = buildAssemblySummary({
    rules: { considered: 2, matched: 1 },
    tools: {
      selection: { selected: "edit" },
      decision: {
        decision_id: "d_123",
        pattern_summary: {
          skipped_suppressed_pattern_anchor_ids: ["p_stable"],
        },
      },
    },
    layered_context: layeredContextFixture,
    cost_signals: {
      forgotten_items: 1,
      forgotten_by_reason: {
        "stale_context": 1,
      },
      selected_memory_layers: ["L2", "L3"],
      primary_savings_levers: ["anchor_first_recall"],
    },
    context_est_tokens: 320,
    context_compaction_profile: "balanced",
    optimization_profile: "balanced",
    recall_mode: "tool_first",
  });

  assert.equal(summary.forgetting_summary.substrate_mode, "forgetting_active");
  assert.equal(summary.forgetting_summary.forgotten_items, 1);
  assert.deepEqual(summary.forgetting_summary.forgotten_by_reason, { stale_context: 1 });
  assert.equal(summary.forgetting_summary.primary_forgetting_reason, "stale_context");
  assert.deepEqual(summary.forgetting_summary.semantic_action_counts, {
    retain: 0,
    demote: 0,
    archive: 1,
    review: 0,
  });
  assert.deepEqual(summary.forgetting_summary.lifecycle_state_counts, {
    active: 0,
    contested: 0,
    retired: 1,
    archived: 0,
  });
  assert.deepEqual(summary.forgetting_summary.archive_relocation_state_counts, {
    none: 0,
    candidate: 0,
    cold_archive: 1,
  });
  assert.deepEqual(summary.forgetting_summary.archive_relocation_target_counts, {
    none: 0,
    local_cold_store: 1,
    external_object_store: 0,
  });
  assert.deepEqual(summary.forgetting_summary.archive_payload_scope_counts, {
    none: 0,
    anchor_payload: 1,
    node: 0,
  });
  assert.deepEqual(summary.forgetting_summary.rehydration_mode_counts, {
    summary_only: 0,
    partial: 2,
    full: 0,
    differential: 1,
  });
  assert.equal(summary.action_retrieval_uncertainty, null);
  assert.equal(summary.action_retrieval_gate, null);
  assert.equal(summary.forgetting_summary.differential_rehydration_candidate_count, 1);
  assert.equal(summary.forgetting_summary.stale_signal_count, 2);
  assert.equal(
    summary.forgetting_summary.recommended_action,
    "rehydrate archived execution memory only when the task proves it still needs the colder payload",
  );
});

test("execution forgetting summary contract rejects passthrough fields", () => {
  const summary = buildAssemblySummary({
    rules: { considered: 1, matched: 0 },
    tools: null,
    layered_context: layeredContextFixture,
    cost_signals: null,
    context_est_tokens: 320,
    context_compaction_profile: "balanced",
    optimization_profile: "balanced",
    recall_mode: "tool_first",
  }).forgetting_summary;

  assert.deepEqual(ExecutionForgettingSummarySchema.parse(summary), summary);
  assert.throws(() =>
    ExecutionForgettingSummarySchema.parse({
      ...summary,
      debug_passthrough: true,
    }),
  );
  assert.throws(() =>
    ExecutionForgettingSummarySchema.parse({
      ...summary,
      semantic_action_counts: {
        ...summary.semantic_action_counts,
        hidden_count: 1,
      },
    }),
  );
  assert.throws(() =>
    ExecutionForgettingSummarySchema.parse({
      ...summary,
      rehydration_mode_counts: {
        ...summary.rehydration_mode_counts,
        speculative: 1,
      },
    }),
  );
});

test("execution summary top-level and child contracts reject passthrough fields", () => {
  const summary = buildExecutionSummarySurface({
    planner_packet: null,
    surface: layeredContextFixture,
    packet_assembly: {
      packet_source_mode: "memory_only",
      state_first_assembly: false,
      execution_packet_v1_present: false,
      execution_state_v1_present: false,
    },
    tools: { selection: { selected: "edit" } },
    cost_signals: null,
    execution_packet: null,
    execution_artifacts: null,
    execution_evidence: null,
    delegation_records: null,
  });

  assert.deepEqual(ExecutionSummaryV1Schema.parse(summary), summary);
  assert.throws(() =>
    ExecutionSummaryV1Schema.parse({
      ...summary,
      debug_passthrough: true,
    }),
  );

  const strictContracts = [
    [ExecutionPacketAssemblySummarySchema, summary.packet_assembly],
    [ExecutionStrategySummarySchema, summary.strategy_summary],
    [ExecutionCollaborationSummarySchema, summary.collaboration_summary],
    [ExecutionContinuitySnapshotSummarySchema, summary.continuity_snapshot_summary],
    [ExecutionCollaborationRoutingSummarySchema, summary.collaboration_routing_summary],
    [ExecutionDelegationRecordsSummarySchema, summary.delegation_records_summary],
    [ExecutionRoutingSignalSummarySchema, summary.routing_signal_summary],
    [ExecutionMaintenanceSummarySchema, summary.maintenance_summary],
    [ExecutionInstrumentationSummarySchema, summary.instrumentation_summary],
  ] as const;

  for (const [schema, contract] of strictContracts) {
    assert.deepEqual(schema.parse(contract), contract);
    assert.throws(() =>
      schema.parse({
        ...contract,
        debug_passthrough: true,
      }),
    );
  }

  const delegationSummary = summary.delegation_records_summary;
  const packetRecord = delegationSummary.delegation_packets[0];
  assert.ok(packetRecord);
  assert.throws(() =>
    ExecutionDelegationRecordsSummarySchema.parse({
      ...delegationSummary,
      delegation_packets: [{
        ...packetRecord,
        debug_passthrough: true,
      }],
    }),
  );

  const returnRecord = {
    version: 1 as const,
    role: "patch",
    status: "completed",
    summary: "Patch completed",
    evidence: ["test output"],
    working_set: ["src/routes/example.ts"],
    acceptance_checks: ["npm test"],
    source_mode: delegationSummary.record_mode,
  };
  assert.deepEqual(
    ExecutionDelegationRecordsSummarySchema.parse({
      ...delegationSummary,
      return_count: 1,
      delegation_returns: [returnRecord],
    }).delegation_returns[0],
    returnRecord,
  );
  assert.throws(() =>
    ExecutionDelegationRecordsSummarySchema.parse({
      ...delegationSummary,
      return_count: 1,
      delegation_returns: [{
        ...returnRecord,
        debug_passthrough: true,
      }],
    }),
  );

  const artifactRecord = delegationSummary.artifact_routing_records[0] ?? {
    version: 1 as const,
    ref: "artifact://example",
    ref_kind: "artifact" as const,
    route_role: delegationSummary.route_role,
    route_intent: "handoff",
    route_mode: delegationSummary.record_mode,
    task_family: null,
    family_scope: "unknown",
    routing_reason: "strategy_summary",
    source: "strategy_summary" as const,
  };
  assert.throws(() =>
    ExecutionDelegationRecordsSummarySchema.parse({
      ...delegationSummary,
      artifact_routing_count: 1,
      artifact_routing_records: [{
        ...artifactRecord,
        debug_passthrough: true,
      }],
    }),
  );
});

test("buildAssemblySummary carries pattern trust summary through from planning summary", () => {
  const summary = buildAssemblySummary({
    rules: { considered: 3, matched: 1 },
    tools: {
      selection: { selected: "edit" },
      decision: {
        decision_id: "d_123",
        pattern_summary: {
          used_trusted_pattern_tools: ["edit"],
          skipped_contested_pattern_tools: ["bash"],
        },
      },
    },
    layered_context: layeredContextFixture,
    cost_signals: null,
    context_est_tokens: 420,
    context_compaction_profile: "aggressive",
    optimization_profile: "aggressive",
    recall_mode: "balanced",
    include_rules: true,
  });
  assert.equal(summary.trusted_pattern_count, 1);
  assert.equal(summary.contested_pattern_count, 1);
  assert.deepEqual(summary.trusted_pattern_tools, ["edit"]);
  assert.deepEqual(summary.contested_pattern_tools, ["bash"]);
  assert.equal(summary.workflow_lifecycle_summary.candidate_count, 1);
  assert.equal(summary.workflow_lifecycle_summary.stable_count, 1);
  assert.equal(summary.workflow_lifecycle_summary.transition_counts.candidate_observed, 1);
  assert.equal(summary.workflow_lifecycle_summary.transition_counts.promoted_to_stable, 1);
  assert.equal(summary.workflow_maintenance_summary.observe_count, 1);
  assert.equal(summary.workflow_maintenance_summary.retain_count, 1);
  assert.equal(summary.workflow_maintenance_summary.promote_candidate_count, 1);
  assert.equal(summary.workflow_maintenance_summary.retain_workflow_count, 1);
  assert.equal(summary.workflow_signal_summary.stable_workflow_count, 1);
  assert.equal(summary.workflow_signal_summary.observing_workflow_count, 1);
  assert.equal(summary.workflow_signal_summary.promotion_ready_workflow_count, 0);
  assert.equal(summary.pattern_lifecycle_summary.trusted_count, 1);
  assert.equal(summary.pattern_lifecycle_summary.contested_count, 1);
  assert.equal(summary.pattern_maintenance_summary.retain_count, 1);
  assert.equal(summary.pattern_maintenance_summary.review_count, 1);
  assert.equal(summary.action_packet_summary.supporting_knowledge_count, 1);
  assert.deepEqual(summary.action_packet_summary.rehydration_anchor_ids, ["wf_123"]);
  assert.equal(
    summary.planner_explanation,
    "workflow guidance: Fix export failure; candidate workflows visible but not yet promoted: Replay Episode: Fix export failure; selected tool: edit; trusted pattern support: edit; contested patterns visible but not trusted: bash; rehydration available: Fix export failure; supporting knowledge appended: 1",
  );
});

test("buildPlanningSummary explains packet state even when no trusted pattern was consumed", () => {
  const summary = buildPlanningSummary({
    rules: { considered: 2, matched: 0 },
    tools: {
      selection: { selected: "bash" },
      decision: {
        decision_id: "d_456",
      },
    },
    layered_context: layeredContextFixture,
    cost_signals: null,
    context_est_tokens: 256,
    context_compaction_profile: "balanced",
    optimization_profile: "balanced",
    recall_mode: "balanced",
  });
  assert.equal(
    summary.planner_explanation,
    "workflow guidance: Fix export failure; candidate workflows visible but not yet promoted: Replay Episode: Fix export failure; selected tool: bash; trusted patterns available but not used: edit; contested patterns visible but not trusted: bash; rehydration available: Fix export failure; supporting knowledge appended: 1",
  );
});

test("buildPlanningSummary surfaces promotion-ready workflow candidates ahead of generic candidate wording", () => {
  const readyFixture = structuredClone(layeredContextFixture);
  const candidateWorkflow = (readyFixture.action_recall_packet.candidate_workflows as any[])[0];
  candidateWorkflow.observed_count = 2;
  const summary = buildPlanningSummary({
    rules: { considered: 2, matched: 1 },
    tools: {
      selection: { selected: "edit" },
      decision: {
        decision_id: "d_ready",
        pattern_summary: {
          used_trusted_pattern_tools: ["edit"],
          skipped_contested_pattern_tools: ["bash"],
        },
      },
    },
    layered_context: readyFixture,
    cost_signals: null,
    context_est_tokens: 320,
    context_compaction_profile: "balanced",
    optimization_profile: "balanced",
    recall_mode: "balanced",
  });
  assert.equal(summary.workflow_lifecycle_summary.promotion_ready_count, 1);
  assert.deepEqual(summary.workflow_signal_summary, {
    stable_workflow_count: 1,
    promotion_ready_workflow_count: 1,
    observing_workflow_count: 0,
    stable_workflow_titles: ["Fix export failure"],
    promotion_ready_workflow_titles: ["Replay Episode: Fix export failure"],
    observing_workflow_titles: [],
  });
  assert.equal(
    summary.planner_explanation,
    "workflow guidance: Fix export failure; promotion-ready workflow candidates: Replay Episode: Fix export failure; selected tool: edit; trusted pattern support: edit; contested patterns visible but not trusted: bash; rehydration available: Fix export failure; supporting knowledge appended: 1",
  );
});

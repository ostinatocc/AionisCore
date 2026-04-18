import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPatternMaintenanceMetadata,
  buildPatternPromotionMetadata,
  buildWorkflowMaintenanceMetadata,
  buildWorkflowPromotionMetadata,
} from "../../src/memory/evolution-operators.ts";

test("workflow candidate operator metadata stays in observe/promote mode", () => {
  const at = "2026-04-18T12:00:00.000Z";
  const maintenance = buildWorkflowMaintenanceMetadata({
    promotion_state: "candidate",
    at,
  });
  const promotion = buildWorkflowPromotionMetadata({
    promotion_state: "candidate",
    promotion_origin: "execution_write_projection",
    required_observations: 2,
    observed_count: 1,
    source_status: null,
    at,
  });

  assert.deepEqual(maintenance, {
    model: "lazy_online_v1",
    maintenance_state: "observe",
    offline_priority: "promote_candidate",
    lazy_update_fields: ["usage_count", "last_used_at"],
    last_maintenance_at: at,
  });
  assert.deepEqual(promotion, {
    promotion_state: "candidate",
    promotion_origin: "execution_write_projection",
    required_observations: 2,
    observed_count: 1,
    last_transition: "candidate_observed",
    last_transition_at: at,
    source_status: null,
  });
});

test("workflow stable operator metadata retains workflow guidance", () => {
  const at = "2026-04-18T12:00:00.000Z";
  const maintenance = buildWorkflowMaintenanceMetadata({
    promotion_state: "stable",
    at,
  });
  const promotion = buildWorkflowPromotionMetadata({
    promotion_state: "stable",
    promotion_origin: "replay_learning_auto_promotion",
    required_observations: 2,
    observed_count: 3,
    source_status: null,
    at,
  });

  assert.equal(maintenance.maintenance_state, "retain");
  assert.equal(maintenance.offline_priority, "retain_workflow");
  assert.equal(promotion.last_transition, "promoted_to_stable");
  assert.equal(promotion.required_observations, 2);
  assert.equal(promotion.observed_count, 3);
});

test("stable normalization uses normalized transition instead of promoted transition", () => {
  const at = "2026-04-18T12:00:00.000Z";
  const promotion = buildWorkflowPromotionMetadata({
    promotion_state: "stable",
    promotion_origin: "replay_stable_normalization",
    source_status: "active",
    at,
  });

  assert.equal(promotion.last_transition, "normalized_latest_stable");
  assert.equal(promotion.source_status, "active");
  assert.equal(promotion.required_observations, undefined);
  assert.equal(promotion.observed_count, undefined);
});

test("pattern candidate operator metadata stays in observe/promote mode", () => {
  const at = "2026-04-18T12:00:00.000Z";
  const maintenance = buildPatternMaintenanceMetadata({
    credibility_state: "candidate",
    distinct_run_count: 2,
    required_distinct_runs: 3,
    counter_evidence_open: false,
    at,
  });
  const promotion = buildPatternPromotionMetadata({
    required_distinct_runs: 3,
    distinct_run_count: 2,
    observed_run_ids: ["run-1", "run-2"],
    counter_evidence_count: 0,
    counter_evidence_open: false,
    credibility_state: "candidate",
    previous_credibility_state: "candidate",
    at,
  });

  assert.equal(maintenance.maintenance_state, "observe");
  assert.equal(maintenance.offline_priority, "promote_candidate");
  assert.equal(promotion.last_transition, "candidate_observed");
});

test("pattern contested and trusted operators keep review and revalidation semantics", () => {
  const at = "2026-04-18T12:00:00.000Z";
  const contestedMaintenance = buildPatternMaintenanceMetadata({
    credibility_state: "contested",
    distinct_run_count: 3,
    required_distinct_runs: 3,
    counter_evidence_open: true,
    at,
  });
  const contestedPromotion = buildPatternPromotionMetadata({
    required_distinct_runs: 3,
    distinct_run_count: 3,
    observed_run_ids: ["run-1", "run-2", "run-3"],
    counter_evidence_count: 1,
    counter_evidence_open: true,
    credibility_state: "contested",
    previous_credibility_state: "trusted",
    at,
  });
  const trustedPromotion = buildPatternPromotionMetadata({
    required_distinct_runs: 3,
    distinct_run_count: 5,
    observed_run_ids: ["run-1", "run-2", "run-3", "run-4", "run-5"],
    counter_evidence_count: 1,
    counter_evidence_open: false,
    credibility_state: "trusted",
    previous_credibility_state: "contested",
    at,
    stable_at: at,
    last_validated_at: at,
    last_counter_evidence_at: at,
  });

  assert.equal(contestedMaintenance.maintenance_state, "review");
  assert.equal(contestedMaintenance.offline_priority, "review_counter_evidence");
  assert.equal(contestedPromotion.last_transition, "counter_evidence_opened");
  assert.equal(trustedPromotion.last_transition, "revalidated_to_trusted");
});

import test from "node:test";
import assert from "node:assert/strict";
import {
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

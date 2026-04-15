import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveContextOperatorProjection,
  resolveDelegationLearningProjection,
} from "../src/index.js";

test("resolveDelegationLearningProjection prefers explicit operator projection over layered context mirror", () => {
  const projection = resolveDelegationLearningProjection({
    operator_projection: {
      delegation_learning: {
        summary_version: "delegation_learning_projection_v1",
        learning_summary: {
          task_family: "task:repair_export",
          matched_records: 2,
          truncated: false,
          route_role_counts: { patch: 2 },
          record_outcome_counts: { completed: 1, missing_return: 1 },
          recommendation_count: 3,
        },
        learning_recommendations: [{
          recommendation_kind: "promote_reusable_pattern",
          priority: "medium",
          route_role: "patch",
          task_family: "task:repair_export",
          recommended_action: "Promote the repeated patch pattern into a reusable route.",
          rationale: "completed pattern repeated successfully",
          sample_mission: "Apply the export repair patch and rerun node tests.",
          sample_acceptance_checks: ["npm run -s test:lite -- export"],
          sample_working_set_files: ["src/routes/export.ts"],
          sample_artifact_refs: ["artifact://repair-export/patch"],
        }],
      },
    },
    layered_context: {
      delegation_learning: {
        summary_version: "delegation_learning_projection_v1",
        learning_summary: {
          task_family: "task:stale_mirror",
          matched_records: 1,
          truncated: false,
          route_role_counts: { review: 1 },
          record_outcome_counts: { completed: 1 },
          recommendation_count: 1,
        },
        learning_recommendations: [],
      },
    },
  });

  assert.equal(projection?.learning_summary.task_family, "task:repair_export");
  assert.equal(projection?.learning_recommendations[0]?.recommendation_kind, "promote_reusable_pattern");
});

test("resolveContextOperatorProjection falls back to layered context mirror for compatibility", () => {
  const projection = resolveContextOperatorProjection({
    operator_projection: undefined,
    layered_context: {
      delegation_learning: {
        summary_version: "delegation_learning_projection_v1",
        learning_summary: {
          task_family: "task:repair_export",
          matched_records: 0,
          truncated: false,
          route_role_counts: {},
          record_outcome_counts: {},
          recommendation_count: 0,
        },
        learning_recommendations: [],
      },
    },
  });

  assert.deepEqual(projection, {
    delegation_learning: {
      summary_version: "delegation_learning_projection_v1",
      learning_summary: {
        task_family: "task:repair_export",
        matched_records: 0,
        truncated: false,
        route_role_counts: {},
        record_outcome_counts: {},
        recommendation_count: 0,
      },
      learning_recommendations: [],
    },
  });
});

test("resolveContextOperatorProjection returns null when neither projection surface is available", () => {
  assert.equal(resolveContextOperatorProjection({
    operator_projection: undefined,
    layered_context: {},
  }), null);
  assert.equal(resolveDelegationLearningProjection({
    operator_projection: undefined,
    layered_context: {},
  }), null);
});

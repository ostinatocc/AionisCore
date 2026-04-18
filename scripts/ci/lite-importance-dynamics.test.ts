import test from "node:test";
import assert from "node:assert/strict";
import {
  computeAdaptiveImportanceTarget,
  computeRetentionScore,
  resolveNodePriorityProfile,
} from "../../src/memory/importance-dynamics.ts";

test("resolveNodePriorityProfile rewards trusted pattern anchors over raw events", () => {
  const raw = resolveNodePriorityProfile({
    type: "event",
    tier: "warm",
    slots: {},
  });
  const trusted = resolveNodePriorityProfile({
    type: "rule",
    tier: "warm",
    title: "Trusted edit pattern",
    text_summary: "Prefer edit for repair_export flows",
    slots: {
      summary_kind: "pattern_anchor",
      compression_layer: "L3",
      anchor_v1: {
        anchor_kind: "pattern",
        credibility_state: "trusted",
        pattern_state: "stable",
        metrics: {
          usage_count: 6,
          reuse_success_count: 4,
          reuse_failure_count: 0,
          distinct_run_count: 3,
        },
      },
    },
  });

  assert.ok(trusted.salience > raw.salience);
  assert.ok(trusted.importance > raw.importance);
  assert.ok(trusted.confidence > raw.confidence);
  assert.ok(trusted.retention_score > raw.retention_score);
});

test("computeRetentionScore and adaptive importance stay clamped", () => {
  const retention = computeRetentionScore({
    salience: 0.9,
    importance: 0.95,
    confidence: 0.8,
    feedback_quality: 1,
    last_activated_at: new Date().toISOString(),
  });
  const importance = computeAdaptiveImportanceTarget({
    current_importance: 0.98,
    feedback_quality: 1,
    is_recent: true,
  });

  assert.ok(retention <= 1 && retention >= 0);
  assert.ok(importance <= 1 && importance >= 0);
  assert.ok(importance >= 0.98);
});

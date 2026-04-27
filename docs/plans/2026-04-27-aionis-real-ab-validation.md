# Aionis Real A/B Validation Implementation Plan

Document status: Approved working plan
Date: 2026-04-27

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a falsifiable real-task A/B validation harness that can measure whether Aionis execution memory improves agent outcomes without changing the model, tools, verifier, or environment.

**Architecture:** The harness treats Aionis as the only experimental variable. It compares paired `baseline`, `aionis_assisted`, `negative_control`, and `positive_control` observations per task, enforces fairness constraints, computes product metrics, and emits JSON plus Markdown reports. Seed fixtures are harness calibration data only; they are not product proof.

**Tech Stack:** Node.js, TypeScript via `tsx`, JSON task specs, markdown reports, existing Lite dogfood evidence concepts.

---

## First Principles

Aionis is not being tested as a better prompt. Aionis is being tested as an execution-memory runtime.

The only variable between baseline and treatment must be the Aionis-generated execution memory packet:

- same task
- same model
- same time budget
- same tool permission
- same repository/environment reset
- same verifier
- same scoring rules

If any of those change, the run is not a valid A/B comparison.

## Required Arms

Every real task must include four arms:

1. `baseline`: no Aionis memory.
2. `aionis_assisted`: automatically generated Aionis continuity/workflow/outcome/trust packet.
3. `negative_control`: unrelated, stale, or low-trust memory. This tests whether Aionis pollutes execution or creates false confidence.
4. `positive_control`: ideal human/oracle handoff. This tests whether the task is context-sensitive enough for memory to matter.

## Required Metrics

Each arm records:

- `completion`
- `verifier_passed`
- `first_correct_action`
- `wasted_steps`
- `retry_count`
- `false_confidence`
- `after_exit_correct`
- `wrong_file_touches`
- `human_intervention_count`
- optional `time_to_success_ms`
- optional `tokens_to_success`

Metrics may be supplied directly or derived from a run trace. Real product validation should prefer trace-derived metrics so the report can be audited later.

## Agent Run Trace Format

Each arm can provide:

```json
{
  "trace_version": "aionis_agent_run_trace_v1",
  "run_id": "baseline-run-001",
  "started_at_ms": 0,
  "ended_at_ms": 420000,
  "events": [
    {
      "kind": "action",
      "text": "Open src/exporter.ts first.",
      "touched_files": ["src/exporter.ts"],
      "correct": true,
      "tokens": 1200
    },
    {
      "kind": "verification",
      "command": "npm test -- tests/exporter.test.mjs",
      "success": true,
      "verifier": true
    }
  ]
}
```

Supported event kinds:

- `action`
- `tool_call`
- `verification`
- `external_probe`
- `agent_claim`
- `retry`
- `human_intervention`

The harness derives:

- `first_correct_action` from the first action/tool event
- `wasted_steps` from explicit wasted or incorrect action/tool events
- `retry_count` from retry events
- `false_confidence` from false-confidence markers or success claims followed by failed verifier events
- `after_exit_correct` from after-exit/fresh-shell verification events
- `wrong_file_touches` from touched files outside expected target files
- `time_to_success_ms` from trace start/end timestamps
- `tokens_to_success` from event token counts

The first report gate is intentionally strict:

- treatment completion rate must not be worse than baseline
- treatment false-confidence rate must not be higher than baseline
- treatment after-exit correctness must not be worse on after-exit tasks
- treatment wasted steps should reduce by at least 20 percent when baseline has waste
- negative control must not become authoritative
- positive control must beat or match baseline, otherwise the task is not a good memory-sensitivity probe

## Task Families

The first calibration set must cover:

- `coding_continuity`
- `service_publish_validate`
- `package_publish_validate`
- `deploy_hook_webserver`
- `handoff_resume`
- `agent_takeover`

Future suites should add:

- `repeated_workflow_reuse`
- `failure_recovery`
- `memory_lifecycle_rehydration`
- `automation_handoff`

## Files

- Create: `scripts/lib/aionis-real-ab-validation.ts`
- Create: `scripts/aionis-real-ab-validation.ts`
- Create: `scripts/fixtures/real-ab-validation/seed-suite.json`
- Create: `scripts/ci/real-ab-validation-harness.test.ts`
- Modify: `package.json`

## Task 1: Write the Protocol Document

Add this plan and keep the proof boundary explicit:

- seed fixtures are harness calibration
- live agent traces are required for product claims
- benchmark-style adapters must not handcraft treatment prompts

## Task 2: Implement the Core Harness

Implement a library that:

- validates all four arms exist
- validates fairness constraints are true
- computes per-task deltas
- computes suite-level aggregate metrics
- evaluates readiness gates
- renders Markdown report text

Expected public functions:

- `runRealAbValidationSuite(input)`
- `renderRealAbMarkdownReport(report)`

## Task 3: Add Seed Calibration Suite

Add JSON fixtures for six task families. The data should demonstrate the harness mechanics, not claim product proof.

The suite kind must be `harness_calibration`.

## Task 4: Add CLI

Add a CLI that supports:

```bash
npx tsx scripts/aionis-real-ab-validation.ts --seed
npx tsx scripts/aionis-real-ab-validation.ts --spec path/to/spec.json
npx tsx scripts/aionis-real-ab-validation.ts --seed --out-json /tmp/ab.json --out-markdown /tmp/ab.md
npx tsx scripts/aionis-real-ab-validation.ts --seed --fail-on-regression
```

## Task 5: Add Tests

Add tests for:

- seed suite passes
- fairness violations fail the gate
- treatment regression fails the gate
- Markdown report contains gate status and product-proof boundary

## Task 6: Add Package Scripts

Add:

- `ab:validate`
- `ab:validate:json`

Also include the harness test in `lite:test` so CI prevents drift.

## Non-Goals

This phase does not run real external model agents.

This phase does not prove Aionis wins.

This phase builds the evaluation system required to later prove or disprove Aionis value with real traces.

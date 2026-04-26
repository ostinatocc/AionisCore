# Runtime Host Integration Runbook

Last reviewed: 2026-04-26

Document status: living SDK integration reference

This runbook defines the host-side loop for using AionisRuntime as an execution-memory runtime. The goal is to make a host prove outcomes before trusting reusable workflow memory.

## Core Loop

A host should use this sequence:

1. `taskStartPlan`
2. execute the returned first action or host workflow
3. validate the result from the correct environment
4. `storeExecutionOutcome`
5. `retrieveWorkflowContract`
6. reuse only the authority level that the Runtime exposes

The loop is:

```text
taskStartPlan -> execute -> validate -> storeExecutionOutcome -> retrieveWorkflowContract -> reuse or keep advisory
```

## 1. Start With `taskStartPlan`

Use `taskStartPlan` to ask the Runtime for the first action, candidate workflow, uncertainty, and gate action.

The host should treat the returned action as a plan candidate until execution evidence is stored. A strong-looking first action is not authority by itself.

Read these fields first:

1. `first_action`
2. `gate_action`
3. `action_retrieval_uncertainty`
4. `planner_packet`
5. `planner_explanation`

## 2. Execute And Validate

The host owns real execution. AionisRuntime owns memory, contract, trust, and learning decisions.

Validation should match the outcome contract:

1. run narrow acceptance checks
2. validate external visibility when required
3. validate service durability after the agent or launcher exits when required
4. run fresh-shell probes when the result must be visible outside the current shell

For service tasks, prefer:

```text
launch detached -> let launcher exit -> probe from fresh shell -> record evidence
```

## 3. Store Outcome Evidence

Use `storeExecutionOutcome` after the host executes and validates.

The important evidence fields are:

1. `validation_passed`
2. `after_exit_revalidated`
3. `fresh_shell_probe_passed`
4. `false_confidence_detected`
5. `failure_reason`
6. `evidence_refs`

Example metrics shape:

```ts
await aionis.memory.storeExecutionOutcome({
  scope,
  actor: "host",
  run_id,
  goal: "publish service remains reachable after agent exit",
  status: "succeeded",
  steps: [
    {
      step_index: 1,
      tool_name: "shell",
      status: "succeeded",
      output_signature: "fresh-shell probe returned 200"
    }
  ],
  success_criteria: [
    "service endpoint responds from a fresh shell",
    "result remains valid after launcher exit"
  ],
  metrics: {
    validation_passed: true,
    after_exit_revalidated: true,
    fresh_shell_probe_passed: true,
    false_confidence_detected: false,
    evidence_refs: ["fresh_shell:curl:http://127.0.0.1:4173/healthz"]
  },
  compile_playbook: true,
  simulate_playbook: true
});
```

## 4. Retrieve Workflow Authority

Use `retrieveWorkflowContract` before treating a workflow as reusable guidance.

Read these fields first:

1. `authority_summary.status`
2. `authority_summary.allows_authoritative`
3. `authority_summary.allows_stable_promotion`
4. `authority_summary.primary_blocker`
5. `authority_summary.outcome_contract_status`
6. `authority_summary.execution_evidence_status`
7. `authority_summary.false_confidence_detected`

Host rule:

1. `allows_authoritative=true` means the workflow can be used as authoritative guidance for the matching contract surface.
2. `allows_stable_promotion=true` means the Runtime can promote the learned workflow to stable reusable memory.
3. `authority_blocked=true` means the host may still show the workflow, but must label it advisory.
4. `false_confidence_detected=true` means the host must not present the workflow as successful recovery.

## 5. Reuse Policy

The host should not flatten all Runtime output into one confidence score.

Use this policy:

1. authoritative workflow: can drive the next run
2. advisory workflow: can be displayed as context, but the host must revalidate
3. observational memory: can explain history, but must not select actions by itself
4. contested or archived memory: require explicit review or rehydration before reuse

## Dogfood Verification

Use the dogfood report to check host integration quality:

```bash
npm run dogfood:lite:runtime -- --out-report-json artifacts/runtime-dogfood/report.json
npm run dogfood:lite:runtime:external-probe -- --out-report-json artifacts/runtime-dogfood/external-report.json
npm run dogfood:lite:runtime:external-probe -- --slice interrupted_resume --out-json artifacts/runtime-dogfood/interrupted-run.json
```

The external-probe runner should cover service durability, publish/install visibility, deploy/web visibility, interrupted resume, next-day handoff, and agent takeover paths before a host claims broad Runtime readiness.

When a live family fails, inspect `external-run.json.diagnostics[]` before changing Runtime behavior. The stable triage fields are `slice`, `scenario_id`, `command`, `cwd`, `duration_ms`, `exit_code`, `stdout_tail`, `stderr_tail`, `failure_class`, and ordered `commands[]`.

Lite CI uploads `artifacts/runtime-dogfood/` as a workflow artifact so product-level regressions can be debugged from the run payload instead of from truncated job logs.

Before claiming product-level improvement, require:

1. `product_status=pass_live_evidence` for each live family being claimed
2. `false_confidence_rate=0`
3. `authority_gate_false_positive_rate=0`
4. `after_exit_evidence_success_rate=1` for service durability slices
5. `cross_shell_revalidation_success_rate=1` for external visibility and continuity slices
6. `live_execution_coverage_by_family.<family>.rate=1` for each task family being claimed as product-ready

# Runtime Dogfood Reporting

Last reviewed: 2026-04-28

Document status: living product dogfood reference

This document defines how AionisRuntime reports real-task dogfood results. It is not a benchmark adapter and it is not a new memory subsystem. The report is a product proof surface over the existing Runtime layers:

1. Contract Compiler
2. Trust Gate
3. Orchestrator
4. Learning Loop

## Report Contract

The product report contract is `runtime_dogfood_report_v1`.

It is emitted inside `RuntimeDogfoodSuiteResult.report` and can also be written as a standalone JSON artifact:

```bash
npm run dogfood:lite:runtime -- --out-report-json artifacts/runtime-dogfood/report.json
npm run dogfood:lite:runtime:external-probe -- --out-report-json artifacts/runtime-dogfood/external-report.json
```

Use `--report-json` to print only the report:

```bash
npm run dogfood:lite:runtime -- --report-json
```

Use the readiness gate when a job must fail unless the dogfood run is product-ready:

```bash
npm run dogfood:lite:runtime:readiness
npm run dogfood:lite:runtime:external-probe -- --require-live-readiness --out-gate-json artifacts/runtime-dogfood/external-readiness-gate.json
```

Use `--list-slices` and `--slice` when debugging one live family:

```bash
npm run dogfood:lite:runtime:external-probe -- --list-slices
npm run dogfood:lite:runtime:external-probe -- --slice interrupted_resume --out-json artifacts/runtime-dogfood/interrupted-run.json
```

## Product Metrics

The report intentionally focuses on product behavior, not test implementation detail:

1. `first_correct_action_rate`
   Measures whether the compiled next action is specific enough for a host or agent to start correctly.
2. `wasted_steps`
   Counts noisy or non-actionable compiled workflow steps.
3. `retries`
   Counts retry/rerun signals in the trajectory.
4. `false_confidence_rate`
   Measures unblocked false confidence, meaning failed evidence still reached stable promotion.
5. `after_exit_contract_correctness_rate`
   Measures whether contracts express after-exit durability when required.
6. `after_exit_evidence_success_rate`
   Measures whether supplied execution evidence proves after-exit durability.
7. `cross_shell_revalidation_success_rate`
   Measures whether supplied execution evidence proves fresh-shell visibility.
8. `live_execution_coverage_rate`
   Measures how much of the report is backed by live `external_probe` execution.
9. `live_execution_coverage_by_family`
   Measures live `external_probe` coverage per Runtime task family, for example `service_publish_validate`, `package_publish_validate`, `git_deploy_webserver`, `task_resume_interrupted_export_pipeline`, `handoff_resume`, `agent_takeover`, and `ai_code_ci_repair`.
10. `authority_decision_report`
    Explains why each authority decision was allowed, blocked, downgraded to advisory, or limited to inspect/rehydrate. This includes outcome contract gating, execution evidence gating, stable promotion, false-confidence blocking, candidate workflow reuse, and policy default materialization.

## Readiness Gate

Every report includes `readiness_gate` with contract `runtime_dogfood_readiness_gate_v1`.

The gate has two layers:

1. `regression_status`
   Passes when the selected dogfood suite has no contract/evidence/assertion failures, no unblocked false confidence, no authority-gate false positives or false negatives, no wasted workflow steps, and correct after-exit contract expression where measured.
2. `live_product_status`
   Passes only when `regression_status=pass`, the report has `pass_live_evidence`, live coverage is complete, after-exit evidence succeeds, cross-shell revalidation succeeds, and every required live task family has full external-probe coverage.

The required live task families are:

1. `service_publish_validate`
2. `package_publish_validate`
3. `git_deploy_webserver`
4. `task_resume_interrupted_export_pipeline`
5. `handoff_resume`
6. `agent_takeover`
7. `ai_code_ci_repair`

Interpretation:

1. `claim_level=live_product`
   The dogfood run can support a live product readiness claim.
2. `claim_level=regression`
   The Runtime passed regression safety checks, but live product readiness is still blocked by missing or partial external-probe coverage.
3. `claim_level=not_ready`
   A regression blocker exists. Fix Runtime behavior before making product claims.

`--gate-json` prints only the gate. `--out-gate-json` writes it as an artifact. `--require-live-readiness` exits non-zero unless `live_product_status=pass`.

## Live External Probe Slices

`npm run dogfood:lite:runtime:external-probe` runs live probes for seven real task families:

1. service after-exit fresh-shell validation
2. publish/install clean-client validation
3. deploy/hook/web visible outcome validation
4. interrupted resume narrow-slice validation
5. next-day handoff resume validation
6. second-agent takeover validation
7. AI code CI/test repair targeted validation

Each slice creates a temporary local fixture, launches or validates through a fresh shell, records execution evidence, and feeds the resulting task spec back through the same dogfood contract path. Workspace-backed slices such as deploy/hook/web and AI code CI repair can also validate the actual arm workspace causally after an agent attempt. The live runner must not add task-specific Runtime routes or bypass the Contract Compiler and Trust Gate.

The AI code CI repair slice supports fixture variants for `percentage_rounding`, `misleading_ai_patch`, `hidden_edge_case`, `wrong_surface_trap`, and `dependency_surface`. Workspace-backed verification runs the targeted test and also rejects success manufactured by editing immutable acceptance evidence such as tests, package metadata, or the fixture README. The `dependency_surface` variant records variant-specific target files and workflow steps so the Aionis arm can receive a precise Runtime contract while baseline still receives only the normal task request.

## Live Probe Diagnostics

The external-probe run payload includes `diagnostics[]`, one entry per slice. Each diagnostic records:

1. `slice`
   The live proof family that ran.
2. `scenario_id`
   The dogfood scenario compiled from the live proof.
3. `command`
   The primary command used to prove the slice.
4. `cwd`
   The working directory used for that command.
5. `duration_ms`
   Command runtime in milliseconds.
6. `exit_code`
   The process exit code, or `null` if unavailable.
7. `stdout_tail` and `stderr_tail`
   Bounded tails for failure triage without flooding CI logs.
8. `failure_class`
   A stable category such as `service_launch_failed`, `fresh_shell_probe_failed`, `clean_client_install_failed`, `served_web_content_probe_failed`, `served_web_content_mismatch`, or `live_command_probe_failed`.
9. `commands[]`
   The ordered command-level diagnostics for multi-step slices such as service launch plus fresh-shell probe.

CI uploads `artifacts/runtime-dogfood/` for every Lite CI run. The primary files are `external-run.json`, `external-report.json`, `external-readiness-gate.json`, `external-report.md`, and `external-tasks.json`.

Real A/B validation reports also include cost and control signals when LLM runner artifacts are present. The report automatically carries action counts, wasted/incorrect events, duration, token usage, token/time deltas, and negative-control interpretation from the paired trace bundle.

The LLM runner must keep A/B prompt surfaces isolated by arm:

1. `baseline` receives a normal task request and must discover files/checks from the workspace.
2. `aionis_assisted` receives the compact Runtime contract with target files, next action, acceptance checks, lifecycle constraints, and authority boundary.
3. `negative_control` receives only observational low-trust context, which must not become authoritative.
4. `positive_control` receives an oracle-quality handoff to prove the task is recoverable.

If baseline receives Aionis contract fields such as `target_files`, `next_action`, lifecycle constraints, or authority boundaries, the run can still be useful as verifier evidence, but it must not be treated as clean A/B comparison evidence.

## Product Status

`product_status` has four values:

1. `pass_live_evidence`
   The suite passed and at least one scenario used live external execution evidence.
2. `pass_fixture_evidence_only`
   The suite passed, but all proof is declared fixture evidence. This is useful for regression testing, not enough for a live product claim.
3. `fail_contract_or_evidence`
   One or more scenarios failed contract, evidence, or authority assertions.
4. `fail_unblocked_false_confidence`
   False confidence reached stable promotion. This is a Trust Gate defect and must be fixed before adding more scenarios.

## Proof Boundary

Every report declares its proof boundary:

1. `declared_fixture`
   Structured scenario evidence supplied by the dogfood spec.
2. `external_probe`
   Live external validation, such as launching a detached service and probing it from a fresh shell.
3. `none`
   Contract-only evaluation without execution evidence.

Only `external_probe` scenarios can be used as live execution proof. Fixture-backed reports are still valuable, but they must not be presented as live product validation.

## Authority Rule

The report treats authority as a Trust Gate outcome, not as recall strength.

Stable promotion is safe only when:

1. the outcome contract allows authority
2. execution evidence allows authority
3. false confidence is not detected
4. service lifecycle requirements are proven when present

For service lifecycle tasks:

1. `validation_passed=true` is not enough
2. `must_hold_after_exit` requires `after_exit_revalidated=true`
3. fresh-shell visibility requires `fresh_shell_probe_passed=true`
4. missing or failed lifecycle evidence must keep reusable workflow memory advisory

## Authority Decision Report

Every product report includes `report.authority_decision_report` with:

1. `summary`
   Counts allowed, blocked, advisory-only, inspect/rehydrate-only, and unblocked false-confidence decisions.
2. `read_side_rules`
   Source-owned `authority_rules` copied from the Runtime authority boundary registry. This is where candidate workflow and trusted-pattern-only boundaries are visible to product reporting.
3. `decisions`
   Scenario-level decisions with `surface`, `disposition`, `authority_effect`, `reasons`, `rule_refs`, `source_ids`, and `recommended_action`.

Important interpretation rules:

1. `candidate_workflow_reuse` with `inspect_or_rehydrate_only` means the Runtime saw reusable workflow evidence, but it was not stable authority and must not emit stable workflow tool-source authority.
2. `trusted_pattern_policy_materialization` with `advisory_only` means trusted-pattern-only guidance can steer a tool preference, but cannot become authoritative/default policy by itself.
3. `policy_default_materialization` with `blocked` means default policy lacked stable workflow support or a live authoritative execution contract.
4. `false_confidence_gate` with `unblocked_false_confidence` is a release blocker.

## Recommended Read Path

For product decisions, read:

1. `report.product_status`
2. `report.readiness_gate`
3. `report.product_metrics`
   Include `live_execution_coverage_by_family` when comparing task-family readiness.
4. `report.blocking_risks`
5. `report.next_actions`
6. `report.scenarios[].authority_gate_result`
7. `report.authority_decision_report.summary`
8. `report.scenarios[].authority_decision_summary`
9. `report.scenarios[].recommended_next_action`

For debugging Runtime internals, read the full `RuntimeDogfoodSuiteResult.scenarios[]` payload.

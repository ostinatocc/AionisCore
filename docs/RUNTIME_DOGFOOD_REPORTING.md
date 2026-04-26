# Runtime Dogfood Reporting

Last reviewed: 2026-04-26

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
   Measures live `external_probe` coverage per Runtime task family, for example `service_publish_validate`, `package_publish_validate`, and `git_deploy_webserver`.

## Live External Probe Slices

`npm run dogfood:lite:runtime:external-probe` runs live probes for three real task families:

1. service after-exit fresh-shell validation
2. publish/install clean-client validation
3. deploy/hook/web visible outcome validation

Each slice creates a temporary local fixture, launches or validates through a fresh shell, records execution evidence, and feeds the resulting task spec back through the same dogfood contract path. The live runner must not add task-specific Runtime routes or bypass the Contract Compiler and Trust Gate.

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

## Recommended Read Path

For product decisions, read:

1. `report.product_status`
2. `report.product_metrics`
   Include `live_execution_coverage_by_family` when comparing task-family readiness.
3. `report.blocking_risks`
4. `report.next_actions`
5. `report.scenarios[].authority_gate_result`
6. `report.scenarios[].recommended_next_action`

For debugging Runtime internals, read the full `RuntimeDogfoodSuiteResult.scenarios[]` payload.

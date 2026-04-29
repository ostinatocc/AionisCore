# Aionis Real A/B Evidence Report

Date: 2026-04-28

Last reviewed: 2026-04-29

Document status: real A/B evidence report

This report summarizes the first real LLM-backed A/B evidence runs for Aionis Runtime, the follow-up `contract_only` reruns, the first action-discipline revalidation, and the model-locked causal revalidations for publish/install, deploy/webserver, and service lifecycle. The goal is not to claim broad product superiority. The goal is to state what the current evidence can and cannot prove, then define the next Runtime hardening steps.

## Evidence Boundary

These runs are directional pilot evidence, not broad product proof.

- Each suite used four arms: `baseline`, `aionis_assisted`, `negative_control`, and `positive_control`.
- Each suite used live agent traces plus external dogfood verifier artifacts.
- The deploy/webserver, publish/install, and AI code CI repair slices now support causal verifier mode: the verifier checks the exact arm workspace after the agent modifies it.
- The evidence supports family-level claims only for the tested task families.
- The evidence does not prove universal token savings or universal agent performance gains.
- The LLM runner now isolates prompt surfaces by arm: `baseline` receives only a normal task request, `aionis_assisted` receives the Runtime contract, `negative_control` receives non-authoritative low-trust context, and `positive_control` receives an oracle handoff.
- The LLM runner now records explicit run-environment evidence: requested model, reasoning effort, agent CLI, CLI version, command hash, and workspace before/after hashes.
- New clean suites should include `aionis_ab_fairness_manifest_v1`: frozen task ids, frozen verifier, frozen packet policy, required same model/effort/CLI/command/workspace hashes, and verifier workspace provenance.
- External dogfood probe artifacts now carry `runtime_dogfood_external_probe_provenance_v1`, including the verified workspace root, target paths, verifier commands, and fresh-shell/after-exit boundary flags.
- The hard service lifecycle verifier is available as `external_probe_service_lifecycle_hard`; it validates HTTP health, pid-file, live process, and lifecycle log evidence from a fresh shell after launcher exit.
- The hard publish/install verifier is available as `external_probe_publish_install_hard`; it validates package index visibility, clean-client install, and installed package API behavior from a fresh shell after worker exit.
- LLM suites run before this arm-prompt isolation should be treated as directional evidence and verifier evidence, not final clean A/B proof.

## Suites

### Initial Rich-Packet Runs

| Suite | Task family | Report | Gate |
| --- | --- | --- | --- |
| `llm-smoke-20260428-112048` | `service_publish_validate` | `.artifacts/real-ab/llm-smoke-20260428-112048/validation-report.md` | pass |
| `publish-install-20260428-123831` | `package_publish_validate` | `.artifacts/real-ab/publish-install-20260428-123831/validation-report.md` | pass |
| `deploy-web-20260428-140245` | `git_deploy_webserver` | `.artifacts/real-ab/deploy-web-20260428-140245/validation-report.md` | pass |

### Contract-Only Reruns

| Suite | Task family | Report | Gate |
| --- | --- | --- | --- |
| `contract-service-20260428-165728` | `service_publish_validate` | `.artifacts/real-ab/contract-service-20260428-165728/validation-report.md` | pass |
| `contract-publish-20260428-172722` | `package_publish_validate` | `.artifacts/real-ab/contract-publish-20260428-172722/validation-report.md` | pass |
| `contract-deploy-20260428-180029` | `git_deploy_webserver` | `.artifacts/real-ab/contract-deploy-20260428-180029/validation-report.md` | pass |

### Commercial-Family Pilot Runs

| Suite | Task family | Report | Gate |
| --- | --- | --- | --- |
| `ai-code-ci-20260428-194736` | `ai_code_ci_repair` | `.artifacts/real-ab/ai-code-ci-20260428-194736/validation-report.md` | pass |
| `ai-code-ci-wrong-surface-20260428-204159` | `ai_code_ci_repair` | `.artifacts/real-ab/ai-code-ci-wrong-surface-20260428-204159/validation-report.md` | pass |
| `ai-code-ci-isolated-hidden-20260428-210356` | `ai_code_ci_repair` | `.artifacts/real-ab/ai-code-ci-isolated-hidden-20260428-210356/validation-report.md` | pass |
| `ai-code-ci-dependency-surface-20260428-214009` | `ai_code_ci_repair` | `.artifacts/real-ab/ai-code-ci-dependency-surface-20260428-214009/validation-report.md` | pass |
| `ai-code-ci-dependency-surface-repeat-20260428-220043` | `ai_code_ci_repair` | `.artifacts/real-ab/ai-code-ci-dependency-surface-repeat-20260428-220043/validation-report.md` | pass |
| `ai-code-ci-dependency-surface-contract-packet-20260428-224137` | `ai_code_ci_repair` | `.artifacts/real-ab/ai-code-ci-dependency-surface-contract-packet-20260428-224137/validation-report.md` | pass |
| `ai-code-ci-dependency-surface-action-discipline-20260428-232156` | `ai_code_ci_repair` | `.artifacts/real-ab/ai-code-ci-dependency-surface-action-discipline-20260428-232156/validation-report.md` | pass |
| `ai-code-ci-dependency-surface-action-discipline-20260428-232156` discipline-gate revalidation | `ai_code_ci_repair` | `.artifacts/real-ab/ai-code-ci-dependency-surface-action-discipline-20260428-232156/validation-report.discipline-gate.md` | pass |
| `publish-install-causal-20260429-114214` | `package_publish_validate` | `.artifacts/real-ab/publish-install-causal-20260429-114214/validation-report.md` | pass |
| `publish-install-causal-model-locked-20260429-150631` | `package_publish_validate` | `.artifacts/real-ab/publish-install-causal-model-locked-20260429-150631/validation-report.md` | pass |
| `deploy-web-causal-model-locked-20260429-160352` | `git_deploy_webserver` | `.artifacts/real-ab/deploy-web-causal-model-locked-20260429-160352/validation-report.md` | pass |
| `service-causal-model-locked-20260429-164153` | `service_publish_validate` | `.artifacts/real-ab/service-causal-model-locked-20260429-164153/validation-report.md` | pass |
| `service-hard-contract-equalcmd-20260429-194810` | `service_publish_validate` | `.artifacts/real-ab/service-hard-contract-equalcmd-20260429-194810/validation-report.md` | pass |
| `service-hard-contract-repeat-20260429-202438` | `service_publish_validate` | `.artifacts/real-ab/service-hard-contract-repeat-20260429-202438/validation-report.md` | pass |
| `publish-install-hard-contract-fix-20260429-221952` | `package_publish_validate` | `.artifacts/real-ab/publish-install-hard-contract-fix-20260429-221952/validation-report.md` | pass |

## Initial Directional Results

| Family | Baseline completion | Aionis completion | Baseline first-correct | Aionis first-correct | Negative control authoritative count | Positive control sanity |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `service_publish_validate` | 100% | 100% | 100% | 100% | 0 | 100% |
| `package_publish_validate` | 100% | 100% | 100% | 100% | 0 | 100% |
| `git_deploy_webserver` | 100% | 100% | 0% | 100% | 0 | 100% |

## Cost And Step Signals

| Family | Baseline events | Aionis events | Baseline wasted | Aionis wasted | Baseline duration | Aionis duration | Baseline tokens | Aionis tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `service_publish_validate` | 12 | 13 | 2 | 1 | 364s | 224s | 67,311 | 80,970 |
| `package_publish_validate` | 25 | 27 | 2 | 0 | 444s | 505s | 79,577 | 101,885 |
| `git_deploy_webserver` | 18 | 21 | 1 | 0 | 190s | 459s | n/a | 134,120 |

The current evidence shows reliability advantages more clearly than cost advantages. Aionis reduced self-marked wasted steps in all three families and improved first-correct behavior in deploy/webserver. It did not consistently reduce event count, elapsed time, or tokens.

## Contract-Only Rerun Results

| Family | Baseline completion | Aionis completion | Baseline first-correct | Aionis first-correct | Negative control authoritative count | Positive control sanity |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `service_publish_validate` | 100% | 100% | 100% | 100% | 0 | 100% |
| `package_publish_validate` | 100% | 100% | 100% | 100% | 0 | 100% |
| `git_deploy_webserver` | 100% | 100% | 100% | 100% | 0 | 100% |

| Family | Baseline events | Aionis events | Baseline wasted | Aionis wasted | Baseline incorrect events | Aionis incorrect events | Baseline duration | Aionis duration | Baseline tokens | Aionis tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `service_publish_validate` | 12 | 14 | 2 | 0 | 2 | 2 | 234s | 182s | 54,468 | 59,648 |
| `package_publish_validate` | 18 | 13 | 0 | 0 | 2 | 2 | 479s | 416s | 125,189 | 98,369 |
| `git_deploy_webserver` | 19 | 12 | 3 | 0 | 3 | 0 | 214s | 154s | 68,343 | 53,434 |

The `contract_only` rerun preserved correctness across all three tested families and improved elapsed time in all three. It also reduced event count and token usage in publish/install and deploy/webserver. Service lifecycle still used slightly more tokens for Aionis than baseline, but completed faster and removed self-marked wasted steps.

The strongest compact-packet signal is `git_deploy_webserver`: Aionis used fewer events, fewer tokens, less time, zero wasted steps, and zero incorrect events while still passing the causal workspace verifier.

## Commercial-Family Pilot Result

The first commercial-family slice is `ai_code_ci_repair`: repair an almost-right AI-generated patch so the targeted CI test passes without broad unrelated edits. This maps to a high-frequency coding workflow where the value is not only solving the task, but narrowing the work surface, avoiding irrelevant repo exploration, and requiring verifier-backed success.

| Family | Baseline events | Aionis events | Baseline wasted | Aionis wasted | Baseline incorrect events | Aionis incorrect events | Baseline duration | Aionis duration | Baseline tokens | Aionis tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `ai_code_ci_repair` | 15 | 8 | 4 | 0 | 4 | 0 | 200s | 126s | 57,179 | 47,894 |

In this pilot, Aionis preserved correctness while reducing action events by 46.7%, elapsed time by 37.1%, and token use by 16.2% compared with baseline. The gate passed, completion was 100% for both arms, first-correct action was 100% for both arms, and false-confidence rate was 0% for both arms.

Control interpretation matters: the negative control also passed with 9 events, 98s, and 45,960 tokens. That means this specific fixture is not hard enough to prove unique Aionis correctness. It does support a narrower claim: compact Aionis contracts can reduce wasted steps and preserve verifier-backed correctness in an AI code CI repair family. Stronger commercial proof requires repeated trials and harder variants with misleading patches, hidden edge cases, or larger dependency surfaces.

## Commercial-Family Harder Variant Result

The follow-up `wrong_surface_trap` variant tightened the verifier so success cannot be manufactured by weakening tests, changing package metadata, or changing the fixture README. This made the evidence boundary stronger, but it did not produce an Aionis-only correctness advantage.

This run used the pre-isolation LLM runner, where baseline still received contract-like task fields. Treat it as verifier-boundary evidence, not clean arm-comparison proof.

| Family / variant | Baseline actions | Aionis actions | Negative actions | Positive actions | Baseline wasted | Aionis wasted | Baseline duration | Aionis duration | Baseline tokens | Aionis tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `ai_code_ci_repair / wrong_surface_trap` | 9 | 9 | 9 | 7 | 1 | 0 | 183s | 189s | 26,992 | 74,342 |

All four arms passed verifier-backed completion and preserved immutable acceptance evidence. The useful evidence is therefore limited:

- The causal verifier and immutable-evidence guard work.
- Aionis preserved correctness and removed one self-marked wasted step.
- Baseline and negative control also solved the task.
- Aionis cost was worse in this run: +47,350 tokens and +6s versus baseline.

This result should be treated as a boundary-finding run, not a product win. It says the current `wrong_surface_trap` variant is still too easy to separate correctness, and Aionis packet cost must stay compressed or escalate only when needed.

## Commercial-Family Clean Isolation Result

After isolating arm-specific prompt surfaces, the `hidden_edge_case` variant was rerun with a clean baseline prompt that did not receive Aionis contract fields.

| Family / variant | Baseline actions | Aionis actions | Negative actions | Positive actions | Baseline wasted | Aionis wasted | Baseline duration | Aionis duration | Baseline tokens | Aionis tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `ai_code_ci_repair / hidden_edge_case` | 11 | 10 | 12 | 8 | 0 | 0 | 105s | 190s | 66,899 | 13,515 |

This is the cleanest current commercial-family signal:

- Aionis preserved verifier-backed correctness.
- Aionis reduced action events by 9.1% versus baseline.
- Aionis reduced token use by 79.8% versus baseline.
- Aionis took 85s longer than baseline.
- Baseline and negative control also passed, so the run does not prove unique correctness.

The current defensible claim is cost compression under a verifier boundary, not correctness separation. The next proof needs a harder repair task where baseline or negative control shows retries, false confidence, wrong-file touches, or failure.

## Commercial-Family Dependency Surface Result

The `dependency_surface` variant tests whether the agent can trace a pricing failure from `discountedTotalCents` into `discount-policy.mjs` instead of only patching the visible entrypoint. This is a better proxy for real AI code repair because the correct work surface spans multiple implementation files while tests and package metadata remain immutable acceptance evidence.

| Family / variant | Baseline actions | Aionis actions | Negative actions | Positive actions | Baseline wasted | Aionis wasted | Baseline duration | Aionis duration | Baseline tokens | Aionis tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `ai_code_ci_repair / dependency_surface` | 16 | 12 | 13 | 11 | 0 | 0 | 196s | 90s | 36,765 | 27,705 |
| `ai_code_ci_repair / dependency_surface repeat` | 13 | 12 | 9 | 10 | 0 | 0 | 110s | 93s | 51,738 | 75,520 |
| `ai_code_ci_repair / dependency_surface contract-packet` | 11 | 16 | 13 | 10 | 0 | 0 | 106s | 147s | 73,845 | 58,591 |
| `ai_code_ci_repair / dependency_surface action-discipline` | 13 | 8 | 13 | 9 | 0 | 0 | 103s | 199s | 75,029 | 78,023 |

The first dependency-surface run was the strongest clean CI repair signal so far:

- Aionis preserved verifier-backed correctness.
- Aionis reduced action events by 25.0% versus baseline.
- Aionis reduced elapsed time by 54.4% versus baseline.
- Aionis reduced token use by 24.6% versus baseline.
- Aionis used fewer tokens than negative control and positive control.
- Baseline and negative control also passed, so this is still not correctness separation.

The repeat run kept part of the signal but weakened the token claim:

- Aionis preserved verifier-backed correctness again.
- Aionis reduced action events by 7.7% versus baseline.
- Aionis reduced elapsed time by 15.1% versus baseline.
- Aionis used 46.0% more tokens than baseline.
- Negative control was cheaper and faster than Aionis in this repeat.

The Runtime-level contract-packet run changed the failure mode:

- Aionis preserved verifier-backed correctness again.
- Aionis used 20.7% fewer tokens than baseline.
- Aionis used 45.5% more action/tool events than baseline.
- Aionis took 38.7% longer than baseline.
- Negative control also passed and was faster than Aionis.

The action-discipline run fixed the action-count regression but exposed remaining latency/token variance:

- Aionis preserved verifier-backed correctness again.
- Aionis reduced action/tool events by 38.5% versus baseline.
- Aionis used slightly more tokens than baseline: +4.0%.
- Aionis took 93.1% longer than baseline.
- Negative control also passed with the same action count as baseline.

The same trace was then revalidated after adding an explicit `Discipline Compliance` gate to the A/B report. The revalidation passed:

- Aionis discipline status was `pass (0)`.
- Severe discipline violations: `0`.
- First declared target event index: `1`.
- First edit event index: `2`.
- Pre-edit confirmation steps: `2/2`.
- First acceptance pass event index: `7`.

This matters because the older pass only proved verifier-backed completion. The discipline-gate revalidation also proves the authoritative Aionis arm followed the locked execution contract: inspect declared target surface first, stay within the allowed work surface, keep acceptance evidence read-only, and stop after required validation while allowing the harness verifier to add independent evidence.

The current defensible claim for this family is narrower: compact Aionis Runtime contracts plus action discipline can preserve correctness, reduce action count, and keep authoritative execution inside a measurable contract boundary, but token and elapsed-time savings are still not stable on this dependency-surface repair task. The remaining gap is execution latency and cost variance after the agent follows the declared path.

## Causal Publish/Install Revalidation

The `publish-install-causal-20260429-114214` suite reran package publish/install with a stricter causal verifier. Unlike the older publish/install evidence, the verifier rebuilt and served the exact arm workspace after the agent attempt, then validated from a fresh shell using a clean client install.

| Family | Baseline actions | Aionis actions | Negative actions | Positive actions | Baseline wasted | Aionis wasted | Baseline duration | Aionis duration | Baseline tokens | Aionis tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `package_publish_validate / causal workspace` | 31 | 27 | 25 | 14 | 1 | 1 | 862s | 607s | 127,603 | 57,053 |

This run passed the product evidence gate after the gate was corrected to measure real efficiency through action count, token, or time reduction instead of only self-marked wasted steps:

- Aionis preserved verifier-backed correctness and after-exit/fresh-shell clean-client install correctness.
- Aionis reduced action events by 12.9% versus baseline.
- Aionis reduced token use by 55.3% versus baseline.
- Aionis reduced elapsed time by 29.5% versus baseline.
- Aionis followed locked action discipline: first target event `0`, first edit event `4`, pre-edit budget `4/4`, severe violations `0`.
- Negative control also passed and used fewer actions than baseline, so this run is an efficiency and verifier-boundary signal, not unique correctness separation.

The first assembly failed before the gate correction because the discipline gate used a fixed `max_pre_edit_confirmation_steps=2`. That was too crude for outcome-contract tasks where the correct workflow is target-file inspection plus targeted failure reproduction before editing. The Runtime now derives the pre-edit budget from the outcome contract: target-file count, required acceptance checks, and lifecycle/external-visibility constraints.

## Model-Locked Causal Publish/Install Revalidation

The `publish-install-causal-model-locked-20260429-150631` suite reran the same package publish/install causal workspace scenario with explicit agent-environment evidence. Every arm used `codex exec --model gpt-5.5` with `model_reasoning_effort="xhigh"`, and the runner recorded `codex-cli 0.125.0`, command hash, plus workspace before/after hashes for each arm.

| Family | Baseline actions | Aionis actions | Negative actions | Positive actions | Baseline wasted | Aionis wasted | Baseline duration | Aionis duration | Baseline tokens | Aionis tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `package_publish_validate / causal workspace / model-locked` | 20 | 12 | 24 | 17 | 3 | 1 | 284s | 311s | 68,987 | 61,905 |

This model-locked rerun passed the product evidence gate:

- Aionis preserved verifier-backed clean-client install correctness under the same explicit GPT-5.5/xhigh Codex setup as baseline.
- Aionis reduced action events by 40.0% versus baseline.
- Aionis reduced self-marked wasted steps by 66.7% versus baseline.
- Aionis reduced token use by 10.3% versus baseline.
- Aionis was slower in wall-clock time: +27s, or -9.7% time reduction.
- Aionis followed locked action discipline: first target event `0`, first edit event `2`, pre-edit budget `2/4`, severe violations `0`.
- Negative control also passed, so this remains an efficiency, scope-control, and verifier-boundary signal, not unique correctness separation.

This is the cleanest current publish/install cost-control evidence because the model, reasoning effort, CLI version, command hash, and workspace fingerprints are all recorded. It also shows the current limit: Aionis can shorten the execution path and reduce tokens in this family, but elapsed-time savings are still not stable.

## Model-Locked Deploy/Webserver Revalidation

The `deploy-web-causal-model-locked-20260429-160352` suite reran the deploy/hook/web visible-outcome scenario with explicit agent-environment evidence. Every arm used `codex exec --model gpt-5.5` with `model_reasoning_effort="xhigh"`, and the runner recorded `codex-cli 0.125.0`, command hash, plus workspace before/after hashes for each arm. The causal verifier checked the exact arm workspace and validated served web content through a fresh-shell HTTP probe.

| Family | Baseline actions | Aionis actions | Negative actions | Positive actions | Baseline wasted | Aionis wasted | Baseline duration | Aionis duration | Baseline tokens | Aionis tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `git_deploy_webserver / causal workspace / model-locked` | 27 | 16 | 27 | 23 | 3 | 4 | 298s | 169s | 61,113 | 57,512 |

This model-locked rerun passed the product evidence gate:

- Aionis preserved verifier-backed served-content correctness under the same explicit GPT-5.5/xhigh Codex setup as baseline.
- Aionis reduced action events by 40.7% versus baseline.
- Aionis reduced elapsed time by 43.3% versus baseline.
- Aionis reduced token use by 5.9% versus baseline.
- Aionis self-marked wasted steps were worse by one step: baseline `3`, Aionis `4`.
- Aionis followed locked action discipline: first target event `0`, first edit event `3`, pre-edit budget `3/4`, severe violations `0`.
- Negative control also passed and reached the same final workspace hash as Aionis, so this remains an efficiency and scope-control signal, not unique correctness separation.

This is now the cleanest deploy/webserver evidence because it combines model-locked run metadata, identical starting workspace hashes, independent causal workspace verification, and direct run-environment rows in the validation report. It strengthens the deploy/webserver family claim: Aionis can materially shorten the execution path and wall-clock time for hook/web visibility repair while preserving verifier-backed correctness. It does not prove stable waste reduction or unique correctness.

## Model-Locked Service Lifecycle Revalidation

The `service-causal-model-locked-20260429-164153` suite reran the service after-exit scenario with explicit agent-environment evidence. Before this run, the service external verifier was upgraded to support `--workspace-root`, so it now launches the service script from the exact arm workspace instead of the repository fixture. Every arm used `codex exec --model gpt-5.5` with `model_reasoning_effort="xhigh"`, and the runner recorded `codex-cli 0.125.0`, command hash, plus workspace before/after hashes for each arm.

| Family | Baseline actions | Aionis actions | Negative actions | Positive actions | Baseline wasted | Aionis wasted | Baseline duration | Aionis duration | Baseline tokens | Aionis tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `service_publish_validate / causal workspace / model-locked` | 27 | 8 | 1 | 7 | 1 | 0 | 320s | 173s | 102,241 | 54,840 |

This model-locked rerun passed the product evidence gate:

- Aionis preserved after-exit and fresh-shell `/healthz` correctness under the same explicit GPT-5.5/xhigh Codex setup as baseline.
- Aionis reduced action events by 70.4% versus baseline.
- Aionis reduced elapsed time by 45.8% versus baseline.
- Aionis reduced token use by 46.4% versus baseline.
- Aionis reduced self-marked wasted steps from `1` to `0`.
- Aionis followed locked action discipline: first target event `0`, no edit event, pre-edit budget `0/3`, severe violations `0`.
- Negative control also passed with one action, so this is a lifecycle-boundary and efficiency signal, not unique correctness separation.

This is now the cleanest service lifecycle evidence because it validates the actual arm workspace, proves after-exit/fresh-shell correctness, and records model/CLI/workspace hashes. It strengthens the service family claim: Aionis can turn lifecycle constraints into a shorter, verifier-backed execution path. It also shows this fixture is too easy for correctness separation because a low-trust control can pass with very few actions.

## Hard Service Lifecycle Contract Result

The `service-hard-contract-equalcmd-20260429-194810` suite reran the harder lifecycle slice after locking the arm command string. Every arm used the same `codex exec --model gpt-5.5` command, the same `model_reasoning_effort="xhigh"`, the same CLI version, the same command hash, and the same initial workspace hash. The verifier required the verifier-launched process itself to remain the service process, then revalidated health JSON, pid-file JSON, live PID, and lifecycle log evidence from a fresh shell.

| Family / variant | Baseline actions | Aionis actions | Negative actions | Positive actions | Baseline wasted | Aionis wasted | Baseline duration | Aionis duration | Baseline tokens | Aionis tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `service_publish_validate / hard lifecycle / equal command` | 27 | 5 | 16 | 15 | 2 | 1 | 281s | 147s | 112,367 | 31,043 |

This is the strongest current service-family correctness-separation evidence:

- Aionis passed the external fresh-shell verifier.
- Baseline failed with `log_missing_start_marker`: it repaired health and pid behavior, but missed required durable lifecycle evidence.
- Negative control failed with `health_pid_mismatch`: it self-spawned a child worker, so the HTTP service PID did not match the verifier-launched process.
- Positive control passed, proving the task is recoverable under the verifier.
- Aionis reduced action events by 81.5%, elapsed time by 47.7%, and token use by 72.4% versus baseline.
- Aionis followed locked action discipline with zero severe violations.

This run is materially stronger than the earlier easy service lifecycle result because negative control did not pass. The useful claim is still family-bounded: it supports hard lifecycle/outcome-contract value, not universal Aionis superiority.

## Hard Service Lifecycle Repeat Result

The `service-hard-contract-repeat-20260429-202438` suite repeated the same hard lifecycle slice under the same frozen fairness protocol: GPT-5.5, `xhigh`, Codex CLI `0.125.0`, same command hash across arms, same initial workspace hash, and external verifier provenance for each arm.

| Family / variant | Baseline actions | Aionis actions | Negative actions | Positive actions | Baseline wasted | Aionis wasted | Baseline duration | Aionis duration | Baseline tokens | Aionis tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `service_publish_validate / hard lifecycle / repeat` | 15 | 13 | 24 | 11 | 1 | 2 | 486s | 307s | 119,385 | 103,315 |

This repeat confirmed the correctness-separation pattern:

- Aionis passed the external fresh-shell verifier again.
- Baseline failed again with `log_missing_start_marker`.
- Negative control failed again with `log_missing_start_marker`.
- Positive control passed, after a protocol-violating first attempt was rejected by the runner and the arm was reset to the same initial workspace before the accepted rerun.
- Aionis reduced action events by 13.3%, elapsed time by 36.7%, and token use by 13.5% versus baseline.
- Aionis had worse self-marked wasted steps than baseline in this repeat: `2` versus `1`.

This moves hard service lifecycle from a single strong result to an initial repeated family signal. The stable claim is now correctness and verifier-boundary separation. Cost compression is present in the repeat, but weaker and not yet stable enough to be the lead claim.

## Hard Publish/Install Contract-Fix Result

The `publish-install-hard-contract-fix-20260429-221952` suite reran the hard package publish/install slice after narrowing package contracts so local HTTP index serving is treated as validation transport, not product-owned service lifecycle.

| Family / variant | Baseline actions | Aionis actions | Negative actions | Positive actions | Baseline wasted | Aionis wasted | Baseline duration | Aionis duration | Baseline tokens | Aionis tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `package_publish_validate / hard publish-install / contract fix` | 30 | 12 | 18 | 13 | 3 | 1 | 325s | 207s | 98,957 | 60,175 |

This run passed the paired product gate:

- All four arms passed the external verifier.
- Aionis reduced action count by 60.0%, wasted steps by 66.7%, elapsed time by 36.4%, and token use by 39.2% versus baseline.
- Negative control also passed, so this is an efficiency/control signal, not correctness separation.
- The result validates the Runtime contract-boundary fix: package publish/install should carry clean-client and installed-API outcome constraints without injecting service lifecycle instructions.

## What This Proves

Aionis can currently make defensible directional claims in these areas:

- It can preserve correctness across service lifecycle, publish/install, and deploy/webserver families.
- It can preserve correctness and reduce wasted action in the first AI code CI repair pilot.
- It can prevent irrelevant or low-trust context from becoming authoritative, as shown by negative-control authoritative count `0`.
- It can improve first correct action when the task depends on execution continuity and external visibility.
- It can force the distinction between an agent success claim and verifier-backed success.
- It can turn external checks such as fresh-shell curl, clean-client install, and causal deploy verification into authority boundaries.
- It can protect CI repair evidence against forged success by rejecting modified tests, package metadata, or fixture README files.
- It can now audit contract-locked action discipline in A/B reports, including first target touch, pre-edit confirmation count, repeated agent validation after pass, non-target expansion, and acceptance-evidence edits.
- In one clean arm-isolated CI repair run, it can reduce token usage substantially while preserving verifier-backed correctness.
- In dependency-surface CI repair runs, it can preserve verifier-backed correctness and has shown token compression and action-count compression, but not consistently in the same run and not yet with stable elapsed-time improvement.
- In the causal publish/install rerun, it can reduce action count, elapsed time, and token use while preserving verifier-backed clean-client install correctness.
- In the model-locked causal publish/install rerun, it can reduce action count, wasted steps, and token use under explicit GPT-5.5/xhigh Codex conditions while preserving verifier-backed clean-client install correctness.
- In the model-locked deploy/webserver rerun, it can reduce action count and elapsed time under explicit GPT-5.5/xhigh Codex conditions while preserving verifier-backed served-content correctness.
- In the model-locked service lifecycle rerun, it can reduce action count, elapsed time, token use, and wasted steps while preserving after-exit and fresh-shell correctness.
- In the hard service lifecycle equal-command rerun, it can produce a correctness separation against both baseline and negative control while reducing actions, elapsed time, and tokens under explicit GPT-5.5/xhigh Codex conditions.
- In the hard service lifecycle repeat, it reproduced correctness separation against both baseline and negative control under the same frozen fairness protocol.
- In the hard publish/install contract-fix run, it preserved verifier-backed clean-client correctness while reducing actions, wasted steps, elapsed time, and token use versus baseline.

## What This Does Not Prove

Aionis should not currently claim:

- Universal token savings.
- Stable token savings across all task families.
- Stable wall-clock speedup for publish/install based on the model-locked causal rerun.
- Stable wasted-step reduction for deploy/webserver based on the model-locked causal rerun.
- Unique correctness advantage for the easier service lifecycle fixture, because negative control also passed with very few actions.
- Broad service-task superiority from two hard lifecycle runs.
- Stable hard-lifecycle wasted-step reduction, because the repeat had more self-marked wasted steps for Aionis than baseline.
- Stable token savings for `dependency_surface` CI repair based on current repeat evidence.
- Universal runtime speedup.
- Unique correctness advantage for AI code CI repair based on one easy pilot fixture.
- Unique correctness advantage for hard publish/install, because baseline and negative control also passed after the contract-boundary fix.
- Unique correctness advantage for the current `wrong_surface_trap` fixture, because baseline and negative control also passed.
- Unique correctness advantage for the clean `hidden_edge_case` fixture, because baseline and negative control also passed.
- Unique correctness advantage for the current `dependency_surface` fixture, because baseline and negative control also passed.
- Broad product superiority across untested task families.
- That richer Runtime packets are always better.
- That agent-side self-verification is enough for authority.

## Product Interpretation

Aionis should be positioned as a reliability and continuity Runtime first:

- It improves outcome correctness and trust boundaries.
- It reduces false-confidence risk.
- It carries task-family execution contracts across attempts.
- It can help agents start from the right work surface instead of re-discovering the task.

It should not be positioned primarily as a token-saving layer yet, but the `contract_only` reruns, model-locked causal reruns, and hard lifecycle equal-command rerun now show credible cost-compression potential in service lifecycle, publish/install, deploy/webserver, and selected CI repair tasks.

The `ai_code_ci_repair` pilot adds a second kind of product signal: Aionis can act as a compact execution-contract layer for AI coding repair loops, where the measurable advantage is fewer irrelevant actions and lower token cost while still requiring targeted CI evidence.

## Runtime Hardening Status

Completed:

- Added `contract_only` packet mode.
- Added reusable `execution_agent_contract_packet_v1` Runtime projection so compact agent-facing packets are produced from execution contracts instead of benchmark-local prompt assembly.
- Added automatic escalation from `contract_only` to expanded workflow packets when the compact contract is missing target files, next action, acceptance checks, unresolved blockers are present, or verification has failed.
- Added `action_discipline` to the Runtime agent contract packet so authoritative complete contracts can lock the first action, allowed work surface, required validation, prohibited broad discovery, and stop conditions.
- Added A/B `discipline_compliance` reporting and a product/pilot gate so authoritative Aionis treatment evidence fails when the agent violates locked action discipline.
- Changed the locked-contract pre-edit budget from a fixed constant to an outcome-contract-derived budget so service/external-visibility tasks can inspect target files and reproduce the declared failure before editing.
- Changed the A/B efficiency gate so product evidence can pass on action-count, token, or time reduction even when self-marked wasted-step counts do not move.
- Revalidated the latest dependency-surface action-discipline trace under the new gate; the gate passed with zero severe discipline violations.
- Added causal workspace verification for publish/install: the verifier now builds `scripts/build_index.py` inside the actual arm workspace and then performs fresh-shell clean-client install validation.
- Ran `publish-install-causal-20260429-114214`; the gate passed with 55.3% token reduction and 29.5% time reduction versus baseline.
- Added model/effort/CLI/version/command-hash/workspace-fingerprint evidence to the LLM runner.
- Tightened runner evidence ownership so direct `agent-events.json` mutation still fails unless the file already equals the runner's deterministic projection from parsed stdout.
- Ran `publish-install-causal-model-locked-20260429-150631`; the gate passed with 40.0% action-count reduction and 10.3% token reduction versus explicit GPT-5.5/xhigh Codex baseline.
- Ran `deploy-web-causal-model-locked-20260429-160352`; the gate passed with 40.7% action-count reduction and 43.3% time reduction versus explicit GPT-5.5/xhigh Codex baseline.
- Added causal workspace verification for service after-exit: the verifier now launches `scripts/fixtures/runtime-dogfood/service-after-exit-server.mjs` from the actual arm workspace and probes `/healthz` from a fresh shell after launcher exit.
- Ran `service-causal-model-locked-20260429-164153`; the gate passed with 70.4% action-count reduction, 46.4% token reduction, and 45.8% time reduction versus explicit GPT-5.5/xhigh Codex baseline.
- Added `aionis_ab_fairness_manifest_v1` templates and assembler guards so future clean suites fail when arms do not share model/effort/CLI/version/command hash/initial workspace hash or when verifier workspace provenance is missing.
- Added external probe provenance to dogfood run JSON so verifier artifacts state which workspace root and target paths were actually validated.
- Added `external_probe_service_lifecycle_hard`, a harder service lifecycle slice that requires the service to preserve durable lifecycle evidence beyond a health endpoint: pid file, lifecycle log, live PID, and fresh-shell HTTP validation.
- Added `external_probe_publish_install_hard`, a harder package publish/install slice that requires a clean client to install the served wheel and pass the installed `vectorops` API contract, not just observe an index entry.
- Extended the Contract Compiler so package publish/install contracts can recognize assertion-based `python -c` checks and extract installed API behavior as success invariants, dependency requirements, and external visibility requirements.
- Kept full workflow, replay, and pattern memory internal by default.
- Kept harness verifiers outside the agent default workflow.
- Repeated the same three families after packet compression.
- Added `ai_code_ci_repair` fixture variants for misleading patches, hidden edge cases, and wrong-surface traps.
- Added verifier guards that reject CI repair success manufactured by editing test/package/readme evidence.
- Added automatic A/B report cost/control output for action counts, wasted/incorrect events, duration, tokens, and negative-control interpretation.
- Isolated LLM runner prompt surfaces so baseline no longer receives Aionis contract fields.
- Added a `dependency_surface` CI repair fixture that requires tracing implementation behavior across pricing helper modules.
- Tightened `external_probe_service_lifecycle_hard` so the Runtime contract and verifier require the verifier-launched process itself to remain the service PID, with matching pid-file JSON, health JSON, lifecycle marker, and fresh-shell evidence.
- Ran `service-hard-contract-equalcmd-20260429-194810`; the gate passed with Aionis passing external verification, baseline failing on missing lifecycle marker, negative control failing on PID mismatch, and positive control passing.
- Ran `service-hard-contract-repeat-20260429-202438`; the gate passed with Aionis and positive control passing while baseline and negative control failed on missing lifecycle marker.
- Narrowed package publish/install contracts so fresh-shell clean-client validation remains authoritative while local HTTP index serving does not become service lifecycle guidance.
- Ran `publish-install-hard-contract-fix-20260429-221952`; the gate passed with all arms externally correct and Aionis materially reducing action count, wasted steps, elapsed time, and tokens versus baseline.

Remaining:

- Dogfood the automatic escalation path in live trials and verify it expands only after compact-contract insufficiency or verifier failure.
- Repeat action-discipline trials with the new `discipline_compliance` gate enabled and add stricter latency/cost analysis to separate model sampling latency from Runtime packet quality.
- Run at least two more paired trials per family before making stronger cost or reliability claims.
- Extend causal workspace verification beyond deploy/webserver, publish/install, and AI code CI repair where feasible.
- Run the remaining harder `ai_code_ci_repair` variants as paired LLM A/B trials before treating the commercial-family signal as stable.
- Rerun more commercial-family trials after arm-prompt isolation before making stable clean A/B claims.
- Add larger dependency-surface variants that are more likely to separate correctness rather than only cost/control.
- Rerun AI code CI repair with explicit model/effort/CLI/workspace-hash evidence before treating cross-family cost claims as stable.
- Repeat `external_probe_publish_install_hard` at least once more before treating package-family cost reduction as stable.
- Treat any new clean A/B suite without `aionis_ab_fairness_manifest_v1` and verifier provenance as directional evidence only.

## Claim Policy

Allowed current claim:

> Aionis Runtime has directional live A/B evidence that execution contracts and trust gates can improve correctness, first-action quality, and false-confidence control in service lifecycle, package publish/install, and deploy/webserver task families.

Allowed commercial-family pilot claim:

> Aionis Runtime has one live paired A/B pilot showing that compact execution contracts can reduce wasted steps, elapsed time, and token use in an AI code CI repair workflow while preserving verifier-backed correctness.

Allowed hard-variant verifier claim:

> Aionis Runtime has live evidence that its CI repair verifier can reject forged success by requiring immutable acceptance evidence, but the current hard variant does not yet prove Aionis-only correctness or cost advantage.

Allowed clean commercial-family cost claim:

> In one clean arm-isolated AI code CI repair run, Aionis Runtime preserved verifier-backed correctness while reducing token usage versus baseline, but it did not prove unique correctness and it was slower in wall-clock time.

Allowed dependency-surface cost claim:

> In one dependency-surface AI code CI repair run, Aionis Runtime preserved verifier-backed correctness while reducing actions, elapsed time, and token usage versus baseline, but it did not yet prove unique correctness.

Allowed model-locked publish/install claim:

> In one explicit GPT-5.5/xhigh Codex causal publish/install run, Aionis Runtime preserved verifier-backed clean-client install correctness while reducing action count, wasted steps, and token usage versus baseline, but it did not improve wall-clock time and did not prove unique correctness.

Allowed model-locked deploy/webserver claim:

> In one explicit GPT-5.5/xhigh Codex causal deploy/webserver run, Aionis Runtime preserved verifier-backed served-content correctness while reducing action count, elapsed time, and token usage versus baseline, but it did not reduce self-marked wasted steps and did not prove unique correctness.

Allowed model-locked service lifecycle claim:

> In one explicit GPT-5.5/xhigh Codex causal service lifecycle run, Aionis Runtime preserved after-exit and fresh-shell correctness while reducing action count, elapsed time, token usage, and wasted steps versus baseline, but it did not prove unique correctness because the negative control also passed.

Allowed hard service lifecycle claim:

> In two explicit GPT-5.5/xhigh Codex hard service lifecycle runs with the same command hash and same initial workspace hash across arms, Aionis Runtime passed verifier-backed after-exit/fresh-shell lifecycle validation while baseline and negative control failed, with lower action count, elapsed time, and token usage than baseline in both runs.

Allowed hard publish/install claim:

> In one explicit GPT-5.5/xhigh Codex hard package publish/install run with the same command hash and same initial workspace hash across arms, Aionis Runtime preserved verifier-backed clean-client installed-API correctness while reducing action count, wasted steps, elapsed time, and token usage versus baseline. This is an efficiency/control signal, not a correctness-separation claim.

Not allowed current claim:

> Aionis generally reduces token cost or outperforms baseline agents across arbitrary tasks.

## Next Evidence Step

Run at least two more paired trials for the current families, but only under the frozen fairness protocol:

- `external_probe_service_after_exit`
- `external_probe_service_lifecycle_hard`
- `external_probe_publish_install`
- `external_probe_publish_install_hard`
- `external_probe_deploy_hook_web`
- `external_probe_ai_code_ci_repair`

Each new clean suite should be initialized with `aionis_ab_fairness_manifest_v1`, run with explicit model/effort/CLI metadata, and assembled only after the verifier records the actual arm workspace provenance.

Then add the next continuity-heavy families:

- interrupted resume
- next-day handoff
- second-agent takeover

The `external_probe_ai_code_ci_repair` slice is the first commercial-family validation target. It should be run as a paired LLM A/B suite before making claims about AI code verification or CI/test repair.

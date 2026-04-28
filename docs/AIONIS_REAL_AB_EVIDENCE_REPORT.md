# Aionis Real A/B Evidence Report

Date: 2026-04-28

Last reviewed: 2026-04-28

Document status: real A/B evidence report

This report summarizes the first real LLM-backed A/B evidence runs for Aionis Runtime and the follow-up `contract_only` reruns. The goal is not to claim broad product superiority. The goal is to state what the current evidence can and cannot prove, then define the next Runtime hardening steps.

## Evidence Boundary

These runs are directional pilot evidence, not broad product proof.

- Each suite used four arms: `baseline`, `aionis_assisted`, `negative_control`, and `positive_control`.
- Each suite used live agent traces plus external dogfood verifier artifacts.
- The deploy/webserver suite now uses a causal verifier: the verifier checks the exact arm workspace after the agent modifies it.
- The evidence supports family-level claims only for the tested task families.
- The evidence does not prove universal token savings or universal agent performance gains.

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

## What This Proves

Aionis can currently make defensible directional claims in these areas:

- It can preserve correctness across service lifecycle, publish/install, and deploy/webserver families.
- It can preserve correctness and reduce wasted action in the first AI code CI repair pilot.
- It can prevent irrelevant or low-trust context from becoming authoritative, as shown by negative-control authoritative count `0`.
- It can improve first correct action when the task depends on execution continuity and external visibility.
- It can force the distinction between an agent success claim and verifier-backed success.
- It can turn external checks such as fresh-shell curl, clean-client install, and causal deploy verification into authority boundaries.

## What This Does Not Prove

Aionis should not currently claim:

- Universal token savings.
- Universal runtime speedup.
- Unique correctness advantage for AI code CI repair based on one easy pilot fixture.
- Broad product superiority across untested task families.
- That richer Runtime packets are always better.
- That agent-side self-verification is enough for authority.

## Product Interpretation

Aionis should be positioned as a reliability and continuity Runtime first:

- It improves outcome correctness and trust boundaries.
- It reduces false-confidence risk.
- It carries task-family execution contracts across attempts.
- It can help agents start from the right work surface instead of re-discovering the task.

It should not be positioned primarily as a token-saving layer yet, but the `contract_only` reruns now show credible cost-compression potential in publish/install and deploy/webserver.

The `ai_code_ci_repair` pilot adds a second kind of product signal: Aionis can act as a compact execution-contract layer for AI coding repair loops, where the measurable advantage is fewer irrelevant actions and lower token cost while still requiring targeted CI evidence.

## Runtime Hardening Status

Completed:

- Added `contract_only` packet mode.
- Kept full workflow, replay, and pattern memory internal by default.
- Kept harness verifiers outside the agent default workflow.
- Repeated the same three families after packet compression.

Remaining:

- Add an automatic escalation path from `contract_only` to expanded workflow packets only when the compact contract is insufficient or verification fails.
- Run at least two more paired trials per family before making stronger cost or reliability claims.
- Extend causal workspace verification beyond deploy/webserver where feasible.
- Add harder `ai_code_ci_repair` variants before treating the commercial-family signal as stable.

## Claim Policy

Allowed current claim:

> Aionis Runtime has directional live A/B evidence that execution contracts and trust gates can improve correctness, first-action quality, and false-confidence control in service lifecycle, package publish/install, and deploy/webserver task families.

Allowed commercial-family pilot claim:

> Aionis Runtime has one live paired A/B pilot showing that compact execution contracts can reduce wasted steps, elapsed time, and token use in an AI code CI repair workflow while preserving verifier-backed correctness.

Not allowed current claim:

> Aionis generally reduces token cost or outperforms baseline agents across arbitrary tasks.

## Next Evidence Step

Run at least two more paired trials for:

- `external_probe_service_after_exit`
- `external_probe_publish_install`
- `external_probe_deploy_hook_web`
- `external_probe_ai_code_ci_repair`

Then add the next continuity-heavy families:

- interrupted resume
- next-day handoff
- second-agent takeover

The `external_probe_ai_code_ci_repair` slice is the first commercial-family validation target. It should be run as a paired LLM A/B suite before making claims about AI code verification or CI/test repair.

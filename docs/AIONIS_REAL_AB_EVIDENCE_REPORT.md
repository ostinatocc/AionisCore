# Aionis Real A/B Evidence Report

Date: 2026-04-28

This report summarizes the first three real LLM-backed A/B evidence runs for Aionis Runtime. The goal is not to claim broad product superiority. The goal is to state what the current evidence can and cannot prove, then define the next Runtime hardening steps.

## Evidence Boundary

These runs are directional pilot evidence, not broad product proof.

- Each suite used four arms: `baseline`, `aionis_assisted`, `negative_control`, and `positive_control`.
- Each suite used live agent traces plus external dogfood verifier artifacts.
- The deploy/webserver suite now uses a causal verifier: the verifier checks the exact arm workspace after the agent modifies it.
- The evidence supports family-level claims only for the tested task families.
- The evidence does not prove universal token savings or universal agent performance gains.

## Suites

| Suite | Task family | Report | Gate |
| --- | --- | --- | --- |
| `llm-smoke-20260428-112048` | `service_publish_validate` | `.artifacts/real-ab/llm-smoke-20260428-112048/validation-report.md` | pass |
| `publish-install-20260428-123831` | `package_publish_validate` | `.artifacts/real-ab/publish-install-20260428-123831/validation-report.md` | pass |
| `deploy-web-20260428-140245` | `git_deploy_webserver` | `.artifacts/real-ab/deploy-web-20260428-140245/validation-report.md` | pass |

## Directional Results

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

## What This Proves

Aionis can currently make defensible directional claims in these areas:

- It can preserve correctness across service lifecycle, publish/install, and deploy/webserver families.
- It can prevent irrelevant or low-trust context from becoming authoritative, as shown by negative-control authoritative count `0`.
- It can improve first correct action when the task depends on execution continuity and external visibility.
- It can force the distinction between an agent success claim and verifier-backed success.
- It can turn external checks such as fresh-shell curl, clean-client install, and causal deploy verification into authority boundaries.

## What This Does Not Prove

Aionis should not currently claim:

- Universal token savings.
- Universal runtime speedup.
- Broad product superiority across untested task families.
- That richer Runtime packets are always better.
- That agent-side self-verification is enough for authority.

## Product Interpretation

Aionis should be positioned as a reliability and continuity Runtime first:

- It improves outcome correctness and trust boundaries.
- It reduces false-confidence risk.
- It carries task-family execution contracts across attempts.
- It can help agents start from the right work surface instead of re-discovering the task.

It should not be positioned primarily as a token-saving layer until compact packet modes are validated.

## Runtime Hardening Priorities

1. Add a `contract_only` packet mode.
2. Keep full workflow, replay, and pattern memory internal by default.
3. Expand workflow memory only when the contract is insufficient or verification fails.
4. Keep harness verifiers outside the agent default workflow.
5. Repeat the same three families after packet compression to check whether token and duration regressions improve.

## Claim Policy

Allowed current claim:

> Aionis Runtime has directional live A/B evidence that execution contracts and trust gates can improve correctness, first-action quality, and false-confidence control in service lifecycle, package publish/install, and deploy/webserver task families.

Not allowed current claim:

> Aionis generally reduces token cost or outperforms baseline agents across arbitrary tasks.

## Next Evidence Step

After implementing `contract_only` packet mode and verifier guardrails, rerun:

- `external_probe_service_after_exit`
- `external_probe_publish_install`
- `external_probe_deploy_hook_web`

Each family should run at least two more paired trials before making stronger product claims.

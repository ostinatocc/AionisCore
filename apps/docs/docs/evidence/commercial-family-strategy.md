---
title: Commercial Family Strategy
slug: /evidence/commercial-family-strategy
---

# Commercial Family Strategy

Aionis should not be evaluated as a benchmark-specific coding assistant. It should be evaluated as a continuity and trust Runtime for agent systems.

The commercial question is not "can Aionis solve one specific deploy task?" The commercial question is:

> Can Aionis turn repeated, interrupted, or externally verified work into compact execution contracts that make the next agent run more correct, less wasteful, and easier to trust?

## The four commercial families

| Priority | Family | Why it matters | Aionis leverage |
| --- | --- | --- | --- |
| 1 | AI code verification and CI/test repair | AI-generated code is often close but not correct enough for production. | Outcome contracts, target files, acceptance checks, verifier evidence, false-confidence control. |
| 2 | Developer context recovery and task continuity | Developers lose time to finding information, unclear direction, context switching, and fragmented workflows. | Task start, handoff, replay, action retrieval, semantic forgetting, compact Runtime packets. |
| 3 | Design-to-dev implementation fidelity | Designer/developer collaboration is frequent and still loses intent through assumptions and handoff gaps. | Convert design intent into implementation contracts with files, checks, constraints, and visual acceptance boundaries. |
| 4 | Work-to-action continuity | Knowledge work is fragmented by messages, meetings, status chasing, and document hunting. | Convert meetings, docs, and messages into next actions, owners, blockers, acceptance checks, and resumable state. |

## Why these families

These are selected from market demand signals, not from the current benchmark surface.

| Signal | Source | Product implication |
| --- | --- | --- |
| Developers' largest AI-tool frustration is "almost right, but not quite" output, and debugging AI-generated code is also a major frustration. | [Stack Overflow Developer Survey 2025](https://survey.stackoverflow.co/2025/ai) | Aionis should prove verification, repair contracts, and authority gates. |
| DORA says AI improves throughput, but can hurt stability when the foundation is weak. | [DORA 2025 year in review](https://dora.dev/insights/dora-2025-year-in-review/) | Aionis should prove stability and outcome correctness, not only speed. |
| 50% of developers report losing 10+ hours per week to inefficiencies; top friction areas include finding information, new technology, context switching, unclear direction, and cross-team collaboration. | [Atlassian State of Developer Experience 2025](https://dam-cdn.atl.orangelogic.com/AssetLink/5yt05dl5q8s1xljrs8747h8x6240c32p.pdf) | Context recovery and task continuity are high-frequency developer problems. |
| 84% of designers collaborate with developers at least weekly, and differences in assumptions are the most cited challenge developers face when working with designers. | [Figma Designer and Developer 2025 Trends](https://www.figma.com/reports/designer-developer-trends/) | Design handoff can be turned into executable constraints and checks. |
| Microsoft reports workers are interrupted every two minutes during core work hours, with many meetings unscheduled or ad hoc. | [Microsoft Work Trend Index: Infinite Workday](https://www.microsoft.com/en-us/worklab/work-trend-index/breaking-down-infinite-workday/) | Work continuity is a real product surface beyond coding. |
| Asana reports knowledge workers spend most of their day on communication, document hunting, and shifting priorities rather than skilled work. | [Asana: The Way We Work Isn't Working](https://asana.com/resources/work-isnt-working) | Work context needs to become explicit, resumable, and checkable. |

## Proof scenarios vs product families

The current proof scenarios are useful, but they are not the market-facing families.

| Current proof scenario | Should be treated as | Commercial family it supports |
| --- | --- | --- |
| `service_publish_validate` | External correctness and lifecycle proof | AI code verification, developer continuity |
| `package_publish_validate` | Publish/install clean-client proof | AI code verification, developer continuity |
| `git_deploy_webserver` | Deploy visibility and verifier proof | AI code verification, developer continuity |
| `handoff_resume` | Continuity proof | Developer context recovery |
| `agent_takeover` | Multi-worker continuity proof | Developer context recovery |

The product claim should be:

> Aionis improves agent reliability when the task depends on continuity, external correctness, handoff fidelity, and verifier-backed authority.

## Priority 1: AI code verification and CI/test repair

This is the strongest near-term family because it is directly tied to current AI-agent adoption risk.

What to prove next:

| Scenario | What it tests | Required verifier |
| --- | --- | --- |
| `ai_code_ci_repair` | Agent repairs a failing test without broad unrelated edits. | Targeted test passes; diff touches expected files. |
| `ai_generated_patch_review` | Agent reviews and corrects an almost-right patch. | Hidden or targeted acceptance test catches the missing behavior. |
| `dependency_upgrade_repair` | Agent fixes breakage after version/API change. | Lockfile, build, and test pass with scoped changes. |
| `flaky_failure_triage` | Agent distinguishes real failure from noise. | Re-run policy and evidence classification are correct. |

Metrics:

- first correct action
- verifier-backed completion
- false-confidence rate
- wasted steps
- unrelated file touches
- retry count
- token/event count after `contract_only` compression

## Priority 2: Developer context recovery

This is the clearest core Runtime family because it maps directly to task start, handoff, replay, action retrieval, and semantic forgetting.

What to prove next:

| Scenario | What it tests | Required verifier |
| --- | --- | --- |
| `interrupted_task_resume` | Resume after a partial fix and failed or unfinished validation. | First action starts at the saved target and passes the narrow check. |
| `next_day_handoff` | Resume from a saved handoff after time separation. | No broad rediscovery before acting on the declared target. |
| `second_agent_takeover` | Agent B inherits Agent A's work without losing the acceptance boundary. | Same target files and acceptance checks remain intact. |
| `stale_memory_rehydration` | Old but relevant memory is restored only when useful. | Rehydration is scoped and does not overpower fresh evidence. |

Metrics:

- context rebuild steps avoided
- first action alignment with stored contract
- handoff target fidelity
- acceptance-check preservation
- stale-memory demotion or rehydration correctness
- token/event reduction from compact contracts

## Priority 3: Design-to-dev fidelity

This is the first non-coding-only expansion, but it should still stay close to implementation outcomes.

What to prove next:

| Scenario | What it tests | Required verifier |
| --- | --- | --- |
| `design_component_fidelity` | Agent implements a component from design constraints. | DOM, style-token, and screenshot checks pass. |
| `responsive_layout_fidelity` | Agent preserves layout at desktop and mobile breakpoints. | Browser screenshot diff or structured layout check. |
| `design_system_token_reuse` | Agent uses existing tokens/components instead of inventing new styling. | Static style/token inspection and visual check. |

## Priority 4: Work-to-action continuity

This is the broadest family and should come after the first two developer families have stronger proof.

What to prove next:

| Scenario | What it tests | Required verifier |
| --- | --- | --- |
| `meeting_to_action_contract` | Agent extracts action items with owners and checks. | Human-reviewed or seeded ground truth comparison. |
| `doc_to_execution_plan` | Agent turns a spec into bounded implementation tasks. | Required files, blockers, and acceptance checks match seed truth. |
| `followup_resume` | Agent resumes a multi-day workstream without losing decisions. | Previous decisions and blockers remain preserved. |

## Architecture boundary

New work must fit into the existing Runtime frame:

| Runtime layer | Allowed work |
| --- | --- |
| Contract Compiler | Convert raw task, trajectory, design, or work context into target files, next action, checks, outcome contract, lifecycle constraints, and authority boundaries. |
| Trust Gate | Decide whether evidence can become authoritative, advisory, contested, or observational. |
| Orchestrator | Preserve execution state, handoff state, workflow sequence, service lifecycle, and validation boundaries. |
| Learning Loop | Promote stable workflows, demote weak patterns, rehydrate useful old state, and apply semantic forgetting. |

Rejected work:

- benchmark-specific routes
- one-off prompt patches
- new memory subsystems before the current loop is proven
- commercial claims without verifier-backed evidence
- token-saving claims without paired A/B traces

## Next evidence step

The next implementation tracks should be:

1. Add `ai_code_ci_repair` as the first commercial-family A/B slice.
2. Strengthen `developer_context_recovery` by combining interrupted resume, next-day handoff, and second-agent takeover.
3. Keep `design_to_dev_fidelity` as the first non-coding expansion after the developer families pass repeat trials.
4. Defer `work_to_action_continuity` until there is a stable connector-independent evaluation shape.

This keeps Aionis focused on its actual product value: continuity, executable contracts, and verifier-backed trust.

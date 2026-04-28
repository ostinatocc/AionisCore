# Aionis Commercial Family Strategy

Date: 2026-04-28

Last reviewed: 2026-04-28

Document status: product strategy and evidence plan

This document separates Aionis commercial task families from proof scenarios. A proof scenario can demonstrate a Runtime capability, but it should not be confused with the market-facing product family.

## Decision

Aionis should not be positioned as a generic coding assistant or a benchmark-specific optimizer.

Aionis should be positioned as a continuity and trust Runtime for agent systems:

1. It turns prior execution into compact, verifiable next-run contracts.
2. It carries task state across interruptions, handoffs, and worker changes.
3. It gates authority through outcome evidence instead of agent confidence.
4. It learns stable workflows while still supporting forgetting, review, and demotion.

The next product proof should focus on four commercial families:

| Priority | Commercial family | Why it matters | Aionis leverage |
| --- | --- | --- | --- |
| 1 | AI code verification and CI/test repair | AI-generated code is often close but not correct enough for production. | Outcome contracts, target files, acceptance checks, verifier evidence, false-confidence control. |
| 2 | Developer context recovery and task continuity | Developers lose time to finding information, unclear direction, context switching, and fragmented workflows. | Task start, handoff, replay, action retrieval, semantic forgetting, compact Runtime packets. |
| 3 | Design-to-dev implementation fidelity | Designer/developer collaboration is frequent and still loses intent through assumptions and handoff gaps. | Convert design intent into implementation contracts with files, checks, constraints, and visual acceptance boundaries. |
| 4 | Work-to-action continuity | Knowledge work is fragmented by messages, meetings, status chasing, and document hunting. | Convert meetings/docs/messages into next actions, owners, blockers, acceptance checks, and resumable execution state. |

## Source-Backed Demand Signals

These families are selected from observed market pain, not from the current benchmark surface.

| Signal | Source | What it implies for Aionis |
| --- | --- | --- |
| Developers' largest AI-tool frustration is "almost right, but not quite" output, and debugging AI-generated code is also a major frustration. | [Stack Overflow Developer Survey 2025](https://survey.stackoverflow.co/2025/ai) | The market does not only need more generation. It needs verification, repair contracts, and authority gates. |
| DORA says AI improves throughput, but can hurt stability when the foundation is weak. | [DORA 2025 year in review](https://dora.dev/insights/dora-2025-year-in-review/) | Aionis should prove stability and outcome correctness, not only speed. |
| 50% of developers report losing 10+ hours per week to inefficiencies; the top friction areas include finding information, new technology, context switching, unclear direction, and cross-team collaboration. | [Atlassian State of Developer Experience 2025](https://dam-cdn.atl.orangelogic.com/AssetLink/5yt05dl5q8s1xljrs8747h8x6240c32p.pdf) | Context recovery and task continuity are high-frequency developer problems. |
| 84% of designers collaborate with developers at least weekly, and differences in assumptions are the most cited challenge developers face when working with designers. | [Figma Designer and Developer 2025 Trends](https://www.figma.com/reports/designer-developer-trends/) | Design-to-dev handoff is a recurring workflow where execution contracts can preserve intent. |
| Microsoft reports workers are interrupted every two minutes during core work hours, with many meetings unscheduled or ad hoc. | [Microsoft Work Trend Index: Infinite Workday](https://www.microsoft.com/en-us/worklab/work-trend-index/breaking-down-infinite-workday/) | Work continuity is a real product surface beyond coding. |
| Asana reports knowledge workers spend most of their day on communication, document hunting, and shifting priorities rather than skilled work. | [Asana: The Way We Work Isn't Working](https://asana.com/resources/work-isnt-working) | Aionis can become useful where work needs to become explicit, resumable, and checkable. |

## Proof Scenarios Are Not The Product Family

The current A/B proof scenarios are useful, but they are narrower than the commercial families:

| Current proof scenario | Should be treated as | Commercial family it supports |
| --- | --- | --- |
| `service_publish_validate` | External correctness and lifecycle proof | AI code verification, developer continuity |
| `package_publish_validate` | Publish/install clean-client proof | AI code verification, developer continuity |
| `git_deploy_webserver` | Deploy visibility and verifier proof | AI code verification, developer continuity |
| `handoff_resume` | Continuity proof | Developer context recovery |
| `agent_takeover` | Multi-worker continuity proof | Developer context recovery |

The product claim should not be "Aionis is good at deploy/webserver." The claim should be:

> Aionis improves agent reliability when the task depends on continuity, external correctness, handoff fidelity, and verifier-backed authority.

## Family 1: AI Code Verification And CI/Test Repair

This is the strongest near-term commercial family because it is directly tied to current AI-agent adoption risk.

### Product Job

Help an agent move from "generated a plausible change" to "verified the right outcome with bounded authority."

### Aionis Runtime Leverage

- `Contract Compiler` produces `target_files`, `next_action`, and `acceptance_checks`.
- `Outcome Contract` records success invariants and external requirements.
- `Trust Gate` prevents weak evidence from becoming authoritative.
- `Learning Loop` promotes successful repair workflows only after enough evidence.
- `Semantic Forgetting` can demote stale or repeatedly contested repair knowledge.

### Proof Scenarios To Add

| Scenario | What it tests | Required verifier |
| --- | --- | --- |
| `ai_code_ci_repair` | Agent repairs a failing test without broad unrelated edits. | Targeted test passes; immutable tests/package/readme evidence remains unchanged. |
| `ai_generated_patch_review` | Agent reviews and corrects an almost-right patch. | Hidden or targeted acceptance test catches the missing behavior. |
| `dependency_upgrade_repair` | Agent fixes breakage after version/API change. | Lockfile/build/test pass with scoped changes. |
| `flaky_failure_triage` | Agent distinguishes real failure from noise. | Re-run policy and evidence classification are correct. |

Current `ai_code_ci_repair` variants:

1. `percentage_rounding`
   Baseline percentage-discount bug with targeted test evidence.
2. `misleading_ai_patch`
   Plausible AI patch confuses percent values with decimal rates.
3. `hidden_edge_case`
   Obvious repair must also preserve missing and fractional discount behavior.
4. `wrong_surface_trap`
   Verifier rejects success manufactured by weakening tests or metadata.
5. `dependency_surface`
   Failing behavior crosses `discount.mjs`, `discount-policy.mjs`, and helper semantics so Aionis must identify the real implementation surface, not just the visible entrypoint.

Current evidence status:

- `percentage_rounding` produced a positive efficiency pilot: Aionis reduced actions, wasted steps, duration, and tokens while preserving verifier-backed correctness.
- `wrong_surface_trap` strengthened the verifier boundary, but it ran before the LLM runner isolated arm-specific prompt surfaces. It proves the immutable-evidence guard is working; it does not prove Aionis-only correctness or cost advantage.
- The LLM runner now separates baseline, Aionis-assisted, negative-control, and positive-control prompt surfaces. The commercial-family trials need to be rerun under this cleaner A/B boundary.
- The first clean arm-isolated `hidden_edge_case` run preserved correctness and reduced token use by 79.8% versus baseline, but took 85s longer. Baseline and negative control also passed, so this is a cost-compression signal, not a correctness-separation signal.
- The new `dependency_surface` variant is the next correctness-separation candidate because it forces dependency tracing instead of a one-file percent fix.
- The first `dependency_surface` run preserved correctness while reducing actions by 25.0%, elapsed time by 54.4%, and token use by 24.6% versus baseline. Baseline and negative control also passed, so this is a stronger compression signal, not correctness separation yet.
- The next CI repair proof must either repeat harder variants enough times to show stable cost/control advantage, or increase task difficulty further with larger dependency surfaces and less obvious implementation fixes.

### Metrics

- first correct action
- verifier-backed completion
- false-confidence rate
- wasted steps
- unrelated file touches
- retry count
- token/event count after `contract_only` compression

## Family 2: Developer Context Recovery And Task Continuity

This is the clearest core Runtime family. It maps directly to Aionis' memory, handoff, replay, and forgetting capabilities.

### Product Job

Help a worker or agent resume from the right state instead of rebuilding context from chat history or repeated repository exploration.

### Aionis Runtime Leverage

- `Task Start` retrieves the right first action for repeated task families.
- `Handoff` stores target files, next action, and acceptance checks.
- `Replay` converts successful runs into reusable workflows.
- `Action Retrieval` exposes what to do next and why.
- `Semantic Forgetting` controls stale memory instead of letting old context accumulate.

### Proof Scenarios To Add

| Scenario | What it tests | Required verifier |
| --- | --- | --- |
| `interrupted_task_resume` | Resume after a partial fix and failed/unfinished validation. | First action starts at the saved target and passes the narrow check. |
| `next_day_handoff` | Resume from a saved handoff after time separation. | No broad re-discovery before acting on the declared target. |
| `second_agent_takeover` | Agent B inherits Agent A's work without losing the acceptance boundary. | Same target files and acceptance checks remain intact. |
| `stale_memory_rehydration` | Old but relevant memory is restored only when useful. | Rehydration is scoped and does not overpower fresh evidence. |

### Metrics

- context rebuild steps avoided
- first action alignment with stored contract
- handoff target fidelity
- acceptance-check preservation
- stale-memory demotion or rehydration correctness
- token/event reduction from compact contracts

## Family 3: Design-To-Dev Implementation Fidelity

This should be the first non-coding-only expansion, but it should still stay close to implementation outcomes.

### Product Job

Preserve design intent when an agent turns a design artifact into code.

### Aionis Runtime Leverage

- `Contract Compiler` can turn design intent into implementation constraints.
- `Outcome Contract` can store visual invariants, responsive behavior, token usage, and component constraints.
- `Trust Gate` can require screenshot or DOM evidence before authority.
- `Learning Loop` can promote stable implementation workflows per design system family.

### Proof Scenarios To Add

| Scenario | What it tests | Required verifier |
| --- | --- | --- |
| `design_component_fidelity` | Agent implements a component from design constraints. | DOM, style-token, and screenshot checks pass. |
| `responsive_layout_fidelity` | Agent preserves layout at desktop and mobile breakpoints. | Browser screenshot diff or structured layout check. |
| `design_system_token_reuse` | Agent uses existing tokens/components instead of inventing new styling. | Static style/token inspection and visual check. |

### Metrics

- target component/file selection
- design-token reuse
- visual acceptance pass rate
- rework count
- hallucinated component/API count
- handoff intent preservation

## Family 4: Work-To-Action Continuity

This is the broader work family. It should be approached after the first two developer families have stronger proof because it needs more product surface and connectors.

### Product Job

Turn fragmented meetings, docs, messages, and follow-ups into execution-ready state that survives interruption.

### Aionis Runtime Leverage

- `Contract Compiler` can convert raw work context into next actions and acceptance checks.
- `Orchestrator` can preserve ownership, blockers, and sequence.
- `Handoff` can keep the state resumable across days or workers.
- `Trust Gate` can separate inferred tasks from confirmed tasks.
- `Semantic Forgetting` can archive or demote old work context.

### Proof Scenarios To Add

| Scenario | What it tests | Required verifier |
| --- | --- | --- |
| `meeting_to_action_contract` | Agent extracts action items with owners and checks. | Human-reviewed or seeded ground truth comparison. |
| `doc_to_execution_plan` | Agent turns a spec into bounded implementation tasks. | Required files, blockers, and acceptance checks match seed truth. |
| `followup_resume` | Agent resumes a multi-day workstream without losing decisions. | Previous decisions and blockers remain preserved. |

### Metrics

- action-item precision and recall
- owner/blocker preservation
- next-action correctness
- stale-decision demotion
- follow-up completion rate
- repeated-context reduction

## Architecture Boundary

The family strategy must not create new architecture layers.

All new proof work must fit into the existing four-layer Runtime frame:

| Runtime layer | Allowed work |
| --- | --- |
| Contract Compiler | Convert raw task/trajectory/design/work context into target files, next action, acceptance checks, outcome contract, lifecycle constraints, and authority boundaries. |
| Trust Gate | Decide whether evidence can become authoritative, advisory, contested, or observational. |
| Orchestrator | Preserve execution state, handoff state, workflow sequence, service lifecycle, and validation boundaries. |
| Learning Loop | Promote stable workflows, demote weak patterns, rehydrate useful old state, and apply semantic forgetting. |

Rejected work:

- benchmark-specific routes
- one-off prompt patches
- new memory subsystems before the current loop is proven
- commercial claims without verifier-backed evidence
- token-saving claims without paired A/B traces

## Next Execution Plan

The next two implementation tracks should be:

1. Run paired LLM A/B trials for the harder `ai_code_ci_repair` variants.
2. Add a stronger `developer_context_recovery` suite that combines interrupted resume, next-day handoff, and second-agent takeover.
3. Keep `design_to_dev_fidelity` as the first non-coding expansion after the developer families pass repeat trials.
4. Defer `work_to_action_continuity` until there is a stable connector-independent evaluation shape.

The next evidence report should separate:

- commercial family
- proof scenario
- Runtime surface used
- verifier boundary
- measured advantage
- unsupported claim

This prevents Aionis from being evaluated as a random collection of benchmark wins. It forces the evidence to map back to the product's real Runtime value.

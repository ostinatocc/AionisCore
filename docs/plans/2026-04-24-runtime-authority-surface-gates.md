# Runtime Authority Surface Gates

Document status: Approved working plan
Date: 2026-04-24

This plan hardens AionisRuntime without adding a new memory subsystem or benchmark-specific route. The Runtime remains organized around four cores:

- Contract Compiler: turns raw execution, handoff, replay, and policy inputs into explicit execution and outcome contracts.
- Trust Gate: decides whether a contract can become authoritative, stable, advisory, observational, or only a candidate.
- Orchestrator: routes contracts, evidence, governance previews, and write projections through the existing Runtime paths.
- Learning Loop: replays, promotes, archives, and reuses proven workflows and patterns.

The current change belongs to the Trust Gate. Its rule is:

- Authoritative Runtime memory requires both `outcome_contract_v1` sufficiency and `execution_evidence_v1` sufficiency.
- Stable workflow promotion requires `runtime_authority_gate_v1.allows_stable_promotion`.
- If a path lacks enough outcome contract or execution evidence, it may remain advisory, observational, candidate, or contested, but it must not become authoritative.
- Pattern memory can become trusted pattern guidance, but it is not the same as authoritative policy or stable workflow memory.

## Authority Surface Matrix

| Surface | Producer | Gate | Required proof | Allowed result |
| --- | --- | --- | --- | --- |
| Workflow write projection | `src/memory/workflow-write-projection.ts` | `buildRuntimeAuthorityGate` | Outcome contract plus execution evidence from source slots | Candidate workflow, or stable workflow only when `allows_stable_promotion` is true |
| Replay learning auto-promotion | `src/memory/replay-learning-artifacts.ts` | `buildRuntimeAuthorityGate` | Replay workflow contract plus replay execution evidence or successful compile summary | Rule/episode projection, or stable workflow only when authoritative and stable promotion are allowed |
| Replay stable playbook normalization | `src/memory/replay-stable-anchor-helpers.ts` | `authorityGatedReplayWorkflowContract` | Replay playbook contract plus replay execution evidence | Stable L2 workflow if proven, otherwise candidate L1 workflow |
| Policy memory materialization | `src/memory/policy-memory.ts` | `buildPolicyAuthoritySurfaces` | Policy outcome contract plus execution evidence carried in the policy contract | Active authoritative policy only when authority gate allows it, otherwise advisory/candidate/contested/hint |
| Tools feedback policy memory | `src/memory/tools-feedback.ts` -> `src/memory/policy-memory.ts` | `buildPolicyAuthoritySurfaces` | Feedback materialization context must carry execution evidence | Persisted policy only with gated authority; otherwise computed policy remains non-authoritative |
| Tools pattern anchors | `src/memory/tools-pattern-anchor.ts` | Pattern credibility and governance, not Runtime authority | Repeated or governed tool-selection feedback | Advisory or observational pattern guidance, never authoritative policy memory |
| Form pattern governance | `src/memory/form-pattern-governance.ts` | Semantic L3 pattern governance | Multiple examples plus semantic review | L3 pattern stabilization only, not authoritative contract promotion |
| Handoff, session, archive, rehydrate, store boundaries | Boundary modules | No direct authority production | Carry or normalize existing execution surfaces | Evidence carrier or schema boundary only |

## Non-Goals

- Do not add another memory layer.
- Do not add task-specific or benchmark-specific routes.
- Do not promote recall strength into authority by itself.
- Do not let replay success, policy feedback, or pattern trust bypass outcome and evidence gates.

## Dogfood Metrics

Use real Runtime tasks before expanding benchmark coverage:

- First correct action.
- Wasted steps.
- Retries.
- False-confidence rate.
- After-exit correctness.
- Cross-shell revalidation correctness.

The next Runtime hardening pass should keep shrinking direct legacy access and keep every authority-producing path behind `runtime_authority_gate_v1`.

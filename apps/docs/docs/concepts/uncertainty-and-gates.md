---
title: Uncertainty And Gates
slug: /concepts/uncertainty-and-gates
---

# Uncertainty and gates

Aionis should not always turn memory into an immediate first action.

Sometimes the strongest runtime behavior is to say:

`there is not enough evidence yet; inspect, widen, or rehydrate first`

That is what the uncertainty layer and gate surfaces are for.

<div class="doc-lead">
  <span class="doc-kicker">What this layer changes</span>
  <p>Uncertainty is not just a score. In Aionis, it can suppress an overconfident task start, escalate planning, and tell the host what to do next before execution begins.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">low / moderate / high</span>
    <span class="doc-chip">recommended actions</span>
    <span class="doc-chip">gate action</span>
    <span class="doc-chip">planning escalation</span>
  </div>
</div>

## What uncertainty looks like

The runtime exposes:

- `level`
- `confidence`
- `evidence_gap_count`
- `reasons`
- `recommended_actions`

When the runtime needs a stronger intervention, planning surfaces also expose a structured gate:

- `gate_action`
- `instruction`
- `primary_reason`
- `preferred_rehydration`

## The four gate actions

These are the important gate types:

| Gate | What it means |
| --- | --- |
| `inspect_context` | Read the current planner-facing context before acting |
| `widen_recall` | Pull a broader recall surface because the current retrieval is too thin |
| `rehydrate_payload` | Bring colder payload detail back into active use before acting |
| `request_operator_review` | Ask for explicit human or host review before execution proceeds |

## What changes at task start

Without gates, a runtime can sound more certain than it really is.

With gates, Aionis can:

1. suppress an unsafe or weak `first_action`
2. escalate from kickoff to planning context
3. expose the right next move for the host or operator

That makes the startup path more honest and usually more useful.

## Minimal planning example

```ts
const planning = await aionis.memory.planningContext({
  tenant_id: "default",
  scope: "repair-flow",
  query_text: "repair billing retry serializer bug",
  context: {
    goal: "repair billing retry serializer bug",
    task_kind: "repair_billing_retry",
  },
  tool_candidates: ["bash", "edit", "test"],
});
```

Read these fields first:

1. `planning.planning_summary.action_retrieval_uncertainty`
2. `planning.planning_summary.action_retrieval_gate`
3. `planning.kickoff_recommendation`

If the gate says `rehydrate_payload`, the runtime is telling you that colder memory exists and should be restored before you trust a direct first step.

## Why this matters

This is one of the clearest differences between a memory layer and a decision layer.

A memory-only system can retrieve context.

A gate-aware runtime can decide that:

- the current context is not enough
- more recall is needed
- colder payload should be restored
- a host or operator should review the move

That is the difference between sounding informed and behaving responsibly.

## Related surfaces

- `memory.actionRetrieval(...)`
- `memory.taskStart(...)`
- `memory.planningContext(...)`
- `memory.contextAssemble(...)`
- `hostBridge.planTaskStart(...)`

## Deep dives

- [Action Retrieval](./action-retrieval.md)
- [Operator Projection and Action Hints](../sdk/operator-projection-and-action-hints.md)
- [Memory reference](../reference/memory.md)

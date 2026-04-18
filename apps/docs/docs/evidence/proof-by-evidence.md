---
title: Proof By Evidence
slug: /evidence/proof-by-evidence
---

# Proof by evidence

This page exists for a narrow question:

`Does Aionis actually improve execution over time, or does it only describe that idea well?`

The answer here is based on three live Lite runs through the public SDK on `2026-04-18`, not on hypothetical product language.

<div class="doc-lead">
  <span class="doc-kicker">What this page is for</span>
  <p>If you want the shortest external proof path for the self-evolving claim, start here. Each section shows what changed, what route family proved it, and how to rerun it yourself.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">Observed runs</span>
    <span class="doc-chip">Lite runtime</span>
    <span class="doc-chip">Public SDK</span>
    <span class="doc-chip">Reproducible</span>
  </div>
</div>

<div class="state-strip">
  <span class="state-badge state-trusted">task start</span>
  <span class="state-badge state-candidate">policy memory</span>
  <span class="state-badge state-governed">governance loop</span>
  <span class="state-note">These proofs were produced from real Lite runs, not hand-written example output.</span>
</div>

## What the three proofs show

<div class="doc-grid">
  <div class="doc-card">
    <span class="doc-kicker">Proof 1</span>
    <h3>Startup improves</h3>
    <p>The second run stops looking like a generic tool pick and starts looking like learned task-start guidance grounded in prior execution.</p>
  </div>
  <div class="doc-card">
    <span class="doc-kicker">Proof 2</span>
    <h3>Execution becomes policy</h3>
    <p>Repeated positive feedback becomes persisted policy memory instead of staying as a vague runtime hint.</p>
  </div>
  <div class="doc-card">
    <span class="doc-kicker">Proof 3</span>
    <h3>Policy can be governed</h3>
    <p>The resulting policy memory can be retired and reactivated through explicit runtime governance instead of drifting silently.</p>
  </div>
</div>

## Proof 1: The second task start gets better

This is the simplest continuity claim Aionis should be able to defend:

`the next similar task should start better because the previous one happened`

<div class="doc-grid">
  <div class="doc-card">
    <span class="doc-kicker">Before</span>
    <h3>Cold start</h3>
    <p>The runtime returned a generic first move: <code>source_kind = "tool_selection"</code>, no file path, and a generic bash step.</p>
  </div>
  <div class="doc-card">
    <span class="doc-kicker">After</span>
    <h3>Warm start</h3>
    <p>After two successful writes for the same task family, the runtime returned <code>source_kind = "experience_intelligence"</code> with a learned file path and next action.</p>
  </div>
  <div class="doc-card">
    <span class="doc-kicker">Proof</span>
    <h3>Observed signal</h3>
    <p><code>src/services/billing.ts</code> was surfaced as the target file, and the next action became <code>Patch src/services/billing.ts and rerun validation</code>.</p>
  </div>
</div>

Run it yourself:

```bash
npm run example:sdk:task-start-proof
```

Why this matters:

- it proves the runtime improved startup behavior
- it proves the improvement is grounded in prior execution memory
- it shows the difference between "long task support" and "better next task start"

## Proof 2: Stable feedback becomes persisted policy memory

The second claim is stronger:

`successful execution should become reusable policy, not only replayable history`

<div class="doc-grid">
  <div class="doc-card">
    <span class="doc-kicker">Before</span>
    <h3>Early positive feedback</h3>
    <p>The first and second positive tool-feedback runs did not yet materialize policy memory. The learning signal existed, but it was still too early.</p>
  </div>
  <div class="doc-card">
    <span class="doc-kicker">After</span>
    <h3>Stable policy memory</h3>
    <p>By the third positive run, the runtime produced persisted policy memory with a policy contract, state, and inspectable governance context.</p>
  </div>
  <div class="doc-card">
    <span class="doc-kicker">Proof</span>
    <h3>Observed signal</h3>
    <p><code>materialization_state = "persisted"</code>, <code>selected_policy_memory_state = "active"</code>, and the same state was visible from both evolution review and agent inspect.</p>
  </div>
</div>

Run it yourself:

```bash
npm run example:sdk:policy-memory
```

Why this matters:

- it proves Aionis is not only accumulating transcripts
- it proves stable execution can become persistent execution policy
- it makes the self-evolving claim inspectable through the public SDK

## Proof 3: Policy memory can be retired and reactivated

The third claim is what separates a learning substrate from a silent accumulator:

`execution policy must remain governable`

<div class="doc-grid">
  <div class="doc-card">
    <span class="doc-kicker">Before</span>
    <h3>Materialized policy is active</h3>
    <p>The runtime produced a persisted policy memory in <code>active</code> state after repeated positive feedback.</p>
  </div>
  <div class="doc-card">
    <span class="doc-kicker">After</span>
    <h3>Governance moved it twice</h3>
    <p>The public governance route retired that policy memory, then reactivated it with fresh live evidence.</p>
  </div>
  <div class="doc-card">
    <span class="doc-kicker">Proof</span>
    <h3>Observed signal</h3>
    <p>The state transition actually ran as <code>active → retired → active</code>, and the live policy still resolved <code>selected_tool = "bash"</code> after reactivation.</p>
  </div>
</div>

Run it yourself:

```bash
npm run example:sdk:policy-governance
```

Why this matters:

- it proves policy memory is reversible and reviewable
- it proves governance is a runtime action, not just a metadata idea
- it shows that self-evolving does not have to mean uncontrolled drift

## What these three proofs mean together

| Claim | What the evidence shows |
| --- | --- |
| Aionis improves startup | The second task start became more specific and file-aware |
| Aionis learns execution policy | Stable feedback became persisted policy memory |
| Aionis governs its learned policy | Policy memory moved through retire/reactivate cleanly |

That combination is the real point of the product:

- not just memory
- not just long tasks
- not just replay

It is a continuity runtime that can improve startup, materialize execution policy, and govern what it learned.

## Supporting proof: continuity provenance survives promotion

The new question after the first three proofs is:

`can Aionis still explain where a learned workflow came from after it has been promoted?`

That matters because a self-evolving runtime should not only learn. It should preserve the reason it learned something.

<div class="doc-grid">
  <div class="doc-card">
    <span class="doc-kicker">Carrier</span>
    <h3>Raw continuity input</h3>
    <p>Lite now treats <code>handoff</code>, <code>session_event</code>, and <code>session</code> as explicit continuity carriers rather than just generic stored events.</p>
  </div>
  <div class="doc-card">
    <span class="doc-kicker">Promotion</span>
    <h3>Workflow keeps provenance</h3>
    <p>When those carriers project into <code>workflow_candidate</code> and later stabilize into <code>workflow_anchor</code>, the runtime now preserves <code>distillation_origin</code>.</p>
  </div>
  <div class="doc-card">
    <span class="doc-kicker">Visible proof</span>
    <h3>Public surfaces expose it</h3>
    <p><code>planningContext(...)</code> and <code>executionIntrospect(...)</code> now expose lines such as <code>distillation=handoff_continuity_carrier</code> and <code>distillation=session_event_continuity_carrier</code>.</p>
  </div>
</div>

Why this matters:

- it proves continuity memory is not only accumulated, but traceable
- it proves workflow promotion does not erase where the learning signal came from
- it makes replay, handoff, and session-driven learning easier to inspect and trust

## Next steps

If you want the raw runnable commands, go to:

- [Self-Evolving Demos](./self-evolving-demos.md)

If you want the underlying route families, go to:

- [Policy Memory and Evolution](../reference/policy-memory.md)
- [Review Runtime](../reference/review-runtime.md)
- [SDK Quickstart](../sdk/quickstart.md)

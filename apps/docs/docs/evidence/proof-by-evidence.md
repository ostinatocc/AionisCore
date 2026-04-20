---
title: Proof By Evidence
slug: /evidence/proof-by-evidence
---

# Proof by evidence

This page exists for a narrow question:

`Does Aionis actually improve execution over time, or does it only describe that idea well?`

The answer here is based on six live Lite runs through the public SDK on `2026-04-18`, not on hypothetical product language.

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

<div class="section-frame">
  <span class="section-label">How this relates to the release story</span>
  <p>This page proves the strongest runtime claims. If you want the broader product view of what is available today, read <a href="./what-ships-today">What Ships Today</a>.</p>
</div>

<div class="state-strip">
  <span class="state-badge state-trusted">task start</span>
  <span class="state-badge state-candidate">policy memory</span>
  <span class="state-badge state-governed">governance loop</span>
  <span class="state-badge state-shadow">provenance</span>
  <span class="state-badge state-contested">forgetting</span>
  <span class="state-note">These proofs were produced from real Lite runs, not hand-written example output.</span>
</div>

## What the six proofs show

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
  <div class="doc-card">
    <span class="doc-kicker">Proof 4</span>
    <h3>Promotion keeps provenance</h3>
    <p>Continuity carriers still expose where stable workflow guidance came from after candidate promotion and replay-side normalization.</p>
  </div>
  <div class="doc-card">
    <span class="doc-kicker">Proof 5</span>
    <h3>Session state alone can promote workflows</h3>
    <p>Repeated session continuity writes now count as distinct observations and can promote stable workflow guidance without needing an append-only event path.</p>
  </div>
  <div class="doc-card">
    <span class="doc-kicker">Proof 6</span>
    <h3>Forgetting cools memory without deleting it</h3>
    <p>Archived workflow memory now surfaces semantic forgetting, archive relocation, and differential rehydration instead of silently disappearing.</p>
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

- it proves Aionis accumulates usable execution policy
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
- it shows how self-evolving behavior stays inspectable and governable

## Proof 4: Continuity provenance survives promotion

The fourth claim is narrower but important:

`a self-evolving runtime should preserve where learned workflow guidance came from even after promotion`

<div class="doc-grid">
  <div class="doc-card">
    <span class="doc-kicker">Before</span>
    <h3>Carrier provenance could disappear</h3>
    <p>`handoff`, `session_event`, and `session` could be stored and even projected, but the stable workflow path could stop showing the original continuity signal clearly enough for a host to trust it.</p>
  </div>
  <div class="doc-card">
    <span class="doc-kicker">After</span>
    <h3>Promotion preserves origin</h3>
    <p>After two `handoff` writes and two `session_event` writes for the same task family, the runtime promoted stable workflow guidance while preserving `distillation_origin` all the way into planner and introspection surfaces.</p>
  </div>
  <div class="doc-card">
    <span class="doc-kicker">Proof</span>
    <h3>Observed signal</h3>
    <p>The demo produced stable workflow lines containing <code>distillation=handoff_continuity_carrier</code> and <code>distillation=session_event_continuity_carrier</code>, and introspection reported carrier counts of <code>2</code> for each corresponding flow.</p>
  </div>
</div>

Run it yourself:

```bash
WORKFLOW_GOVERNANCE_STATIC_PROMOTE_MEMORY_PROVIDER_ENABLED=true npm run lite:start
npm run example:sdk:continuity-provenance
```

Why this matters:

- it proves continuity learning stays explainable after workflow promotion
- it proves `handoff` and `session_event` are not only stored, but promoted with preserved lineage
- it makes task-start and review surfaces easier to trust because the learning source survives normalization

## Proof 5: Session continuity carriers promote stable workflows

The fifth claim tightens the continuity story:

`session state itself should be able to produce durable workflow guidance`

<div class="doc-grid">
  <div class="doc-card">
    <span class="doc-kicker">Before</span>
    <h3>Session continuity was weaker than session events</h3>
    <p>`memory.sessions.create(...)` could store execution state, but repeated updates to the same session topic did not reliably count as independent workflow observations.</p>
  </div>
  <div class="doc-card">
    <span class="doc-kicker">After</span>
    <h3>Session carriers now promote</h3>
    <p>Repeated session continuity writes for the same task family now move from candidate workflow guidance to stable workflow guidance through <code>session_continuity_carrier</code>.</p>
  </div>
  <div class="doc-card">
    <span class="doc-kicker">Proof</span>
    <h3>Observed signal</h3>
    <p>The demo produced a first candidate workflow with <code>distillation=session_continuity_carrier</code>, then promoted it to a stable workflow with <code>observed_count = 2</code> while keeping the same provenance and support counts visible in both planning and introspection surfaces.</p>
  </div>
</div>

Run it yourself:

```bash
WORKFLOW_GOVERNANCE_STATIC_PROMOTE_MEMORY_PROVIDER_ENABLED=true npm run lite:start
npm run example:sdk:session-continuity
```

Why this matters:

- it proves session continuity is a first-class learning input, not only supporting metadata
- it proves updated session state can count as distinct workflow observations
- it makes the continuity model broader than event-only carrier streams

## Proof 6: Semantic forgetting archives and rehydrates execution memory

The sixth claim is about memory quality rather than raw accumulation:

`a self-evolving runtime should cool down execution memory instead of either keeping everything hot or deleting it`

<div class="doc-grid">
  <div class="doc-card">
    <span class="doc-kicker">Before</span>
    <h3>Cold memory was harder to explain</h3>
    <p>Archived or colder workflow guidance existed, but it was harder to prove why it should stay cold, where its payload should live, and how much should be rehydrated when a task needed it again.</p>
  </div>
  <div class="doc-card">
    <span class="doc-kicker">After</span>
    <h3>Forgetting becomes a visible runtime surface</h3>
    <p>The runtime now exposes semantic forgetting, archive relocation, and differential rehydration through direct node state, planning summaries, and execution introspection summaries.</p>
  </div>
  <div class="doc-card">
    <span class="doc-kicker">Proof</span>
    <h3>Observed signal</h3>
    <p>The demo produced <code>semantic_forgetting.action = "archive"</code>, <code>archive_relocation.relocation_state = "cold_archive"</code>, <code>execution_archive_count = 1</code>, and a differential payload restore that selected only the archived payload node the task needed.</p>
  </div>
</div>

Run it yourself:

```bash
npm run example:sdk:semantic-forgetting
```

Why this matters:

- it proves forgetting is lifecycle control, not deletion
- it proves the runtime can explain colder-memory decisions in public summary surfaces
- it makes selective rehydration part of the product story

## What these six proofs mean together

| Claim | What the evidence shows |
| --- | --- |
| Aionis improves startup | The second task start became more specific and file-aware |
| Aionis learns execution policy | Stable feedback became persisted policy memory |
| Aionis governs its learned policy | Policy memory moved through retire/reactivate cleanly |
| Aionis preserves learned provenance | Stable workflow guidance still shows whether it came from handoff or session-event continuity |
| Aionis learns directly from session state | Stable workflow guidance can now be promoted from repeated session continuity writes |
| Aionis manages colder execution memory | Archived workflow memory can be cooled down, relocated, and selectively rehydrated without deletion |

That combination is the real point of the product:

- not just memory
- not just long tasks
- not just replay

It is a continuity runtime that can improve startup, materialize execution policy, govern what it learned, preserve the provenance of how that learning happened, lift repeated session state into stable workflow guidance, and cool down execution memory without losing the ability to restore it selectively.

## Next steps

If you want the raw runnable commands, go to:

- [Self-Evolving Demos](./self-evolving-demos.md)

If you want the underlying route families, go to:

- [Policy Memory and Evolution](../reference/policy-memory.md)
- [Semantic Forgetting](../reference/semantic-forgetting.md)
- [Review Runtime](../reference/review-runtime.md)
- [SDK Quickstart](../sdk/quickstart.md)

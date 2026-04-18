---
title: Review Runtime
slug: /reference/review-runtime
---

# Review runtime

Review-oriented runtime paths are how Aionis surfaces continuity review material, evolution review material, and replay repair review inside the public runtime.

<div class="doc-lead">
  <span class="doc-kicker">Review-oriented surfaces</span>
  <p>These endpoints are not generic comments or annotations. They package runtime state into review-ready structures so a human or host system can evaluate continuity quality, evolution quality, or replay repair decisions.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">Continuity review pack</span>
    <span class="doc-chip">Evolution review pack</span>
    <span class="doc-chip">Evolution inspect</span>
    <span class="doc-chip">Replay repair review</span>
    <span class="doc-chip">Governed subset</span>
  </div>
</div>

<div class="reference-grid">
  <div class="reference-tile">
    <span class="reference-kicker">Continuity</span>
    <h3>Can this task resume safely?</h3>
    <p>Review the latest handoff, resume state, and recovery contract before trusting a pause/resume path.</p>
    <code class="reference-route">/v1/memory/continuity/review-pack</code>
  </div>
  <div class="reference-tile">
    <span class="reference-kicker">Evolution</span>
    <h3>Is the runtime learning the right thing?</h3>
    <p>Review workflow, pattern, and recommendation signals before treating them as trustworthy guidance.</p>
    <code class="reference-route">/v1/memory/evolution/review-pack</code>
  </div>
  <div class="reference-tile">
    <span class="reference-kicker">Replay repair</span>
    <h3>Should this repaired playbook advance?</h3>
    <p>Use the Lite governed subset to approve, reject, or shadow-validate repaired playbook versions.</p>
    <code class="reference-route">/v1/memory/replay/playbooks/repair/review</code>
  </div>
</div>

<div class="state-strip">
  <span class="state-badge state-trusted">trusted continuity</span>
  <span class="state-badge state-candidate">candidate evolution</span>
  <span class="state-badge state-contested">contested pattern</span>
  <span class="state-badge state-governed">governed decision</span>
  <span class="state-badge state-shadow">shadow validate</span>
  <span class="state-note">Review surfaces exist to decide whether runtime state is trustworthy enough to reuse.</span>
</div>

## Public review methods

| SDK method | Route | Purpose |
| --- | --- | --- |
| `memory.reviewPacks.continuity(...)` | `POST /v1/memory/continuity/review-pack` | Build a continuity review pack from handoff/recovery context |
| `memory.reviewPacks.evolution(...)` | `POST /v1/memory/evolution/review-pack` | Build an evolution review pack from kickoff and learning context |
| `memory.replay.playbooks.repairReview(...)` | `POST /v1/memory/replay/playbooks/repair/review` | Approve or reject a replay playbook repair in the Lite governed subset |

<div class="section-frame">
  <span class="doc-kicker">Reading rule</span>
  <p>Read review runtime in one question: what is being trusted or rejected here? Continuity review is about resume trust, evolution review is about learning trust, and replay repair review is about workflow trust. If you keep that decision boundary in mind, the three surfaces stop feeling like unrelated endpoints.</p>
</div>

## What each surface is for

### Continuity review pack

Use this when you want to review whether a task can be resumed safely.

The response centers on:

- latest handoff
- latest resume
- latest terminal run
- recovered handoff payload
- a review contract with target files, next action, acceptance checks, and rollback expectations

### Evolution review pack

Use this when you want to review whether the runtime is learning the right workflow and pattern signals from prior execution.

The response centers on:

- selected tool and recommended file path
- stable and promotion-ready workflows
- trusted, contested, and suppressed patterns
- learning summary and recommendations
- `evolution_inspect`
- policy review and governance contract
- optional governance apply payload or result

### Replay repair review

Use this when a playbook repair needs an explicit decision before promotion or further validation.

This is the review gate for replay repair in Lite's governed subset.

## Minimal continuity review example

```ts
const continuityPack = await aionis.memory.reviewPacks.continuity({
  tenant_id: "default",
  scope: "repair-flow",
  anchor: "task:export-repair",
});
```

Read these fields first:

1. `continuity_review_pack.review_contract`
2. `continuity_review_pack.latest_handoff`
3. `continuity_review_pack.latest_resume`
4. `continuity_review_pack.recovered_handoff`

## Minimal evolution review example

```ts
const evolutionPack = await aionis.memory.reviewPacks.evolution({
  tenant_id: "default",
  scope: "repair-flow",
  query_text: "repair export route serialization bug",
  context: {
    goal: "repair export route serialization bug",
    task_kind: "bugfix",
  },
  tool_candidates: ["read", "edit", "test"],
});
```

Read these fields first:

1. `evolution_review_pack.review_contract`
2. `evolution_review_pack.learning_summary`
3. `evolution_review_pack.learning_recommendations`
4. `evolution_review_pack.evolution_inspect`
5. `evolution_review_pack.policy_governance_contract`

If you are reviewing self-evolving policy state, this is the page where `evolution_inspect` becomes visible in the public runtime.

## Minimal replay repair review example

```ts
await aionis.memory.replay.playbooks.repairReview({
  tenant_id: "default",
  scope: "repair-flow",
  actor: "reviewer",
  playbook_id: "repair-export",
  version: 2,
  action: "approve",
  note: "repair looks safe for shadow validation",
  auto_shadow_validate: true,
  shadow_validation_mode: "execute_sandbox",
  target_status_on_approve: "shadow",
});
```

## Why this matters

These surfaces matter because continuity is not only about starting or replaying work. It is also about deciding whether the runtime state is trustworthy enough to reuse.

That is what review runtime paths are for:

1. continuity review checks whether pause/resume state is trustworthy
2. evolution review checks whether learning signals are trustworthy
3. replay repair review checks whether repaired playbooks are trustworthy

<div class="section-frame">
  <span class="doc-kicker">Trust boundary</span>
  <p>Task start, handoff, and replay create continuity artifacts. Review runtime is the layer that decides whether those artifacts deserve reuse. That is why this surface belongs in the public runtime: self-evolving systems still need explicit trust checkpoints.</p>
</div>

## Lite boundary notes

In Lite, these paths are present, but still narrower than a full hosted governance system.

The practical rule is:

- review packs are public and useful
- replay repair review exists in a Lite governed subset
- broader hosted review workflows still belong to a bigger control-plane story, not Lite

## Related docs

1. [Memory](./memory.md)
2. [Policy Memory and Evolution](./policy-memory.md)
3. [Replay and Playbooks](./replay-and-playbooks.md)
4. [Handoff](./handoff.md)
5. [Automation](../runtime/automation.md)

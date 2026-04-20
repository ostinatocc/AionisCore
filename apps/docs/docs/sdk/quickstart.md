---
title: SDK Quickstart
slug: /sdk/quickstart
---

# SDK quickstart

This is the fastest path from zero to a working `@ostinato/aionis` integration without flattening the whole runtime into one giant checklist.

<div class="doc-lead">
  <span class="doc-kicker">Developer path</span>
  <p>The intended order is now layered: prove the core continuity loop first, add reuse and review signals second, then move into deeper learning and control surfaces only if your host actually needs them.</p>
  <div class="doc-chip-row">
    <span class="doc-chip">createAionisClient</span>
    <span class="doc-chip">Core path</span>
    <span class="doc-chip">Enhanced path</span>
    <span class="doc-chip">Advanced path</span>
  </div>
</div>

## The layered SDK path

<div class="reference-grid">
  <div class="reference-tile">
    <span class="reference-kicker">Core path</span>
    <h3>Continuity baseline</h3>
    <p>Use write, planning or task start, handoff, and replay to prove that the runtime can improve startup, preserve pause state, and turn success into reuse.</p>
    <code class="reference-route">write -> taskStart -> handoff -> replay</code>
  </div>
  <div class="reference-tile">
    <span class="reference-kicker">Enhanced path</span>
    <h3>Reuse and review</h3>
    <p>Use lifecycle reuse, review packs, policy memory, and sessions when you need to reactivate useful memory, record reuse quality, and inspect self-improvement over time.</p>
    <code class="reference-route">rehydrate -> activate -> reviewPacks -> policy-memory -> sessions</code>
  </div>
  <div class="reference-tile">
    <span class="reference-kicker">Advanced path</span>
    <h3>Learning and control</h3>
    <p>Use introspection, delegation, and policy-learning surfaces when your host needs a deeper substrate than the main continuity loop.</p>
    <code class="reference-route">experience -> introspect -> delegate -> tools/rules</code>
  </div>
</div>

<div class="section-frame">
  <span class="doc-kicker">Reading rule</span>
  <p>This page follows a layered path. If you are proving continuity, stay in the core path. If you are proving self-improvement, add the enhanced path. If you are building a deeper host substrate, continue into the advanced path.</p>
</div>

<div class="state-strip">
  <span class="state-badge state-trusted">core path</span>
  <span class="state-badge state-candidate">enhanced path</span>
  <span class="state-badge state-governed">advanced path</span>
  <span class="state-note">The SDK surface is wide, but the product path should stay layered.</span>
</div>

## What you need first

Before writing any client code, make sure:

1. you are running Aionis Runtime locally
2. your Node version supports `node:sqlite` and the local shell startup
3. you know the default Lite target is `http://127.0.0.1:3001`

## What this quickstart proves

This page proves that the public SDK path supports a layered continuity product:

1. core path: prove continuity
2. enhanced path: prove self-improvement
3. advanced path: expose deeper learning and control seams

If you can do that through the public SDK, you already understand the core product path.

## 1. Start Aionis Runtime locally

Recommended standalone path:

```bash
npx @ostinato/aionis-runtime start
```

Check that the runtime is alive:

```bash
curl http://127.0.0.1:3001/health
```

At this point you are proving the runtime host is available, not that continuity is useful yet.

If you are working from a source checkout instead of the published runtime package:

```bash
npm install
npm run lite:start
```

## 2. Install the public SDK

In the project that will call Aionis:

```bash
npm install @ostinato/aionis
```

If your host already thinks in terms of tasks and session lifecycle, keep in mind that you may later want `createAionisHostBridge`, but start with the raw client first.

## 3. Create a client

```ts
import { createAionisClient } from "@ostinato/aionis";

const aionis = createAionisClient({
  baseUrl: "http://127.0.0.1:3001",
});
```

## How to think about the sequence

This quickstart intentionally moves in three layers:

| Layer | Why it comes here |
| --- | --- |
| Core | Prove the continuity loop is real |
| Enhanced | Prove the runtime can improve its own reuse quality |
| Advanced | Prove the runtime exposes deeper control surfaces |

If you skip straight to advanced surfaces before proving the core loop, the runtime will feel wider than it needs to.

## Core path

### 4. Write execution memory

```ts
const write = await aionis.memory.write({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  actor: "sdk-demo",
  input_text: "Diagnosed a billing retry timeout and confirmed the likely repair path in src/billing/retry.ts.",
  nodes: [
    {
      client_id: "billing-timeout-repair",
      type: "event",
      tier: "archive",
      title: "Billing retry timeout repair context",
      text_summary: "Observed billing retry timeout failures after three attempts.",
      slots: {
        task_kind: "repair_billing_retry",
        next_action: "inspect retry timeout configuration and retry loop",
      },
    },
  ],
});

console.log(write.commit_id);
```

What this step proves:

1. the SDK can write successfully
2. Lite can persist structured node data
3. later planning, task start, handoff, and replay steps will have something real to work with

### 5. Ask for planning context

```ts
const planning = await aionis.memory.planningContext({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  query_text: "repair billing retry timeout in service code",
  context: {
    goal: "repair billing retry timeout in service code",
    task_kind: "repair_billing_retry",
  },
  tool_candidates: ["bash", "edit", "test"],
  return_layered_context: true,
});

console.log(planning.kickoff_recommendation);
console.log(planning.planner_packet);
```

This is the most useful first read surface when you want the runtime to assemble recall, workflow hints, and kickoff context into one response.

Read these first:

1. `kickoff_recommendation`
2. `planner_packet`
3. `workflow_signals`
4. `pattern_signals`

If those come back sparse, check the earlier write step before assuming the planner path is broken.

### 6. Ask for explicit action retrieval

```ts
const retrieval = await aionis.memory.actionRetrieval({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  query_text: "repair billing retry timeout in service code",
  context: {
    goal: "repair billing retry timeout in service code",
    task_kind: "repair_billing_retry",
  },
  candidates: ["bash", "edit", "test"],
});

console.log(retrieval.selected_tool);
console.log(retrieval.recommended_file_path);
console.log(retrieval.recommended_next_action);
console.log(retrieval.uncertainty);
```

Use this surface when your host wants the explicit decision layer instead of only the compact kickoff surface.

Read these first:

1. `selected_tool`
2. `recommended_file_path`
3. `recommended_next_action`
4. `evidence.entries`
5. `uncertainty.recommended_actions`

If your host needs operator-facing hints, the earlier `planningContext(...)` call can also expose `operator_projection` when `return_layered_context: true` is enabled.

### 7. Ask for a learned task start

```ts
const taskStart = await aionis.memory.taskStart({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  query_text: "repair billing retry timeout in service code",
  context: {
    goal: "repair billing retry timeout in service code",
  },
  candidates: ["bash", "edit", "test"],
});

console.log(taskStart.first_action);
```

`taskStart` is the shortest path to the runtime's core value: a better first move for a repeated task.

`planningContext(...)` is broader. `taskStart(...)` is sharper. In practice:

- use `planningContext(...)` when you want context assembly
- use `taskStart(...)` when you want the next move
- use `actionRetrieval(...)` when you want the explicit retrieval evidence and uncertainty layer

### 8. Store a structured handoff

```ts
await aionis.handoff.store({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  anchor: "billing-retry-repair",
  summary: "Pause after diagnosis and resume from the retry service",
  handoff_text: "Resume in src/billing/retry.ts and patch timeout handling.",
  target_files: ["src/billing/retry.ts"],
  next_action: "Patch retry timeout handling and rerun the retry checks.",
  acceptance_checks: ["npm run -s test -- billing-retry"],
});
```

What this step proves:

1. pause/resume is a public runtime path
2. you can store resume-ready task state through the SDK
3. the continuity loop can survive a pause as well as a completed run

### 9. Record replay and compile a playbook

```ts
await aionis.memory.replay.run.start({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  actor: "sdk-demo",
  run_id: "billing-retry-run-1",
  goal: "repair billing retry timeout",
});

await aionis.memory.replay.step.before({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  actor: "sdk-demo",
  run_id: "billing-retry-run-1",
  step_index: 1,
  tool_name: "edit",
  tool_input: { file_path: "src/billing/retry.ts" },
});

await aionis.memory.replay.step.after({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  actor: "sdk-demo",
  run_id: "billing-retry-run-1",
  step_index: 1,
  status: "success",
  output_signature: {
    kind: "patch_result",
    summary: "patched retry timeout handling",
  },
});
```

From there, end the run and compile a playbook through the replay surface. That is the path from remembered execution to reusable operating knowledge.

In a full test, finish the run explicitly and then compile:

```ts
await aionis.memory.replay.run.end({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  actor: "sdk-demo",
  run_id: "billing-retry-run-1",
  status: "success",
  summary: "patched retry timeout handling and validated the checks",
});

await aionis.memory.replay.playbooks.compileFromRun({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  actor: "sdk-demo",
  run_id: "billing-retry-run-1",
  playbook_id: "billing-retry-repair",
  name: "Billing retry repair",
});
```

That is the step where continuity starts to become reuse instead of memory only.

## Enhanced path

### 10. Rehydrate archived memory in Lite

```ts
await aionis.memory.archive.rehydrate({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  actor: "sdk-demo",
  client_ids: ["billing-timeout-repair"],
  target_tier: "warm",
  reason: "bring the archived billing retry repair context back into the active working set",
  input_text: "reuse the prior billing retry repair context",
});
```

What this step proves:

1. lifecycle routes are part of Lite now
2. the runtime can bring older memory back into active use
3. continuity includes lifecycle reuse as well as new writes

### 11. Record node reuse outcome

```ts
await aionis.memory.nodes.activate({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  actor: "sdk-demo",
  client_ids: ["billing-timeout-repair"],
  run_id: "docs-sdk-run-1",
  outcome: "positive",
  activate: true,
  reason: "the rehydrated node helped choose the correct repair path",
  input_text: "repair billing retry timeout in service code",
});
```

What this step proves:

1. the runtime can record whether reused memory helped
2. continuity can accumulate quality signals, not just history
3. the self-evolving claim has a concrete substrate in the public SDK path

### 12. Pull review-ready runtime state

If your host or reviewer needs structured review material, you can already call:

```ts
await aionis.memory.reviewPacks.continuity({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  anchor: "billing-retry-repair",
});
```

This is useful when continuity quality needs human review rather than only runtime reuse.

You can also pull the evolution-oriented review surface:

```ts
const evolutionPack = await aionis.memory.reviewPacks.evolution({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  query_text: "repair billing retry timeout in service code",
  context: {
    goal: "repair billing retry timeout in service code",
    task_kind: "repair_billing_retry",
  },
  tool_candidates: ["bash", "edit", "test"],
});

console.log(evolutionPack.evolution_review_pack.evolution_inspect);
console.log(evolutionPack.evolution_review_pack.policy_governance_contract);
```

That step is where the docs path starts to expose self-evolving policy rather than only continuity artifacts.

### 13. Add a session when continuity spans time

When continuity needs to persist beyond one answer or one handoff packet, move into the session family:

```ts
await aionis.memory.sessions.create({
  tenant_id: "default",
  scope: "docs-sdk-quickstart",
  actor: "sdk-demo",
  session_id: "billing-retry-session-1",
  title: "Billing retry repair working session",
  summary: "Track continuity across multiple repair passes",
});
```

That is the point where continuity becomes an explicit longer-lived runtime object instead of only a better first move.

## Advanced path

### 14. Use the host bridge when your app already has task state

If your host already thinks in terms of task IDs, pause/resume, and lifecycle transitions, move up one layer:

```ts
import { createAionisHostBridge } from "@ostinato/aionis";

const bridge = createAionisHostBridge({
  baseUrl: "http://127.0.0.1:3001",
});

const taskSession = await bridge.openTaskSession({
  task_id: "billing-retry-repair",
  text: "repair billing retry timeout in service code",
  title: "Billing retry repair",
});

const taskContext = await taskSession.inspectTaskContext({
  context: { task_kind: "repair_billing_retry" },
  candidates: ["bash", "edit", "test"],
});

console.log(taskContext.planning_context.kickoff_recommendation);
```

Use the host bridge when your host already thinks in:

- task IDs
- pause/resume states
- task sessions
- completion transitions

Use the raw client when you want direct control over route families.

### 15. Move into deeper learning and control surfaces

When the core and enhanced paths already work, the next valuable surfaces are:

- `memory.experienceIntelligence(...)`
- `memory.executionIntrospect(...)`
- `memory.delegationRecords.*`
- `memory.tools.*`
- `memory.rules.*`
- `memory.policies.governanceApply(...)`
- `memory.patterns.*`
- `memory.anchors.rehydratePayload(...)`

These do not belong in the first evaluation loop. They belong here because they help a serious host inspect learning quality, keep delegation state explicit, and govern how learned behavior should or should not keep applying.

## What a successful evaluation looks like

After working through this page, you should be able to answer yes to these:

1. core path: can the SDK talk to Lite, produce kickoff guidance, store handoff, and record replay?
2. enhanced path: can Lite reactivate memory, record reuse outcome, and surface review-ready state?
3. advanced path: do deeper learning and control seams exist for the kind of host you want to build?

If yes, then the public continuity path is working at the right depth for your use case.

## Where to go next

1. [Client and Host Bridge](./client-and-bridge.md)
2. [Memory reference](../reference/memory.md)
3. [Handoff reference](../reference/handoff.md)
4. [Replay and Playbooks reference](../reference/replay-and-playbooks.md)
5. [Review Runtime](../reference/review-runtime.md)
6. [Automation](../runtime/automation.md)
7. [Sandbox](../runtime/sandbox.md)
8. [Lite Config and Operations](../runtime/lite-config-and-operations.md)

<div class="doc-grid">
  <a class="doc-card" href="./client-and-bridge.md">
    <span class="doc-kicker">SDK surface</span>
    <h3>Client and Host Bridge</h3>
    <p>Pick between direct runtime calls and the higher-level task-session adapter.</p>
  </a>
  <a class="doc-card" href="../reference/memory.md">
    <span class="doc-kicker">Reference</span>
    <h3>Memory</h3>
    <p>See the core, enhanced, and advanced memory families in one place.</p>
  </a>
  <a class="doc-card" href="../reference/replay-and-playbooks.md">
    <span class="doc-kicker">Reference</span>
    <h3>Replay and Playbooks</h3>
    <p>Follow the path from a replay run to a reusable playbook and local execution reuse.</p>
  </a>
</div>

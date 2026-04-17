# Aionis Core Quickstart

This guide is the fastest way to get from a running Aionis Core runtime to a working `@ostinato/aionis` integration.

## 1. Start Aionis Core

```bash
cd /path/to/AionisCore
npm install
npm run lite:start
```

Default local SDK target:

1. `http://127.0.0.1:3001`

## 2. Install the SDK

In your own project:

```bash
npm install @ostinato/aionis
```

Optional runtime sanity check:

```bash
curl http://127.0.0.1:3001/health
```

## 3. Create a client

```ts
import { createAionisClient, resolveDelegationLearningProjection } from "@ostinato/aionis";

const aionis = createAionisClient({
  baseUrl: "http://127.0.0.1:3001",
});
```

## 4. Write execution memory

```ts
const write = await aionis.memory.write({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  actor: "sdk-demo",
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

## 5. Rehydrate archived memory in Lite

```ts
await aionis.memory.archive.rehydrate({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  actor: "sdk-demo",
  client_ids: ["billing-timeout-repair"],
  target_tier: "warm",
  reason: "bring the archived billing retry repair context back into the active working set",
  input_text: "reuse the prior billing retry repair context",
});
```

## 6. Record node reuse outcome

```ts
await aionis.memory.nodes.activate({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  actor: "sdk-demo",
  client_ids: ["billing-timeout-repair"],
  run_id: "sdk-run-1",
  outcome: "positive",
  activate: true,
  reason: "the rehydrated node helped choose the correct repair path",
  input_text: "repair billing retry timeout in service code",
});
```

## 7. Read planner-visible memory

```ts
const planning = await aionis.memory.planningContext({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  query_text: "repair billing retry timeout in service code",
  context: {
    task_kind: "repair_billing_retry",
    goal: "repair billing retry timeout in service code",
  },
  tool_candidates: ["bash", "edit", "test"],
  return_layered_context: true,
});

const delegationLearning = resolveDelegationLearningProjection(planning);

console.log(planning);
console.log(delegationLearning?.learning_summary);
```

## 8. Record tool feedback

```ts
await aionis.memory.tools.feedback({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  actor: "sdk-demo",
  tool_name: "fetch_report",
  feedback: "The fetch_report tool worked and returned clean rows.",
  outcome: "positive",
});
```

## 9. Start a task from learned kickoff

```ts
const taskStart = await aionis.memory.taskStart({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  query_text: "repair billing retry timeout in service code",
  context: {
    goal: "repair billing retry timeout in service code",
  },
  candidates: ["bash", "edit", "test"],
});

console.log(taskStart.first_action);

const experience = await aionis.memory.experienceIntelligence({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  query_text: "repair billing retry timeout in service code",
  context: {
    goal: "repair billing retry timeout in service code",
  },
  candidates: ["bash", "edit", "test"],
});

console.log(experience.recommendation.combined_next_action);
console.log(experience.learning_summary);
console.log(experience.learning_recommendations);
```

## 10. Store a structured handoff

```ts
await aionis.handoff.store({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  anchor: "sdk-quickstart-task",
  summary: "Task paused with a clear next action",
  handoff_text: "Resume in the billing retry service and rerun timeout checks.",
  target_files: ["src/billing/retry.ts"],
  next_action: "Patch retry timeout handling and rerun the retry checks.",
});
```

## 11. Complete SDK surface

Current complete SDK surface includes:

1. memory write / recall / planning / introspection
2. experience-intelligence, kickoff, and task-start surfaces
3. archive rehydrate and node activation lifecycle surfaces
4. handoff store and recover
5. continuity and evolution review-pack surfaces
6. standalone delegation-record write, query, and aggregate surfaces
7. replay run lifecycle and playbooks
8. sandbox and automation surfaces
9. host bridge integration

## 12. Inspect host bridge task context

```ts
import { createAionisHostBridge } from "@ostinato/aionis";

const bridge = createAionisHostBridge({
  baseUrl: "http://127.0.0.1:3001",
});

const taskSession = await bridge.openTaskSession({
  task_id: "sdk-quickstart-task",
  text: "repair billing retry timeout in service code",
  title: "Billing retry repair task",
});

console.log(taskSession.snapshotState());
console.log(taskSession.snapshotState().allowed_actions);

await taskSession.recordEvent({
  event_text: "observed billing timeout failure and prepared repair path inspection",
});

const taskContext = await taskSession.inspectTaskContext({
  context: {
    task_kind: "repair_billing_retry",
  },
});

console.log(taskContext.delegation_learning?.learning_summary);
console.log(taskContext.planning_context.kickoff_recommendation);

const taskStartPlan = await taskSession.planTaskStart({
  context: {
    task_kind: "repair_billing_retry",
  },
});

console.log(taskStartPlan.decision);

const pause = await taskSession.pauseTask({
  summary: "pause billing retry repair",
  handoff_text: "Resume in the billing retry service and rerun timeout checks.",
});

const resume = await taskSession.resumeTask();

console.log(pause.handoff);
console.log(resume.handoff);
console.log(taskSession.snapshotState());
console.log(taskSession.snapshotState().transition_guards);
```

## 13. Inspect review packs

```ts
const continuityPack = await aionis.memory.reviewPacks.continuity({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  anchor: "sdk-quickstart-task",
  handoff_kind: "repair",
});

const evolutionPack = await aionis.memory.reviewPacks.evolution({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  query_text: "repair billing retry timeout in service code",
  context: {
    goal: "repair billing retry timeout in service code",
  },
  candidates: ["bash", "edit", "test"],
});

console.log(continuityPack.continuity_review_pack.review_contract);
console.log(evolutionPack.evolution_review_pack.review_contract.next_action);
console.log(evolutionPack.evolution_review_pack.learning_summary);
console.log(evolutionPack.evolution_review_pack.learning_recommendations);
```

## 14. Persist standalone delegation records

```ts
const delegationWrite = await aionis.memory.delegationRecords.write({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  run_id: "sdk-review-run-1",
  handoff_anchor: "sdk-quickstart-task",
  delegation_records_v1: {
    summary_version: "execution_delegation_records_v1",
    record_mode: "packet_backed",
    route_role: "review",
    packet_count: 1,
    return_count: 1,
    artifact_routing_count: 2,
    missing_record_types: [],
    delegation_packets: [{
      version: 1,
      role: "review",
      mission: "Review the billing retry patch and confirm the final checks.",
      working_set: ["src/billing/retry.ts"],
      acceptance_checks: ["npm run -s test -- billing-retry"],
      output_contract: "Return review findings and exact validation status.",
      preferred_artifact_refs: ["artifact://billing/retry-patch"],
      inherited_evidence: ["evidence://billing/retry-test"],
      routing_reason: "packet-backed review route",
      task_family: "repair",
      family_scope: "aionis://demo-sdk-quickstart/review",
      source_mode: "packet_backed",
    }],
    delegation_returns: [{
      version: 1,
      role: "review",
      status: "passed",
      summary: "Review completed and billing retry checks passed.",
      evidence: ["evidence://billing/retry-test"],
      working_set: ["src/billing/retry.ts"],
      acceptance_checks: ["npm run -s test -- billing-retry"],
      source_mode: "packet_backed",
    }],
    artifact_routing_records: [{
      version: 1,
      ref: "artifact://billing/retry-patch",
      ref_kind: "artifact",
      route_role: "review",
      route_intent: "review",
      route_mode: "packet_backed",
      task_family: "repair",
      family_scope: "aionis://demo-sdk-quickstart/review",
      routing_reason: "review artifact route",
      source: "execution_packet",
    }, {
      version: 1,
      ref: "evidence://billing/retry-test",
      ref_kind: "evidence",
      route_role: "review",
      route_intent: "review",
      route_mode: "packet_backed",
      task_family: "repair",
      family_scope: "aionis://demo-sdk-quickstart/review",
      routing_reason: "review evidence route",
      source: "execution_packet",
    }],
  },
});

console.log(delegationWrite.record_event?.uri);
```

## 15. Query typed delegation records

```ts
const delegationQuery = await aionis.memory.delegationRecords.find({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  route_role: "review",
  task_family: "repair",
  include_payload: true,
  limit: 10,
});

console.log(delegationQuery.summary.record_mode_counts);
console.log(delegationQuery.summary.return_status_counts);
console.log(delegationQuery.records[0]?.delegation_records_v1.delegation_packets[0]?.mission);
```

## 16. Aggregate delegation-record trends

```ts
const delegationAggregate = await aionis.memory.delegationRecords.aggregate({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  route_role: "review",
  task_family: "repair",
  limit: 100,
});

console.log(delegationAggregate.summary.route_role_counts);
console.log(delegationAggregate.summary.return_status_counts);
console.log(delegationAggregate.summary.record_outcome_counts);
console.log(delegationAggregate.summary.top_reusable_patterns);
console.log(delegationAggregate.summary.learning_recommendations);
console.log(delegationAggregate.summary.top_artifact_refs);
```

## 17. Run bundled SDK examples

```bash
cd /path/to/AionisCore
npm run sdk:build
npm run lite:start
```

Then in another terminal:

```bash
npm run example:sdk:recall
npm run example:sdk:replay
npm run example:sdk:sessions
npm run example:sdk:automation
npm run example:sdk:sandbox
npm run example:sdk:host-bridge
npm run example:integration:host-task-start
npm run example:integration:task-start-learning-loop
```

Repository examples:

1. [examples/full-sdk/README.md](../examples/full-sdk/README.md)

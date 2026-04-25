# Aionis Runtime Quickstart

Last reviewed: 2026-04-20

Document status: living public integration quickstart

This guide is the fastest way to get from a running Aionis Runtime instance to a working `@ostinato/aionis` integration.

## 1. Start Aionis Runtime

```bash
npx @ostinato/aionis-runtime start
```

Default local SDK target:

1. `http://127.0.0.1:3001`

Check that the runtime is alive:

```bash
curl http://127.0.0.1:3001/health
```

If you are working from a source checkout instead of the published runtime package:

```bash
cd /path/to/AionisRuntime
npm install
npm run lite:start
```

## 2. Install the SDK

In your own project:

```bash
npm install @ostinato/aionis
```

## 3. Create a client

```ts
import { createAionisClient } from "@ostinato/aionis";

const aionis = createAionisClient({
  baseUrl: "http://127.0.0.1:3001",
});
```

## 4. Seed archived execution memory

```ts
const write = await aionis.memory.write({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
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

This gives Lite a real archived node that can be rehydrated back into the active working set.

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

## 7. Ask for planning context

```ts
const planning = await aionis.memory.planningContext({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
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

When `return_layered_context: true` is enabled, this route can also expose `operator_projection` for host/operator inspection paths.

## 8. Ask for explicit action retrieval

```ts
const retrieval = await aionis.memory.actionRetrieval({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
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

Use this when your host wants the explicit decision layer rather than only the compact kickoff output.

## 9. Ask for a learned task start

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
```

Use the stronger startup facade when the host wants kickoff first, but a planning-context fallback when kickoff is gated or too thin:

```ts
const taskStartPlan = await aionis.memory.taskStartPlan({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  query_text: "repair billing retry timeout in service code",
  context: {
    goal: "repair billing retry timeout in service code",
  },
  candidates: ["bash", "edit", "test"],
});

console.log(taskStartPlan.first_action);
console.log(taskStartPlan.gate_action);
console.log(taskStartPlan.planner_explanation);
```

## 10. Store a structured handoff

```ts
await aionis.handoff.store({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  actor: "sdk-demo",
  handoff_kind: "repair",
  anchor: "sdk-quickstart-task",
  summary: "Task paused with a clear next action",
  handoff_text: "Resume in the billing retry service and rerun timeout checks.",
  target_files: ["src/billing/retry.ts"],
  next_action: "Patch retry timeout handling and rerun the retry checks.",
  acceptance_checks: ["npm run -s test -- billing-retry"],
});
```

## 11. Record replay and move toward a playbook

```ts
await aionis.memory.replay.run.start({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  actor: "sdk-demo",
  run_id: "billing-retry-run-1",
  goal: "repair billing retry timeout",
});

await aionis.memory.replay.step.before({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  actor: "sdk-demo",
  run_id: "billing-retry-run-1",
  step_index: 1,
  tool_name: "edit",
  tool_input: { file_path: "src/billing/retry.ts" },
});

await aionis.memory.replay.step.after({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
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

From there, end the run and compile a playbook through the replay surface.

For host integrations that only need to store a validated execution outcome, use the single facade over the replay lifecycle:

```ts
await aionis.memory.storeExecutionOutcome({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  actor: "sdk-demo",
  goal: "repair billing retry timeout in service code",
  status: "success",
  summary: "Retry timeout repair passed validation",
  steps: [{
    tool_name: "bash",
    tool_input: { argv: ["npm", "run", "-s", "test", "--", "billing-retry"] },
    status: "success",
    output_signature: { summary: "billing retry tests passed" },
  }],
  compile_playbook: true,
  simulate_playbook: true,
});
```

To read the workflow contract Aionis would reuse for a family or workflow signature:

```ts
const workflow = await aionis.memory.retrieveWorkflowContract({
  tenant_id: "default",
  scope: "demo-sdk-quickstart",
  workflow_signature: "workflow:billing-retry-repair",
});

console.log(workflow.execution_contract_v1);
console.log(workflow.authority_summary);
```

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

const taskContext = await taskSession.inspectTaskContext({
  context: {
    task_kind: "repair_billing_retry",
  },
  candidates: ["bash", "edit", "test"],
});

console.log(taskContext.planning_context.kickoff_recommendation);
```

## 13. What else is in the SDK

Current complete SDK surface includes:

1. memory write / recall / planning / introspection
2. action retrieval, uncertainty, and planning gate surfaces
3. archive rehydrate and node activation lifecycle surfaces
4. experience-intelligence, kickoff, task-start, task-start-plan, execution outcome, and workflow-contract facades
5. handoff store and recover
6. continuity and evolution review-pack surfaces
7. standalone delegation-record write, query, and aggregate surfaces
8. replay run lifecycle and playbooks
9. sandbox and automation surfaces
10. host bridge integration

## 14. Host execution-memory loop

Hosts should treat Aionis as an execution-memory runtime, not as a replacement for real validation.

Use this loop:

```text
taskStartPlan -> execute -> validate -> storeExecutionOutcome -> retrieveWorkflowContract -> reuse or keep advisory
```

Authority comes from `retrieveWorkflowContract.authority_summary`, not from recall strength alone. For service and publish paths, pass execution evidence through `storeExecutionOutcome.metrics`, including:

1. `validation_passed`
2. `after_exit_revalidated`
3. `fresh_shell_probe_passed`
4. `false_confidence_detected`
5. `evidence_refs`

Read [RUNTIME_HOST_INTEGRATION_RUNBOOK.md](RUNTIME_HOST_INTEGRATION_RUNBOOK.md) for the full host contract and [RUNTIME_DOGFOOD_REPORTING.md](RUNTIME_DOGFOOD_REPORTING.md) for product dogfood reporting.

## 15. Run bundled SDK examples

```bash
cd /path/to/AionisRuntime
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
npm run example:sdk:action-retrieval
npm run example:sdk:dogfood-loop
npm run example:sdk:service-lifecycle-dogfood
npm run example:integration:host-task-start
npm run example:integration:task-start-learning-loop
```

Repository examples:

1. [examples/full-sdk/README.md](../examples/full-sdk/README.md)

# Aionis Core Compat SDK Examples

These examples are meant for the internal compatibility SDK surface in [packages/sdk](../../packages/sdk).

They import the locally built compat artifact from [packages/sdk/dist](../../packages/sdk/dist), so build the compat SDK first:

```bash
cd /Volumes/ziel/AionisTest/Aioniscc
npm run compat-sdk:build
```

Start the local Aionis Core runtime shell in another terminal:

```bash
cd /Volumes/ziel/AionisTest/Aioniscc
npm run lite:start
```

Defaults:

1. `AIONIS_BASE_URL=http://127.0.0.1:3001`
2. `AIONIS_TENANT_ID=default`
3. `AIONIS_SCOPE=default`
4. `AIONIS_ACTOR=local-user`

Recommended local runtime:

1. `npm run lite:start`
2. this profile keeps the route surface aligned with the default local SDK flow

Compat capability examples:

1. `npm run example:compat-sdk:workflow`
   Shows `memory.write` plus `memory.planningContext` promoting repeated continuity into stable workflow guidance.
2. `npm run example:compat-sdk:tools-feedback`
   Shows `memory.tools.select` plus `memory.tools.feedback` growing a reusable tool-memory pattern from repeated positive runs.
3. `npm run example:compat-sdk:introspect`
   Shows `memory.executionIntrospect` plus `memory.anchors.rehydratePayload` on a workflow anchor created by the example itself.
4. `npm run example:compat-sdk:context-assemble`
   Shows `memory.contextAssemble` on the explicit debug path with `return_layered_context=true`.
5. `AIONIS_PLAYBOOK_ID=<pending-playbook-id> npm run example:compat-sdk:replay-review`
   Shows `memory.replay.repairReview` on an existing pending playbook, including governed learning projection output.
6. `npm run example:compat-sdk:task-start-plan`
   Shows `memory.taskStartPlan` before and after learned workflow history, including the shift from generic kickoff to file-level first action.

Integration examples:

1. `npm run example:integration:host-task-start`
   Shows how a host or planner can convert `memory.taskStartPlan` into a direct startup decision without writing its own recommendation-merging logic.
2. `npm run example:integration:task-start-learning-loop`
   Shows the full loop from cold-start planning, to continuity writes, to a learned file-level kickoff that the host can launch directly.

Notes:

1. The replay example is the only one that is not fully self-seeding. It assumes you already have a pending replay playbook id.
2. The examples intentionally stay on the route-level SDK surface. They do not reach into runtime internals or Lite stores directly.
3. This compat layer stays repository-local and should not be treated as the main Aionis Core package.

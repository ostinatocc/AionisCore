# @cognary/aionis-compat-sdk

`@cognary/aionis-compat-sdk` is the internal compatibility SDK for legacy narrow-surface integrations.

It exposes the older narrow SDK surface for:

1. `memory.write`
2. `memory.planningContext`
3. `memory.contextAssemble`
4. `memory.executionIntrospect`
5. `memory.tools.select`
6. `memory.tools.feedback`
7. `memory.replay.repairReview`
8. `memory.anchors.rehydratePayload`
9. `memory.taskStart`
10. `memory.taskStartPlan`

## Local Development

```ts
import { createAionisClient } from "@cognary/aionis-compat-sdk";

const client = createAionisClient({
  baseUrl: "http://127.0.0.1:3001",
});

const result = await client.memory.write({
  tenant_id: "default",
  scope: "default",
  input_text: "Fix export failure in node tests",
});

console.log(result);
```

## Local Development

Build the package:

```bash
npm run compat-sdk:build
```

Run package tests:

```bash
npm run compat-sdk:test
```

## Examples

Repository examples live under:

1. [examples/sdk/README.md](/Volumes/ziel/AionisTest/Aioniscc/examples/sdk/README.md)
2. [docs/SDK_QUICKSTART.md](/Volumes/ziel/AionisTest/Aioniscc/docs/SDK_QUICKSTART.md)

Repository scripts are grouped by role:

1. `npm run compat-sdk:build`
2. `npm run lite:start`
3. `npm run example:compat-sdk:workflow`
4. `npm run example:integration:host-task-start`

## Naming

1. product: `Aionis Core`
2. main npm package: `@cognary/aionis`
3. internal compat package: `@cognary/aionis-compat-sdk`

# @cognary/aionis

`@cognary/aionis` is the TypeScript SDK for Aionis Core.

Package page:

1. [npm: `@cognary/aionis`](https://www.npmjs.com/package/@cognary/aionis)
2. CLI command: `aionis`

It exposes the stable SDK surface for:

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

## Install

```bash
npm install @cognary/aionis
```

Run the CLI without a global install:

```bash
npx @cognary/aionis doctor
```

Start a local Aionis Core runtime:

```bash
npx @cognary/aionis dev --repo /path/to/Aionis --port 3101
```

## Quickstart

```ts
import { createAionisClient } from "@cognary/aionis";

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
npm --prefix packages/sdk run build
```

Run package tests:

```bash
npm --prefix packages/sdk run test
```

Run the release baseline:

```bash
npm run -s sdk:release:check
```

Run a publish dry-run:

```bash
npm run -s sdk:publish:dry-run
```

## CLI

Current thin CLI commands:

1. `aionis doctor`
2. `aionis example`
3. `aionis dev --repo /path/to/Aionis`
4. `aionis dev --repo /path/to/Aionis --port 3101`
5. `aionis dev --repo /path/to/Aionis --local-process`
6. `aionis dev --repo /path/to/Aionis --dry-run`

## Examples

Repository examples live under:

1. [examples/sdk/README.md](/Volumes/ziel/AionisTest/Aioniscc/examples/sdk/README.md)
2. [docs/SDK_QUICKSTART.md](/Volumes/ziel/AionisTest/Aioniscc/docs/SDK_QUICKSTART.md)

Repository scripts are grouped by role:

1. `npm run core:build`
2. `npm run lite:start`
3. `npm run example:sdk:workflow`
4. `npm run example:integration:host-task-start`

## Naming

1. product: `Aionis Core`
2. npm package: `@cognary/aionis`
3. CLI: `aionis`

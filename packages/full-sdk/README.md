# @cognary/aionis-sdk

Full SDK surface for Aionis Core.

## Install

```bash
npm install @cognary/aionis-sdk
```

## Coverage

- memory write / recall / context surfaces
- replay core and governed playbook operations
- handoff storage and recovery
- automation definitions and runs
- sandbox session, execution, and run inspection
- lifecycle, packs, sessions, and rule/tool operator surfaces
- host bridge integration

## Usage

```ts
import { createAionisRuntimeClient } from "@cognary/aionis-sdk";

const aionis = createAionisRuntimeClient({
  baseUrl: "http://127.0.0.1:3001",
});

const health = await aionis.system.health();
const recall = await aionis.memory.recallText({
  tenant_id: "default",
  scope: "default",
  query_text: "debug the failed replay run",
});
```

## Local workflow

```bash
cd /Volumes/ziel/AionisTest/Aioniscc
npm install
npm run full-sdk:build
npm run lite:start
```

Then run one of the bundled examples:

```bash
npm run example:full-sdk:recall
npm run example:full-sdk:replay
npm run example:full-sdk:sessions
npm run example:full-sdk:automation
npm run example:full-sdk:sandbox
```

## Release checks

```bash
npm run full-sdk:test
npm run full-sdk:pack:dry-run
npm run full-sdk:publish:dry-run
npm run full-sdk:release:check
```

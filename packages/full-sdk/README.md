# @ostinato/aionis

Complete Aionis Core SDK.

## Install

```bash
npm install @ostinato/aionis
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
import { createAionisClient } from "@ostinato/aionis";

const aionis = createAionisClient({
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
npm run sdk:build
npm run lite:start
```

Then run one of the bundled examples:

```bash
npm run example:sdk:recall
npm run example:sdk:replay
npm run example:sdk:sessions
npm run example:sdk:automation
npm run example:sdk:sandbox
```

## Release checks

```bash
npm run sdk:test
npm run sdk:pack:dry-run
npm run sdk:publish:dry-run
npm run sdk:release:check
```

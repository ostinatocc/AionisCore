# Aionis Core Runtime Client Quickstart

`@ostinato/aionis` exposes the full runtime client surface for Aionis Core.

It covers:

1. runtime client access
2. handoff store and recover
3. replay and playbook operations
4. automation kernel operations
5. sandbox runtime operations
6. bridge integration for host systems

## 1. Install dependencies

```bash
cd /Volumes/ziel/AionisTest/Aioniscc
npm install
```

## 2. Build the SDK

```bash
npm run sdk:build
```

## 3. Start Aionis Core

```bash
npm run lite:start
```

Default local endpoint:

```text
http://127.0.0.1:3001
```

## 4. Use the SDK

```ts
import { createAionisRuntimeClient } from "@ostinato/aionis";

const aionis = createAionisRuntimeClient({
  baseUrl: "http://127.0.0.1:3001",
});

const health = await aionis.system.health();

const replay = await aionis.memory.replay.run.start({
  tenant_id: "default",
  scope: "default",
  goal: "repair the failed replay flow",
});
```

## 5. Run bundled examples

```bash
npm run example:sdk:recall
npm run example:sdk:replay
npm run example:sdk:sessions
npm run example:sdk:automation
npm run example:sdk:sandbox
```

# Aionis Core Full SDK Quickstart

`@cognary/aionis-sdk` is the full SDK surface for Aionis Core.

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

## 2. Build the full SDK

```bash
npm run full-sdk:build
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
import { createAionisRuntimeClient } from "@cognary/aionis-sdk";

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
npm run example:full-sdk:recall
npm run example:full-sdk:replay
npm run example:full-sdk:sessions
npm run example:full-sdk:automation
npm run example:full-sdk:sandbox
```

# Full-Runtime SDK Quickstart

`@cognary/aionis-sdk` is the private SDK for the complete Aionis runtime mainline.

It is intended for self-use inside the private `Aionis-runtime` repository. The public package remains `@cognary/aionis`.

## 1. Install dependencies

```bash
cd /Volumes/ziel/Aionis-runtime
npm install
```

## 2. Build the private full-runtime SDK

```bash
npm run full-sdk:build
```

## 3. Start the private runtime

```bash
npm run start:lite
```

The default local endpoint is:

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
npm run full-sdk:example:recall
npm run full-sdk:example:replay
npm run full-sdk:example:sessions
```

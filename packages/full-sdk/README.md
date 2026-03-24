# @cognary/aionis-sdk

Private full-runtime SDK for the complete Aionis runtime mainline.

This package is for internal use with the private `Aionis-runtime` repository. It is not the public SDK release surface. The public package remains `@cognary/aionis`.

## What it covers

- Full memory write/recall/context surfaces
- Replay core and governed playbook operations
- Handoff storage and recovery
- Automation definitions and runs
- Sandbox session, execution, and run inspection
- Lifecycle, packs, sessions, and rule/tool operator surfaces

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
cd /Volumes/ziel/Aionis-runtime
npm install
npm run full-sdk:build
npm run start:lite
```

Then run one of the bundled examples:

```bash
npm run full-sdk:example:recall
npm run full-sdk:example:replay
npm run full-sdk:example:sessions
```

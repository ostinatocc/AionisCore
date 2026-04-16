# @ostinato/aionis

`@ostinato/aionis` is the public SDK for integrating Aionis Runtime into a coding agent or local agent runtime.

Use it when you want an agent to:

- start repeated tasks with a better first action
- store and recover structured handoffs
- turn successful runs into replayable playbooks
- inspect continuity state through typed runtime contracts

## Install

```bash
npm install @ostinato/aionis
```

## What The SDK Covers

- memory write / recall / planning / context assembly
- kickoff recommendation and task-start surfaces
- replay run lifecycle and playbook operations
- handoff storage and recovery
- automation definitions and runs
- sandbox session, execution, and run inspection
- sessions, packs, review packs, rule/tool operator surfaces
- host bridge integration

## Usage

```ts
import { createAionisClient } from "@ostinato/aionis";

const aionis = createAionisClient({
  baseUrl: "http://127.0.0.1:3001",
});

const taskStart = await aionis.memory.taskStart({
  tenant_id: "default",
  scope: "default",
  query_text: "debug the failed replay run",
  context: {
    goal: "debug the failed replay run",
  },
  candidates: ["read", "bash", "edit", "test"],
});

console.log(taskStart.first_action);
```

## Local Workflow

```bash
cd /path/to/AionisRuntime
npm install
npm run sdk:build
npm run lite:start
```

Then try one of the bundled examples:

```bash
npm run example:sdk:recall
npm run example:sdk:replay
npm run example:sdk:sessions
npm run example:sdk:automation
npm run example:sdk:sandbox
npm run example:sdk:host-bridge
```

## Next Reads

1. [SDK Quickstart](../../docs/SDK_QUICKSTART.md)
2. [Bundled SDK Examples](../../examples/full-sdk/README.md)
3. [Docs Overview](../../docs/README.md)

## Release Checks

```bash
npm run sdk:test
npm run sdk:pack:dry-run
npm run sdk:publish:dry-run
npm run sdk:release:check
```

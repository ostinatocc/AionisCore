# Aionis Runtime SDK Examples

These examples use the main Aionis Runtime SDK package:

- `@ostinato/aionis`

Build the SDK first:

```bash
cd /path/to/AionisRuntime
npm install
npm run sdk:build
```

Start the local Aionis Runtime shell:

```bash
cd /path/to/AionisRuntime
npm run lite:start
```

Run examples:

```bash
npm run example:sdk:core-path
npm run example:sdk:recall
npm run example:sdk:replay
npm run example:sdk:sessions
npm run example:sdk:automation
npm run example:sdk:sandbox
npm run example:sdk:host-bridge
npm run example:sdk:agent-memory
npm run example:sdk:task-start-proof
npm run example:sdk:policy-memory
npm run example:sdk:policy-governance
```

The same SDK client can also call Lite lifecycle mutations directly:

- `aionis.memory.archive.rehydrate(...)`
- `aionis.memory.nodes.activate(...)`

See [docs/SDK_QUICKSTART.md](../../docs/SDK_QUICKSTART.md) for a concrete request example.

Examples:

- `00-core-path.ts`
  runs the smallest serious continuity loop: write, task start, handoff, and replay
- `01-recall-and-context.ts`
  seeds memory, then calls `recall_text` and `planning/context`
- `02-replay-run-lifecycle.ts`
  exercises replay run start, step before/after, end, and get
- `03-sessions-and-handoff.ts`
  creates a session, writes an event, lists session data, and stores a handoff
- `04-automation-kernel.ts`
  validates, creates, lists, and runs a self-contained automation graph
- `05-sandbox-runtime.ts`
  creates a sandbox session, executes a sync command, and inspects run outputs
- `06-host-bridge-context.ts`
  seeds delegation records, opens a stateful task session adapter, then uses `inspectTaskContext()`, `planTaskStart()`, pause/resume, and complete while printing explicit session state snapshots, `allowed_actions`, and transition guards
- `07-agent-memory-inspect.ts`
  seeds continuity state, then calls `memory.agent.inspect/reviewPack/resumePack/handoffPack` to show the new agent-facing public SDK façade
- `08-self-evolving-task-start.ts`
  proves that a repeated task can get a better second `taskStart` after successful execution memory is written back
- `09-policy-memory-materialization.ts`
  records repeated positive tool feedback and shows persisted `policy memory` through evolution review and agent inspect
- `10-policy-governance-loop.ts`
  materializes policy memory, retires it, reactivates it, and confirms the governance loop through the public SDK

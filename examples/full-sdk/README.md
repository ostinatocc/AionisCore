# Aionis Core SDK Examples

These examples use the main Aionis Core SDK package:

- `@ostinato/aionis`

Build the SDK first:

```bash
cd /path/to/AionisCore
npm install
npm run sdk:build
```

Start the local Aionis Core runtime shell:

```bash
cd /path/to/AionisCore
npm run lite:start
```

Run examples:

```bash
npm run example:sdk:recall
npm run example:sdk:replay
npm run example:sdk:sessions
npm run example:sdk:automation
npm run example:sdk:sandbox
```

Examples:

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

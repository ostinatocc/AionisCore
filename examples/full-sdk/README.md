# Aionis Core Full SDK Examples

These examples use the full Aionis Core SDK package:

- `@cognary/aionis-sdk`

Build the SDK first:

```bash
cd /Volumes/ziel/AionisTest/Aioniscc
npm install
npm run full-sdk:build
```

Start the local Aionis Core runtime shell:

```bash
cd /Volumes/ziel/AionisTest/Aioniscc
npm run lite:start
```

Run examples:

```bash
npm run example:full-sdk:recall
npm run example:full-sdk:replay
npm run example:full-sdk:sessions
npm run example:full-sdk:automation
npm run example:full-sdk:sandbox
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

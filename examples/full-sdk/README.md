# Full-Runtime SDK Examples

These examples use the private full-runtime SDK package:

- `@cognary/aionis-sdk`

Build the SDK first:

```bash
cd /Volumes/ziel/Aionis-runtime
npm install
npm run full-sdk:build
```

Start the private runtime:

```bash
cd /Volumes/ziel/Aionis-runtime
npm run start:lite
```

Run examples:

```bash
npm run full-sdk:example:recall
npm run full-sdk:example:replay
npm run full-sdk:example:sessions
```

Examples:

- `01-recall-and-context.ts`
  seeds memory, then calls `recall_text` and `planning/context`
- `02-replay-run-lifecycle.ts`
  exercises replay run start, step before/after, end, and get
- `03-sessions-and-handoff.ts`
  creates a session, writes an event, lists session data, and stores a handoff

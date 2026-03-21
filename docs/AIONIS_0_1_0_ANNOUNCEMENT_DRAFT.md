# Aionis 0.1.0 Announcement Draft

## Short Version

`Aionis 0.1.0` is now available.

Aionis is a local execution-memory runtime. It remembers stable workflow guidance, learns tool-selection patterns from feedback, and only expands historical detail when the runtime actually needs it.

This first public release is designed for:

1. advanced local workflows
2. agent builders
3. IDE and MCP integrations
4. replay/playbook and execution-memory evaluation

It is not being positioned as:

1. a multi-user control plane
2. a hosted default deployment profile
3. a complete human-governed policy platform

## What 0.1.0 Establishes

`0.1.0` establishes the current Aionis product baseline:

1. a stable execution-memory-first planner/context surface
2. workflow progression from structured execution continuity into planner-visible workflow guidance
3. policy learning with `candidate`, `trusted`, `contested`, and `revalidated` pattern states
4. trust hardening with higher promotion and revalidation gates
5. a slim default planner/context surface with explicit heavy inspection paths
6. a repeatable real-task benchmark baseline

## Validation Snapshot

The current release-validation result is:

1. `npm run test:lite` passed
2. `npm run benchmark:lite:real` passed with `8/8 PASS` and `100% suite score`
3. `npm run smoke:lite` passed
4. `npm run smoke:lite:local-process` passed

## One-Sentence Positioning

Aionis is a local execution-memory runtime that turns stable work into reusable workflow guidance, learns trusted tool patterns from feedback, and keeps default context slim by expanding history only when needed.

## Links

1. Release note: [docs/AIONIS_0_1_0_RELEASE_NOTE.md](./AIONIS_0_1_0_RELEASE_NOTE.md)
2. Benchmark report: [docs/LITE_REAL_TASK_BENCHMARK_REPORT.md](./LITE_REAL_TASK_BENCHMARK_REPORT.md)
3. Boundary: [docs/public/en/getting-started/05-lite-public-beta-boundary.md](./public/en/getting-started/05-lite-public-beta-boundary.md)
4. Narrative: [docs/public/en/getting-started/08-lite-execution-memory-beta-narrative.md](./public/en/getting-started/08-lite-execution-memory-beta-narrative.md)

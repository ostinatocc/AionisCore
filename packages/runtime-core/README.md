# @ostinato/aionis-rtc

Shared runtime-core boundary for Aionis Core.

## Install

```bash
npm install @ostinato/aionis-rtc
```

This package is intentionally small. Its purpose is to define the stable shared boundary for core runtime contracts.

Current responsibilities:

1. shared runtime ownership metadata
2. shared-surface identifiers
3. boundary contracts used across runtime surfaces
4. explicit separation between local automation kernel and broader automation orchestration

Later phases can move additional bootstrapping and runtime implementation here once the boundary is stable.

## Local workflow

```bash
cd /path/to/AionisCore
npm install
npm run runtime-core:build
```

## Release checks

```bash
npm run runtime-core:pack:dry-run
npm run runtime-core:publish:dry-run
npm run runtime-core:release:check
```

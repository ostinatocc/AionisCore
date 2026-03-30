# Aionis Core

`Aionis Core` is the kernel for agent continuity.

## Core Capability Surfaces

1. **Task Start**
   Turn prior execution into a better first action for the next similar task.
2. **Task Handoff**
   Store and recover structured execution-ready task packets.
3. **Task Replay**
   Record successful execution, compile playbooks, and reuse prior runs.

## Canonical Core Docs

1. [RUNTIME_MAINLINE.md](/Volumes/ziel/AionisTest/Aioniscc/docs/RUNTIME_MAINLINE.md)
2. [OPEN_CORE_BOUNDARY.md](/Volumes/ziel/AionisTest/Aioniscc/docs/OPEN_CORE_BOUNDARY.md)
3. [AIONIS_PRODUCT_DEFINITION_V1.md](/Volumes/ziel/AionisTest/Aioniscc/docs/AIONIS_PRODUCT_DEFINITION_V1.md)
4. [CORE_CONTINUITY_STRATEGY.md](/Volumes/ziel/AionisTest/Aioniscc/docs/CORE_CONTINUITY_STRATEGY.md)
5. [CORE_EXECUTION_MEMORY_PRODUCT_CONTRACT_V1.md](/Volumes/ziel/AionisTest/Aioniscc/docs/CORE_EXECUTION_MEMORY_PRODUCT_CONTRACT_V1.md)

## Docs Navigation

1. [docs/README.md](/Volumes/ziel/AionisTest/Aioniscc/docs/README.md)
2. [SDK_QUICKSTART.md](/Volumes/ziel/AionisTest/Aioniscc/docs/SDK_QUICKSTART.md)
3. [FULL_SDK_QUICKSTART.md](/Volumes/ziel/AionisTest/Aioniscc/docs/FULL_SDK_QUICKSTART.md)
4. [apps/lite/README.md](/Volumes/ziel/AionisTest/Aioniscc/apps/lite/README.md)

## Repository Areas

1. [src/memory](/Volumes/ziel/AionisTest/Aioniscc/src/memory)
2. [src/routes](/Volumes/ziel/AionisTest/Aioniscc/src/routes)
3. [src/execution](/Volumes/ziel/AionisTest/Aioniscc/src/execution)
4. [src/store](/Volumes/ziel/AionisTest/Aioniscc/src/store)
5. [packages/runtime-core](/Volumes/ziel/AionisTest/Aioniscc/packages/runtime-core)
6. [packages/full-sdk](/Volumes/ziel/AionisTest/Aioniscc/packages/full-sdk)
7. [packages/sdk](/Volumes/ziel/AionisTest/Aioniscc/packages/sdk)
8. [apps/lite](/Volumes/ziel/AionisTest/Aioniscc/apps/lite)

## Validation

```bash
npm install
npm run -s build
npm run -s test:lite
npm run -s benchmark:lite:real
```

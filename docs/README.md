# Aionis Runtime Docs

Last reviewed: 2026-04-20

Document status: docs index

This repository contains public runtime docs, internal kernel contracts, package READMEs, plans, ADRs, and historical records.

Start with the taxonomy file when you need to know which docs are public, which are contributor-only, and which are historical:

1. [DOCUMENTATION_TAXONOMY.md](DOCUMENTATION_TAXONOMY.md)
2. [DOCS_MAINTENANCE.md](DOCS_MAINTENANCE.md)

## 1. Public Product Docs

Use these documents to understand the public Aionis Runtime story.

1. [../README.md](../README.md)
2. [AIONIS_PRODUCT_DEFINITION_V1.md](AIONIS_PRODUCT_DEFINITION_V1.md)
3. [LAUNCH_MESSAGING.md](LAUNCH_MESSAGING.md)
4. [OPEN_CORE_BOUNDARY.md](OPEN_CORE_BOUNDARY.md)
5. [AIONIS_RUNTIME_STAGE_BASELINE_2026_04_20.md](AIONIS_RUNTIME_STAGE_BASELINE_2026_04_20.md)

## 2. Public Technical Docs

Use these documents when integrating with the runtime, SDK, or Lite runtime shell.

1. [SDK_QUICKSTART.md](SDK_QUICKSTART.md)
2. [LOCAL_RUNTIME_ARCHITECTURE_AND_COMPLETION.md](LOCAL_RUNTIME_ARCHITECTURE_AND_COMPLETION.md)
3. [LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md](LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md)
4. [LOCAL_RUNTIME_SOURCE_BOUNDARY.md](LOCAL_RUNTIME_SOURCE_BOUNDARY.md)
5. [LOCAL_RUNTIME_REAL_TASK_BENCHMARK_REPORT.md](LOCAL_RUNTIME_REAL_TASK_BENCHMARK_REPORT.md)
6. [CORE_TESTING_STRATEGY.md](CORE_TESTING_STRATEGY.md)
7. [../apps/lite/README.md](../apps/lite/README.md)
8. [../packages/full-sdk/README.md](../packages/full-sdk/README.md)
9. [../packages/aionis-doc/README.md](../packages/aionis-doc/README.md)
10. [../examples/full-sdk/README.md](../examples/full-sdk/README.md)

## 3. Docs Site Source

These are the curated VitePress pages that power the public docs site.

1. [../apps/docs/index.md](../apps/docs/index.md)
2. [../apps/docs/docs/intro.md](../apps/docs/docs/intro.md)
3. [../apps/docs/docs/why-aionis.md](../apps/docs/docs/why-aionis.md)
4. [../apps/docs/docs/architecture/overview.md](../apps/docs/docs/architecture/overview.md)
5. [../apps/docs/docs/runtime/lite-runtime.md](../apps/docs/docs/runtime/lite-runtime.md)
6. [../apps/docs/docs/sdk/client-and-bridge.md](../apps/docs/docs/sdk/client-and-bridge.md)
7. [../apps/docs/docs/reference/contracts-and-routes.md](../apps/docs/docs/reference/contracts-and-routes.md)
8. [../apps/docs/docs/evidence/stable-baseline.md](../apps/docs/docs/evidence/stable-baseline.md)

## 4. Internal Code-Aligned Contracts

These documents are internal kernel references that were checked against current schemas, routes, and tests.

1. [RUNTIME_MAINLINE.md](RUNTIME_MAINLINE.md)
2. [CORE_EXECUTION_MEMORY_PRODUCT_CONTRACT_V1.md](CORE_EXECUTION_MEMORY_PRODUCT_CONTRACT_V1.md)
3. [CORE_EXECUTION_MEMORY_INTEGRATOR_GUIDE.md](CORE_EXECUTION_MEMORY_INTEGRATOR_GUIDE.md)
4. [CORE_EXECUTION_NATIVE_ROUTE_CONTRACT.md](CORE_EXECUTION_NATIVE_ROUTE_CONTRACT.md)
5. [CORE_PLANNER_PACKET_AND_PROVENANCE_CONTRACT.md](CORE_PLANNER_PACKET_AND_PROVENANCE_CONTRACT.md)
6. [CORE_ANCHOR_SCHEMA.md](CORE_ANCHOR_SCHEMA.md)
7. [../packages/runtime-core/README.md](../packages/runtime-core/README.md)

## 5. Internal Release And Package Maintenance Docs

Use these documents when maintaining package releases or repository publishing flow, not as external integration docs.

1. [SDK_PUBLISHING.md](SDK_PUBLISHING.md)

## 6. Internal Strategy And Design Docs

These documents still matter, but they are strategy or design guidance rather than canonical code contracts.

1. [CORE_CONTINUITY_STRATEGY.md](CORE_CONTINUITY_STRATEGY.md)
2. [CORE_MEMORY_GOVERNANCE_MODEL.md](CORE_MEMORY_GOVERNANCE_MODEL.md)
3. [CORE_MEMORY_TRIGGER_MATRIX.md](CORE_MEMORY_TRIGGER_MATRIX.md)
4. [AIONIS_TARGET_STATE_UPGRADE_PLAN_V1.md](AIONIS_TARGET_STATE_UPGRADE_PLAN_V1.md)

## 7. Plans, ADRs, And Historical Archive

Use these when you need design history or implementation planning, not current public docs.

1. [adr/README.md](adr/README.md)
2. [plans/README.md](plans/README.md)
3. [AIONIS_0_1_0_RELEASE_NOTE.md](AIONIS_0_1_0_RELEASE_NOTE.md)
4. [AIONIS_RUNTIME_CAPABILITY_AUDIT_V1.md](AIONIS_RUNTIME_CAPABILITY_AUDIT_V1.md)
5. [CORE_EXECUTION_MEMORY_CONTRACT_CLEANUP_PLAN.md](CORE_EXECUTION_MEMORY_CONTRACT_CLEANUP_PLAN.md)
6. [CORE_EXECUTION_MEMORY_REDUNDANCY_AUDIT.md](CORE_EXECUTION_MEMORY_REDUNDANCY_AUDIT.md)
7. [CORE_EXECUTION_MEMORY_V2_MIRROR_MIGRATION_SKETCH.md](CORE_EXECUTION_MEMORY_V2_MIRROR_MIGRATION_SKETCH.md)
8. [CORE_FOUNDATION_MEMORY_UPGRADE_ROADMAP.md](CORE_FOUNDATION_MEMORY_UPGRADE_ROADMAP.md)
9. [CORE_FOUNDATION_MEMORY_V1_IMPLEMENTATION_PLAN.md](CORE_FOUNDATION_MEMORY_V1_IMPLEMENTATION_PLAN.md)
10. [CORE_FOUNDATION_MEMORY_V2_IMPLEMENTATION_PLAN.md](CORE_FOUNDATION_MEMORY_V2_IMPLEMENTATION_PLAN.md)
11. [CORE_FOUNDATION_MEMORY_V3_IMPLEMENTATION_PLAN.md](CORE_FOUNDATION_MEMORY_V3_IMPLEMENTATION_PLAN.md)
12. [CORE_GOVERNANCE_AND_STRATEGY_STATUS.md](CORE_GOVERNANCE_AND_STRATEGY_STATUS.md)

## 8. Docs Maintenance

Use this when you are changing docs and need the repository rules for living docs, archive markers, and docs CI.

1. [DOCS_MAINTENANCE.md](DOCS_MAINTENANCE.md)

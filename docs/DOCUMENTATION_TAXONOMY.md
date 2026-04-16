# Aionis Runtime Documentation Taxonomy

Last reviewed: 2026-04-16

Document status: living repository taxonomy

This file is the documentation inventory for the repository.

The repository currently contains four different documentation layers:

1. public product docs
2. public technical and integration docs
3. internal kernel contracts and contributor references
4. plans, ADRs, and historical archive material

Generated VitePress cache and build output under `apps/docs/.vitepress/cache` and `apps/docs/.vitepress/dist` are not source documentation and are intentionally excluded from this taxonomy.

## 1. Public Product Docs

These are the primary product-positioning documents for external readers.

1. [README.md](../README.md)
2. [AIONIS_PRODUCT_DEFINITION_V1.md](AIONIS_PRODUCT_DEFINITION_V1.md)
3. [LAUNCH_MESSAGING.md](LAUNCH_MESSAGING.md)
4. [OPEN_CORE_BOUNDARY.md](OPEN_CORE_BOUNDARY.md)

## 2. Public Technical And Integration Docs

These documents describe the runtime, SDK, package, and validation surfaces that should stay aligned with the current codebase.

1. [SDK_QUICKSTART.md](SDK_QUICKSTART.md)
2. [SDK_PUBLISHING.md](SDK_PUBLISHING.md)
3. [LOCAL_RUNTIME_ARCHITECTURE_AND_COMPLETION.md](LOCAL_RUNTIME_ARCHITECTURE_AND_COMPLETION.md)
4. [LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md](LOCAL_RUNTIME_API_CAPABILITY_MATRIX.md)
5. [LOCAL_RUNTIME_SOURCE_BOUNDARY.md](LOCAL_RUNTIME_SOURCE_BOUNDARY.md)
6. [LOCAL_RUNTIME_REAL_TASK_BENCHMARK_REPORT.md](LOCAL_RUNTIME_REAL_TASK_BENCHMARK_REPORT.md)
7. [CORE_TESTING_STRATEGY.md](CORE_TESTING_STRATEGY.md)
8. [../apps/lite/README.md](../apps/lite/README.md)
9. [../packages/full-sdk/README.md](../packages/full-sdk/README.md)
10. [../packages/runtime-core/README.md](../packages/runtime-core/README.md)
11. [../packages/aionis-doc/README.md](../packages/aionis-doc/README.md)
12. [../examples/full-sdk/README.md](../examples/full-sdk/README.md)

## 3. Docs Site Source

These files are the curated VitePress docs site content. They are public-facing, but they are maintained as site pages rather than root markdown references.

1. [../apps/docs/index.md](../apps/docs/index.md)
2. [../apps/docs/docs/intro.md](../apps/docs/docs/intro.md)
3. [../apps/docs/docs/why-aionis.md](../apps/docs/docs/why-aionis.md)
4. [../apps/docs/docs/architecture/overview.md](../apps/docs/docs/architecture/overview.md)
5. [../apps/docs/docs/runtime/lite-runtime.md](../apps/docs/docs/runtime/lite-runtime.md)
6. [../apps/docs/docs/sdk/client-and-bridge.md](../apps/docs/docs/sdk/client-and-bridge.md)
7. [../apps/docs/docs/reference/contracts-and-routes.md](../apps/docs/docs/reference/contracts-and-routes.md)
8. [../apps/docs/docs/evidence/validation-and-benchmarks.md](../apps/docs/docs/evidence/validation-and-benchmarks.md)
9. [../apps/docs/docs/contributing/architecture-and-boundaries.md](../apps/docs/docs/contributing/architecture-and-boundaries.md)
10. all concept and guide pages under `apps/docs/docs/concepts/` and `apps/docs/docs/guides/`

## 4. Internal Code-Aligned Contracts

These documents describe internal kernel contracts that are still backed by current schemas, route handlers, or CI coverage.

1. [RUNTIME_MAINLINE.md](RUNTIME_MAINLINE.md)
2. [CORE_EXECUTION_MEMORY_PRODUCT_CONTRACT_V1.md](CORE_EXECUTION_MEMORY_PRODUCT_CONTRACT_V1.md)
3. [CORE_EXECUTION_MEMORY_INTEGRATOR_GUIDE.md](CORE_EXECUTION_MEMORY_INTEGRATOR_GUIDE.md)
4. [CORE_EXECUTION_NATIVE_ROUTE_CONTRACT.md](CORE_EXECUTION_NATIVE_ROUTE_CONTRACT.md)
5. [CORE_PLANNER_PACKET_AND_PROVENANCE_CONTRACT.md](CORE_PLANNER_PACKET_AND_PROVENANCE_CONTRACT.md)
6. [CORE_ANCHOR_SCHEMA.md](CORE_ANCHOR_SCHEMA.md)

## 5. Internal Strategy And Design Docs

These documents still explain the intended kernel direction, but they should not be treated as canonical route-by-route or schema-by-schema references.

1. [CORE_CONTINUITY_STRATEGY.md](CORE_CONTINUITY_STRATEGY.md)
2. [CORE_MEMORY_GOVERNANCE_MODEL.md](CORE_MEMORY_GOVERNANCE_MODEL.md)
3. [CORE_MEMORY_TRIGGER_MATRIX.md](CORE_MEMORY_TRIGGER_MATRIX.md)

## 6. Plans And ADRs

These are internal design and decision-history documents.

1. [adr/README.md](adr/README.md)
2. [plans/README.md](plans/README.md)
3. all files under `docs/adr/`
4. all files under `docs/plans/`

## 7. Historical Archive

These documents are useful as historical record, audit trail, or release history, but they are not current product or runtime references.

1. [AIONIS_0_1_0_RELEASE_NOTE.md](AIONIS_0_1_0_RELEASE_NOTE.md)
2. [AIONIS_RUNTIME_CAPABILITY_AUDIT_V1.md](AIONIS_RUNTIME_CAPABILITY_AUDIT_V1.md)
3. [CORE_EXECUTION_MEMORY_CONTRACT_CLEANUP_PLAN.md](CORE_EXECUTION_MEMORY_CONTRACT_CLEANUP_PLAN.md)
4. [CORE_EXECUTION_MEMORY_REDUNDANCY_AUDIT.md](CORE_EXECUTION_MEMORY_REDUNDANCY_AUDIT.md)
5. [CORE_EXECUTION_MEMORY_V2_MIRROR_MIGRATION_SKETCH.md](CORE_EXECUTION_MEMORY_V2_MIRROR_MIGRATION_SKETCH.md)
6. [CORE_FOUNDATION_MEMORY_UPGRADE_ROADMAP.md](CORE_FOUNDATION_MEMORY_UPGRADE_ROADMAP.md)
7. [CORE_FOUNDATION_MEMORY_V1_IMPLEMENTATION_PLAN.md](CORE_FOUNDATION_MEMORY_V1_IMPLEMENTATION_PLAN.md)
8. [CORE_FOUNDATION_MEMORY_V2_IMPLEMENTATION_PLAN.md](CORE_FOUNDATION_MEMORY_V2_IMPLEMENTATION_PLAN.md)
9. [CORE_FOUNDATION_MEMORY_V3_IMPLEMENTATION_PLAN.md](CORE_FOUNDATION_MEMORY_V3_IMPLEMENTATION_PLAN.md)
10. [CORE_GOVERNANCE_AND_STRATEGY_STATUS.md](CORE_GOVERNANCE_AND_STRATEGY_STATUS.md)

## 8. Repository Meta Docs

These are repository-operation docs, not runtime/product docs.

1. [../CONTRIBUTING.md](../CONTRIBUTING.md)
2. [../SECURITY.md](../SECURITY.md)

## 9. Docs Maintenance

This is the repository rulebook for how living docs, archive docs, and docs validation should be maintained.

1. [DOCS_MAINTENANCE.md](DOCS_MAINTENANCE.md)

## 10. Removed Obsolete Docs

These files were removed because they were redundant or historical scratch notes that no longer described the current repository accurately.

1. `docs/FULL_SDK_QUICKSTART.md`
2. `LITE_REPO_BOOTSTRAP.md`
3. `REPO_CUTOVER.md`

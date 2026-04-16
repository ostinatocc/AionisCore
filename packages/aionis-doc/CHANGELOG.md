# Changelog

All notable changes to `@aionis/doc` will be documented in this file.

The format is based on Keep a Changelog and this package follows SemVer.

## [Unreleased]

## [0.2.0] - 2026-03-18

### Added

1. Added the standalone runner surface with `run-aionis-doc`, direct execution from `.aionis.md` source or `execution_plan_v1`, and stable `execution_result_v1` output.
2. Added standalone validators with `validate-aionis-doc-registry` and `validate-aionis-doc-module`, plus main CLI bridges through `aionis doc run`, `aionis doc validate-registry`, and `aionis doc validate-module`.
3. Added the npm-installed module registry prototype with `aionis_doc_npm_module_registry_v1` and `standalone_npm_registry_v1`.
4. Added the first official published module package set:
   - `@aionis/doc-module-copy-summary`
   - `@aionis/doc-module-research-claims`
   - `@aionis/doc-module-json-transform`
5. Added official module package release surfaces, module release checks, module publish workflow, and public module author documentation.

## [0.1.0] - 2026-03-18

### Added

1. First public `@aionis/doc` package release with standalone binaries for compile, execute, runtime-handoff, store-request, publish, recover, and resume flows.
2. Added release metadata, dry-run packaging support, and standalone package documentation for the Aionis Doc toolchain.
3. Added the initial direct execution surface with `execution_plan_v1`, runtime-neutral module manifests, and `execute-aionis-doc`.
4. Added continuity-aware resume orchestration and SDK-facing contracts aligned with the current Aionis Doc workflow.

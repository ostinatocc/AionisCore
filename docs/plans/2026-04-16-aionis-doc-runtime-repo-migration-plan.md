# Aionis Doc Runtime-Repo Migration Plan

Date: 2026-04-16

## Why this exists

`aionis-doc` is currently treated as an official Aionis capability by `Aionis Workbench`, but it still lives outside the `Aionis Core` repository boundary.

Today the dependency path is:

- Workbench calls [`AionisdocBridge`](../../../Aioniscli/Aionis/workbench/src/aionis_workbench/aionisdoc_bridge.py)
- the bridge resolves `AIONISDOC_WORKSPACE_ROOT`
- otherwise it falls back to `~/Desktop/Aionis/packages/aionis-doc`
- deterministic real-e2e also reads fixtures from that same external location through [`scenario_runner.py`](../../../Aioniscli/Aionis/workbench/src/aionis_workbench/e2e/real_e2e/scenario_runner.py)

That is now the wrong packaging boundary.

If `Aionis Workbench` is a standalone public repository, and `Aionis Core` is the official continuity/runtime repository, then `aionis-doc` should no longer remain an implicit external dependency hanging off a private or local `Aionis` workspace.

## Current factual state

The external package currently exists at:

- `~/Desktop/Aionis/packages/aionis-doc`

Current package contents include:

- `src/compile.ts`
- `src/run.ts`
- `src/execute.ts`
- `src/runtime-handoff.ts`
- `src/handoff-store.ts`
- `src/publish.ts`
- `src/recover.ts`
- `src/resume.ts`
- matching `*-cli.ts` entrypoints
- `fixtures/valid-workflow.aionis.md` and related fixture files

This means the package is already a real standalone package shape, not an ad hoc script folder.

## Decision

`aionis-doc` should be moved into the `Aionis Core` repository, but not shoved into the runtime kernel itself.

### Correct target boundary

Put `aionis-doc` in the `Aionis Core` repository as a sibling package:

- `packages/aionis-doc`

### Incorrect target boundary

Do not merge the full compiler/CLI/editor-oriented toolchain directly into:

- `src/`
- `src/routes/`
- `src/memory/`
- `apps/lite/`

The runtime kernel should own continuity contracts and runtime-native persistence surfaces, not the entire document toolchain UX.

## Boundary rules

### Should live in `Aionis Core` repository

- the `aionis-doc` TypeScript package
- doc compile/run/execute/publish/recover/resume code
- package fixtures used by deterministic validation
- package README and release metadata
- shared contracts that are consumed by Workbench and future hosts

### Should live in the runtime kernel

- doc runtime handoff contract shapes
- doc handoff-store request shapes
- doc artifact persistence contract
- runtime-facing publish/recover/resume envelopes, if they become stable kernel contracts
- any memory-side schema needed for doc continuity to become a first-class runtime object

### Should stay outside the runtime kernel

- editor integration UX
- VS Code/Cursor extension behavior
- shell command presentation
- Workbench-specific `doc show/list/inspect` product surfaces
- registry authoring UX

## Target repository shape

After migration, the intended repository shape is:

```text
AionisCore/
  packages/
    full-sdk/
    runtime-core/
    sdk/
    aionis-doc/
      package.json
      README.md
      src/
      fixtures/
      dist/          # build output, not committed if the repo policy avoids committing dist
  src/
    memory/
    routes/
    execution/
```

Workbench should then treat `aionis-doc` exactly like it treats `Aionis Core`:

- official
- sibling
- explicit
- versionable

not as an opaque external desktop path.

## Migration phases

### Phase 0: Import without semantic expansion

Goal: move the package into `Aionis Core` with minimal behavior change.

Tasks:

1. copy `~/Desktop/Aionis/packages/aionis-doc` into `AionisCore/packages/aionis-doc`
2. preserve current package layout and current CLI entrypoints
3. wire root workspace scripts for:
   - build
   - package dry-run
   - package release check
4. keep existing behavior stable before any runtime-kernel redesign

Acceptance:

- package builds in `Aionis Core`
- existing Workbench bridge can target the new package root
- no functional change to publish/recover/resume behavior yet

### Phase 1: Make Workbench prefer the new official package root

Goal: remove the current desktop-path assumption.

Tasks:

1. change `AionisdocBridge` resolution order to prefer:
   - `AIONISDOC_PACKAGE_ROOT`
   - `AIONISDOC_WORKSPACE_ROOT/packages/aionis-doc`
   - sibling `../AionisCore/packages/aionis-doc`
   - sibling `../AionisRuntime/packages/aionis-doc`
2. keep the current desktop fallback only as a temporary compatibility path
3. update deterministic real-e2e fixture lookup to use the repo-local or sibling-package fixture first

Acceptance:

- Workbench deterministic CI no longer requires `~/Desktop/Aionis/...`
- Workbench can run against a sibling checkout of `AionisCore`

### Phase 2: Pull fixture responsibility into the official package

Goal: stop CI and tests from depending on personal-machine paths.

Tasks:

1. treat `packages/aionis-doc/fixtures` as the canonical deterministic fixture source
2. update Workbench `scenario_runner.py` to read from:
   - explicit env root
   - sibling `AionisCore/packages/aionis-doc/fixtures`
   - only then fall back to legacy desktop path
3. add narrow tests proving this resolution order

Acceptance:

- deterministic real-e2e can run in CI with only checked-out repositories
- the fixture path becomes machine-independent

### Phase 3: Formalize runtime-facing doc contracts

Goal: separate package/toolchain logic from runtime-kernel contract ownership.

Tasks:

1. audit current `runtime-handoff`, `handoff-store`, `publish`, `recover`, and `resume` payloads
2. identify which shapes are really runtime-native and should be standardized under kernel-owned schemas
3. add or tighten runtime-side contract documentation for:
   - doc runtime handoff
   - doc artifact persistence
   - doc continuity artifact references

Acceptance:

- runtime contract ownership is explicit
- Workbench and future hosts can consume stable doc continuity shapes without importing shell behavior

### Phase 4: Optional kernel projection

Goal: only if justified, expose limited doc-native kernel surfaces.

Possible additions:

- a runtime-native artifact schema for doc workflow evidence
- a runtime-native summary/read surface for doc continuity
- replay/experience projections that understand doc workflow evidence

Non-goal:

- embedding the entire `aionis-doc` compiler into `apps/lite`

Acceptance:

- only host-agnostic continuity surfaces move into kernel
- package/tooling UX remains in `packages/aionis-doc`

## CI and release implications

Once `aionis-doc` is imported into `Aionis Core`, the release/CI model should become:

### `Aionis Core`

- builds `packages/aionis-doc`
- can validate package release shape
- can publish package artifacts in a controlled way

### `Aionis Workbench`

- checks out `AionisCore` as a sibling dependency in CI when deterministic e2e needs runtime + doc package
- sets:
  - `AIONIS_RUNTIME_ROOT`
  - `AIONISDOC_PACKAGE_ROOT` or `AIONISDOC_WORKSPACE_ROOT`

This is cleaner than teaching Workbench CI to simulate a private desktop workspace layout.

## Recommended execution order

The practical order should be:

1. import `packages/aionis-doc` into `Aionis Core`
2. update Workbench bridge and fixture resolution to prefer the new package root
3. fix Workbench deterministic CI to provision sibling `AionisCore`
4. only after that, decide which doc contracts deserve kernel-native standardization

Do not start by forcing `aionis-doc` into runtime kernel routes.

## Risks

### Risk 1: package import accidentally drags product semantics into kernel

Mitigation:

- move package first
- standardize runtime contracts second
- keep shell/editor flows out of `src/`

### Risk 2: Workbench CI stays brittle because fixture lookup remains path-shaped

Mitigation:

- make fixture resolution package-root-first
- add dedicated tests for fixture discovery

### Risk 3: release surface becomes confusing

Mitigation:

- describe `aionis-doc` as an official sibling package of `Aionis Core`
- do not market it as “part of lite runtime shell”

## Final recommendation

`aionis-doc` should be absorbed into the `Aionis Core` repository now.

But the absorption should happen at the package boundary:

- yes: `packages/aionis-doc`
- no: dumping the full toolchain directly into runtime kernel internals

That gives the project the right long-term shape:

- `Aionis Core` owns the official continuity/runtime/doc package family
- `Aionis Workbench` consumes those packages as a product shell
- the runtime kernel stays clean

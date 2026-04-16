# @aionis/doc

Parser, compiler, standalone runner, and continuity toolchain for Aionis Doc.

This package now lives in the official Aionis Runtime repository under [`packages/aionis-doc`](../aionis-doc).

## Install

```bash
npm i @aionis/doc@0.2.0
```

This package exposes two standalone paths:

1. portable execution through `run-aionis-doc`
2. Aionis-native continuity through handoff, publish, recover, and resume

The shortest standalone execution path is:

```bash
npx @aionis/doc@0.2.0 run-aionis-doc ./workflow.aionis.md --registry ./module-registry.json
```

The stable registry path is the local file registry:

1. `aionis_doc_module_registry_v1`
2. runtime id: `standalone_file_registry_v1`

An experimental npm-installed registry prototype is also supported:

1. `aionis_doc_npm_module_registry_v1`
2. runtime id: `standalone_npm_registry_v1`

The first official module package set is now published on npm:

1. `@aionis/doc-module-research-claims`
2. `@aionis/doc-module-copy-summary`
3. `@aionis/doc-module-json-transform`

If you are authoring your own package, the shortest stable workflow is:

1. export `manifest` and `handler`
2. validate the module entry with `validate-aionis-doc-module`
3. attach it to a registry
4. validate the registry
5. run the document through `run-aionis-doc`

The full package binaries are:

```bash
npx @aionis/doc@0.2.0 compile-aionis-doc ./workflow.aionis.md --emit all
npx @aionis/doc@0.2.0 run-aionis-doc ./workflow.aionis.md --registry ./module-registry.json
npx @aionis/doc@0.2.0 validate-aionis-doc-registry ./module-registry.json
npx @aionis/doc@0.2.0 validate-aionis-doc-module ./modules/copy-summary.mjs --declared-module copy.summary.v1
npx @aionis/doc@0.2.0 execute-aionis-doc ./workflow.aionis.md
npx @aionis/doc@0.2.0 build-aionis-doc-runtime-handoff ./workflow.aionis.md --scope default
npx @aionis/doc@0.2.0 build-aionis-doc-handoff-store-request ./runtime-handoff.json --scope default
npx @aionis/doc@0.2.0 publish-aionis-doc-handoff ./workflow.aionis.md --base-url http://127.0.0.1:3001
npx @aionis/doc@0.2.0 recover-aionis-doc-handoff ./workflow.aionis.md --base-url http://127.0.0.1:3001
npx @aionis/doc@0.2.0 resume-aionis-doc-runtime ./recover-result.json --input-kind recover-result --candidate resume_patch --candidate request_review
```

## CLI Surface

1. `compile-aionis-doc`
2. `run-aionis-doc`
3. `validate-aionis-doc-registry`
4. `validate-aionis-doc-module`
5. `execute-aionis-doc`
6. `build-aionis-doc-runtime-handoff`
7. `build-aionis-doc-handoff-store-request`
8. `publish-aionis-doc-handoff`
9. `recover-aionis-doc-handoff`
10. `resume-aionis-doc-runtime`

## Package Usage

```ts
import {
  compileAionisDoc,
  compileAndExecuteAionisDoc,
  buildRuntimeHandoffV1,
  buildHandoffStoreRequestFromRuntimeHandoff,
  ModuleRegistryExecutionRuntime,
  StaticModuleRegistry,
  runAionisDoc,
} from "@aionis/doc";

const result = compileAionisDoc(sourceText);

const standaloneResult = await runAionisDoc({
  inputPath: "./workflow.aionis.md",
  inputKind: "source",
  registryPath: "./module-registry.json",
});

const handoff = buildRuntimeHandoffV1({
  inputPath: "./workflow.aionis.md",
  result,
  scope: "default",
  repoRoot: process.cwd(),
});

const storeRequest = buildHandoffStoreRequestFromRuntimeHandoff({
  handoff,
  scope: "default",
});

const runtime = new ModuleRegistryExecutionRuntime({
  runtime_id: "custom_runtime_v1",
  registry: new StaticModuleRegistry([
    {
      manifest: {
        module: "custom.echo.v1",
        version: "1.0.0",
        description: "Echo a text payload.",
        deterministic: true,
        required_capabilities: ["direct_execution"],
        input_contract: {
          kind: "object",
          properties: {
            text: { kind: "string" },
          },
          required: ["text"],
          additional_properties: false,
        },
        output_contract: {
          kind: "object",
          properties: {
            text: { kind: "string" },
          },
          required: ["text"],
          additional_properties: false,
        },
        artifact_contract: {
          kind: "object",
          properties: {
            uri: { kind: "string" },
          },
          required: ["uri"],
          additional_properties: false,
        },
        evidence_contract: {
          kind: "object",
          properties: {
            claim: { kind: "string" },
          },
          required: ["claim"],
          additional_properties: false,
        },
      },
      handler: (input) => ({
        kind: "module_result",
        output: input,
        artifacts: [{ uri: "memory://artifacts/custom.echo.v1/result.json" }],
        evidence: [{ claim: "Echo module returned the input payload." }],
      }),
    },
  ]),
});

const executionResult = await compileAndExecuteAionisDoc(sourceText, { runtime });
```

The module contract is now split into:

1. `manifest`: stable runtime-neutral metadata and input/output contracts
2. `artifact_contract` and `evidence_contract`: optional structured side-output contracts
3. `handler`: the runtime-specific implementation

The important boundary is:

1. `run-aionis-doc` and `runAionisDoc(...)` are standalone execution entrypoints
2. `validate-aionis-doc-registry` and `validate-aionis-doc-module` are standalone contract checks
3. `publish / recover / resume` remain Aionis-native continuity enhancements

## Local Release Checks

From the repository root:

```bash
npm run -s aionis-doc:build
npm run -s aionis-doc:release:check
npm run -s aionis-doc:pack:dry-run
npm run -s aionis-doc:publish:dry-run
```

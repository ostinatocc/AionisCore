# @cognary/aionis

`@cognary/aionis` is the official TypeScript SDK for **Aionis Suite**.

Private repo note:

1. this copy is mirrored into `Aionis-runtime` for integration work
2. the public publish source remains [Cognary/Aionis](https://github.com/Cognary/Aionis)
3. do not publish from `Aionis-runtime`

Package page:

1. [npm: `@cognary/aionis`](https://www.npmjs.com/package/@cognary/aionis)
2. CLI command: `aionis`

It connects to an Aionis runtime and exposes the first stable public SDK surface for:

1. `memory.write`
2. `memory.planningContext`
3. `memory.contextAssemble`
4. `memory.executionIntrospect`
5. `memory.tools.select`
6. `memory.tools.feedback`
7. `memory.replay.repairReview`
8. `memory.anchors.rehydratePayload`

## Install

```bash
npm install @cognary/aionis
```

Run the CLI without a global install:

```bash
npx @cognary/aionis doctor
```

Start the public demo runtime shell from a checked out Aionis repository:

```bash
npx @cognary/aionis dev --repo /path/to/Aionis
```

If `3001` is already in use, the CLI now picks a free local port automatically.
You can also force one:

```bash
npx @cognary/aionis dev --repo /path/to/Aionis --port 3101
```

## Quickstart

```ts
import { createAionisClient } from "@cognary/aionis";

const client = createAionisClient({
  baseUrl: "http://127.0.0.1:3001",
});

const result = await client.memory.write({
  tenant_id: "default",
  scope: "default",
  input_text: "Fix export failure in node tests",
});

console.log(result);
```

## Local Development

Build the package:

```bash
npm --prefix packages/sdk run build
```

Run package tests:

```bash
npm --prefix packages/sdk run test
```

Run the release baseline:

```bash
npm run -s sdk:release:check
```

Run a publish dry-run:

```bash
npm run -s sdk:publish:dry-run
```

For real npm release work, use the public repo, not this private mirror.

## CLI

Current thin CLI commands:

1. `aionis doctor`
2. `aionis example`
3. `aionis dev --repo /path/to/Aionis`
4. `aionis dev --repo /path/to/Aionis --port 3101`
5. `aionis dev --repo /path/to/Aionis --local-process`
6. `aionis dev --repo /path/to/Aionis --dry-run`

## Examples

Repository examples live under:

1. [examples/sdk/README.md](../../examples/sdk/README.md)
2. [docs/SDK_QUICKSTART.md](../../docs/SDK_QUICKSTART.md)

Inside this repository they import the locally built `dist` artifact first; after publish they should import `@cognary/aionis`.

## Naming

Public branding:

1. product name: `Aionis Suite`
2. npm package: `@cognary/aionis`
3. PyPI package: `cognary-aionis`

# @ostinato/aionis-runtime

Standalone local-first Aionis Runtime package.

Current release line: `0.2.34` for the Aionis Lite Developer Preview.

## Start

```bash
npx @ostinato/aionis-runtime@latest start
```

## Codex

Install Aionis Runtime into Codex with the bundled plugin:

```bash
npx @ostinato/aionis-runtime@latest codex install
```

This copies the bundled Codex plugin into `~/.aionis/codex/plugin`, enables the
local Codex plugin entry, enables `codex_hooks`, installs the macOS Runtime
watchdog, and runs the doctor.

Useful checks:

```bash
npx @ostinato/aionis-runtime@latest codex status
npx @ostinato/aionis-runtime@latest codex status --json
npx @ostinato/aionis-runtime@latest codex audit
npx @ostinato/aionis-runtime@latest codex audit --json
npx @ostinato/aionis-runtime@latest codex handoff --summary "Implemented the task and verified tests."
npx @ostinato/aionis-runtime@latest codex release 0.2.34 --summary "0.2.34 published and verified."
npx @ostinato/aionis-runtime@latest codex doctor
npx @ostinato/aionis-runtime@latest codex logs
```

Use a fresh npm cache when verifying a just-published release:

```bash
npm view @ostinato/aionis-runtime version --registry=https://registry.npmjs.org/ --cache /tmp/aionis-fresh-npm-view --prefer-online
npm exec --yes --package @ostinato/aionis-runtime@0.2.34 --cache /tmp/aionis-fresh-npm-exec --prefer-online -- aionis-runtime --version
```

## What it does

- starts the Lite runtime shell with local-safe defaults
- installs the Codex plugin from the Runtime package with one command
- keeps the Codex Runtime process online through a macOS LaunchAgent watchdog
- audits recent Codex context and handoff-quality decisions with `codex audit`
- stores explicit task and release handoffs with `codex handoff` and `codex release`
- injects compact Codex task-start facts before heavier Runtime context payloads
- recovers private task handoffs in local/auth-off Codex installs using request consumer identity
- recovers the latest repo-level Codex handoff without requiring a fake cwd anchor
- binds to `127.0.0.1` by default
- uses SQLite paths under the current working directory
- keeps source-clone startup optional instead of required

## Requirements

- Node 22+
- `node:sqlite` support

## Notes

- Inspector static assets are not bundled into this package. The runtime package
  disables the inspector by default unless you explicitly set
  `LITE_INSPECTOR_ENABLED=true` together with `LITE_INSPECTOR_DIST_PATH`.

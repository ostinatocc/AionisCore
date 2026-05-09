# @ostinato/aionis-runtime

Standalone local-first Aionis Runtime package.

Current release line: `0.2.6` for the Aionis Lite Developer Preview.

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
npx @ostinato/aionis-runtime@latest codex doctor
npx @ostinato/aionis-runtime@latest codex logs
```

## What it does

- starts the Lite runtime shell with local-safe defaults
- installs the Codex plugin from the Runtime package with one command
- keeps the Codex Runtime process online through a macOS LaunchAgent watchdog
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

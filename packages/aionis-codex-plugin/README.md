# Aionis Codex Plugin

`@ostinato/aionis-codex-plugin` connects Codex to Aionis Runtime as an automatic execution-memory layer.

It is intentionally not a side CLI. The plugin uses Codex lifecycle hooks and MCP:

- `SessionStart`: checks or starts local Aionis Runtime and injects resume context.
- `UserPromptSubmit`: assembles task-start context through Runtime recall, rules, tool selection, planner packets, continuity packs, and governance packs.
- `PreToolUse` / `PostToolUse`: records replay steps and tool feedback.
- `Stop`: stores session events, handoffs, replay end state, and optional playbook compilation.
- MCP: exposes high-level Aionis tools plus `aionis_runtime_call` for the full Runtime HTTP API.

## Local Install

From this package directory:

```bash
node scripts/aionis-codex-install.mjs
```

The installer creates a local plugin symlink under `~/plugins/aionis-codex`, adds a marketplace entry to `~/.agents/plugins/marketplace.json`, enables the local marketplace, enables `aionis-codex@local`, and turns on `codex_hooks`.

On macOS, the installer also writes and loads a LaunchAgent watchdog:

```text
~/Library/LaunchAgents/com.ostinato.aionis-codex-runtime.plist
```

The watchdog keeps a small daemon alive. The daemon checks Runtime health and starts `@ostinato/aionis-runtime@latest` when Runtime is unavailable, so Codex hooks do not have to be the only recovery point.

## Runtime Defaults

The plugin defaults to:

- `AIONIS_BASE_URL=http://127.0.0.1:3101`
- Runtime data under `~/.aionis/codex`
- Project scope derived from the current working directory
- Global user scope `codex:global`
- Local Lite Runtime autostart enabled
- macOS LaunchAgent watchdog enabled by the local installer

Override with environment variables:

- `AIONIS_BASE_URL`
- `AIONIS_CODEX_RUNTIME_HOME`
- `AIONIS_CODEX_AUTOSTART=false`
- `AIONIS_CODEX_SCOPE`
- `AIONIS_CODEX_SCOPE_MODE=global`
- `AIONIS_CODEX_GLOBAL_SCOPE`
- `AIONIS_CODEX_FAST_TIMEOUT_MS`
- `AIONIS_CODEX_CONTEXT_CHAR_LIMIT`
- `AIONIS_CODEX_CONTEXT_SNAPSHOT_TTL_MS`
- `AIONIS_CODEX_COMPILE_PLAYBOOKS=false`

`UserPromptSubmit` uses a short fast timeout for project handoff and release lookups. The `Stop` hook also writes a local project-context snapshot under `~/.aionis/codex/state`, so the next task can still receive the latest task or release context when Runtime find queries are slow.

## Doctor

```bash
node scripts/aionis-codex-doctor.mjs --local --start-runtime
```

The doctor checks manifest files, hook files, MCP server startup, Codex config, watchdog state, and Runtime health.

# Aionis Codex Plugin

`@ostinato/aionis-codex-plugin` connects Codex to Aionis Runtime as an automatic execution-memory layer.

It is intentionally not a side CLI. The plugin uses Codex lifecycle hooks and MCP:

- `SessionStart`: checks or starts local Aionis Runtime and injects resume context.
- `UserPromptSubmit`: assembles task-start context through Runtime recall, rules, tool selection, planner packets, continuity packs, and governance packs.
- `PreToolUse` / `PostToolUse`: records replay steps and tool feedback.
- `Stop` / `SessionEnd`: stores session events, handoffs, replay end state, and optional playbook compilation.
- MCP: exposes high-level Aionis tools plus `aionis_runtime_call` for the full Runtime HTTP API.

## Local Install

From this package directory:

```bash
node scripts/aionis-codex-install.mjs
```

The installer creates a local plugin symlink under `~/plugins/aionis-codex`, adds a marketplace entry to `~/.agents/plugins/marketplace.json`, enables the local marketplace, enables `aionis-codex@local`, and turns on `codex_hooks`.

## Runtime Defaults

The plugin defaults to:

- `AIONIS_BASE_URL=http://127.0.0.1:3101`
- Runtime data under `~/.aionis/codex`
- Project scope derived from the current working directory
- Global user scope `codex:global`
- Local Lite Runtime autostart enabled

Override with environment variables:

- `AIONIS_BASE_URL`
- `AIONIS_CODEX_RUNTIME_HOME`
- `AIONIS_CODEX_AUTOSTART=false`
- `AIONIS_CODEX_SCOPE`
- `AIONIS_CODEX_SCOPE_MODE=global`
- `AIONIS_CODEX_GLOBAL_SCOPE`
- `AIONIS_CODEX_CONTEXT_CHAR_LIMIT`
- `AIONIS_CODEX_COMPILE_PLAYBOOKS=false`

## Doctor

```bash
node scripts/aionis-codex-doctor.mjs --local
```

The doctor checks manifest files, hook files, MCP server startup, Codex config, and Runtime health.

# @ostinato/aionis-runtime

Standalone local-first Aionis Runtime package.

Current release line: `0.2.0` for the Aionis Lite Developer Preview.

## Start

```bash
npx @ostinato/aionis-runtime start
```

## What it does

- starts the Lite runtime shell with local-safe defaults
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

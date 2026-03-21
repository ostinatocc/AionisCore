# Aionis Installer Guide

## Summary

The first installer slice makes one thing true:

```bash
aionis
```

can now be installed onto a user's machine without requiring them to remember `npm run ...`.

## Install

From a checked-out repository:

```bash
bash scripts/install-aionis.sh
```

or:

```bash
npm run -s product:aionis:install
```

This installs:

1. `~/.local/bin/aionis`
2. `~/.aionis/install.json`

## Verify

After install:

```bash
aionis status
```

If `~/.local/bin` is not already on `PATH`, the installer result and the product-shell doctor surface make that visible.

## First Launch

Once installed:

```bash
aionis
```

This is the branded default path.

It will:

1. bootstrap the default Codex shell if needed
2. ensure the runtime is started
3. launch Codex

## Current Reality

This is the first distribution slice, not the final packaged distribution.

It already gives:

1. a stable `aionis` launcher install
2. an install manifest
3. one installer command

It does not yet give:

1. hosted one-line install
2. packaged binary distribution
3. Homebrew formula

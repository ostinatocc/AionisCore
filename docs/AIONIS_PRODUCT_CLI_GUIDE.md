# Aionis Product CLI Guide

## Summary

The branded user path is moving to:

```bash
aionis
```

In the current slice, `aionis` is the top-level command for managing and launching the default Codex host integration.

## Main Commands

### Install

```bash
aionis install
```

This is the top-level alias for the default Codex host setup path.

It installs the Codex product shell, writes the local Aionis launchers, and generates the branded `aionis` launcher.

### Status

```bash
aionis status
```

This reports the current default host integration state, including:

1. whether the product shell config exists
2. whether the generated `aionis` launcher exists
3. whether the launcher bin directory is on `PATH`
4. whether the runtime is healthy

### Start

```bash
aionis start
```

This starts the default runtime path for the current host integration if needed.

### Launch

```bash
aionis
```

This is the branded default path.

In the current slice it does two things:

1. auto-installs the default Codex shell if it is not installed yet
2. ensures the local runtime is started
3. launches Codex

## Advanced Codex Commands

The host-specific namespace still exists when you need explicit control:

```bash
aionis codex setup
aionis codex doctor
aionis codex status
aionis codex enable
aionis codex disable
aionis codex restore
aionis codex remove
aionis codex start
```

## Current Reality

This is not yet a bundled distribution. It is the first branded top-level command surface.

What it already gives:

1. one branded command name
2. a top-level install alias
3. a top-level status alias
4. a default launch path that auto-installs the current host shell

What it does not yet give:

1. a one-file installer
2. a packaged binary distribution
3. a polished post-install PATH onboarding flow

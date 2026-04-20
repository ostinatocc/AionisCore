# Changelog

This file tracks the public release train for Aionis Runtime packages and GitHub Releases.

## Unreleased

### Planned public release train

#### `@ostinato/aionis-runtime@0.1.0`

Initial public runtime package release.

Highlights:

- standalone local-first runtime package
- `npx @ostinato/aionis-runtime start`
- loopback-safe Lite defaults
- release-check coverage for install, CLI help, and `start --print-env`

#### `@ostinato/aionis@0.3.0`

Recommended next public SDK minor release.

Why minor instead of patch:

- new first-class `memory.actionRetrieval(...)` public surface
- explicit uncertainty and gate surfaces
- operator projection and action-hint surfaces
- host bridge startup decisions now align to runtime gate hints

Highlights:

- Action Retrieval and evidence surfaces
- Uncertainty gates and startup escalation
- operator projection and host-facing action hints
- quickstart and docs alignment with standalone runtime startup

#### GitHub Release `v0.3.0`

Recommended combined public release message:

- introduces the standalone runtime install path
- promotes Action Retrieval and Uncertainty as first-class public capabilities
- keeps Lite as the local-first runtime shape
- keeps source-checkout startup as a fallback, not the primary onboarding path

### Current package baseline

| Package | Current repo version | Next public recommendation |
| --- | --- | --- |
| `@ostinato/aionis-runtime` | `0.1.0` | publish `0.1.0` |
| `@ostinato/aionis` | `0.2.0` | bump to `0.3.0` |
| `@ostinato/aionis-rtc` | `0.1.0` | keep as-is unless boundary exports change |


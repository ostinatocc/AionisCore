---
title: Handoff
slug: /concepts/handoff
---

# Handoff

Handoff is the continuity surface for pause and resume.

Instead of relying on conversational summaries alone, Aionis stores a structured packet that can carry work forward between sessions or operators.

Typical handoff fields include:

- summary
- handoff text
- target files
- next action
- acceptance checks
- recovery context

## Why this matters

Most agent resumes are brittle because they rely on prose that is not execution-ready.

A good handoff should let the next run answer:

1. where do I go first
2. what should change
3. what should stay untouched
4. what check should confirm success

## Current Lite shape

Lite exposes local handoff persistence and recovery through the supported runtime surface.

This makes handoff especially useful for:

- long-running repairs
- review checkpoints
- interrupted local workflows
- task sessions opened through the host bridge

## Related surfaces

- `handoff.store(...)`
- `handoff.recover(...)`
- host bridge pause and resume flows

## Deep dives

- [Handoff reference](../reference/handoff.md)
- [SDK Quickstart](../sdk/quickstart.md)
- [Pause and Resume guide](../guides/pause-and-resume.md)

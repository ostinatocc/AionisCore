---
title: Pause And Resume
slug: /guides/pause-and-resume
---

# Guide: pause and resume

Pause and resume should be one of the first flows you test after kickoff.

## Scenario

The agent cannot finish in one sitting. You need a checkpoint that another run or another operator can trust.

## Flow

1. open or track a task session
2. store a structured handoff with summary, target files, and next action
3. recover that handoff later
4. resume with the recovered continuity data

## Why this flow matters

The resume quality of most agents is weak because the state transfer is mostly conversational.

Aionis tries to improve that by making the handoff explicit and runtime-readable.

## Best follow-up reads

- [Handoff concept](../concepts/handoff.md)
- [Handoff reference](../reference/handoff.md)
- [SDK Quickstart](../sdk/quickstart.md)

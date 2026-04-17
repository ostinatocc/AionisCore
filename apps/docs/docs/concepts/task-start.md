---
title: Task Start
slug: /concepts/task-start
---

# Task Start

Task Start is the shortest path to understanding Aionis.

The idea is simple: when a similar task shows up again, the agent should not begin from a blank slate. It should begin with a stronger first move.

In Aionis, task start is built from:

1. prior execution memory
2. tool feedback and selection history
3. workflow projection and experience intelligence
4. kickoff recommendation and planning summary surfaces

## What you get back

The practical output is usually one of:

- a suggested tool
- a file-level next action
- a more structured startup recommendation grounded in prior runs

## Why this matters

Coding agents waste a lot of time rediscovering the same repair path. Task Start is meant to compress that loop.

That makes it useful for:

- recurring bug classes
- repeated migrations
- repair workflows that come back with small variations
- operational tasks where the first action matters disproportionately

## Related surfaces

- `memory.taskStart(...)`
- `memory.kickoffRecommendation(...)`
- `memory.planningContext(...)`
- `memory.experienceIntelligence(...)`

## Deep dives

- [SDK Quickstart](../sdk/quickstart.md)
- [Memory reference](../reference/memory.md)
- [Repeated Task Kickoff guide](../guides/repeated-task-kickoff.md)

---
title: Repeated Task Kickoff
slug: /guides/repeated-task-kickoff
---

# Guide: repeated-task kickoff

This is the strongest first demo for Aionis.

## Scenario

You have a recurring class of coding work:

- export bugs
- flaky tests
- billing retries
- migration regressions

You want the agent to stop rediscovering the same starting path every time.

## Flow

1. write execution memory from a prior successful or partially successful run
2. optionally record tool feedback
3. call `planningContext`, `experienceIntelligence`, or `taskStart` for a similar task later
4. inspect whether the first action is stronger than a cold start

## What success looks like

The agent returns:

- a tighter selected tool
- a better ordered candidate list
- a file-level next move
- a clearer rationale for why that move is grounded in prior execution

## Best supporting evidence

The benchmark report is the best proof source for this flow:

- [Memory reference](../reference/memory.md)
- [Validation and Benchmarks](../evidence/validation-and-benchmarks.md)

That report already calls out kickoff hit rate, path hit rate, stale-memory interference rate, and repeated-task cost reduction.

---
title: Replay
slug: /concepts/replay
---

# Replay

Replay is the producer side of Aionis continuity.

It records successful execution and turns that execution into reusable operating knowledge.

The replay flow in Lite includes:

1. replay run lifecycle
2. step before / after events
3. compile playbook from run
4. candidate and promotion flow
5. repair and repair-review surfaces

## Why this matters

Without replay, continuity stays descriptive. With replay, continuity becomes operational.

That is the transition from:

- "the agent remembers what happened"

to:

- "the agent can reuse a validated workflow from what happened"

## What replay produces

The important artifact is the playbook.

Stable playbooks can become workflow anchors that planning and recall surfaces use later. That creates the loop:

```text
successful execution -> replay run -> playbook -> stable workflow anchor -> better future kickoff
```

## Related surfaces

- `memory.replay.run.*`
- `memory.replay.step.*`
- `memory.replay.playbooks.*`
- Lite automation nodes that execute local playbooks

## Deep dives

- [Replay and Playbooks reference](../reference/replay-and-playbooks.md)
- [Replay to Playbook guide](../guides/replay-to-playbook.md)
- [Validation and Benchmarks](../evidence/validation-and-benchmarks.md)

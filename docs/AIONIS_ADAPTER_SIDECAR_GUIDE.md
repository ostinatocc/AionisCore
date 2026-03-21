# Aionis Adapter Sidecar Guide

## Summary

The Aionis adapter sidecar is the first runnable local process for adapter-first integration.

Use it when you want a client to emit execution lifecycle events into Aionis without depending on:

1. prompt habits
2. repeated user confirmations
3. MCP tool-calling as the main learning path

## What The Sidecar Does

The sidecar accepts a narrow event family and routes it through the existing adapter baseline.

Current supported events:

1. `task_started`
2. `tool_selection_requested`
3. `tool_executed`
4. `task_completed`
5. `task_blocked`
6. `task_failed`
7. `introspect_requested`

Internally, it uses:

1. [aionis-adapter.ts](/Volumes/ziel/Aionisgo/src/adapter/aionis-adapter.ts)
2. [claude-code-harness.ts](/Volumes/ziel/Aionisgo/src/adapter/claude-code-harness.ts)
3. [sidecar.ts](/Volumes/ziel/Aionisgo/src/adapter/sidecar.ts)

## When To Use It

Choose the sidecar path when:

1. the client can emit task and tool lifecycle events
2. you want Aionis to participate automatically in the task loop
3. you do not want MCP prompts to be the primary integration mechanism

Keep thin MCP when:

1. the client only supports MCP
2. you need a compatibility or inspection path
3. you want fast builder integration without deeper lifecycle hooks

## Product Position

The intended split is:

1. sidecar + adapter = main execution path
2. thin MCP = compatibility and observation layer

The sidecar is not a second control plane.
It is only the local event-driven execution layer that feeds the adapter.

## How It Differs From Thin MCP

Thin MCP is good at:

1. exposing planning, selection, finalization, and introspection tools
2. compatibility with MCP-native clients
3. debugging and demos

The sidecar is better at:

1. receiving lifecycle events directly
2. ordering calls consistently
3. finalizing tasks once
4. reducing prompt choreography

## Current Shape

The current sidecar baseline is:

1. local only
2. source-owned
3. ephemeral-state only
4. no new persistence layer
5. wrapper-first

It already includes:

1. event contracts
2. dispatch logic
3. a stdin JSON entrypoint
4. sidecar-specific tests

## Startup

Start the Aionis runtime first:

```bash
PORT=3011 npm run start:lite
```

Then run the sidecar process:

```bash
AIONIS_BASE_URL=http://127.0.0.1:3011 AIONIS_SCOPE=default npm run -s adapter:sidecar
```

The current entrypoint reads one JSON request from stdin and returns one JSON response on stdout.

## Wrapper-Style Usage

The first practical integration should look like this:

1. client detects task start
2. client sends `task_started`
3. client detects candidate tools
4. client sends `tool_selection_requested`
5. client executes the chosen tool path
6. client sends `tool_executed`
7. client sends `task_completed` or `task_blocked`
8. client optionally sends `introspect_requested`

This is the recommended first path for Claude Code style experiments because it avoids relying on private internal hooks.

## Minimal Example Event

```json
{
  "request_id": "r1",
  "event": {
    "event_type": "task_started",
    "task_id": "task-1",
    "query_text": "repair export failure in node tests",
    "context": {
      "task_kind": "repair_export"
    },
    "tool_candidates": ["bash", "edit", "test"]
  }
}
```

## Current Limits

The current sidecar still needs:

1. a richer always-on process model if we want long-lived local sessions
2. a concrete wrapper implementation around a real client
3. a stronger packaging story for non-developer users

So the current state is:

1. sidecar baseline: present
2. sidecar tests: present
3. real wrapper productization: not yet done

## Recommended Next Step

The next best move is:

1. build a thin wrapper around a real client lifecycle
2. keep sidecar events narrow
3. use thin MCP only for fallback and inspection

## Related Docs

1. [AIONIS_ADAPTER_SIDECAR_SPEC.md](/Volumes/ziel/Aionisgo/docs/AIONIS_ADAPTER_SIDECAR_SPEC.md)
2. [AIONIS_EXECUTION_ADAPTER_GUIDE.md](/Volumes/ziel/Aionisgo/docs/AIONIS_EXECUTION_ADAPTER_GUIDE.md)
3. [AIONIS_THIN_MCP_GUIDE.md](/Volumes/ziel/Aionisgo/docs/AIONIS_THIN_MCP_GUIDE.md)

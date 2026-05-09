---
name: aionis-runtime
description: "Use Aionis Runtime as Codex execution memory: recall task context, inspect continuity, record handoffs, replay tool traces, and apply learned workflow/tool policy."
---

# Aionis Runtime Skill

Use this skill when a task would benefit from project memory, previous handoffs, learned workflow patterns, tool policy, continuity checks, or replay capture.

## Operating Model

Aionis is a runtime memory layer, not a replacement for Codex reasoning. Prefer the automatic hook context first. When more detail is needed, use the `aionis-runtime` MCP tools.

## Default Flow

1. Read the injected **Aionis Runtime Context** at the start of the turn.
2. Follow project-scoped continuity, planner packets, target files, validation boundaries, and policy hints when they match the current user request.
3. If the injected context is thin, call `aionis_context_assemble` with the user's task.
4. If resuming work, call `aionis_agent_resume_pack` or `aionis_handoff_recover`.
5. If making tool choices, call `aionis_tools_select` before selecting an unfamiliar path.
6. Before closing a meaningful task, store a handoff with `aionis_handoff_store` when the automatic Stop hook cannot capture enough detail.

## MCP Tools To Prefer

- `aionis_context_assemble`: full task-start context and planner packet.
- `aionis_agent_resume_pack`: resume continuity for the current repo.
- `aionis_agent_review_pack`: review/governance packet for risky work.
- `aionis_handoff_store`: explicit continuation state.
- `aionis_recall_text`: direct memory recall.
- `aionis_tools_feedback`: record tool selection quality.
- `aionis_store_execution_outcome`: store a full run and optionally compile a playbook.
- `aionis_runtime_call`: advanced escape hatch for any Runtime route.

## Guardrails

- Do not claim success from memory alone. Verify with the actual code, command output, tests, or UI behavior.
- If Aionis context conflicts with the newest user instruction, follow the newest instruction after checking the repo.
- If Aionis Runtime is unavailable, continue normally and state that Aionis memory was not applied if relevant.
- Do not write secrets or credentials into memory. Summarize sensitive context without raw values.

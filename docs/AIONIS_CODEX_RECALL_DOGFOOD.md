# Aionis Codex Recall Dogfood

Last updated: 2026-05-09

Goal: use Aionis inside Codex for 10 real repository tasks, then improve recall, compaction, and display quality based on observed value rather than imagined product claims.

## Success Criteria

1. Complete 10 real tasks in this repository with Aionis hooks enabled.
2. For each task, record which injected context directly helped the work.
3. For each task, record which injected context was noise, stale, duplicated, too verbose, or misleading.
4. Convert repeated garbage patterns into concrete recall, compression, or rendering fixes.
5. Verify every fix with targeted tests or command-level evidence.

## Evaluation Rubric

Helpful context:

- names the correct repo, release, task, file, command, or state
- prevents repeated discovery or rework
- changes the first action in a useful way
- exposes continuity that is hard to recover from chat alone

Garbage context:

- repeats generic tool preferences such as "prefer Bash" without a file, task, or risk
- promotes low-value candidate patterns above actual task facts
- injects stale release or branch state
- spends large budget on debug payloads that do not change the next action
- reports non-fatal Runtime errors without enough cause or recovery detail

## Task Ledger

| # | Task | Aionis context that helped | Garbage / weakness observed | Fix candidate | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Align public runtime release copy after `@ostinato/aionis-runtime@0.2.3` publish | The injected continuity and prior suggestion identified stale public copy split across `0.2.1`, `0.2.2`, and `0.2.3`; npm/latest and git state were also correctly recoverable. | The same turn also surfaced repeated provisional "prefer Bash" candidate patterns and medium-cost rehydration hints that did not help a release-copy task. The current turn exposed a non-fatal `context_assemble: This operation was aborted` error without enough cause. | Lower or suppress generic tool-only candidate patterns in Codex task-start display; make non-fatal context assembly errors actionable. | done |
| 2 | Tighten default Codex hook display for low-value candidate tool patterns | Task 1 showed the noisy pattern class clearly: repeated provisional `prefer Bash` entries with no target file, task family, or acceptance check. | Current display can spend visible budget on generic tool-only patterns before actionable task facts. | Suppressed generic provisional tool-only candidate patterns from default rendered context while keeping task/file/check-bearing context visible; added plugin formatter test coverage. | done |
| 3 | Make non-fatal hook failures actionable | The current turn exposed `context_assemble`, `project_agent_resume_pack`, and `project_agent_review_pack` aborts, giving a concrete failure mode to fix. | The old error line did not say whether this was timeout, AbortController, runtime inflight pressure, rate limit, or request failure. | Runtime requests now classify timeout/network/http/parse failures with code, category, route, duration, and timeout; hook rendering prints those fields in the non-fatal error list. | done |
| 4 | Reinstall local Codex plugin after source-only hook fixes | Task 2/3 showed a product boundary: source fixes do not affect the current Codex session until the bundled plugin is installed. | It is easy to think a hook fix is active because tests pass, while `~/.aionis/codex/plugin` still contains the previous npm package. | Reinstalled the locally built runtime Codex plugin, verified installed files contain display filtering and structured error diagnostics, and confirmed `codex status` stays green. | done |
| 5 | Pending | Pending | Pending | Pending | pending |
| 6 | Pending | Pending | Pending | Pending | pending |
| 7 | Pending | Pending | Pending | Pending | pending |
| 8 | Pending | Pending | Pending | Pending | pending |
| 9 | Pending | Pending | Pending | Pending | pending |
| 10 | Pending | Pending | Pending | Pending | pending |

## Current Findings

1. The Codex integration is useful for release continuity. It recovered the published `0.2.3` state, pushed branch state, and stale-public-copy follow-up without manual reconstruction.
2. The visible planner packet gives too much weight to generic provisional tool patterns. For user-facing Codex context, "prefer Bash" is mostly noise unless it is attached to a narrow task family, file, or acceptance check.
3. Context assembly failures need better operator value. Task 3 changed hook errors from flat strings into structured diagnostics with category, code, route, duration, and timeout metadata.

## Next Fix Targets

1. Keep task facts, release state, active branch state, target files, and explicit next actions above candidate patterns.
2. Add a compact dogfood summary command or report once at least three real tasks have observations.
3. Decide whether the hook diagnostics and display-filtering changes should ship as `@ostinato/aionis-runtime@0.2.4`.

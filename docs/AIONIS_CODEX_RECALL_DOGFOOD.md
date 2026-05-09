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
| 5 | Preserve useful task facts when full context assembly times out | The structured timeout line proved Task 3 works, and timing the Runtime endpoints showed `planning/context` can still recover useful workflow hints while full `context/assemble` exceeds the hook budget. | Because `context_assemble` timed out, the hook displayed diagnostics but lost the current dogfood progress and next action; `agent_resume_pack` did not recover the special dogfood continuity anchor. Live verification also showed long old assistant answers can masquerade as workflow titles. | Add a fast `planning/context` task-start call and render compact planner/tool/workflow facts ahead of full assembly JSON; suppress long non-actionable workflow titles from the first screen while keeping them in debug JSON. | done |
| 6 | Fix explicit private handoff recovery | Task 5 exposed that the dogfood handoff existed in `memory/find`, but direct `handoff/recover` by anchor returned 404. That made the failure concrete instead of theoretical. | In lite/auth-off mode, `handoff/recover` ignored request-level `consumer_agent_id` / `consumer_team_id`, so private handoff nodes written for `codex` were hidden by visibility filtering. Live 3101 also showed a product boundary: watchdog can still run the published runtime package until a release or explicit local runtime command updates it. | Extend `HandoffRecoverRequest` to accept consumer identity, make `recoverHandoff` fall back to request consumer fields when no principal exists, and add a lite route regression test plus temporary local HTTP verification. | done |
| 7 | Pending | Pending | Pending | Pending | pending |
| 8 | Pending | Pending | Pending | Pending | pending |
| 9 | Pending | Pending | Pending | Pending | pending |
| 10 | Pending | Pending | Pending | Pending | pending |

## Current Findings

1. The Codex integration is useful for release continuity. It recovered the published `0.2.3` state, pushed branch state, and stale-public-copy follow-up without manual reconstruction.
2. The visible planner packet gives too much weight to generic provisional tool patterns. For user-facing Codex context, "prefer Bash" is mostly noise unless it is attached to a narrow task family, file, or acceptance check.
3. Context assembly failures need better operator value. Task 3 changed hook errors from flat strings into structured diagnostics with category, code, route, duration, and timeout metadata.
4. Full context assembly is not reliable enough to be the only task-start surface. Task 5 adds a fast planning-context path so workflow continuity and next-action facts survive a heavy assembly timeout.
5. Private handoff recovery was broken in auth-off lite mode because recover ignored request consumer identity. Task 6 fixed the source path and verified it with a route-level regression plus temporary local HTTP server.
6. Live Codex runtime updates have a release boundary: `~/.aionis` can run the currently published npm runtime even when the local plugin has been rebuilt. Source-only Runtime fixes need either a release or explicit local runtime command wiring before live 3101 reflects them.

## Next Fix Targets

1. Add a compact dogfood summary command or report now that at least six real tasks have observations.
2. Decide whether the hook diagnostics, display filtering, fast planning-context fallback, and handoff recovery fix should ship as `@ostinato/aionis-runtime@0.2.4`.
3. Make local-runtime dogfooding less confusing by documenting or wiring an explicit workspace runtime command for Codex watchdog testing.

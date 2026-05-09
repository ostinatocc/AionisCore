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
| 7 | Publish Runtime source fixes as `@ostinato/aionis-runtime@0.2.4` | Aionis context correctly highlighted the release boundary: source fixes and local plugin rebuilds do not update the live watchdog runtime unless the npm package is published and the running process is refreshed. | The first post-source live check still used an older npx cache process, so source-level success could be mistaken for live Runtime success. | Bumped runtime package/docs to `0.2.4`, published npm latest, reinstalled Codex plugin from the published package, restarted the runtime process, verified the cache package is `0.2.4`, and confirmed live `handoff/recover` works for the dogfood anchor. | done |
| 8 | Promote latest dogfood progress in Codex task-start display | The live hook after `0.2.4` correctly recovered that candidate workflows existed and included the real `7 of 10` dogfood state. | The same display mixed stale `2 of 10` and `4 of 10` workflow entries with the latest `7 of 10`, while `Fast Task Facts` still omitted the newest progress. That made the first screen confusing even though the Runtime had the right data somewhere deeper. | Detect the highest `Aionis Codex recall dogfood loop: N of M` progress across planning/full assembly packs, promote it into `Fast Task Facts`, and suppress older dogfood workflow entries from rendered JSON while preserving the latest one. | done |
| 9 | Recover latest repo handoff without fake cwd anchor | Live verification after Task 8 proved the `7 of 10` handoff existed in `memory/find`, but the hook still surfaced stale `4 of 10`. That narrowed the problem to agent resume continuity, not raw storage. | Codex hook and MCP defaults sent `anchor=config.cwd`, so `handoff/recover` looked for a handoff whose anchor was literally the repo path. Real task handoffs use task/session anchors, so repo-level latest handoff recovery was blocked. Removing the fake anchor also exposed that repo_root-only recover was rejected by schema and missing implicit handoffs could fail an otherwise useful resume pack. | Let handoff recovery accept `repo_root` / `file_path` / `symbol` locators, omit undefined anchor from slot filters, make implicit repo continuity optional on 404, and stop defaulting Codex hook/MCP agent pack requests to `anchor=config.cwd`. | done |
| 10 | Pending | Pending | Pending | Pending | pending |

## Current Findings

1. The Codex integration is useful for release continuity. It recovered the published `0.2.3` state, pushed branch state, and stale-public-copy follow-up without manual reconstruction.
2. The visible planner packet gives too much weight to generic provisional tool patterns. For user-facing Codex context, "prefer Bash" is mostly noise unless it is attached to a narrow task family, file, or acceptance check.
3. Context assembly failures need better operator value. Task 3 changed hook errors from flat strings into structured diagnostics with category, code, route, duration, and timeout metadata.
4. Full context assembly is not reliable enough to be the only task-start surface. Task 5 adds a fast planning-context path so workflow continuity and next-action facts survive a heavy assembly timeout.
5. Private handoff recovery was broken in auth-off lite mode because recover ignored request consumer identity. Task 6 fixed the source path and verified it with a route-level regression plus temporary local HTTP server.
6. Live Codex runtime updates have a release boundary: `~/.aionis` can run the currently published npm runtime even when the local plugin has been rebuilt. Source-only Runtime fixes need either a release or explicit local runtime command wiring before live 3101 reflects them.
7. Publishing `0.2.4` closed that release boundary for the current dogfood loop: npm latest, installed Codex plugin, watchdog runtime cache, and live handoff recovery now all reflect the Runtime source fixes.
8. Task-start display still needs recency-aware compression, not just more recall. Task 8 keeps the latest dogfood progress visible as a fast fact and removes older dogfood progress candidates from the rendered planner packet.
9. Agent resume continuity was artificially narrowed by a fake cwd anchor. Task 9 makes repo-level handoff recovery possible without breaking repos that have no handoff yet.

## Next Fix Targets

1. Add a compact dogfood summary command or report now that at least nine real tasks have observations.
2. Release the repo-level handoff recovery fix and then reinstall/restart Codex runtime so live hooks use the source changes together.
3. Use the next live Codex prompt to check whether `Fast Task Facts` now surfaces the latest 9/10 state through the resume pack, not only through raw `memory/find`.

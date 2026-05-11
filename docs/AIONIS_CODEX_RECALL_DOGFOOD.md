# Aionis Codex Recall Dogfood

Last updated: 2026-05-11

Goal: use Aionis inside Codex for 10 real repository tasks, then improve recall, compaction, and display quality based on observed value rather than imagined product claims.

Compact report: [AIONIS_CODEX_RECALL_DOGFOOD_REPORT.md](AIONIS_CODEX_RECALL_DOGFOOD_REPORT.md)

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

## Post-0.2.27 Product Dogfood Plan

The next loop tests whether Aionis is useful as a daily Codex execution-memory product, not whether the architecture has enough pieces.

Each task must record:

- the task Codex actually performed
- the context Aionis surfaced at task start
- which surfaced facts changed the first action or validation boundary
- which facts were stale, duplicated, missing, or too verbose
- the concrete product cut made from the observation

Planned task queue:

| # | Task | Product question | Status |
| --- | --- | --- | --- |
| 1 | Verify the published `@ostinato/aionis-runtime@0.2.27` package path with fresh npm cache, Codex status, and Codex audit. | Does the user-installed package expose the same usable state as local source? | done |
| 2 | Start a second-repository Codex session and inspect the first Aionis context. | Does context generalize outside AionisRuntime, or is it self-referential? | done |
| 3 | Implement a small feature in the second repository with Aionis enabled. | Does Aionis change the first action or just add noise? | done |
| 4 | Interrupt and resume a real bug fix across turns. | Does handoff recovery preserve the actual next step? | done |
| 5 | Re-run npm release verification after a source change. | Does release outcome stay visible beside current task work? | done |
| 6 | Ask status/planning-only questions between coding tasks. | Do those turns avoid polluting `latest_task_handoff`? | next |
| 7 | Force slow Runtime find behavior while snapshots exist. | Does task start remain fast and useful under Runtime latency? | planned |
| 8 | Install from npm in a fresh consumer workspace. | Is the first-run path understandable without repo internals? | planned |
| 9 | Restart Runtime/Codex integration and continue. | Does local state survive process boundaries? | planned |
| 10 | Write a compact product verdict from the evidence. | Would a real developer pay for this, and for which workflow? | planned |

### Post-0.2.27 Ledger

| # | Task | Aionis context that helped | Garbage / weakness observed | Fix candidate | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Published-package smoke for `@ostinato/aionis-runtime@0.2.27`: fresh `npm exec --version`, `codex status --no-watchdog --json`, and `codex audit --limit 12 --json`. | Fresh npm package returned `0.2.27`; Codex status passed all checks; audit found clean current context with separate visible task handoff and visible release outcome. | The actual task-start injected context showed `used_release_outcome_snapshot=true` but did not render a separate `latest_release_outcome=0.2.27...` line. The Runtime had the structured release snapshot; the formatter rejected it because the text said "published and verified" instead of matching a narrower completion phrase. A local reinstall also showed a transient doctor `runtime health` failure while immediate `curl /health` and `codex status` passed, so install health wait may still be flaky. | Trust structured `release_outcome=true` snapshot records when they include a version and are not candidate/unpublished/status-lead text; keep existing false-positive filters. Track install doctor health timing as a follow-up if it repeats. | fixed in 0.2.28 candidate |
| 2 | Second-repo first context using `/Users/lucio/Desktop/cognitve/cognitive-demo` with the Codex hook and prompt `Inspect this Cognitive demo repo...`. | The project scope correctly changed to `codex:cognitive-demo:7be3716f`, and no AionisRuntime task or release handoff leaked into the Cognitive context. The hook correctly said there was no learned workflow yet and recommended inspecting with `functions.exec_command`. | Because the repo had no useful history, the first screen still expanded large low-value Planner/Operator/Layered/Cost/Recall JSON from the current prompt/session itself. That made a clean first-run experience feel noisy even though there was no cross-project contamination. | Suppress prompt/session echo records from supporting knowledge and layered context, hide non-actionable operator projection, skip empty JSON sections, and only show cost/recall diagnostics when expanded context has real display content. | fixed in 0.2.29 candidate |
| 3 | Real Cognitive demo improvement: aligned `AGENTS.md` and `cognitive/modules/ui-spec-generator/MODULE.md` with the actual v2.2 module layout and response envelope. | Aionis preserved the dogfood objective, the second-repo target, and the validation expectation from prior turns, so the first action stayed bounded: inspect actual Cognitive files and run module validation instead of inventing a product claim. It also kept the 0.2.29 first-run-context fix visible, which prevented chasing already-closed cross-project contamination. | Aionis did not provide domain facts about Cognitive's stale `AGENTS.md`; that came from code inspection. The latest task handoff was also at risk of becoming a conceptual "Aionis has value" answer rather than an execution state, which could pollute future task-start context if repeated. | Keep Aionis positioned as continuity and execution memory, not as a substitute for reading the repo. In Task 6, classify status/planning/product-opinion replies separately so they cannot displace concrete `latest_task_handoff` facts. | observed |
| 4 | Interrupted/resumed bug fix: stored and recovered a mid-task handoff for the recurring `session_prompt_event` task-start timeout, then implemented the fix. | The recovered handoff returned the exact next action, target files, and acceptance checks, so the resumed work did not depend on chat history. The current Aionis context also surfaced the live non-fatal `session_prompt_event` timeout that made the bug concrete. | The bug itself was real product friction: UserPromptSubmit awaited lifecycle telemetry writes with the full runtime timeout and rendered their failures as task-start errors. That made Aionis feel noisy even when useful context was present. | Run UserPromptSubmit lifecycle telemetry (`session_create`, `session_prompt_event`, `replay_run_start`) concurrently with a short `AIONIS_CODEX_EVENT_TIMEOUT_MS` budget and keep those failures out of rendered non-fatal errors; keep task-start recall errors visible. | fixed in source |
| 5 | Published and verified `@ostinato/aionis-runtime@0.2.30` after the Task 4 hook fix. | Aionis surfaced the pre-publish `0.2.30` candidate handoff, the prior `0.2.29` release outcome, and the exact next boundary: verify npm latest, fresh npm exec, reinstall Codex plugin from the published package, and check live hook files. After `codex release`, a real UserPromptSubmit hook render showed both `latest_task_handoff=0.2.30 candidate...` and `latest_release_outcome=0.2.30 published and verified...`. | The task handoff remained the pre-publish/EOTP candidate until this turn closes, but it no longer hid the true release outcome. That is acceptable for Task 5, but Task 6 should still test whether planning/status-only turns create low-value task handoffs. | Keep release outcomes as their own fast fact with evidence extraction. Continue with Task 6 to harden non-execution/status turns before they become context pollution. | fixed in 0.2.30 |

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
| 10 | Push `0.2.9` source and verify clean npm install path | The injected fast facts recovered the `3b402bd` Codex MCP parity commit, test evidence, and pack dry-run result, which made the correct first action clear: push the four local commits, then validate the published runtime package from a clean HOME. | The latest fast fact still pointed at the pre-publish handoff. It did not carry the successful `npm publish` result from the previous turn, so the release state had to be revalidated with `npm view`. This showed the Stop hook suppression was too aggressive for externally visible release/publish completions. | Added a compact release outcome path for successful npm publish / git push / install verification so status-shaped but externally important completions become recallable without reopening the old noisy handoff problem. Verified with hook tests, runtime package tests, pack dry-run, and local Codex doctor. | done |

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
10. Release completion is a special status class. Task 10 showed that suppressing status-only assistant replies prevents noise, but it can also drop externally visible outcomes such as a completed npm publish. The Codex Stop hook now stores those as compact `release_outcome` handoffs keyed by version.
11. The first live prompt after publishing `0.2.10` recovered the release completion, but fast facts compressed away `npm latest`, clean `npx`, and clean install evidence. Release outcome display needs evidence-aware compression, not just outcome storage.
12. The next live prompt showed a second display issue: a newer source-change handoff can cover the latest release outcome. Fast facts now need both `latest_task_handoff` and a separate `latest_release_outcome` so current task continuity does not hide published package state.
13. The follow-up live prompt exposed a write-side false positive: "0.2.11 candidate; npm latest still 0.2.10; no accidental publish" was incorrectly stored as a `release_outcome` for `0.2.10`. Release outcome detection now rejects candidate/unpublished/still-latest summaries, and display filters any already-written false positives.
14. Second-repository dogfood is now useful but bounded: Aionis helped with continuity, target selection, and validation boundaries; it did not discover Cognitive-specific stale docs without normal code inspection.
15. Planning/status/product-opinion turns remain a pollution risk. If they become `latest_task_handoff`, they can crowd out concrete execution state even when the display is otherwise compact.
16. Task 4 proves resume value in the narrow sense: an explicit Aionis handoff can carry precise next action, target files, and acceptance checks. It also showed task-start lifecycle telemetry must be treated as best-effort, not as user-visible recall failure.
17. Task 5 confirms release outcomes survive beside task handoffs. After `0.2.30` publish, a real UserPromptSubmit render showed the pre-publish task handoff and the new `0.2.30` release outcome as separate fast facts.

## Next Fix Targets

1. Run Task 6 with status/planning-only prompts and confirm they do not overwrite the concrete execution handoff.
2. Verify the next live prompt no longer shows `session_prompt_event` timeout noise after the `0.2.30` installed hook.
3. Continue second-repo work after Task 6 so recall quality is tested outside release-only workflows.

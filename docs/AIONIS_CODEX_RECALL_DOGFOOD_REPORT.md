# Aionis Codex Recall Dogfood Report

Last updated: 2026-05-16

Document status: compact internal dogfood report

This report summarizes the first 10 real Codex tasks run with Aionis Runtime hooks enabled in the AionisRuntime repository. It is a product-learning report, not a benchmark claim.

## Result

Aionis is useful in Codex when it carries concrete execution continuity:

1. current repo, branch, release, package, and install state
2. exact target files and next actions after an interrupted task
3. validation commands and test evidence from the previous turn
4. release boundaries where source changes, installed plugin code, watchdog runtime code, and npm latest can diverge

The first sellable product wedge is not "AI memory for everyone." It is a local-first execution-memory layer for developers who use Codex or Claude Code on long-running repositories and lose time to cross-turn state, release/install drift, restart churn, and repeated validation setup.

A real developer is most likely to pay when Aionis gives them this without manual ceremony:

1. the next turn starts with the right repo, release, install, and validation facts
2. interrupted tasks resume from a precise next action instead of a chat scrollback
3. Runtime/plugin/watchdog/package state is inspectable with one status/audit command
4. stale or speculative memory is hidden unless it changes the next action

Aionis is not yet ready to sell as a broad consumer memory product. Empty first-run projects still have little value beyond automatic wiring, and automatic tool-feedback learning has only just been re-enabled behind a short timeout, so the next risk is learned-pattern quality rather than route availability.

Aionis is harmful or distracting when it surfaces generic or stale context:

1. generic tool preferences without a task, file, or acceptance check
2. old dogfood progress entries mixed with the newest task state
3. flat non-fatal errors without route, timeout, or recovery detail
4. status-only suppression that drops important external outcomes such as an npm publish
5. compact summaries that omit the actual release/install evidence behind a "done" claim
6. newer task handoffs that hide the latest release outcome from the first screen
7. false release outcomes from candidate/unpublished summaries that mention npm latest
8. hook-side telemetry that can block or crash the local Runtime during normal tool use

## What Helped

| Signal class | Observed value | Product interpretation |
| --- | --- | --- |
| Release continuity | Recovered published package versions, branch state, and stale release-copy follow-ups. | Strong fit. Release tasks have hidden external state that chat alone loses easily. |
| Runtime/plugin boundary | Exposed that source fixes do not update the live watchdog runtime until package install or release. | Strong fit. This prevented false confidence during local-vs-published verification. |
| Handoff recovery | Recovered repo-level continuation after fake cwd anchors were removed. | Strong fit. This is the core continuity use case. |
| Fast planner fallback | Preserved useful task facts when full context assembly timed out. | Strong fit. Runtime context must degrade to a usable first action. |
| Display compaction | Promoted latest dogfood progress and suppressed stale workflow entries. | Necessary. Recall quality depends as much on display selection as storage. |
| Release outcome capture | `0.2.10` publish/install/doctor completion became recallable as a compact release outcome. | Strong fit, but display evidence still needed one more compression pass. |
| Process-boundary continuity | After a Runtime/Codex restart, local snapshots still surfaced the current task handoff and `0.2.31` release outcome. | Strong fit. A daily memory layer must survive restarts, stale pids, and installed-vs-source drift. |
| Published install verification | `0.2.32` passed npm latest, fresh npm exec, fresh install, isolated Codex install/status, isolated Runtime health/status, and live hook release rendering. | Strong fit. The paid wedge must start from a reliable public package path, not source checkout assumptions. |

## What Was Garbage

| Garbage class | Why it hurt | Fix already shipped |
| --- | --- | --- |
| Generic tool-only patterns | Repeated "prefer Bash" style hints consumed visible budget without changing action. | Suppressed generic provisional tool-only patterns. |
| Non-actionable Runtime errors | Aborted context assembly looked like noise without cause. | Added structured error category, code, route, duration, and timeout metadata. |
| Full-assembly dependency | Heavy context assembly timeout hid dogfood progress. | Added fast planning-context path ahead of full assembly JSON. |
| Private handoff visibility gap | Lite/auth-off handoff recovery ignored request consumer identity. | Added consumer identity fallback and route regression coverage. |
| Stale dogfood progress | Old `2/10`, `4/10`, and `7/10` entries competed with latest progress. | Promoted highest progress and suppressed stale dogfood workflow entries. |
| Fake cwd anchor | Repo-level resume asked for an anchor equal to the cwd, hiding real task handoffs. | Stopped defaulting agent pack requests to `anchor=config.cwd`. |
| Status suppression overreach | Completed npm publish looked like a status reply and was not recorded. | Added compact `release_outcome` handoff storage keyed by version. |
| Stale runtime process records | Failed launchers could be written to `runtime-process.json` before health passed. | Runtime pid records are now written only after health succeeds. |
| Env-only runtime command | Hook processes could miss the LaunchAgent runtime command and fall back to `npx`. | Codex install now persists `state/runtime-command.json`, and runtime startup reads it. |
| Heavy automatic tool feedback | `/v1/memory/tools/feedback` previously hung Runtime under hook-shaped payloads and could create generic tool-selection memory. | Explicit route hot paths are repaired, automatic `PostToolUse` feedback is re-enabled in source behind `AIONIS_CODEX_TOOLS_FEEDBACK_TIMEOUT_MS`, and generic automatic outcomes do not write recallable pattern anchors without concrete task/file/workflow/error or rule-backed evidence. |

## Current Live Check

The first prompt after publishing `@ostinato/aionis-runtime@0.2.10` did recover the release completion:

`latest_task_handoff=0.2.10 发布闭环完成了。; evidence: commits=12ca17b4; codex_status=pass`

That is directionally correct, but the visible fast fact still compressed away the most useful release evidence:

1. npm latest is `0.2.10`
2. clean `npx @ostinato/aionis-runtime@0.2.10 --version` returned `0.2.10`
3. clean HOME Codex install returned `ok: true`
4. live Codex doctor passed

This means release outcome capture works, but release outcome display still needs evidence-aware compression. The next live prompt exposed the remaining shape: after a source-change handoff, the first screen still needs a separate `latest_release_outcome` line so published package state remains visible beside the newest task handoff.

A follow-up live query exposed one more write-side bug: summaries saying "0.2.11 candidate; npm latest still 0.2.10; no accidental publish" had enough npm/version tokens to be misclassified as a `release_outcome`. The release classifier now treats candidate, unpublished, still-latest, and no-accidental-publish language as negative evidence, and display filtering ignores already-written false positives.

The current `0.2.32` candidate dogfood shifted from recall display to operational trust. Restarting the local Runtime/Codex integration proved the snapshot path works across process boundaries, but also exposed three practical failure modes: stale pids from failed launchers, hook processes losing the fixed local Runtime command, and automatic tool-feedback telemetry hanging Runtime. The first two were fixed in source; the explicit tools-feedback route is repaired after `0.2.34`, and automatic hook telemetry is now re-enabled in source with a separate short timeout budget. A live direct route soak returned `200` in 185ms, and a source `PostToolUse` hook returned normal outcome context in about 105ms. The source feedback path now also suppresses generic automatic pattern anchors to avoid a new "prefer exec/bash" memory pollution class.

After publishing `0.2.32`, a live UserPromptSubmit hook rendered `latest_release_outcome=0.2.32 published and verified...`, and `codex audit` reran cleanly with `context_quality=pass`. The same audit exposed a quality problem: stored latest task handoff still pointed to Task 8 while the local task-start snapshot had the Task 9 closeout. The `0.2.33` candidate fixes that by merging local project snapshots into `codex audit` latest-handoff selection ahead of stale Runtime handoffs. Live audit now reports Task 9 and the `0.2.32` release as local snapshots with no warnings.

## Product Conclusion

Aionis Runtime is not a general "make the AI smarter" feature yet. In Codex, its current value is narrower and more concrete:

1. remember external execution state that is easy to lose across turns
2. make the next action start from verified repo/runtime/package state
3. prevent repeated rediscovery of release, install, and watchdog boundaries
4. expose when recalled context is advisory instead of authoritative

That is enough to justify a focused developer product, not enough to justify a broad memory platform claim. The first package should be "Aionis for coding agents": local Runtime, Codex/Claude Code integration, restart-safe context, release/handoff memory, and a compact audit/status surface. Do not sell design memory, general personal memory, or cloud memory until this coding wedge is boringly reliable.

The sharpest product promise today:

> Aionis keeps your coding agent oriented across turns, restarts, releases, and repo work, using local memory you can inspect.

The current non-negotiable gaps before charging:

1. make install/enable/recovery feel automatic, including clear Runtime online state
2. keep first-screen context consistently short and current
3. inspect automatic tool-feedback anchors for usefulness versus generic noise after live hook soak
4. prove the same value on a second non-AionisRuntime repository

## Next Cuts

1. Soak the re-enabled automatic `PostToolUse` feedback path and inspect whether the learned pattern anchors improve future tool selection.
2. Run the same Codex recall loop on a second repository to check whether the improvements generalize beyond AionisRuntime.
3. Keep suppressing generic memory. Aionis should earn visible space only when it changes the first action or validation boundary.

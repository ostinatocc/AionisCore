# Aionis Codex Recall Dogfood Report

Last updated: 2026-05-10

Document status: compact internal dogfood report

This report summarizes the first 10 real Codex tasks run with Aionis Runtime hooks enabled in the AionisRuntime repository. It is a product-learning report, not a benchmark claim.

## Result

Aionis is useful in Codex when it carries concrete execution continuity:

1. current repo, branch, release, package, and install state
2. exact target files and next actions after an interrupted task
3. validation commands and test evidence from the previous turn
4. release boundaries where source changes, installed plugin code, watchdog runtime code, and npm latest can diverge

Aionis is harmful or distracting when it surfaces generic or stale context:

1. generic tool preferences without a task, file, or acceptance check
2. old dogfood progress entries mixed with the newest task state
3. flat non-fatal errors without route, timeout, or recovery detail
4. status-only suppression that drops important external outcomes such as an npm publish
5. compact summaries that omit the actual release/install evidence behind a "done" claim
6. newer task handoffs that hide the latest release outcome from the first screen
7. false release outcomes from candidate/unpublished summaries that mention npm latest

## What Helped

| Signal class | Observed value | Product interpretation |
| --- | --- | --- |
| Release continuity | Recovered published package versions, branch state, and stale release-copy follow-ups. | Strong fit. Release tasks have hidden external state that chat alone loses easily. |
| Runtime/plugin boundary | Exposed that source fixes do not update the live watchdog runtime until package install or release. | Strong fit. This prevented false confidence during local-vs-published verification. |
| Handoff recovery | Recovered repo-level continuation after fake cwd anchors were removed. | Strong fit. This is the core continuity use case. |
| Fast planner fallback | Preserved useful task facts when full context assembly timed out. | Strong fit. Runtime context must degrade to a usable first action. |
| Display compaction | Promoted latest dogfood progress and suppressed stale workflow entries. | Necessary. Recall quality depends as much on display selection as storage. |
| Release outcome capture | `0.2.10` publish/install/doctor completion became recallable as a compact release outcome. | Strong fit, but display evidence still needed one more compression pass. |

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

## Product Conclusion

Aionis Runtime is not a general "make the AI smarter" feature yet. In Codex, its current value is narrower and more concrete:

1. remember external execution state that is easy to lose across turns
2. make the next action start from verified repo/runtime/package state
3. prevent repeated rediscovery of release, install, and watchdog boundaries
4. expose when recalled context is advisory instead of authoritative

That is enough to justify continuing the Codex integration for real development workflows. It is not enough to claim broad consumer value until the first screen consistently shows the right facts with low noise.

## Next Cuts

1. Keep release outcome evidence visible in `Fast Task Facts`: `latest_release_outcome`, `npm_latest`, `clean_npx`, `clean_install`, and `codex_status`.
2. Re-run the next live prompt and verify the first screen includes both current task continuity and the true latest release outcome, while ignoring candidate/unpublished false positives.
3. Run the same Codex recall loop on a second repository to check whether the improvements generalize beyond AionisRuntime.
4. Keep suppressing generic memory. Aionis should earn visible space only when it changes the first action or validation boundary.

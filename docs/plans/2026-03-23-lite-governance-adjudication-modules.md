Last reviewed: 2026-04-16

Document status: historical implementation plan

1. Add shared builtin adjudication modules for `promote_memory` and `form_pattern` in Aionis Core.
2. Move review-generation logic out of the builtin client.
3. Keep builtin client as a thin assembly layer over those modules.
4. Add direct contract tests for both modules.
5. Re-run targeted governance tests plus `tsc` and `test:lite`.

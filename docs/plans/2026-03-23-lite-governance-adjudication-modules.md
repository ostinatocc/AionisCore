1. Add shared builtin adjudication modules for `promote_memory` and `form_pattern`.
2. Move review-generation logic out of the builtin client.
3. Keep builtin client as a thin wrapper over those modules.
4. Add direct contract tests for both modules.
5. Re-run targeted governance tests plus `tsc` and `test:lite`.

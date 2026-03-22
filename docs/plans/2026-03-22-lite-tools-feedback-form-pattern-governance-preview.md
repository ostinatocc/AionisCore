# Lite Tools Feedback Form-Pattern Governance Preview Plan

Date: 2026-03-22

## Steps

1. Add `ToolsFeedbackResponseSchema` and bounded `form_pattern` governance-preview schemas.
2. Build a Lite-only governance preview helper inside `tools-feedback`.
3. Emit preview+decision-trace only when pattern-anchor formation has at least two source node ids.
4. Extend tools-pattern-anchor tests to cover the new runtime-visible preview.
5. Update governance status and run targeted plus full Lite validation.

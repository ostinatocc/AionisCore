Last reviewed: 2026-04-16

Document status: historical implementation plan

# Lite Tools Static Form-Pattern Provider Spec

## Goal

Extend the internal governance provider fallback from replay/workflow into the tools feedback live path, without widening public surface area.

## Scope

- Add a static internal `form_pattern` governance review provider.
- Gate it behind a Lite env flag.
- Wire it only into `/v1/memory/tools/feedback`.
- Keep explicit `governance_review.form_pattern.review_result` higher priority than provider output.
- Preserve existing pattern-anchor semantics except when the provider yields an admissible high-confidence review that already satisfies the current narrow apply gate.

## Non-Goals

- No public route contract expansion.
- No real model-backed provider yet.
- No broader pattern promotion rule changes.

## Expected Result

- Tools feedback can run with no explicit governance review and still produce a bounded internal `form_pattern` review result when the env gate is enabled.
- The generated review continues through existing admissibility / policy-effect / runtime-apply logic.
- Existing replay/workflow provider behavior stays unchanged.

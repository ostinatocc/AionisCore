## Goal

Extract operation-specific builtin governance review logic into shared adjudication modules, so builtin clients become thin wrappers and later internal model clients can reuse the same bounded review logic.

## Scope

- Add shared adjudication modules for:
  - `promote_memory`
  - `form_pattern`
- Move builtin review decision logic out of the builtin client file.
- Keep builtin client as a thin assembly layer.
- Add direct contract tests for the new adjudication modules.

## Non-Goals

- No change to public routes.
- No change to provider precedence.
- No change to admissibility or policy-effect logic.

## Acceptance

- Builtin client no longer contains operation-specific gate/review branching.
- Shared adjudication modules are directly tested.
- Existing governance/provider/runtime tests remain green.

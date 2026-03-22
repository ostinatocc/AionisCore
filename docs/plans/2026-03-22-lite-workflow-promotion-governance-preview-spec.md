# Lite Workflow Promotion Governance Preview Spec

## Goal

Add the third governed call site to Lite runtime/core by exposing a bounded governance preview on
workflow auto-promotion.

## Scope

This slice only adds preview metadata to workflow auto-promotion:

- bounded `promote_memory` review packet
- workflow-promotion policy-effect preview
- decision trace

It does not:

- accept review results
- evaluate admissibility from external review input
- change workflow auto-promotion semantics

## Call site

`src/memory/workflow-write-projection.ts`

When the generic producer reaches the stable workflow promotion branch, the generated stable
workflow node will carry governance preview metadata inside
`slots.workflow_write_projection.governance_preview`.

## Preview shape

- operation: `promote_memory`
- requested target: `workflow` / `L2`
- candidate ids: existing candidate workflow nodes plus the new projected candidate node
- no review result supplied
- policy effect remains preview-only and non-applying

## Acceptance

- stable workflow auto-promotion emits a bounded governance preview
- current workflow promotion behavior stays unchanged
- planner/introspection behavior stays unchanged
- `test:lite` stays green

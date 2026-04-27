# Aionis Real A/B Live Evidence Assembler Plan

Document status: Approved working plan
Date: 2026-04-27

## Goal

Make the first real four-arm dogfood evidence run operationally collectable. Operators should not hand-write a large paired capture JSON file after running baseline, Aionis assisted, negative control, and positive control arms.

## Contract

The live evidence assembler accepts one manifest:

- manifest metadata and fairness flags
- selected dogfood probe ids
- four arm descriptors
- per-arm dogfood external-probe run JSON paths
- per-arm agent event JSON paths

The assembler loads those artifacts, validates that every arm has probe evidence and action/tool events, then emits the existing `aionis_real_ab_dogfood_paired_capture_v1` object.

## Guardrail

This does not fabricate evidence. Missing arm files, missing probe events, or missing agent action/tool events keep the run invalid.

## Output Chain

The output remains compatible with the existing pipeline:

1. `aionis_real_ab_live_evidence_manifest_v1`
2. `aionis_real_ab_dogfood_paired_capture_v1`
3. `aionis_real_ab_trace_capture_v1`
4. `aionis_real_ab_validation_report_v1`

## Non-Goals

This phase does not run model agents automatically.

This phase does not claim product value by itself. It creates the collection path required for real paired evidence.

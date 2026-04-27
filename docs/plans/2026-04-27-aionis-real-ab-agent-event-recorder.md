# Aionis Real A/B Agent Event Recorder Plan

Document status: Approved working plan
Date: 2026-04-27

## Goal

Close the operational gap between live dogfood probe artifacts and real four-arm A/B evidence by making agent action/tool events recordable without hand-editing JSON.

## Contract

The recorder appends one event at a time into an existing `agent-events.json` file.

It can resolve the target file either directly or through:

- `manifest.json`
- arm name
- dogfood probe id

The recorder supports all trace event kinds used by the real A/B trace contract, but it enforces enough payload to avoid empty or misleading events.

## Guardrail

This does not fabricate evidence. Operators must record real actions, tool calls, claims, retries, or interventions produced during the arm run.

The recorder only writes agent events. It does not create `dogfood-run.json`, does not mark arms successful, and does not bypass the live evidence assembler gates.

## Output Chain

1. Initialize bundle with `ab:evidence:init`
2. Run each arm and collect real `dogfood-run.json`
3. Record real agent events with `ab:evidence:event`
4. Assemble and validate with `ab:evidence:live --fail-on-invalid`

## Non-Goals

This phase does not automate model execution.

This phase does not infer agent events from dogfood verifier output. Verifier evidence and agent behavior remain separate evidence channels.

# Aionis Real A/B Evidence Status Plan

Document status: Approved working plan
Date: 2026-04-27

## Goal

Make live A/B evidence readiness inspectable before running the full assembler.

The full assembler intentionally fails hard when evidence is incomplete. Operators also need a concise status matrix that shows which arm and probe still lacks dogfood proof or agent action events.

## Contract

The status command reads a live evidence manifest and reports:

- dogfood run file presence per arm
- dogfood probe coverage per selected probe id
- agent event file presence per arm
- agent action/tool event counts per arm/probe
- missing readiness reasons per arm/probe
- overall readiness for `ab:evidence:live`

## Guardrail

The status command is read-only. It does not create dogfood runs, does not create agent events, and does not downgrade assembler gates.

Incomplete status is not failure analysis of Aionis capability. It is evidence collection state.

## Output Chain

1. Initialize with `ab:evidence:init`
2. Export per-arm packets with `ab:evidence:arm`
3. Run arms and record real events with `ab:evidence:event`
4. Inspect readiness with `ab:evidence:status`
5. Run `ab:evidence:live --fail-on-invalid` only when status is ready

## Non-Goals

This phase does not automate model execution.

This phase does not infer missing events from verifier output.

# Aionis Real A/B Arm Run Packet Plan

Document status: Approved working plan
Date: 2026-04-27

## Goal

Make each real A/B arm executable without relying on implicit operator memory or hand-written run instructions.

## Contract

An arm run packet is derived from a live evidence manifest and one selected arm.

It contains:

- arm identity and memory/authority mode
- selected probe ids and dogfood slice mapping
- exact dogfood verifier output paths
- exact `agent-events.json` path
- dogfood command argv and shell command
- recorder command examples for each probe id
- evidence guardrails that separate agent behavior from verifier behavior

## Guardrail

The arm packet does not execute an agent and does not fabricate events.

It explicitly forbids copying evidence across arms and forbids recording verifier commands as agent events unless the agent actually invoked them.

## Output Chain

1. `ab:evidence:init` initializes the bundle.
2. `ab:evidence:arm` exports per-arm run packets and runbooks.
3. The operator runs the arm under the declared condition.
4. `ab:evidence:event` records observed agent behavior.
5. `ab:evidence:live --fail-on-invalid` validates the complete evidence chain.

## Non-Goals

This phase does not automate model execution.

This phase does not claim Aionis value. It makes real arm execution auditable and repeatable.

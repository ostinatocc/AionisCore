# Aionis Real A/B Trace Capture Plan

Document status: Approved working plan
Date: 2026-04-27

## Goal

Close the gap between the A/B harness and real dogfood runs by adding a concrete trace capture contract. The harness must no longer rely on hand-written treatment metrics for pilot or product evidence.

## First Principles

Aionis product value can only be claimed from auditable execution evidence:

- each arm must have a real run trace
- each run trace must include verifier evidence
- service/external tasks must include external probe evidence
- after-exit tasks must include both after-exit and fresh-shell verifier evidence
- direct metrics are allowed for harness calibration, but not for pilot/product evidence

## Scope

This phase adds:

- `aionis_real_ab_trace_capture_v1` as the raw capture input contract
- a compiler from capture input to `aionis_agent_run_trace_v1` validation suites
- strict pilot/product evidence gates inside the A/B harness
- a CLI to compile captured traces and run the validation gate
- fixture and CI coverage for missing verifier, direct metrics, and missing fresh-shell evidence

## Non-Goals

This phase does not automate every agent host integration.

This phase does not claim Aionis wins.

This phase makes the evidence path real enough that future dogfood runs can prove or falsify Aionis value without adapter prompt surgery.

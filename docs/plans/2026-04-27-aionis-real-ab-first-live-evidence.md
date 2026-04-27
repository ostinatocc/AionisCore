# Aionis Real A/B First Live Evidence Bundle Plan

Document status: Approved working plan
Date: 2026-04-27

## Goal

Make the first real four-arm A/B evidence run operationally startable without hand-writing the manifest or accidentally fabricating result artifacts.

## Contract

The initializer creates:

- `manifest.json` with the supported `aionis_real_ab_live_evidence_manifest_v1` contract
- one directory per required arm
- `agent-events.json` templates keyed by the selected dogfood probe ids
- `dogfood-run.REQUIRED.md` instructions per arm
- a top-level README that states the bundle is invalid until real arm artifacts are collected

The initializer intentionally does not create `dogfood-run.json`. That file must come from a real Runtime dogfood external-probe run.

## Guardrail

The bundle must stay invalid until every arm has real dogfood probe evidence and captured agent action/tool events.

The CLI refuses to overwrite existing scaffold files by default. `--force` is explicit because it can replace collected templates.

## Output Chain

The initialized bundle feeds the already merged live evidence path:

1. collect real per-arm `dogfood-run.json`
2. fill per-arm `agent-events.json`
3. run `ab:evidence:live`
4. produce the paired dogfood capture, trace capture, and validation report

## Non-Goals

This phase does not run model agents automatically.

This phase does not claim Aionis product value. It only makes the first real paired evidence run reproducible and auditable.

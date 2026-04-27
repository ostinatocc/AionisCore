# Aionis Real A/B Dogfood Trace Capture Plan

Document status: Approved working plan
Date: 2026-04-27

## Goal

Connect Runtime dogfood external-probe evidence to the real A/B trace capture path without pretending that one Runtime dogfood run is a complete A/B result.

## First Principles

A real A/B dogfood evidence packet must include four separate arms:

- baseline with no Aionis memory
- Aionis assisted with automatic Runtime memory
- negative control with irrelevant or low-trust memory
- positive control with oracle handoff

Each arm must provide:

- a Runtime dogfood external-probe run
- captured agent action/tool events for each selected dogfood probe
- verifier evidence from the dogfood external probe

The compiler can then append dogfood verifier evidence to the captured agent events and emit `aionis_real_ab_trace_capture_v1`.

## Guardrail

The compiler must fail when only a single dogfood run is supplied. Runtime dogfood proves contract/evidence behavior; it does not by itself prove Aionis beats a baseline agent.

## Non-Goals

This phase does not fabricate baseline, negative-control, or positive-control behavior.

This phase does not claim product value without live paired runs.

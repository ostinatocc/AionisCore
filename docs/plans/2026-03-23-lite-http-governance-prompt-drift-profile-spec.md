Last reviewed: 2026-04-16

Document status: historical implementation plan

# Lite HTTP Governance Prompt Drift Profile Spec

Date: 2026-03-23
Status: implemented

## Goal

Make HTTP governance prompt-contract drift visible to the real benchmark baseline gate.

## Problem

The HTTP governance prompt contract is now versioned, but benchmark baseline/profile drift does not yet watch those versions.

That means prompt changes could still land without showing up as benchmark-profile drift.

## Decision

Add a dedicated suite-profile section:

- `http_prompt_contract.transport_contract_version`
- `http_prompt_contract.promote_memory_prompt_version`
- `http_prompt_contract.form_pattern_prompt_version`

Treat all three as hard regression indicators.

## Why hard

These fields define the protocol between:

1. Aionis runtime
2. HTTP governance transport
3. model prompt contract

If they change, the benchmark baseline should surface that drift immediately.

## Validation

Run:

1. `npx tsc --noEmit`
2. `npx tsx scripts/lite-real-task-benchmark.ts`
3. isolated validation with a fresh baseline artifact

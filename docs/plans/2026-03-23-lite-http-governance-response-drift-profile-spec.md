# Lite HTTP Governance Response Drift Profile Spec

Date: 2026-03-23
Status: implemented

## Goal

Make HTTP governance response-schema drift visible to the real benchmark baseline gate.

## Problem

The benchmark already tracks prompt-contract versions, but it does not yet track the semantic review schema versions that the HTTP governance path validates against.

That leaves one contract edge unmonitored:

1. response schema version for `promote_memory`
2. response schema version for `form_pattern`

## Decision

Add a dedicated suite-profile section:

1. `http_response_contract.promote_memory_review_version`
2. `http_response_contract.form_pattern_review_version`

Treat both as hard regression indicators.

## Source of truth

These values should come from exported schema-version constants, not duplicated benchmark literals.

## Validation

Run:

1. `npx tsc --noEmit`
2. `npx tsx scripts/lite-real-task-benchmark.ts`
3. isolated validation with a fresh baseline artifact

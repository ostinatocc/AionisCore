Last reviewed: 2026-04-16

Document status: historical implementation plan

# Lite HTTP Governance Response Drift Profile

The real benchmark suite now tracks HTTP governance response-schema versions as part of the stable suite profile.

## Added profile keys

1. `http_response_contract.promote_memory_review_version`
2. `http_response_contract.form_pattern_review_version`

## Why

The HTTP governance transport is only one side of the contract. The other side is the schema version of the semantic review object that Aionis accepts and validates.

If those schema versions drift, the benchmark baseline should surface that change immediately.

## Effect

Changing the accepted semantic review schema version for either governed operation now triggers hard profile drift in the benchmark baseline flow.

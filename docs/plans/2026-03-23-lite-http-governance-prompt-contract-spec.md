# Lite HTTP Governance Prompt Contract Spec

Date: 2026-03-23
Status: implemented

## Goal

Separate the HTTP governance prompt/response contract from the transport implementation.

## Problem

The first HTTP governance client baseline embedded prompt wording and response-shape instructions directly inside the HTTP client.

That made prompt evolution implicit and harder to benchmark, review, and version.

## Decision

Introduce a versioned prompt-contract module for:

1. `promote_memory`
2. `form_pattern`

Each contract must declare:

1. transport contract version
2. prompt version
3. operation
4. response contract metadata
5. review packet payload

## Required fields

Every HTTP governance request payload must include:

1. `transport_contract_version`
2. `prompt_version`
3. `operation`
4. `response_contract`
5. `review_packet`

## Non-goals

This does not change:

1. review schemas
2. admissibility logic
3. policy-effect logic
4. runtime apply behavior

It only makes the HTTP prompt/response contract explicit and versioned.

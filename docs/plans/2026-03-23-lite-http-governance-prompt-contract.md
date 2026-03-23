# Lite HTTP Governance Prompt Contract

The HTTP governance client now uses an explicit versioned prompt-contract layer instead of building prompts inline inside the transport code.

## Why

What needs to stay stable is not only the endpoint shape. It is also:

1. what the model is told
2. what response shape the model is allowed to emit
3. which prompt version produced a review

Without that separation, prompt edits become hidden runtime changes.

## What changed

The runtime now builds HTTP governance requests through explicit prompt-contract builders:

1. `promote_memory_http_prompt_v1`
2. `form_pattern_http_prompt_v1`

Both sit on top of:

1. `openai_chat_completions_v1`

and both declare a strict JSON-or-null response contract tied to the existing semantic review schema versions.

## Result

The HTTP governance client is cleaner:

1. transport code only handles HTTP I/O and parsing
2. prompt contract code owns system prompt and request payload shape
3. future prompt evolution can be benchmarked and reviewed as a first-class contract change

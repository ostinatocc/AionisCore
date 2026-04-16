Last reviewed: 2026-04-16

Document status: historical implementation plan

# Lite HTTP Governance Prompt Drift Profile

The real benchmark suite now tracks HTTP governance prompt-contract versions as part of the stable suite profile.

## Added profile keys

1. `http_prompt_contract.transport_contract_version`
2. `http_prompt_contract.promote_memory_prompt_version`
3. `http_prompt_contract.form_pattern_prompt_version`

## Why

The runtime already treats HTTP governance prompt contracts as versioned protocol. The benchmark baseline should do the same.

Without these keys, prompt changes would remain invisible to profile drift even though they change the governance contract.

## Effect

Changing:

1. transport contract version
2. promote-memory prompt version
3. form-pattern prompt version

now triggers benchmark profile drift and is treated as a hard contract change.

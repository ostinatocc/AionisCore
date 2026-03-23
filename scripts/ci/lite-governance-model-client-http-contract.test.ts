import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFormPatternHttpPromptContract,
  buildPromoteMemoryHttpPromptContract,
  GOVERNANCE_HTTP_FORM_PATTERN_PROMPT_VERSION,
  GOVERNANCE_HTTP_PROMOTE_MEMORY_PROMPT_VERSION,
  GOVERNANCE_HTTP_TRANSPORT_CONTRACT_VERSION,
} from "../../src/memory/governance-model-client-http-contract.ts";

test("http promote_memory prompt contract is explicitly versioned", () => {
  const contract = buildPromoteMemoryHttpPromptContract({
    review_version: "promote_memory_semantic_review_v1",
    operation: "promote_memory",
    requested_target_kind: "workflow",
    requested_target_level: "L2",
    candidate_count: 1,
    deterministic_gate: {
      candidate_count_satisfied: true,
      target_kind_present: true,
      target_level_present: true,
      gate_satisfied: true,
    },
    candidate_examples: [{ node_id: "node-1", workflow_signature: "wf:test" }],
  });

  assert.equal(contract.transport_contract_version, GOVERNANCE_HTTP_TRANSPORT_CONTRACT_VERSION);
  assert.equal(contract.prompt_version, GOVERNANCE_HTTP_PROMOTE_MEMORY_PROMPT_VERSION);
  assert.equal(contract.user_payload.transport_contract_version, GOVERNANCE_HTTP_TRANSPORT_CONTRACT_VERSION);
  assert.equal(contract.user_payload.prompt_version, GOVERNANCE_HTTP_PROMOTE_MEMORY_PROMPT_VERSION);
  assert.equal(contract.user_payload.operation, "promote_memory");
  assert.equal(contract.user_payload.response_contract.review_version, "promote_memory_semantic_review_v1");
});

test("http form_pattern prompt contract is explicitly versioned", () => {
  const contract = buildFormPatternHttpPromptContract({
    review_version: "form_pattern_semantic_review_v1",
    operation: "form_pattern",
    target_level: "L3",
    source_count: 2,
    deterministic_gate: {
      source_count_satisfied: true,
      signature_present: true,
      gate_satisfied: true,
    },
    signatures: {
      task_signature: "task:sig",
      error_signature: null,
      workflow_signature: null,
    },
    source_examples: [
      { node_id: "node-1", task_signature: "task:sig" },
      { node_id: "node-2", task_signature: "task:sig" },
    ],
  });

  assert.equal(contract.transport_contract_version, GOVERNANCE_HTTP_TRANSPORT_CONTRACT_VERSION);
  assert.equal(contract.prompt_version, GOVERNANCE_HTTP_FORM_PATTERN_PROMPT_VERSION);
  assert.equal(contract.user_payload.transport_contract_version, GOVERNANCE_HTTP_TRANSPORT_CONTRACT_VERSION);
  assert.equal(contract.user_payload.prompt_version, GOVERNANCE_HTTP_FORM_PATTERN_PROMPT_VERSION);
  assert.equal(contract.user_payload.operation, "form_pattern");
  assert.equal(contract.user_payload.response_contract.review_version, "form_pattern_semantic_review_v1");
});

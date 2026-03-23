import type {
  MemoryFormPatternSemanticReviewPacket,
  MemoryPromoteSemanticReviewPacket,
} from "./schemas.js";

export const GOVERNANCE_HTTP_TRANSPORT_CONTRACT_VERSION = "openai_chat_completions_v1";
export const GOVERNANCE_HTTP_PROMOTE_MEMORY_PROMPT_VERSION = "promote_memory_http_prompt_v1";
export const GOVERNANCE_HTTP_FORM_PATTERN_PROMPT_VERSION = "form_pattern_http_prompt_v1";

type GovernanceHttpPromptContract<TPacket> = {
  transport_contract_version: typeof GOVERNANCE_HTTP_TRANSPORT_CONTRACT_VERSION;
  prompt_version: string;
  system_prompt: string;
  user_payload: {
    transport_contract_version: typeof GOVERNANCE_HTTP_TRANSPORT_CONTRACT_VERSION;
    prompt_version: string;
    operation: string;
    response_contract: {
      kind: "strict_json_or_null";
      review_version: string;
      schema_note: string;
    };
    review_packet: TPacket;
  };
};

export function buildPromoteMemoryHttpPromptContract(
  reviewPacket: MemoryPromoteSemanticReviewPacket,
): GovernanceHttpPromptContract<MemoryPromoteSemanticReviewPacket> {
  return {
    transport_contract_version: GOVERNANCE_HTTP_TRANSPORT_CONTRACT_VERSION,
    prompt_version: GOVERNANCE_HTTP_PROMOTE_MEMORY_PROMPT_VERSION,
    system_prompt:
      "You are an internal governance reviewer for Aionis execution-memory. "
      + "Return strict JSON only. Return either null or an object matching "
      + "promote_memory_semantic_review_v1 with adjudication fields: "
      + "operation, disposition, target_kind, target_level, reason, confidence, strategic_value. "
      + "Be conservative. If the packet does not justify recommendation, return null.",
    user_payload: {
      transport_contract_version: GOVERNANCE_HTTP_TRANSPORT_CONTRACT_VERSION,
      prompt_version: GOVERNANCE_HTTP_PROMOTE_MEMORY_PROMPT_VERSION,
      operation: "promote_memory",
      response_contract: {
        kind: "strict_json_or_null",
        review_version: "promote_memory_semantic_review_v1",
        schema_note:
          "Return null or a promote_memory_semantic_review_v1 object. Do not wrap in markdown or prose.",
      },
      review_packet: reviewPacket,
    },
  };
}

export function buildFormPatternHttpPromptContract(
  reviewPacket: MemoryFormPatternSemanticReviewPacket,
): GovernanceHttpPromptContract<MemoryFormPatternSemanticReviewPacket> {
  return {
    transport_contract_version: GOVERNANCE_HTTP_TRANSPORT_CONTRACT_VERSION,
    prompt_version: GOVERNANCE_HTTP_FORM_PATTERN_PROMPT_VERSION,
    system_prompt:
      "You are an internal governance reviewer for Aionis execution-memory. "
      + "Return strict JSON only. Return either null or an object matching "
      + "form_pattern_semantic_review_v1 with adjudication fields: "
      + "operation, disposition, target_kind, target_level, reason, confidence. "
      + "Be conservative. If the packet does not justify recommendation, return null.",
    user_payload: {
      transport_contract_version: GOVERNANCE_HTTP_TRANSPORT_CONTRACT_VERSION,
      prompt_version: GOVERNANCE_HTTP_FORM_PATTERN_PROMPT_VERSION,
      operation: "form_pattern",
      response_contract: {
        kind: "strict_json_or_null",
        review_version: "form_pattern_semantic_review_v1",
        schema_note:
          "Return null or a form_pattern_semantic_review_v1 object. Do not wrap in markdown or prose.",
      },
      review_packet: reviewPacket,
    },
  };
}

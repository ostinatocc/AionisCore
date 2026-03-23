import type {
  GovernanceHttpModelClientConfig,
  GovernanceHttpModelClientTransport,
  GovernanceModelClient,
} from "./governance-model-client.js";
import {
  buildFormPatternAnthropicHttpPromptContract,
  buildFormPatternHttpPromptContract,
  buildPromoteMemoryAnthropicHttpPromptContract,
  buildPromoteMemoryHttpPromptContract,
  GOVERNANCE_HTTP_ANTHROPIC_TRANSPORT_CONTRACT_VERSION,
  GOVERNANCE_HTTP_OPENAI_TRANSPORT_CONTRACT_VERSION,
} from "./governance-model-client-http-contract.js";
import {
  MemoryFormPatternSemanticReviewResultSchema,
  MemoryPromoteSemanticReviewResultSchema,
} from "./schemas.js";

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function extractJsonValueFromText(raw: string): unknown {
  const text = raw.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // continue
  }
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // continue
    }
  }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(text.slice(first, last + 1));
    } catch {
      return null;
    }
  }
  if (/^null$/i.test(text)) return null;
  return null;
}

function extractChatCompletionText(payload: unknown): string | null {
  const root = asObject(payload);
  if (!root) return null;
  const choices = Array.isArray(root.choices) ? root.choices : [];
  const first = asObject(choices[0]);
  if (!first) return null;
  const msg = asObject(first.message);
  if (!msg) return null;
  const content = msg.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const fragments = content
      .map((item) => {
        const obj = asObject(item);
        if (!obj) return "";
        const text = obj.text;
        return typeof text === "string" ? text : "";
      })
      .filter((v) => v.length > 0);
    if (fragments.length > 0) return fragments.join("\n");
  }
  return null;
}

function extractAnthropicMessageText(payload: unknown): string | null {
  const root = asObject(payload);
  if (!root) return null;
  const content = Array.isArray(root.content) ? root.content : [];
  const fragments = content
    .map((item) => {
      const obj = asObject(item);
      if (!obj) return "";
      const text = obj.text;
      return typeof text === "string" ? text : "";
    })
    .filter((v) => v.length > 0);
  if (fragments.length > 0) return fragments.join("\n");
  return null;
}

function inferGovernanceHttpTransport(
  config: GovernanceHttpModelClientConfig,
): GovernanceHttpModelClientTransport {
  if (config.transport) return config.transport;
  const baseUrl = config.baseUrl.trim().toLowerCase();
  if (baseUrl.includes("/anthropic")) {
    return GOVERNANCE_HTTP_ANTHROPIC_TRANSPORT_CONTRACT_VERSION;
  }
  return GOVERNANCE_HTTP_OPENAI_TRANSPORT_CONTRACT_VERSION;
}

async function postGovernanceReviewJson(args: {
  config: GovernanceHttpModelClientConfig;
  systemPrompt: string;
  userPayload: Record<string, unknown>;
}): Promise<unknown> {
  const baseUrl = args.config.baseUrl.trim().replace(/\/+$/, "");
  const apiKey = args.config.apiKey.trim();
  const model = args.config.model.trim();
  if (!baseUrl || !apiKey || !model) return null;
  const transport = inferGovernanceHttpTransport(args.config);
  const maxTokens =
    transport === GOVERNANCE_HTTP_ANTHROPIC_TRANSPORT_CONTRACT_VERSION
      ? Math.max(args.config.maxTokens, 1200)
      : args.config.maxTokens;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.config.timeoutMs);
  try {
    const response =
      transport === GOVERNANCE_HTTP_ANTHROPIC_TRANSPORT_CONTRACT_VERSION
        ? await fetch(`${baseUrl}/v1/messages`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model,
              max_tokens: maxTokens,
              system: args.systemPrompt,
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(args.userPayload, null, 2),
                    },
                  ],
                },
              ],
            }),
            signal: controller.signal,
          })
        : await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              temperature: args.config.temperature,
              max_tokens: maxTokens,
              messages: [
                { role: "system", content: args.systemPrompt },
                { role: "user", content: JSON.stringify(args.userPayload, null, 2) },
              ],
            }),
            signal: controller.signal,
          });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    const content =
      transport === GOVERNANCE_HTTP_ANTHROPIC_TRANSPORT_CONTRACT_VERSION
        ? extractAnthropicMessageText(payload)
        : extractChatCompletionText(payload);
    if (!content) return null;
    return extractJsonValueFromText(content);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function createHttpPromoteMemoryGovernanceModelClient(
  config: GovernanceHttpModelClientConfig,
): GovernanceModelClient {
  return {
    reviewPromoteMemory: async ({ reviewPacket, suppliedReviewResult }) => {
      if (suppliedReviewResult) return suppliedReviewResult;
      const contract =
        inferGovernanceHttpTransport(config) === GOVERNANCE_HTTP_ANTHROPIC_TRANSPORT_CONTRACT_VERSION
          ? buildPromoteMemoryAnthropicHttpPromptContract(reviewPacket)
          : buildPromoteMemoryHttpPromptContract(reviewPacket);
      const parsed = await postGovernanceReviewJson({
        config,
        systemPrompt: contract.system_prompt,
        userPayload: contract.user_payload,
      });
      if (parsed == null) return null;
      const result = MemoryPromoteSemanticReviewResultSchema.safeParse(parsed);
      return result.success ? result.data : null;
    },
  };
}

export function createHttpFormPatternGovernanceModelClient(
  config: GovernanceHttpModelClientConfig,
): GovernanceModelClient {
  return {
    reviewFormPattern: async ({ reviewPacket, suppliedReviewResult }) => {
      if (suppliedReviewResult) return suppliedReviewResult;
      const contract =
        inferGovernanceHttpTransport(config) === GOVERNANCE_HTTP_ANTHROPIC_TRANSPORT_CONTRACT_VERSION
          ? buildFormPatternAnthropicHttpPromptContract(reviewPacket)
          : buildFormPatternHttpPromptContract(reviewPacket);
      const parsed = await postGovernanceReviewJson({
        config,
        systemPrompt: contract.system_prompt,
        userPayload: contract.user_payload,
      });
      if (parsed == null) return null;
      const result = MemoryFormPatternSemanticReviewResultSchema.safeParse(parsed);
      return result.success ? result.data : null;
    },
  };
}

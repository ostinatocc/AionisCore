import type { Env } from "../config.js";
import type {
  GovernanceModelClientFactory,
  GovernanceHttpModelClientConfig,
  GovernanceHttpModelClientTransport,
  GovernanceModelClientMode,
} from "../memory/governance-model-client.js";
import {
  buildFormPatternGovernanceReviewProvider,
  buildPromoteMemoryGovernanceReviewProvider,
} from "../memory/governance-provider-factory.js";
import type {
  FormPatternGovernanceReviewProvider,
  PromoteMemoryGovernanceReviewProvider,
} from "../memory/governance-provider-types.js";

export type LiteGovernanceRuntimeProviders = {
  replayRepairReview?: {
    promote_memory?: PromoteMemoryGovernanceReviewProvider;
  };
  workflowProjection?: {
    promote_memory?: PromoteMemoryGovernanceReviewProvider;
  };
  toolsFeedback?: {
    form_pattern?: FormPatternGovernanceReviewProvider;
  };
};

export type LiteGovernanceRuntimeProviderBuilderOptions = {
  modelClientFactory?: GovernanceModelClientFactory;
  httpClientConfig?: GovernanceHttpModelClientConfig;
  modelClientModes?: {
    replayRepairReview?: {
      promote_memory?: GovernanceModelClientMode;
    };
    workflowProjection?: {
      promote_memory?: GovernanceModelClientMode;
    };
    toolsFeedback?: {
      form_pattern?: GovernanceModelClientMode;
    };
  };
};

function buildGovernanceHttpClientConfig(
  env: Env,
  options?: LiteGovernanceRuntimeProviderBuilderOptions,
): GovernanceHttpModelClientConfig | undefined {
  if (options?.httpClientConfig) return options.httpClientConfig;
  const baseUrl = typeof env.GOVERNANCE_MODEL_CLIENT_BASE_URL === "string"
    ? env.GOVERNANCE_MODEL_CLIENT_BASE_URL.trim()
    : "";
  const apiKey = typeof env.GOVERNANCE_MODEL_CLIENT_API_KEY === "string"
    ? env.GOVERNANCE_MODEL_CLIENT_API_KEY.trim()
    : "";
  const model = typeof env.GOVERNANCE_MODEL_CLIENT_MODEL === "string"
    ? env.GOVERNANCE_MODEL_CLIENT_MODEL.trim()
    : "";
  if (
    !baseUrl
    || !apiKey
    || !model
  ) {
    return undefined;
  }
  const transport: GovernanceHttpModelClientTransport | undefined =
    env.GOVERNANCE_MODEL_CLIENT_TRANSPORT === "auto"
      ? undefined
      : env.GOVERNANCE_MODEL_CLIENT_TRANSPORT;
  return {
    baseUrl,
    apiKey,
    model,
    transport,
    timeoutMs: typeof env.GOVERNANCE_MODEL_CLIENT_TIMEOUT_MS === "number"
      ? env.GOVERNANCE_MODEL_CLIENT_TIMEOUT_MS
      : 7000,
    maxTokens: typeof env.GOVERNANCE_MODEL_CLIENT_MAX_TOKENS === "number"
      ? env.GOVERNANCE_MODEL_CLIENT_MAX_TOKENS
      : 300,
    temperature: typeof env.GOVERNANCE_MODEL_CLIENT_TEMPERATURE === "number"
      ? env.GOVERNANCE_MODEL_CLIENT_TEMPERATURE
      : 0.1,
  };
}

export function buildLiteGovernanceRuntimeProviders(
  env: Env,
  options?: LiteGovernanceRuntimeProviderBuilderOptions,
): LiteGovernanceRuntimeProviders {
  const httpClientConfig = buildGovernanceHttpClientConfig(env, options);
  const replayPromoteMemoryProvider = buildPromoteMemoryGovernanceReviewProvider({
    modelClientMode:
      options?.modelClientModes?.replayRepairReview?.promote_memory
      ?? (
        env.REPLAY_GOVERNANCE_HTTP_MODEL_PROMOTE_MEMORY_PROVIDER_ENABLED
          ? "http"
          : env.REPLAY_GOVERNANCE_MOCK_MODEL_PROMOTE_MEMORY_PROVIDER_ENABLED
            ? "builtin"
            : "off"
      ),
    staticEnabled: env.REPLAY_GOVERNANCE_STATIC_PROMOTE_MEMORY_PROVIDER_ENABLED,
    modelClientFactory: options?.modelClientFactory,
    httpClientConfig,
  });
  const workflowPromoteMemoryProvider = buildPromoteMemoryGovernanceReviewProvider({
    modelClientMode:
      options?.modelClientModes?.workflowProjection?.promote_memory
      ?? (
        env.WORKFLOW_GOVERNANCE_HTTP_MODEL_PROMOTE_MEMORY_PROVIDER_ENABLED
          ? "http"
          : env.WORKFLOW_GOVERNANCE_MOCK_MODEL_PROMOTE_MEMORY_PROVIDER_ENABLED
            ? "builtin"
            : "off"
      ),
    staticEnabled: env.WORKFLOW_GOVERNANCE_STATIC_PROMOTE_MEMORY_PROVIDER_ENABLED,
    modelClientFactory: options?.modelClientFactory,
    httpClientConfig,
    mockModel: {
      confidence: 0.85,
    },
    static: {
      confidence: 0.85,
    },
  });
  const toolsFormPatternProvider = buildFormPatternGovernanceReviewProvider({
    modelClientMode:
      options?.modelClientModes?.toolsFeedback?.form_pattern
      ?? (
        env.TOOLS_GOVERNANCE_HTTP_MODEL_FORM_PATTERN_PROVIDER_ENABLED
          ? "http"
          : env.TOOLS_GOVERNANCE_MOCK_MODEL_FORM_PATTERN_PROVIDER_ENABLED
            ? "builtin"
            : "off"
      ),
    staticEnabled: env.TOOLS_GOVERNANCE_STATIC_FORM_PATTERN_PROVIDER_ENABLED,
    modelClientFactory: options?.modelClientFactory,
    httpClientConfig,
  });

  return {
    ...(replayPromoteMemoryProvider
      ? {
          replayRepairReview: {
            promote_memory: replayPromoteMemoryProvider,
          },
        }
      : {}),
    ...(workflowPromoteMemoryProvider
      ? {
          workflowProjection: {
            promote_memory: workflowPromoteMemoryProvider,
          },
        }
      : {}),
    ...(toolsFormPatternProvider
      ? {
          toolsFeedback: {
            form_pattern: toolsFormPatternProvider,
          },
        }
      : {}),
  };
}

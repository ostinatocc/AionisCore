import { AionisSdkHttpError } from "../error.js";
import type {
  AionisClientOptions,
  AionisHttpClient,
  AionisRequestPayload,
  AionisResponsePayload,
} from "../types.js";

function trimBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

export function createAionisHttpClient(options: AionisClientOptions): AionisHttpClient {
  const baseUrl = trimBaseUrl(options.baseUrl);
  const fetchImpl = options.fetch ?? fetch;
  const defaultHeaders = options.headers ?? {};

  return {
    async post<TRequest extends AionisRequestPayload, TResponse = AionisResponsePayload>(
      args: {
        path: string;
        payload: TRequest;
      },
    ): Promise<TResponse> {
      const response = await fetchImpl(`${baseUrl}${args.path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...defaultHeaders,
        },
        body: JSON.stringify(args.payload),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new AionisSdkHttpError({
          status: response.status,
          payload,
        });
      }

      return payload as TResponse;
    },
  };
}

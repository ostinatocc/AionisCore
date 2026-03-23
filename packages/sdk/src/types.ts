export type AionisJsonPrimitive = string | number | boolean | null;

export type AionisJsonValue =
  | AionisJsonPrimitive
  | AionisJsonValue[]
  | { [key: string]: AionisJsonValue };

export type AionisJsonObject = { [key: string]: AionisJsonValue };

export type AionisRequestPayload = Record<string, unknown>;
export type AionisResponsePayload = unknown;

export type AionisFetch = typeof fetch;

export type AionisClientOptions = {
  baseUrl: string;
  fetch?: AionisFetch;
  headers?: Record<string, string>;
};

export type AionisRequestOptions<TRequest extends AionisRequestPayload> = {
  path: string;
  payload: TRequest;
};

export type AionisHttpClient = {
  post<TRequest extends AionisRequestPayload, TResponse = AionisResponsePayload>(
    args: AionisRequestOptions<TRequest>,
  ): Promise<TResponse>;
};

export class AionisSdkHttpError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(args: {
    status: number;
    payload: unknown;
    message?: string;
  }) {
    super(args.message ?? `Aionis request failed with status ${args.status}`);
    this.name = "AionisSdkHttpError";
    this.status = args.status;
    this.payload = args.payload;
  }
}

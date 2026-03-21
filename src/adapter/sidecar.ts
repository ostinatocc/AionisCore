import type { AionisMcpEnv } from "../mcp/client.js";
import { createAionisClaudeCodeHarness, type CreateAionisClaudeCodeHarnessArgs } from "./claude-code-harness.js";
import { SidecarRequestSchema, type SidecarRequest, type SidecarResponse } from "./sidecar-contracts.js";

export type CreateAionisAdapterSidecarArgs = CreateAionisClaudeCodeHarnessArgs;

export class AionisAdapterSidecar {
  readonly env: AionisMcpEnv;
  readonly harness;

  constructor(args: CreateAionisAdapterSidecarArgs) {
    this.env = args.env;
    this.harness = createAionisClaudeCodeHarness(args);
  }

  async dispatch(rawRequest: SidecarRequest): Promise<SidecarResponse> {
    const request = SidecarRequestSchema.parse(rawRequest);
    const { request_id, event } = request;

    switch (event.event_type) {
      case "task_started":
        return { ok: true, request_id, event_type: event.event_type, result: await this.harness.startTask(event) };
      case "tool_selection_requested":
        return { ok: true, request_id, event_type: event.event_type, result: await this.harness.selectTool(event) };
      case "tool_executed":
        return { ok: true, request_id, event_type: event.event_type, result: await this.harness.recordStep(event) };
      case "task_completed":
      case "task_blocked":
      case "task_failed":
      case "task_abandoned":
        return { ok: true, request_id, event_type: event.event_type, result: await this.harness.finalizeTask(event) };
      case "introspect_requested":
        return { ok: true, request_id, event_type: event.event_type, result: await this.harness.introspect(event) };
    }
  }
}

export function createAionisAdapterSidecar(args: CreateAionisAdapterSidecarArgs): AionisAdapterSidecar {
  return new AionisAdapterSidecar(args);
}

import { z } from "zod";
import {
  AdapterTaskStartedSchema,
  AdapterTaskTerminalOutcomeSchema,
  AdapterToolExecutedSchema,
  AdapterToolSelectionRequestedSchema,
} from "./contracts.js";

export const SidecarIntrospectRequestedSchema = z.object({
  event_type: z.literal("introspect_requested"),
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  consumer_agent_id: z.string().min(1).optional(),
  consumer_team_id: z.string().min(1).optional(),
  limit: z.number().int().positive().max(50).optional(),
}).strict();

export const SidecarEventSchema = z.discriminatedUnion("event_type", [
  AdapterTaskStartedSchema,
  AdapterToolSelectionRequestedSchema,
  AdapterToolExecutedSchema,
  AdapterTaskTerminalOutcomeSchema,
  SidecarIntrospectRequestedSchema,
]);

export const SidecarRequestSchema = z.object({
  request_id: z.string().min(1),
  event: SidecarEventSchema,
}).strict();

export type SidecarIntrospectRequested = z.infer<typeof SidecarIntrospectRequestedSchema>;
export type SidecarEvent = z.infer<typeof SidecarEventSchema>;
export type SidecarRequest = z.infer<typeof SidecarRequestSchema>;

export type SidecarResponse =
  | {
      ok: true;
      request_id: string;
      event_type: SidecarEvent["event_type"];
      result: unknown;
    }
  | {
      ok: false;
      request_id: string | null;
      error: string;
      details?: unknown;
    };

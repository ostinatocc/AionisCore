import { z } from "zod";

const StringArraySchema = z.array(z.string().min(1)).min(1).max(200);

export const WrapperTaskRequestSchema = z.object({
  task_id: z.string().min(1),
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  query_text: z.string().min(1),
  context: z.unknown().default({}),
  tool_candidates: StringArraySchema,
  consumer_agent_id: z.string().min(1).optional(),
  consumer_team_id: z.string().min(1).optional(),
  rules_limit: z.number().int().positive().max(200).optional(),
  limit: z.number().int().positive().max(200).optional(),
}).strict();

export const WrapperSelectionRequestSchema = z.object({
  candidates: StringArraySchema.optional(),
  context: z.unknown().optional(),
  include_shadow: z.boolean().optional(),
  rules_limit: z.number().int().positive().max(200).optional(),
  strict: z.boolean().optional(),
  reorder_candidates: z.boolean().optional(),
}).strict();

export const WrapperStepRequestSchema = z.object({
  step_id: z.string().min(1),
  selected_tool: z.string().min(1),
  candidates: StringArraySchema.optional(),
  context: z.unknown().optional(),
  command: z.string().min(1),
  args: z.array(z.string()).max(400).optional(),
  cwd: z.string().min(1).optional(),
  validated: z.boolean().optional(),
  reverted: z.boolean().optional(),
  note: z.string().min(1).optional(),
}).strict();

export const WrapperFinalizationRequestSchema = z.object({
  outcome: z.enum(["completed", "blocked", "failed", "abandoned"]),
  selected_tool: z.string().min(1).optional(),
  candidates: StringArraySchema.optional(),
  context: z.unknown().optional(),
  note: z.string().min(1).optional(),
}).strict();

export const WrapperIntrospectRequestSchema = z.object({
  tenant_id: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  consumer_agent_id: z.string().min(1).optional(),
  consumer_team_id: z.string().min(1).optional(),
  limit: z.number().int().positive().max(50).optional(),
}).strict();

export const WrapperRunRequestSchema = z.object({
  task: WrapperTaskRequestSchema,
  selection: WrapperSelectionRequestSchema.optional(),
  step: WrapperStepRequestSchema,
  finalization: WrapperFinalizationRequestSchema,
  introspect: WrapperIntrospectRequestSchema.optional(),
}).strict();

export type WrapperRunRequest = z.infer<typeof WrapperRunRequestSchema>;

import { z } from "zod";
import {
  ExecutionContractProvenanceV1Schema,
  ExecutionContractV1Schema,
  type ExecutionContractV1,
} from "./execution-contract.js";
import { type ServiceLifecycleConstraintV1 } from "../execution/types.js";

const StringList = z.array(z.string().trim().min(1)).default([]);

export const ExecutionAgentContractPacketModeSchema = z.enum(["contract_only", "workflow_expanded"]);
export type ExecutionAgentContractPacketMode = z.infer<typeof ExecutionAgentContractPacketModeSchema>;

export const ExecutionAgentContractPacketEscalationReasonSchema = z.enum([
  "explicit_workflow_expanded_requested",
  "verification_failed",
  "compact_contract_marked_insufficient",
  "compact_contract_missing_target_files",
  "compact_contract_missing_next_action",
  "compact_contract_missing_acceptance_checks",
  "unresolved_blockers_present",
]);
export type ExecutionAgentContractPacketEscalationReason = z.infer<
  typeof ExecutionAgentContractPacketEscalationReasonSchema
>;

export const ExecutionAgentContractPacketV1Schema = z.object({
  packet_version: z.literal("execution_agent_contract_packet_v1"),
  mode: ExecutionAgentContractPacketModeSchema,
  contract: z.object({
    contract_trust: z.enum(["authoritative", "advisory", "observational"]).nullable(),
    task_family: z.string().trim().min(1).nullable(),
    task_prompt: z.string().trim().min(1).nullable(),
    task_signature: z.string().trim().min(1).nullable(),
    workflow_signature: z.string().trim().min(1).nullable(),
    target_files: StringList,
    next_action: z.string().trim().min(1).nullable(),
    acceptance_checks: StringList,
    lifecycle_constraints: StringList,
    authority_boundary: StringList,
    success_invariants: StringList,
    dependency_requirements: StringList,
    environment_assumptions: StringList,
    must_hold_after_exit: StringList,
    external_visibility_requirements: StringList,
  }).strict(),
  expanded: z.object({
    selected_tool: z.string().trim().min(1).nullable(),
    workflow_steps: StringList,
    pattern_hints: StringList,
    provenance: ExecutionContractProvenanceV1Schema,
  }).strict().nullable(),
  escalation: z.object({
    requested_mode: ExecutionAgentContractPacketModeSchema,
    effective_mode: ExecutionAgentContractPacketModeSchema,
    escalated: z.boolean(),
    reasons: z.array(ExecutionAgentContractPacketEscalationReasonSchema).default([]),
    unresolved_blockers: StringList,
  }).strict(),
}).strict();
export type ExecutionAgentContractPacketV1 = z.infer<typeof ExecutionAgentContractPacketV1Schema>;

function uniqueStrings(values: Array<string | null | undefined>, limit = 64): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const next = typeof value === "string" ? value.trim() : "";
    if (!next || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
    if (out.length >= limit) break;
  }
  return out;
}

function lifecycleConstraintLabel(constraint: ServiceLifecycleConstraintV1): string {
  const flags = uniqueStrings([
    constraint.must_survive_agent_exit ? "must_survive_agent_exit" : null,
    constraint.revalidate_from_fresh_shell ? "revalidate_from_fresh_shell" : null,
    constraint.detach_then_probe ? "detach_then_probe" : null,
    constraint.endpoint ? `endpoint=${constraint.endpoint}` : null,
    constraint.launch_reference ? `launch=${constraint.launch_reference}` : null,
  ], 8);
  return flags.length > 0 ? `${constraint.label}:${flags.join(",")}` : constraint.label;
}

function lifecycleConstraints(contract: ExecutionContractV1): string[] {
  return uniqueStrings([
    ...contract.service_lifecycle_constraints.map(lifecycleConstraintLabel),
    ...contract.outcome.must_hold_after_exit,
    ...contract.outcome.external_visibility_requirements,
  ], 32);
}

function authorityBoundary(contract: ExecutionContractV1): string[] {
  return uniqueStrings([
    contract.contract_trust && contract.contract_trust !== "authoritative"
      ? `contract_trust=${contract.contract_trust}; treat as non-authoritative until acceptance evidence passes`
      : null,
    contract.outcome.acceptance_checks.length > 0
      ? "success_requires_declared_acceptance_checks"
      : "success_claim_is_advisory_without_acceptance_checks",
    contract.outcome.must_hold_after_exit.length > 0
      ? "after_exit_claim_requires_fresh_shell_revalidation"
      : null,
    contract.outcome.external_visibility_requirements.length > 0
      ? "external_visibility_must_be_verified_outside_agent_claim"
      : null,
  ], 16);
}

function compactInsufficiencyReasons(contract: ExecutionContractV1): ExecutionAgentContractPacketEscalationReason[] {
  const reasons: ExecutionAgentContractPacketEscalationReason[] = [];
  if (contract.target_files.length === 0) reasons.push("compact_contract_missing_target_files");
  if (!contract.next_action) reasons.push("compact_contract_missing_next_action");
  if (contract.outcome.acceptance_checks.length === 0) reasons.push("compact_contract_missing_acceptance_checks");
  return reasons;
}

export function buildExecutionAgentContractPacketV1(args: {
  contract: ExecutionContractV1 | z.input<typeof ExecutionContractV1Schema>;
  task_prompt?: string | null;
  requested_mode?: ExecutionAgentContractPacketMode | null;
  verification_failed?: boolean;
  compact_contract_insufficient?: boolean;
  unresolved_blockers?: string[];
}): ExecutionAgentContractPacketV1 {
  const contract = ExecutionContractV1Schema.parse(args.contract);
  const requestedMode = args.requested_mode ?? "contract_only";
  const reasons = uniqueStrings([
    requestedMode === "workflow_expanded" ? "explicit_workflow_expanded_requested" : null,
    args.verification_failed ? "verification_failed" : null,
    args.compact_contract_insufficient ? "compact_contract_marked_insufficient" : null,
    ...compactInsufficiencyReasons(contract),
    ...(args.unresolved_blockers && args.unresolved_blockers.length > 0 ? ["unresolved_blockers_present"] : []),
  ] as Array<ExecutionAgentContractPacketEscalationReason | null>, 16) as ExecutionAgentContractPacketEscalationReason[];
  const effectiveMode: ExecutionAgentContractPacketMode = reasons.length > 0 ? "workflow_expanded" : "contract_only";

  return ExecutionAgentContractPacketV1Schema.parse({
    packet_version: "execution_agent_contract_packet_v1",
    mode: effectiveMode,
    contract: {
      contract_trust: contract.contract_trust,
      task_family: contract.task_family,
      task_prompt: args.task_prompt ?? null,
      task_signature: contract.task_signature,
      workflow_signature: contract.workflow_signature,
      target_files: contract.target_files,
      next_action: contract.next_action,
      acceptance_checks: contract.outcome.acceptance_checks,
      lifecycle_constraints: lifecycleConstraints(contract),
      authority_boundary: authorityBoundary(contract),
      success_invariants: contract.outcome.success_invariants,
      dependency_requirements: contract.outcome.dependency_requirements,
      environment_assumptions: contract.outcome.environment_assumptions,
      must_hold_after_exit: contract.outcome.must_hold_after_exit,
      external_visibility_requirements: contract.outcome.external_visibility_requirements,
    },
    expanded: effectiveMode === "workflow_expanded"
      ? {
          selected_tool: contract.selected_tool,
          workflow_steps: contract.workflow_steps,
          pattern_hints: contract.pattern_hints,
          provenance: contract.provenance,
        }
      : null,
    escalation: {
      requested_mode: requestedMode,
      effective_mode: effectiveMode,
      escalated: requestedMode !== effectiveMode,
      reasons,
      unresolved_blockers: uniqueStrings(args.unresolved_blockers ?? [], 16),
    },
  });
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(" | ") : "<none>";
}

export function renderExecutionAgentContractPacketMarkdown(packetInput: ExecutionAgentContractPacketV1): string[] {
  const packet = ExecutionAgentContractPacketV1Schema.parse(packetInput);
  const lines = [
    "Runtime contract:",
    `- task_family: ${packet.contract.task_family ?? "<unknown>"}`,
    packet.contract.task_prompt ? `- task_prompt: ${packet.contract.task_prompt}` : null,
    `- target_files: ${formatList(packet.contract.target_files)}`,
    `- next_action: ${packet.contract.next_action ?? "<none>"}`,
    `- acceptance_checks: ${formatList(packet.contract.acceptance_checks)}`,
    `- lifecycle_constraints: ${formatList(packet.contract.lifecycle_constraints)}`,
    `- authority_boundary: ${formatList(packet.contract.authority_boundary)}`,
  ].filter((line): line is string => Boolean(line));

  if (packet.mode === "workflow_expanded" && packet.expanded) {
    lines.push(
      "",
      "Expanded workflow:",
      ...packet.expanded.workflow_steps.map((step, index) => `${index + 1}. ${step}`),
    );
    if (packet.expanded.pattern_hints.length > 0) {
      lines.push("", "Pattern hints:", ...packet.expanded.pattern_hints.map((hint) => `- ${hint}`));
    }
    if (packet.escalation.reasons.length > 0) {
      lines.push("", `Escalation reasons: ${packet.escalation.reasons.join(", ")}`);
    }
  }

  return lines;
}

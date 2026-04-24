import { z } from "zod";
import { ContractTrustSchema, type ContractTrust } from "./contract-trust.js";
import type { ExecutionContractV1 } from "./execution-contract.js";

const EvidenceStringList = z.array(z.string().trim().min(1).max(256)).max(32).default([]);

export const ExecutionEvidenceV1Schema = z.object({
  schema_version: z.literal("execution_evidence_v1"),
  validation_passed: z.boolean().nullable().default(null),
  after_exit_revalidated: z.boolean().nullable().default(null),
  fresh_shell_probe_passed: z.boolean().nullable().default(null),
  failure_reason: z.string().trim().min(1).max(256).nullable().default(null),
  false_confidence_detected: z.boolean().default(false),
  evidence_refs: EvidenceStringList,
});
export type ExecutionEvidenceV1 = z.infer<typeof ExecutionEvidenceV1Schema>;

export const ExecutionEvidenceAssessmentV1Schema = z.object({
  schema_version: z.literal("execution_evidence_assessment_v1"),
  status: z.enum(["succeeded", "failed", "incomplete", "unknown"]),
  allows_authoritative: z.boolean(),
  allows_stable_promotion: z.boolean(),
  requested_trust: ContractTrustSchema.nullable(),
  effective_trust: ContractTrustSchema.nullable(),
  reasons: z.array(z.string().min(1).max(128)).max(16),
  decisive_fields: z.object({
    validation_passed: z.boolean().nullable(),
    after_exit_revalidated: z.boolean().nullable(),
    fresh_shell_probe_passed: z.boolean().nullable(),
    false_confidence_detected: z.boolean(),
    failure_reason_present: z.boolean(),
    requires_after_exit_revalidation: z.boolean(),
    requires_fresh_shell_probe: z.boolean(),
  }),
});
export type ExecutionEvidenceAssessmentV1 = z.infer<typeof ExecutionEvidenceAssessmentV1Schema>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function normalizeTrust(value: unknown): ContractTrust | null {
  const parsed = ContractTrustSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseEvidence(value: unknown): ExecutionEvidenceV1 | null {
  const record = asRecord(value);
  if (!record) return null;
  const parsed = ExecutionEvidenceV1Schema.safeParse({
    schema_version: "execution_evidence_v1",
    ...record,
  });
  return parsed.success ? parsed.data : null;
}

function metricEvidence(metrics: unknown): ExecutionEvidenceV1 | null {
  const record = asRecord(metrics);
  const successRatio = record && typeof record.success_ratio === "number" && Number.isFinite(record.success_ratio)
    ? record.success_ratio
    : null;
  if (successRatio == null) return null;
  return ExecutionEvidenceV1Schema.parse({
    schema_version: "execution_evidence_v1",
    validation_passed: successRatio >= 1,
    after_exit_revalidated: null,
    fresh_shell_probe_passed: null,
    failure_reason: successRatio >= 1 ? null : "source_metrics_success_ratio_below_one",
    false_confidence_detected: false,
    evidence_refs: ["source.metrics.success_ratio"],
  });
}

function inferRequiresAfterExit(contract: ExecutionContractV1 | null | undefined): boolean {
  if (!contract) return false;
  return contract.outcome.must_hold_after_exit.length > 0
    || contract.service_lifecycle_constraints.some((constraint) => constraint.must_survive_agent_exit);
}

function inferRequiresFreshShell(contract: ExecutionContractV1 | null | undefined): boolean {
  if (!contract) return false;
  return contract.service_lifecycle_constraints.some((constraint) => constraint.revalidate_from_fresh_shell)
    || contract.outcome.environment_assumptions.some((assumption) =>
      /fresh_shell|fresh shell|new shell|clean_client|clean client|validation_can_run_from_fresh_shell/i.test(assumption)
    )
    || contract.outcome.success_invariants.some((invariant) =>
      /fresh_shell|fresh shell|clean_client|clean client/i.test(invariant)
    )
    || contract.outcome.external_visibility_requirements.some((requirement) =>
      /clean_client|clean client|fresh_shell|fresh shell/i.test(requirement)
    );
}

function deriveStatus(args: {
  evidence: ExecutionEvidenceV1 | null;
  reasons: string[];
}): ExecutionEvidenceAssessmentV1["status"] {
  if (!args.evidence) return "unknown";
  if (
    args.evidence.validation_passed === false
    || args.evidence.after_exit_revalidated === false
    || args.evidence.fresh_shell_probe_passed === false
    || args.evidence.false_confidence_detected
  ) {
    return "failed";
  }
  if (args.reasons.length > 0) return "incomplete";
  return "succeeded";
}

function evidenceReason(prefix: string, value: string): string {
  return `${prefix}:${value}`.slice(0, 128);
}

export function extractExecutionEvidenceFromSlots(args: {
  slots?: Record<string, unknown> | null;
  metrics?: unknown;
}): ExecutionEvidenceV1 | null {
  const slots = args.slots ?? {};
  const executionResultSummary = asRecord(slots.execution_result_summary);
  return parseEvidence(slots.execution_evidence_v1)
    ?? parseEvidence(executionResultSummary?.execution_evidence_v1)
    ?? metricEvidence(args.metrics);
}

export function assessExecutionEvidence(args: {
  executionContract?: ExecutionContractV1 | null;
  evidence?: unknown;
  requestedTrust?: unknown;
  requiresAfterExitRevalidation?: boolean;
  requiresFreshShellProbe?: boolean;
}): ExecutionEvidenceAssessmentV1 {
  const evidence = parseEvidence(args.evidence);
  const requestedTrust = normalizeTrust(args.requestedTrust ?? args.executionContract?.contract_trust);
  const requiresAfterExitRevalidation =
    args.requiresAfterExitRevalidation ?? inferRequiresAfterExit(args.executionContract);
  const requiresFreshShellProbe =
    args.requiresFreshShellProbe ?? inferRequiresFreshShell(args.executionContract);
  const reasons: string[] = [];

  if (!evidence) {
    reasons.push("missing_execution_evidence");
  } else {
    if (evidence.validation_passed !== true) {
      reasons.push(evidence.validation_passed === false ? "validation_failed" : "missing_validation_passed");
    }
    if (requiresAfterExitRevalidation && evidence.after_exit_revalidated !== true) {
      reasons.push(
        evidence.after_exit_revalidated === false
          ? "after_exit_revalidation_failed"
          : "missing_after_exit_revalidation",
      );
    }
    if (requiresFreshShellProbe && evidence.fresh_shell_probe_passed !== true) {
      reasons.push(
        evidence.fresh_shell_probe_passed === false
          ? "fresh_shell_probe_failed"
          : "missing_fresh_shell_probe",
      );
    }
    if (evidence.false_confidence_detected) reasons.push("false_confidence_detected");
    if (evidence.failure_reason) reasons.push(evidenceReason("failure_reason", evidence.failure_reason));
  }

  const status = deriveStatus({ evidence, reasons });
  const allowsAuthoritative = requestedTrust === "authoritative" && status === "succeeded";
  const effectiveTrust = requestedTrust === "authoritative" && !allowsAuthoritative
    ? "advisory"
    : requestedTrust;

  return ExecutionEvidenceAssessmentV1Schema.parse({
    schema_version: "execution_evidence_assessment_v1",
    status,
    allows_authoritative: allowsAuthoritative,
    allows_stable_promotion: status === "succeeded",
    requested_trust: requestedTrust,
    effective_trust: effectiveTrust,
    reasons: Array.from(new Set(reasons)).slice(0, 16),
    decisive_fields: {
      validation_passed: evidence?.validation_passed ?? null,
      after_exit_revalidated: evidence?.after_exit_revalidated ?? null,
      fresh_shell_probe_passed: evidence?.fresh_shell_probe_passed ?? null,
      false_confidence_detected: evidence?.false_confidence_detected ?? false,
      failure_reason_present: !!evidence?.failure_reason,
      requires_after_exit_revalidation: requiresAfterExitRevalidation,
      requires_fresh_shell_probe: requiresFreshShellProbe,
    },
  });
}

export function buildExecutionEvidenceFromValidation(args: {
  validationPassed: boolean;
  afterExitRevalidated?: boolean | null;
  freshShellProbePassed?: boolean | null;
  failureReason?: string | null;
  falseConfidenceDetected?: boolean;
  evidenceRefs?: string[];
}): ExecutionEvidenceV1 {
  return ExecutionEvidenceV1Schema.parse({
    schema_version: "execution_evidence_v1",
    validation_passed: args.validationPassed,
    after_exit_revalidated: args.afterExitRevalidated ?? null,
    fresh_shell_probe_passed: args.freshShellProbePassed ?? null,
    failure_reason: args.failureReason ?? null,
    false_confidence_detected: args.falseConfidenceDetected ?? false,
    evidence_refs: args.evidenceRefs ?? [],
  });
}

import {
  runtimeAuthorityVisibilityFromEntry,
  type RuntimeAuthorityVisibilityV1,
} from "./authority-visibility.js";
import { parseExecutionContract, type ExecutionContractV1 } from "./execution-contract.js";
import type { ContractTrust } from "./contract-trust.js";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export function authorityVisibilityFromValue(value: unknown): RuntimeAuthorityVisibilityV1 | null {
  const record = asRecord(value);
  if (!record) return null;
  if (record.surface_version === "runtime_authority_visibility_v1") {
    return runtimeAuthorityVisibilityFromEntry({ authority_visibility: record });
  }
  return runtimeAuthorityVisibilityFromEntry(record);
}

export function authorityVisibilityRequiresInspection(
  visibility: RuntimeAuthorityVisibilityV1 | null | undefined,
): boolean {
  return visibility?.authority_blocked === true
    || visibility?.stable_promotion_blocked === true
    || visibility?.execution_evidence_status === "failed";
}

export function authorityVisibilityBlocksPromotionReadiness(
  visibility: RuntimeAuthorityVisibilityV1 | null | undefined,
): boolean {
  return visibility?.execution_evidence_status === "failed"
    || visibility?.false_confidence_detected === true;
}

export function authorityVisibilityPrimaryBlocker(
  visibility: RuntimeAuthorityVisibilityV1 | null | undefined,
): string | null {
  if (!visibility) return null;
  return firstString(
    visibility.primary_blocker,
    visibility.authority_reasons[0] ?? null,
    visibility.execution_evidence_status === "failed" ? "execution_evidence:failed" : null,
    visibility.stable_promotion_blocked ? "stable_promotion_blocked" : null,
    visibility.authority_blocked ? "authority_blocked" : null,
  );
}

export function demoteContractTrustForAuthorityBlock(
  trust: ContractTrust | null,
  requiresInspection: boolean,
): ContractTrust | null {
  if (!requiresInspection) return trust;
  if (trust === "observational") return "observational";
  return "advisory";
}

export function demoteContractTrustForAuthorityVisibility(
  trust: ContractTrust | null,
  visibility: RuntimeAuthorityVisibilityV1 | null | undefined,
): ContractTrust | null {
  return demoteContractTrustForAuthorityBlock(
    trust,
    authorityVisibilityRequiresInspection(visibility),
  );
}

export function buildAuthorityInspectionNextAction(args: {
  selectedTool: string | null;
  filePath: string | null;
  nextAction?: string | null;
  blocker: string | null;
  reuseTarget?: string;
}): string {
  const blocker = args.blocker ?? "authority_visibility_blocked";
  const reuseTarget = args.reuseTarget ?? "learned execution memory";
  if (args.selectedTool && args.filePath) {
    return `Inspect ${args.filePath} and revalidate current context before reusing ${args.selectedTool}; authority blocked by ${blocker}.`;
  }
  if (args.filePath) {
    return `Inspect ${args.filePath} and revalidate current context before reusing ${reuseTarget}; authority blocked by ${blocker}.`;
  }
  if (args.selectedTool) {
    return `Inspect current context before reusing ${args.selectedTool}; authority blocked by ${blocker}.`;
  }
  return args.nextAction
    ? `Inspect current context before following the learned next action; authority blocked by ${blocker}.`
    : `Inspect current context before reusing ${reuseTarget}; authority blocked by ${blocker}.`;
}

export function demoteExecutionContractForAuthorityVisibility(args: {
  contract: ExecutionContractV1;
  visibility: RuntimeAuthorityVisibilityV1 | null | undefined;
  selectedTool: string | null;
  filePath: string | null;
  reuseTarget?: string;
}): ExecutionContractV1 {
  if (!authorityVisibilityRequiresInspection(args.visibility)) return args.contract;
  const blocker = authorityVisibilityPrimaryBlocker(args.visibility);
  const parsed = parseExecutionContract({
    ...args.contract,
    contract_trust: demoteContractTrustForAuthorityVisibility(args.contract.contract_trust, args.visibility),
    next_action: buildAuthorityInspectionNextAction({
      selectedTool: args.selectedTool ?? args.contract.selected_tool,
      filePath: args.filePath ?? args.contract.file_path,
      nextAction: args.contract.next_action,
      blocker,
      reuseTarget: args.reuseTarget,
    }),
    provenance: {
      ...args.contract.provenance,
      notes: Array.from(new Set([
        ...args.contract.provenance.notes,
        `authority_visibility_requires_inspection:${blocker ?? "unknown"}`,
      ])).slice(0, 16),
    },
  });
  return parsed ?? args.contract;
}

import { z } from "zod";

export const ContractTrustSchema = z.enum(["authoritative", "advisory", "observational"]);
export type ContractTrust = z.infer<typeof ContractTrustSchema>;

const CONTRACT_TRUST_RANK: Record<ContractTrust, number> = {
  observational: 0,
  advisory: 1,
  authoritative: 2,
};

const GENERIC_SUCCESS_INVARIANTS = new Set([
  "all_acceptance_checks_pass",
  "target_files_reflect_the_intended_change_surface",
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function normalizeContractTrust(value: unknown): ContractTrust | null {
  const parsed = ContractTrustSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function minContractTrust(a: ContractTrust, b: ContractTrust): ContractTrust {
  return CONTRACT_TRUST_RANK[a] <= CONTRACT_TRUST_RANK[b] ? a : b;
}

export function evaluateAuthoritativeOutcomeContract(contract: unknown): {
  ok: boolean;
  reasons: string[];
  requires_service_lifecycle_outcome: boolean;
} {
  const parsedContract = asRecord(contract);
  const outcome = asRecord(parsedContract?.outcome);
  const acceptanceChecks = stringList(outcome?.acceptance_checks ?? parsedContract?.acceptance_checks);
  const successInvariants = stringList(outcome?.success_invariants ?? parsedContract?.success_invariants);
  const mustHoldAfterExit = stringList(outcome?.must_hold_after_exit ?? parsedContract?.must_hold_after_exit);
  const externalVisibilityRequirements = stringList(
    outcome?.external_visibility_requirements ?? parsedContract?.external_visibility_requirements,
  );
  const serviceLifecycleConstraints = Array.isArray(parsedContract?.service_lifecycle_constraints)
    ? parsedContract.service_lifecycle_constraints
    : [];

  const hasMeaningfulSuccessInvariant = successInvariants.some(
    (invariant) => !GENERIC_SUCCESS_INVARIANTS.has(invariant),
  );
  const acceptanceChecksBindSuccess =
    acceptanceChecks.length > 0
    && successInvariants.includes("all_acceptance_checks_pass");
  const hasVerifiableOutcome =
    hasMeaningfulSuccessInvariant
    || acceptanceChecksBindSuccess
    || (mustHoldAfterExit.length > 0 && externalVisibilityRequirements.length > 0);

  const requiresServiceLifecycleOutcome = serviceLifecycleConstraints.length > 0;
  const reasons: string[] = [];
  if (!hasVerifiableOutcome) reasons.push("missing_verifiable_success_outcome");
  if (requiresServiceLifecycleOutcome && mustHoldAfterExit.length === 0) {
    reasons.push("missing_must_hold_after_exit");
  }
  if (requiresServiceLifecycleOutcome && externalVisibilityRequirements.length === 0) {
    reasons.push("missing_external_visibility_requirements");
  }

  return {
    ok: reasons.length === 0,
    reasons,
    requires_service_lifecycle_outcome: requiresServiceLifecycleOutcome,
  };
}

export function hasAuthoritativeOutcomeSignal(contract: unknown): boolean {
  return evaluateAuthoritativeOutcomeContract(contract).ok;
}

export function resolveContractTrustForSteering(args: {
  computedTrust: ContractTrust;
  explicitTrust?: ContractTrust | null;
  executionContract?: unknown;
}): ContractTrust {
  const explicitTrust = normalizeContractTrust(args.explicitTrust);
  const candidate = explicitTrust
    ? minContractTrust(explicitTrust, args.computedTrust)
    : args.computedTrust;

  if (candidate !== "authoritative") return candidate;

  if (explicitTrust !== "authoritative") return "advisory";
  if (!evaluateAuthoritativeOutcomeContract(args.executionContract).ok) return "advisory";
  return "authoritative";
}

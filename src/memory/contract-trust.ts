import { z } from "zod";

export const ContractTrustSchema = z.enum(["authoritative", "advisory", "observational"]);
export type ContractTrust = z.infer<typeof ContractTrustSchema>;

const CONTRACT_TRUST_RANK: Record<ContractTrust, number> = {
  observational: 0,
  advisory: 1,
  authoritative: 2,
};

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

export function hasAuthoritativeOutcomeSignal(contract: unknown): boolean {
  const parsedContract = asRecord(contract);
  const outcome = asRecord(parsedContract?.outcome);
  return stringList(outcome?.success_invariants).length > 0;
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
  if (!hasAuthoritativeOutcomeSignal(args.executionContract)) return "advisory";
  return "authoritative";
}

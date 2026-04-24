import { z } from "zod";

export const ContractTrustSchema = z.enum(["authoritative", "advisory", "observational"]);
export type ContractTrust = z.infer<typeof ContractTrustSchema>;

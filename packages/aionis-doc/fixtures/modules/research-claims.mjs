export const manifest = {
  module: "research.claims.v1",
  version: "1.0.0",
  deterministic: true,
  required_capabilities: ["direct_execution"],
  input_contract: {
    kind: "object",
    properties: {
      product: { kind: "string" },
      objective: { kind: "string" }
    },
    required: ["objective"],
    additional_properties: true
  },
  output_contract: {
    kind: "object",
    properties: {
      claims: {
        kind: "array",
        items: { kind: "string" }
      }
    },
    required: ["claims"],
    additional_properties: false
  }
};

export async function handler(input) {
  const product = input && typeof input === "object" && typeof input.product === "string" ? input.product : "Aionis";
  const objective = input && typeof input === "object" && typeof input.objective === "string" ? input.objective : "Explain execution";
  return {
    output: {
      claims: [
        `${product} turns documents into executable workflows.`,
        `${objective} without depending on memory publish or recover.`
      ]
    },
    kind: "module_result"
  };
}

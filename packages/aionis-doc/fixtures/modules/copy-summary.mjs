export const manifest = {
  module: "copy.summary.v1",
  version: "1.0.0",
  deterministic: true,
  required_capabilities: ["direct_execution"],
  input_contract: {
    kind: "object",
    properties: {
      claims: {
        kind: "array",
        items: { kind: "string" }
      }
    },
    required: ["claims"],
    additional_properties: false
  },
  output_contract: {
    kind: "object",
    properties: {
      summary: { kind: "string" }
    },
    required: ["summary"],
    additional_properties: false
  }
};

export async function handler(input) {
  const claims = input && typeof input === "object" && Array.isArray(input.claims) ? input.claims.filter((item) => typeof item === "string") : [];
  return {
    output: {
      summary: claims.join(" ")
    },
    kind: "module_result"
  };
}

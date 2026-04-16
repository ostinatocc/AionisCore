@doc {
  id: "standalone-runner-001"
  version: "1.0"
  kind: "workflow"
}

@context {
  product: "Aionis Doc"
  objective: "Explain standalone execution"
}

@execute {
  module: "research.claims.v1"
  input_ref: "ctx"
  output_ref: "run.claims"
}

@execute {
  module: "copy.summary.v1"
  input_ref: "run.claims"
  output_ref: "out.summary"
  depends_on: ["run.claims"]
}

@replay {
  executable: true
  mode: "deterministic"
  expected_outputs: ["out.summary"]
}

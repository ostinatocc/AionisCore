import {
  buildHandoffStoreRequestFromRuntimeHandoff,
  buildRuntimeHandoffV1,
  compileAionisDoc,
  compileAndExecuteAionisDoc,
  runAionisDoc,
} from "@aionis/doc";

const source = `@doc {
  id: "demo-001"
  version: "1.0"
  kind: "task"
}

# Goal
Compile a minimal Aionis document.

@context {
  objective: "Say hello"
}

@execute {
  module: "demo.hello.v1"
  input_ref: "ctx"
  output_ref: "out.message"
}

@replay {
  executable: true
  mode: "assisted"
  expected_outputs: ["out.message"]
}`;

if (typeof runAionisDoc !== "function") {
  throw new Error("runAionisDoc export missing");
}

if (typeof compileAndExecuteAionisDoc !== "function") {
  throw new Error("compileAndExecuteAionisDoc export missing");
}

const compile = compileAionisDoc(source);

if (compile.ir.doc?.id !== "demo-001") {
  throw new Error("compileAionisDoc did not return the expected doc id");
}

if (compile.diagnostics.length !== 0) {
  throw new Error(`compileAionisDoc returned diagnostics: ${compile.diagnostics.length}`);
}

const handoff = buildRuntimeHandoffV1({
  inputPath: "./workflow.aionis.md",
  filePath: "workflow.aionis.md",
  repoRoot: "/tmp/aionis-doc-release-baseline",
  result: compile,
  scope: "docs",
});

const storeRequest = buildHandoffStoreRequestFromRuntimeHandoff({
  handoff,
  tenantId: "default",
  actor: "release-baseline",
  scope: "docs",
});

if (handoff.source_doc_id !== "demo-001") {
  throw new Error("runtime handoff source_doc_id mismatch");
}

if (storeRequest.anchor !== handoff.execution_ready_handoff.anchor) {
  throw new Error("handoff store request anchor mismatch");
}

if (!storeRequest.tags.includes("aionis-doc")) {
  throw new Error("handoff store request missing aionis-doc tag");
}

console.log(JSON.stringify({
  ok: true,
  package_name: "@aionis/doc",
  doc_id: compile.ir.doc.id,
  handoff_anchor: handoff.execution_ready_handoff.anchor,
  store_request_title: storeRequest.title,
  exports_checked: [
    "compileAionisDoc",
    "buildRuntimeHandoffV1",
    "buildHandoffStoreRequestFromRuntimeHandoff",
    "runAionisDoc",
    "compileAndExecuteAionisDoc",
  ],
}, null, 2));

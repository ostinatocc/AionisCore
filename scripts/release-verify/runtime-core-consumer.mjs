import {
  RUNTIME_CORE_BOUNDARY,
  RUNTIME_CORE_SHARED_SURFACES,
  runtimeCoreBoundarySummary,
} from "@cognary/aionis-runtime-core";

if (!Array.isArray(RUNTIME_CORE_BOUNDARY) || RUNTIME_CORE_BOUNDARY.length === 0) {
  throw new Error("RUNTIME_CORE_BOUNDARY export missing");
}

if (!Array.isArray(RUNTIME_CORE_SHARED_SURFACES) || RUNTIME_CORE_SHARED_SURFACES.length === 0) {
  throw new Error("RUNTIME_CORE_SHARED_SURFACES export missing");
}

const summary = runtimeCoreBoundarySummary();

if (!summary || !Array.isArray(summary.shared_core)) {
  throw new Error("runtimeCoreBoundarySummary export missing");
}

console.log(JSON.stringify({
  ok: true,
  package_name: "@cognary/aionis-runtime-core",
  exports_checked: [
    "RUNTIME_CORE_BOUNDARY",
    "RUNTIME_CORE_SHARED_SURFACES",
    "runtimeCoreBoundarySummary"
  ]
}, null, 2));

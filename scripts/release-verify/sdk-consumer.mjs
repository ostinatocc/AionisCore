import { createAionisClient, AionisSdkHttpError } from "@cognary/aionis";

const client = createAionisClient({
  baseUrl: "http://127.0.0.1:3001",
});

if (typeof createAionisClient !== "function") {
  throw new Error("createAionisClient export missing");
}

if (!(AionisSdkHttpError.prototype instanceof Error)) {
  throw new Error("AionisSdkHttpError does not extend Error");
}

if (typeof client.memory.write !== "function") {
  throw new Error("memory.write export missing");
}

if (typeof client.memory.planningContext !== "function") {
  throw new Error("memory.planningContext export missing");
}

if (typeof client.memory.contextAssemble !== "function") {
  throw new Error("memory.contextAssemble export missing");
}

if (typeof client.memory.executionIntrospect !== "function") {
  throw new Error("memory.executionIntrospect export missing");
}

if (typeof client.memory.tools.select !== "function") {
  throw new Error("memory.tools.select export missing");
}

if (typeof client.memory.tools.feedback !== "function") {
  throw new Error("memory.tools.feedback export missing");
}

if (typeof client.memory.replay.repairReview !== "function") {
  throw new Error("memory.replay.repairReview export missing");
}

if (typeof client.memory.anchors.rehydratePayload !== "function") {
  throw new Error("memory.anchors.rehydratePayload export missing");
}

console.log(JSON.stringify({
  ok: true,
  package_name: "@cognary/aionis",
  exports_checked: [
    "createAionisClient",
    "AionisSdkHttpError",
    "memory.write",
    "memory.planningContext",
    "memory.contextAssemble",
    "memory.executionIntrospect",
    "memory.tools.select",
    "memory.tools.feedback",
    "memory.replay.repairReview",
    "memory.anchors.rehydratePayload"
  ]
}, null, 2));

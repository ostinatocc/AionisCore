import {
  createAionisClient,
  createAionisRuntimeClient,
  createAionisHostBridge,
  AionisRuntimeSdkHttpError,
} from "@ostinato/aionis";

const client = createAionisRuntimeClient({
  baseUrl: "http://127.0.0.1:3001",
});

const compatClient = createAionisClient({
  baseUrl: "http://127.0.0.1:3001",
});

const bridge = createAionisHostBridge({
  baseUrl: "http://127.0.0.1:3001",
  tenantId: "default",
  scope: "default",
  actor: "release-baseline",
});

if (typeof createAionisClient !== "function") {
  throw new Error("createAionisClient export missing");
}

if (typeof createAionisRuntimeClient !== "function") {
  throw new Error("createAionisRuntimeClient export missing");
}

if (typeof createAionisHostBridge !== "function") {
  throw new Error("createAionisHostBridge export missing");
}

if (!(AionisRuntimeSdkHttpError.prototype instanceof Error)) {
  throw new Error("AionisRuntimeSdkHttpError does not extend Error");
}

if (typeof compatClient.memory.write !== "function") {
  throw new Error("memory.write export missing");
}

if (typeof client.system.health !== "function") {
  throw new Error("system.health export missing");
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

if (typeof client.handoff.store !== "function") {
  throw new Error("handoff.store export missing");
}

if (typeof client.memory.replay.playbooks.run !== "function") {
  throw new Error("memory.replay.playbooks.run export missing");
}

if (typeof client.memory.anchors.rehydratePayload !== "function") {
  throw new Error("memory.anchors.rehydratePayload export missing");
}

if (typeof bridge.startTask !== "function" || typeof bridge.completeTask !== "function") {
  throw new Error("host bridge methods missing");
}

console.log(JSON.stringify({
  ok: true,
  package_name: "@ostinato/aionis",
  exports_checked: [
    "createAionisClient",
    "createAionisRuntimeClient",
    "createAionisHostBridge",
    "AionisRuntimeSdkHttpError",
    "system.health",
    "memory.write",
    "memory.planningContext",
    "memory.contextAssemble",
    "memory.executionIntrospect",
    "memory.tools.select",
    "memory.tools.feedback",
    "handoff.store",
    "memory.replay.playbooks.run",
    "memory.anchors.rehydratePayload",
    "bridge.startTask",
    "bridge.completeTask"
  ]
}, null, 2));

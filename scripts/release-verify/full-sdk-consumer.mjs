import {
  createAionisRuntimeClient,
  createAionisHostBridge,
  AionisRuntimeSdkHttpError,
} from "@cognary/aionis-sdk";

const client = createAionisRuntimeClient({
  baseUrl: "http://127.0.0.1:3001",
});

const bridge = createAionisHostBridge({
  baseUrl: "http://127.0.0.1:3001",
  tenantId: "default",
  scope: "default",
  actor: "release-baseline",
});

if (typeof createAionisRuntimeClient !== "function") {
  throw new Error("createAionisRuntimeClient export missing");
}

if (typeof createAionisHostBridge !== "function") {
  throw new Error("createAionisHostBridge export missing");
}

if (!(AionisRuntimeSdkHttpError.prototype instanceof Error)) {
  throw new Error("AionisRuntimeSdkHttpError does not extend Error");
}

if (typeof client.system.health !== "function") {
  throw new Error("system.health export missing");
}

if (typeof client.memory.recallText !== "function") {
  throw new Error("memory.recallText export missing");
}

if (typeof client.handoff.store !== "function") {
  throw new Error("handoff.store export missing");
}

if (typeof client.memory.replay.run.start !== "function") {
  throw new Error("memory.replay.run.start export missing");
}

if (typeof bridge.startTask !== "function" || typeof bridge.completeTask !== "function") {
  throw new Error("host bridge methods missing");
}

console.log(JSON.stringify({
  ok: true,
  package_name: "@cognary/aionis-sdk",
  exports_checked: [
    "createAionisRuntimeClient",
    "createAionisHostBridge",
    "AionisRuntimeSdkHttpError",
    "system.health",
    "memory.recallText",
    "handoff.store",
    "memory.replay.run.start",
    "bridge.startTask",
    "bridge.completeTask"
  ]
}, null, 2));

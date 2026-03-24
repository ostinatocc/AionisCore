import { createExampleClient, createScope, DEFAULT_TENANT_ID, isMain, printHeading, printJson, printStep, runExample } from "./shared.js";

async function main() {
  const aionis = createExampleClient();
  const scope = createScope("full-sdk-sandbox");

  printHeading("Full SDK Sandbox Runtime");
  printStep(`scope=${scope}`);

  const session = await aionis.memory.sandbox.sessions.create({
    tenant_id: DEFAULT_TENANT_ID,
    scope,
    actor: "full-sdk-example",
    profile: "default",
    metadata: {
      source: "full-sdk-example",
    },
  });
  printJson("sandbox_session_create", session);

  const sessionId =
    typeof (session as Record<string, unknown>).session_id === "string"
      ? ((session as Record<string, unknown>).session_id as string)
      : typeof ((session as Record<string, unknown>).session as Record<string, unknown> | undefined)?.session_id === "string"
        ? ((((session as Record<string, unknown>).session as Record<string, unknown>).session_id) as string)
        : null;

  if (!sessionId) {
    throw new Error("sandbox session create did not return session_id");
  }

  const run = await aionis.memory.sandbox.execute({
    tenant_id: DEFAULT_TENANT_ID,
    scope,
    actor: "full-sdk-example",
    session_id: sessionId,
    mode: "sync",
    action: {
      kind: "command",
      argv: ["echo", "hello-from-aionis-sandbox"],
    },
  });
  printJson("sandbox_execute", run);

  const runId =
    typeof ((run as Record<string, unknown>).run as Record<string, unknown> | undefined)?.run_id === "string"
      ? ((((run as Record<string, unknown>).run as Record<string, unknown>).run_id) as string)
      : null;

  if (!runId) {
    throw new Error("sandbox execute did not return run.run_id");
  }

  const fetched = await aionis.memory.sandbox.runs.get({
    tenant_id: DEFAULT_TENANT_ID,
    scope,
    run_id: runId,
  });
  printJson("sandbox_run_get", fetched);

  const logs = await aionis.memory.sandbox.runs.logs({
    tenant_id: DEFAULT_TENANT_ID,
    scope,
    run_id: runId,
  });
  printJson("sandbox_run_logs", logs);

  const artifact = await aionis.memory.sandbox.runs.artifact({
    tenant_id: DEFAULT_TENANT_ID,
    scope,
    run_id: runId,
  });
  printJson("sandbox_run_artifact", artifact);
}

if (isMain(import.meta.url)) {
  await runExample(main);
}

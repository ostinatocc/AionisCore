import { randomUUID } from "node:crypto";
import { createExampleClient, createScope, DEFAULT_TENANT_ID, isMain, printHeading, printJson, printStep, runExample } from "./shared.js";

async function main() {
  const aionis = createExampleClient();
  const scope = createScope("full-sdk-automation");
  const automationId = `automation-${randomUUID()}`;

  printHeading("Full SDK Automation Kernel");
  printStep(`scope=${scope}`);
  printStep(`automationId=${automationId}`);

  const graph = {
    nodes: [
      {
        node_id: "check-ready",
        kind: "condition",
        name: "Check Ready",
        expression: true,
      },
    ],
    edges: [],
  };

  const validation = await aionis.automations.validate({
    tenant_id: DEFAULT_TENANT_ID,
    scope,
    graph,
  });
  printJson("automation_validate", validation);

  const created = await aionis.automations.create({
    tenant_id: DEFAULT_TENANT_ID,
    scope,
    actor: "full-sdk-example",
    automation_id: automationId,
    name: "SDK Automation Kernel Example",
    status: "draft",
    graph,
    metadata: {
      source: "full-sdk-example",
    },
  });
  printJson("automation_create", created);

  const fetched = await aionis.automations.get({
    tenant_id: DEFAULT_TENANT_ID,
    scope,
    automation_id: automationId,
  });
  printJson("automation_get", fetched);

  const listed = await aionis.automations.list({
    tenant_id: DEFAULT_TENANT_ID,
    scope,
    limit: 10,
  });
  printJson("automation_list", listed);

  const run = await aionis.automations.run({
    tenant_id: DEFAULT_TENANT_ID,
    scope,
    actor: "full-sdk-example",
    automation_id: automationId,
    options: {
      execution_mode: "default",
      record_run: true,
      stop_on_failure: true,
    },
  });
  printJson("automation_run", run);

  const runId = typeof (run as Record<string, unknown>).run_id === "string"
    ? ((run as Record<string, unknown>).run_id as string)
    : typeof ((run as Record<string, unknown>).run as Record<string, unknown> | undefined)?.run_id === "string"
      ? ((((run as Record<string, unknown>).run as Record<string, unknown>).run_id) as string)
      : null;

  if (!runId) {
    throw new Error("automation run did not return run_id");
  }

  const runFetched = await aionis.automations.runs.get({
    tenant_id: DEFAULT_TENANT_ID,
    scope,
    run_id: runId,
    include_nodes: true,
  });
  printJson("automation_run_get", runFetched);

  const runsListed = await aionis.automations.runs.list({
    tenant_id: DEFAULT_TENANT_ID,
    scope,
    automation_id: automationId,
    limit: 10,
  });
  printJson("automation_runs_list", runsListed);
}

if (isMain(import.meta.url)) {
  await runExample(main);
}

import { createExampleClient, DEFAULT_SCOPE, DEFAULT_TENANT_ID, isMain, printHeading, printJson, printStep, runExample } from "./shared.ts";

async function main() {
  const client = createExampleClient();

  printHeading("Agent Memory Diagnostics");
  printStep("Inspecting the agent-memory facade.");

  const inspect = await client.memory.agent.inspect({
    tenant_id: DEFAULT_TENANT_ID,
    scope: DEFAULT_SCOPE,
    query_text: "repair export failure in src/routes/export.ts",
    context: {
      goal: "repair export failure in src/routes/export.ts",
      repo_root: process.cwd(),
      file_path: "src/routes/export.ts",
    },
    candidates: ["bash", "edit", "test"],
    anchor: "resume:src/routes/export.ts",
    file_path: "src/routes/export.ts",
    repo_root: process.cwd(),
    handoff_kind: "patch_handoff",
  });

  printJson("Agent Inspect", inspect);

  printStep("Inspecting the evolution review pack for the same task.");
  const evolution = await client.memory.reviewPacks.evolution({
    tenant_id: DEFAULT_TENANT_ID,
    scope: DEFAULT_SCOPE,
    query_text: "repair export failure in src/routes/export.ts",
    context: {
      goal: "repair export failure in src/routes/export.ts",
      repo_root: process.cwd(),
      file_path: "src/routes/export.ts",
    },
    candidates: ["bash", "edit", "test"],
  });

  printJson("Evolution Review", evolution);
}

if (isMain(import.meta.url)) {
  await runExample(main);
}

export default main;

import { createExampleClient, DEFAULT_SCOPE, DEFAULT_TENANT_ID, isMain, printHeading, printJson, printStep, runExample } from "./shared.js";

async function main() {
  const playbookId = process.env.AIONIS_PLAYBOOK_ID;
  if (!playbookId) {
    throw new Error("Set AIONIS_PLAYBOOK_ID to an existing pending replay playbook before running this example.");
  }

  const aionis = createExampleClient();

  printHeading("Replay Repair Review");
  printStep(`Approving replay playbook ${playbookId} with learning projection enabled.`);

  const review = await aionis.memory.replay.repairReview({
    tenant_id: DEFAULT_TENANT_ID,
    scope: DEFAULT_SCOPE,
    playbook_id: playbookId,
    action: "approve",
    auto_shadow_validate: false,
    target_status_on_approve: "shadow",
    learning_projection: {
      enabled: true,
    },
  }) as Record<string, any>;

  printJson("Replay repair review", {
    review_status: review?.review?.status ?? null,
    learning_projection_result: review?.learning_projection_result ?? null,
    governance_preview: review?.governance_preview ?? null,
  });
}

if (isMain(import.meta.url)) {
  await runExample(main);
}

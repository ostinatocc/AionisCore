import { randomUUID } from "node:crypto";
import { buildToolsSelectPayload, createExampleClient, DEFAULT_ACTOR, DEFAULT_TENANT_ID, isMain, printHeading, printJson, printStep, runExample } from "./shared.js";

async function recordPositiveToolFeedback(args: { runId: string; scope: string }) {
  const aionis = createExampleClient();
  const selection = await aionis.memory.tools.select(
    buildToolsSelectPayload({
      runId: args.runId,
      scope: args.scope,
    }),
  ) as Record<string, any>;

  const selectedTool = selection?.selection?.selected ?? selection?.decision?.selected_tool ?? "edit";
  const decisionId = selection?.decision?.decision_id;
      if (typeof decisionId !== "string" || decisionId.length === 0) {
    throw new Error("tools.select did not return decision.decision_id");
  }

  const feedback = await aionis.memory.tools.feedback({
    tenant_id: DEFAULT_TENANT_ID,
    scope: args.scope,
    actor: DEFAULT_ACTOR,
    run_id: args.runId,
    decision_id: decisionId,
    outcome: "positive",
    context: {
      task_kind: "repair_export",
      goal: "repair export failure in node tests",
      error: {
        signature: "node-export-mismatch",
      },
    },
    candidates: ["bash", "edit", "test"],
    selected_tool: selectedTool,
    target: "tool",
    note: `SDK example positive grouped evidence for ${selectedTool}`,
    input_text: "repair export failure in node tests",
  }) as Record<string, any>;

  return {
    selection,
    feedback,
  };
}

async function main() {
  const exampleTag = randomUUID().slice(0, 8);
  const scope = `sdk-example-tools-${exampleTag}`;
  printHeading("Tools Feedback Pattern");
  printStep("Recording three positive tool-feedback runs to grow a reusable pattern.");

  const first = await recordPositiveToolFeedback({
    runId: `sdk-example-tools-run-${randomUUID()}`,
    scope,
  });
  const second = await recordPositiveToolFeedback({
    runId: `sdk-example-tools-run-${randomUUID()}`,
    scope,
  });
  const third = await recordPositiveToolFeedback({
    runId: `sdk-example-tools-run-${randomUUID()}`,
    scope,
  });

  printJson("First feedback", {
    selected_tool: first.selection?.selection?.selected ?? null,
    pattern_anchor: first.feedback?.pattern_anchor ?? null,
    governance_preview: first.feedback?.governance_preview ?? null,
  });

  printJson("Third feedback", {
    selected_tool: third.selection?.selection?.selected ?? null,
    pattern_anchor: third.feedback?.pattern_anchor ?? null,
    governance_preview: third.feedback?.governance_preview ?? null,
    selection_summary_hint: second.selection?.selection_summary ?? null,
  });
}

if (isMain(import.meta.url)) {
  await runExample(main);
}

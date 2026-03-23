import { randomUUID } from "node:crypto";
import { buildExecutionWritePayload, buildPlanningPayload, createExampleClient, isMain, printHeading, printJson, printStep, runExample } from "./shared.js";

async function main() {
  const aionis = createExampleClient();
  const exampleTag = randomUUID().slice(0, 8);
  const taskBrief = `Fix export failure in node tests [sdk-workflow-${exampleTag}]`;
  const scope = `sdk-example-workflow-${exampleTag}`;
  const filePath = "src/routes/export.ts";
  const planningPayload = buildPlanningPayload({
    queryText: taskBrief,
    goal: taskBrief,
    scope,
  });

  printHeading("Workflow Guidance");
  printStep("Writing the first execution-continuity event.");
  await aionis.memory.write(
    buildExecutionWritePayload({
      title: "SDK example export repair run one",
      inputText: "continue fixing export resolver first sdk example run",
      taskBrief,
      filePath,
      scope,
    }),
  );

  const firstPlanning = await aionis.memory.planningContext(planningPayload) as Record<string, any>;

  printJson("After first write", {
    candidate_workflow_count: firstPlanning?.planner_packet?.sections?.candidate_workflows?.length ?? null,
    recommended_workflow_count: firstPlanning?.planner_packet?.sections?.recommended_workflows?.length ?? null,
    planner_explanation: firstPlanning?.planning_summary?.planner_explanation ?? null,
    workflow_signals: firstPlanning?.workflow_signals ?? [],
  });

  printStep("Writing the second distinct execution-continuity event.");
  await aionis.memory.write(
    buildExecutionWritePayload({
      title: "SDK example export repair run two",
      inputText: "continue fixing export resolver second sdk example run",
      taskBrief,
      filePath,
      scope,
    }),
  );

  const secondPlanning = await aionis.memory.planningContext(planningPayload) as Record<string, any>;

  printJson("After second write", {
    candidate_workflow_count: secondPlanning?.planner_packet?.sections?.candidate_workflows?.length ?? null,
    recommended_workflow_count: secondPlanning?.planner_packet?.sections?.recommended_workflows?.length ?? null,
    workflow_anchor_ids: secondPlanning?.execution_kernel?.action_packet_summary?.workflow_anchor_ids ?? [],
    planner_explanation: secondPlanning?.planning_summary?.planner_explanation ?? null,
    workflow_signals: secondPlanning?.workflow_signals ?? [],
  });
}

if (isMain(import.meta.url)) {
  await runExample(main);
}

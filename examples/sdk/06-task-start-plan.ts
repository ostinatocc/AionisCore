import { randomUUID } from "node:crypto";
import {
  buildExecutionWritePayload,
  createExampleClient,
  isMain,
  printHeading,
  printJson,
  printStep,
  runExample,
} from "./shared.js";

async function main() {
  const aionis = createExampleClient();
  const exampleTag = randomUUID().slice(0, 8);
  const scope = `sdk-example-task-start-plan-${exampleTag}`;
  const taskBrief = `Repair billing retry timeout in service code [sdk-task-start-${exampleTag}]`;
  const filePath = "src/services/billing.ts";
  const kickoffPayload = {
    tenant_id: "default",
    scope,
    query_text: taskBrief,
    context: {
      goal: taskBrief,
    },
    candidates: ["bash", "edit", "test"],
  } as const;

  printHeading("Task Start Plan");

  printStep("Calling taskStartPlan before any learned workflow exists.");
  const beforeLearning = await aionis.memory.taskStartPlan(kickoffPayload);
  printJson("Before learning", {
    resolution_source: beforeLearning.resolution_source,
    kickoff_recommendation: beforeLearning.kickoff_recommendation,
    first_action: beforeLearning.first_action,
    planner_explanation: beforeLearning.planner_explanation,
  });

  printStep("Writing the first execution-continuity example for the billing repair.");
  await aionis.memory.write(
    buildExecutionWritePayload({
      title: "SDK example billing retry repair run one",
      inputText: "continue fixing billing retry timeout first sdk example run",
      taskBrief,
      filePath,
      scope,
    }),
  );

  printStep("Writing the second execution-continuity example to promote a learned kickoff.");
  await aionis.memory.write(
    buildExecutionWritePayload({
      title: "SDK example billing retry repair run two",
      inputText: "continue fixing billing retry timeout second sdk example run",
      taskBrief,
      filePath,
      scope,
    }),
  );

  const afterLearning = await aionis.memory.taskStartPlan(kickoffPayload);
  printJson("After learning", {
    resolution_source: afterLearning.resolution_source,
    kickoff_recommendation: afterLearning.kickoff_recommendation,
    first_action: afterLearning.first_action,
    planner_explanation: afterLearning.planner_explanation,
  });
}

if (isMain(import.meta.url)) {
  await runExample(main);
}

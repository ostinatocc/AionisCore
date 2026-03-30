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

function toHostAction(taskStartPlan: Awaited<ReturnType<ReturnType<typeof createExampleClient>["memory"]["taskStartPlan"]>>) {
  return {
    resolution_source: taskStartPlan.resolution_source,
    selected_tool: taskStartPlan.first_action?.selected_tool ?? null,
    file_path: taskStartPlan.first_action?.file_path ?? null,
    next_action: taskStartPlan.first_action?.next_action ?? null,
  };
}

async function main() {
  const aionis = createExampleClient();
  const exampleTag = randomUUID().slice(0, 8);
  const scope = `sdk-example-learning-loop-${exampleTag}`;
  const taskBrief = `Repair billing retry timeout in service code [sdk-learning-loop-${exampleTag}]`;
  const filePath = "src/services/billing.ts";
  const taskStartPayload = {
    tenant_id: "default",
    scope,
    query_text: taskBrief,
    context: {
      goal: taskBrief,
      host: "demo-learning-loop",
    },
    candidates: ["bash", "edit", "test"],
  } as const;

  printHeading("Task Start Learning Loop");

  printStep("1. Host asks for a startup plan before any relevant history exists.");
  const firstPlan = await aionis.memory.taskStartPlan(taskStartPayload);
  printJson("Cold start", {
    host_action: toHostAction(firstPlan),
    planner_explanation: firstPlan.planner_explanation,
  });

  printStep("2. Host executes two successful repair runs and writes continuity memory back to Aionis.");
  await aionis.memory.write(
    buildExecutionWritePayload({
      title: "SDK learning loop billing repair run one",
      inputText: "continue fixing billing retry timeout first learning loop run",
      taskBrief,
      filePath,
      scope,
    }),
  );
  await aionis.memory.write(
    buildExecutionWritePayload({
      title: "SDK learning loop billing repair run two",
      inputText: "continue fixing billing retry timeout second learning loop run",
      taskBrief,
      filePath,
      scope,
    }),
  );

  printStep("3. Host asks again and now gets a learned file-level kickoff.");
  const secondPlan = await aionis.memory.taskStartPlan(taskStartPayload);
  printJson("Warm start", {
    host_action: toHostAction(secondPlan),
    planner_explanation: secondPlan.planner_explanation,
  });

  printStep("4. Host can now launch the next task directly from the learned first action.");
  printJson("Launch packet", {
    task_query: taskStartPayload.query_text,
    startup_mode: secondPlan.resolution_source,
    first_action: secondPlan.first_action,
  });
}

if (isMain(import.meta.url)) {
  await runExample(main);
}

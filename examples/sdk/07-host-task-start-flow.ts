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

type HostTaskStartDecision = {
  startup_mode: "learned_kickoff" | "planner_fallback" | "manual_triage";
  tool: string | null;
  file_path: string | null;
  instruction: string | null;
  planner_explanation: string | null;
};

function buildHostDecision(taskStartPlan: Awaited<ReturnType<ReturnType<typeof createExampleClient>["memory"]["taskStartPlan"]>>): HostTaskStartDecision {
  if (taskStartPlan.first_action) {
    return {
      startup_mode: taskStartPlan.resolution_source === "kickoff" ? "learned_kickoff" : "planner_fallback",
      tool: taskStartPlan.first_action.selected_tool,
      file_path: taskStartPlan.first_action.file_path,
      instruction: taskStartPlan.first_action.next_action,
      planner_explanation: taskStartPlan.planner_explanation,
    };
  }

  return {
    startup_mode: "manual_triage",
    tool: null,
    file_path: null,
    instruction: null,
    planner_explanation: taskStartPlan.planner_explanation ?? taskStartPlan.rationale.summary,
  };
}

async function main() {
  const aionis = createExampleClient();
  const exampleTag = randomUUID().slice(0, 8);
  const scope = `sdk-example-host-task-start-${exampleTag}`;
  const taskBrief = `Repair export response serialization mismatch [sdk-host-start-${exampleTag}]`;
  const filePath = "src/routes/export.ts";
  const taskStartPayload = {
    tenant_id: "default",
    scope,
    query_text: taskBrief,
    context: {
      goal: taskBrief,
      host: "demo-planner",
    },
    candidates: ["bash", "edit", "test"],
  } as const;

  printHeading("Host Task Start Flow");

  printStep("Host asks Aionis for a startup plan before any learned history exists.");
  const coldStart = await aionis.memory.taskStartPlan(taskStartPayload);
  printJson("Cold start host decision", buildHostDecision(coldStart));

  printStep("Host records two successful continuity writes for the same repair family.");
  await aionis.memory.write(
    buildExecutionWritePayload({
      title: "SDK host flow export repair run one",
      inputText: "continue fixing export response mismatch first host example run",
      taskBrief,
      filePath,
      scope,
    }),
  );
  await aionis.memory.write(
    buildExecutionWritePayload({
      title: "SDK host flow export repair run two",
      inputText: "continue fixing export response mismatch second host example run",
      taskBrief,
      filePath,
      scope,
    }),
  );

  printStep("Host asks again and now receives a learned kickoff-ready first action.");
  const warmStart = await aionis.memory.taskStartPlan(taskStartPayload);
  printJson("Warm start host decision", buildHostDecision(warmStart));
  printJson("Raw taskStartPlan response", {
    resolution_source: warmStart.resolution_source,
    kickoff_recommendation: warmStart.kickoff_recommendation,
    first_action: warmStart.first_action,
    planner_explanation: warmStart.planner_explanation,
  });
}

if (isMain(import.meta.url)) {
  await runExample(main);
}

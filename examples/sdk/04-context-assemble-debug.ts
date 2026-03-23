import { randomUUID } from "node:crypto";
import { buildExecutionWritePayload, buildPlanningPayload, createExampleClient, isMain, printHeading, printJson, printStep, runExample } from "./shared.js";

async function main() {
  const aionis = createExampleClient();
  const exampleTag = randomUUID().slice(0, 8);
  const taskBrief = `Fix export failure in node tests [sdk-context-${exampleTag}]`;
  const scope = `sdk-example-context-${exampleTag}`;
  const filePath = "src/routes/export.ts";
  const contextPayload = {
    ...buildPlanningPayload({
      queryText: taskBrief,
      goal: taskBrief,
      scope,
    }),
    return_layered_context: true,
  };

  printHeading("Context Assemble Debug");
  printStep("Seeding execution memory before requesting the debug assembly surface.");
  await aionis.memory.write(
    buildExecutionWritePayload({
      title: "SDK context assemble fixture",
      inputText: "seed context assemble example",
      taskBrief,
      filePath,
      scope,
    }),
  );

  const assembled = await aionis.memory.contextAssemble(contextPayload) as Record<string, any>;

  printJson("Context assemble response", {
    planner_explanation: assembled?.assembly_summary?.planner_explanation ?? null,
    planner_packet_section_counts: assembled?.planner_packet?.sections
      ? Object.fromEntries(
          Object.entries(assembled.planner_packet.sections).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.length : null,
          ]),
        )
      : null,
    execution_kernel_action_packet_summary: assembled?.execution_kernel?.action_packet_summary ?? null,
    has_layered_context: Object.prototype.hasOwnProperty.call(assembled, "layered_context"),
    layered_context_keys:
      assembled?.layered_context && typeof assembled.layered_context === "object"
        ? Object.keys(assembled.layered_context)
        : [],
  });
}

if (isMain(import.meta.url)) {
  await runExample(main);
}

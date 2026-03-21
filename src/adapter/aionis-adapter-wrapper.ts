import { loadAionisMcpEnv } from "../mcp/client.js";
import { createAionisAdapterWrapper } from "./wrapper.js";
import { WrapperRunRequestSchema } from "./wrapper-contracts.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function mapOutcomeToEventType(outcome: "completed" | "blocked" | "failed" | "abandoned") {
  switch (outcome) {
    case "completed":
      return "task_completed";
    case "blocked":
      return "task_blocked";
    case "failed":
      return "task_failed";
    case "abandoned":
      return "task_abandoned";
  }
}

async function main(): Promise<void> {
  const env = loadAionisMcpEnv(process.env);
  const wrapper = createAionisAdapterWrapper({ env });
  const raw = (await readStdin()).trim();
  if (!raw) {
    process.stdout.write(JSON.stringify({ ok: false, error: "empty_request" }) + "\n");
    process.exitCode = 1;
    return;
  }
  try {
    const parsed = WrapperRunRequestSchema.parse(JSON.parse(raw));
    const task = parsed.task;
    const selection = parsed.selection ?? {};
    const step = parsed.step;
    const finalization = parsed.finalization;

    const planning = await wrapper.startTask({
      event_type: "task_started",
      task_id: task.task_id,
      tenant_id: task.tenant_id,
      scope: task.scope,
      query_text: task.query_text,
      context: task.context,
      tool_candidates: task.tool_candidates,
      consumer_agent_id: task.consumer_agent_id,
      consumer_team_id: task.consumer_team_id,
      rules_limit: task.rules_limit,
      limit: task.limit,
    });

    const selected = await wrapper.selectTool({
      event_type: "tool_selection_requested",
      task_id: task.task_id,
      tenant_id: task.tenant_id,
      scope: task.scope,
      context: selection.context ?? step.context ?? task.context,
      candidates: selection.candidates ?? step.candidates ?? task.tool_candidates,
      include_shadow: selection.include_shadow,
      rules_limit: selection.rules_limit,
      strict: selection.strict,
      reorder_candidates: selection.reorder_candidates,
    });

    const executed = await wrapper.executeCommandStep({
      task_id: task.task_id,
      step_id: step.step_id,
      selected_tool: step.selected_tool,
      candidates: step.candidates ?? selection.candidates ?? task.tool_candidates,
      context: step.context ?? selection.context ?? task.context,
      command: step.command,
      args: step.args,
      cwd: step.cwd,
      validated: step.validated,
      reverted: step.reverted,
      note: step.note,
    });

    const finalized = await wrapper.finalizeTask({
      event_type: mapOutcomeToEventType(finalization.outcome),
      task_id: task.task_id,
      tenant_id: task.tenant_id,
      scope: task.scope,
      selected_tool: finalization.selected_tool ?? step.selected_tool,
      candidates: finalization.candidates ?? step.candidates ?? selection.candidates ?? task.tool_candidates,
      context: finalization.context ?? step.context ?? selection.context ?? task.context,
      note: finalization.note,
    });

    const introspection = parsed.introspect
      ? await wrapper.introspect(parsed.introspect)
      : null;

    process.stdout.write(JSON.stringify({
      ok: true,
      result: {
        planning,
        selection: selected,
        execution: executed.execution,
        feedback: executed.feedback,
        finalization: finalized,
        introspection,
      },
    }) + "\n");
  } catch (error) {
    process.stdout.write(JSON.stringify({
      ok: false,
      error: "wrapper_run_failed",
      details: String(error),
    }) + "\n");
    process.exitCode = 1;
  }
}

await main();

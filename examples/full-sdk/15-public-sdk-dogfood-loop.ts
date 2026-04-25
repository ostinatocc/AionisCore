import { randomUUID } from "node:crypto";
import {
  createExampleClient,
  DEFAULT_TENANT_ID,
  isMain,
  printHeading,
  printJson,
  printStep,
  runExample,
} from "./shared.js";

function summarizePlan(plan: Awaited<ReturnType<ReturnType<typeof createExampleClient>["memory"]["taskStartPlan"]>>) {
  return {
    resolution_source: plan.resolution_source,
    gate_action: plan.gate_action,
    first_action: plan.first_action,
    planner_explanation: plan.planner_explanation,
  };
}

async function main() {
  const aionis = createExampleClient();
  const exampleTag = randomUUID().slice(0, 8);
  const scope = `public-sdk-dogfood-${exampleTag}`;
  const taskBrief = `Repair service publish visibility after deploy [public-sdk-dogfood-${exampleTag}]`;
  const filePath = "src/services/publish.ts";
  const workflowSignature = `workflow:public-sdk-dogfood:${exampleTag}`;
  const taskStartPayload = {
    tenant_id: DEFAULT_TENANT_ID,
    scope,
    query_text: taskBrief,
    context: {
      goal: taskBrief,
      host: "public-sdk-dogfood",
    },
    candidates: ["bash", "edit", "test"],
    workflow_limit: 6,
  };

  printHeading("Public SDK Dogfood Loop");

  printStep("1. Host asks Aionis for the first correct action through taskStartPlan.");
  const coldStart = await aionis.memory.taskStartPlan(taskStartPayload);
  printJson("Initial task start plan", summarizePlan(coldStart));

  printStep("2. Host stores the validated outcome through one public facade, with optional playbook compile/simulate.");
  const outcome = await aionis.memory.storeExecutionOutcome({
    tenant_id: DEFAULT_TENANT_ID,
    scope,
    actor: "public-sdk-dogfood",
    goal: taskBrief,
    status: "success",
    summary: "Service publish visibility repair passed validation and fresh-shell probe.",
    success_criteria: {
      workflow_signature: workflowSignature,
      target_files: [filePath],
      acceptance_checks: ["npm run -s test -- publish-visibility", "curl -fsS http://127.0.0.1:8080/health"],
      must_hold_after_exit: ["publish service remains reachable after the agent shell exits"],
      external_visibility_requirements: ["fresh shell can probe the public health endpoint"],
    },
    steps: [
      {
        tool_name: "edit",
        tool_input: { file_path: filePath },
        status: "success",
        output_signature: {
          summary: "Patched publish visibility path",
          target_files: [filePath],
        },
      },
      {
        tool_name: "bash",
        tool_input: { argv: ["npm", "run", "-s", "test", "--", "publish-visibility"] },
        status: "success",
        output_signature: {
          summary: "publish visibility tests passed",
        },
      },
    ],
    compile_playbook: true,
    compile: {
      name: "Public SDK dogfood publish visibility recovery",
      matchers: {
        workflow_signature: workflowSignature,
        file_path: filePath,
      },
      success_criteria: {
        target_files: [filePath],
        acceptance_checks: ["npm run -s test -- publish-visibility"],
      },
      risk_profile: "low",
    },
    simulate_playbook: true,
    simulate: {
      max_steps: 6,
    },
  });
  printJson("Stored execution outcome", {
    run_id: outcome.run_id,
    status: outcome.status,
    step_count: outcome.steps.length,
    playbook_compile: outcome.playbook_compile,
    playbook_simulation: outcome.playbook_simulation,
  });

  printStep("3. Host reads the reusable workflow contract and authority/outcome state through retrieveWorkflowContract.");
  const workflowContract = await aionis.memory.retrieveWorkflowContract({
    tenant_id: DEFAULT_TENANT_ID,
    scope,
    file_path: filePath,
    include_introspection: false,
    limit: 8,
  });
  printJson("Workflow contract authority summary", {
    selected_source: workflowContract.selected_source,
    contract_trust: workflowContract.contract_trust,
    authority_summary: workflowContract.authority_summary,
    outcome_contract_gate: workflowContract.outcome_contract_gate,
    execution_contract_v1: workflowContract.execution_contract_v1,
  });

  printStep("4. Host asks for the next start with execution evidence attached.");
  const warmStart = await aionis.memory.taskStartPlan({
    ...taskStartPayload,
    execution_result_summary: {
      previous_run_id: outcome.run_id,
      previous_status: outcome.status,
      selected_workflow_source: workflowContract.selected_source,
    },
    execution_evidence: [
      {
        kind: "fresh_shell_probe",
        status: "success",
        summary: "fresh shell can probe the service health endpoint",
      },
    ],
  });
  printJson("Next task start plan", summarizePlan(warmStart));

  printJson("Dogfood closure", {
    outcome_run_id: outcome.run_id,
    workflow_selected_source: workflowContract.selected_source,
    authority_status: workflowContract.authority_summary.status,
    outcome_contract_status: workflowContract.authority_summary.outcome_contract_status,
    next_start_source: warmStart.resolution_source,
    next_first_action: warmStart.first_action,
  });
}

if (isMain(import.meta.url)) {
  await runExample(main);
}

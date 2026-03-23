import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createAionisClient, AionisSdkHttpError } from "../../packages/sdk/dist/index.js";

export const DEFAULT_BASE_URL = process.env.AIONIS_BASE_URL ?? "http://127.0.0.1:3001";
export const DEFAULT_TENANT_ID = process.env.AIONIS_TENANT_ID ?? "default";
export const DEFAULT_SCOPE = process.env.AIONIS_SCOPE ?? "default";
export const DEFAULT_ACTOR = process.env.AIONIS_ACTOR ?? "local-user";

export function createExampleClient() {
  return createAionisClient({
    baseUrl: DEFAULT_BASE_URL,
  });
}

export function isMain(moduleUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return pathToFileURL(entry).href === moduleUrl;
}

export function printHeading(title: string) {
  console.log(`\n# ${title}`);
}

export function printJson(label: string, value: unknown) {
  console.log(`\n## ${label}`);
  console.log(JSON.stringify(value, null, 2));
}

export function printStep(message: string) {
  console.log(`- ${message}`);
}

export function buildExecutionWritePayload(args: {
  title: string;
  inputText: string;
  taskBrief: string;
  filePath: string;
  stateId?: string;
  tenantId?: string;
  scope?: string;
  actor?: string;
  workflowPromotionGovernanceReview?: Record<string, unknown>;
}) {
  return {
    tenant_id: args.tenantId ?? DEFAULT_TENANT_ID,
    scope: args.scope ?? DEFAULT_SCOPE,
    actor: args.actor ?? DEFAULT_ACTOR,
    input_text: args.inputText,
    auto_embed: true,
    memory_lane: "private",
    nodes: [
      {
        client_id: `sdk-example-event:${randomUUID()}`,
        type: "event",
        title: args.title,
        text_summary: args.taskBrief,
        slots: {
          summary_kind: "handoff",
          ...(args.workflowPromotionGovernanceReview
            ? {
                workflow_promotion_governance_review: args.workflowPromotionGovernanceReview,
              }
            : {}),
          execution_packet_v1: {
            version: 1,
            state_id: args.stateId ?? `state:${randomUUID()}`,
            current_stage: "patch",
            active_role: "patch",
            task_brief: args.taskBrief,
            target_files: [args.filePath],
            next_action: `Patch ${args.filePath} and rerun validation`,
            hard_constraints: [],
            accepted_facts: [],
            rejected_paths: [],
            pending_validations: ["npm run -s test:lite"],
            unresolved_blockers: [],
            rollback_notes: [],
            review_contract: null,
            resume_anchor: {
              anchor: `resume:${args.filePath}`,
              file_path: args.filePath,
              symbol: null,
              repo_root: process.cwd(),
            },
            artifact_refs: [],
            evidence_refs: [],
          },
        },
      },
    ],
    edges: [],
  };
}

export function buildPlanningPayload(args: {
  queryText: string;
  goal: string;
  toolCandidates?: string[];
  tenantId?: string;
  scope?: string;
}) {
  return {
    tenant_id: args.tenantId ?? DEFAULT_TENANT_ID,
    scope: args.scope ?? DEFAULT_SCOPE,
    query_text: args.queryText,
    context: {
      goal: args.goal,
    },
    tool_candidates: args.toolCandidates ?? ["bash", "edit", "test"],
  };
}

export function buildToolsSelectPayload(args: {
  runId: string;
  tenantId?: string;
  scope?: string;
}) {
  return {
    tenant_id: args.tenantId ?? DEFAULT_TENANT_ID,
    scope: args.scope ?? DEFAULT_SCOPE,
    run_id: args.runId,
    context: {
      task_kind: "repair_export",
      goal: "repair export failure in node tests",
      error: {
        signature: "node-export-mismatch",
      },
    },
    candidates: ["bash", "edit", "test"],
    include_shadow: false,
    rules_limit: 20,
    strict: true,
    reorder_candidates: false,
  };
}

export async function runExample(main: () => Promise<void>) {
  try {
    await main();
  } catch (error) {
    if (error instanceof AionisSdkHttpError) {
      console.error(`Aionis SDK request failed with status ${error.status}`);
      console.error(JSON.stringify(error.payload, null, 2));
      process.exitCode = 1;
      return;
    }
    console.error(error);
    process.exitCode = 1;
  }
}

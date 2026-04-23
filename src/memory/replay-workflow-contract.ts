import { ServiceLifecycleConstraintV1Schema, type ServiceLifecycleConstraintV1 } from "../execution/types.js";
import { ExecutionNativeV1Schema } from "./schemas.js";

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function uniqueStrings(values: unknown[], max = 64): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const next = toStringOrNull(value);
    if (!next || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
    if (out.length >= max) break;
  }
  return out;
}

function stringList(value: unknown, max = 64): string[] {
  return Array.isArray(value) ? uniqueStrings(value, max) : [];
}

function uniqueLifecycleConstraints(values: unknown[], limit = 16): ServiceLifecycleConstraintV1[] {
  const out: ServiceLifecycleConstraintV1[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const parsed = ServiceLifecycleConstraintV1Schema.safeParse(value);
    if (!parsed.success) continue;
    const key = [
      parsed.data.label,
      parsed.data.endpoint ?? "",
      parsed.data.launch_reference ?? "",
    ].join("::");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(parsed.data);
    if (out.length >= limit) break;
  }
  return out;
}

function deriveTemplateKeySteps(stepsRaw: unknown): string[] {
  if (!Array.isArray(stepsRaw)) return [];
  return uniqueStrings(
    stepsRaw.map((step) => {
      const obj = asObject(step) ?? {};
      const stepIndex = Number(obj.step_index ?? 0) || null;
      const toolName = toStringOrNull(obj.tool_name);
      if (!toolName) return null;
      return stepIndex != null ? `step_${stepIndex}:${toolName}` : toolName;
    }),
    16,
  );
}

export type ReplayWorkflowContract = {
  task_family: string | null;
  target_files: string[];
  next_action: string | null;
  workflow_steps: string[];
  pattern_hints: string[];
  service_lifecycle_constraints: ServiceLifecycleConstraintV1[];
};

export function deriveReplayWorkflowContractFromSlots(slots: Record<string, unknown>): ReplayWorkflowContract {
  const executionNativeParsed = ExecutionNativeV1Schema.safeParse(asObject(slots.execution_native_v1));
  const executionNative = executionNativeParsed.success ? executionNativeParsed.data : null;
  const executionResultSummary = asObject(slots.execution_result_summary);
  const trajectoryCompileSummary = asObject(executionResultSummary?.trajectory_compile_v1);

  const targetFiles = uniqueStrings([
    ...stringList(slots.target_files),
    ...(executionNative?.target_files ?? []),
    toStringOrNull(slots.file_path),
    executionNative?.file_path ?? null,
  ]);
  const workflowSteps = uniqueStrings([
    ...stringList(slots.workflow_steps, 24),
    ...(executionNative?.workflow_steps ?? []),
    ...deriveTemplateKeySteps(slots.steps_template),
  ], 24);
  const patternHints = uniqueStrings([
    ...stringList(slots.pattern_hints, 24),
    ...(executionNative?.pattern_hints ?? []),
  ], 24);
  const serviceLifecycleConstraints = uniqueLifecycleConstraints([
    ...((Array.isArray(slots.service_lifecycle_constraints) ? slots.service_lifecycle_constraints : []) as unknown[]),
    ...((executionNative?.service_lifecycle_constraints ?? []) as unknown[]),
  ]);

  return {
    task_family: toStringOrNull(slots.task_family)
      ?? executionNative?.task_family
      ?? toStringOrNull(trajectoryCompileSummary?.task_family)
      ?? null,
    target_files: targetFiles,
    next_action: toStringOrNull(slots.next_action) ?? executionNative?.next_action ?? null,
    workflow_steps: workflowSteps,
    pattern_hints: patternHints,
    service_lifecycle_constraints: serviceLifecycleConstraints,
  };
}

import { readFile } from "node:fs/promises";
import path from "node:path";

import { compileAionisDoc } from "./compile.js";
import { validateCompileEnvelope, ExecutionPlanSchema } from "./contracts.js";
import { executeExecutionPlan } from "./execute.js";
import type { AionisDocRunInputKind, ExecutionResultV1 } from "./execute/types.js";
import { createModuleRegistryRuntimeFromFile } from "./registry/loadModuleRegistry.js";

export class AionisDocRunError extends Error {}

function resolvePath(cwd: string | undefined, targetPath: string): string {
  return path.resolve(cwd ?? process.cwd(), targetPath);
}

async function loadJsonFile(resolvedPath: string): Promise<unknown> {
  return JSON.parse(await readFile(resolvedPath, "utf8"));
}

function resolveInputKind(inputKind?: AionisDocRunInputKind): AionisDocRunInputKind {
  return inputKind ?? "source";
}

export async function runAionisDoc(args: {
  inputPath: string;
  inputKind?: AionisDocRunInputKind;
  registryPath: string;
  cwd?: string;
}): Promise<ExecutionResultV1> {
  const inputKind = resolveInputKind(args.inputKind);
  const resolvedInputPath = resolvePath(args.cwd, args.inputPath);
  const resolvedRegistryPath = resolvePath(args.cwd, args.registryPath);
  const runtime = await createModuleRegistryRuntimeFromFile({
    registryPath: resolvedRegistryPath,
  });

  switch (inputKind) {
    case "source": {
      const source = await readFile(resolvedInputPath, "utf8");
      const result = compileAionisDoc(source);
      return executeExecutionPlan(result.plan, { runtime });
    }
    case "compile-envelope": {
      const envelope = validateCompileEnvelope(await loadJsonFile(resolvedInputPath));
      if (!envelope.artifacts.plan) {
        throw new AionisDocRunError(
          `Compile envelope '${resolvedInputPath}' does not contain a plan artifact. Re-run compile-aionis-doc with --emit all or --emit plan.`,
        );
      }
      return executeExecutionPlan(envelope.artifacts.plan, { runtime });
    }
    case "plan": {
      const plan = ExecutionPlanSchema.parse(await loadJsonFile(resolvedInputPath));
      return executeExecutionPlan(plan, { runtime });
    }
  }
}

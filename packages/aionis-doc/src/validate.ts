import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve as resolvePath } from "node:path";

import {
  loadModuleDefinitionFromFileEntry,
  loadModuleDefinitionFromNpmEntry,
  loadModuleRegistryFile,
} from "./registry/loadModuleRegistry.js";
import {
  AIONIS_DOC_MODULE_REGISTRY_VERSION,
  AIONIS_DOC_NPM_MODULE_REGISTRY_VERSION,
} from "./registry/types.js";
import { validateExecutionModuleManifest } from "./contracts.js";

export const AIONIS_DOC_REGISTRY_VALIDATION_RESULT_VERSION = "aionis_doc_registry_validation_result_v1" as const;
export const AIONIS_DOC_MODULE_VALIDATION_RESULT_VERSION = "aionis_doc_module_validation_result_v1" as const;

type ModuleValidationSummary = {
  module: string;
  version: string;
  title: string | null;
  deterministic: boolean | null;
  required_capabilities: string[];
};

export type AionisDocModuleValidationResult = {
  command: "validate-aionis-doc-module";
  validation_result_version: typeof AIONIS_DOC_MODULE_VALIDATION_RESULT_VERSION;
  valid: true;
  entry_path: string;
  declared_module: string | null;
  module: ModuleValidationSummary;
};

export type AionisDocRegistryValidationResult = {
  command: "validate-aionis-doc-registry";
  validation_result_version: typeof AIONIS_DOC_REGISTRY_VALIDATION_RESULT_VERSION;
  valid: true;
  registry_path: string;
  registry_version: string;
  runtime_id: "standalone_file_registry_v1" | "standalone_npm_registry_v1";
  module_count: number;
  modules: Array<
    | {
        module: string;
        source: "file";
        entry: string;
        resolved_target: string;
        manifest: ModuleValidationSummary;
      }
    | {
        module: string;
        source: "package";
        package: string;
        export: string | null;
        specifier: string;
        resolved_target: string;
        manifest: ModuleValidationSummary;
      }
  >;
};

function summarizeManifest(manifest: unknown): ModuleValidationSummary {
  const parsed = validateExecutionModuleManifest(manifest) as {
    module: string;
    version: string;
    title?: string;
    deterministic?: boolean;
    required_capabilities?: string[];
  };
  return {
    module: parsed.module,
    version: parsed.version,
    title: parsed.title ?? null,
    deterministic: typeof parsed.deterministic === "boolean" ? parsed.deterministic : null,
    required_capabilities: parsed.required_capabilities ?? [],
  };
}

export async function validateAionisDocModule(args: {
  entryPath: string;
  declaredModule?: string;
  cwd?: string;
}): Promise<AionisDocModuleValidationResult> {
  const registryDir = args.cwd ?? process.cwd();
  const entry = {
    module: args.declaredModule,
    entry: args.entryPath,
  };
  const loaded = await loadModuleDefinitionFromFileEntry({ registryDir, entry });
  if (args.declaredModule && loaded.definition.manifest.module !== args.declaredModule) {
    throw new Error(
      `Entry '${loaded.resolvedEntryPath}' exports manifest '${loaded.definition.manifest.module}' but declared module was '${args.declaredModule}'.`,
    );
  }
  return {
    command: "validate-aionis-doc-module",
    validation_result_version: AIONIS_DOC_MODULE_VALIDATION_RESULT_VERSION,
    valid: true,
    entry_path: loaded.resolvedEntryPath,
    declared_module: args.declaredModule ?? null,
    module: summarizeManifest(loaded.definition.manifest),
  };
}

export async function validateAionisDocRegistry(args: {
  registryPath: string;
}): Promise<AionisDocRegistryValidationResult> {
  const registry = await loadModuleRegistryFile(args.registryPath);
  const registryDir = dirname(args.registryPath);

  if (registry.version === AIONIS_DOC_MODULE_REGISTRY_VERSION) {
    const modules = await Promise.all(
      registry.modules.map(async (entry) => {
        const loaded = await loadModuleDefinitionFromFileEntry({ registryDir, entry });
        return {
          module: entry.module,
          source: "file" as const,
          entry: entry.entry,
          resolved_target: loaded.resolvedEntryPath,
          manifest: summarizeManifest(loaded.definition.manifest),
        };
      }),
    );
    return {
      command: "validate-aionis-doc-registry",
      validation_result_version: AIONIS_DOC_REGISTRY_VALIDATION_RESULT_VERSION,
      valid: true,
      registry_path: args.registryPath,
      registry_version: registry.version,
      runtime_id: "standalone_file_registry_v1",
      module_count: modules.length,
      modules,
    };
  }

  const modules = await Promise.all(
    registry.modules.map(async (entry) => {
      const loaded = await loadModuleDefinitionFromNpmEntry({ registryDir, entry });
      return {
        module: entry.module,
        source: "package" as const,
        package: entry.package,
        export: entry.export ?? null,
        specifier: loaded.specifier,
        resolved_target: loaded.resolvedEntryPath,
        manifest: summarizeManifest(loaded.definition.manifest),
      };
    }),
  );

  return {
    command: "validate-aionis-doc-registry",
    validation_result_version: AIONIS_DOC_REGISTRY_VALIDATION_RESULT_VERSION,
    valid: true,
    registry_path: args.registryPath,
    registry_version: registry.version,
    runtime_id: "standalone_npm_registry_v1",
    module_count: modules.length,
    modules,
  };
}

export async function writeValidationOutput(pathname: string, contents: string): Promise<void> {
  await mkdir(dirname(pathname), { recursive: true });
  await writeFile(pathname, contents, "utf8");
}

export function resolveOutputPath(target: string): string {
  return resolvePath(process.cwd(), target);
}

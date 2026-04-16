import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { AnyModuleRegistryFileSchema, validateExecutionModuleManifest } from "../contracts.js";
import { ModuleRegistryExecutionRuntime, StaticModuleRegistry } from "../execute/moduleRuntime.js";
import type {
  ExecutionModuleDefinition,
  ExecutionModuleHandler,
  ExecutionModuleManifest,
} from "../execute/types.js";
import type {
  AnyModuleRegistryFileV1,
  ModuleRegistryFileEntryV1,
  ModuleRegistryFileV1,
  NpmModuleRegistryFileEntryV1,
  NpmModuleRegistryFileV1,
} from "./types.js";
import { AIONIS_DOC_MODULE_REGISTRY_VERSION, AIONIS_DOC_NPM_MODULE_REGISTRY_VERSION } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asManifest(value: unknown, entryPath: string): ExecutionModuleManifest {
  if (!isRecord(value)) {
    throw new Error(`Registry module '${entryPath}' does not export a valid manifest object.`);
  }
  validateExecutionModuleManifest(value);
  return value as unknown as ExecutionModuleManifest;
}

function asHandler(value: unknown, entryPath: string): ExecutionModuleHandler {
  if (typeof value !== "function") {
    throw new Error(`Registry module '${entryPath}' does not export a valid handler function.`);
  }
  return value as ExecutionModuleHandler;
}

function asDefinition(
  loaded: unknown,
  declaredModule: string | undefined,
  entryPath: string,
): ExecutionModuleDefinition {
  if (!isRecord(loaded)) {
    throw new Error(`Registry entry '${entryPath}' did not load a module object.`);
  }

  const manifest = asManifest(loaded.manifest, entryPath);
  const handler = asHandler(loaded.handler, entryPath);
  if (declaredModule && manifest.module !== declaredModule) {
    throw new Error(
      `Registry entry '${entryPath}' declares module '${declaredModule}' but exports manifest '${manifest.module}'.`,
    );
  }

  return { manifest, handler };
}

function toNpmSpecifier(packageName: string, exportPath?: string): string {
  if (!exportPath || exportPath === ".") return packageName;
  if (!exportPath.startsWith("./")) {
    throw new Error(
      `NPM registry export '${exportPath}' must be '.' or start with './'.`,
    );
  }
  return `${packageName}/${exportPath.slice(2)}`;
}

export async function loadModuleDefinitionFromFileEntry(args: {
  registryDir: string;
  entry: Pick<ModuleRegistryFileEntryV1, "entry"> & { module?: string };
}): Promise<{ definition: ExecutionModuleDefinition; resolvedEntryPath: string }> {
  const resolvedEntryPath = path.resolve(args.registryDir, args.entry.entry);
  const loaded = await import(pathToFileURL(resolvedEntryPath).href);
  return {
    definition: asDefinition(loaded, args.entry.module, resolvedEntryPath),
    resolvedEntryPath,
  };
}

export async function loadModuleDefinitionFromNpmEntry(args: {
  registryDir: string;
  entry: Pick<NpmModuleRegistryFileEntryV1, "package" | "export"> & { module?: string };
}): Promise<{ definition: ExecutionModuleDefinition; resolvedEntryPath: string; specifier: string }> {
  const requireFromRegistry = createRequire(path.join(args.registryDir, "__aionis_doc_registry__.cjs"));
  const specifier = toNpmSpecifier(args.entry.package, args.entry.export);
  const resolvedEntryPath = requireFromRegistry.resolve(specifier);
  const loaded = await import(pathToFileURL(resolvedEntryPath).href);
  return {
    definition: asDefinition(loaded, args.entry.module, resolvedEntryPath),
    resolvedEntryPath,
    specifier,
  };
}

async function loadDefinitionsFromFileRegistry(registryPath: string, registry: ModuleRegistryFileV1) {
  const registryDir = path.dirname(registryPath);
  return Promise.all(
    registry.modules.map(async (entry) => {
      const loaded = await loadModuleDefinitionFromFileEntry({ registryDir, entry });
      return loaded.definition;
    }),
  );
}

async function loadDefinitionsFromNpmRegistry(registryPath: string, registry: NpmModuleRegistryFileV1) {
  const registryDir = path.dirname(registryPath);
  return Promise.all(
    registry.modules.map(async (entry) => {
      const loaded = await loadModuleDefinitionFromNpmEntry({ registryDir, entry });
      return loaded.definition;
    }),
  );
}

export async function loadModuleRegistryFile(registryPath: string): Promise<AnyModuleRegistryFileV1> {
  const raw = await readFile(registryPath, "utf8");
  return AnyModuleRegistryFileSchema.parse(JSON.parse(raw));
}

export async function loadModuleRegistry(registryPath: string): Promise<StaticModuleRegistry> {
  const registry = await loadModuleRegistryFile(registryPath);
  const definitions =
    registry.version === AIONIS_DOC_MODULE_REGISTRY_VERSION
      ? await loadDefinitionsFromFileRegistry(registryPath, registry)
      : await loadDefinitionsFromNpmRegistry(registryPath, registry);

  return new StaticModuleRegistry(definitions);
}

export async function createModuleRegistryRuntimeFromFile(args: {
  registryPath: string;
  runtimeId?: string;
}): Promise<ModuleRegistryExecutionRuntime> {
  const registryFile = await loadModuleRegistryFile(args.registryPath);
  const registry = await loadModuleRegistry(args.registryPath);
  return new ModuleRegistryExecutionRuntime({
    runtime_id:
      args.runtimeId ??
      (registryFile.version === AIONIS_DOC_MODULE_REGISTRY_VERSION
        ? "standalone_file_registry_v1"
        : "standalone_npm_registry_v1"),
    registry,
  });
}

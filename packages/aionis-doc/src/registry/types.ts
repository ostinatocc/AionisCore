export const AIONIS_DOC_MODULE_REGISTRY_VERSION = "aionis_doc_module_registry_v1" as const;
export const AIONIS_DOC_NPM_MODULE_REGISTRY_VERSION = "aionis_doc_npm_module_registry_v1" as const;

export interface ModuleRegistryFileEntryV1 {
  module: string;
  entry: string;
}

export interface ModuleRegistryFileV1 {
  version: typeof AIONIS_DOC_MODULE_REGISTRY_VERSION;
  modules: ModuleRegistryFileEntryV1[];
}

export interface NpmModuleRegistryFileEntryV1 {
  module: string;
  package: string;
  export?: string;
}

export interface NpmModuleRegistryFileV1 {
  version: typeof AIONIS_DOC_NPM_MODULE_REGISTRY_VERSION;
  modules: NpmModuleRegistryFileEntryV1[];
}

export type AnyModuleRegistryFileV1 = ModuleRegistryFileV1 | NpmModuleRegistryFileV1;

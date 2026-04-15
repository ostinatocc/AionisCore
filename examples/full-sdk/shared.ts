import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import {
  createAionisHostBridge,
  createAionisRuntimeClient,
  AionisRuntimeSdkHttpError,
  resolveDelegationLearningProjection,
} from "../../packages/full-sdk/dist/index.js";

export const DEFAULT_BASE_URL = process.env.AIONIS_BASE_URL ?? "http://127.0.0.1:3001";
export const DEFAULT_TENANT_ID = process.env.AIONIS_TENANT_ID ?? "default";
export const DEFAULT_SCOPE = process.env.AIONIS_SCOPE ?? "default";

export function createExampleClient() {
  return createAionisRuntimeClient({
    baseUrl: DEFAULT_BASE_URL,
  });
}

export function createExampleHostBridge() {
  return createAionisHostBridge({
    baseUrl: DEFAULT_BASE_URL,
  });
}

export { resolveDelegationLearningProjection };

export function isMain(moduleUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return pathToFileURL(entry).href === moduleUrl;
}

export function printHeading(title: string) {
  console.log(`\n# ${title}`);
}

export function printStep(message: string) {
  console.log(`- ${message}`);
}

export function printJson(label: string, value: unknown) {
  console.log(`\n## ${label}`);
  console.log(JSON.stringify(value, null, 2));
}

export function createScope(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

export function createReplayRunId() {
  return randomUUID();
}

export async function runExample(main: () => Promise<void>) {
  try {
    await main();
  } catch (error) {
    if (error instanceof AionisRuntimeSdkHttpError) {
      console.error(`Aionis runtime SDK request failed with status ${error.status}`);
      console.error(JSON.stringify(error.payload, null, 2));
      process.exitCode = 1;
      return;
    }
    console.error(error);
    process.exitCode = 1;
  }
}

/**
 * Runtime connection config.
 *
 * Inspector is designed to be served from the same origin as a running Lite
 * runtime. During local development we talk to the Vite dev server which
 * proxies /v1 and /health to the configured runtime origin (see vite.config.ts).
 *
 * In production (bundled into Lite) we use relative URLs so the browser calls
 * back to whichever host served the HTML. That lets a developer run
 * `npm run lite:start` and open the Inspector without configuring anything.
 */

export interface RuntimeConfig {
  baseUrl: string;
  tenantId: string;
  scope: string;
}

const STORAGE_KEY = "aionis-inspector:runtime-config";

const DEFAULT_CONFIG: RuntimeConfig = {
  baseUrl: "",
  tenantId: "default",
  scope: "default",
};

export function loadRuntimeConfig(): RuntimeConfig {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<RuntimeConfig>;
    return {
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : DEFAULT_CONFIG.baseUrl,
      tenantId: typeof parsed.tenantId === "string" && parsed.tenantId.length > 0
        ? parsed.tenantId
        : DEFAULT_CONFIG.tenantId,
      scope: typeof parsed.scope === "string" && parsed.scope.length > 0
        ? parsed.scope
        : DEFAULT_CONFIG.scope,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveRuntimeConfig(config: RuntimeConfig): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // storage may be blocked in some embedding contexts; non-fatal.
  }
}

export function resolveUrl(config: RuntimeConfig, path: string): string {
  if (config.baseUrl.length === 0) return path;
  const trimmed = config.baseUrl.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${trimmed}${suffix}`;
}

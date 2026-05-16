import { existsSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { FastifyInstance, FastifyPluginCallback } from "fastify";
import type { Env } from "../config.js";

type FastifyStaticPlugin = FastifyPluginCallback<Record<string, unknown>>;

const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;

function resolveDefaultExport<T>(mod: unknown): T {
  return (
    mod && typeof mod === "object" && "default" in mod
      ? (mod as { default: T }).default
      : mod
  ) as T;
}

/**
 * Registers the Aionis Inspector static bundle at `/inspector/*` for Lite
 * editions only.
 *
 * Invariants:
 * 1. no-op when `env.AIONIS_EDITION !== "lite"`
 * 2. no-op when `env.LITE_INSPECTOR_ENABLED === false`
 * 3. no-op when the compiled bundle directory does not exist (runtime logs a
 *    hint to run `npm run inspector:build`, but does not fail startup)
 * 4. adds no request hooks, no telemetry surface, no admin controls
 * 5. serves only static assets; the route must not read or write runtime state
 *
 * The `@fastify/static` plugin is loaded dynamically and is declared in
 * `optionalDependencies` so stripped-down deployments that disable the
 * Inspector do not need the dependency installed.
 */
export async function registerInspectorStaticRoutes(
  app: FastifyInstance,
  env: Env,
): Promise<void> {
  if (env.AIONIS_EDITION !== "lite") return;
  if (!env.LITE_INSPECTOR_ENABLED) {
    app.log.info(
      { aionis_edition: env.AIONIS_EDITION },
      "inspector static route disabled by LITE_INSPECTOR_ENABLED",
    );
    return;
  }

  const distPath = isAbsolute(env.LITE_INSPECTOR_DIST_PATH)
    ? env.LITE_INSPECTOR_DIST_PATH
    : resolve(process.cwd(), env.LITE_INSPECTOR_DIST_PATH);

  if (!existsSync(distPath) || !statSync(distPath).isDirectory()) {
    app.log.warn(
      { inspector_dist_path: distPath },
      "inspector bundle not found; skipping /inspector static route. Run `npm run inspector:build` to produce it.",
    );
    return;
  }

  let fastifyStatic: FastifyStaticPlugin | null = null;
  try {
    fastifyStatic = resolveDefaultExport<FastifyStaticPlugin>(await dynamicImport("@fastify/static"));
  } catch (err) {
    app.log.warn(
      { err: (err as Error).message },
      "@fastify/static is not installed; skipping /inspector static route",
    );
    return;
  }

  await app.register(fastifyStatic, {
    root: distPath,
    prefix: "/inspector/",
    decorateReply: false,
    index: ["index.html"],
    serve: true,
    setHeaders: (res: { setHeader: (name: string, value: string) => void }) => {
      res.setHeader("cache-control", "no-cache");
      res.setHeader("x-aionis-surface", "inspector");
    },
  });

  app.get("/inspector", async (_req, reply) => {
    return reply.redirect("/inspector/", 302);
  });

  app.log.info(
    { inspector_dist_path: distPath },
    "inspector static route registered at /inspector",
  );
}

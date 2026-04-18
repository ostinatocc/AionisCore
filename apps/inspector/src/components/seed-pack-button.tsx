import { useState } from "preact/hooks";
import type { AionisClient } from "../lib/aionis-client";
import type { RuntimeConfig } from "../lib/runtime-config";

interface SeedPackButtonProps {
  client: AionisClient;
  config: RuntimeConfig;
  onConfigChange: (next: RuntimeConfig) => void;
}

interface SeedPackFile {
  pack: {
    version: "aionis_pack_v1";
    tenant_id: string;
    scope: string;
    nodes: unknown[];
    edges: unknown[];
  };
  seed_scope?: { tenant_id?: string; scope?: string };
}

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string; target: { tenant_id: string; scope: string } }
  | { kind: "error"; message: string };

export function SeedPackButton({ client, config, onConfigChange }: SeedPackButtonProps) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const run = async () => {
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("./seed-pack.json", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(
          `Could not fetch seed-pack.json (HTTP ${res.status}). ` +
            `Run \`npm --prefix apps/inspector run seed:generate\` to regenerate it.`,
        );
      }
      const seed = (await res.json()) as SeedPackFile;
      if (!seed.pack || seed.pack.version !== "aionis_pack_v1") {
        throw new Error("seed-pack.json is missing a valid aionis_pack_v1 payload.");
      }

      const importResult = (await client.packsImport({ pack: seed.pack })) as {
        imported?: boolean;
        nodes?: number;
        edges?: number;
        tenant_id?: string;
        scope?: string;
      };
      const target = {
        tenant_id: String(importResult.tenant_id ?? seed.pack.tenant_id),
        scope: String(importResult.scope ?? seed.pack.scope),
      };
      const nodes = typeof importResult.nodes === "number" ? importResult.nodes : seed.pack.nodes.length;
      const edges = typeof importResult.edges === "number" ? importResult.edges : seed.pack.edges.length;

      // Move the Inspector to the seed scope so the user immediately sees data.
      // If the user was already on a custom scope, this "borrowed" scope change
      // is cheap to undo from the connection bar.
      if (config.tenantId !== target.tenant_id || config.scope !== target.scope) {
        onConfigChange({ ...config, tenantId: target.tenant_id, scope: target.scope });
      }

      setStatus({
        kind: "success",
        message: `Imported ${nodes} nodes · ${edges} edges.`,
        target,
      });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return (
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="btn btn-primary"
          onClick={run}
          disabled={status.kind === "loading"}
        >
          {status.kind === "loading" ? "Loading…" : "Load seed pack"}
        </button>
        {status.kind === "success" ? (
          <span class="text-xs text-emerald-300">
            {status.message} Viewing <code>{status.target.tenant_id}/{status.target.scope}</code>.
          </span>
        ) : status.kind === "error" ? (
          <span class="text-xs text-rose-300">{status.message}</span>
        ) : (
          <span class="text-xs text-slate-400">
            Imports a sample pack into <code>inspector:seed</code>, then switches here.
          </span>
        )}
      </div>
    </div>
  );
}

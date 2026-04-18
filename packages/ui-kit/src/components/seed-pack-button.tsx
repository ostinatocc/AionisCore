import { useState } from "preact/hooks";

export interface SeedPack {
  version: "aionis_pack_v1";
  tenant_id: string;
  scope: string;
  nodes: unknown[];
  edges: unknown[];
}

export interface SeedPackFile {
  pack: SeedPack;
  seed_scope?: { tenant_id?: string; scope?: string };
}

export interface SeedPackImporter {
  packsImport(body: { pack: SeedPack }): Promise<{
    imported?: boolean;
    nodes?: number;
    edges?: number;
    tenant_id?: string;
    scope?: string;
  }>;
}

export interface SeedPackButtonProps {
  client: SeedPackImporter;
  /** URL of the seed JSON to fetch. Defaults to `./seed-pack.json`. */
  seedUrl?: string;
  /** Current config — read only; the button calls `onConfigChange` with the seed scope. */
  currentTenantId: string;
  currentScope: string;
  onConfigChange: (next: { tenantId: string; scope: string }) => void;
  /** Footer text shown in the idle state. */
  idleHint?: string;
  className?: string;
}

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string; target: { tenant_id: string; scope: string } }
  | { kind: "error"; message: string };

export function SeedPackButton({
  client,
  seedUrl = "./seed-pack.json",
  currentTenantId,
  currentScope,
  onConfigChange,
  idleHint = "Imports a sample pack, then switches here.",
  className = "",
}: SeedPackButtonProps) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const run = async () => {
    setStatus({ kind: "loading" });
    try {
      const res = await fetch(seedUrl, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(
          `Could not fetch ${seedUrl} (HTTP ${res.status}). ` +
            `Regenerate the seed pack and retry.`,
        );
      }
      const seed = (await res.json()) as SeedPackFile;
      if (!seed.pack || seed.pack.version !== "aionis_pack_v1") {
        throw new Error(`${seedUrl} is missing a valid aionis_pack_v1 payload.`);
      }

      const importResult = await client.packsImport({ pack: seed.pack });
      const target = {
        tenant_id: String(importResult.tenant_id ?? seed.pack.tenant_id),
        scope: String(importResult.scope ?? seed.pack.scope),
      };
      const nodes =
        typeof importResult.nodes === "number" ? importResult.nodes : seed.pack.nodes.length;
      const edges =
        typeof importResult.edges === "number" ? importResult.edges : seed.pack.edges.length;

      if (currentTenantId !== target.tenant_id || currentScope !== target.scope) {
        onConfigChange({ tenantId: target.tenant_id, scope: target.scope });
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
    <div class={`flex flex-col gap-2 ${className}`.trim()}>
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="btn btn-primary"
          onClick={run}
          disabled={status.kind === "loading"}
        >
          <span class="no-transform">
            {status.kind === "loading" ? "loading…" : "load seed pack"}
          </span>
        </button>
        {status.kind === "success" ? (
          <span class="text-xs text-trusted no-transform">
            {status.message} Viewing{" "}
            <code class="code-inline">
              {status.target.tenant_id}/{status.target.scope}
            </code>
            .
          </span>
        ) : status.kind === "error" ? (
          <span class="text-xs text-contested no-transform">{status.message}</span>
        ) : (
          <span class="text-xs text-text-2 no-transform">{idleHint}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Thin wrapper over `@aionis/ui-kit/components`'s SeedPackButton that keeps
 * the existing Inspector call-sites stable (they pass `client`, `config`,
 * and `onConfigChange`).
 */
import { SeedPackButton as KitSeedPackButton } from "@aionis/ui-kit/components";
import type { AionisClient } from "../lib/aionis-client";
import type { RuntimeConfig } from "../lib/runtime-config";

export interface SeedPackButtonProps {
  client: AionisClient;
  config: RuntimeConfig;
  onConfigChange: (next: RuntimeConfig) => void;
}

export function SeedPackButton({ client, config, onConfigChange }: SeedPackButtonProps) {
  return (
    <KitSeedPackButton
      client={client}
      currentTenantId={config.tenantId}
      currentScope={config.scope}
      idleHint="Imports a sample pack into inspector:seed, then switches here."
      onConfigChange={(next) => onConfigChange({ ...config, ...{ tenantId: next.tenantId, scope: next.scope } })}
    />
  );
}

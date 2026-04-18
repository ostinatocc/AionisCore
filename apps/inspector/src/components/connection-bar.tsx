/**
 * Thin wrapper over `@aionis/ui-kit/components`'s ConnectionBar that keeps
 * the existing Inspector import path (`./components/connection-bar`) stable.
 */
import {
  ConnectionBar as KitConnectionBar,
  type ConnectionBarProps as KitConnectionBarProps,
} from "@aionis/ui-kit/components";
import type { RuntimeConfig } from "../lib/runtime-config";

export interface ConnectionBarProps extends Omit<KitConnectionBarProps, "config" | "onChange"> {
  config: RuntimeConfig;
  onChange: (next: RuntimeConfig) => void;
}

export function ConnectionBar(props: ConnectionBarProps) {
  return <KitConnectionBar {...props} />;
}

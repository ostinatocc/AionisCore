import type { RecallNodeRow } from "../store/recall-access.js";
import type { MemoryLayerId, MemoryLayerPolicy } from "./layer-policy.js";

type NodeRow = RecallNodeRow;

export function parseVectorText(v: string, maxPreviewDims: number): { dims: number; preview: number[] } {
  const s = v.trim();
  if (!s.startsWith("[") || !s.endsWith("]")) throw new Error("unexpected vector text");
  const body = s.slice(1, -1).trim();
  if (!body) return { dims: 0, preview: [] };
  const parts = body.split(",");
  const preview: number[] = [];
  for (let i = 0; i < parts.length && i < maxPreviewDims; i++) {
    preview.push(Number(parts[i]));
  }
  return { dims: parts.length, preview };
}

export function isDraftTopic(node: NodeRow): boolean {
  return node.type === "topic" && (node.topic_state ?? "active") === "draft";
}

export function resolveCompressionLayer(node: NodeRow): MemoryLayerId | null {
  const executionLayer =
    typeof node.slots?.execution_native_v1?.compression_layer === "string"
      ? node.slots.execution_native_v1.compression_layer.trim()
      : "";
  if (
    executionLayer === "L0" || executionLayer === "L1" || executionLayer === "L2" || executionLayer === "L3"
    || executionLayer === "L4" || executionLayer === "L5"
  ) {
    return executionLayer;
  }
  const anchorLevel =
    typeof node.slots?.execution_native_v1?.anchor_level === "string"
      ? node.slots.execution_native_v1.anchor_level.trim()
      : typeof node.slots?.anchor_v1?.anchor_level === "string"
        ? node.slots.anchor_v1.anchor_level.trim()
        : "";
  if (
    anchorLevel === "L0" || anchorLevel === "L1" || anchorLevel === "L2" || anchorLevel === "L3"
    || anchorLevel === "L4" || anchorLevel === "L5"
  ) {
    return anchorLevel;
  }
  if (node.type === "event") return "L0";
  if (node.type === "evidence") {
    if (node.slots?.summary_kind === "write_distillation_evidence") return "L1";
    return "L0";
  }
  if (node.type === "topic") return "L2";
  if (node.type === "concept") {
    if (typeof node.slots?.compression_layer === "string" && node.slots.compression_layer.trim()) {
      const layer = node.slots.compression_layer.trim();
      if (layer === "L0" || layer === "L1" || layer === "L2" || layer === "L3" || layer === "L4" || layer === "L5") {
        return layer;
      }
    }
    if (node.slots?.summary_kind === "write_distillation_fact") return "L1";
    if (node.slots?.summary_kind === "compression_rollup") return "L3";
  }
  return null;
}

export function allowedLayersForPolicy(layerPolicy: MemoryLayerPolicy | null): Set<MemoryLayerId> | null {
  if (!layerPolicy || layerPolicy.source !== "request_override") return null;
  return new Set<MemoryLayerId>([
    ...layerPolicy.preferred_layers,
    ...layerPolicy.fallback_layers,
    ...layerPolicy.trust_anchor_layers,
  ]);
}

export function pickSlotsPreview(slots: unknown, maxKeys: number): Record<string, unknown> | null {
  if (!slots || typeof slots !== "object" || Array.isArray(slots)) return null;
  const obj = slots as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const out: Record<string, unknown> = {};
  for (const k of keys.slice(0, maxKeys)) out[k] = obj[k];
  return out;
}

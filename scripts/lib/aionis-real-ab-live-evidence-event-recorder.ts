import type {
  RealAbTraceEvent,
  RealAbTraceEventKind,
} from "./aionis-real-ab-validation.ts";
import type {
  RealAbLiveEvidenceAgentEventsFile,
} from "./aionis-real-ab-live-evidence-assembler.ts";

export type RealAbLiveEvidenceEventDraft = {
  kind: RealAbTraceEventKind;
  timestamp_ms?: number;
  text?: string;
  command?: string;
  touched_files?: string[];
  correct?: boolean;
  wasted?: boolean;
  retry?: boolean;
  success?: boolean;
  verifier?: boolean;
  after_exit?: boolean;
  fresh_shell?: boolean;
  claimed_success?: boolean;
  false_confidence?: boolean;
  human_intervention?: boolean;
  tokens?: number;
};

export type RealAbLiveEvidenceEventAppendInput = {
  events_file: RealAbLiveEvidenceAgentEventsFile | Record<string, RealAbTraceEvent[]>;
  probe_id: string;
  event: RealAbLiveEvidenceEventDraft;
};

function normalizeEventsFile(
  value: RealAbLiveEvidenceAgentEventsFile | Record<string, RealAbTraceEvent[]>,
): RealAbLiveEvidenceAgentEventsFile {
  if ("events_by_probe_id" in value) {
    return {
      events_by_probe_id: { ...value.events_by_probe_id },
    };
  }
  return {
    events_by_probe_id: { ...value },
  };
}

function hasMeaningfulEventPayload(event: RealAbLiveEvidenceEventDraft): boolean {
  return Boolean(
    event.text?.trim()
    || event.command?.trim()
    || (event.touched_files && event.touched_files.length > 0),
  );
}

export function validateRealAbLiveEvidenceEventDraft(event: RealAbLiveEvidenceEventDraft): string[] {
  const errors: string[] = [];

  if (!event.kind) {
    errors.push("event.kind is required");
  }
  if (!hasMeaningfulEventPayload(event)) {
    errors.push("event must include text, command, or touched_files");
  }
  if (event.kind === "tool_call" && !event.command?.trim()) {
    errors.push("tool_call events must include command");
  }
  if (event.kind === "action" && !event.text?.trim() && !event.command?.trim()) {
    errors.push("action events must include text or command");
  }
  if (event.timestamp_ms !== undefined && (!Number.isFinite(event.timestamp_ms) || event.timestamp_ms < 0)) {
    errors.push("timestamp_ms must be a non-negative number");
  }
  if (event.tokens !== undefined && (!Number.isFinite(event.tokens) || event.tokens < 0)) {
    errors.push("tokens must be a non-negative number");
  }

  return errors;
}

export function finalizeRealAbLiveEvidenceEvent(event: RealAbLiveEvidenceEventDraft): RealAbTraceEvent {
  const errors = validateRealAbLiveEvidenceEventDraft(event);
  if (errors.length > 0) {
    throw new Error(`invalid agent event: ${errors.join("; ")}`);
  }

  const finalized: RealAbTraceEvent = {
    kind: event.kind,
  };
  if (event.timestamp_ms !== undefined) finalized.timestamp_ms = event.timestamp_ms;
  if (event.text?.trim()) finalized.text = event.text.trim();
  if (event.command?.trim()) finalized.command = event.command.trim();
  if (event.touched_files && event.touched_files.length > 0) {
    finalized.touched_files = [...new Set(event.touched_files.map((file) => file.trim()).filter(Boolean))];
  }
  if (event.correct !== undefined) finalized.correct = event.correct;
  if (event.wasted !== undefined) finalized.wasted = event.wasted;
  if (event.retry !== undefined) finalized.retry = event.retry;
  if (event.success !== undefined) finalized.success = event.success;
  if (event.verifier !== undefined) finalized.verifier = event.verifier;
  if (event.after_exit !== undefined) finalized.after_exit = event.after_exit;
  if (event.fresh_shell !== undefined) finalized.fresh_shell = event.fresh_shell;
  if (event.claimed_success !== undefined) finalized.claimed_success = event.claimed_success;
  if (event.false_confidence !== undefined) finalized.false_confidence = event.false_confidence;
  if (event.human_intervention !== undefined) finalized.human_intervention = event.human_intervention;
  if (event.tokens !== undefined) finalized.tokens = event.tokens;
  return finalized;
}

export function appendRealAbLiveEvidenceAgentEvent(
  input: RealAbLiveEvidenceEventAppendInput,
): RealAbLiveEvidenceAgentEventsFile {
  const probeId = input.probe_id.trim();
  if (!probeId) {
    throw new Error("probe_id must be non-empty");
  }
  const normalized = normalizeEventsFile(input.events_file);
  const existingEvents = normalized.events_by_probe_id[probeId] ?? [];
  return {
    events_by_probe_id: {
      ...normalized.events_by_probe_id,
      [probeId]: [
        ...existingEvents,
        finalizeRealAbLiveEvidenceEvent(input.event),
      ],
    },
  };
}

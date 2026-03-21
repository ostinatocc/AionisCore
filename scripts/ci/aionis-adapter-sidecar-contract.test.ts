import test from "node:test";
import assert from "node:assert/strict";
import { SidecarRequestSchema } from "../../src/adapter/sidecar-contracts.js";

test("sidecar contracts accept all supported event requests", () => {
  const accepted = [
    {
      request_id: "r1",
      event: {
        event_type: "task_started",
        task_id: "task-1",
        query_text: "repair export failure",
        context: {},
      },
    },
    {
      request_id: "r2",
      event: {
        event_type: "tool_selection_requested",
        task_id: "task-1",
        candidates: ["bash", "edit"],
      },
    },
    {
      request_id: "r3",
      event: {
        event_type: "tool_executed",
        task_id: "task-1",
        step_id: "step-1",
        selected_tool: "edit",
        candidates: ["edit", "bash"],
        context: {},
      },
    },
    {
      request_id: "r4",
      event: {
        event_type: "task_completed",
        task_id: "task-1",
      },
    },
    {
      request_id: "r5",
      event: {
        event_type: "task_blocked",
        task_id: "task-1",
      },
    },
    {
      request_id: "r6",
      event: {
        event_type: "task_failed",
        task_id: "task-1",
      },
    },
    {
      request_id: "r7",
      event: {
        event_type: "introspect_requested",
        limit: 5,
      },
    },
  ];

  for (const value of accepted) {
    const parsed = SidecarRequestSchema.parse(value);
    assert.equal(parsed.request_id, value.request_id);
  }
});

test("sidecar contracts reject malformed requests", () => {
  assert.throws(
    () => SidecarRequestSchema.parse({
      request_id: "r1",
      event: { event_type: "task_started", query_text: "repair export failure" },
    }),
    /task_id/i,
  );
  assert.throws(
    () => SidecarRequestSchema.parse({
      request_id: "",
      event: { event_type: "introspect_requested" },
    }),
    /request_id/i,
  );
});

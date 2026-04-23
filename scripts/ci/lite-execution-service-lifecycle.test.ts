import test from "node:test";
import assert from "node:assert/strict";
import { buildExecutionPacketV1, ExecutionPacketV1Schema, ExecutionStateV1Schema } from "../../src/execution/index.ts";

test("execution packet carries service lifecycle constraints from execution state", () => {
  const state = ExecutionStateV1Schema.parse({
    state_id: "state-1",
    scope: "aionis://tests/service-lifecycle",
    task_brief: "Keep the local validation service alive for a fresh-shell probe",
    current_stage: "patch",
    active_role: "patch",
    owned_files: ["scripts/build_index.py"],
    modified_files: ["scripts/build_index.py"],
    pending_validations: ["curl -fsS http://localhost:8080/healthz"],
    completed_validations: [],
    last_accepted_hypothesis: null,
    rejected_paths: [],
    unresolved_blockers: [],
    rollback_notes: [],
    service_lifecycle_constraints: [
      {
        version: 1,
        service_kind: "http",
        label: "service:http://localhost:8080/healthz",
        launch_reference: "nohup python -m http.server 8080 --directory dist/simple >/tmp/index.log 2>&1 &",
        endpoint: "http://localhost:8080/healthz",
        must_survive_agent_exit: true,
        revalidate_from_fresh_shell: true,
        detach_then_probe: true,
        health_checks: ["curl -fsS http://localhost:8080/healthz"],
        teardown_notes: [],
      },
    ],
    reviewer_contract: null,
    resume_anchor: null,
    updated_at: new Date().toISOString(),
    version: 1,
  });

  const packet = buildExecutionPacketV1({ state });
  const parsed = ExecutionPacketV1Schema.parse(packet);
  assert.equal(parsed.service_lifecycle_constraints.length, 1);
  assert.equal(parsed.service_lifecycle_constraints[0]?.must_survive_agent_exit, true);
  assert.equal(parsed.service_lifecycle_constraints[0]?.revalidate_from_fresh_shell, true);
  assert.equal(parsed.service_lifecycle_constraints[0]?.detach_then_probe, true);
  assert.equal(parsed.service_lifecycle_constraints[0]?.endpoint, "http://localhost:8080/healthz");
});

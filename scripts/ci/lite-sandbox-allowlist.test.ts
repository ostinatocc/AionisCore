import test from "node:test";
import assert from "node:assert/strict";
import {
  parseCidrRule,
  sandboxRemoteEgressAllowed,
  sandboxRemoteHostAllowed,
} from "../../src/memory/sandbox.ts";

test("sandbox remote host allowlist fails closed when empty", () => {
  assert.equal(sandboxRemoteHostAllowed("api.example.com", new Set()), false);
  assert.equal(
    sandboxRemoteHostAllowed("api.example.com", new Set(["api.example.com", "*.example.org"])),
    true,
  );
});

test("sandbox remote egress allowlist fails closed when empty", () => {
  const cidr = parseCidrRule("203.0.113.0/24");
  if (!cidr) {
    throw new Error("expected CIDR rule to parse");
  }

  assert.equal(sandboxRemoteEgressAllowed(["203.0.113.10"], []), false);
  assert.equal(sandboxRemoteEgressAllowed(["203.0.113.10"], [cidr]), true);
  assert.equal(sandboxRemoteEgressAllowed(["203.0.113.10", "198.51.100.20"], [cidr]), false);
});

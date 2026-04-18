import stableStringify from "fast-json-stable-stringify";
import type pg from "pg";
import { sha256Hex } from "../util/crypto.js";
import { normalizeText } from "../util/normalize.js";
import { redactPII } from "../util/redaction.js";
import { badRequest } from "../util/http.js";
import { computeFeedbackUpdatedNodeState } from "./node-feedback-state.js";
import { MemoryNodesActivateRequest } from "./schemas.js";
import { resolveTenantScope } from "./tenant.js";

type ActivateOptions = {
  maxTextLen: number;
  piiRedaction: boolean;
};

type NodeRow = {
  id: string;
  type: string;
  title: string | null;
  text_summary: string | null;
  tier: string | null;
  slots: Record<string, unknown> | null;
  salience: number;
  importance: number;
  confidence: number;
};

function uniqStrings(xs: string[]): string[] {
  return Array.from(new Set(xs));
}

function normalizeMaybeRedact(input: string | undefined, opts: ActivateOptions): string | undefined {
  if (!input) return input;
  const normalized = normalizeText(input, opts.maxTextLen);
  if (!opts.piiRedaction) return normalized;
  return redactPII(normalized).text;
}

export async function activateMemoryNodes(
  client: pg.PoolClient,
  body: unknown,
  defaultScope: string,
  defaultTenantId: string,
  opts: ActivateOptions,
) {
  const parsed = MemoryNodesActivateRequest.parse(body);
  const tenancy = resolveTenantScope(
    { scope: parsed.scope, tenant_id: parsed.tenant_id },
    { defaultScope, defaultTenantId },
  );
  const scope = tenancy.scope_key;
  const actor = parsed.actor ?? "system";
  const startedAt = new Date().toISOString();
  const reason = normalizeMaybeRedact(parsed.reason, opts) ?? null;
  const inputText = normalizeMaybeRedact(parsed.input_text, opts);
  const inputSha = parsed.input_sha256 ?? sha256Hex(inputText!);

  const requestedNodeIds = uniqStrings((parsed.node_ids ?? []).map((x) => x.toLowerCase()));
  const requestedClientIds = uniqStrings((parsed.client_ids ?? []).map((x) => x.trim()).filter((x) => x.length > 0));
  const resolvedNodeIdSet = new Set<string>(requestedNodeIds);
  const resolvedByClient: Array<{ client_id: string; node_id: string }> = [];
  const missingClientIds: string[] = [];

  if (requestedClientIds.length > 0) {
    const rs = await client.query<{ id: string; client_id: string }>(
      `
      SELECT id::text AS id, client_id
      FROM memory_nodes
      WHERE scope = $1
        AND client_id = ANY($2::text[])
      `,
      [scope, requestedClientIds],
    );
    const m = new Map<string, string>();
    for (const row of rs.rows) m.set(row.client_id, row.id);
    for (const cid of requestedClientIds) {
      const id = m.get(cid);
      if (!id) {
        missingClientIds.push(cid);
        continue;
      }
      resolvedByClient.push({ client_id: cid, node_id: id });
      resolvedNodeIdSet.add(id);
    }
  }

  const resolvedNodeIds = Array.from(resolvedNodeIdSet);
  if (resolvedNodeIds.length === 0) {
    badRequest("nodes_activate_no_resolved_nodes", "No valid node_ids/client_ids resolved under this scope");
  }

  const foundRes = await client.query<NodeRow>(
    `
    SELECT
      id::text AS id,
      type,
      title,
      text_summary,
      tier::text AS tier,
      slots,
      salience,
      importance,
      confidence
    FROM memory_nodes
    WHERE scope = $1
      AND id = ANY($2::uuid[])
    `,
    [scope, resolvedNodeIds],
  );
  const foundMap = new Map(foundRes.rows.map((x) => [x.id, x]));
  const missingNodeIds = resolvedNodeIds.filter((id) => !foundMap.has(id));
  const foundNodeIds = foundRes.rows.map((x) => x.id);

  if (foundNodeIds.length === 0) {
    return {
      scope: tenancy.scope,
      tenant_id: tenancy.tenant_id,
      commit_id: null as string | null,
      commit_hash: null as string | null,
      activated: {
        requested_node_ids: requestedNodeIds.length,
        requested_client_ids: requestedClientIds.length,
        resolved_node_ids: resolvedNodeIds.length,
        found_nodes: 0,
        updated_nodes: 0,
        missing_node_ids: missingNodeIds,
        missing_client_ids: missingClientIds,
        updated_ids: [] as string[],
      },
    };
  }

  const parentRes = await client.query<{ id: string; commit_hash: string }>(
    "SELECT id, commit_hash FROM memory_commits WHERE scope = $1 ORDER BY created_at DESC LIMIT 1",
    [scope],
  );
  const parentHash = parentRes.rowCount ? parentRes.rows[0].commit_hash : "";
  const parentId = parentRes.rowCount ? parentRes.rows[0].id : null;

  const diff = {
    job: "nodes_activate",
    started_at: startedAt,
    scope,
    actor,
    run_id: parsed.run_id ?? null,
    outcome: parsed.outcome,
    activate: parsed.activate,
    reason,
    requested: {
      node_ids: requestedNodeIds,
      client_ids: requestedClientIds,
    },
    resolved_by_client: resolvedByClient,
    found_node_ids: foundNodeIds,
    missing_node_ids: missingNodeIds,
    missing_client_ids: missingClientIds,
  };
  const diffSha = sha256Hex(stableStringify(diff));
  const commitHash = sha256Hex(stableStringify({ parentHash, inputSha, diffSha, scope, actor, kind: "nodes_activate" }));

  const commitRes = await client.query<{ id: string }>(
    `INSERT INTO memory_commits (scope, parent_id, input_sha256, diff_json, actor, commit_hash)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     ON CONFLICT (commit_hash) DO UPDATE SET diff_json = memory_commits.diff_json
     RETURNING id`,
    [scope, parentId, inputSha, JSON.stringify(diff), actor, commitHash],
  );
  const commitId = commitRes.rows[0].id;

  for (const row of foundRes.rows) {
    const nextState = computeFeedbackUpdatedNodeState({
      node: row,
      feedback: {
        outcome: parsed.outcome,
        run_id: parsed.run_id ?? null,
        reason,
        input_sha256: inputSha,
        source: "nodes_activate",
        timestamp: startedAt,
      },
    });
    const slots = { ...nextState.slots };
    if (parsed.activate) {
      slots.last_activated_at = startedAt;
    }

    await client.query(
      `
      UPDATE memory_nodes
      SET
        slots = $1::jsonb,
        salience = $2,
        importance = $3,
        confidence = $4,
        last_activated = CASE WHEN $5::bool THEN now() ELSE last_activated END,
        commit_id = $6::uuid
      WHERE scope = $7
        AND id = $8::uuid
      `,
      [
        JSON.stringify(slots),
        nextState.salience,
        nextState.importance,
        nextState.confidence,
        parsed.activate,
        commitId,
        scope,
        row.id,
      ],
    );
  }

  return {
    scope: tenancy.scope,
    tenant_id: tenancy.tenant_id,
    commit_id: commitId,
    commit_hash: commitHash,
    activated: {
      requested_node_ids: requestedNodeIds.length,
      requested_client_ids: requestedClientIds.length,
      resolved_node_ids: resolvedNodeIds.length,
      found_nodes: foundRes.rows.length,
      updated_nodes: foundRes.rows.length,
      missing_node_ids: missingNodeIds,
      missing_client_ids: missingClientIds,
      updated_ids: foundNodeIds,
      outcome: parsed.outcome,
      activate: parsed.activate,
    },
  };
}

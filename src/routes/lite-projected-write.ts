import type pg from "pg";
import type { EmbeddingProvider } from "../embeddings/types.js";
import type { AssociativeLinkTriggerOrigin } from "../memory/associative-linking-types.js";
import { applyMemoryWrite, type PreparedWrite } from "../memory/write.js";
import type { WriteStoreAccess } from "../store/write-access.js";
import { completeLiteInlineEmbeddings, type LiteInlineEmbeddingStore } from "./lite-inline-embedding.js";
import { appendLiteWorkflowProjection, type LiteWorkflowProjectionStore } from "./lite-workflow-projection.js";

export type LiteProjectedWriteStore = WriteStoreAccess & LiteWorkflowProjectionStore & LiteInlineEmbeddingStore & {
  withTx: <T>(fn: () => Promise<T>) => Promise<T>;
};

export async function commitLitePreparedWriteWithProjection(args: {
  prepared: PreparedWrite;
  liteWriteStore: LiteProjectedWriteStore;
  embedder: EmbeddingProvider | null;
  governanceReviewProviders?: Parameters<typeof appendLiteWorkflowProjection>[0]["governanceReviewProviders"];
  writeOptions: {
    maxTextLen: number;
    piiRedaction: boolean;
    allowCrossScopeEdges: boolean;
    shadowDualWriteEnabled: boolean;
    shadowDualWriteStrict: boolean;
    associativeLinkOrigin?: AssociativeLinkTriggerOrigin;
  };
}) {
  await appendLiteWorkflowProjection({
    prepared: args.prepared,
    liteWriteStore: args.liteWriteStore,
    governanceReviewProviders: args.governanceReviewProviders,
  });
  const out = await args.liteWriteStore.withTx(() =>
    applyMemoryWrite({} as pg.PoolClient, args.prepared, {
      maxTextLen: args.writeOptions.maxTextLen,
      piiRedaction: args.writeOptions.piiRedaction,
      allowCrossScopeEdges: args.writeOptions.allowCrossScopeEdges,
      shadowDualWriteEnabled: args.writeOptions.shadowDualWriteEnabled,
      shadowDualWriteStrict: args.writeOptions.shadowDualWriteStrict,
      write_access: args.liteWriteStore,
      ...(args.writeOptions.associativeLinkOrigin
        ? { associativeLinkOrigin: args.writeOptions.associativeLinkOrigin }
        : {}),
    }),
  );
  const liteInlineEmbedding = await completeLiteInlineEmbeddings({
    prepared: args.prepared,
    embedder: args.embedder,
    liteWriteStore: args.liteWriteStore,
  });
  return {
    out,
    liteInlineEmbedding,
  };
}

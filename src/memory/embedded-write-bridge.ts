import type { EmbeddedMemoryRuntime } from "../store/embedded-memory-runtime.js";
import type { PreparedWrite, WriteResult } from "./write.js";

export async function mirrorPreparedWriteToEmbeddedRuntime(args: {
  embeddedRuntime?: EmbeddedMemoryRuntime | null;
  prepared: PreparedWrite;
  out: WriteResult;
}): Promise<void> {
  if (!args.embeddedRuntime) return;
  await args.embeddedRuntime.applyWrite(args.prepared, args.out);
}

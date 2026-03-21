import { loadAionisMcpEnv } from "../mcp/client.js";
import { createAionisAdapterSidecar } from "./sidecar.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const env = loadAionisMcpEnv(process.env);
  const sidecar = createAionisAdapterSidecar({ env });
  const raw = (await readStdin()).trim();
  if (!raw) {
    process.stdout.write(JSON.stringify({ ok: false, request_id: null, error: "empty_request" }) + "\n");
    process.exitCode = 1;
    return;
  }
  try {
    const request = JSON.parse(raw);
    const response = await sidecar.dispatch(request);
    process.stdout.write(`${JSON.stringify(response)}\n`);
  } catch (error) {
    process.stdout.write(JSON.stringify({
      ok: false,
      request_id: null,
      error: "sidecar_dispatch_failed",
      details: String(error),
    }) + "\n");
    process.exitCode = 1;
  }
}

await main();

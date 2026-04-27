import { MetricGrid, PageHero, SectionBlock } from "../../components/marketing";

const suiteRows = [
  {
    suite: "Runtime execution-memory A/B",
    challenger: "thin_baseline",
    result: "31 / 31 winner = aionis",
    note: "Includes replay, forgetting, multi-cycle refinement, and production simulation families.",
  },
  {
    suite: "Runtime execution-memory A/B",
    challenger: "chat_history_baseline",
    result: "25 / 25 winner = aionis",
    note: "Shows plain chat history is not enough to recover continuity contracts.",
  },
  {
    suite: "Runtime execution-memory A/B",
    challenger: "vector_recall_baseline",
    result: "25 / 25 winner = aionis",
    note: "Shows pure semantic recall is not enough to recover execution continuity.",
  },
] as const;

const familyRows = [
  { family: "Repeated-task guidance", thin: "5/5", chat: "5/5", vector: "5/5" },
  { family: "Uncertainty-gated start", thin: "3/3", chat: "3/3", vector: "3/3" },
  { family: "Continuity restoration", thin: "2/2", chat: "2/2", vector: "2/2" },
  { family: "Real-repo handoff", thin: "3/3", chat: "3/3", vector: "3/3" },
  { family: "Policy tool routing", thin: "3/3", chat: "3/3", vector: "3/3" },
  { family: "Semantic forgetting recovery", thin: "3/3", chat: "3/3", vector: "3/3" },
  { family: "Replay-guided follow-up", thin: "3/3", chat: "—", vector: "—" },
  { family: "Multi-cycle refinement", thin: "3/3", chat: "3/3", vector: "3/3" },
  { family: "Production simulation", thin: "3/3", chat: "3/3", vector: "3/3" },
  { family: "Strict replay reuse", thin: "3/3", chat: "—", vector: "—" },
] as const;

const systemsRows = [
  { surface: "memory.write", samples: "3/3", p50: "409.3837 ms", p95: "429.1686 ms" },
  { surface: "kickoffRecommendation (warm)", samples: "3/3", p50: "359.5082 ms", p95: "372.878 ms" },
  { surface: "actionRetrieval (warm)", samples: "3/3", p50: "364.6533 ms", p95: "426.945 ms" },
  { surface: "handoff.recover", samples: "3/3", p50: "3.2023 ms", p95: "6.731 ms" },
  { surface: "continuity_review_pack", samples: "3/3", p50: "3.7562 ms", p95: "4.5465 ms" },
  { surface: "replay.candidate", samples: "3/3", p50: "1.1481 ms", p95: "2.206 ms" },
  { surface: "replay.dispatch", samples: "3/3", p50: "4096.3294 ms", p95: "4715.6253 ms" },
] as const;

const loadRows = [
  { surface: "kickoff_recommendation_concurrent", result: "6/6", p50: "388.0594 ms", p95: "542.3158 ms", throughput: "2.3382 req/s" },
  { surface: "action_retrieval_concurrent", result: "6/6", p50: "344.3946 ms", p95: "452.0812 ms", throughput: "2.682 req/s" },
  { surface: "handoff_recover_concurrent", result: "6/6", p50: "3.7095 ms", p95: "6.9341 ms", throughput: "218.0351 req/s" },
  { surface: "continuity_review_pack_concurrent", result: "6/6", p50: "3.5405 ms", p95: "4.5417 ms", throughput: "268.9498 req/s" },
  { surface: "replay_candidate_concurrent", result: "6/6", p50: "3.0744 ms", p95: "5.652 ms", throughput: "272.3794 req/s" },
] as const;

export default function BenchmarksPage() {
  return (
    <div className="page-stack">
      <PageHero
        kicker="Benchmarks"
        title="Runtime claims backed by public validation."
        body="Aionis publishes green Runtime and SDK suites, real-provider A/B results, systems latency snapshots, and concurrent load snapshots so its behavior can be inspected instead of assumed."
        actions={[
          { href: "/proofs", label: "View Proofs" },
          { href: "/docs", label: "Read Docs" },
        ]}
      />
      <SectionBlock index="01" kicker="Current baseline" title="The public baseline is measurable, not hand-waved.">
        <div className="page-copy">
          <p>
            Current outward-facing validation uses a real-provider stack for external benchmarks and the public Runtime
            repository for test and docs checks.
          </p>
          <p>
            Real-provider stack: <strong>MiniMax / embo-01</strong> for embeddings and{" "}
            <strong>Moonshot / kimi-k2.6</strong> for governance.
          </p>
          <MetricGrid />
        </div>
      </SectionBlock>
      <SectionBlock index="02" kicker="A/B snapshot" title="Aionis beat thin loops, plain chat history, and pure semantic recall in the current real-provider snapshot.">
        <div className="page-copy">
          <table className="data-table">
            <thead>
              <tr>
                <th>Suite</th>
                <th>Challenger</th>
                <th>Result</th>
                <th>What it means</th>
              </tr>
            </thead>
            <tbody>
              {suiteRows.map((row) => (
                <tr key={row.challenger}>
                  <td>{row.suite}</td>
                  <td>
                    <code>{row.challenger}</code>
                  </td>
                  <td>
                    <strong>{row.result}</strong>
                  </td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionBlock>
      <SectionBlock index="03" kicker="Coverage" title="The benchmark now covers the Runtime families Aionis is actually built to improve.">
        <div className="page-copy">
          <table className="data-table">
            <thead>
              <tr>
                <th>Family</th>
                <th>Thin</th>
                <th>Chat</th>
                <th>Vector</th>
              </tr>
            </thead>
            <tbody>
              {familyRows.map((row) => (
                <tr key={row.family}>
                  <td>{row.family}</td>
                  <td>{row.thin}</td>
                  <td>{row.chat}</td>
                  <td>{row.vector}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            The strongest current findings are straightforward: Aionis restores archived workflows after forgetting,
            recovers real-repo handoff contracts, compiles zero-token strict replay paths, carries replay guidance into
            follow-up work, and preserves multi-cycle and production-style execution contracts where the challenger arms
            stall or escalate.
          </p>
        </div>
      </SectionBlock>
      <SectionBlock index="04" kicker="Repo validation" title="The Runtime and SDK surfaces are defended by green public suites.">
        <div className="page-copy">
          <table className="data-table">
            <thead>
              <tr>
                <th>Surface</th>
                <th>Command</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Lite runtime test suite</td>
                <td>
                  <code>npm run -s lite:test</code>
                </td>
                <td>
                  <strong>319 / 319 pass</strong>
                </td>
              </tr>
              <tr>
                <td>Public SDK test suite</td>
                <td>
                  <code>npm run -s sdk:test</code>
                </td>
                <td>
                  <strong>20 / 20 pass</strong>
                </td>
              </tr>
              <tr>
                <td>Docs reference integrity</td>
                <td>
                  <code>node scripts/ci/docs-reference-check.mjs</code>
                </td>
                <td>
                  <strong>47 active markdown files checked</strong>
                </td>
              </tr>
              <tr>
                <td>Docs build and reference validation</td>
                <td>
                  <code>npm run -s docs:check</code>
                </td>
                <td>
                  <strong>pass</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionBlock>
      <SectionBlock index="05" kicker="Systems" title="Single-request and small-concurrency snapshots are already public.">
        <div className="page-copy">
          <table className="data-table">
            <thead>
              <tr>
                <th>Surface</th>
                <th>Samples</th>
                <th>p50</th>
                <th>p95</th>
              </tr>
            </thead>
            <tbody>
              {systemsRows.map((row) => (
                <tr key={row.surface}>
                  <td>{row.surface}</td>
                  <td>{row.samples}</td>
                  <td>{row.p50}</td>
                  <td>{row.p95}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="data-table">
            <thead>
              <tr>
                <th>Concurrent surface</th>
                <th>Result</th>
                <th>p50</th>
                <th>p95</th>
                <th>Throughput</th>
              </tr>
            </thead>
            <tbody>
              {loadRows.map((row) => (
                <tr key={row.surface}>
                  <td>{row.surface}</td>
                  <td>{row.result}</td>
                  <td>{row.p50}</td>
                  <td>{row.p95}</td>
                  <td>{row.throughput}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            The current systems snapshot shows that warmed kickoff and action-retrieval paths are stable under a real
            provider stack, while handoff recovery, continuity review, and replay candidate projection remain very fast.
          </p>
        </div>
      </SectionBlock>
      <SectionBlock index="06" kicker="Boundary" title="This report is already strong, but it is not the final benchmark program.">
        <div className="page-copy">
          <p>
            What it proves now: Aionis outperforms thin loops, plain chat history, and pure semantic recall on repeated
            task starts, uncertainty-gated recovery, continuity restoration, real-repo handoff recovery, policy-backed
            tool routing, semantic forgetting recovery, replay-guided follow-up, multi-cycle refinement, production
            simulation, and zero-token strict replay reuse.
          </p>
          <p>
            What it does not prove yet: large-sample stability at <code>50 / 100+</code> scenarios, formal
            cross-framework superiority, cost superiority, or higher-concurrency saturation behavior.
          </p>
        </div>
      </SectionBlock>
    </div>
  );
}

import { CommandBlock, LinkRow, PageHero, SectionBlock } from "../../components/marketing";

export default function RuntimePage() {
  return (
    <div className="page-stack">
      <PageHero
        kicker="Runtime"
        title="Start Aionis as a standalone runtime."
        body="Aionis Runtime gives your agents a local-first execution-memory engine you can start in one command."
        commands={["npx @ostinato/aionis-runtime start"]}
        actions={[
          { href: "/getting-started", label: "Getting Started" },
          { href: "/sdk", label: "Install SDK" },
        ]}
      />
      <SectionBlock index="01" kicker="What runs locally" title="Aionis ships as a local-first runtime entry, not just a repository.">
        <div className="page-copy">
          <p>
            First-time users should be able to boot the runtime without cloning the monorepo. The standalone runtime
            package is the default public start path for evaluation and local development.
          </p>
          <CommandBlock lines={["npx @ostinato/aionis-runtime start"]} />
        </div>
      </SectionBlock>
      <SectionBlock index="02" kicker="Posture" title="Local-first by default.">
        <div className="page-copy">
          <p>
            Lite runtime posture is loopback-safe by default and favors local evaluation, iteration, and reproducible
            development flows. The runtime is designed to be started fast, inspected easily, and integrated through HTTP
            clients and host bridges.
          </p>
        </div>
      </SectionBlock>
      <SectionBlock index="03" kicker="What the runtime does" title="Aionis captures continuity, replay, retrieval, and forgetting as runtime behavior.">
        <div className="page-copy">
          <p>
            It is not only a persistence layer. It provides continuity-aware startup, handoff, replay, action retrieval,
            uncertainty gating, semantic forgetting, and operator-facing projections.
          </p>
          <LinkRow
            links={[
              { href: "/continuity", label: "Continuity" },
              { href: "/action-retrieval", label: "Action Retrieval" },
              { href: "/forgetting", label: "Semantic Forgetting" },
            ]}
          />
        </div>
      </SectionBlock>
    </div>
  );
}

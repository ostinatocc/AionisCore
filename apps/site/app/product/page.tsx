import { PageHero, SectionBlock, RuntimeLoop, CapabilityGrid, ArchitectureStack } from "../../components/marketing";

export default function ProductPage() {
  return (
    <div className="page-stack">
      <PageHero
        kicker="Product"
        title="A runtime category for continuity, retrieval, replay, and evolution."
        body="Aionis is the self-evolving continuity execution-memory engine for agent systems. It exists to turn execution into durable runtime memory and to convert repeated successful behavior into reusable guidance."
        actions={[
          { href: "/runtime", label: "View Runtime" },
          { href: "/proofs", label: "View Proofs" },
        ]}
      />
      <SectionBlock index="01" kicker="Category thesis" title="Execution continuity is the missing runtime layer.">
        <div className="page-copy">
          <p>
            Chat memory stores conversations. Vector systems retrieve references. Orchestration frameworks route steps.
            Aionis adds the runtime layer that preserves execution continuity, retrieves the next action, gates on
            uncertainty, and replays successful workflows.
          </p>
        </div>
      </SectionBlock>
      <SectionBlock index="02" kicker="Runtime loop" title="Aionis turns execution into a durable loop.">
        <RuntimeLoop />
      </SectionBlock>
      <SectionBlock index="03" kicker="Capabilities" title="A runtime for long-horizon agent behavior.">
        <CapabilityGrid />
      </SectionBlock>
      <SectionBlock index="04" kicker="Architecture" title="Built as a layered runtime system, not a thin wrapper.">
        <ArchitectureStack />
      </SectionBlock>
    </div>
  );
}

import { PageHero, ProofGrid, SectionBlock } from "../../components/marketing";

export default function SelfEvolvingPage() {
  return (
    <div className="page-stack">
      <PageHero
        kicker="Self-evolving"
        title="Execution teaches the runtime."
        body="Aionis turns repeated execution into learned startup behavior, reusable workflows, policy memory, and stronger continuity over time."
        actions={[
          { href: "/proofs", label: "View Proofs" },
          { href: "/product", label: "View Product" },
        ]}
      />
      <SectionBlock index="01" kicker="Learning loop" title="Aionis evolves through execution evidence, not through vague memory accumulation.">
        <div className="page-copy">
          <p>
            Repeated task starts, workflow replays, and continuity observations can be promoted into reusable runtime
            behavior. The system does not merely retrieve text; it converts execution outcomes into future guidance.
          </p>
        </div>
      </SectionBlock>
      <SectionBlock index="02" kicker="Evidence" title="Public proofs make the self-evolving story inspectable.">
        <ProofGrid />
      </SectionBlock>
    </div>
  );
}

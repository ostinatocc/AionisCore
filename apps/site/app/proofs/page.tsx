import { PageHero, ProofGrid, SectionBlock } from "../../components/marketing";

export default function ProofsPage() {
  return (
    <div className="page-stack">
      <PageHero
        kicker="Proofs"
        title="Verify Aionis through reproducible runtime proofs."
        body="Each proof demonstrates a concrete runtime behavior and includes a real command you can run yourself."
        actions={[
          { href: "/getting-started", label: "Get Started" },
          { href: "https://github.com/ostinatocc/AionisCore/tree/main/examples/full-sdk", label: "View Examples", external: true },
        ]}
      />
      <SectionBlock index="01" kicker="Proof by evidence" title="Six runtime proofs are already public and reproducible.">
        <ProofGrid />
      </SectionBlock>
    </div>
  );
}

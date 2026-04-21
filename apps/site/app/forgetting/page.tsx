import { PageHero, SectionBlock } from "../../components/marketing";

export default function ForgettingPage() {
  return (
    <div className="page-stack">
      <PageHero
        kicker="Semantic forgetting"
        title="Aionis forgets intelligently."
        body="Instead of endlessly accumulating context, Aionis can demote, archive, review, and rehydrate execution memory based on importance and lifecycle signals."
        actions={[
          { href: "/proofs", label: "View Proofs" },
          { href: "/runtime", label: "View Runtime" },
        ]}
      />
      <SectionBlock index="01" kicker="Forgetting is not deletion" title="Cooling memory is a lifecycle decision, not a blind erase operation.">
        <div className="page-copy">
          <p>
            Aionis uses lifecycle signals to decide whether memory should remain hot, be demoted, be archived, or be
            rehydrated on demand later. The point is control and explainability, not arbitrary truncation.
          </p>
        </div>
      </SectionBlock>
    </div>
  );
}

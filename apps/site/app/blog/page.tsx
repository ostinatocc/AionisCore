import { BlogGrid, PageHero, SectionBlock } from "../../components/marketing";

export default function BlogPage() {
  return (
    <div className="page-stack">
      <PageHero
        kicker="Blog"
        title="Product essays for continuity, replay, retrieval, and runtime design."
        body="The Aionis blog should explain the category, the runtime loop, and how to think about self-evolving execution memory in real agent systems."
        actions={[
          { href: "/product", label: "View Product" },
          { href: "/proofs", label: "View Proofs" },
        ]}
      />
      <SectionBlock index="01" kicker="Editorial direction" title="Write about why this runtime category exists, not just what was shipped.">
        <BlogGrid />
      </SectionBlock>
    </div>
  );
}

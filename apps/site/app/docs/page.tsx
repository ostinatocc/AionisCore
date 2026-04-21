import { LinkRow, PageHero, SectionBlock } from "../../components/marketing";

export default function DocsPage() {
  return (
    <div className="page-stack">
      <PageHero
        kicker="Docs"
        title="Reference, quickstarts, and runtime guides."
        body="The product site explains what Aionis is. The docs surface explains how specific runtime, SDK, proof, and reference paths work."
        actions={[
          { href: "/getting-started", label: "Getting Started" },
          { href: "/sdk", label: "SDK" },
        ]}
      />
      <SectionBlock index="01" kicker="Current docs" title="Use the current docs paths while the new product site expands.">
        <div className="page-copy">
          <p>
            The initial Next.js website focuses on category, runtime, SDK, proofs, and benchmark storytelling. The
            existing documentation continues to provide deeper reference coverage while the new site grows.
          </p>
          <LinkRow
            links={[
              { href: "https://github.com/ostinatocc/AionisCore/tree/main/apps/docs", label: "Docs source", external: true },
              { href: "https://ostinatocc.github.io/AionisCore/", label: "Published docs", external: true },
              { href: "/changelog", label: "Changelog" },
              { href: "/blog", label: "Blog" },
            ]}
          />
        </div>
      </SectionBlock>
    </div>
  );
}

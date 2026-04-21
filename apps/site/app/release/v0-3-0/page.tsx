import { PageHero, ReleasePanel, SectionBlock } from "../../../components/marketing";

export default function ReleaseV030Page() {
  return (
    <div className="page-stack">
      <PageHero
        kicker="Release v0.3.0"
        title="Aionis Runtime v0.3.0"
        body="This release turns Aionis into a cleaner public product shape with a standalone runtime install path, stronger runtime decision surfaces, and clearer evaluation flows."
        actions={[
          { href: "/runtime", label: "Start Runtime" },
          { href: "https://github.com/ostinatocc/AionisCore/releases/tag/v0.3.0", label: "GitHub Release", external: true },
        ]}
      />
      <SectionBlock index="01" kicker="Highlights" title="Runtime distribution, retrieval, gates, and public packaging all moved forward together.">
        <ReleasePanel />
      </SectionBlock>
    </div>
  );
}

import { ChangelogFeed, PageHero, SectionBlock } from "../../components/marketing";

export default function ChangelogPage() {
  return (
    <div className="page-stack">
      <PageHero
        kicker="Changelog"
        title="Follow Aionis releases and runtime milestones."
        body="Track shipped runtime, SDK, docs, and validation updates in one place."
        actions={[
          { href: "/release/v0-3-0", label: "View Latest Release" },
          { href: "https://github.com/ostinatocc/AionisCore/releases", label: "GitHub Releases", external: true },
        ]}
      />
      <SectionBlock index="01" kicker="Release timeline" title="Public milestones are organized around runtime, SDK, and proof maturity.">
        <ChangelogFeed />
      </SectionBlock>
    </div>
  );
}

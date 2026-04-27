import { PageHero, ReleasePanel, SectionBlock } from "../../../components/marketing";

export default function ReleaseV040Page() {
  return (
    <div className="page-stack">
      <PageHero
        kicker="Release v0.4.0"
        title="Aionis Runtime v0.4.0 Lite Developer Preview"
        body="This release moves Aionis Runtime into a preview-ready line with hardened Runtime boundaries, explicit authority and outcome gates, expanded SDK host facades, live dogfood proof paths, and release-readiness documentation."
        actions={[
          { href: "/runtime", label: "Start Runtime" },
          { href: "https://github.com/ostinatocc/AionisCore/releases/tag/v0.4.0", label: "GitHub Release", external: true },
        ]}
      />
      <SectionBlock index="01" kicker="Highlights" title="The Lite runtime is now packaged, tested, documented, and bounded as a developer-preview release line.">
        <ReleasePanel />
      </SectionBlock>
    </div>
  );
}

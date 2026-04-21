import { CommandBlock, LinkRow, PageHero, SectionBlock } from "../../components/marketing";

export default function GettingStartedPage() {
  return (
    <div className="page-stack">
      <PageHero
        kicker="Getting started"
        title="Start Aionis in minutes."
        body="Launch the standalone runtime, install the SDK, and run your first continuity-aware agent flow."
        commands={["npx @ostinato/aionis-runtime start", "npm install @ostinato/aionis"]}
        actions={[
          { href: "/sdk", label: "View SDK" },
          { href: "/proofs", label: "View Proofs" },
        ]}
      />
      <SectionBlock index="01" kicker="Step 1" title="Start the standalone runtime.">
        <div className="page-copy">
          <p>Use the runtime package first. It is now the default public start path.</p>
          <CommandBlock lines={["npx @ostinato/aionis-runtime start"]} />
        </div>
      </SectionBlock>
      <SectionBlock index="02" kicker="Step 2" title="Install the SDK in your own project.">
        <div className="page-copy">
          <p>Once the runtime is up, install the public SDK and start integrating planning, retrieval, kickoff, and replay.</p>
          <CommandBlock lines={["npm install @ostinato/aionis"]} />
        </div>
      </SectionBlock>
      <SectionBlock index="03" kicker="Next steps" title="Choose the path that matches what you are trying to validate.">
        <div className="page-copy">
          <LinkRow
            links={[
              { href: "/sdk", label: "SDK integration" },
              { href: "/proofs", label: "Reproducible proofs" },
              { href: "https://github.com/ostinatocc/AionisCore/tree/main/apps/docs", label: "Current docs source", external: true },
            ]}
          />
        </div>
      </SectionBlock>
    </div>
  );
}

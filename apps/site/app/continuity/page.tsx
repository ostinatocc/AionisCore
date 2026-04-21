import { PageHero, SectionBlock } from "../../components/marketing";

export default function ContinuityPage() {
  return (
    <div className="page-stack">
      <PageHero
        kicker="Continuity"
        title="Continuity is a runtime feature, not a prompt trick."
        body="Aionis preserves execution context across starts, handoffs, sessions, and replays so agents can resume with real memory instead of beginning from zero."
        actions={[
          { href: "/proofs", label: "View Proofs" },
          { href: "/runtime", label: "View Runtime" },
        ]}
      />
      <SectionBlock index="01" kicker="Task continuity" title="Task start quality improves when prior execution is carried forward.">
        <div className="page-copy">
          <p>
            Aionis treats startup as a continuity problem. Prior successful execution can influence the next kickoff,
            rather than relying on a flat stateless recommendation each time.
          </p>
        </div>
      </SectionBlock>
      <SectionBlock index="02" kicker="Handoff and sessions" title="Continuity persists across handoffs and sessions.">
        <div className="page-copy">
          <p>
            Handoff and session continuity are explicit runtime surfaces, not just ad hoc serialized notes. That gives
            hosts and operators more stable restart and review behavior.
          </p>
        </div>
      </SectionBlock>
    </div>
  );
}

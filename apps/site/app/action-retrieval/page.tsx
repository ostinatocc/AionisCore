import { CommandBlock, PageHero, SectionBlock } from "../../components/marketing";

export default function ActionRetrievalPage() {
  return (
    <div className="page-stack">
      <PageHero
        kicker="Action Retrieval"
        title="Retrieve the next action, not just the next document."
        body="Aionis surfaces the likely next tool, file, and action from prior execution evidence, then exposes the reasons and uncertainty behind that recommendation."
        actions={[
          { href: "/sdk", label: "View SDK" },
          { href: "/uncertainty-gates", label: "View Gates" },
        ]}
      />
      <SectionBlock index="01" kicker="Public surface" title="Action retrieval is now a first-class runtime and SDK capability.">
        <div className="page-copy">
          <p>
            Instead of burying the next move inside a compact kickoff summary, Aionis exposes action retrieval directly so
            apps and hosts can inspect evidence, confidence, source kind, and escalation behavior.
          </p>
          <CommandBlock
            lines={[
              "const retrieval = await client.memory.actionRetrieval({ ... });",
              "retrieval.selected_tool;",
              "retrieval.recommended_next_action;",
            ]}
          />
        </div>
      </SectionBlock>
    </div>
  );
}

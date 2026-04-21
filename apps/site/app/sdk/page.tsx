import { CommandBlock, LinkRow, PageHero, SectionBlock } from "../../components/marketing";

export default function SdkPage() {
  return (
    <div className="page-stack">
      <PageHero
        kicker="SDK"
        title="Integrate Aionis into your own agent system."
        body="Use the Aionis SDK to connect apps, hosts, and runtimes through planning, action retrieval, kickoff, handoff, replay, and operator projection."
        commands={["npm install @ostinato/aionis"]}
        actions={[
          { href: "/getting-started", label: "Quickstart" },
          { href: "/runtime", label: "Start Runtime" },
        ]}
      />
      <SectionBlock index="01" kicker="Planning" title="Start with planning context, then retrieve the next move.">
        <div className="page-copy">
          <p>
            The current public SDK path is not only planning then kickoff. It explicitly includes action retrieval and
            uncertainty surfaces so hosts can understand why a runtime suggests a next action or why it escalates.
          </p>
          <CommandBlock
            lines={[
              "const planning = await client.memory.planningContext(...);",
              "const retrieval = await client.memory.actionRetrieval(...);",
              "const kickoff = await client.memory.taskStart(...);",
            ]}
          />
        </div>
      </SectionBlock>
      <SectionBlock index="02" kicker="Host integration" title="Bridge runtime decisions into hosts and operators.">
        <div className="page-copy">
          <p>
            The SDK exposes host bridge surfaces for startup decisions, operator projection, action hints, and gated
            escalation instead of forcing hosts to reverse-engineer planner output.
          </p>
          <LinkRow
            links={[
              { href: "/uncertainty-gates", label: "Uncertainty Gates" },
              { href: "/action-retrieval", label: "Action Retrieval" },
              { href: "/proofs", label: "Proofs" },
            ]}
          />
        </div>
      </SectionBlock>
    </div>
  );
}

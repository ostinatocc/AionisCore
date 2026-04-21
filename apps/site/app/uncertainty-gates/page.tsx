import { PageHero, SectionBlock } from "../../components/marketing";

export default function UncertaintyGatesPage() {
  return (
    <div className="page-stack">
      <PageHero
        kicker="Uncertainty and gates"
        title="Know when not to act with confidence."
        body="Aionis exposes uncertainty as a runtime surface and turns weak retrieval into explicit gates such as inspect, widen recall, rehydrate, or request operator review."
        actions={[
          { href: "/action-retrieval", label: "View Retrieval" },
          { href: "/sdk", label: "View SDK" },
        ]}
      />
      <SectionBlock index="01" kicker="Gate modes" title="Weak retrieval becomes an explicit runtime decision.">
        <div className="page-copy">
          <p>
            Aionis does not flatten uncertainty into a fake deterministic first action. It can escalate into inspect
            context, widen recall, rehydrate payload, or request operator review based on the available evidence.
          </p>
          <div className="capability-grid">
            <article className="capability-card">
              <p className="eyebrow">Gate</p>
              <h3>inspect_context</h3>
              <p>Pause and inspect the current runtime context before acting.</p>
            </article>
            <article className="capability-card">
              <p className="eyebrow">Gate</p>
              <h3>widen_recall</h3>
              <p>Expand retrieval before committing to a next step.</p>
            </article>
            <article className="capability-card">
              <p className="eyebrow">Gate</p>
              <h3>rehydrate_payload</h3>
              <p>Bring colder memory back into view when the hot context is insufficient.</p>
            </article>
            <article className="capability-card">
              <p className="eyebrow">Gate</p>
              <h3>request_operator_review</h3>
              <p>Escalate to explicit human or operator review when autonomy should stop.</p>
            </article>
          </div>
        </div>
      </SectionBlock>
    </div>
  );
}

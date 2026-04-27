import Link from "next/link";
import { ReactNode } from "react";

import {
  architectureLayers,
  blogEntries,
  capabilities,
  changelogEntries,
  compareRows,
  metrics,
  proofCards,
  releaseHighlights,
  releaseSummary,
  runtimeLoop,
  siteNav,
} from "../lib/site-content";
import { Reveal, SectionLabel } from "./visuals";

type ActionLink = {
  href: string;
  label: string;
  external?: boolean;
};

function ActionButton({ action, primary = false }: { action: ActionLink; primary?: boolean }) {
  const className = primary ? "button-primary" : "button-secondary";

  return action.external ? (
    <a className={className} href={action.href} target="_blank" rel="noreferrer">
      {action.label}
    </a>
  ) : (
    <Link className={className} href={action.href}>
      {action.label}
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-command">
        <span className="runtime-dot" />
        <span className="hc-tag">Runtime</span>
        <code>npx @ostinato/aionis-runtime start</code>
        <span className="hc-right">v0.4.0 · Lite Developer Preview</span>
      </div>
      <div className="container header-bar">
        <Link href="/" className="brand" aria-label="Aionis home">
          <span className="brand-mark" aria-hidden>
            <span />
            <span />
            <span />
            <span />
          </span>
          <span>AIONIS</span>
        </Link>
        <div className="nav-block">
          <nav className="nav-links" aria-label="Primary">
            {siteNav.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/getting-started" className="button-primary">
            Start Runtime
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-swatch" aria-hidden>
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} style={{ background: `var(--sw-${i + 1})` }} />
          ))}
        </div>
        <div className="footer-grid">
          <div className="footer-col footer-brand">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden>
                <span />
                <span />
                <span />
                <span />
              </span>
              <span>AIONIS</span>
            </Link>
            <p>
              The self-evolving continuity execution-memory engine for agent systems. Start the runtime in one command.
            </p>
          </div>
          <div className="footer-col">
            <h5>Product</h5>
            <Link href="/product">Product</Link>
            <Link href="/runtime">Runtime</Link>
            <Link href="/sdk">SDK</Link>
            <Link href="/self-evolving">Self-evolving</Link>
          </div>
          <div className="footer-col">
            <h5>Proofs</h5>
            <Link href="/proofs">Proofs</Link>
            <Link href="/benchmarks">Benchmarks</Link>
            <Link href="/action-retrieval">Action Retrieval</Link>
            <Link href="/uncertainty-gates">Uncertainty Gates</Link>
          </div>
          <div className="footer-col">
            <h5>Resources</h5>
            <Link href="/getting-started">Getting started</Link>
            <Link href="/docs">Docs</Link>
            <Link href="/changelog">Changelog</Link>
            <Link href="/blog">Blog</Link>
            <a href="https://github.com/ostinatocc/AionisCore" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Aionis · Built on continuity</span>
          <span>
            <code>npx @ostinato/aionis-runtime start</code>
          </span>
        </div>
      </div>
      <span className="wordmark" aria-hidden>
        AIONIS
      </span>
    </footer>
  );
}

export function CommandBlock({ lines }: { lines: string[] }) {
  return (
    <div className="command-block">
      {lines.map((line) => (
        <code key={line}>{line}</code>
      ))}
    </div>
  );
}

export function PageHero({
  kicker,
  title,
  body,
  commands,
  actions,
}: {
  kicker: string;
  title: string;
  body: string;
  commands?: string[];
  actions?: ActionLink[];
}) {
  return (
    <section className="page-hero">
      <div className="container">
        <Reveal>
          <div className="page-hero-inner">
            <div className="page-hero-copy">
              <SectionLabel tone="yellow">{kicker}</SectionLabel>
              <h1>{title}</h1>
              <p>{body}</p>
              {actions ? (
                <div className="hero-actions">
                  {actions.map((action, index) => (
                    <ActionButton key={action.label} action={action} primary={index === 0} />
                  ))}
                </div>
              ) : null}
            </div>
            {commands ? <CommandBlock lines={commands} /> : null}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function SectionBlock({
  index,
  kicker,
  title,
  children,
}: {
  index: string;
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  const tones = ["yellow", "magenta", "cyan", "orange", "green", "purple"] as const;
  const tone = tones[(Number(index) - 1) % tones.length];
  return (
    <section className="section-block">
      <div className="container">
        <Reveal>
          <div className="section-heading">
            <div>
              <SectionLabel tone={tone}>
                {index} · {kicker}
              </SectionLabel>
            </div>
            <div>
              <h2>{title}</h2>
            </div>
          </div>
        </Reveal>
        <Reveal delay={60}>
          <div className="section-body">{children}</div>
        </Reveal>
      </div>
    </section>
  );
}

export function LinkRow({ links }: { links: ActionLink[] }) {
  return (
    <div className="link-row">
      {links.map((link, index) => (
        <ActionButton key={link.label} action={link} primary={index === 0} />
      ))}
    </div>
  );
}

export function RuntimeLoop() {
  return (
    <div className="runtime-loop">
      {runtimeLoop.map((step) => (
        <article key={step.index} className="loop-row">
          <div className="loop-index">{step.index}</div>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
        </article>
      ))}
    </div>
  );
}

export function CapabilityGrid() {
  return (
    <div className="capability-grid">
      {capabilities.map((capability) => (
        <Link key={capability.title} href={capability.href} className="capability-row">
          <span className="eyebrow">Capability</span>
          <h3>{capability.title}</h3>
          <p>{capability.body}</p>
          <span className="capability-link">Open</span>
        </Link>
      ))}
    </div>
  );
}

export function ArchitectureStack() {
  return (
    <div className="architecture-overview">
      <div className="architecture-note">
        <SectionLabel tone="purple">Layered runtime</SectionLabel>
        <p>
          Aionis is built like a runtime system. Hosts and apps sit above the SDK and bridge layer. The runtime then
          connects retrieval, gates, replay, governance, continuity memory, and the supporting store and sandbox
          layers.
        </p>
        <CommandBlock lines={["npx @ostinato/aionis-runtime start", "npm install @ostinato/aionis"]} />
      </div>
      <div className="architecture-stack-inner">
        {architectureLayers.map((layer, index) => (
          <article key={layer.title} className="architecture-lane">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h3>{layer.title}</h3>
              <p>{layer.body}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ProofGrid() {
  return (
    <div className="proof-inner">
      {proofCards.map((proof, index) => (
        <article key={proof.title} className="proof-row">
          <span className="loop-index">Proof {String(index + 1).padStart(2, "0")}</span>
          <h3>{proof.title}</h3>
          <p>{proof.body}</p>
          <code>{proof.command}</code>
        </article>
      ))}
    </div>
  );
}

export function MetricGrid() {
  return (
    <div className="metric-grid">
      {metrics.map((metric) => (
        <div key={metric.label} className="row">
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function ComparisonTable() {
  return (
    <div className="comparison-table">
      <div className="comparison-head">
        <span>Common approach</span>
        <span>Where it breaks</span>
        <span>What Aionis adds</span>
      </div>
      {compareRows.map((row) => (
        <article key={row.focus} className="comparison-row">
          <h3>{row.focus}</h3>
          <p>{row.limit}</p>
          <p>{row.aionis}</p>
        </article>
      ))}
    </div>
  );
}

export function ReleasePanel() {
  return (
    <div className="release-panel">
      <article className="release-summary">
        <SectionLabel tone="magenta">{releaseSummary.version}</SectionLabel>
        <h3>{releaseSummary.title}</h3>
        <p>{releaseSummary.body}</p>
      </article>
      <div className="release-highlights">
        {releaseHighlights.map((item) => (
          <article key={item} className="callout-card">
            <p>{item}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ChangelogFeed() {
  return (
    <div className="feed-grid">
      {changelogEntries.map((entry) => (
        <article key={entry.version} className="feed-card">
          <div className="feed-head">
            <span className="eyebrow">{entry.date}</span>
            <span className="loop-index">{entry.version}</span>
          </div>
          <h3>{entry.title}</h3>
          <ul>
            {entry.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

export function BlogGrid() {
  return (
    <div className="feed-grid">
      {blogEntries.map((entry) => (
        <article key={entry.slug} className="feed-card">
          <div className="feed-head">
            <span className="eyebrow">Planned article</span>
            <span className="loop-index">{entry.status}</span>
          </div>
          <h3>{entry.title}</h3>
          <p>{entry.summary}</p>
        </article>
      ))}
    </div>
  );
}

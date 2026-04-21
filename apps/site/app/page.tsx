import Link from "next/link";

import {
  ArchitectureDiagram,
  DashboardMock,
  EcosystemMarquee,
  UseCaseSection,
} from "../components/big-sections";
import { Reveal, PixelGrid, SectionLabel } from "../components/visuals";
import {
  compareRows,
  metrics,
  proofCards,
  releaseHighlights,
  runtimeLoop,
} from "../lib/site-content";

const sdkExample = `import { createAionisClient } from '@ostinato/aionis';

const client = createAionisClient({
  baseUrl: 'http://127.0.0.1:3001',
});

const retrieval = await client.memory.actionRetrieval({
  scope: 'site-redesign',
  goal: 'Continue the homepage redesign',
});

if (retrieval.uncertainty.level !== 'high') {
  await client.memory.taskStart({
    scope: 'site-redesign',
    goal: 'Continue the homepage redesign',
  });
}`;

export default function HomePage() {
  return (
    <div className="home-page">
      {/* --------------------------------------------------------------- */}
      {/* HERO                                                              */}
      {/* --------------------------------------------------------------- */}
      <section className="home-hero">
        <div className="container">
          <div className="hero-grid">
            <Reveal className="hero-copy">
              <div className="hero-kicker-row">
                <span className="chip is-hot">
                  <span className="dot" /> Runtime v0.3.0
                </span>
                <span className="chip is-green">
                  <span className="dot" /> 207 / 207 tests green
                </span>
                <span className="chip">
                  <span className="dot" /> Public SDK
                </span>
              </div>
              <h1>
                The <span className="mark-hl">runtime</span> for agents that <span className="mark-ylw">learn from execution</span>
              </h1>
              <p className="hero-summary">
                Aionis gives agent systems a runtime for continuity, action retrieval, uncertainty gates, replay,
                policy memory, and semantic forgetting. Start the runtime in one command. Install the SDK. Build on a
                loop that improves over time.
              </p>
              <div className="button-row">
                <Link href="/getting-started" className="button-primary">
                  Start Runtime
                </Link>
                <Link href="/sdk" className="button-secondary">
                  Install SDK
                </Link>
                <Link href="/proofs" className="button-secondary">
                  View Proofs
                </Link>
              </div>
              <div className="hero-meta">
                <div>
                  <span>Install</span>
                  <strong>npx @ostinato/aionis-runtime start</strong>
                </div>
                <div>
                  <span>SDK</span>
                  <strong>npm install @ostinato/aionis</strong>
                </div>
                <div>
                  <span>License</span>
                  <strong>Open source · Apache-2.0</strong>
                </div>
              </div>
            </Reveal>

            <Reveal className="hero-visual" delay={120}>
              <div className="pixel-stage">
                <PixelGrid size={10} seed="aionis-hero" />
                <div className="pixel-caption">
                  <b>Memory loop</b>
                  <span>10 × 10 cells · 4 active</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- */}
      {/* TRUST STRIP                                                       */}
      {/* --------------------------------------------------------------- */}
      <section className="container">
        <Reveal className="trust-strip">
          <h4>Built for the agent systems shipping today</h4>
          <div className="trust-items">
            <span><i />Continuity</span>
            <span><i />Action Retrieval</span>
            <span><i />Uncertainty Gates</span>
            <span><i />Replay Engine</span>
            <span><i />Policy Memory</span>
            <span><i />Semantic Forgetting</span>
          </div>
        </Reveal>
      </section>

      {/* --------------------------------------------------------------- */}
      {/* ECOSYSTEM MARQUEE                                                 */}
      {/* --------------------------------------------------------------- */}
      <section className="eco-section">
        <div className="container">
          <Reveal>
            <div className="eco-head">
              <SectionLabel tone="cyan">Runs where you build</SectionLabel>
              <p>
                TypeScript-first, local-first, zero lock-in. Aionis runs alongside the tools,
                protocols, and models your agents already depend on.
              </p>
            </div>
          </Reveal>
        </div>
        <EcosystemMarquee />
      </section>

      {/* --------------------------------------------------------------- */}
      {/* LENS — comparison against existing memory / retrieval              */}
      {/* --------------------------------------------------------------- */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div>
                <SectionLabel tone="magenta">01 · Why Aionis</SectionLabel>
              </div>
              <div className="lead">
                <h2>
                  Execution-first continuity.
                  <br />
                  <span className="mark-ylw">Not chat-first memory.</span>
                </h2>
                <p>
                  Chat memory stores conversation. Vector systems retrieve references. Orchestration frameworks route
                  work. Aionis adds the missing runtime layer that preserves execution continuity across starts,
                  handoffs, sessions, and replay.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="lens">
              {compareRows.map((row) => (
                <div className="row" key={row.focus}>
                  <h3>{row.focus}</h3>
                  <p className="limit">{row.limit}</p>
                  <p className="wins">{row.aionis}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------------- */}
      {/* RUNTIME LOOP                                                      */}
      {/* --------------------------------------------------------------- */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div>
                <SectionLabel tone="cyan">02 · Runtime loop</SectionLabel>
              </div>
              <div className="lead">
                <h2>One loop. Seven runtime surfaces.</h2>
                <p>
                  Execute, preserve continuity, retrieve action, gate uncertainty, replay, forget, evolve. Every
                  surface is first-class and reachable from the SDK.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="loop-stage">
            <Reveal>
              <div className="loop-visual" aria-hidden>
                <svg
                  className="loop-svg"
                  viewBox="0 0 480 480"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <linearGradient id="loop-stroke" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="rgba(255,214,10,0.55)" />
                      <stop offset="55%" stopColor="rgba(255,64,129,0.35)" />
                      <stop offset="100%" stopColor="rgba(0,208,132,0.45)" />
                    </linearGradient>
                  </defs>

                  {/* Hexagonal loop path — the "runtime loop" drawn explicitly */}
                  <path
                    d="M 240 72 L 384 156 L 384 324 L 240 408 L 96 324 L 96 156 Z"
                    className="loop-path"
                  />

                  {/* Tick marks at each vertex */}
                  {[
                    [240, 72],
                    [384, 156],
                    [384, 324],
                    [240, 408],
                    [96, 324],
                    [96, 156],
                  ].map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="3" className="loop-vertex" />
                  ))}

                  {/* Central core outline */}
                  <rect
                    x="168"
                    y="168"
                    width="144"
                    height="144"
                    className="loop-core-box"
                  />

                  {/* Animated data packet running the loop */}
                  <circle r="5" className="loop-packet">
                    <animateMotion
                      dur="9s"
                      repeatCount="indefinite"
                      rotate="auto"
                      path="M 240 72 L 384 156 L 384 324 L 240 408 L 96 324 L 96 156 Z"
                    />
                  </circle>
                </svg>

                <span className="loop-node n1">
                  <i>01</i>Task start
                </span>
                <span className="loop-node n2">
                  <i>02</i>Retrieval
                </span>
                <span className="loop-node n3">
                  <i>03</i>Gates
                </span>
                <span className="loop-node n4">
                  <i>04</i>Replay
                </span>
                <span className="loop-node n5">
                  <i>05</i>Forgetting
                </span>
                <span className="loop-node n6">
                  <i>06</i>Policy
                </span>
                <div className="loop-core">
                  <h3>Aionis</h3>
                  <p>Agent runtime</p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="loop-list">
                {runtimeLoop.map((step) => (
                  <article key={step.index} className="step">
                    <div className="step-num">{step.index}</div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </article>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- */}
      {/* CODE BAND                                                         */}
      {/* --------------------------------------------------------------- */}
      <section className="section code-band">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div>
                <SectionLabel tone="green">03 · SDK</SectionLabel>
              </div>
              <div className="lead">
                <h2>Retrieve the next action. Gate on uncertainty.</h2>
                <p>
                  The public SDK exposes planning, action retrieval, kickoff, handoff, and replay as first-class
                  surfaces. Start with four lines.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="code-grid">
            <Reveal>
              <div className="code-window">
                <div className="code-window-chrome">
                  <span className="dots" aria-hidden>
                    <i /><i /><i />
                  </span>
                  <span className="title">ts · @ostinato/aionis</span>
                </div>
                <pre>
                  <code dangerouslySetInnerHTML={{ __html: colorizeTs(sdkExample) }} />
                </pre>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="code-notes">
                <div className="code-note">
                  <span className="label">Install</span>
                  <p>
                    The public start path is <code>npx @ostinato/aionis-runtime start</code> — no cloning the monorepo
                    first.
                  </p>
                </div>
                <div className="code-note">
                  <span className="label">Decision layer</span>
                  <p>
                    Action Retrieval and Uncertainty Gates are first-class runtime surfaces, not buried inside a
                    larger response payload.
                  </p>
                </div>
                <div className="code-note">
                  <span className="label">Latest release</span>
                  <p>{releaseHighlights.join(" · ")}</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- */}
      {/* ARCHITECTURE — custom SVG diagram                                 */}
      {/* --------------------------------------------------------------- */}
      <section className="section arch-section">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div>
                <SectionLabel tone="orange">04 · Architecture</SectionLabel>
              </div>
              <div className="lead">
                <h2>A layered runtime system, not a thin wrapper.</h2>
                <p>
                  Hosts and apps sit above the SDK. The SDK fans out into a runtime core with four decision
                  lanes and three continuity lanes, backed by persistent store, sandbox, and recall index.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <ArchitectureDiagram />
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------------- */}
      {/* DASHBOARD MOCK                                                    */}
      {/* --------------------------------------------------------------- */}
      <section className="section dash-section">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div>
                <SectionLabel tone="green">05 · Observability</SectionLabel>
              </div>
              <div className="lead">
                <h2>See the runtime that&apos;s running.</h2>
                <p>
                  Continuity memory heat, retrieval stream, uncertainty gates, and confidence — visible
                  surfaces, not buried logs. Wire these signals into your own operator tools through the SDK.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <DashboardMock />
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------------- */}
      {/* USE CASES                                                         */}
      {/* --------------------------------------------------------------- */}
      <section className="section use-case-section">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div>
                <SectionLabel tone="magenta">06 · Use cases</SectionLabel>
              </div>
              <div className="lead">
                <h2>How teams run Aionis.</h2>
                <p>
                  Four runtime shapes that show what &ldquo;execution continuity&rdquo; looks like in practice —
                  for coding, research, ops, and multi-agent systems.
                </p>
              </div>
            </div>
          </Reveal>

          <UseCaseSection />
        </div>
      </section>

      {/* --------------------------------------------------------------- */}
      {/* PROOFS                                                            */}
      {/* --------------------------------------------------------------- */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div>
                <SectionLabel tone="green">07 · Proofs</SectionLabel>
              </div>
              <div className="lead">
                <h2>Runtime claims backed by reproducible proofs.</h2>
                <p>
                  Six proof scripts, a green suite, and a public release. Every claim on this page is reproducible
                  from the command line.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="proof-wrap">
            <Reveal>
              <div className="proof-grid">
                {proofCards.map((proof, index) => (
                  <article key={proof.title} className="proof-card">
                    <div className="num">Proof · {String(index + 1).padStart(2, "0")}</div>
                    <h3>{proof.title}</h3>
                    <p>{proof.body}</p>
                    <code>{proof.command}</code>
                  </article>
                ))}
              </div>
            </Reveal>

            <Reveal delay={80}>
              <aside className="release-card">
                <SectionLabel tone="magenta">Current baseline</SectionLabel>
                <h3>v0.3.0</h3>
                <p>
                  Public runtime package, public SDK, GitHub release, standalone install path, and the new decision
                  layer.
                </p>
                <div className="metric-grid">
                  {metrics.map((metric) => (
                    <div key={metric.label} className="row">
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                    </div>
                  ))}
                </div>
                <div className="button-row">
                  <a
                    className="button-secondary"
                    href="https://github.com/ostinatocc/AionisCore/releases/tag/v0.3.0"
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub Release
                  </a>
                  <Link href="/changelog" className="button-ghost">
                    Changelog →
                  </Link>
                </div>
              </aside>
            </Reveal>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- */}
      {/* CTA                                                               */}
      {/* --------------------------------------------------------------- */}
      <section className="cta-band">
        <div className="container">
          <Reveal>
            <SectionLabel tone="yellow">Start Aionis</SectionLabel>
            <h2>
              Start the runtime. Install the SDK. <span className="mark-ylw">Run your first loop.</span>
            </h2>
            <p>One command to start. One import to integrate. Every claim backed by a reproducible proof.</p>
            <div className="button-row">
              <Link href="/getting-started" className="button-primary">
                Start Runtime
              </Link>
              <Link href="/docs" className="button-secondary">
                Read Docs
              </Link>
              <a
                className="button-secondary"
                href="https://github.com/ostinatocc/AionisCore"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

/**
 * Tiny, dependency-free TS colorizer for the hero code window.
 * Highlights keywords, strings, properties, comments, and function names.
 */
function colorizeTs(src: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Process line by line so we can distinguish // comments cleanly
  return esc(src)
    .split("\n")
    .map((line) => {
      const cm = line.match(/^(.*?)(\/\/.*)$/);
      const body = cm ? cm[1] : line;
      const comment = cm ? cm[2] : "";
      let out = body
        // strings
        .replace(/('[^']*'|"[^"]*"|`[^`]*`)/g, '<span class="tok-str">$1</span>')
        // keywords
        .replace(
          /\b(import|from|const|let|var|async|await|if|else|return|function|new|export|default)\b/g,
          '<span class="tok-kw">$1</span>',
        )
        // function call names
        .replace(/\b([a-zA-Z_][\w]*)\s*\(/g, '<span class="tok-fn">$1</span>(')
        // object property names like `scope:` `goal:`
        .replace(/\b([a-zA-Z_][\w]*)(\s*:)/g, '<span class="tok-prop">$1</span>$2');
      if (comment) out += '<span class="tok-cm">' + comment + "</span>";
      return out;
    })
    .join("\n");
}

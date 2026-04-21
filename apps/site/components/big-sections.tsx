"use client";

import { useMemo } from "react";

import { Reveal, SectionLabel } from "./visuals";
import { ecosystemMarks, useCases } from "../lib/site-content";

/* =========================================================================
   ArchitectureDiagram
   A hand-authored SVG stack diagram with animated data-flow dashes.
   Shows: Apps & Hosts → SDK/Bridge → Runtime Core (with sub-lanes) → Storage.
   ========================================================================= */
export function ArchitectureDiagram() {
  return (
    <div className="arch-diagram" role="img" aria-label="Aionis architecture diagram">
      <svg
        viewBox="0 0 1200 720"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="arch-grid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M24 0H0V24"
              fill="none"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />
          </pattern>
          <linearGradient id="arch-accent" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffd60a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffd60a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="arch-core" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1b1b1e" />
            <stop offset="50%" stopColor="#242428" />
            <stop offset="100%" stopColor="#1b1b1e" />
          </linearGradient>
        </defs>

        <rect width="1200" height="720" fill="url(#arch-grid)" />

        {/* Tier 1: Apps / Hosts */}
        <g className="tier tier-apps">
          <text x="40" y="60" className="tier-label">01 · APPS &amp; HOSTS</text>
          <ArchBlock x={40}  y={80} w={212} label="Agent App"       sub="IDE · CLI · Web" color="sw-2" />
          <ArchBlock x={267} y={80} w={212} label="Host Bridge"     sub="Cursor · Claude · Codex" color="sw-5" />
          <ArchBlock x={494} y={80} w={212} label="Operator UI"     sub="Inspect · Review · Rehydrate" color="sw-1" />
          <ArchBlock x={721} y={80} w={212} label="Evaluators"      sub="Proofs · Benchmarks" color="sw-6" />
          <ArchBlock x={948} y={80} w={212} label="3rd-party Agent" sub="via MCP" color="sw-8" />
        </g>

        {/* Flow arrows tier1 -> tier2 */}
        <g className="flow">
          <FlowLine x={146}  y1={152} y2={240} packetDelay={0}   />
          <FlowLine x={373}  y1={152} y2={240} packetDelay={0.3} />
          <FlowLine x={600}  y1={152} y2={240} packetDelay={0.6} />
          <FlowLine x={827}  y1={152} y2={240} packetDelay={0.9} />
          <FlowLine x={1054} y1={152} y2={240} packetDelay={1.2} />
        </g>

        {/* Tier 2: SDK & Bridge */}
        <g className="tier tier-sdk">
          <text x="40" y="230" className="tier-label">02 · SDK &amp; BRIDGE</text>
          <rect x="40" y="240" width="1120" height="64" rx="2"
            fill="rgba(255,214,10,0.035)" stroke="rgba(255,214,10,0.32)" strokeWidth="1" />
          <rect x="40" y="240" width="3" height="64" fill="var(--sw-2)" />
          <text x="64" y="268" className="tier-title">@ostinato/aionis · SDK</text>
          <text x="64" y="288" className="tier-sub">planning · retrieval · kickoff · handoff · replay · projections</text>
          <text x="1136" y="278" className="tier-code" textAnchor="end">npm install @ostinato/aionis</text>
        </g>

        {/* Flow tier2 -> tier3 */}
        <g className="flow">
          <FlowLine x={225}  y1={304} y2={380} packetDelay={0.2} />
          <FlowLine x={495}  y1={304} y2={380} packetDelay={0.5} />
          <FlowLine x={765}  y1={304} y2={380} packetDelay={0.8} />
          <FlowLine x={1035} y1={304} y2={380} packetDelay={1.1} />
        </g>

        {/* Tier 3: Runtime Core */}
        <g className="tier tier-core">
          <text x="40" y="360" className="tier-label">03 · RUNTIME CORE</text>
          <rect x="40" y="380" width="1120" height="180" rx="2"
            fill="url(#arch-core)" stroke="rgba(255,255,255,0.12)" />
          <rect x="40" y="380" width="1120" height="28"
            fill="var(--sw-2)" opacity="0.08" />
          <text x="60" y="400" className="tier-core-label">RUNTIME-CORE/0.1.0</text>
          <text x="1140" y="400" className="tier-core-label" textAnchor="end">npx @ostinato/aionis-runtime start</text>

          <CoreLane x={60}  y={420} w={258} label="Action Retrieval"       hue="var(--sw-5)" icon="AR" />
          <CoreLane x={330} y={420} w={258} label="Uncertainty Gates"      hue="var(--sw-1)" icon="UG" />
          <CoreLane x={600} y={420} w={258} label="Replay Engine"          hue="var(--sw-6)" icon="RE" />
          <CoreLane x={870} y={420} w={270} label="Policy Memory"          hue="var(--sw-8)" icon="PM" />
          <CoreLane x={60}  y={495} w={390} label="Continuity Memory"      hue="var(--sw-2)" icon="CM" />
          <CoreLane x={462} y={495} w={390} label="Governance & Promotion" hue="var(--sw-3)" icon="GV" />
          <CoreLane x={864} y={495} w={276} label="Session & Handoff"      hue="var(--sw-4)" icon="SH" />
        </g>

        {/* Flow core -> storage */}
        <g className="flow">
          <FlowLine x={226} y1={562} y2={640} packetDelay={0.4} />
          <FlowLine x={600} y1={562} y2={640} packetDelay={0.8} />
          <FlowLine x={974} y1={562} y2={640} packetDelay={1.2} />
        </g>

        {/* Tier 4: Storage + Sandbox */}
        <g className="tier tier-store">
          <text x="40" y="620" className="tier-label">04 · STORE &amp; SANDBOX</text>
          <ArchBlock x={40}   y={640} w={364} h={60} label="Persistent Store"     sub="SQLite · Postgres · File-based" color="sw-3" compact />
          <ArchBlock x={418}  y={640} w={364} h={60} label="Sandbox Runtime"      sub="Isolated exec · tool calls · vfs" color="sw-5" compact />
          <ArchBlock x={796}  y={640} w={364} h={60} label="Vector / Recall Index" sub="Action-first retrieval · provenance" color="sw-6" compact />
        </g>
      </svg>

      <div className="arch-diagram-legend">
        <span><i className="c1" /> Data flow</span>
        <span><i className="c2" /> Decision layer</span>
        <span><i className="c3" /> Continuity layer</span>
        <span><i className="c4" /> Storage layer</span>
      </div>
    </div>
  );
}

function ArchBlock({
  x,
  y,
  w,
  h = 72,
  label,
  sub,
  color,
  compact = false,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  label: string;
  sub: string;
  color: string;
  compact?: boolean;
}) {
  return (
    <g transform={`translate(${x},${y})`} className="arch-block">
      <rect
        x="0"
        y="0"
        width={w}
        height={h}
        fill="#121214"
        stroke="rgba(255,255,255,0.14)"
        rx="2"
      />
      <rect x="0" y="0" width="3" height={h} fill={`var(--${color})`} />
      <text x={compact ? 16 : 18} y={compact ? 26 : 30} className="block-label">
        {label}
      </text>
      <text x={compact ? 16 : 18} y={compact ? 46 : 54} className="block-sub">
        {sub}
      </text>
    </g>
  );
}

function CoreLane({
  x,
  y,
  w,
  label,
  hue,
  icon,
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  hue: string;
  icon: string;
}) {
  return (
    <g transform={`translate(${x},${y})`} className="core-lane">
      <rect x="0" y="0" width={w} height={62} fill="#0f0f10" stroke="rgba(255,255,255,0.1)" rx="2" />
      <rect x="0" y="0" width={w} height="2" fill={hue} />
      <rect x="10" y="14" width="34" height="34" fill={hue} opacity="0.12" />
      <text x="27" y="36" className="lane-icon" fill={hue} textAnchor="middle">
        {icon}
      </text>
      <text x="54" y="38" className="lane-label">
        {label}
      </text>
    </g>
  );
}

/**
 * Pure vertical flow line with an optional animated data packet that
 * travels from the top node to the bottom node.
 */
function FlowLine({
  x,
  y1,
  y2,
  packetDelay = 0,
  packetDuration = 2.4,
}: {
  x: number;
  y1: number;
  y2: number;
  packetDelay?: number;
  packetDuration?: number;
}) {
  return (
    <g className="flow-line-group">
      <line
        x1={x}
        y1={y1}
        x2={x}
        y2={y2}
        stroke="rgba(255,214,10,0.42)"
        strokeWidth="1.2"
        strokeDasharray="4 4"
        className="flow-line"
      />
      <circle cx={x} cy={y1} r="2.2" fill="rgba(255,214,10,0.9)" />
      <circle cx={x} cy={y2} r="2.2" fill="rgba(255,214,10,0.9)" />
      <circle cx={x} cy={y1} r="2.6" fill="var(--sw-2)" className="flow-packet">
        <animate
          attributeName="cy"
          from={y1}
          to={y2}
          dur={`${packetDuration}s`}
          begin={`${packetDelay}s`}
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0;1;1;0"
          keyTimes="0;0.1;0.9;1"
          dur={`${packetDuration}s`}
          begin={`${packetDelay}s`}
          repeatCount="indefinite"
        />
      </circle>
    </g>
  );
}

/* =========================================================================
   DashboardMock
   Stylised runtime dashboard: header · memory heatmap · retrieval feed ·
   sparkline · gates status bar. Pure CSS+SVG, no 3rd-party lib.
   ========================================================================= */
export function DashboardMock() {
  return (
    <div className="runtime-dashboard" aria-hidden>
      <div className="dash-chrome">
        <span className="dash-dots"><i /><i /><i /></span>
        <span className="dash-title">runtime · localhost:4100</span>
        <span className="dash-status">
          <i className="live" /> LIVE · 207 / 207 tests green
        </span>
      </div>

      <div className="dash-grid">
        <div className="dash-card dash-heatmap">
          <div className="dash-card-head">
            <span className="dash-label c-yellow">Continuity memory · last 24h</span>
            <span className="dash-meta">800 cells · hot / warm / cold</span>
          </div>
          <Heatmap rows={16} cols={50} />
          <div className="dash-heatmap-legend">
            <span><i className="h-hot" /> Hot</span>
            <span><i className="h-warm" /> Warm</span>
            <span><i className="h-cold" /> Cold</span>
            <span><i className="h-forget" /> Forgotten</span>
          </div>
        </div>

        <div className="dash-card dash-feed">
          <div className="dash-card-head">
            <span className="dash-label c-magenta">Action retrieval · stream</span>
            <span className="dash-meta">scope: site-redesign</span>
          </div>
          <ul className="dash-feed-list">
            <li><span className="t c-green">gate · ok</span><code>planner.taskStart()</code><span className="meta">0.92</span></li>
            <li><span className="t c-cyan">retrieve</span><code>actionRetrieval("hero.tsx")</code><span className="meta">0.87</span></li>
            <li><span className="t c-yellow">replay</span><code>workflow:site.redesign/hero</code><span className="meta">0.81</span></li>
            <li><span className="t c-magenta">gate · widen</span><code>uncertainty.widen()</code><span className="meta">0.42</span></li>
            <li><span className="t c-orange">forget</span><code>semanticForget(7d)</code><span className="meta">cold</span></li>
            <li><span className="t c-green">promote</span><code>policy.promote("refactor-css")</code><span className="meta">0.94</span></li>
            <li><span className="t c-cyan">retrieve</span><code>actionRetrieval("globals.css")</code><span className="meta">0.79</span></li>
          </ul>
        </div>

        <div className="dash-card dash-spark">
          <div className="dash-card-head">
            <span className="dash-label c-green">Uncertainty gate · confidence</span>
            <span className="dash-meta">rolling · 200 calls</span>
          </div>
          <Sparkline />
          <div className="dash-spark-meta">
            <div><span>avg</span><strong>0.83</strong></div>
            <div><span>p50</span><strong>0.86</strong></div>
            <div><span>p10</span><strong>0.41</strong></div>
            <div><span>escalated</span><strong>7.3%</strong></div>
          </div>
        </div>

        <div className="dash-card dash-gates">
          <div className="dash-card-head">
            <span className="dash-label c-cyan">Gates · 24h distribution</span>
            <span className="dash-meta">413 decisions</span>
          </div>
          <div className="gate-bars">
            <GateBar label="OK" value={78} color="var(--sw-3)" />
            <GateBar label="Widen" value={11} color="var(--sw-2)" />
            <GateBar label="Inspect" value={6} color="var(--sw-5)" />
            <GateBar label="Rehydrate" value={3} color="var(--sw-6)" />
            <GateBar label="Operator" value={2} color="var(--sw-1)" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Heatmap({ rows, cols }: { rows: number; cols: number }) {
  const cells = useMemo(() => {
    const total = rows * cols;
    const arr: number[] = [];
    for (let i = 0; i < total; i++) {
      // deterministic pseudo-random per cell
      const n = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const v = Math.abs(n);
      arr.push(v);
    }
    return arr;
  }, [rows, cols]);

  return (
    <div
      className="heatmap"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {cells.map((v, i) => {
        let cls = "cold";
        if (v > 0.82) cls = "hot";
        else if (v > 0.58) cls = "warm";
        else if (v > 0.38) cls = "cool";
        else if (v > 0.2) cls = "cold";
        else cls = "forget";
        const anim = i % 37 === 0 ? " pulse" : "";
        return <span key={i} className={`hm-cell ${cls}${anim}`} />;
      })}
    </div>
  );
}

function Sparkline() {
  // deterministic wave
  const points = useMemo(() => {
    const N = 40;
    const pts: string[] = [];
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1)) * 100;
      const y =
        50 +
        Math.sin(i * 0.55) * 12 +
        Math.sin(i * 0.22) * 8 +
        (i > 28 ? -(i - 28) * 2 : 0);
      pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return pts.join(" ");
  }, []);

  return (
    <svg className="spark-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00d084" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#00d084" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={`0,100 ${points} 100,100`}
        fill="url(#spark-fill)"
        stroke="none"
      />
      <polyline
        points={points}
        fill="none"
        stroke="#00d084"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      {/* threshold line */}
      <line
        x1="0"
        x2="100"
        y1="70"
        y2="70"
        stroke="rgba(233,30,99,0.6)"
        strokeDasharray="2 3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function GateBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="gate-bar">
      <div className="gate-row">
        <span className="gate-name">{label}</span>
        <span className="gate-val">{value}%</span>
      </div>
      <div className="gate-track">
        <div className="gate-fill" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

/* =========================================================================
   UseCaseSection
   4 editorial cards, each with tag · title · body · bullets · metric.
   ========================================================================= */
export function UseCaseSection() {
  return (
    <div className="use-cases">
      {useCases.map((uc, i) => (
        <Reveal key={uc.tag} delay={i * 60}>
          <article className={`use-case c-${uc.tone}`}>
            <header>
              <SectionLabel tone={uc.tone as never}>{uc.tag}</SectionLabel>
              <span className="use-case-num">{String(i + 1).padStart(2, "0")}</span>
            </header>
            <h3>{uc.title}</h3>
            <p>{uc.body}</p>
            <ul>
              {uc.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <div className="use-case-metric">
              <span>{uc.metric.label}</span>
              <strong>{uc.metric.value}</strong>
            </div>
          </article>
        </Reveal>
      ))}
    </div>
  );
}

/* =========================================================================
   EcosystemMarquee
   Infinite horizontal strip of ecosystem wordmarks, dual-row, reverse on 2nd.
   ========================================================================= */
export function EcosystemMarquee() {
  const loop = [...ecosystemMarks, ...ecosystemMarks];
  return (
    <div className="eco-marquee" aria-hidden>
      <div className="eco-track">
        {loop.map((name, i) => (
          <span key={`a-${i}`} className="eco-mark">
            <i />
            {name}
          </span>
        ))}
      </div>
      <div className="eco-track eco-track-rev">
        {loop.map((name, i) => (
          <span key={`b-${i}`} className="eco-mark">
            <i />
            {name}
          </span>
        ))}
      </div>
      <div className="eco-fade eco-fade-l" />
      <div className="eco-fade eco-fade-r" />
    </div>
  );
}

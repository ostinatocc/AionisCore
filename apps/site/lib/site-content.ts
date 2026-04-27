export const siteNav = [
  { href: "/product", label: "Product" },
  { href: "/runtime", label: "Runtime" },
  { href: "/sdk", label: "SDK" },
  { href: "/proofs", label: "Proofs" },
  { href: "/docs", label: "Docs" },
] as const;

export const runtimeLoop = [
  { index: "01", title: "Execute", body: "Run tasks, tools, and workflows against real operating context." },
  { index: "02", title: "Preserve Continuity", body: "Capture execution memory instead of losing context between tasks." },
  { index: "03", title: "Retrieve Action", body: "Surface the next likely tool, file, and action from prior execution evidence." },
  { index: "04", title: "Gate On Uncertainty", body: "Escalate into inspect, widen recall, rehydrate, or operator review when confidence is weak." },
  { index: "05", title: "Replay And Promote", body: "Turn successful workflows into reusable runtime behavior." },
  { index: "06", title: "Forget And Rehydrate", body: "Demote, archive, and recover memory based on lifecycle signals." },
  { index: "07", title: "Evolve", body: "Improve task starts, handoffs, and replay behavior over time." },
] as const;

export const capabilities = [
  {
    title: "Task Start",
    body: "Kick off work with continuity-aware startup guidance rather than beginning from zero every time.",
    href: "/continuity",
  },
  {
    title: "Handoff",
    body: "Carry execution state across agents, sessions, and operators through explicit continuity surfaces.",
    href: "/continuity",
  },
  {
    title: "Replay",
    body: "Re-run successful workflows, govern promotion, and turn repeated execution into reusable behavior.",
    href: "/product",
  },
  {
    title: "Semantic Forgetting",
    body: "Demote, archive, review, and rehydrate memory instead of endlessly accumulating hot context.",
    href: "/forgetting",
  },
  {
    title: "Action Retrieval",
    body: "Retrieve the likely next tool, file, and action from prior execution evidence.",
    href: "/action-retrieval",
  },
  {
    title: "Uncertainty Gates",
    body: "Know when not to pretend confidence through inspect, widen, rehydrate, and review gates.",
    href: "/uncertainty-gates",
  },
] as const;

export const proofCards = [
  {
    title: "Better Second Task Start",
    body: "Repeated execution improves startup guidance through learned continuity.",
    command: "npm run example:sdk:task-start-proof",
  },
  {
    title: "Policy Memory Materialization",
    body: "Execution policy becomes explicit memory rather than staying implicit inside prompts.",
    command: "npm run example:sdk:policy-memory",
  },
  {
    title: "Governance Loop",
    body: "Replay and governance can shape what gets promoted into reusable behavior.",
    command: "npm run example:sdk:policy-governance",
  },
  {
    title: "Continuity Provenance",
    body: "Workflow promotion preserves continuity provenance instead of flattening origins.",
    command: "npm run example:sdk:continuity-provenance",
  },
  {
    title: "Session Continuity",
    body: "Repeated session continuity observations stabilize into workflow guidance.",
    command: "npm run example:sdk:session-continuity",
  },
  {
    title: "Semantic Forgetting",
    body: "Cold execution memory is archived and rehydrated instead of being deleted.",
    command: "npm run example:sdk:semantic-forgetting",
  },
] as const;

export const metrics = [
  { label: "Real-provider A/B vs thin", value: "31 / 31" },
  { label: "Real-provider A/B vs chat", value: "25 / 25" },
  { label: "Real-provider A/B vs vector", value: "25 / 25" },
  { label: "Lite runtime tests", value: "319 / 319" },
  { label: "Public SDK tests", value: "20 / 20" },
] as const;

export const heroSignals = [
  { label: "Runtime package", value: "0.2.0", tone: "cyan" },
  { label: "SDK package", value: "0.4.0", tone: "amber" },
  { label: "GitHub Release", value: "v0.4.0", tone: "cyan" },
  { label: "Reproducible proofs", value: "6", tone: "amber" },
] as const;

export const releaseHighlights = [
  "Lite Developer Preview release-readiness gate passed",
  "Runtime authority, outcome, and legacy-access boundaries hardened",
  "SDK host execution-memory facades expanded",
  "Service lifecycle, dogfood, and package release proof paths added",
] as const;

export const releaseSummary = {
  version: "v0.4.0",
  title: "Aionis Runtime v0.4.0 Lite Developer Preview",
  body: "This release moves the Lite runtime into a preview-ready line with hardened Runtime boundaries, authority and outcome gates, expanded SDK host facades, live dogfood proof paths, package release checks, and explicit release-readiness documentation.",
} as const;

export const changelogEntries = [
  {
    version: "v0.4.0",
    date: "2026-04-27",
    title: "Lite Developer Preview readiness",
    bullets: [
      "Prepared @ostinato/aionis@0.4.0 and @ostinato/aionis-runtime@0.2.0",
      "Hardened Runtime boundaries across Contract Compiler, Trust Gate, Orchestrator, Learning Loop, route, host, and Lite store seams",
      "Documented release readiness after build, Lite tests, package release checks, docs build, and smoke all passed",
    ],
  },
  {
    version: "v0.3.0",
    date: "2026-04-20",
    title: "Standalone runtime and Phase 2 decision surfaces",
    bullets: [
      "Published @ostinato/aionis-runtime@0.1.0 and @ostinato/aionis@0.3.0",
      "Added Action Retrieval and uncertainty gate surfaces",
      "Aligned public docs, release notes, and install flows around the standalone runtime path",
    ],
  },
  {
    version: "Phase 1 baseline",
    date: "2026-04",
    title: "Continuity, replay, forgetting, and proofs",
    bullets: [
      "Task start, handoff, replay, policy memory, and semantic forgetting established as public runtime capabilities",
      "Six reproducible self-evolving proofs published",
      "Release workflow and public docs tightened around the current technical beta",
    ],
  },
] as const;

export const blogEntries = [
  {
    slug: "why-agent-systems-need-runtime-continuity",
    title: "Why agent systems need runtime continuity",
    summary: "Aionis exists because orchestration and vector retrieval do not solve long-horizon execution continuity.",
    status: "Planned",
  },
  {
    slug: "execution-first-memory-vs-chat-memory",
    title: "Execution-first memory versus chat memory",
    summary: "Why execution evidence, replay, and gates matter more than stuffing more chat context into prompts.",
    status: "Planned",
  },
  {
    slug: "how-action-retrieval-and-uncertainty-gates-work",
    title: "How Action Retrieval and uncertainty gates work",
    summary: "A product-level walkthrough of retrieval, evidence, and when the runtime refuses false confidence.",
    status: "Planned",
  },
] as const;

export const architectureLayers = [
  {
    title: "Apps, Hosts, Operators",
    body: "Agent applications, host bridges, and operator-facing surfaces that consume Aionis runtime decisions.",
  },
  {
    title: "SDK And Bridge",
    body: "Installable clients and host bridge adapters for planning, retrieval, kickoff, replay, and projections.",
  },
  {
    title: "Runtime Core",
    body: "The standalone local-first runtime entry that exposes continuity, replay, and memory routes.",
  },
  {
    title: "Action Retrieval And Gates",
    body: "Decision surfaces for selected actions, uncertainty, operator hints, and escalation modes.",
  },
  {
    title: "Replay, Policy, Governance",
    body: "Workflow replay, policy memory, promotion, and governed evolution paths.",
  },
  {
    title: "Continuity Memory, Store, Sandbox",
    body: "Execution memory, local persistence, sandboxed execution, and supporting recall surfaces.",
  },
] as const;

export const useCases = [
  {
    tag: "Coding agents",
    tone: "yellow",
    title: "Long-horizon coding agents that don't forget across tasks",
    body:
      "Hand off a refactor across days and sessions. Aionis preserves file, tool, and decision history so the next agent starts where the last one stopped.",
    bullets: [
      "Task start with prior execution evidence",
      "Handoff memory across IDE sessions",
      "Replay successful refactors",
    ],
    metric: { label: "Learned path hit rate", value: "100%" },
  },
  {
    tag: "Research agents",
    tone: "cyan",
    title: "Research workflows with gated confidence",
    body:
      "When a research agent is uncertain, Aionis escalates instead of hallucinating — widen recall, inspect, rehydrate, or ask an operator.",
    bullets: [
      "Uncertainty gates on retrieval",
      "Source provenance preserved",
      "Operator hints when confidence is weak",
    ],
    metric: { label: "Stale-memory interference", value: "0" },
  },
  {
    tag: "Ops agents",
    tone: "magenta",
    title: "Customer operations agents that learn from resolution",
    body:
      "Turn every resolved ticket into reusable runtime behavior. Policy memory materializes from execution, governed by replay.",
    bullets: [
      "Policy memory from resolved tickets",
      "Replay-governed promotion",
      "Semantic forgetting of stale flows",
    ],
    metric: { label: "Repeated-task step reduction", value: "5" },
  },
  {
    tag: "Multi-agent",
    tone: "green",
    title: "Multi-agent orchestration with explicit continuity",
    body:
      "Planner, coder, reviewer — every agent reads and writes the same execution continuity surface through the SDK.",
    bullets: [
      "Shared continuity memory",
      "Action Retrieval as decision layer",
      "Governance-guarded replay",
    ],
    metric: { label: "Cross-task bleed", value: "0 observed" },
  },
] as const;

export const ecosystemMarks = [
  "TypeScript",
  "Node.js",
  "npm",
  "GitHub",
  "OpenAI",
  "Anthropic",
  "LangChain",
  "LangGraph",
  "Model Context Protocol",
  "Vercel AI SDK",
  "Postgres",
  "SQLite",
  "Redis",
  "Vitest",
  "Zod",
  "pnpm",
  "Bun",
  "Deno",
] as const;

export const compareRows = [
  {
    focus: "Chat memory",
    limit: "Preserves conversations, not durable execution state.",
    aionis: "Captures execution continuity across starts, handoffs, sessions, and replay.",
  },
  {
    focus: "Vector retrieval",
    limit: "Finds documents but does not choose the next action.",
    aionis: "Retrieves the likely next tool, file, and step from prior execution evidence.",
  },
  {
    focus: "Orchestration only",
    limit: "Controls flow but does not accumulate runtime learning.",
    aionis: "Promotes successful execution into reusable behavior over time.",
  },
  {
    focus: "Tool execution only",
    limit: "Acts without knowing when confidence is weak.",
    aionis: "Escalates into inspect, widen recall, rehydrate, or operator review gates.",
  },
] as const;
